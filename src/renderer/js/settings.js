/**
 * 设置页面的脚本
 * 处理设置窗口的所有功能，包括主题设置、数据管理和应用信息显示
 */
document.addEventListener("DOMContentLoaded", async () => {
  // 导入i18n模块
  const i18n = window.electronAPI.i18n;

  // DOM 元素引用
  const themeSelect = document.getElementById("theme-select");
  const languageSelect = document.getElementById("language-select");
  const clearDataBtn = document.getElementById("clear-data-btn");
  const openStorageBtn = document.getElementById("open-storage-btn");
  const githubLink = document.getElementById("github-link");
  const reportIssueLink = document.getElementById("report-issue");

  // 初始化设置页面
  await initSettingsPage();

  // 加载已保存的主题设置
  loadThemeSetting();

  // 加载可用语言列表和已保存的语言设置
  await loadLanguages();

  // 应用当前主题设置
  applyCurrentTheme();

  // 应用当前语言设置
  await applyCurrentLanguage();

  /**
   * 事件监听设置部分
   */
  
  /**
   * 主题选择变化事件
   * 保存并应用用户选择的主题
   */
  themeSelect.addEventListener("change", () => {
    const theme = themeSelect.value;
    // 保存至本地存储
    localStorage.setItem("theme", theme);
    // 应用新主题
    applyCurrentTheme();
    // 通知主进程和其他窗口主题已更改
    window.electronAPI.themeChanged(theme);
  });

  /**
   * 语言选择变化事件
   * 保存并应用用户选择的语言
   */
  languageSelect.addEventListener("change", async () => {
    const language = languageSelect.value;
    // 应用新语言
    await i18n.setLanguage(language);
    // 更新页面文本
    await updatePageTexts();
    // 通知主进程和其他窗口语言已更改
    window.electronAPI.languageChanged(language);
  });

  /**
   * 清空数据按钮点击事件
   * 显示确认对话框并清除所有项目
   */
  clearDataBtn.addEventListener("click", async () => {
    const confirmMessage = await i18n.t('confirm-clear-data');
    if (confirm(confirmMessage)) {
      window.electronAPI.clearAllItems();
    }
  });

  /**
   * 打开存储位置按钮点击事件
   * 在系统文件管理器中显示应用数据文件夹
   */
  openStorageBtn.addEventListener("click", () => {
    window.electronAPI.openStorageLocation();
  });

  /**
   * GitHub链接点击事件
   * 在默认浏览器中打开项目仓库
   */
  githubLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.electronAPI.openExternalLink(
      "https://github.com/SolarianZ/launcher-app-electron"
    );
  });

  /**
   * 问题报告链接点击事件
   * 在默认浏览器中打开项目Issues页面
   */
  reportIssueLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.electronAPI.openExternalLink(
      "https://github.com/SolarianZ/launcher-app-electron/issues"
    );
  });

  /**
   * 全局键盘事件处理
   * - Escape: 关闭窗口
   * - F12: 打开开发者工具
   */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.electronAPI.closeSettingsWindow();
      e.preventDefault();
    } else if (e.key === "F12") {
      window.electronAPI.openDevTools();
      e.preventDefault();
    }
  });

  /**
   * 初始化设置页面
   * 获取应用信息并显示版本号
   */
  async function initSettingsPage() {
    // 获取应用信息
    try {
      const appInfo = await window.electronAPI.getAppInfo();
      document.getElementById("version-number").textContent = appInfo.version;
    } catch (error) {
      console.error("获取应用信息失败:", error);
    }
  }

  /**
   * 加载主题设置
   * 从本地存储获取主题设置并设置到下拉选择框
   */
  function loadThemeSetting() {
    // 获取保存的主题设置，默认使用系统主题
    const savedTheme = localStorage.getItem("theme") || "system";
    themeSelect.value = savedTheme;
  }

  /**
   * 加载可用语言列表和已保存的语言设置
   * 从i18n模块获取所有可用语言并填充到下拉选择框
   */
  async function loadLanguages() {
    try {
      // 清空现有选项，只保留"系统"选项
      while (languageSelect.options.length > 1) {
        languageSelect.remove(1);
      }

      // 获取所有可用语言
      const languages = await i18n.getAvailableLanguages();
      
      // 添加语言选项
      for (const langCode of languages) {
        const langName = await i18n.getLanguageName(langCode);
        const option = document.createElement('option');
        option.value = langCode;
        option.textContent = langName;
        languageSelect.appendChild(option);
      }

      // 获取保存的语言设置，默认跟随系统
      const savedLanguage = localStorage.getItem("language") || "system";
      languageSelect.value = savedLanguage;
    } catch (error) {
      console.error("加载语言列表失败:", error);
    }
  }

  /**
   * 应用当前主题设置
   * 根据当前主题设置应用相应的CSS类
   */
  function applyCurrentTheme() {
    const theme = localStorage.getItem("theme") || "system";
    const modal = document.querySelector(".modal");

    // 移除所有主题类
    modal.classList.remove("dark-theme", "light-theme");

    // 根据主题设置应用相应的CSS类
    if (theme === "system") {
      applySystemTheme();
    } else if (theme === "dark") {
      modal.classList.add("dark-theme");
    } else if (theme === "light") {
      modal.classList.add("light-theme");
    }
  }

  /**
   * 应用系统主题
   * 检测系统主题设置并应用相应的CSS类
   */
  function applySystemTheme() {
    // 检测系统是否处于深色模式
    const isDarkMode =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const modal = document.querySelector(".modal");

    // 应用相应的主题类
    if (isDarkMode) {
      modal.classList.add("dark-theme");
    } else {
      modal.classList.remove("dark-theme");
    }
  }

  /**
   * 应用当前语言设置
   * 更新页面上所有需要翻译的文本
   */
  async function applyCurrentLanguage() {
    await updatePageTexts();
  }

  /**
   * 更新页面文本
   * 根据当前语言设置更新所有带有 data-i18n 属性的元素文本
   */
  async function updatePageTexts() {
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
    } catch (error) {
      console.error("更新页面文本时出错:", error);
    }
  }
});
