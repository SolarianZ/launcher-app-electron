/**
 * 预加载脚本
 * 在渲染进程加载前执行，安全地暴露特定API给渲染进程
 * 作为渲染进程和主进程之间的桥梁，确保渲染进程不直接访问Node.js API
 */
const { contextBridge, ipcRenderer, webUtils } = require("electron");

/**
 * 保持与defines.js中的PathType一致
 */
const PathType = {
  FILE: "file",         // 文件类型
  FOLDER: "folder",     // 文件夹类型
  URL: "url",           // 网址类型
  COMMAND: "command",   // 命令类型
};

/**
 * 共享常量
 */
contextBridge.exposeInMainWorld("defines", {
  PathType: PathType,
});

/**
 * 通过contextBridge安全地暴露API给渲染进程
 * 所有渲染进程的JavaScript可以通过window.electronAPI访问这些函数
 */
contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * 窗口控制相关API
   * 允许渲染进程控制应用窗口
   */
  closeMainWindow: () => ipcRenderer.send("close-main-window"),
  closeAddItemWindow: () => ipcRenderer.send("close-add-item-window"),
  closeSettingsWindow: () => ipcRenderer.send("close-settings-window"),
  showSettingsWindow: () => ipcRenderer.send("show-settings-window"),

  /**
   * 主题相关API
   */
  themeChanged: (theme) => ipcRenderer.send("theme-changed", theme),
  getThemeConfig: () => ipcRenderer.invoke("get-theme-config"),

  /**
   * 语言相关API
   */
  languageChanged: (language) => ipcRenderer.send("language-changed", language),
  getLanguageConfig: () => ipcRenderer.invoke("get-language-config"),

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
   * 允许渲染进程获取、添加、更新和移除项目
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
   * 快捷键配置相关API
   * 获取和更新快捷键配置
   */
  getShortcutConfig: () => ipcRenderer.invoke("get-shortcut-config"),
  updateShortcutConfig: (config) => ipcRenderer.invoke("update-shortcut-config", config),
  testShortcut: (shortcut) => ipcRenderer.invoke("test-shortcut", shortcut),

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
    }
  },
});

/**
 * 暴露UI工具函数给渲染进程
 * 提供共享的UI功能，如主题应用和语言处理
 */
contextBridge.exposeInMainWorld("uiUtils", {
  /**
   * 应用主题设置
   * @param {string} theme 主题类型："system", "light", "dark"
   * @param {HTMLElement} container 要应用主题的容器元素
   */
  applyTheme: (theme, container) => {
    // 移除所有主题类
    container.classList.remove("dark-theme", "light-theme");

    // 根据主题类型应用相应的CSS类
    if (theme === "system") {
      // 调用下面的函数处理系统主题
      applySystemTheme(container);
    } else if (theme === "dark") {
      container.classList.add("dark-theme");
    } else if (theme === "light") {
      container.classList.add("light-theme");
    }
  },

  /**
   * 应用系统主题
   * 根据系统深色/浅色模式设置相应的主题
   * @param {HTMLElement} container 要应用主题的容器元素
   */
  applySystemTheme: (container) => {
    // 检测系统是否处于深色模式
    const isDarkMode =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    // 应用相应的主题类
    if (isDarkMode) {
      container.classList.add("dark-theme");
    } else {
      container.classList.remove("dark-theme");
    }
  },

  /**
   * 更新页面文本
   * 根据当前语言设置更新所有带有特定属性的元素文本
   * @param {Object} i18n 国际化模块实例
   */
  updatePageTexts: async (i18n) => {
    try {
      // 更新普通文本元素
      const elements = document.querySelectorAll('[data-i18n]');
      for (const el of elements) {
        const key = el.getAttribute('data-i18n');
        el.textContent = await i18n.t(key);
      }

      // 更新带有 title 属性的元素
      const titleElements = document.querySelectorAll('[data-i18n-title]');
      for (const el of titleElements) {
        const key = el.getAttribute('data-i18n-title');
        el.title = await i18n.t(key);
      }

      // 更新带有 placeholder 属性的元素
      const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
      for (const el of placeholderElements) {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = await i18n.t(key);
      }

      // 更新select元素的选项文本
      const selects = document.querySelectorAll("select");
      for (const select of selects) {
        const options = Array.from(select.options);
        for (const option of options) {
          if (option.hasAttribute("data-i18n")) {
            const key = option.getAttribute("data-i18n");
            option.textContent = await i18n.t(key);
          }
        }
      }
    } catch (error) {
      console.error("更新页面文本时出错:", error);
    }
  },

  /**
   * 监听系统主题变化
   * 当系统主题变化时，如果应用设置为跟随系统，则自动更新主题
   * @param {HTMLElement} container 要应用主题的容器元素
   */
  setupSystemThemeListener: (container) => {
    if (window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", async () => {
          // 获取当前主题配置
          const themeConfig = await ipcRenderer.invoke("get-theme-config");
          if (themeConfig === "system") {
            // 调用上面定义的函数
            applySystemTheme(container);
          }
        });
    }
  },
});

// 定义本地辅助函数，确保uiUtils.applySystemTheme内部可以调用
function applySystemTheme(container) {
  // 检测系统是否处于深色模式
  const isDarkMode =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // 应用相应的主题类
  if (isDarkMode) {
    container.classList.add("dark-theme");
  } else {
    container.classList.remove("dark-theme");
  }
}
