/**
 * 主窗口渲染进程脚本
 * 负责项目列表的渲染、项目操作、搜索过滤、拖放功能等
 * 包含用户界面交互逻辑和事件处理
 */
document.addEventListener("DOMContentLoaded", () => {
  // DOM元素引用
  const addBtn = document.getElementById("add-button");
  const searchInput = document.getElementById("search-input");
  const listContainer = document.getElementById("list-container");
  const settingsButton = document.getElementById("settings-button");

  // 导入i18n模块
  const i18n = window.electronAPI.i18n;

  // 当前项目列表(内存中存储)
  let currentItems = [];

  // 初始化UI管理器，保存返回的解绑函数对象
  const uiCleanup = window.uiManager.init({
    containerSelector: ".app-container"
  });

  // 当页面卸载时清理监听器
  window.addEventListener('beforeunload', () => {
    if (uiCleanup && typeof uiCleanup.unbindAll === 'function') {
      uiCleanup.unbindAll();
    }
  });

  // 初始化页面
  initPage();

  /**
   * 事件监听设置部分
   */

  // 添加按钮点击事件 - 显示添加项目对话框
  addBtn.addEventListener("click", () => {
    window.electronAPI.showAddItemDialog();
  });

  // 搜索框输入事件 - 实时过滤列表项目
  searchInput.addEventListener("input", () => {
    filterItems(searchInput.value.toLowerCase());
  });

  // 设置按钮点击事件 - 打开独立设置窗口
  settingsButton.addEventListener("click", () => {
    window.electronAPI.showSettingsWindow();
  });

  /**
   * 全局键盘事件处理
   * - Escape: 关闭窗口
   * - Delete: 移除选中项目
   * - Enter: 打开选中项目
   * - 方向键: 列表导航
   * - F12: 打开开发者工具
   * - Ctrl+F: 搜索框获得焦点
   */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.electronAPI.closeMainWindow();
    } else if (e.key === "Delete") {
      const activeItem = document.querySelector(".list-item.active");
      if (activeItem) {
        const index = parseInt(activeItem.dataset.index);
        removeItem(index);
      }
    } else if (e.key === "Enter") {
      const activeItem = document.querySelector(".list-item.active");
      if (activeItem) {
        const index = parseInt(activeItem.dataset.index);
        window.electronAPI.openItem(currentItems[index]);
      }
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      navigateList(e.key === "ArrowUp" ? -1 : 1);
    } else if (e.key === "F12") {
      window.electronAPI.openDevTools();
      e.preventDefault();
    } else if (e.key === "f" && (e.ctrlKey || e.metaKey)) {
      // Ctrl+F (Windows/Linux) 或 Command+F (macOS) 使搜索框获得焦点
      searchInput.focus();
      e.preventDefault();
    }
  });

  // 处理拖放文件功能
  listContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    listContainer.classList.add("drag-over");
  });

  listContainer.addEventListener("dragleave", () => {
    listContainer.classList.remove("drag-over");
  });

  listContainer.addEventListener("drop", async (e) => {
    e.preventDefault();
    listContainer.classList.remove("drag-over");

    // 使用 webUtils 获取文件路径
    const filePath = await window.electronAPI.getFileOrFolderPath(e.dataTransfer.files[0]);
    if (!filePath) {
      window.uiManager.showToast("无法获取文件路径", true);
      return;
    }

    // 检查是否已存在
    const exists = currentItems.some((item) => item.path === filePath);

    if (exists) {
      window.uiManager.showToast("条目已存在");
      return;
    }

    // 判断项目类型
    const itemType = await window.electronAPI.getItemType(filePath);

    // 创建新项目
    const newItem = {
      type: itemType,
      path: filePath,
      name: filePath.split("/").pop().split("\\").pop(), // 从路径中提取文件名
    };

    // 添加项目并刷新列表
    const result = await window.electronAPI.addItem(newItem);
    if (result.success) {
      await loadItems();
    } else {
      window.uiManager.showToast(result.message, true);
    }
  });

  // 初始化页面
  async function initPage() {
    await loadItems();

    // 添加对列表更新的监听
    window.electronAPI.onItemsUpdated(async () => {
      console.log("条目已更新，刷新列表……");
      await loadItems();
    });
  }

  // 加载项目列表
  async function loadItems() {
    currentItems = await window.electronAPI.getItems();
    if (currentItems.length > 0) {
      document.querySelector(".empty-list-message")?.remove();
      renderItems(currentItems);
    } else {
      // 显示空列表消息
      listContainer.innerHTML = `<div class="empty-list-message">
        <div class="empty-text" data-i18n="empty-list">点击 + 按钮添加新的条目</div>
      </div>`;

      // 更新空列表消息的翻译
      await window.uiUtils.updatePageTexts(i18n);
    }
  }

  // 渲染项目列表
  function renderItems(items) {
    listContainer.innerHTML = "";

    items.forEach((item, index) => {
      const listItem = document.createElement("div");
      listItem.classList.add("list-item");
      listItem.dataset.index = index;
      listItem.dataset.type = item.type;
      listItem.dataset.path = item.path;

      // 设置拖拽属性
      listItem.draggable = true;

      // 图标
      const icon = getIconForType(item.type);

      listItem.innerHTML = `
          <div class="item-icon">${icon}</div>
          <div class="item-text">${item.name || item.path}</div>
        `;

      // 事件监听
      listItem.addEventListener("click", () => {
        // 激活选中项
        document
          .querySelectorAll(".list-item.active")
          .forEach((el) => el.classList.remove("active"));
        listItem.classList.add("active");
      });

      listItem.addEventListener("dblclick", () => {
        window.electronAPI.openItem(item);
      });

      listContainer.appendChild(listItem);
    });

    // 添加拖拽排序功能
    setupDragAndSort();
  }

  // 根据类型获取图标
  function getIconForType(type) {
    switch (type) {
      case "file":
        return "📄";
      case "folder":
        return "📁";
      case "url":
        return "🌐";
      case "command":
        return "⌨️";
      default:
        return "❓";
    }
  }

  // 过滤项目
  function filterItems(query) {
    const filteredItems = query
      ? currentItems.filter(
        (item) =>
          (item.name && item.name.toLowerCase().includes(query)) ||
          item.path.toLowerCase().includes(query)
      )
      : currentItems;

    renderItems(filteredItems);
  }

  // 移除项目
  async function removeItem(index) {
    const result = await window.electronAPI.removeItem(index);
    if (result.success) {
      await loadItems();
    }
  }

  // 设置拖拽排序
  function setupDragAndSort() {
    const items = document.querySelectorAll(".list-item");
    let draggedItem = null;
    let indicator = document.createElement("div");
    indicator.classList.add("drag-indicator");
    let dropPosition = null; // 添加变量跟踪放置位置

    // 添加自动滚动相关变量
    let autoScrollInterval = null;
    const SCROLL_SPEED = 5; // 滚动速度
    const SCROLL_THRESHOLD = 50; // 触发自动滚动的阈值（距离容器边缘的像素）

    // 停止自动滚动
    const stopAutoScroll = () => {
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
      }
    };

    items.forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        draggedItem = item;
        item.classList.add("dragging");
        e.dataTransfer.setData("text/plain", item.dataset.index);
        setTimeout(() => {
          item.style.opacity = "0.5";
        }, 0);
      });

      item.addEventListener("dragend", () => {
        draggedItem = null;
        item.classList.remove("dragging");
        item.style.opacity = "1";
        indicator.remove();
        dropPosition = null; // 重置放置位置
        stopAutoScroll(); // 停止自动滚动
      });

      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (draggedItem && draggedItem !== item) {
          // 计算应该插在当前项的上方还是下方
          const rect = item.getBoundingClientRect();
          const y = e.clientY - rect.top;
          const isBelow = y > rect.height / 2;

          // 移除所有现有的drop-target类
          items.forEach((i) => i.classList.remove("drop-before", "drop-after"));

          // 根据放置位置添加相应的类
          if (isBelow) {
            item.classList.add("drop-after");
            dropPosition = { target: item, position: "after" };
          } else {
            item.classList.add("drop-before");
            dropPosition = { target: item, position: "before" };
          }

          // 添加指示器
          if (isBelow) {
            if (item.nextSibling !== indicator) {
              item.after(indicator);
            }
          } else {
            if (item.previousSibling !== indicator) {
              item.before(indicator);
            }
          }
        }
      });
    });

    // 当鼠标在列表容器内移动时，处理自动滚动
    listContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!draggedItem) return;

      const containerRect = listContainer.getBoundingClientRect();
      const mouseY = e.clientY;

      // 判断是否需要向上滚动
      if (mouseY < containerRect.top + SCROLL_THRESHOLD) {
        stopAutoScroll();
        autoScrollInterval = setInterval(() => {
          listContainer.scrollTop -= SCROLL_SPEED;
        }, 16);
      }
      // 判断是否需要向下滚动
      else if (mouseY > containerRect.bottom - SCROLL_THRESHOLD) {
        stopAutoScroll();
        autoScrollInterval = setInterval(() => {
          listContainer.scrollTop += SCROLL_SPEED;
        }, 16);
      }
    });

    // 当鼠标离开列表容器时停止滚动
    listContainer.addEventListener("dragleave", () => {
      stopAutoScroll();
    });

    // 在列表容器上监听drop事件，而不是在每个项目上
    listContainer.addEventListener("drop", async (e) => {
      e.preventDefault();
      stopAutoScroll(); // 确保停止自动滚动

      if (draggedItem && dropPosition) {
        // 获取拖拽项的索引
        const draggedIndex = parseInt(draggedItem.dataset.index);
        const targetIndex = parseInt(dropPosition.target.dataset.index);
        let newIndex;

        // 根据放置位置计算新索引
        if (dropPosition.position === "after") {
          newIndex = targetIndex + 1;
        } else {
          newIndex = targetIndex;
        }

        // 调整索引，考虑拖拽项被移除后的影响
        if (draggedIndex < newIndex) {
          newIndex--;
        }

        // 重新排序
        const itemsCopy = [...currentItems];
        const [removed] = itemsCopy.splice(draggedIndex, 1);
        itemsCopy.splice(newIndex, 0, removed);

        // 更新后端存储
        const result = await window.electronAPI.updateItemsOrder(itemsCopy);
        if (result.success) {
          await loadItems();
          console.log("排序已更新:", draggedIndex, "->", newIndex);
        }
      }

      indicator.style.display = "none";
      dropPosition = null; // 重置放置位置
    });
  }

  // 键盘导航列表
  function navigateList(direction) {
    const items = document.querySelectorAll(".list-item");
    const activeItem = document.querySelector(".list-item.active");

    if (!items.length) return;

    if (!activeItem) {
      // 如果没有选中项，选择第一个或最后一个
      items[direction > 0 ? 0 : items.length - 1].classList.add("active");
      return;
    }

    // 获取当前索引
    const currentIndex = Array.from(items).indexOf(activeItem);
    let nextIndex = currentIndex + direction;

    // 边界检查
    if (nextIndex < 0) nextIndex = items.length - 1;
    if (nextIndex >= items.length) nextIndex = 0;

    // 移除当前活动项
    activeItem.classList.remove("active");

    // 设置新的活动项
    items[nextIndex].classList.add("active");

    // 确保项目可见
    const newActiveItem = items[nextIndex];
    newActiveItem.scrollIntoView({ block: "nearest" });
  }

  // 把loadItems和removeItem函数暴露到全局，供其他脚本使用
  window.appFunctions = {
    loadItems,
    removeItem
  };
});
