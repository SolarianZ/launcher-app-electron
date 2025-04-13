const { app, globalShortcut } = require('electron');

// 导入拆分后的模块
const windowManager = require('./window-manager');
const dataStore = require('./data-store');
const trayManager = require('./tray-manager');
const itemHandler = require('./item-handler');
const ipcHandler = require('./ipc-handler');

// 注册全局快捷键
function registerGlobalShortcuts() {
  // Alt+Shift+Q 快捷键切换主窗口显示状态
  globalShortcut.register('Alt+Shift+Q', () => {
    windowManager.toggleMainWindow();
  });
}

/**
 * 更新托盘菜单
 * 在数据变化时调用此函数更新托盘菜单
 */
function updateTrayMenuWithItems() {
  trayManager.updateTrayMenu(dataStore.getItems(), itemHandler.handleItemAction);
}

// 应用初始化
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
  
  // 设置IPC通信处理器
  ipcHandler.setupIpcHandlers();
  
  // 在数据存储中添加更新回调
  dataStore.addChangeListener(updateTrayMenuWithItems);
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
