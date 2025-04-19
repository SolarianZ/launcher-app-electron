/**
 * 设置页面的脚本
 * 处理设置窗口的所有功能，包括主题设置、数据管理和应用信息显示
 */
document.addEventListener("DOMContentLoaded", async () => {
  // 导入i18n模块和UI工具
  const i18n = window.electronAPI.i18n;
  const { applyTheme, updatePageTexts, setupSystemThemeListener } = window.uiUtils;

  // DOM 元素引用
  const themeSelect = document.getElementById("theme-select");
  const languageSelect = document.getElementById("language-select");
  const clearDataBtn = document.getElementById("clear-data-btn");
  const openStorageBtn = document.getElementById("open-storage-btn");
  const githubLink = document.getElementById("github-link");
  const reportIssueLink = document.getElementById("report-issue");
  
  // 快捷键设置元素引用
  const enableShortcutCheckbox = document.getElementById("enable-shortcut");
  const shortcutInput = document.getElementById("shortcut-input");
  const recordShortcutBtn = document.getElementById("record-shortcut-btn");
  const resetShortcutBtn = document.getElementById("reset-shortcut-btn");

  // 初始化设置页面
  await initSettingsPage();

  // 加载已保存的主题设置
  await loadThemeSetting();

  // 加载可用语言列表和已保存的语言设置
  await loadLanguages();
  
  // 加载快捷键设置
  await loadShortcutSettings();

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
    // 通知主进程和其他窗口主题已更改
    window.electronAPI.themeChanged(theme);
    // 应用新主题
    applyCurrentTheme(theme);
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
    await updatePageTexts(i18n);
    // 通知主进程和其他窗口语言已更改
    window.electronAPI.languageChanged(language);
  });

  /**
   * 启用全局快捷键复选框变化事件
   * 保存设置并更新界面状态
   */
  enableShortcutCheckbox.addEventListener("change", () => {
    updateShortcutConfig({ enabled: enableShortcutCheckbox.checked });
    updateShortcutInputState();
  });

  /**
   * 快捷键记录按钮点击事件
   * 进入快捷键记录模式
   */
  recordShortcutBtn.addEventListener("click", () => {
    startRecordingShortcut();
  });

  /**
   * 快捷键重置按钮点击事件
   * 将快捷键重置为默认值
   */
  resetShortcutBtn.addEventListener("click", async () => {
    const defaultShortcut = "Alt+Shift+Q";
    updateShortcutConfig({ shortcut: defaultShortcut });
    shortcutInput.value = defaultShortcut;
    
    // 显示提示消息
    const message = await i18n.t('shortcut-reset');
    showToast(message);
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

  // 处理快捷键录入的事件监听
  setupShortcutRecording();

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

    // 设置系统主题变化监听器
    setupSystemThemeListener(document.querySelector(".modal"));
  }

  /**
   * 加载主题设置
   * 从主进程获取主题设置并设置到下拉选择框
   */
  async function loadThemeSetting() {
    // 通过 API 获取保存的主题设置
    const savedTheme = await window.electronAPI.getThemeConfig();
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

      // 获取保存的语言设置
      const savedLanguage = await window.electronAPI.getLanguageConfig();
      languageSelect.value = savedLanguage;
    } catch (error) {
      console.error("加载语言列表失败:", error);
    }
  }

  /**
   * 加载快捷键配置
   * 从主进程获取快捷键配置并设置到界面
   */
  async function loadShortcutSettings() {
    try {
      const shortcutConfig = await window.electronAPI.getShortcutConfig();
      
      // 设置启用状态
      enableShortcutCheckbox.checked = shortcutConfig.enabled;
      
      // 设置当前快捷键
      shortcutInput.value = shortcutConfig.shortcut || "Alt+Shift+Q";
      
      // 更新输入框状态
      updateShortcutInputState();
    } catch (error) {
      console.error("加载快捷键设置失败:", error);
    }
  }

  /**
   * 更新快捷键配置
   * 向主进程发送更新的快捷键配置
   * @param {Object} config 配置对象，可以包含 enabled 和 shortcut 属性
   */
  async function updateShortcutConfig(config) {
    try {
      const currentConfig = await window.electronAPI.getShortcutConfig();
      const newConfig = { ...currentConfig, ...config };
      await window.electronAPI.updateShortcutConfig(newConfig);
    } catch (error) {
      console.error("更新快捷键配置失败:", error);
    }
  }

  /**
   * 更新快捷键输入框状态
   * 根据启用状态设置输入框和按钮的可用性
   */
  function updateShortcutInputState() {
    const isEnabled = enableShortcutCheckbox.checked;
    shortcutInput.disabled = !isEnabled;
    recordShortcutBtn.disabled = !isEnabled;
    resetShortcutBtn.disabled = !isEnabled;
    
    // 调整样式
    if (!isEnabled) {
      shortcutInput.classList.add("disabled");
    } else {
      shortcutInput.classList.remove("disabled");
    }
  }

  /**
   * 进入快捷键录入模式
   */
  function startRecordingShortcut() {
    // 只有启用状态下才能录入
    if (!enableShortcutCheckbox.checked) return;
    
    // 更改录入按钮的状态和文本
    recordShortcutBtn.classList.add("recording");
    shortcutInput.value = "";
    shortcutInput.placeholder = "";
    
    // 给按钮添加 data 属性标记录入状态
    recordShortcutBtn.dataset.recording = "true";
  }

  /**
   * 结束快捷键录入模式
   */
  async function stopRecordingShortcut() {
    // 恢复录入按钮的状态
    recordShortcutBtn.classList.remove("recording");
    delete recordShortcutBtn.dataset.recording;
    
    // 如果输入框为空，恢复之前的值
    if (!shortcutInput.value) {
      const config = await window.electronAPI.getShortcutConfig();
      shortcutInput.value = config.shortcut || "Alt+Shift+Q";
    }
    
    // 恢复占位符
    shortcutInput.placeholder = "Alt+Shift+Q";
  }

  /**
   * 设置快捷键录入的事件监听
   */
  function setupShortcutRecording() {
    document.addEventListener("keydown", async (e) => {
      // 检查是否在录入模式
      if (!recordShortcutBtn.dataset.recording) return;
      
      // 阻止事件传播和默认行为
      e.preventDefault();
      e.stopPropagation();
      
      // 忽略单独的修饰键
      if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
        return;
      }
      
      // 构建快捷键字符串
      const modifiers = [];
      if (e.ctrlKey) modifiers.push("Ctrl");
      if (e.altKey) modifiers.push("Alt");
      if (e.shiftKey) modifiers.push("Shift");
      if (e.metaKey) modifiers.push("Meta");
      
      // 如果没有修饰键，显示提示并返回
      if (modifiers.length === 0) {
        const message = await i18n.t('shortcut-need-modifier');
        showToast(message);
        return;
      }
      
      // 获取按键名称并格式化
      let keyName = e.key;
      
      // 处理特殊键
      if (keyName === " ") keyName = "Space";
      else if (keyName.length === 1) keyName = keyName.toUpperCase();
      
      // 组合快捷键字符串
      const shortcut = [...modifiers, keyName].join("+");
      
      // 测试快捷键是否可用
      const testResult = await window.electronAPI.testShortcut(shortcut);
      
      if (testResult.success) {
        // 设置快捷键并保存
        shortcutInput.value = shortcut;
        updateShortcutConfig({ shortcut });
        
        // 结束录入模式
        stopRecordingShortcut();
        
        // 显示成功提示
        const message = await i18n.t('shortcut-saved');
        showToast(message);
      } else {
        // 显示错误提示
        showToast(testResult.message, true);
      }
    });
  }

  /**
   * 显示提示消息
   * @param {string} message 提示内容
   * @param {boolean} isError 是否是错误提示
   */
  function showToast(message, isError = false) {
    // 检查是否已存在toast元素，如果有则移除
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      document.body.removeChild(existingToast);
    }
    
    // 创建新的toast元素
    const toast = document.createElement('div');
    toast.className = isError ? 'toast error-toast' : 'toast';
    toast.textContent = message;
    
    // 添加到body
    document.body.appendChild(toast);
    
    // 显示toast
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);
    
    // 3秒后隐藏toast
    setTimeout(() => {
      toast.style.opacity = '0';
      
      // 隐藏动画完成后移除元素
      toast.addEventListener('transitionend', () => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      });
    }, 3000);
  }

  /**
   * 应用当前主题设置
   * 根据当前主题设置应用相应的CSS类
   */
  function applyCurrentTheme() {
    const theme = themeSelect.value || "system";
    const modalContainer = document.querySelector(".modal");
    applyTheme(theme, modalContainer);
  }

  /**
   * 应用当前语言设置
   * 更新页面上所有需要翻译的文本
   */
  async function applyCurrentLanguage() {
    await updatePageTexts(i18n);
  }
});
