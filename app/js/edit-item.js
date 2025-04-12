document.addEventListener("DOMContentLoaded", () => {
  // DOM元素
  const itemPathInput = document.getElementById("item-path");
  const itemTypeSelect = document.getElementById("item-type");
  const saveBtn = document.getElementById("save-btn");
  const cancelBtn = document.getElementById("cancel-btn");
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

    // 启用保存按钮
    saveBtn.disabled = false;
  });

  // 路径输入变化时自动推断类型
  itemPathInput.addEventListener("input", async () => {
    const path = itemPathInput.value.trim();

    if (path) {
      // 启用添加按钮
      saveBtn.disabled = false;

      // 推断类型
      if (path.match(/^https?:\/\//i) || path.includes("://")) {
        itemTypeSelect.value = "url";
      } else if (
        path.includes("/") ||
        path.includes("\\") ||
        path.match(/^[a-zA-Z]:\\/)
      ) {
        try {
          const type = await window.electronAPI.getItemType(path);
          itemTypeSelect.value = type;
        } catch (error) {
          console.error("Error detecting file type:", error);
          itemTypeSelect.value = "command";
        }
      } else {
        itemTypeSelect.value = "command";
      }
    } else {
      // 禁用添加按钮
      saveBtn.disabled = true;
    }
  });

  // 添加/保存按钮点击事件
  saveBtn.addEventListener("click", async () => {
    const path = itemPathInput.value.trim();
    const type = itemTypeSelect.value;

    if (!path) {
      showToast("请输入路径或命令", true);
      return;
    }

    const newItem = {
      type: type,
      path: path,
      name: path.split("/").pop().split("\\").pop(),
    };

    try {
      let result;

      // 新增代码: 根据模式决定是更新还是添加
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

  // 监听按键
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.electronAPI.closeAddItemWindow();
    } else if (e.key === "Enter" && !saveBtn.disabled) {
      saveBtn.click();
    }
  });
});
