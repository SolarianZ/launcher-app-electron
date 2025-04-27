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
  const commandTip = document.getElementById("command-tip");

  // 导入i18n模块、PathType常量
  const i18n = window.electronAPI.i18n;
  const PathType = window.defines.PathType;

  // 初始化UI管理器，保存返回的解绑函数对象
  const uiCleanup = window.uiManager.init({
    containerSelector: ".modal",
    windowType: "edit-item" // 指定窗口类型为项目编辑窗口
  });

  // 当页面卸载时清理监听器
  window.addEventListener('beforeunload', () => {
    if (uiCleanup && typeof uiCleanup.unbindAll === 'function') {
      uiCleanup.unbindAll();
    }
  });

  // 跟踪是否处于编辑模式
  let isEditMode = false;
  let editingItemIndex = -1;

  // 初始化页面
  initPage();

  /**
   * 初始化页面
   * 应用主题和语言设置，设置事件监听器
   */
  async function initPage() {
    // 监听编辑项目数据事件，注意要在其他异步操作之前注册监听器，避免错过事件窗口
    window.electronAPI.onEditItemData(({ item, index }) => {
      console.log("Editing item data:", item, index);
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

      updateCommandTipVisibility();

      // 启用保存按钮
      saveBtn.disabled = false;

      // 让路径输入框获得焦点
      setTimeout(() => itemPathInput.focus(), 100);
    });

    // 默认情况下(新增模式)，让路径输入框获得焦点
    setTimeout(() => itemPathInput.focus(), 100);

    // 根据当前选择的类型控制提示信息的显示/隐藏
    updateCommandTipVisibility();
  }

  /**
   * 更新命令提示信息的可见性
   * 仅当类型为"指令"时显示提示
   */
  function updateCommandTipVisibility() {
    commandTip.style.display = itemTypeSelect.value === PathType.COMMAND ? "block" : "none";
  }

  /**
   * 项目类型选择变更事件
   * 控制命令提示信息的显示/隐藏
   */
  itemTypeSelect.addEventListener("change", () => {
    updateCommandTipVisibility();
  });

  /**
   * 阻止在路径输入框中输入换行符
   * 当用户按下Enter键时，阻止默认行为
   */
  itemPathInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  });

  /**
   * 确保粘贴到路径输入框的内容不包含换行符
   */
  itemPathInput.addEventListener("paste", (e) => {
    // 阻止默认粘贴行为
    e.preventDefault();

    // 获取剪贴板数据
    let pasteData = (e.clipboardData || window.clipboardData).getData("text");

    // 移除所有换行符
    if (pasteData) {

      // 替换所有换行符（\n, \r, \r\n）为空格
      pasteData = pasteData.replace(/[\r\n]+/g, " ");

      // 在当前光标位置插入处理后的文本
      const selectionStart = itemPathInput.selectionStart;
      const selectionEnd = itemPathInput.selectionEnd;
      const currentValue = itemPathInput.value;

      itemPathInput.value = currentValue.substring(0, selectionStart) +
        pasteData +
        currentValue.substring(selectionEnd);

      // 更新光标位置
      itemPathInput.selectionStart = itemPathInput.selectionEnd =
        selectionStart + pasteData.length;

      // 手动触发input事件以更新验证
      itemPathInput.dispatchEvent(new Event("input"));
    }
  });

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
        // 更新命令提示可见性
        updateCommandTipVisibility();
        saveBtn.disabled = false;
      }
    } catch (error) {
      console.error("Error selecting file:", error);
      const errorMessage = await i18n.t("select-file-failed");
      window.uiManager.showToast(errorMessage, true);
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
        // 更新命令提示可见性
        updateCommandTipVisibility();
        saveBtn.disabled = false;
      }
    } catch (error) {
      console.error("Error selecting folder:", error);
      const errorMessage = await i18n.t("select-folder-failed");
      window.uiManager.showToast(errorMessage, true);
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
      // 自动设置类型
      itemTypeSelect.value = type;
      // 更新命令提示可见性
      updateCommandTipVisibility();
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
      window.uiManager.showToast(errorMessage, true);
      return;
    }

    if (!type) {
      const errorMessage = await i18n.t("select-type-required");
      window.uiManager.showToast(errorMessage, true);
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
        // 编辑现有项目
        result = await window.electronAPI.updateItem(editingItemIndex, newItem);
      } else {
        // 添加新项目
        result = await window.electronAPI.addItem(newItem);
      }

      // 处理操作结果
      if (result.success) {
        // 保存成功，关闭窗口
        window.electronAPI.closeAddItemWindow();
      } else {
        // 显示错误提示
        window.uiManager.showToast(result.message, true);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "adding"} item:`, error);
      const errorMessage = await i18n.t(
        isEditMode ? "update-failed" : "add-failed"
      );
      window.uiManager.showToast(errorMessage, true);
    }
  });

  /**
   * 取消按钮点击事件
   * 关闭编辑窗口，不保存任何更改
   */
  cancelBtn.addEventListener("click", () => {
    window.electronAPI.closeAddItemWindow();
  });

  /**
   * 键盘事件处理
   * - Escape: 关闭窗口
   * - Enter+Ctrl: 提交表单
   * - F12: 开发者工具
   */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.electronAPI.closeAddItemWindow();
      e.preventDefault();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      // 使用 Ctrl+Enter / Cmd+Enter 提交表单
      if (!saveBtn.disabled) {
        saveBtn.click();
      }
      e.preventDefault();
    } else if (e.key === "F12") {
      window.electronAPI.openDevTools();
      e.preventDefault();
    }
  });
});
