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
const appPath = isPackaged ? path.dirname(process.resourcesPath) : process.cwd();

// 语言文件目录路径 - 修正资源路径
const localesDir = isPackaged 
  ? path.join(process.resourcesPath, 'app', 'src', 'assets', 'locales') 
  : path.join(appPath, 'src', 'assets', 'locales');

// 用户自定义语言文件目录，放在用户数据目录下
const userLocalesDir = path.join(
  app ? app.getPath('userData') : path.join(appPath, 'user-data'),
  'locales'
);

console.log('Locale directories:', { 
  appPath, 
  isPackaged, 
  localesDir, 
  userLocalesDir,
  localesDirExists: fs.existsSync(localesDir)
});

// 确保用户自定义语言文件目录存在
try {
  if (!fs.existsSync(userLocalesDir)) {
    fs.mkdirSync(userLocalesDir, { recursive: true });
  }
} catch (error) {
  console.error('Error creating user locale directory:', error);
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
      console.log(`Loaded user custom language file: ${langCode}`);
    }
  } catch (error) {
    console.error(`Error loading user language file ${langCode}.json:`, error);
  }
  
  // 再从应用内置目录加载
  const builtinFilePath = path.join(localesDir, `${langCode}.json`);
  let builtinTranslation = {};
  
  try {
    if (fs.existsSync(builtinFilePath)) {
      const fileContent = fs.readFileSync(builtinFilePath, 'utf8');
      builtinTranslation = JSON.parse(fileContent);
      console.log(`Loaded built-in language file: ${langCode}`);
    } else {
      console.warn(`Built-in language file not found: ${builtinFilePath}`);
      
      // 尝试备用路径（开发环境中可能的路径）
      const altPath = path.join(appPath, 'src', 'assets', 'locales', `${langCode}.json`);
      if (fs.existsSync(altPath)) {
        const fileContent = fs.readFileSync(altPath, 'utf8');
        builtinTranslation = JSON.parse(fileContent);
        console.log(`Loaded language file from alternative path: ${langCode}`);
      }
    }
  } catch (error) {
    console.error(`Error loading built-in language file ${langCode}.json:`, error);
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
      console.log('Loaded built-in language files from standard path');
    } else {
      // 尝试备用路径（开发环境中可能的路径）
      const altLocalesDir = path.join(appPath, 'src', 'assets', 'locales');
      if (fs.existsSync(altLocalesDir)) {
        fs.readdirSync(altLocalesDir)
          .filter(file => file.endsWith('.json'))
          .forEach(file => {
            const langCode = file.replace('.json', '');
            builtinLangs.add(langCode);
            
            // 加载内置语言
            translations[langCode] = loadTranslationFile(langCode);
          });
        console.log('Loaded built-in language files from alternative path');
      } else {
        console.error('Built-in language directory not found:', { localesDir, altLocalesDir });
        
        // TODO 手动添加默认语言不应该吧？
        // 如果没有找到语言文件，手动添加默认语言
        if (builtinLangs.size === 0) {
          console.log('Adding default language support');
          builtinLangs.add('en-US');
          builtinLangs.add('zh-CN');
          
          // 添加基本的翻译
          translations['en-US'] = translations['en-US'] || {
            'app.name': 'Launcher App',
            'en-US': 'English',
            'zh-CN': 'Chinese (Simplified)'
          };
          
          translations['zh-CN'] = translations['zh-CN'] || {
            'app.name': 'Launcher App',
            'en-US': 'English',
            'zh-CN': 'Chinese (Simplified)'
          };
        }
      }
    }
  } catch (error) {
    console.error('Error reading built-in language directory:', error);
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
    console.error('Error reading user language directory:', error);
  }
  
  // 合并语言列表
  availableLanguages = [...new Set([...builtinLangs, ...userLangs])];
  console.log('Available languages:', availableLanguages);
}

// 首次加载所有语言
loadAllLanguages();

// 获取系统语言
function getSystemLanguage() {
  // 获取系统语言，如果无法获取则默认使用英文
  const systemLang = (typeof navigator !== 'undefined' ? navigator.language : null) || 
                    (app ? app.getLocale() : null) || 'en-US';
  
  console.log('System language:', systemLang);
  
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
      console.error("Error executing language change listener:", error);
    }
  }
}

/**
 * 获取当前使用的语言
 * @returns {string} 当前语言代码
 */
function getCurrentLanguage() {
  if (!currentLanguage) {
    try {
      // 尝试从 main 进程中获取语言设置
      const { app } = require('electron');
      if (app) {
        const dataStore = require('../main/data-store');
        const appConfig = dataStore.getAppConfig();
        if (appConfig.language === 'system' || !appConfig.language) {
          currentLanguage = getSystemLanguage();
        } else {
          currentLanguage = appConfig.language;
        }
      } else {
        // 在渲染进程中，无法直接访问 dataStore
        // 此时应该已经由主进程设置了当前语言
        currentLanguage = getSystemLanguage();
      }
    } catch (error) {
      console.error('Error getting language configuration:', error);
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
  } else if (translations[lang]) {
    newLang = lang;
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
        console.error(`Language file is empty: ${lang}`);
      }
    } catch (error) {
      newLang = 'en-US'; // 默认回退到英文
      console.error(`Unsupported language: ${lang}`, error);
    }
  }
  
  // 保存到全局变量
  currentLanguage = newLang;
  
  // 尝试保存到 data-store
  try {
    const { app } = require('electron');
    if (app) {
      const dataStore = require('../main/data-store');
      dataStore.updateLanguageConfig(lang);
    }
  } catch (error) {
    console.error('Error saving language configuration:', error);
  }
  
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
    console.error(`Error adding user custom language ${langCode}:`, error);
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