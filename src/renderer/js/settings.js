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
  
  // 快捷键设置元素引用
  const enableShortcutCheckbox = document.getElementById("enable-shortcut");
  const shortcutInput = document.getElementById("shortcut-input");
  const recordShortcutBtn = document.getElementById("record-shortcut-btn");
  const resetShortcutBtn = document.getElementById("reset-shortcut-btn");
  
  const modalContainer = document.querySelector(".modal");

  // 初始化UI管理器
  window.uiManager.init({
    containerSelector: ".modal"
  });

  // 初始化设置页面
  await initSettingsPage();

  // 加载已保存的主题设置
  await loadThemeSetting();

  // 加载可用语言列表和已保存的语言设置
  await loadLanguages();
  
  // 加载快捷键设置
  await loadShortcutSettings();

  /**
   * 事件监听设置部分
   */
  
  /**
   * 主题选择变化事件
   * 保存并应用用户选择的主题
   */
  themeSelect.addEventListener("change", () => {
    const theme = themeSelect.value;
    // 立即应用主题到当前窗口
    window.uiUtils.applyTheme(theme, modalContainer);
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
    await window.uiUtils.updatePageTexts(i18n);
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
   * 重置快捷键为默认值
   */
  resetShortcutBtn.addEventListener("click", () => {
    shortcutInput.value = "Alt+Shift+Q";
    updateShortcutConfig({ shortcut: "Alt+Shift+Q" });
  });

  /**
   * 清空数据按钮点击事件
   * 显示确认对话框，确认后清空所有项目
   */
  clearDataBtn.addEventListener("click", async () => {
    const confirmMessage = await i18n.t("confirm-clear-data");
    if (confirm(confirmMessage)) {
      window.electronAPI.clearAllItems();
      window.uiManager.showToast(await i18n.t("data-cleared"));
    }
  });

  /**
   * 打开存储位置按钮点击事件
   * 打开应用数据存储目录
   */
  openStorageBtn.addEventListener("click", () => {
    window.electronAPI.openStorageLocation();
  });

  /**
   * GitHub链接点击事件处理
   * 使用默认浏览器打开GitHub仓库
   */
  githubLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.electronAPI.openExternalLink("https://github.com/username/launcher-app-electron");
  });

  /**
   * 报告问题链接点击事件处理
   * 使用默认浏览器打开GitHub issues页面
   */
  reportIssueLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.electronAPI.openExternalLink("https://github.com/username/launcher-app-electron/issues");
  });

  /**
   * 全局键盘事件处理
   * - Escape: 关闭窗口
   * - F12: 开发者工具
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
      const config = await window.electronAPI.getShortcutConfig();
      enableShortcutCheckbox.checked = config.enabled;
      shortcutInput.value = config.shortcut;
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
      await window.electronAPI.updateShortcutConfig(config);
    } catch (error) {
      console.error("更新快捷键配置失败:", error);
    }
  }

  /**
   * 更新快捷键输入框状态
   * 根据启用状态设置输入框和按钮的可用性
   */
  function updateShortcutInputState() {
    const enabled = enableShortcutCheckbox.checked;
    shortcutInput.disabled = !enabled;
    recordShortcutBtn.disabled = !enabled;
    resetShortcutBtn.disabled = !enabled;
  }

  /**
   * 进入快捷键录入模式
   */
  function startRecordingShortcut() {
    shortcutInput.value = "按键...";
    shortcutInput.classList.add("recording");
    recordShortcutBtn.textContent = "✓";
  }

  /**
   * 结束快捷键录入模式
   */
  async function stopRecordingShortcut() {
    shortcutInput.classList.remove("recording");
    recordShortcutBtn.textContent = await i18n.t("record-shortcut") || "记录";
  }

  /**
   * 设置快捷键录入的事件监听
   */
  function setupShortcutRecording() {
    let recording = false;
    let pressedKeys = new Set();

    recordShortcutBtn.addEventListener("click", () => {
      if (!recording) {
        // 开始录制
        recording = true;
        pressedKeys.clear();
        startRecordingShortcut();
      } else {
        // 停止录制
        recording = false;
        stopRecordingShortcut();
      }
    });

    // 录制时捕获按键
    document.addEventListener("keydown", async (e) => {
      if (!recording) return;

      e.preventDefault();

      // 特殊按键或修饰键
      const key = e.key;
      if (key === "Control" || key === "Alt" || key === "Shift" || key === "Meta") {
        pressedKeys.add(key === "Control" ? "Ctrl" : key);
      } else {
        // 非修饰键，考虑按键序列结束
        pressedKeys.add(key);

        // 创建快捷键字符串
        const shortcut = Array.from(pressedKeys).join("+");
        shortcutInput.value = shortcut;

        // 测试快捷键是否可用
        const testResult = await window.electronAPI.testShortcut(shortcut);
        if (testResult.success) {
          // 成功，保存新快捷键
          updateShortcutConfig({ shortcut });
          recording = false;
          stopRecordingShortcut();
        } else {
          // 失败，显示错误消息
          window.uiManager.showToast(testResult.message, true);
          recording = false;
          stopRecordingShortcut();
          // 恢复上次的有效值
          const config = await window.electronAPI.getShortcutConfig();
          shortcutInput.value = config.shortcut;
        }
      }
    });

    // 监听按键释放，从集合中移除
    document.addEventListener("keyup", (e) => {
      if (!recording) return;
      
      const key = e.key;
      if (key === "Control") {
        pressedKeys.delete("Ctrl");
      } else {
        pressedKeys.delete(key);
      }
    });
  }
});
