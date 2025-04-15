/**
 * 国际化支持模块 (i18n)
 * 提供多语言支持功能，包含中文和英文翻译
 */

// 语言包定义
const translations = {
  // 简体中文翻译
  'zh-CN': {
    // 设置页面
    'settings': '设置',
    'appearance': '外观',
    'theme': '主题',
    'system-theme': '跟随系统',
    'light-theme': '浅色模式',
    'dark-theme': '深色模式',
    'language': '语言',
    'system-language': '跟随系统',
    'zh-CN': '中文',
    'en-US': '英文',
    'data': '数据',
    'clear-data': '清空所有记录',
    'clear-data-desc': '删除所有已记录的条目',
    'open-storage': '打开应用数据文件夹',
    'open-storage-desc': '在文件夹中查看应用数据文件',
    'about': '关于',
    'version': '版本',
    'app-desc': '记录和快速访问常用文件、文件夹、URL和指令的工具。',
    'report-issue': '报告问题',
    'dev-tools-tip': '按F12打开Chrome开发者工具',
    'confirm-clear-data': '确定要删除所有记录吗？此操作不可撤销。',
    
    // 主窗口通用
    'app-name': 'Launcher',
    'close': '关闭',
    'cancel': '取消',
    'save': '保存',
    'edit': '编辑',
    'delete': '删除',
    'open': '打开',
    'show-in-folder': '在文件夹中显示',
    'copy-path': '复制路径',
    'entry-exists': '条目已存在',
    'save-failed': '保存失败',
    'item-not-exist': '项目不存在',
    'clear-failed': '清除失败',
    'search': '搜索...',
    'add-new-item': '添加新项目',
    
    // 条目编辑窗口
    'item-content': '条目内容',
    'enter-path': '输入文件路径、URL或命令...',
    'enter-item-name': '输入条目名称（可选）',
    'file': '文件',
    'folder': '文件夹',
    'url': 'URL',
    'command': '指令',
    'select-file': '选择文件',
    'select-folder': '选择文件夹',
    'enter-path-required': '请输入路径或命令',
    'select-type-required': '请选择项目类型',
    'select-file-failed': '选择文件失败，请重试',
    'select-folder-failed': '选择文件夹失败，请重试',
    'update-failed': '更新失败，请重试',
    'add-failed': '添加失败，请重试',
    
    // 上下文菜单
    'context-open': '打开',
    'context-edit': '编辑',
    'context-delete': '删除',
    'context-show-in-folder': '在文件夹中显示',
    'context-copy-path': '复制路径',
    'context-copy-name': '复制名称',
    'context-copy-asset': '复制文件',
    'context-copy': '复制',
    'context-execute': '执行',
    
    // 托盘菜单
    'tray-exit': '退出'
  },

  // 英文翻译
  'en-US': {
    // 设置页面
    'settings': 'Settings',
    'appearance': 'Appearance',
    'theme': 'Theme',
    'system-theme': 'System',
    'light-theme': 'Light',
    'dark-theme': 'Dark',
    'language': 'Language',
    'system-language': 'System',
    'zh-CN': 'Chinese',
    'en-US': 'English',
    'data': 'Data',
    'clear-data': 'Clear All Records',
    'clear-data-desc': 'Delete all recorded entries',
    'open-storage': 'Open App Data Folder',
    'open-storage-desc': 'View application data files in folder',
    'about': 'About',
    'version': 'Version',
    'app-desc': 'A tool for recording and quickly accessing frequently used files, folders, URLs, and commands.',
    'report-issue': 'Report Issue',
    'dev-tools-tip': 'Press F12 to open Chrome Developer Tools',
    'confirm-clear-data': 'Are you sure you want to delete all records? This action cannot be undone.',
    
    // 主窗口通用
    'app-name': 'Launcher',
    'close': 'Close',
    'cancel': 'Cancel',
    'save': 'Save',
    'edit': 'Edit',
    'delete': 'Delete',
    'open': 'Open',
    'show-in-folder': 'Show in folder',
    'copy-path': 'Copy path',
    'entry-exists': 'Entry already exists',
    'save-failed': 'Save failed',
    'item-not-exist': 'Item does not exist',
    'clear-failed': 'Clear failed',
    'search': 'Search...',
    'add-new-item': 'Add new item',
    
    // 条目编辑窗口
    'item-content': 'Item Content',
    'enter-path': 'Enter file path, URL or command...',
    'enter-item-name': 'Enter item name (optional)',
    'file': 'File',
    'folder': 'Folder',
    'url': 'URL',
    'command': 'Command',
    'select-file': 'Select file',
    'select-folder': 'Select folder',
    'enter-path-required': 'Please enter a path or command',
    'select-type-required': 'Please select an item type',
    'select-file-failed': 'Failed to select file, please try again',
    'select-folder-failed': 'Failed to select folder, please try again',
    'update-failed': 'Update failed, please try again',
    'add-failed': 'Add failed, please try again',
    
    // 上下文菜单
    'context-open': 'Open',
    'context-edit': 'Edit',
    'context-delete': 'Delete',
    'context-show-in-folder': 'Show in folder',
    'context-copy-path': 'Copy path',
    'context-copy-name': 'Copy name',
    'context-copy-asset': 'Copy file',
    'context-copy': 'Copy',
    'context-execute': 'Execute',
    
    // 托盘菜单
    'tray-exit': 'Exit'
  }
};

