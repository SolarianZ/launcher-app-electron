/**
 * 共享UI工具模块
 * 提供通用的UI相关功能，如主题应用和语言处理
 * 减少重复代码，确保所有窗口具有一致的行为
 */

/**
 * 应用主题设置
 * @param {string} theme 主题类型："system", "light", "dark"
 * @param {HTMLElement} container 要应用主题的容器元素
 */
function applyTheme(theme, container) {
  // 移除所有主题类
  container.classList.remove("dark-theme", "light-theme");

  // 根据主题类型应用相应的CSS类
  if (theme === "system") {
    applySystemTheme(container);
  } else if (theme === "dark") {
    container.classList.add("dark-theme");
  } else if (theme === "light") {
    container.classList.add("light-theme");
  }
}

/**
 * 应用系统主题
 * 根据系统深色/浅色模式设置相应的主题
 * @param {HTMLElement} container 要应用主题的容器元素
 */
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

/**
 * 更新页面文本
 * 根据当前语言设置更新所有带有特定属性的元素文本
 * @param {Object} i18n 国际化模块实例
 */
async function updatePageTexts(i18n) {
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
}

/**
 * 监听系统主题变化
 * 当系统主题变化时，如果应用设置为跟随系统，则自动更新主题
 * @param {HTMLElement} container 要应用主题的容器元素
 */
function setupSystemThemeListener(container) {
  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (localStorage.getItem("theme") === "system") {
          applySystemTheme(container);
        }
      });
  }
}

// 导出模块功能
module.exports = {
  applyTheme,
  applySystemTheme,
  updatePageTexts,
  setupSystemThemeListener
};