document.addEventListener('DOMContentLoaded', () => {
    // 当主脚本加载完成后，会在window.appFunctions中暴露loadItems方法

    // 此脚本主要处理列表相关的杂项功能，大部分功能已在renderer.js中实现

    // 如果存在全局配置数据，则加载
    const loadGlobalConfig = () => {
        try {
            const config = JSON.parse(localStorage.getItem('appConfig') || '{}');

            // 应用主题偏好，如果存在
            if (config.theme) {
                const container = document.querySelector('.app-container');
                if (config.theme === 'dark') {
                    container.classList.add('dark-theme');
                } else if (config.theme === 'light') {
                    container.classList.remove('dark-theme');
                }
            }
        } catch (error) {
            console.error('加载配置错误:', error);
        }
    };

    // 监听列表变化，保持选中状态
    const observeListChanges = () => {
        // 创建MutationObserver监视列表变化
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // 尝试保持选中状态
                    const selectedPath = localStorage.getItem('selectedItemPath');
                    if (selectedPath) {
                        const items = document.querySelectorAll('.list-item');
                        items.forEach(item => {
                            if (item.dataset.path === selectedPath) {
                                item.classList.add('active');
                            }
                        });
                    }
                }
            }
        });

        // 开始观察列表变化
        const listContainer = document.getElementById('list-container');
        observer.observe(listContainer, { childList: true });
    };

    // 保存选中的项目路径
    document.addEventListener('click', (e) => {
        const listItem = e.target.closest('.list-item');
        if (listItem) {
            localStorage.setItem('selectedItemPath', listItem.dataset.path);
        }
    });

    // 初始化
    loadGlobalConfig();
    observeListChanges();
});