// 获取系统语言
function getSystemLanguage() {
  // 获取系统语言，如果无法获取则默认使用英文
  const systemLang = (typeof navigator !== 'undefined' ? navigator.language : null) || 'en-US';
  
  // 将系统语言映射到支持的语言
  if (systemLang.startsWith('zh')) {
    return 'zh-CN';
  } else {
    return 'en-US';  // 默认英文
  }
}

// 当前语言，默认跟随系统
let currentLanguage = null;

// 存储语言变化监听器 - 观察者模式实现
const languageChangeListeners = [];

/**
 * 添加语言变化监听器
 * @param {Function} listener 监听函数
 */
function addLanguageChangeListener(listener) {
  if (typeof listener === 'function' && !languageChangeListeners.includes(listener)) {
    languageChangeListeners.push(listener);
  }
}

/**
 * 移除语言变化监听器
 * @param {Function} listener 要移除的监听函数
 */
function removeLanguageChangeListener(listener) {
  const index = languageChangeListeners.indexOf(listener);
  if (index !== -1) {
    languageChangeListeners.splice(index, 1);
  }
}

/**
 * 通知所有监听器语言已变化
 */
function notifyLanguageChangeListeners(newLanguage) {
  for (const listener of languageChangeListeners) {
    try {
      listener(newLanguage);
    } catch (error) {
      console.error("语言变化监听器执行错误:", error);
    }
  }
}

/**
 * 获取当前使用的语言
 * @returns {string} 当前语言代码
 */
function getCurrentLanguage() {
  if (!currentLanguage) {
    // 首先尝试从本地存储获取
    if (typeof localStorage !== 'undefined') {
      const savedLang = localStorage.getItem('language');
      if (savedLang === 'system' || !savedLang) {
        currentLanguage = getSystemLanguage();
      } else {
        currentLanguage = savedLang;
      }
    } else {
      // 在main进程中，无法访问localStorage
      currentLanguage = getSystemLanguage();
    }
  }
  return currentLanguage;
}

/**
 * 设置当前语言
 * @param {string} lang 语言代码或"system"
 */
function setLanguage(lang) {
  let newLang;
  
  if (lang === 'system') {
    newLang = getSystemLanguage();
    // 保存用户选择
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('language', 'system');
    }
  } else if (translations[lang]) {
    newLang = lang;
    // 保存用户选择
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  } else {
    newLang = 'en-US'; // 默认回退到英文
    console.error(`不支持的语言: ${lang}`);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('language', newLang);
    }
  }
  
  currentLanguage = newLang;
  
  // 通知语言变化
  notifyLanguageChangeListeners(newLang);
  
  return newLang;
}

/**
 * 获取翻译文本
 * @param {string} key 翻译键
 * @param {Object} params 替换参数 (可选)
 * @returns {string} 翻译后的文本
 */
function t(key, params = null) {
  const lang = getCurrentLanguage();
  const translationSet = translations[lang] || translations['en-US'];
  
  let text = translationSet[key];
  if (text === undefined) {
    console.warn(`Missing translation: ${key} for language: ${lang}`);
    // 尝试从英文中获取
    text = translations['en-US'][key];
    // 如果英文也没有，则返回键名
    if (text === undefined) {
      return key;
    }
  }
  
  // 处理参数替换
  if (params) {
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
  }
  
  return text;
}

// 导出模块功能
module.exports = {
  t,
  setLanguage,
  getCurrentLanguage,
  getSystemLanguage,
  addLanguageChangeListener,
  removeLanguageChangeListener
};