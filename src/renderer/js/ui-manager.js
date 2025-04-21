/**
 * 共享UI管理模块
 * 负责处理UI相关的共享功能，包括主题和语言的管理
 * 避免在每个窗口脚本中重复相似代码
 */

// 导入工具函数
const { applyTheme, updatePageTexts, setupSystemThemeListener } = window.uiUtils;
const i18n = window.electronAPI.i18n;

/**
 * 显示提示消息
 * 统一的Toast提示实现，避免各窗口重复实现类似功能
 * @param {string} message 提示内容
 * @param {boolean} isError 是否是错误提示，默认为false
 * @param {number} duration 显示时长(毫秒)，默认为2000毫秒
 */
function showToast(message, isError = false, duration = 2000) {
  // 查找已有的toast元素，如果没有则创建一个
  let toast = document.getElementById("toast");
  
  // 如果toast不存在，创建一个新的toast元素
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }

  // 设置toast内容和样式
  toast.textContent = message;
  toast.className = "toast";

  if (isError) {
    toast.classList.add("error-toast");
  }

  // 显示toast
  toast.style.display = "block";
  toast.style.opacity = "1";

  // 定时隐藏toast
  setTimeout(() => {
    toast.style.opacity = "0";
    // 动画完成后隐藏元素
    setTimeout(() => {
      toast.style.display = "none";
    }, 300); // 假设过渡动画为300ms
  }, duration);

  return toast;
}

/**
 * 初始化UI管理
 * @param {Object} options 配置选项
 * @param {string} options.containerSelector 主容器选择器，如 ".app-container" 或 ".modal"
 * @param {Function} options.onThemeChanged 主题变更时的回调函数 (可选)
 * @param {Function} options.onLanguageChanged 语言变更时的回调函数 (可选)
 * @returns {Object} 解绑函数对象，用于在需要时移除事件监听
 */
async function initUIManager(options) {
  if (!options || !options.containerSelector) {
    console.error("Error initialiing ui manager: missing required parameters");
    return;
  }

  const container = document.querySelector(options.containerSelector);
  if (!container) {
    console.error(`Container element not found: ${options.containerSelector}`);
    return;
  }

  // 1. 应用主题设置
  const savedTheme = await window.electronAPI.getThemeConfig();
  applyTheme(savedTheme, container);
  
  // 2. 应用语言设置
  await updatePageTexts(i18n);

  // 3. 监听系统主题变化
  setupSystemThemeListener(container);

  // 4. 绑定主题变更事件
  const onThemeChangedHandler = (theme) => {
    console.log("Theme changed to:", theme);
    applyTheme(theme, container);
    
    // 如果提供了回调函数，则调用
    if (typeof options.onThemeChanged === 'function') {
      options.onThemeChanged(theme);
    }
  };

  // 5. 绑定语言变更事件
  const onLanguageChangedHandler = (language) => {
    console.log("Language changed to:", language);
    updatePageTexts(i18n);
    
    // 如果提供了回调函数，则调用
    if (typeof options.onLanguageChanged === 'function') {
      options.onLanguageChanged(language);
    }
  };

  // 6. 添加事件监听
  const themeCleanup = window.electronAPI.onThemeChanged(onThemeChangedHandler);
  const languageCleanup = window.electronAPI.onLanguageChanged(onLanguageChangedHandler);

  // 返回解绑函数对象，用于在需要时移除事件监听
  return {
    unbindAll: () => {
      // 调用从事件注册时返回的清理函数
      if (themeCleanup && typeof themeCleanup === 'function') {
        themeCleanup();
      }
      
      if (languageCleanup && typeof languageCleanup === 'function') {
        languageCleanup();
      }
      
      console.log('UI manager event listeners cleaned up');
    }
  };
}

// 导出模块API
window.uiManager = {
  init: initUIManager,
  showToast: showToast
};