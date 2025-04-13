const { shell, clipboard } = require("electron");
const fs = require("fs");
const { exec } = require("child_process");
const { PathType } = require("../shared/defines");

/**
 * 处理项目动作（打开文件、文件夹、URL或执行命令）
 * @param {Object} item 要处理的项目对象
 */
function handleItemAction(item) {
  switch (item.type) {
    case PathType.FILE:
    case PathType.FOLDER:
      shell.openPath(item.path);
      break;
    case PathType.URL:
      shell.openExternal(item.path);
      break;
    case PathType.COMMAND:
      executeCommand(item.path);
      break;
  }
}

/**
 * 安全执行命令
 * @param {string} command 要执行的命令
 */
function executeCommand(command) {
  // 根据平台打开终端窗口执行命令
  const platform = process.platform;
  try {
    if (platform === "win32") {
      // Windows - 使用 start cmd 打开命令窗口并执行命令
      if (/^\/[KC]/i.test(command)) {
        // 若已经包含 /K 或 /C 则直接执行
        exec(`start cmd ${command}`);
      } else {
        exec(`start cmd /K "${command}"`); // 使用引号包裹命令，防止注入
      }
    } else if (platform === "darwin") {
      // macOS - 使用 osascript 打开 Terminal 并执行命令
      const escapedCommand = command.replace(/"/g, '\\"').replace(/'/g, "'\\''");
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

      // 安全处理命令
      const escapedCommand = command.replace(/"/g, '\\"').replace(/'/g, "'\\''");

      // 尝试所有可能的终端，直到一个成功
      tryNextTerminal(terminals, 0, escapedCommand);
    }
  } catch (error) {
    console.error("执行命令出错:", error);
  }
}

/**
 * 递归尝试不同的Linux终端
 * @param {Array} terminals 终端命令列表
 * @param {number} index 当前尝试的索引
 * @param {string} command 要执行的命令
 */
function tryNextTerminal(terminals, index, command) {
  if (index >= terminals.length) {
    console.error("无法找到可用的终端");
    return;
  }

  // 替换命令
  const terminalCmd = terminals[index].replace("{CMD}", command);
  
  exec(terminalCmd, (error) => {
    if (error) {
      console.warn(`终端 ${index + 1}/${terminals.length} 失败，尝试下一个...`);
      // 递归尝试下一个终端
      tryNextTerminal(terminals, index + 1, command);
    }
  });
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
    clipboard.writeBuffer("FileContents", content);
    return true;
  } catch (error) {
    console.error("复制文件错误:", error);
    return false;
  }
}

/**
 * 判断项目类型（文件、文件夹、URL或命令）
 * @param {string} path 路径或URL
 * @returns {string} 项目类型
 */
function getItemType(path) {
  if (!path || typeof path !== "string") {
    return undefined;
  }

  // 判断是否是文件或文件夹
  const fileExists = fs.existsSync(path);
  if (fileExists) {
    const stats = fs.statSync(path);
    if (stats.isDirectory()) {
      return PathType.FOLDER;
    }

    if (stats.isFile()) {
      return PathType.FILE;
    }

    // 其他类型的文件（如socket等）暂不处理
    return undefined;
  }

  // 判断是否是标准协议URL和自定义协议deep link
  // 匹配如http://, https://, ftp://, app://, myapp://等协议格式
  const protocolRegex = /^[a-z][a-z0-9+.-]*:\/\//i;
  // 匹配标准域名格式 (包括www开头和不带www的域名)
  const domainRegex =
    /^([a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,})(:[0-9]{1,5})?(\/.*)?$/i;
  const isUrl = protocolRegex.test(path) || domainRegex.test(path);
  if (isUrl) {
    return PathType.URL;
  }

  // 不是URL也不是文件/文件夹，则认为是命令
  return PathType.COMMAND;
}

// 导出模块函数
module.exports = {
  handleItemAction,
  showItemInFolder,
  copyText,
  copyFile,
  getItemType,
};
