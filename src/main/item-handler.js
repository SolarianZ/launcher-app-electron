const { shell, clipboard } = require("electron");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const os = require("os");
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
      /**
       * Windows平台特定代码
       * 使用CMD执行命令，有两种模式：
       * 1. /K - 执行命令后保持窗口打开
       * 2. /C - 执行命令后关闭窗口
       */
      if (command.includes("\n")) {
        // 处理多行命令：创建临时批处理文件
        const tmpDir = os.tmpdir();
        const batchFile = path.join(tmpDir, `launcher-cmd-${Date.now()}.bat`);
        
        // 写入批处理文件
        fs.writeFileSync(batchFile, command, 'utf8');
        
        // 执行批处理文件
        exec(`start cmd /K "${batchFile}"`);
      } else if (/^\/[KC]/i.test(command)) {
        // 若已经包含 /K 或 /C 则直接执行
        exec(`start cmd ${command}`);
      } else {
        // 默认使用 /K 模式保持窗口打开
        exec(`start cmd /K "${command}"`); // 使用引号包裹命令，防止注入
      }
    } else if (platform === "darwin") {
      /**
       * macOS平台特定代码
       * 使用AppleScript在Terminal中执行命令
       * 转义引号以防止命令注入攻击
       */
      if (command.includes("\n")) {
        // 处理多行命令：创建临时脚本文件
        const tmpDir = os.tmpdir();
        const scriptFile = path.join(tmpDir, `launcher-cmd-${Date.now()}.sh`);
        
        // 写入脚本文件并添加执行权限
        fs.writeFileSync(scriptFile, command, 'utf8');
        fs.chmodSync(scriptFile, '755');
        
        const escapedPath = scriptFile.replace(/"/g, '\\"').replace(/'/g, "'\\''");
        exec(
          `osascript -e 'tell app "Terminal" to do script "${escapedPath}"'`
        );
      } else {
        const escapedCommand = command.replace(/"/g, '\\"').replace(/'/g, "'\\''");
        exec(
          `osascript -e 'tell app "Terminal" to do script "${escapedCommand}"'`
        );
      }
    } else {
      /**
       * Linux平台特定代码
       * Linux有多种不同的终端模拟器，需要尝试多种终端
       */
      if (command.includes("\n")) {
        // 处理多行命令：创建临时脚本文件
        const tmpDir = os.tmpdir();
        const scriptFile = path.join(tmpDir, `launcher-cmd-${Date.now()}.sh`);
        
        // 写入脚本文件并添加执行权限
        fs.writeFileSync(scriptFile, `#!/bin/bash\n${command}`, 'utf8');
        fs.chmodSync(scriptFile, '755');
        
        const terminals = [
          `gnome-terminal -- bash -c "${scriptFile}; exec bash"`,
          `konsole --noclose -e bash -c "${scriptFile}"`,
          `xterm -hold -e ${scriptFile}`,
          `x-terminal-emulator -e ${scriptFile}`
        ];
        
        // 尝试所有可能的终端，直到一个成功
        tryNextTerminal(terminals, 0, "");
      } else {
        const terminals = [
          'gnome-terminal -- bash -c "{CMD}; exec bash"',  // GNOME桌面环境
          'konsole --noclose -e bash -c "{CMD}"',          // KDE桌面环境
          'xterm -hold -e bash -c "{CMD}"',                // 通用X终端
          'x-terminal-emulator -e bash -c "{CMD}; exec bash"', // Debian/Ubuntu默认终端
        ];

        // 安全处理命令，转义引号以防止命令注入
        const escapedCommand = command.replace(/"/g, '\\"').replace(/'/g, "'\\''");

        // 尝试所有可能的终端，直到一个成功
        tryNextTerminal(terminals, 0, escapedCommand);
      }
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

  // 替换命令模板中的{CMD}为实际命令
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
