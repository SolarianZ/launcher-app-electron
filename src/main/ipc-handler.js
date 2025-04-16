/**
 * IPC通信处理模块
 * 负责处理主进程和渲染进程之间的所有通信
 * 所有渲染进程通过预加载脚本暴露的API与主进程通信
 */
const { ipcMain, dialog } = require('electron');

// 导入其他模块
const windowManager = require('./window-manager');
const dataStore = require('./data-store');
const itemHandler = require('./item-handler');
const i18n = require('../shared/i18n'); // 导入i18n模块

/**
 * 设置所有 IPC 通信处理器
 * IPC通信类型分为两种：
 * 1. on/send - 单向通信，不等待回复
 * 2. handle/invoke - 请求/响应模式，返回Promise
 */
function setupIpcHandlers() {
  /**
   * 窗口控制相关IPC处理
   * 处理窗口最小化、关闭、显示等操作
   */
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

  /**
   * 项目数据管理相关IPC处理
   * 处理项目的获取、添加、更新、删除和重排序
   */
  ipcMain.handle('get-items', () => {
    return dataStore.getItems();
  });

  ipcMain.handle('add-item', (event, item) => {
    const result = dataStore.addItem(item);
    if (result.success) {
      // 通知所有窗口数据已更新
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

  /**
   * 项目编辑窗口相关IPC处理
   * 处理添加和编辑项目的对话框
   */
  ipcMain.on('show-add-item-dialog', () => {
    windowManager.createAddItemWindow();
  });

  ipcMain.on('show-edit-item-dialog', (event, { item, index }) => {
    windowManager.createEditItemWindow(item, index);
  });

  /**
   * 项目类型判断
   * 根据路径确定项目类型(文件、文件夹、URL或命令)
   */
  ipcMain.handle('get-item-type', (event, path) => {
    return itemHandler.getItemType(path);
  });

  /**
   * 项目操作相关IPC处理
   * 处理打开项目、在文件夹中显示、复制等操作
   */
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

  /**
   * 文件和文件夹选择对话框
   * 使用系统原生对话框选择文件或文件夹
   */
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

  /**
   * 主题相关IPC处理
   * 处理主题变更通知
   */
  ipcMain.on('theme-changed', (event, theme) => {
    // 获取主窗口并发送主题变更通知
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-changed', theme);
    }

    // 通知编辑窗口(如果存在)
    const editItemWindow = windowManager.getAddItemWindow();
    if (editItemWindow && !editItemWindow.isDestroyed()) {
      editItemWindow.webContents.send('theme-changed', theme);
    }
  });

  /**
   * 语言相关IPC处理
   * 处理语言变更通知
   */
  ipcMain.on('language-changed', (event, language) => {
    // 获取所有窗口并发送语言变更通知
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('language-changed', language);
    }

    // 通知编辑窗口(如果存在)
    const editItemWindow = windowManager.getAddItemWindow();
    if (editItemWindow && !editItemWindow.isDestroyed()) {
      editItemWindow.webContents.send('language-changed', language);
    }

    // 存储语言设置到全局变量，以便在创建新窗口时使用
    global.appLanguage = language;
  });

  /**
   * 设置相关 IPC 处理
   * 处理打开存储位置、清除所有项目等操作
   */
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

  /**
   * 开发者工具相关IPC处理
   */
  ipcMain.on('open-devtools', (event) => {
    // 检查事件来源是哪个窗口
    const webContents = event.sender;
    webContents.openDevTools({ mode: 'detach' });
  });

  /**
   * 外部链接相关IPC处理
   */
  ipcMain.on('open-external-link', (event, url) => {
    require('electron').shell.openExternal(url);
  });

  /**
   * 应用信息相关IPC处理
   */
  ipcMain.handle('get-app-info', () => {
    const { app } = require('electron');
    return {
      version: app.getVersion(),
      name: app.getName(),
      electronVersion: process.versions.electron,
    };
  });
  
  /**
   * 国际化(i18n)相关IPC处理
   * 在主进程中处理所有i18n功能调用
   */
  
  // 翻译文本
  ipcMain.handle('i18n-translate', (event, { key, params }) => {
    return i18n.t(key, params);
  });
  
  // 设置语言
  ipcMain.handle('i18n-set-language', (event, language) => {
    return i18n.setLanguage(language);
  });
  
  // 获取当前语言
  ipcMain.handle('i18n-get-current-language', () => {
    return i18n.getCurrentLanguage();
  });
  
  // 获取系统语言
  ipcMain.handle('i18n-get-system-language', () => {
    return i18n.getSystemLanguage();
  });
  
  // 获取可用语言列表
  ipcMain.handle('i18n-get-available-languages', () => {
    return i18n.getAvailableLanguages();
  });
  
  // 获取语言名称
  ipcMain.handle('i18n-get-language-name', (event, langCode) => {
    return i18n.getLanguageName(langCode);
  });
}

// 导出模块函数
module.exports = {
  setupIpcHandlers
};