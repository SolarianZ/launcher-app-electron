/**
 * 设置页面的脚本
 * 处理设置窗口的所有功能
 */
document.addEventListener("DOMContentLoaded", () => {
  // DOM 元素
  const closeSettingsBtn = document.getElementById("close-settings");
  const themeSelect = document.getElementById("theme-select");
  const clearDataBtn = document.getElementById("clear-data-btn");
  const openStorageBtn = document.getElementById("open-storage-btn");
  const githubLink = document.getElementById("github-link");
  const reportIssueLink = document.getElementById("report-issue");

  // 初始化设置页面
  initSettingsPage();

  // 加载已保存的主题设置
  loadThemeSetting();

  // 应用当前主题设置
  applyCurrentTheme();

  // 事件监听
  closeSettingsBtn.addEventListener("click", () => {
    window.electronAPI.closeSettingsWindow();
  });

  // 主题选择切换
  themeSelect.addEventListener("change", () => {
    const theme = themeSelect.value;
    localStorage.setItem("theme", theme);
    applyCurrentTheme();
  });

  // 清空所有记录
  clearDataBtn.addEventListener("click", () => {
    if (confirm("确定要删除所有记录吗？此操作不可撤销。")) {
      window.electronAPI.clearAllItems();
    }
  });

  // 打开存储位置
  openStorageBtn.addEventListener("click", () => {
    window.electronAPI.openStorageLocation();
  });

  // 处理外部链接
  githubLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.electronAPI.openExternalLink(
      "https://github.com/YourUsername/launcher-app"
    );
  });

  reportIssueLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.electronAPI.openExternalLink(
      "https://github.com/YourUsername/launcher-app/issues"
    );
  });

  // 监听按键
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.electronAPI.closeSettingsWindow();
      e.preventDefault();
    } else if (e.key === "F12") {
      window.electronAPI.openDevTools();
      e.preventDefault();
    }
  });

  // 初始化设置页面
  async function initSettingsPage() {
    // 获取应用信息
    try {
      const appInfo = await window.electronAPI.getAppInfo();
      document.querySelector(
        ".app-version"
      ).textContent = `版本 ${appInfo.version}`;
    } catch (error) {
      console.error("获取应用信息失败:", error);
    }
  }

  // 加载主题设置
  function loadThemeSetting() {
    const savedTheme = localStorage.getItem("theme") || "system";
    themeSelect.value = savedTheme;
  }

  // 应用当前主题设置
  function applyCurrentTheme() {
    const theme = localStorage.getItem("theme") || "system";
    const modal = document.querySelector(".modal");

    // 移除所有主题类
    modal.classList.remove("dark-theme", "light-theme");

    if (theme === "system") {
      applySystemTheme();
    } else if (theme === "dark") {
      modal.classList.add("dark-theme");
    } else if (theme === "light") {
      modal.classList.add("light-theme");
    }
  }

  // 应用系统主题
  function applySystemTheme() {
    const isDarkMode =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const modal = document.querySelector(".modal");

    if (isDarkMode) {
      modal.classList.add("dark-theme");
    } else {
      modal.classList.remove("dark-theme");
    }
  }
});
