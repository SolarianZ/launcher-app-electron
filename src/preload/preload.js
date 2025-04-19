/**
 * 预加载脚本
 * 在渲染进程加载前执行，安全地暴露特定API给渲染进程
 * 作为渲染进程和主进程之间的桥梁，确保渲染进程不直接访问Node.js API
 */
const { contextBridge, ipcRenderer, webUtils } = require("electron");

/**
 * 通过contextBridge安全地暴露API给渲染进程
 * 所有渲染进程的JavaScript可以通过window.electronAPI访问这些函数
 */
contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * 窗口控制相关API
   * 允许渲染进程控制应用窗口
   */
  minimizeWindow: () => ipcRenderer.send("minimize-window"),
  closeWindow: () => ipcRenderer.send("close-window"),
  closeAddItemWindow: () => ipcRenderer.send("close-add-item-window"),
  closeSettingsWindow: () => ipcRenderer.send("close-settings-window"),
  showSettingsWindow: () => ipcRenderer.send("show-settings-window"),
  
  /**
   * 主题相关API
   * 允许设置窗口通知主题变更
   */
  themeChanged: (theme) => ipcRenderer.send("theme-changed", theme),

  /**
   * 语言相关API
   * 允许设置窗口通知语言变更
   */
  languageChanged: (language) => ipcRenderer.send("language-changed", language),

  /**
   * 事件监听相关API
   * 允许渲染进程注册对主进程事件的监听
   */
  // 监听列表更新事件
  onItemsUpdated: (callback) => {
    ipcRenderer.on("items-updated", () => callback());

    // 返回清理函数，用于移除事件监听，防止内存泄漏
    return () => {
      ipcRenderer.removeAllListeners("items-updated");
    };
  },

  // 监听编辑条目数据
  onEditItemData: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on("edit-item-data", listener);
    // 返回清理函数
    return () => {
      ipcRenderer.removeListener("edit-item-data", listener);
    };
  },

  // 监听主题变更
  onThemeChanged: (callback) => {
    const listener = (event, theme) => callback(theme);
    ipcRenderer.on("theme-changed", listener);
    return () => {
      ipcRenderer.removeListener("theme-changed", listener);
    };
  },

  // 监听语言变更
  onLanguageChanged: (callback) => {
    const listener = (event, language) => callback(language);
    ipcRenderer.on("language-changed", listener);
    return () => {
      ipcRenderer.removeListener("language-changed", listener);
    };
  },

  /**
   * 项目管理相关API
   * 允许渲染进程获取、添加、更新和删除项目
   */
  getItems: () => ipcRenderer.invoke("get-items"),
  addItem: (item) => ipcRenderer.invoke("add-item", item),
  removeItem: (index) => ipcRenderer.invoke("remove-item", index),
  updateItemsOrder: (items) => ipcRenderer.invoke("update-items-order", items),
  showAddItemDialog: () => ipcRenderer.send("show-add-item-dialog"),
  showEditItemDialog: (item, index) =>
    ipcRenderer.send("show-edit-item-dialog", { item, index }),

  /**
   * 项目类型判断API
   * 根据路径判断项目类型(文件、文件夹、URL或命令)
   */
  getItemType: (path) => ipcRenderer.invoke("get-item-type", path),

  /**
   * 项目操作相关API
   * 允许渲染进程对项目执行各种操作
   */
  updateItem: (index, updatedItem) =>
    ipcRenderer.invoke("update-item", { index, updatedItem }),
  openItem: (item) => ipcRenderer.send("open-item", item),
  showItemInFolder: (path) => ipcRenderer.send("show-item-in-folder", path),
  copyText: (text) => ipcRenderer.send("copy-text", text),

  /**
   * 文件路径获取API
   * 使用webUtils.getPathForFile获取文件路径
   * 注意：最新版Electron中，无法使用event.dataTransfer.files[0].path
   * 必须使用webUtils.getPathForFile来安全获取文件路径
   */
  getFileOrFolderPath: (item) => {
    if (!item) return undefined;
    return webUtils.getPathForFile(item);
  },

  /**
   * 文件和文件夹选择对话框API
   * 允许渲染进程调用原生文件选择对话框
   */
  selectFile: () => ipcRenderer.invoke("select-file"),
  selectFolder: () => ipcRenderer.invoke("select-folder"),

  /**
   * 平台信息API
   * 获取当前运行平台信息(win32、darwin、linux)
   */
  getPlatform: () => process.platform,
  
  /**
   * 设置相关API
   * 提供各种设置和实用功能
   */
  openStorageLocation: () => ipcRenderer.send("open-storage-location"),
  clearAllItems: () => ipcRenderer.send("clear-all-items"),
  openDevTools: () => ipcRenderer.send("open-devtools"),
  openExternalLink: (url) => ipcRenderer.send("open-external-link", url),
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),

  /**
   * 国际化(i18n)API
   * 与主进程通信获取多语言支持功能
   */
  i18n: {
    t: (key, params = null) => ipcRenderer.invoke("i18n-translate", { key, params }),
    setLanguage: (language) => ipcRenderer.invoke("i18n-set-language", language),
    getCurrentLanguage: () => ipcRenderer.invoke("i18n-get-current-language"),
    getSystemLanguage: () => ipcRenderer.invoke("i18n-get-system-language"),
    getAvailableLanguages: () => ipcRenderer.invoke("i18n-get-available-languages"),
    getLanguageName: (langCode) => ipcRenderer.invoke("i18n-get-language-name", langCode),
    addLanguageChangeListener: (callback) => {
      const listener = (event, language) => callback(language);
      ipcRenderer.on("language-changed", listener);
      return () => {
        ipcRenderer.removeListener("language-changed", listener);
      };
    },
    removeLanguageChangeListener: (callback) => {
      // 由于我们使用IPC的事件系统，无需手动移除特定的监听器
      // IPC回调是由返回的清理函数管理的
      return true;
    }
  },
});
