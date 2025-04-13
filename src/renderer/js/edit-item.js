// 与shared/defines.js中的定义保持一致（这里无法直接require）
const PathType = {
  FILE: "file",
  FOLDER: "folder",
  URL: "url",
  COMMAND: "command",
};

document.addEventListener("DOMContentLoaded", () => {
  // DOM元素
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

  // 监听编辑条目数据
  window.electronAPI.onEditItemData(({ item, index }) => {
    // 进入编辑模式
    isEditMode = true;
    editingItemIndex = index;

    // 填充数据
    itemPathInput.value = item.path;
    itemTypeSelect.value = item.type;

    // 如果有名称，填充名称字段
    if (item.name) {
      itemNameInput.value = item.name;
    }

    // 启用保存按钮
    saveBtn.disabled = false;
  });

  // 选择文件按钮点击事件
  selectFileBtn.addEventListener("click", async () => {
    try {
      const result = await window.electronAPI.selectFile();
      if (!result.canceled) {
        itemPathInput.value = result.filePath;
        itemTypeSelect.value = PathType.FILE;
        saveBtn.disabled = false;
      }
    } catch (error) {
      console.error("选择文件出错:", error);
      showToast("选择文件失败，请重试", true);
    }
  });

  // 选择文件夹按钮点击事件
  selectFolderBtn.addEventListener("click", async () => {
    try {
      const result = await window.electronAPI.selectFolder();
      if (!result.canceled) {
        itemPathInput.value = result.filePath;
        itemTypeSelect.value = PathType.FOLDER;
        saveBtn.disabled = false;
      }
    } catch (error) {
      console.error("选择文件夹出错:", error);
      showToast("选择文件夹失败，请重试", true);
    }
  });

  // 路径输入变化时自动推断类型
  itemPathInput.addEventListener("input", async () => {
    const path = itemPathInput.value.trim();
    const type = await window.electronAPI.getItemType(path);

    if (path && type) {
      // 启用添加按钮
      saveBtn.disabled = false;
      itemTypeSelect.value = type;
    } else {
      // 禁用添加按钮
      saveBtn.disabled = true;
    }
  });

  // 添加/保存按钮点击事件
  saveBtn.addEventListener("click", async () => {
    const path = itemPathInput.value.trim();
    const type = itemTypeSelect.value;
    const name = itemNameInput.value.trim();

    if (!path) {
      showToast("请输入路径或命令", true);
      return;
    }

    if (!type) {
      showToast("请选择项目类型", true);
      return;
    }

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

      if (result.success) {
        window.electronAPI.closeAddItemWindow();
      } else {
        showToast(result.message, true);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "adding"} item:`, error);
      showToast(`${isEditMode ? "更新" : "添加"}失败，请重试`, true);
    }
  });

  // 取消按钮点击事件
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

  // 路径输入框按Enter时切换焦点到名称输入框
  itemPathInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // 阻止默认行为
      itemNameInput.focus(); // 将焦点移到名称输入框
    }
  });

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
