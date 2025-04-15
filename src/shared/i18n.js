/**
 * 国际化支持模块 (i18n)
 * 提供多语言支持功能，支持从外部 JSON 文件动态加载翻译
 * 允许用户自定义添加新的语言文件
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// 获取应用的路径（区分开发环境和打包后环境）
const isPackaged = app && app.isPackaged;
const appPath = isPackaged ? path.dirname(app.getPath('exe')) : process.cwd();

// 语言文件目录路径
const localesDir = isPackaged 
  ? path.join(appPath, 'resources', 'app', 'src', 'assets', 'locales') 
  : path.join(appPath, 'src', 'assets', 'locales');

// 用户自定义语言文件目录，放在用户数据目录下
const userLocalesDir = path.join(
  app ? app.getPath('userData') : path.join(appPath, 'user-data'),
  'locales'
);

// 确保用户自定义语言文件目录存在
try {
  if (!fs.existsSync(userLocalesDir)) {
    fs.mkdirSync(userLocalesDir, { recursive: true });
  }
} catch (error) {
  console.error('创建用户自定义语言文件目录失败:', error);
}

// 存储已加载的翻译内容
const translations = {};

// 存储可用的语言列表
let availableLanguages = [];

/**
 * 从文件加载翻译内容
 * @param {string} langCode 语言代码
 * @returns {Object} 翻译内容
 */
function loadTranslationFile(langCode) {
  let translation = {};
  
  // 先尝试从用户自定义目录加载
  const userFilePath = path.join(userLocalesDir, `${langCode}.json`);
  let userTranslation = {};
  
  try {
    if (fs.existsSync(userFilePath)) {
      const fileContent = fs.readFileSync(userFilePath, 'utf8');
      userTranslation = JSON.parse(fileContent);
    }
  } catch (error) {
    console.error(`加载用户自定义语言文件 ${langCode}.json 失败:`, error);
  }
  
  // 再从应用内置目录加载
  const builtinFilePath = path.join(localesDir, `${langCode}.json`);
  let builtinTranslation = {};
  
  try {
    if (fs.existsSync(builtinFilePath)) {
      const fileContent = fs.readFileSync(builtinFilePath, 'utf8');
      builtinTranslation = JSON.parse(fileContent);
    }
  } catch (error) {
    console.error(`加载内置语言文件 ${langCode}.json 失败:`, error);
  }
  
  // 用户翻译覆盖内置翻译
  translation = { ...builtinTranslation, ...userTranslation };
  
  return translation;
}

/**
 * 加载所有可用的语言文件
 */
function loadAllLanguages() {
  const builtinLangs = new Set();
  const userLangs = new Set();
  
  // 获取内置语言文件列表
  try {
    if (fs.existsSync(localesDir)) {
      fs.readdirSync(localesDir)
        .filter(file => file.endsWith('.json'))
        .forEach(file => {
          const langCode = file.replace('.json', '');
          builtinLangs.add(langCode);
          
          // 加载内置语言
          translations[langCode] = loadTranslationFile(langCode);
        });
    }
  } catch (error) {
    console.error('读取内置语言文件目录失败:', error);
  }
  
  // 获取用户自定义语言文件列表
  try {
    if (fs.existsSync(userLocalesDir)) {
      fs.readdirSync(userLocalesDir)
        .filter(file => file.endsWith('.json'))
        .forEach(file => {
          const langCode = file.replace('.json', '');
          userLangs.add(langCode);
          
          // 如果之前没有加载过这个语言，现在加载它
          if (!translations[langCode]) {
            translations[langCode] = loadTranslationFile(langCode);
          }
        });
    }
  } catch (error) {
    console.error('读取用户自定义语言文件目录失败:', error);
  }
  
  // 合并语言列表
  availableLanguages = [...new Set([...builtinLangs, ...userLangs])];
}

// 首次加载所有语言
loadAllLanguages();

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
    // 尝试先加载该语言文件
    try {
      translations[lang] = loadTranslationFile(lang);
      if (Object.keys(translations[lang]).length > 0) {
        // 成功加载语言文件
        newLang = lang;
        if (!availableLanguages.includes(lang)) {
          availableLanguages.push(lang);
        }
      } else {
        newLang = 'en-US'; // 默认回退到英文
        console.error(`语言文件为空: ${lang}`);
      }
    } catch (error) {
      newLang = 'en-US'; // 默认回退到英文
      console.error(`不支持的语言: ${lang}`, error);
    }
    
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
 * 获取所有可用的语言列表
 * @returns {Array} 语言代码数组
 */
function getAvailableLanguages() {
  // 重新加载语言文件，以确保获取最新列表
  loadAllLanguages();
  return availableLanguages;
}

/**
 * 获取语言名称
 * @param {string} langCode 语言代码
 * @returns {string} 语言名称
 */
function getLanguageName(langCode) {
  // 使用当前语言显示目标语言的名称
  const lang = getCurrentLanguage();
  const translationSet = translations[lang] || translations['en-US'];
  
  // 如果有该语言的翻译，则使用翻译
  if (translationSet && translationSet[langCode]) {
    return translationSet[langCode];
  }
  
  // 如果没有翻译，则使用语言代码
  return langCode;
}

/**
 * 添加或更新用户自定义语言
 * @param {string} langCode 语言代码
 * @param {Object} translation 翻译内容
 */
function addUserLanguage(langCode, translation) {
  try {
    const filePath = path.join(userLocalesDir, `${langCode}.json`);
    fs.writeFileSync(filePath, JSON.stringify(translation, null, 2), 'utf8');
    
    // 重新加载该语言
    translations[langCode] = loadTranslationFile(langCode);
    
    // 更新可用语言列表
    if (!availableLanguages.includes(langCode)) {
      availableLanguages.push(langCode);
    }
    
    return true;
  } catch (error) {
    console.error(`添加用户自定义语言 ${langCode} 失败:`, error);
    return false;
  }
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
  removeLanguageChangeListener,
  getAvailableLanguages,
  getLanguageName,
  addUserLanguage
};