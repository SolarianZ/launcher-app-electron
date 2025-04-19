/**
 * 窗口管理模块
 * 负责创建和管理应用程序中的所有窗口
 */
const { BrowserWindow, app } = require('electron');
const path = require('path');
const dataStore = require('./data-store');

/**
 * titleBarOverlay: 在Windows上自定义标题栏外观
 * 配合titleBarStyle: 'hidden'使用
 */
const titleBarOverlay = {
  height: 30,
  color: 'rgba(0, 0, 0, 0)',
  symbolColor: 'white',
};

// 全局窗口引用 - 防止垃圾回收导致窗口被关闭
let mainWindow = null;
let addItemWindow = null;
let settingsWindow = null;  // 添加设置窗口引用

/**
 * 创建主窗口
 * @returns {BrowserWindow} 创建的主窗口对象
 */
function createMainWindow() {
  // 如果主窗口已存在，则返回现有窗口
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  // 加载保存的窗口配置
  const windowConfig = dataStore.loadWindowConfig();
  const mainWindowConfig = windowConfig.mainWindow;

  /**
   * 设置窗口选项 
   * 注意：某些配置是平台特定的，如titleBarStyle和titleBarOverlay
   */
  const windowOptions = {
    width: mainWindowConfig.width || 400,
    height: mainWindowConfig.height || 600,
    minWidth: 300,
    minHeight: 300,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    /**
     * titleBarStyle: 在macOS上使用自定义标题栏
     * 'hidden' - 隐藏标题栏，内容延伸到整个窗口，窗口控制按钮可见
     * Windows平台通过设置frame: false实现
     */
    titleBarStyle: 'hidden',
    titleBarOverlay: titleBarOverlay,
    show: false, // 先创建隐藏窗口，准备完成后再显示，避免白屏
    frame: false, // 无框窗口
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      /**
       * 注意：没有启用nodeIntegration
       * 而是使用预加载脚本安全地暴露必要API
       */
    },
  };

  // 如果存在保存的位置坐标，则使用它们
  if (mainWindowConfig.x !== undefined && mainWindowConfig.y !== undefined) {
    windowOptions.x = mainWindowConfig.x;
    windowOptions.y = mainWindowConfig.y;
  }

  // 创建主窗口实例
  mainWindow = new BrowserWindow(windowOptions);

  // 加载渲染进程的HTML文件
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // 打开开发者工具
  // mainWindow.webContents.openDevTools();

  // 窗口内容准备好后再显示，避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 不在任务栏显示图标
  mainWindow.setSkipTaskbar(true);

  // 监听键盘事件，处理快捷键
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // 按ESC键隐藏窗口
    if (input.key === 'Escape') {
      mainWindow.hide();
      event.preventDefault();
    }
  });

  // 保存窗口调整大小时的尺寸
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) {
      const bounds = mainWindow.getBounds();
      dataStore.updateMainWindowConfig({
        width: bounds.width,
        height: bounds.height
      });
    }
  });

  // 保存窗口移动时的位置
  mainWindow.on('move', () => {
    if (!mainWindow.isMaximized()) {
      const bounds = mainWindow.getBounds();
      dataStore.updateMainWindowConfig({
        x: bounds.x,
        y: bounds.y
      });
    }
  });

  // 拦截关闭事件，在Windows上点击关闭按钮时隐藏窗口而非退出应用
  mainWindow.on('close', (event) => {
    // 如果不是真正要退出应用程序（如app.quit()或app.exit()）
    // 且不在macOS上（macOS有自己的窗口管理行为）
    if (!app.isQuitting && process.platform !== 'darwin') {
      event.preventDefault(); // 阻止默认关闭行为
      mainWindow.hide();      // 隐藏窗口
      return false;           // 阻止默认行为
    }

    // 否则，允许窗口关闭
    return true;
  });

  // 窗口关闭时清除引用，避免内存泄漏
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * 创建添加项目窗口
 * @returns {BrowserWindow} 创建的添加项目窗口对象
 */
function createAddItemWindow() {
  // 如果窗口已存在则聚焦并返回
  if (addItemWindow && !addItemWindow.isDestroyed()) {
    addItemWindow.focus();
    return addItemWindow;
  }

  addItemWindow = new BrowserWindow({
    width: 400,
    height: 350,
    frame: false,
    modal: true,
    show: false,
    parent: mainWindow,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: titleBarOverlay,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
    },
  });

  addItemWindow.loadFile(path.join(__dirname, '..', 'renderer', 'edit-item.html'));

  addItemWindow.once('ready-to-show', () => {
    addItemWindow.show();
  });

  addItemWindow.on('closed', () => {
    addItemWindow = null;
  });

  return addItemWindow;
}

/**
 * 创建编辑项目窗口
 * @param {Object} item 要编辑的项目
 * @param {number} index 项目索引
 * @returns {BrowserWindow} 创建的编辑窗口对象
 */
function createEditItemWindow(item, index) {
  // 使用相同的窗口处理编辑功能
  const window = createAddItemWindow();

  // 窗口准备好后发送编辑数据
  window.once('ready-to-show', () => {
    window.webContents.send('edit-item-data', { item, index });
  });

  return window;
}

/**
 * 创建设置窗口
 * @returns {BrowserWindow} 创建的设置窗口对象
 */
function createSettingsWindow() {
  // 如果窗口已存在则聚焦并返回
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    width: 400,
    height: 600,
    frame: false,
    modal: true,
    show: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: titleBarOverlay,
    parent: mainWindow,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
    },
  });

  settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'settings.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  // 处理F12快捷键
  settingsWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      settingsWindow.webContents.openDevTools({ mode: 'detach' });
      event.preventDefault();
    } else if (input.key === 'Escape') {
      settingsWindow.close();
      event.preventDefault();
    }
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

/**
 * 关闭设置窗口
 */
function closeSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
    settingsWindow = null;
  }
}

/**
 * 切换主窗口显示状态
 */
function toggleMainWindow() {
  // 检查窗口是否存在且未被销毁
  if (!mainWindow || mainWindow.isDestroyed()) {
    // 如果窗口不存在或已销毁，则创建新窗口
    createMainWindow();
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

/**
 * 关闭添加/编辑项目窗口
 */
function closeAddItemWindow() {
  if (addItemWindow && !addItemWindow.isDestroyed()) {
    addItemWindow.close();
    addItemWindow = null;
  }
}

/**
 * 最小化主窗口
 */
function minimizeMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
}

/**
 * 隐藏主窗口
 */
function hideMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
}

/**
 * 通知主窗口项目列表已更新
 */
function notifyItemsUpdated() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('items-updated');
  }
}

/**
 * 获取主窗口引用
 * @returns {BrowserWindow} 主窗口对象
 */
function getMainWindow() {
  return mainWindow;
}

/**
 * 获取添加项目窗口引用
 * @returns {BrowserWindow} 添加项目窗口对象
 */
function getAddItemWindow() {
  return addItemWindow;
}

/**
 * 获取设置窗口引用
 * @returns {BrowserWindow} 设置窗口对象
 */
function getSettingsWindow() {
  return settingsWindow;
}

// 导出模块函数
module.exports = {
  createMainWindow,
  createAddItemWindow,
  createEditItemWindow,
  createSettingsWindow,  // 添加新函数导出
  toggleMainWindow,
  closeAddItemWindow,
  closeSettingsWindow,   // 添加新函数导出
  minimizeMainWindow,
  hideMainWindow,
  notifyItemsUpdated,
  getMainWindow,
  getAddItemWindow,
  getSettingsWindow      // 添加新函数导出
};