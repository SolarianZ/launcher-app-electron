/**
 * 主进程入口文件
 * 负责应用程序的初始化、生命周期管理和核心功能协调
 */
const { app, globalShortcut } = require('electron');

// 添加一个标志，用于区分应用是要退出还是只是关闭主窗口
app.isQuitting = false;

// 导入拆分后的模块
const windowManager = require('./window-manager');
const dataStore = require('./data-store');
const trayManager = require('./tray-manager');
const itemHandler = require('./item-handler');
const ipcHandler = require('./ipc-handler');
const i18n = require('../shared/i18n');

// 存储当前注册的全局快捷键
let currentRegisteredShortcut = null;

/**
 * 注册全局快捷键
 * 根据用户配置设置全局键盘快捷键
 */
function registerGlobalShortcuts() {
  // 注销之前可能注册的快捷键
  unregisterGlobalShortcuts();
  
  // 加载快捷键配置
  const shortcutConfig = dataStore.getAppConfig().shortcut;
  
  // 如果启用了全局快捷键，则注册
  if (shortcutConfig.enabled && shortcutConfig.shortcut) {
    try {
      globalShortcut.register(shortcutConfig.shortcut, () => {
        windowManager.toggleMainWindow();
      });
      currentRegisteredShortcut = shortcutConfig.shortcut;
      console.log(`全局快捷键 ${shortcutConfig.shortcut} 注册成功`);
    } catch (error) {
      console.error(`全局快捷键注册失败: ${error.message}`);
    }
  }
}

/**
 * 注销所有已注册的全局快捷键
 */
function unregisterGlobalShortcuts() {
  if (currentRegisteredShortcut) {
    try {
      globalShortcut.unregister(currentRegisteredShortcut);
      currentRegisteredShortcut = null;
      console.log('全局快捷键已注销');
    } catch (error) {
      console.error(`全局快捷键注销失败: ${error.message}`);
    }
  }
}

/**
 * 更新托盘菜单
 * 在数据变化时调用此函数更新托盘菜单
 * 显示最近的项目并允许用户快速访问
 */
function updateTrayMenuWithItems() {
  trayManager.updateTrayMenu(dataStore.getItems(), itemHandler.handleItemAction);
}

/**
 * 初始化应用语言设置
 * 获取系统语言并设置为应用默认语言
 */
function initializeLanguage() {
  // 获取系统语言
  const systemLanguage = i18n.getSystemLanguage();
  
  // 设置为全局语言变量，以便在创建新窗口时使用
  global.appLanguage = systemLanguage;
  
  // 初始化i18n模块
  i18n.setLanguage(systemLanguage);
  
  console.log(`应用语言初始化为: ${systemLanguage}`);
}

// 应用初始化 - 当Electron完成初始化并准备创建浏览器窗口时触发
app.whenReady().then(() => {
  // 初始化应用语言
  initializeLanguage();
  
  // 加载数据和配置
  dataStore.loadItems();
  dataStore.loadAppConfig();
  
  // 创建主窗口
  windowManager.createMainWindow();
  
  // 创建系统托盘图标
  trayManager.createTray(windowManager.toggleMainWindow);
  updateTrayMenuWithItems();
  
  // 注册全局快捷键
  registerGlobalShortcuts();
  
  // 设置IPC通信处理器 - 用于主进程和渲染进程间通信
  ipcHandler.setupIpcHandlers();
  
  // 在数据存储中添加更新回调，确保数据变化时托盘菜单同步更新
  dataStore.addChangeListener(updateTrayMenuWithItems);
  
  // 添加快捷键配置变化监听器
  dataStore.addShortcutChangeListener(config => {
    registerGlobalShortcuts();
  });
});

// 当所有窗口关闭时
app.on('window-all-closed', () => {
  // 在macOS上，关闭所有窗口通常不会退出应用程序
  // 除非用户使用Cmd+Q显式退出
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS平台特定 - 点击dock图标时
app.on('activate', () => {
  // 在macOS上，当点击dock图标且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口
  if (!windowManager.getMainWindow()) {
    windowManager.createMainWindow();
  }
});

// 应用退出前清理资源
app.on('will-quit', () => {
  // 注销所有快捷键
  unregisterGlobalShortcuts();
  globalShortcut.unregisterAll();
  // 销毁托盘图标
  trayManager.destroyTray();
});
