/**
 * 数据存储模块
 * 负责应用程序数据的持久化存储和管理
 * 包括项目列表和窗口配置等数据
 */
const { app } = require("electron");
const fs = require("fs");
const path = require("path");

/**
 * 数据文件路径
 * 使用Electron的app.getPath("userData")获取跨平台的用户数据目录
 * - Windows: %APPDATA%\[appname]\
 * - macOS: ~/Library/Application Support/[appname]/
 * - Linux: ~/.config/[appname]/
 */
const userDataFolder = path.join(app.getPath("userData"), "UserData");
const dataFilePath = path.join(userDataFolder, "items.json");
const windowConfigPath = path.join(userDataFolder, "configs.json");
const shortcutConfigPath = path.join(userDataFolder, "shortcuts.json");

// 全局变量存储项目列表
let items = [];
// 全局变量存储窗口配置
let windowConfig = {
  mainWindow: {
    width: 400,
    height: 600,
    x: undefined,
    y: undefined
  }
};
// 全局变量存储快捷键配置
let shortcutConfig = {
  enabled: true,
  shortcut: "Alt+Shift+Q"
};

// 存储数据变化监听器 - 观察者模式实现
const changeListeners = [];
// 存储快捷键配置变化监听器
const shortcutChangeListeners = [];

/**
 * 添加数据变化监听器
 * @param {Function} listener 监听函数
 */
function addChangeListener(listener) {
  if (typeof listener === 'function' && !changeListeners.includes(listener)) {
    changeListeners.push(listener);
  }
}

/**
 * 移除数据变化监听器
 * @param {Function} listener 要移除的监听函数
 */
function removeChangeListener(listener) {
  const index = changeListeners.indexOf(listener);
  if (index !== -1) {
    changeListeners.splice(index, 1);
  }
}

/**
 * 通知所有监听器数据已变化
 */
function notifyChangeListeners() {
  for (const listener of changeListeners) {
    try {
      listener();
    } catch (error) {
      console.error("监听器执行错误:", error);
    }
  }
}

/**
 * 添加快捷键配置变化监听器
 * @param {Function} listener 监听函数
 */
function addShortcutChangeListener(listener) {
  if (typeof listener === 'function' && !shortcutChangeListeners.includes(listener)) {
    shortcutChangeListeners.push(listener);
  }
}

/**
 * 移除快捷键配置变化监听器
 * @param {Function} listener 要移除的监听函数
 */
function removeShortcutChangeListener(listener) {
  const index = shortcutChangeListeners.indexOf(listener);
  if (index !== -1) {
    shortcutChangeListeners.splice(index, 1);
  }
}

/**
 * 通知所有快捷键配置变化监听器
 */
function notifyShortcutChangeListeners() {
  for (const listener of shortcutChangeListeners) {
    try {
      listener(shortcutConfig);
    } catch (error) {
      console.error("快捷键监听器执行错误:", error);
    }
  }
}

/**
 * 加载保存的项目列表
 * @returns {Array} 项目列表
 */
function loadItems() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, "utf8");
      items = JSON.parse(data);
      return items;
    }
    return [];
  } catch (error) {
    console.error("Error loading items:", error);
    items = [];
    return [];
  }
}

/**
 * 保存项目列表到磁盘
 * @returns {boolean} 是否保存成功
 */
function saveItems() {
  try {
    const dirPath = path.dirname(dataFilePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(items, null, 2), "utf8");
    notifyChangeListeners();
    return true;
  } catch (error) {
    console.error("Error saving items:", error);
    return false;
  }
}

/**
 * 添加新项目
 * @param {Object} item 要添加的项目
 * @returns {Object} 结果对象，包含成功标志和可能的错误消息
 */
function addItem(item) {
  // 检查是否已存在相同路径的项目
  const exists = items.some((i) => i.path === item.path);
  if (exists) {
    return { success: false, message: "条目已存在" };
  }

  items.push(item);
  const saved = saveItems();
  return { success: saved, message: saved ? "" : "保存失败" };
}

/**
 * 更新指定索引的项目
 * @param {number} index 项目索引
 * @param {Object} updatedItem 更新后的项目
 * @returns {Object} 结果对象
 */
function updateItem(index, updatedItem) {
  if (index < 0 || index >= items.length) {
    return { success: false, message: "项目不存在" };
  }

  items[index] = updatedItem;
  const saved = saveItems();
  return { success: saved, message: saved ? "" : "保存失败" };
}

/**
 * 移除指定索引的项目
 * @param {number} index 项目索引
 * @returns {Object} 结果对象
 */
