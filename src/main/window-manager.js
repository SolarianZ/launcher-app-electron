/**
 * 窗口管理模块
 * 负责创建和管理应用程序中的所有窗口
 */
const { BrowserWindow, app, nativeTheme } = require('electron');
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
 * 根据当前主题获取适当的窗口背景色
 * @returns {string} 适合当前主题的背景色
 */
function getThemeBackgroundColor() {
  const theme = global.appTheme || 'system';
  
  if (theme === 'light') {
    return '#f5f5f5'; // 浅色主题背景色
  } else if (theme === 'dark') {
    return '#1e1e1e'; // 深色主题背景色
  } else {
    // 跟随系统
    return nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#f5f5f5';
  }
}

/**
 * 执行窗口淡出动画
 * 通过逐渐降低窗口透明度实现平滑淡出效果，避免在macOS上出现闪烁
 * @param {BrowserWindow} window 需要淡出的窗口对象
 * @param {Function} onComplete 动画完成后的回调函数
 * @param {Object} options 动画选项
 * @param {number} options.fadeStep 每次淡出的透明度步长，默认 0.1
 * @param {number} options.fadeInterval 淡出动画的时间间隔(毫秒)，默认 10ms
 */
function fadeWindowOut(window, onComplete, options = {}) {
  if (!window || window.isDestroyed()) {
    return;
  }

  // 如果不是macOS，则跳过淡出动画直接执行回调
  if (process.platform !== 'darwin') {
    onComplete();
    return;
  }

  // 动画参数
  const fadeStep = options.fadeStep || 0.1;
  const fadeInterval = options.fadeInterval || 10;

  // 确保起始透明度为1
  window.setOpacity(1.0);

  // 执行淡出动画
  const fade = () => {
    if (!window || window.isDestroyed()) return;

    let opacity = window.getOpacity() - fadeStep;
    if (opacity > 0) {
      window.setOpacity(opacity);
      setTimeout(fade, fadeInterval);
    } else {
      // 完全透明后执行回调
      window.setOpacity(0);
      onComplete();
    }
  };

  // 开始淡出动画
  fade();
}

/**
 * 创建主窗口
 * @returns {BrowserWindow} 创建的主窗口对象
 */
function createMainWindow(showOnReady = true) {
  // 如果主窗口已存在，则返回现有窗口
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  // 加载保存的窗口配置
  const appConfig = dataStore.loadAppConfig();
  const mainWindowConfig = appConfig.mainWindow;

  /**
   * 设置窗口选项 
   * 注意：某些配置是平台特定的，如titleBarStyle和titleBarOverlay
   */
  const windowOptions = {
    width: mainWindowConfig.width,
    height: mainWindowConfig.height,
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
    show: false, // 先创建隐藏窗口，等UI准备好后再显示，避免闪烁
    frame: false, // 无框窗口
    backgroundColor: getThemeBackgroundColor(), // 添加暗色背景，避免白色闪烁
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
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

  // 注意：不再在这里显示窗口，而是等待渲染进程通知UI准备完成
  // UI准备完成后会调用 showMainWindowWhenReady 函数

  // 不在任务栏显示图标
  // mainWindow.setSkipTaskbar(true);

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
    }
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
    height: 370,
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
    backgroundColor: getThemeBackgroundColor(), // 添加背景色，避免白色闪烁
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
    },
  });

  addItemWindow.loadFile(path.join(__dirname, '..', 'renderer', 'edit-item.html'));

  // 注意：不再在ready-to-show事件中显示窗口，而是等待渲染进程通知UI准备完成

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
    backgroundColor: getThemeBackgroundColor(), // 添加背景色，避免白色闪烁
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
    },
  });

  settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'settings.html'));

  // 注意：不再在ready-to-show事件中显示窗口，而是等待渲染进程通知UI准备完成

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

/**
 * 关闭设置窗口
 * 使用平滑动画避免闪烁
 */
function closeSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    // 使用公共的淡出函数处理窗口关闭
    fadeWindowOut(settingsWindow, () => {
      settingsWindow.close();
      settingsWindow = null;
    });
  }
}

/**
 * 显示主窗口（如不存在则创建）
 */
function showMainWindow() {
  // 检查窗口是否存在且未被销毁
  if (!mainWindow || mainWindow.isDestroyed()) {
    // 如果窗口不存在或已销毁，则创建新窗口
    createMainWindow();
    return;
  }

  // 无论窗口是否可见，都确保显示并聚焦
  mainWindow.show();
  mainWindow.focus();
}

/**
 * 关闭添加/编辑项目窗口
 * 使用平滑动画避免闪烁
 */
function closeAddItemWindow() {
  if (addItemWindow && !addItemWindow.isDestroyed()) {
    // 使用公共的淡出函数处理窗口关闭
    fadeWindowOut(addItemWindow, () => {
      addItemWindow.close();
      addItemWindow = null;
    });
  }
}

/**
 * 隐藏主窗口
 * 在macOS上使用淡出动画避免闪烁
 */
function hideMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // 使用公共的淡出函数处理窗口隐藏
    fadeWindowOut(mainWindow, () => {
      mainWindow.hide();
      // 重置透明度，以便下次显示
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setOpacity(1.0);
        }
      }, 100);
    });
  }
}

/**
 * 通知主窗口项目列表已更新
 * @param {number} newItemIndex 新添加项目的索引（可选）
 */
function notifyItemsUpdated(newItemIndex) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('items-updated', newItemIndex);
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

/**
 * 当UI准备好后显示主窗口
 * 由渲染进程通知UI（主题和语言）已完全准备就绪时调用
 */
function showMainWindowWhenReady() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
}

/**
 * 当UI准备好后显示设置窗口
 */
function showSettingsWindowWhenReady() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
  }
}

/**
 * 当UI准备好后显示添加/编辑项目窗口
 */
function showAddItemWindowWhenReady() {
  if (addItemWindow && !addItemWindow.isDestroyed()) {
    addItemWindow.show();
    addItemWindow.focus();
  }
}

// 导出模块函数
module.exports = {
  createMainWindow,
  createAddItemWindow,
  createEditItemWindow,
  createSettingsWindow,
  showMainWindow,
  closeAddItemWindow,
  closeSettingsWindow,
  hideMainWindow,
  notifyItemsUpdated,
  getMainWindow,
  getAddItemWindow,
  getSettingsWindow,
  showMainWindowWhenReady,
  showSettingsWindowWhenReady,
  showAddItemWindowWhenReady
};