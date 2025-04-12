const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

// 全局托盘引用
let tray = null;

/**
 * 创建系统托盘
 * @param {Function} toggleMainWindow 切换主窗口显示的函数
 * @returns {Tray} 创建的托盘对象
 */
function createTray(toggleMainWindow) {
  if (tray) {
    return tray;
  }

  // 根据平台选择不同的图标处理方式
  const iconPath = path.join(
    __dirname,
    '..',
    'app',
    'assets',
    'icons',
    'tray-icon.png'
  );
  
  let icon = nativeImage.createFromPath(iconPath);
  
  if (process.platform === 'darwin') {
    // 确保图标大小适合macOS菜单栏（建议16x16或18x18像素）
    const macSize = { width: 18, height: 18 };
    icon = icon.resize(macSize);
    // 设置为模板图像，让macOS自动处理明暗主题
    icon.setTemplateImage(true);
  }
  
  tray = new Tray(icon);
  tray.setToolTip('Launcher');

  // 点击托盘图标时切换主窗口显示
  tray.on('click', () => {
    toggleMainWindow();
  });

  return tray;
}

/**
 * 更新托盘菜单
 * @param {Array} items 项目列表
 * @param {Function} handleItemAction 处理项目操作的函数
 */
function updateTrayMenu(items, handleItemAction) {
  if (!tray) return;

  const recentItems = items.slice(0, 8).map((item) => {
    return {
      label: item.name || item.path,
      click: () => handleItemAction(item),
    };
  });

  const contextMenu = Menu.buildFromTemplate([
    ...recentItems,
    { type: 'separator' },
    {
      label: '退出',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * 销毁托盘图标
 */
function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

/**
 * 获取托盘引用
 * @returns {Tray} 托盘对象
 */
function getTray() {
  return tray;
}

// 导出模块函数
module.exports = {
  createTray,
  updateTrayMenu,
  destroyTray,
  getTray
};