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
  const toast = document.getElementById("toast");
  const settingsButton = document.getElementById("settings-button");
  
  // 导入i18n模块
  const i18n = window.electronAPI.i18n;

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
   * - Delete: 删除选中项目
   * - Enter: 打开选中项目
   * - 方向键: 列表导航
   * - F12: 打开开发者工具
   */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.electronAPI.closeWindow();
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
        const items = JSON.parse(localStorage.getItem("cachedItems") || "[]");
        window.electronAPI.openItem(items[index]);
      }
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      navigateList(e.key === "ArrowUp" ? -1 : 1);
    } else if (e.key === "F12") {
      window.electronAPI.openDevTools();
      e.preventDefault();
    }
  });

  /**
   * 文件拖放处理
   * 支持将文件从资源管理器拖入应用程序
   */
  // 允许拖放操作
  listContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  });

  // 处理文件拖放
  listContainer.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files.length === 0) {
      return;
    }

    const file = e.dataTransfer.files[0];
    // 使用安全的API获取文件路径
    // 注意：最新版Electron中，必须使用webUtils.getPathForFile
    const filePath = window.electronAPI.getFileOrFolderPath(file);
    if (!filePath) {
      showToast("无效的文件", true);
      return;
    }

    // 检查是否已存在
    const items = JSON.parse(localStorage.getItem("cachedItems") || "[]");
    const exists = items.some((item) => item.path === filePath);

    if (exists) {
      showToast("条目已存在");
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
      showToast(result.message);
    }
  });

  // 初始化页面
  async function initPage() {
    await loadItems();

    // 加载主题设置和应用
    const savedTheme = localStorage.getItem("theme") || "system";
    applyTheme(savedTheme);

    // 初始化语言设置
    initializeLanguage();

    // 添加对列表更新的监听
    window.electronAPI.onItemsUpdated(async () => {
      console.log("Items updated, refreshing list...");
      await loadItems();
    });

    // 监听来自其他窗口的主题变更通知
    window.electronAPI.onThemeChanged((theme) => {
      console.log("主题已更改为:", theme);
      applyTheme(theme);
    });
    
    // 监听来自其他窗口的语言变更通知
    window.electronAPI.onLanguageChanged((language) => {
      console.log("语言已更改为:", language);
      applyLanguage(language);
    });

    // 检测系统主题变化
    if (window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
          if (localStorage.getItem("theme") === "system") {
            applySystemTheme();
          }
        });
    }
  }
  
  /**
   * 初始化语言设置
   * 加载用户语言设置并应用
   */
  function initializeLanguage() {
    // 更新所有页面文本
    updatePageTexts();
  }
  
  /**
   * 应用语言设置
   * @param {string} language 语言代码
   */
  function applyLanguage(language) {
    i18n.setLanguage(language);
    updatePageTexts();
  }
  
  /**
   * 更新页面文本
   * 使用当前语言更新所有标记的UI元素
   */
  async function updatePageTexts() {
    try {
      // 更新普通文本元素
      const elements = document.querySelectorAll('[data-i18n]');
      for (const el of elements) {
        const key = el.getAttribute('data-i18n');
        el.textContent = await i18n.t(key);
      }

      // 更新带有title属性的元素
      const titleElements = document.querySelectorAll('[data-i18n-title]');
      for (const el of titleElements) {
        const key = el.getAttribute('data-i18n-title');
        el.title = await i18n.t(key);
      }

      // 更新带有placeholder属性的元素
      const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
      for (const el of placeholderElements) {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = await i18n.t(key);
      }
    } catch (error) {
      console.error("更新页面文本时出错:", error);
    }
  }

  // 加载项目列表
  async function loadItems() {
    const items = await window.electronAPI.getItems();
    // 缓存项目用于搜索和其他操作
    localStorage.setItem("cachedItems", JSON.stringify(items));
    renderItems(items);
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

      // 鼠标悬停显示完整路径
      listItem.addEventListener("mouseenter", (e) => {
        showTooltip(item.path, e);
      });

      listItem.addEventListener("mouseleave", () => {
        hideTooltip();
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
        return "💻";
      default:
        return "📌";
    }
  }

  // 过滤项目
  function filterItems(query) {
    const items = JSON.parse(localStorage.getItem("cachedItems") || "[]");

    if (!query) {
      renderItems(items);
      return;
    }

    const filteredItems = items.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(query)) ||
        item.path.toLowerCase().includes(query)
    );

    renderItems(filteredItems);
  }

  // 显示提示框
  function showTooltip(text, event) {
    const tooltip = document.getElementById("tooltip");
    tooltip.textContent = text;
    tooltip.style.display = "block";

    // 设置最大宽度来避免太长的tooltip
    tooltip.style.maxWidth = "300px";

    // 首先让tooltip在视口的右下角，计算尺寸
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";

    // 获取tooltip尺寸
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 初始位置：鼠标右下方（避免遮挡鼠标）
    let x = event.clientX + 15;
    let y = event.clientY + 15;

    // 检查右边界
    if (x + tooltipWidth > viewportWidth) {
      // 如果右侧空间不足，放在鼠标左侧
      x = event.clientX - tooltipWidth - 5;
    }

    // 检查下边界
    if (y + tooltipHeight > viewportHeight) {
      // 如果下方空间不足，放在鼠标上方
      y = event.clientY - tooltipHeight - 5;
    }

    // 确保不超出左上边界
    x = Math.max(5, x);
    y = Math.max(5, y);

    // 设置最终位置
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  // 隐藏提示框
  function hideTooltip() {
    const tooltip = document.getElementById("tooltip");
    tooltip.style.display = "none";
  }

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

  // 删除项目
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
          document.querySelectorAll(".list-item").forEach((el) => {
            el.classList.remove("drop-target");
          });

          // 添加指示器并保存放置位置信息
          if (isBelow) {
            if (item.nextSibling !== indicator) {
              item.after(indicator);
            }
            dropPosition = { target: item, position: "after" };
          } else {
            if (item.previousSibling !== indicator) {
              item.before(indicator);
            }
            dropPosition = { target: item, position: "before" };
          }
          indicator.style.display = "block";
        }
      });
    });

    // 为列表容器添加 dragover 事件以实现自动滚动
    listContainer.addEventListener("dragover", (e) => {
      e.preventDefault();

      if (!draggedItem) return;

      // 获取列表容器的位置信息
      const containerRect = listContainer.getBoundingClientRect();
      const containerTop = containerRect.top;
      const containerBottom = containerRect.bottom;
      const mouseY = e.clientY;

      // 计算鼠标与容器上下边缘的距离
      const distanceFromTop = mouseY - containerTop;
      const distanceFromBottom = containerBottom - mouseY;

      // 停止现有的自动滚动
      stopAutoScroll();

      // 根据鼠标位置设置自动滚动
      if (distanceFromTop < SCROLL_THRESHOLD) {
        // 鼠标接近顶部，向上滚动
        autoScrollInterval = setInterval(() => {
          listContainer.scrollTop -= SCROLL_SPEED;
        }, 16); // 约60fps的速率
      } else if (distanceFromBottom < SCROLL_THRESHOLD) {
        // 鼠标接近底部，向下滚动
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
        const items = JSON.parse(localStorage.getItem("cachedItems") || "[]");
        const [removed] = items.splice(draggedIndex, 1);
        items.splice(newIndex, 0, removed);

        // 更新后端存储
        const result = await window.electronAPI.updateItemsOrder(items);
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
    items[nextIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // 应用主题
  function applyTheme(theme) {
    const appContainer = document.querySelector(".app-container");

    // 移除所有主题类
    appContainer.classList.remove("dark-theme", "light-theme");

    if (theme === "system") {
      applySystemTheme();
    } else if (theme === "dark") {
      appContainer.classList.add("dark-theme");
    } else if (theme === "light") {
      appContainer.classList.add("light-theme");
    }
  }

  // 应用系统主题
  function applySystemTheme() {
    const isDarkMode =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const appContainer = document.querySelector(".app-container");

    if (isDarkMode) {
      appContainer.classList.add("dark-theme");
    } else {
      appContainer.classList.remove("dark-theme");
    }
  }

  // 把loadItems和removeItem函数暴露到全局，供其他脚本使用
  window.appFunctions = {
    loadItems,
    removeItem,
    showToast,
    updatePageTexts, // 额外暴露文本更新函数，供其他脚本使用
  };
});
