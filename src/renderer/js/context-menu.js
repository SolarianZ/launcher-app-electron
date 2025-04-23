/**
 * 上下文菜单脚本
 * 负责在主窗口中创建和管理右键菜单
 */
document.addEventListener("DOMContentLoaded", () => {
    // 引用i18n模块，用于本地化菜单项目
    const i18n = window.electronAPI.i18n;
    
    // 上下文菜单DOM元素
    let contextMenu = null;

    /**
     * 创建上下文菜单
     * 根据不同项目类型创建对应的菜单
     * @param {MouseEvent} e 鼠标事件
     * @param {HTMLElement} target 触发菜单的目标元素
     */
    async function createContextMenu(e, target) {
        // 防止默认事件和事件冒泡
        e.preventDefault();
        e.stopPropagation();

        // 移除可能存在的旧菜单
        removeContextMenu();

        // 确保目标是列表项
        if (!target.classList.contains("list-item")) {
            target = target.closest(".list-item");
        }
        
        if (!target) return;

        // 获取项目数据
        const index = parseInt(target.dataset.index);
        const currentItems = await window.electronAPI.getItems();
        const item = currentItems[index];
        
        if (!item) return;

        // 创建上下文菜单元素
        contextMenu = document.createElement("div");
        contextMenu.className = "context-menu";
        
        // 设置菜单位置
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        
        // 应用当前主题到右键菜单
        const appContainer = document.querySelector(".app-container");
        if (appContainer && appContainer.classList.contains("dark-theme")) {
            contextMenu.classList.add("dark-theme");
        } else if (appContainer && appContainer.classList.contains("light-theme")) {
            contextMenu.classList.add("light-theme");
        }
        
        // 创建常用菜单项目
        const menuItems = await createMenuItems(item, index);
        
        // 将菜单项添加到菜单
        menuItems.forEach(menuItem => {
            contextMenu.appendChild(menuItem);
        });
        
        // 添加菜单到DOM
        document.body.appendChild(contextMenu);
        
        // 确保菜单不超出视窗
        adjustMenuPosition(contextMenu);

        // 高亮显示选中的项目
        document.querySelectorAll(".list-item.active").forEach(el => {
            el.classList.remove("active");
        });
        target.classList.add("active");

        // 添加点击事件监听器，点击外部关闭菜单
        setTimeout(() => {
            document.addEventListener("click", handleDocumentClick);
        }, 0);
    }

    /**
     * 根据项目类型创建对应的菜单项
     * @param {Object} item 项目对象
     * @param {number} index 项目索引
     * @returns {HTMLElement[]} 菜单项元素数组
     */
    async function createMenuItems(item, index) {
        const menuItems = [];
        
        // 打开项目
        const openItem = document.createElement("div");
        openItem.className = "menu-item";
        // TODO : 脚本文件的右键菜单改为“执行”，unix平台可能要检测文件是否有执行权限
        openItem.textContent = await i18n.t("open");
        openItem.addEventListener("click", () => {
            window.electronAPI.openItem(item);
            removeContextMenu(); // 点击后关闭菜单
        });
        menuItems.push(openItem);
        
        // 根据项目类型添加特定菜单项
        if (item.type === "file" || item.type === "folder") {
            // 在文件夹中显示
            const showInFolder = document.createElement("div");
            showInFolder.className = "menu-item";
            showInFolder.textContent = await i18n.t("show-in-folder");
            showInFolder.addEventListener("click", () => {
                window.electronAPI.showItemInFolder(item.path);
                removeContextMenu(); // 点击后关闭菜单
            });
            menuItems.push(showInFolder);
        }
        
        // 复制路径
        const copyPath = document.createElement("div");
        copyPath.className = "menu-item";
        copyPath.textContent = await i18n.t("copy-path");
        copyPath.addEventListener("click", () => {
            window.electronAPI.copyText(item.path);
            // 显示成功提示
            if (window.appFunctions && window.appFunctions.showToast) {
                window.appFunctions.showToast(i18n.t("path-copied"));
            }
            removeContextMenu(); // 点击后关闭菜单
        });
        menuItems.push(copyPath);
        
        // 分隔线
        const divider = document.createElement("div");
        divider.className = "menu-divider";
        menuItems.push(divider);
        
        // 编辑项目
        const editItem = document.createElement("div");
        editItem.className = "menu-item";
        editItem.textContent = await i18n.t("edit");
        editItem.addEventListener("click", () => {
            window.electronAPI.showEditItemDialog(item, index);
            removeContextMenu(); // 点击后关闭菜单
        });
        menuItems.push(editItem);
        
        // 删除项目
        const removeItem = document.createElement("div");
        removeItem.className = "menu-item";
        removeItem.textContent = await i18n.t("remove");
        removeItem.addEventListener("click", () => {
            if (window.appFunctions && window.appFunctions.removeItem) {
                window.appFunctions.removeItem(index);
            }
            removeContextMenu(); // 点击后关闭菜单
        });
        menuItems.push(removeItem);
        
        return menuItems;
    }
    
    /**
     * 调整菜单位置，确保不超出视窗
     * @param {HTMLElement} menu 菜单元素
     */
    function adjustMenuPosition(menu) {
        const rect = menu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 检查右侧是否超出视窗
        if (rect.right > windowWidth) {
            menu.style.left = `${windowWidth - rect.width - 5}px`;
        }
        
        // 检查底部是否超出视窗
        if (rect.bottom > windowHeight) {
            menu.style.top = `${windowHeight - rect.height - 5}px`;
        }
    }
    
    /**
     * 处理点击事件，关闭上下文菜单
     */
    function handleDocumentClick(e) {
        if (contextMenu && !contextMenu.contains(e.target)) {
            removeContextMenu();
        }
    }
    
    /**
     * 移除上下文菜单
     * 从文档中移除现有的上下文菜单
     */
    function removeContextMenu() {
        if (contextMenu) {
            document.body.removeChild(contextMenu);
            contextMenu = null;
            document.removeEventListener("click", handleDocumentClick);
        }
    }

    /**
     * 设置列表项的右键菜单
     * 为列表容器添加右键菜单事件监听
     */
    function setupContextMenu() {
        const listContainer = document.getElementById("list-container");
        
        if (listContainer) {
            listContainer.addEventListener("contextmenu", (e) => {
                // 查找点击的列表项
                const target = e.target.closest(".list-item");
                if (target) {
                    createContextMenu(e, target);
                }
            });
        }
    }

    // 设置右键菜单
    setupContextMenu();
});