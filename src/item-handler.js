const { shell, clipboard } = require('electron');
const fs = require('fs');
const { exec } = require('child_process');

/**
 * 处理项目动作（打开文件、文件夹、URL或执行命令）
 * @param {Object} item 要处理的项目对象
 */
function handleItemAction(item) {
  switch (item.type) {
    case 'file':
    case 'folder':
      shell.openPath(item.path);
      break;
    case 'url':
      shell.openExternal(item.path);
      break;
    case 'command':
      executeCommand(item.path);
      break;
  }
}

/**
 * 根据不同平台执行命令
 * @param {string} command 要执行的命令
 */
function executeCommand(command) {
  // 根据平台打开终端窗口执行命令
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      // Windows - 使用 start cmd 打开命令窗口并执行命令
      if (/^\/[KC]/i.test(command)) {
        // 若已经包含 /K 或 /C 则直接执行
        exec(`start cmd ${command}`);
      } else {
        exec(`start cmd /K ${command}`); // 否则使用 /K 执行命令（保持CMD窗口打开）
      }
    } else if (platform === 'darwin') {
      // macOS - 使用 osascript 打开 Terminal 并执行命令
      const escapedCommand = command.replace(/"/g, '\\"');
      exec(
        `osascript -e 'tell app "Terminal" to do script "${escapedCommand}"'`
      );
    } else {
      // Linux - 尝试打开各种常见终端
      const terminals = [
        'gnome-terminal -- bash -c "{CMD}; exec bash"',
        'konsole --noclose -e bash -c "{CMD}"',
        'xterm -hold -e bash -c "{CMD}"',
        'x-terminal-emulator -e bash -c "{CMD}; exec bash"',
      ];

      // 替换命令
      const command = terminals[0].replace(
        '{CMD}',
        command.replace(/"/g, '\\"')
      );
      exec(command, (error) => {
        if (error) {
          console.error('打开终端失败，尝试其他终端');
          // 如果失败可以尝试其他终端，但为简化代码，此处不实现
        }
      });
    }
  } catch (error) {
    console.error('执行命令出错:', error);
  }
}

/**
 * 在文件夹中显示项目
 * @param {string} path 文件路径
 */
function showItemInFolder(path) {
  shell.showItemInFolder(path);
}

/**
 * 复制文本到剪贴板
 * @param {string} text 要复制的文本
 */
function copyText(text) {
  clipboard.writeText(text);
}

/**
 * 复制文件内容到剪贴板
 * @param {string} path 文件路径
 * @returns {boolean} 是否复制成功
 */
function copyFile(path) {
  try {
    if (fs.statSync(path).isDirectory()) {
      // 目录不能直接复制
      return false;
    }

    // 读取文件并存入剪贴板
    const content = fs.readFileSync(path);
    clipboard.writeBuffer('FileContents', content);
    return true;
  } catch (error) {
    console.error('复制文件错误:', error);
    return false;
  }
}

/**
 * 判断项目类型（文件、文件夹、URL或命令）
 * @param {string} path 路径或URL
 * @returns {string} 项目类型
 */
function getItemType(path) {
  if (!path || typeof path !== 'string') {
    console.warn('Invalid path provided to getItemType:', path);
    return 'unknown'; // 返回一个默认类型
  }

  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.includes('://')
  ) {
    return 'url';
  }

  try {
    const stats = fs.statSync(path);
    return stats.isDirectory() ? 'folder' : 'file';
  } catch (error) {
    // 不是URL也不是文件/文件夹，则认为是命令
    return 'command';
  }
}

// 导出模块函数
module.exports = {
  handleItemAction,
  showItemInFolder,
  copyText,
  copyFile,
  getItemType
};