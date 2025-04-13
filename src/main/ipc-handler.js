const { ipcMain, dialog } = require('electron');

// 导入其他模块
const windowManager = require('./window-manager');
const dataStore = require('./data-store');
const itemHandler = require('./item-handler');

/**
 * 设置所有 IPC 通信处理器
 */
function setupIpcHandlers() {
  // 窗口控制
  ipcMain.on('minimize-window', () => {
    windowManager.minimizeMainWindow();
  });

  ipcMain.on('close-window', () => {
    windowManager.hideMainWindow();
  });

  ipcMain.on('close-add-item-window', () => {
    windowManager.closeAddItemWindow();
  });

  ipcMain.on('close-settings-window', () => {
    windowManager.closeSettingsWindow();
  });

  ipcMain.on('show-settings-window', () => {
    windowManager.createSettingsWindow();
  });

  // 项目管理
  ipcMain.handle('get-items', () => {
    return dataStore.getItems();
  });

  ipcMain.handle('add-item', (event, item) => {
    const result = dataStore.addItem(item);
    if (result.success) {
      windowManager.notifyItemsUpdated();
    }
    return result;
  });

  ipcMain.handle('update-item', (event, { index, updatedItem }) => {
    const result = dataStore.updateItem(index, updatedItem);
    if (result.success) {
      windowManager.notifyItemsUpdated();
    }
    return result;
  });

  ipcMain.handle('remove-item', (event, index) => {
    const result = dataStore.removeItem(index);
    if (result.success) {
      windowManager.notifyItemsUpdated();
    }
    return result;
  });

  ipcMain.handle('update-items-order', (event, newItems) => {
    const result = dataStore.updateItemsOrder(newItems);
    return result;
  });

  ipcMain.on('show-add-item-dialog', () => {
    windowManager.createAddItemWindow();
  });

  ipcMain.on('show-edit-item-dialog', (event, { item, index }) => {
    windowManager.createEditItemWindow(item, index);
  });

  // 项目类型判断
  ipcMain.handle('get-item-type', (event, path) => {
    return itemHandler.getItemType(path);
  });

  // 项目操作
  ipcMain.on('open-item', (event, item) => {
    itemHandler.handleItemAction(item);
  });

  ipcMain.on('show-item-in-folder', (event, path) => {
    itemHandler.showItemInFolder(path);
  });

  ipcMain.on('copy-text', (event, text) => {
    itemHandler.copyText(text);
  });

  ipcMain.on('copy-file', (event, path) => {
    itemHandler.copyFile(path);
  });

  // 文件和文件夹选择对话框
  ipcMain.handle('select-file', async () => {
    const addItemWindow = windowManager.getAddItemWindow();
    if (!addItemWindow) return { canceled: true };
    
    const { canceled, filePaths } = await dialog.showOpenDialog(addItemWindow, {
      properties: ['openFile']
    });
    
    if (canceled || !filePaths || filePaths.length === 0) {
      return { canceled: true };
    }
    
    return { 
      canceled: false, 
      filePath: filePaths[0],
    };
  });
  
  ipcMain.handle('select-folder', async () => {
    const addItemWindow = windowManager.getAddItemWindow();
    if (!addItemWindow) return { canceled: true };
    
    const { canceled, filePaths } = await dialog.showOpenDialog(addItemWindow, {
      properties: ['openDirectory']
    });
    
    if (canceled || !filePaths || filePaths.length === 0) {
      return { canceled: true };
    }
    
    return { 
      canceled: false, 
      filePath: filePaths[0],
    };
  });

  // 设置相关 IPC 处理
  ipcMain.on('open-storage-location', () => {
    const userDataPath = dataStore.getUserDataPath();
    if (userDataPath) {
      require('electron').shell.openPath(userDataPath);
    }
  });

  ipcMain.on('clear-all-items', () => {
    dataStore.clearAllItems();
    windowManager.notifyItemsUpdated();
  });

  ipcMain.on('open-devtools', (event) => {
    // 检查事件来源是哪个窗口
    const webContents = event.sender;
    webContents.openDevTools({ mode: 'detach' });
  });

  ipcMain.on('open-external-link', (event, url) => {
    require('electron').shell.openExternal(url);
  });

  ipcMain.handle('get-app-info', () => {
    const { app } = require('electron');
    return {
      version: app.getVersion(),
      name: app.getName(),
      electronVersion: process.versions.electron,
    };
  });
}

// 导出模块函数
module.exports = {
  setupIpcHandlers
};