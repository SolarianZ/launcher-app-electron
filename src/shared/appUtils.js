const { app } = require('electron');

/**
 * 更新自启动设置
 * 根据配置更新应用是否开机启动
 * @param {boolean} enabled 是否启用自启动
 */
function updateAutoLaunchSettings(enabled) {
    // 开发环境禁止设置自启动（会导致node_modules中的electron自启）
    if (enabled && !app.isPackaged) {
        console.error('Error enabling auto launch: Auto launch is disabled in development mode.');
        return false;
    }

    try {
        app.setLoginItemSettings({
            openAtLogin: enabled,
            openAsHidden: true,
            args: ['--autostart']
        });
        console.log(`Auto launch ${enabled ? 'enabled' : 'disabled'}`);
        return true;
    } catch (error) {
        console.error('Error setting auto launch:', error);
        return false;
    }
}

module.exports = {
    updateAutoLaunchSettings
};