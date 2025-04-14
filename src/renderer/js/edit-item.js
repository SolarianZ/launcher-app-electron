/**
 * 项目编辑窗口脚本
 * 负责处理项目的添加和编辑功能
 * 包括表单验证、文件选择和保存操作
 */

// 与shared/defines.js中的定义保持一致（这里无法直接require）
const PathType = {
  FILE: "file",
  FOLDER: "folder",
  URL: "url",
  COMMAND: "command",
};

document.addEventListener("DOMContentLoaded", () => {
  // DOM元素引用
  const itemPathInput = document.getElementById("item-path");
  const itemNameInput = document.getElementById("item-name");
  const itemTypeSelect = document.getElementById("item-type");
  const saveBtn = document.getElementById("save-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const selectFileBtn = document.getElementById("select-file-btn");
  const selectFolderBtn = document.getElementById("select-folder-btn");
  const toast = document.getElementById("toast");

  // 跟踪是否处于编辑模式
  let isEditMode = false;
  let editingItemIndex = -1;

  // 检测并应用系统主题
  applySystemTheme();
  
  /**
   * 自动调整textarea的高度
   * 根据内容动态调整高度，保持在1-5行之间
   */
  function autoResizeTextarea() {
    // 重置高度，以便能够计算实际内容高度
    itemPathInput.style.height = 'auto';
    
    // 计算内容的实际高度
    const scrollHeight = itemPathInput.scrollHeight;
    
    // 设置行高为计算的高度（37px为单行高度，包含padding和border）
    const lineHeight = 37;
    const maxHeight = lineHeight * 5;
    
    // 设置高度，最小为一行高度，最大为5行高度
    const newHeight = Math.min(Math.max(scrollHeight, lineHeight), maxHeight);
    itemPathInput.style.height = newHeight + 'px';
  }
  
  // 监听textarea的输入事件，调整高度
  itemPathInput.addEventListener('input', autoResizeTextarea);

  /**
   * 监听编辑条目数据事件
   * 当从主窗口请求编辑项目时触发
   */
  window.electronAPI.onEditItemData(({ item, index }) => {
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
    
    // 调整textarea高度以适应内容
    autoResizeTextarea();

    // 启用保存按钮
    saveBtn.disabled = false;
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
        saveBtn.disabled = false;
        // 调整textarea高度以适应内容
        autoResizeTextarea();
      }
    } catch (error) {
      console.error("选择文件出错:", error);
      showToast("选择文件失败，请重试", true);
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
        // 调整textarea高度以适应内容
        autoResizeTextarea();
      }
    } catch (error) {
      console.error("选择文件夹出错:", error);
      showToast("选择文件夹失败，请重试", true);
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
      showToast("请输入路径或命令", true);
      return;
    }

    if (!type) {
      showToast("请选择项目类型", true);
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
      showToast(`${isEditMode ? "更新" : "添加"}失败，请重试`, true);
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

  // 应用系统主题
  function applySystemTheme() {
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      document.querySelector(".modal").classList.add("dark-theme");
    } else {
      document.querySelector(".modal").classList.remove("dark-theme");
    }
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
