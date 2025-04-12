const { app, globalShortcut } = require('electron');

// 导入拆分后的模块
const windowManager = require('./src/window-manager');
const dataStore = require('./src/data-store');
const trayManager = require('./src/tray-manager');
const itemHandler = require('./src/item-handler');
const ipcHandler = require('./src/ipc-handler');

// 注册全局快捷键
function registerGlobalShortcuts() {
  // Alt+Shift+Q 快捷键切换主窗口显示状态
  globalShortcut.register('Alt+Shift+Q', () => {
    windowManager.toggleMainWindow();
  });
}

// 应用初始化
app.whenReady().then(() => {
  // 加载数据
  dataStore.loadItems();
  
  // 创建主窗口
  windowManager.createMainWindow();
  
  // 创建系统托盘图标
  trayManager.createTray(windowManager.toggleMainWindow);
  trayManager.updateTrayMenu(dataStore.getItems(), itemHandler.handleItemAction);
  
  // 注册全局快捷键
  registerGlobalShortcuts();
  
  // 设置IPC通信处理器
  ipcHandler.setupIpcHandlers();
});

// 当所有窗口关闭时
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS点击dock图标时
app.on('activate', () => {
  if (!windowManager.getMainWindow()) {
    windowManager.createMainWindow();
  }
});

// 退出前清理
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  trayManager.destroyTray();
});

// 在数据更改后更新托盘菜单
dataStore.loadItems();
const originalSaveItems = dataStore.saveItems;
dataStore.saveItems = function() {
  const result = originalSaveItems.apply(this, arguments);
  trayManager.updateTrayMenu(dataStore.getItems(), itemHandler.handleItemAction);
  return result;
};
