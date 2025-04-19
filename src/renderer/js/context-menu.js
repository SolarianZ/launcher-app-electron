/**
 * 右键菜单处理模块
 * 负责为不同类型的项目创建上下文菜单
 * 实现复制、编辑、移除等项目操作
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 导入i18n模块
    const i18n = window.electronAPI.i18n;
    
    /**
     * 创建右键菜单
     * 根据项目类型创建不同的上下文菜单
     * @param {number} x 菜单显示的X坐标
     * @param {number} y 菜单显示的Y坐标
     * @param {Object} item 项目对象
     * @param {number} index 项目在列表中的索引
     */
    async function createContextMenu(x, y, item, index) {
        // 移除任何现有的上下文菜单
        removeContextMenu();

        // 创建新的上下文菜单
        const contextMenu = document.createElement('div');
        contextMenu.classList.add('context-menu');
        contextMenu.id = 'context-menu';

        // 先将菜单添加到文档中但不设置位置，以便我们可以测量其尺寸
        document.body.appendChild(contextMenu);

        // 根据项目类型添加不同的菜单项
        switch (item.type) {
            case 'file':
            case 'folder':
                await createFileOrFolderMenu(contextMenu, item, index);
                break;
            case 'url':
                await createUrlMenu(contextMenu, item, index);
                break;
            case 'command':
                await createCommandMenu(contextMenu, item, index);
                break;
        }

        // 计算菜单位置，确保在可视区域内
        adjustMenuPosition(contextMenu, x, y);

        // 点击文档其他区域时隐藏菜单
        // 使用setTimeout避免当前点击事件立即触发关闭
        setTimeout(() => {
            document.addEventListener('click', removeContextMenu);
        }, 0);
    }

    /**
     * 调整菜单位置，确保在可视区域内
     * 处理屏幕边缘情况，避免菜单显示不全
     * @param {HTMLElement} menu 菜单DOM元素
     * @param {number} x 初始X坐标
     * @param {number} y 初始Y坐标
     */
    function adjustMenuPosition(menu, x, y) {
        // 获取菜单尺寸
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;

        // 获取可视区域尺寸
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 计算菜单右下角坐标
        let rightEdge = x + menuWidth;
        let bottomEdge = y + menuHeight;

        // 调整 X 坐标，确保不超出右边界
        if (rightEdge > viewportWidth) {
            x = viewportWidth - menuWidth - 5; // 5px 边距
        }

        // 调整 Y 坐标，确保不超出下边界
        if (bottomEdge > viewportHeight) {
            y = viewportHeight - menuHeight - 5; // 5px 边距
        }

        // 确保不超出左上边界
        x = Math.max(5, x);
        y = Math.max(5, y);

        // 设置菜单位置
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
    }

    /**
     * 为文件或文件夹类型创建上下文菜单
     * @param {HTMLElement} menu 菜单DOM元素
     * @param {Object} item 项目对象
     * @param {number} index 项目索引
     */
    async function createFileOrFolderMenu(menu, item, index) {
        // 打开选项
        await addMenuItem(menu, await i18n.t('context-open'), () => {
            window.electronAPI.openItem(item);
        });

        // 仅文件项显示"在文件夹中显示"选项
        if (item.type === 'file') {
            await addMenuItem(menu, await i18n.t('context-show-in-folder'), () => {
                window.electronAPI.showItemInFolder(item.path);
            });
        }

        // 分隔线
        addMenuDivider(menu);

        // 复制选项组
        await addMenuItem(menu, await i18n.t('context-copy-path'), () => {
            window.electronAPI.copyText(item.path);
        });

        await addMenuItem(menu, await i18n.t('context-copy-name'), () => {
            const name = item.path.split('/').pop().split('\\').pop();
            window.electronAPI.copyText(name);
        });

        // 分隔线
        addMenuDivider(menu);

        // 编辑选项
        await addMenuItem(menu, await i18n.t('context-edit'), () => {
            window.electronAPI.showEditItemDialog(item, index);
        });

        // 移除选项
        await addMenuItem(menu, await i18n.t('context-remove'), async () => {
            await window.electronAPI.removeItem(index);
            await window.appFunctions.loadItems();
        });
    }

    /**
     * 创建URL菜单
     * @param {HTMLElement} menu 菜单容器元素
     * @param {Object} item 项目对象
     * @param {number} index 项目索引
     */
    async function createUrlMenu(menu, item, index) {
        // 打开选项
        await addMenuItem(menu, await i18n.t('context-open'), () => {
            window.electronAPI.openItem(item);
        });

        // 分隔线
        addMenuDivider(menu);

        // 复制选项
        await addMenuItem(menu, await i18n.t('context-copy'), () => {
            window.electronAPI.copyText(item.path);
        });

        // 分隔线
        addMenuDivider(menu);

        // 编辑选项
        await addMenuItem(menu, await i18n.t('context-edit'), () => {
            window.electronAPI.showEditItemDialog(item, index);
        });

        // 移除选项
        await addMenuItem(menu, await i18n.t('context-remove'), async () => {
            await window.electronAPI.removeItem(index);
            await window.appFunctions.loadItems();
        });
    }

    /**
     * 创建命令菜单
     * @param {HTMLElement} menu 菜单容器元素
     * @param {Object} item 项目对象
     * @param {number} index 项目索引
     */
    async function createCommandMenu(menu, item, index) {
        // 执行选项
        await addMenuItem(menu, await i18n.t('context-execute'), () => {
            window.electronAPI.openItem(item);
        });

        // 分隔线
        addMenuDivider(menu);

        // 复制选项
        await addMenuItem(menu, await i18n.t('context-copy'), () => {
            window.electronAPI.copyText(item.path);
        });

        // 分隔线
        addMenuDivider(menu);

        // 编辑选项
        await addMenuItem(menu, await i18n.t('context-edit'), () => {
            window.electronAPI.showEditItemDialog(item, index);
        });

        // 移除选项
        await addMenuItem(menu, await i18n.t('context-remove'), async () => {
            await window.electronAPI.removeItem(index);
            await window.appFunctions.loadItems();
        });
    }

    /**
     * 添加菜单项
     * @param {HTMLElement} menu 菜单容器元素
     * @param {string} text 菜单项文本
     * @param {Function} onClick 点击回调函数
     */
    async function addMenuItem(menu, text, onClick) {
        const menuItem = document.createElement('div');
        menuItem.classList.add('menu-item');
        menuItem.textContent = text;
        menuItem.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
            removeContextMenu();
        });
        menu.appendChild(menuItem);
    }

    /**
     * 添加菜单分隔线
     * @param {HTMLElement} menu 菜单容器元素
     */
    function addMenuDivider(menu) {
        const divider = document.createElement('div');
        divider.classList.add('menu-divider');
        menu.appendChild(divider);
    }

    /**
     * 移除上下文菜单
     * 从文档中移除现有的上下文菜单
     */
    function removeContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu) {
            contextMenu.remove();
            document.removeEventListener('click', removeContextMenu);
        }
    }

    /**
     * 设置列表项的右键菜单
     * 为列表容器添加右键菜单事件监听
     */
    function setupContextMenu() {
        const listContainer = document.getElementById('list-container');

        listContainer.addEventListener('contextmenu', async (e) => {
            const listItem = e.target.closest('.list-item');
            if (listItem) {
                e.preventDefault();

                // 获取项目数据
                const index = parseInt(listItem.dataset.index);
                const items = JSON.parse(localStorage.getItem('cachedItems') || '[]');

                // 显示上下文菜单
                await createContextMenu(e.clientX, e.clientY, items[index], index);

                // 激活选中项
                document.querySelectorAll('.list-item.active').forEach(el => el.classList.remove('active'));
                listItem.classList.add('active');
            }
        });
    }
    
    /**
     * 语言更新处理
     * 监听语言变化事件，以便在语言改变时更新菜单文本
     */
    window.electronAPI.onLanguageChanged((language) => {
        // 如果菜单已打开，会在下次打开时使用新语言
        console.log("上下文菜单语言已更新:", language);
    });

    // 设置右键菜单
    setupContextMenu();
});