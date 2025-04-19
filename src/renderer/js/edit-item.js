/**
 * 项目编辑窗口脚本
 * 负责处理项目的添加和编辑功能
 * 包括表单验证、文件选择和保存操作
 */

document.addEventListener("DOMContentLoaded", async () => {
  // DOM元素引用
  const itemPathInput = document.getElementById("item-path");
  const itemNameInput = document.getElementById("item-name");
  const itemTypeSelect = document.getElementById("item-type");
  const saveBtn = document.getElementById("save-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const selectFileBtn = document.getElementById("select-file-btn");
  const selectFolderBtn = document.getElementById("select-folder-btn");
  const toast = document.getElementById("toast");

  // 导入i18n模块、PathType常量和UI工具
  const i18n = window.electronAPI.i18n;
  const PathType = window.electronAPI.PathType;
  const { applyTheme, updatePageTexts, setupSystemThemeListener } = window.uiUtils;

  // 跟踪是否处于编辑模式
  let isEditMode = false;
  let editingItemIndex = -1;

  // 初始化页面
  initPage();

  /**
   * 初始化页面
   * 应用主题和语言设置
   */
  async function initPage() {
    // 加载主题设置和应用
    const savedTheme = localStorage.getItem("theme") || "system";
    const modalContainer = document.querySelector(".modal");
    applyTheme(savedTheme, modalContainer);

    // 初始化语言设置
    await updatePageTexts(i18n);

    // 监听来自其他窗口的语言变更通知
    window.electronAPI.onLanguageChanged((language) => {
      console.log("语言已更改为:", language);
      updatePageTexts(i18n);
    });

    // 监听来自其他窗口的主题变更通知
    window.electronAPI.onThemeChanged((theme) => {
      console.log("主题已更改为", theme);
      const modalContainer = document.querySelector(".modal");
      applyTheme(theme, modalContainer);
    });

    // 设置系统主题变化监听器
    setupSystemThemeListener(document.querySelector(".modal"));

    /**
     * 监听编辑条目数据事件
     * 当从主窗口请求编辑项目时触发
     */
    window.electronAPI.onEditItemData(({ item, index }) => {
      console.log("编辑条目数据:", item, index);
      // 进入编辑模式
      isEditMode = true;
      editingItemIndex = index;

      // 填充表单数据
      itemPathInput.value = item.path;
      itemTypeSelect.value = item.type;

      // 如果有名称，填充名称字段
      if (item.name) {
        itemNameInput.value = item.name;
      }

      // 启用保存按钮
      saveBtn.disabled = false;
    });
  }

  /**
   * 文件选择按钮点击事件
   * 使用系统对话框选择文件
   */
  selectFileBtn.addEventListener("click", async () => {
    try {
      const result = await window.electronAPI.selectFile();
      if (!result.canceled) {
        itemPathInput.value = result.filePath;
        // 自动设置类型为文件
        itemTypeSelect.value = PathType.FILE;
        saveBtn.disabled = false;
      }
    } catch (error) {
      console.error("选择文件出错:", error);
      const errorMessage = await i18n.t("select-file-failed");
      showToast(errorMessage, true);
    }
  });

  /**
   * 文件夹选择按钮点击事件
   * 使用系统对话框选择文件夹
   */
  selectFolderBtn.addEventListener("click", async () => {
    try {
      const result = await window.electronAPI.selectFolder();
      if (!result.canceled) {
        itemPathInput.value = result.filePath;
        // 自动设置类型为文件夹
        itemTypeSelect.value = PathType.FOLDER;
        saveBtn.disabled = false;
      }
    } catch (error) {
      console.error("选择文件夹出错:", error);
      const errorMessage = await i18n.t("select-folder-failed");
      showToast(errorMessage, true);
    }
  });

  /**
   * 路径输入变化事件处理
   * 自动推断项目类型，启用/禁用保存按钮
   */
  itemPathInput.addEventListener("input", async () => {
    const path = itemPathInput.value.trim();
    // 获取路径对应的项目类型
    const type = await window.electronAPI.getItemType(path);

    if (path && type) {
      // 有效路径，启用添加按钮
      saveBtn.disabled = false;
      itemTypeSelect.value = type;
    } else {
      // 无效路径，禁用添加按钮
      saveBtn.disabled = true;
    }
  });

  /**
   * 保存按钮点击事件处理
   * 添加新项目或更新现有项目
   */
  saveBtn.addEventListener("click", async () => {
    // 获取表单数据
    const path = itemPathInput.value.trim();
    const type = itemTypeSelect.value;
    const name = itemNameInput.value.trim();

    // 表单验证
    if (!path) {
      const errorMessage = await i18n.t("enter-path-required");
      showToast(errorMessage, true);
      return;
    }

    if (!type) {
      const errorMessage = await i18n.t("select-type-required");
      showToast(errorMessage, true);
      return;
    }

    // 创建项目对象
    const newItem = {
      type: type,
      path: path,
    };

    // 如果用户提供了名称，则添加到项目中
    if (name) {
      newItem.name = name;
    }

    try {
      let result;

      // 根据模式决定是更新还是添加
      if (isEditMode) {
        // 编辑现有条目
        result = await window.electronAPI.updateItem(editingItemIndex, newItem);
      } else {
        // 添加新条目
        result = await window.electronAPI.addItem(newItem);
      }

      // 处理操作结果
      if (result.success) {
        // 保存成功，关闭窗口
        window.electronAPI.closeAddItemWindow();
      } else {
        // 显示错误提示
        showToast(result.message, true);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "adding"} item:`, error);
      const errorMessage = await i18n.t(
        isEditMode ? "update-failed" : "add-failed"
      );
      showToast(errorMessage, true);
    }
  });

  /**
   * 取消按钮点击事件
   * 关闭编辑窗口，不保存任何更改
   */
  cancelBtn.addEventListener("click", () => {
    window.electronAPI.closeAddItemWindow();
  });

  // 显示提示消息
  function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast";

    if (isError) {
      toast.classList.add("error-toast");
    }

    toast.style.display = "block";
    toast.style.opacity = "1";

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        toast.style.display = "none";
      }, 300);
    }, 1000);
  }

  // 名称输入框按Enter时触发保存（如果数据有效）
  itemNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !saveBtn.disabled) {
      e.preventDefault(); // 阻止默认行为
      saveBtn.click(); // 触发保存操作
    }
  });

  // 监听按键
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.electronAPI.closeAddItemWindow();
      e.preventDefault();
    } else if (e.key === "F12") {
      window.electronAPI.openDevTools();
      e.preventDefault();
    }
  });
});