function removeItem(index) {
  if (index < 0 || index >= items.length) {
    return { success: false, message: "项目不存在" };
  }

  items.splice(index, 1);
  const saved = saveItems();
  return { success: saved, message: saved ? "" : "保存失败" };
}

/**
 * 更新项目顺序
 * @param {Array} newItems 新的项目列表
 * @returns {Object} 结果对象
 */
function updateItemsOrder(newItems) {
  items = newItems;
  const saved = saveItems();
  return { success: saved, message: saved ? "" : "保存失败" };
}

/**
 * 获取当前项目列表
 * @returns {Array} 项目列表
 */
function getItems() {
  return items;
}

/**
 * 清除所有项目
 * @returns {Object} 结果对象
 */
function clearAllItems() {
  items = [];
  const saved = saveItems();
  return { success: saved, message: saved ? "" : "清除失败" };
}

/**
 * 获取存储文件路径
 * @returns {string} 存储文件的绝对路径
 */
function getStoragePath() {
  return dataFilePath;
}

/**
 * 获取应用数据文件夹路径
 * @returns {string} 应用数据文件夹的绝对路径
 */
function getUserDataPath() {
  return app.getPath("userData");
}

/**
 * 加载窗口配置
 * @returns {Object} 窗口配置
 */
function loadWindowConfig() {
  try {
    if (fs.existsSync(windowConfigPath)) {
      const data = fs.readFileSync(windowConfigPath, "utf8");
      windowConfig = JSON.parse(data);
      return windowConfig;
    }
    return windowConfig;
  } catch (error) {
    console.error("Error loading window config:", error);
    return windowConfig;
  }
}

/**
 * 保存窗口配置到磁盘
 * @param {Object} config 要保存的窗口配置
 * @returns {boolean} 是否保存成功
 */
function saveWindowConfig(config = null) {
  if (config) {
    windowConfig = config;
  }

  try {
    const dirPath = path.dirname(windowConfigPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(windowConfigPath, JSON.stringify(windowConfig, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error saving window config:", error);
    return false;
  }
}

/**
 * 更新主窗口配置
 * @param {Object} bounds 窗口的边界配置 {x, y, width, height}
 * @returns {boolean} 是否保存成功
 */
function updateMainWindowConfig(bounds) {
  windowConfig.mainWindow = { ...windowConfig.mainWindow, ...bounds };
  return saveWindowConfig();
}

/**
 * 获取窗口配置
 * @returns {Object} 窗口配置对象
 */
function getWindowConfig() {
  return windowConfig;
}

/**
 * 加载快捷键配置
 * @returns {Object} 快捷键配置
 */
function loadShortcutConfig() {
  try {
    if (fs.existsSync(shortcutConfigPath)) {
      const data = fs.readFileSync(shortcutConfigPath, "utf8");
      shortcutConfig = JSON.parse(data);
      return shortcutConfig;
    }
    return shortcutConfig;
  } catch (error) {
    console.error("Error loading shortcut config:", error);
    return shortcutConfig;
  }
}

/**
 * 保存快捷键配置到磁盘
 * @returns {boolean} 是否保存成功
 */
function saveShortcutConfig() {
  try {
    const dirPath = path.dirname(shortcutConfigPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(shortcutConfigPath, JSON.stringify(shortcutConfig, null, 2), "utf8");
    notifyShortcutChangeListeners();
    return true;
  } catch (error) {
    console.error("Error saving shortcut config:", error);
    return false;
  }
}

/**
 * 更新快捷键配置
 * @param {Object} config 新的快捷键配置
 * @returns {boolean} 是否保存成功
 */
function updateShortcutConfig(config) {
  shortcutConfig = { ...shortcutConfig, ...config };
  return saveShortcutConfig();
}

/**
 * 获取快捷键配置
 * @returns {Object} 快捷键配置对象
 */
function getShortcutConfig() {
  return shortcutConfig;
}

// 导出模块函数
module.exports = {
  loadItems,
  saveItems,
  addItem,
  updateItem,
  removeItem,
  updateItemsOrder,
  getItems,
  clearAllItems,
  getStoragePath,
  getUserDataPath,
  loadWindowConfig,
  saveWindowConfig,
  updateMainWindowConfig,
  getWindowConfig,
  addChangeListener,
  removeChangeListener,
  loadShortcutConfig,
  saveShortcutConfig,
  updateShortcutConfig,
  getShortcutConfig,
  addShortcutChangeListener,
  removeShortcutChangeListener
};
