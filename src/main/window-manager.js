const { BrowserWindow } = require('electron');
const path = require('path');
const dataStore = require('./data-store');

// 全局窗口引用
let mainWindow = null;
let addItemWindow = null;

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

  // 使用保存的窗口配置，如果存在的话
  const windowOptions = {
    width: mainWindowConfig.width || 400,
    height: mainWindowConfig.height || 600,
    minWidth: 300,
    minHeight: 300,
    maximizable: false,
    fullscreenable: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      height: 30,
      color: 'rgba(0, 0, 0, 0)',
      symbolColor: 'white',
    },
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
    },
  };

  // 如果存在保存的位置坐标，则使用它们
  if (mainWindowConfig.x !== undefined && mainWindowConfig.y !== undefined) {
    windowOptions.x = mainWindowConfig.x;
    windowOptions.y = mainWindowConfig.y;
  }

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  // mainWindow.webContents.openDevTools(); // 开发时可启用

  // 避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 不在任务栏显示
  mainWindow.setSkipTaskbar(true);

  // 处理快捷键
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape') {
      mainWindow.hide();
      event.preventDefault();
    }
  });

  // 保存窗口调整大小和移动时的位置和尺寸
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) {
      const bounds = mainWindow.getBounds();
      dataStore.updateMainWindowConfig({
        width: bounds.width,
        height: bounds.height
      });
    }
  });

  mainWindow.on('move', () => {
    if (!mainWindow.isMaximized()) {
      const bounds = mainWindow.getBounds();
      dataStore.updateMainWindowConfig({
        x: bounds.x,
        y: bounds.y
      });
    }
  });

  // 窗口关闭时清除引用
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
    height: 300,
    resizable: false,
    frame: false,
    modal: true,
    parent: mainWindow,
    show: false,
    transparent: true,
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

// 导出模块函数
module.exports = {
  createMainWindow,
  createAddItemWindow,
  createEditItemWindow,
  toggleMainWindow,
  closeAddItemWindow,
  minimizeMainWindow,
  hideMainWindow,
  notifyItemsUpdated,
  getMainWindow,
  getAddItemWindow
};