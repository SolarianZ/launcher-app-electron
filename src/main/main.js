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

/**
 * 注册全局快捷键
 * 设置全局键盘快捷键以便在任何应用程序焦点状态下控制启动器
 */
function registerGlobalShortcuts() {
  // Alt+Shift+Q 快捷键切换主窗口显示状态
  globalShortcut.register('Alt+Shift+Q', () => {
    windowManager.toggleMainWindow();
  });
}

/**
 * 更新托盘菜单
 * 在数据变化时调用此函数更新托盘菜单
 * 显示最近的项目并允许用户快速访问
 */
function updateTrayMenuWithItems() {
  trayManager.updateTrayMenu(dataStore.getItems(), itemHandler.handleItemAction);
}

// 应用初始化 - 当Electron完成初始化并准备创建浏览器窗口时触发
app.whenReady().then(() => {
  // 加载数据和窗口配置
  dataStore.loadItems();
  dataStore.loadWindowConfig();
  
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
  globalShortcut.unregisterAll();
  // 销毁托盘图标
  trayManager.destroyTray();
});
