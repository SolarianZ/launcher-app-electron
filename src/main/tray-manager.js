/**
 * 托盘管理模块
 * 负责创建和管理系统托盘图标、托盘菜单
 * 处理不同平台(Windows, macOS, Linux)下的托盘特性差异
 */
const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

// 全局托盘引用 - 防止被垃圾回收
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

  /**
   * 托盘图标路径
   * 根据平台选择不同的图标处理方式
   * 托盘图标建议尺寸:
   * - Windows: 16x16 或 32x32 像素(建议32x32以适应高DPI屏幕)
   * - macOS: 16x16 或 18x18 像素
   * - Linux: 根据桌面环境有所不同，通常22x22像素
   */
  const iconPath = path.join(
    __dirname,
    '..',
    'assets',
    'icons',
    'tray-icon.png'
  );

  let icon = nativeImage.createFromPath(iconPath);

  if (process.platform === 'darwin') {
    /**
     * macOS平台特定处理
     * 1. 调整图标大小至18x18像素以适合macOS菜单栏
     * 2. 设置为模板图像(templateImage)以适应深色和浅色模式
     *    模板图像应为单色透明PNG，macOS会自动处理颜色
     */
    const macSize = { width: 18, height: 18 };
    icon = icon.resize(macSize);
    // 设置为模板图像，让macOS自动处理明暗主题
    icon.setTemplateImage(true);
  }

  // 创建托盘实例
  tray = new Tray(icon);
  tray.setToolTip('Launcher');

  /**
   * 设置托盘点击行为
   * 注意: 在Linux平台上通常只响应右击显示菜单，此处点击事件在某些发行版可能无效
   * 在Windows和macOS上，点击托盘图标可以切换主窗口显示状态
   */
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

  // 只显示最近的8个项目，防止菜单过长
  const recentItems = items.slice(0, 8).map((item) => {
    return {
      label: item.name || item.path,
      click: () => handleItemAction(item),
    };
  });

  /**
   * 创建托盘上下文菜单
   * 菜单项中的快捷键在平台间可能有差异:
   * - macOS: Command键使用 cmd
   * - Windows/Linux: Control键使用 ctrl
   */
  const contextMenu = Menu.buildFromTemplate([
    ...recentItems,
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        // 设置标志，表示用户明确要求退出应用
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  // 设置托盘的上下文菜单
  tray.setContextMenu(contextMenu);
}

/**
 * 销毁托盘图标
 * 在应用退出前调用，释放系统资源
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