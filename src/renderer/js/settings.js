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

  // 自启动设置元素引用
  const enableAutoLaunchCheckbox = document.getElementById("enable-auto-launch");

  const modalContainer = document.querySelector(".modal");

  // 初始化UI，保存返回的解绑函数对象
  const uiCleanup = window.uiManager.initUI({
    containerSelector: ".modal",
    windowType: "settings" // 指定窗口类型为设置窗口
  });

  // 当页面卸载时清理监听器
  window.addEventListener('beforeunload', () => {
    if (uiCleanup && typeof uiCleanup.unbindAll === 'function') {
      uiCleanup.unbindAll();
    }
  });

  // 初始化设置页面
  await initSettingsPage();

  // 加载已保存的主题设置
  await loadThemeSetting();

  // 加载可用语言列表和已保存的语言设置
  await loadLanguages();

  // 加载快捷键设置
  await loadShortcutSettings();

  // 加载自启动设置
  await loadAutoLaunchSetting();

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
  enableShortcutCheckbox.addEventListener("change", async () => {
    if (!enableShortcutCheckbox.checked && recordingShortcut) {
      // 如果取消选中时正在录制快捷键，停止录制
      // 恢复上次的有效值
      const config = await window.electronAPI.getShortcutConfig();
      setShortcutInputValueWithFormat(config.shortcut);
      stopRecordingShortcut();
    }

    updateShortcutConfig({ enabled: enableShortcutCheckbox.checked });
    updateShortcutInputState();
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
    window.electronAPI.openExternalLink("https://github.com/SolarianZ/launcher-app-electron");
  });

  /**
   * 报告问题链接点击事件处理
   * 使用默认浏览器打开GitHub issues页面
   */
  reportIssueLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.electronAPI.openExternalLink("https://github.com/SolarianZ/launcher-app-electron/issues");
  });

  /**
   * 启用自启动复选框变化事件
   * 保存设置并更新系统配置
   */
  enableAutoLaunchCheckbox.addEventListener("change", async () => {
    try {
      const result = await window.electronAPI.updateAutoLaunchConfig({
        enabled: enableAutoLaunchCheckbox.checked
      });
      if (result) {
        window.uiManager.showToast(await i18n.t(
          enableAutoLaunchCheckbox.checked ? "auto-launch-enabled" : "auto-launch-disabled"
        ));
      } else {
        enableAutoLaunchCheckbox.checked = !enableAutoLaunchCheckbox.checked;
        window.uiManager.showToast(await i18n.t("auto-launch-update-failed"), true);
      }
    } catch (error) {
      console.error("Error updating auto launch config:", error);
      window.uiManager.showToast(await i18n.t("auto-launch-update-failed"), true);
    }
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

  function setShortcutInputValueWithFormat(shortcut) {
    // 将快捷键中的字母键转换为大写显示
    const parts = shortcut.split('+');
    const formattedParts = parts.map(part => {
      // 如果是单个字符且是字母，转换为大写
      if (part.length === 1 && part.match(/[a-zA-Z]/)) {
        return part.toUpperCase();
      }
      // 其他情况（修饰键等）保持不变
      return part;
    });
    shortcutInput.value = formattedParts.join('+');
  }

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
      console.error("Error getting app info:", error);
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
      console.error("Error loading language list:", error);
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
      setShortcutInputValueWithFormat(config.shortcut);
      updateShortcutInputState();
    } catch (error) {
      console.error("Error loading shortcut settings:", error);
    }
  }

  /**
   * 加载自启动设置
   * 从主进程获取自启动设置并设置到界面
   */
  async function loadAutoLaunchSetting() {
    try {
      const config = await window.electronAPI.getAutoLaunchConfig();
      enableAutoLaunchCheckbox.checked = config.enabled;
    } catch (error) {
      console.error("Error loading auto-launch setting:", error);
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
      console.error("Error updating shortcut config:", error);
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

    // 根据启用状态设置快捷键相关控件的样式
    if (enabled) {
      shortcutInput.classList.remove('disabled-input');
      recordShortcutBtn.classList.remove('disabled-btn');
      resetShortcutBtn.classList.remove('disabled-btn');
    } else {
      shortcutInput.classList.add('disabled-input');
      recordShortcutBtn.classList.add('disabled-btn');
      resetShortcutBtn.classList.add('disabled-btn');
    }
  }

  /**
   * 是否正在录制快捷键
   */
  let recordingShortcut = false;

  /**
   * 进入快捷键录入模式
   */
  async function startRecordingShortcut() {
    shortcutInput.classList.add("recording");
    recordingShortcut = true;
    recordShortcutBtn.textContent = await i18n.t("cancel");
    shortcutInput.value = await i18n.t("press-new-shortcut");
  }

  /**
   * 结束快捷键录入模式
   */
  async function stopRecordingShortcut() {
    shortcutInput.classList.remove("recording");
    recordingShortcut = false;
    recordShortcutBtn.textContent = await i18n.t("record-shortcut");
  }

  /**
   * 设置快捷键录入的事件监听
   */
  function setupShortcutRecording() {
    let pressedKeys = new Set();

    /**
     * 快捷键记录按钮点击事件
     * 进入快捷键记录模式
     */
    recordShortcutBtn.addEventListener("click", async () => {
      if (!recordingShortcut) {
        startRecordingShortcut();
      } else {
        // 恢复上次的有效值
        const config = await window.electronAPI.getShortcutConfig();
        setShortcutInputValueWithFormat(config.shortcut);

        stopRecordingShortcut();
      }
    });

    /**
     * 快捷键重置按钮点击事件
     * 重置快捷键为默认值
     */
    resetShortcutBtn.addEventListener("click", async () => {
      // 如果在录制模式中，先退出录制模式
      if (recordingShortcut) {
        await stopRecordingShortcut();
      }

      pressedKeys.clear();

      setShortcutInputValueWithFormat("Alt+Shift+Q");
      updateShortcutConfig({ shortcut: "Alt+Shift+Q" });
    });

    // 录制时捕获按键
    document.addEventListener("keydown", async (e) => {
      if (!recordingShortcut)
        return;

      e.preventDefault();

      const key = e.key;
      pressedKeys.add(key);
      if (key === "Control" || key === "Alt" || key === "Shift" || key === "Meta")
        return;

      // 如果按下了非修饰键，尝试提交按键组合

      // 检查是否包含除Shift以外的修饰键
      const hasRequiredModifier = pressedKeys.has("Control") || pressedKeys.has("Alt") || pressedKeys.has("Meta");
      if (!hasRequiredModifier) {
        // 如果不含必需的修饰键，显示错误消息
        window.uiManager.showToast(await i18n.t("shortcut-need-modifier"), true);

        // 恢复上次的有效值
        const config = await window.electronAPI.getShortcutConfig();
        setShortcutInputValueWithFormat(config.shortcut);

        stopRecordingShortcut();
        pressedKeys.clear();

        return;
      }

      // 创建快捷键字符串
      const shortcut = Array.from(pressedKeys).join("+");
      pressedKeys.clear();

      // 测试快捷键是否可用
      const testResult = await window.electronAPI.testShortcut(shortcut);
      if (testResult.success) {
        setShortcutInputValueWithFormat(shortcut);

        // 保存新快捷键
        updateShortcutConfig({ shortcut });

        stopRecordingShortcut();
      } else {
        // 失败，显示错误消息
        window.uiManager.showToast(testResult.message, true);

        // 恢复上次的有效值
        const config = await window.electronAPI.getShortcutConfig();
        setShortcutInputValueWithFormat(config.shortcut);

        stopRecordingShortcut();
      }
    });

    // 监听按键释放，从集合中移除
    document.addEventListener("keyup", (e) => {
      if (!recordingShortcut)
        return;

      e.preventDefault();
      pressedKeys.delete(e.key);
    });
  }
});
