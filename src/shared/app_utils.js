const { app } = require('electron');

/**
 * 更新自启动设置
 * 根据配置更新应用是否开机启动
 * @param {boolean} enabled 是否启用自启动
 */
function updateAutoLaunchSettings(enabled) {
    try {
        app.setLoginItemSettings({
            openAtLogin: enabled,
            openAsHidden: true,
            args: ['--autostart']
        });
        console.log(`Auto launch ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.error('Error setting auto launch:', error);
    }
}

module.exports = {
    updateAutoLaunchSettings
};