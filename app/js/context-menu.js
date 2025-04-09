document.addEventListener('DOMContentLoaded', () => {
    // 创建右键菜单
    function createContextMenu(x, y, item, index) {
        // 移除任何现有的上下文菜单
        removeContextMenu();

        // 创建新的上下文菜单
        const contextMenu = document.createElement('div');
        contextMenu.classList.add('context-menu');
        contextMenu.id = 'context-menu';

        // 先将菜单添加到文档中但不设置位置，以便我们可以测量其尺寸
        document.body.appendChild(contextMenu);

        // 根据项目类型添加菜单项
        switch (item.type) {
            case 'file':
            case 'folder':
                createFileOrFolderMenu(contextMenu, item, index);
                break;
            case 'url':
                createUrlMenu(contextMenu, item, index);
                break;
            case 'command':
                createCommandMenu(contextMenu, item, index);
                break;
        }

        // 计算菜单位置，确保在可视区域内
        adjustMenuPosition(contextMenu, x, y);

        // 点击文档其他区域时隐藏菜单
        setTimeout(() => {
            document.addEventListener('click', removeContextMenu);
        }, 0);
    }

    // 调整菜单位置，确保在可视区域内
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

    // 创建文件或文件夹菜单
    function createFileOrFolderMenu(menu, item, index) {
        // 打开选项
        addMenuItem(menu, '打开', () => {
            window.electronAPI.openItem(item);
        });

        // 仅文件项显示"在文件夹中显示"
        if (item.type === 'file') {
            addMenuItem(menu, '在文件夹中显示', () => {
                window.electronAPI.showItemInFolder(item.path);
            });
        }

        // 分隔线
        addMenuDivider(menu);

        // 复制选项
        addMenuItem(menu, '复制路径', () => {
            window.electronAPI.copyText(item.path);
        });

        addMenuItem(menu, '复制名字', () => {
            const name = item.path.split('/').pop().split('\\').pop();
            window.electronAPI.copyText(name);
        });

        addMenuItem(menu, '复制资产', () => {
            window.electronAPI.copyFile(item.path);
        });

        // 分隔线
        addMenuDivider(menu);

        // 编辑选项
        addMenuItem(menu, '编辑', () => {
            window.electronAPI.showEditItemDialog(item, index);
        });

        // 移除选项
        addMenuItem(menu, '移除', async () => {
            await window.electronAPI.removeItem(index);
            await window.appFunctions.loadItems();
        });
    }

    // 创建URL菜单
    function createUrlMenu(menu, item, index) {
        // 打开选项
        addMenuItem(menu, '打开', () => {
            window.electronAPI.openItem(item);
        });

        // 分隔线
        addMenuDivider(menu);

        // 复制选项
        addMenuItem(menu, '复制', () => {
            window.electronAPI.copyText(item.path);
        });

        // 分隔线
        addMenuDivider(menu);

        // 编辑选项
        addMenuItem(menu, '编辑', () => {
            window.electronAPI.showEditItemDialog(item, index);
        });

        // 移除选项
        addMenuItem(menu, '移除', async () => {
            await window.electronAPI.removeItem(index);
            await window.appFunctions.loadItems();
        });
    }

    // 创建命令菜单
    function createCommandMenu(menu, item, index) {
        // 执行选项
        addMenuItem(menu, '执行', () => {
            window.electronAPI.openItem(item);
        });

        // 分隔线
        addMenuDivider(menu);

        // 复制选项
        addMenuItem(menu, '复制', () => {
            window.electronAPI.copyText(item.path);
        });

        // 分隔线
        addMenuDivider(menu);

        // 编辑选项
        addMenuItem(menu, '编辑', () => {
            window.electronAPI.showEditItemDialog(item, index);
        });

        // 移除选项
        addMenuItem(menu, '移除', async () => {
            await window.electronAPI.removeItem(index);
            await window.appFunctions.loadItems();
        });
    }

    // 添加菜单项
    function addMenuItem(menu, text, onClick) {
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

    // 添加菜单分隔线
    function addMenuDivider(menu) {
        const divider = document.createElement('div');
        divider.classList.add('menu-divider');
        menu.appendChild(divider);
    }

    // 移除上下文菜单
    function removeContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu) {
            contextMenu.remove();
            document.removeEventListener('click', removeContextMenu);
        }
    }

    // 设置列表项的右键菜单
    function setupContextMenu() {
        const listContainer = document.getElementById('list-container');

        listContainer.addEventListener('contextmenu', (e) => {
            const listItem = e.target.closest('.list-item');
            if (listItem) {
                e.preventDefault();

                // 获取项目数据
                const index = parseInt(listItem.dataset.index);
                const items = JSON.parse(localStorage.getItem('cachedItems') || '[]');

                // 显示上下文菜单
                createContextMenu(e.clientX, e.clientY, items[index], index);

                // 激活选中项
                document.querySelectorAll('.list-item.active').forEach(el => el.classList.remove('active'));
                listItem.classList.add('active');
            }
        });
    }

    // 设置右键菜单
    setupContextMenu();
});