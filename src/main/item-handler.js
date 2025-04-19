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
      // URL处理逻辑
      let urlToOpen = item.path;

      // 匹配任何协议前缀 (http://, https://, mailto:, tel:, app: 等)
      const protocolRegex = /^[a-z][a-z0-9+.-]*:(?:\/\/)?/i;
      // 匹配标准域名格式 (example.com, www.example.com 等)
      const domainRegex = /^([a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,})(:[0-9]{1,5})?(\/.*)?$/i;

      // 只有当URL没有协议前缀，但符合标准域名格式时才添加https://
      if (!protocolRegex.test(urlToOpen) && domainRegex.test(urlToOpen)) {
        urlToOpen = `https://${urlToOpen}`;
      }

      shell.openExternal(urlToOpen);
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
  // 根据平台打开终端窗口执行命令，使用引号包裹命令，防止注入
  const platform = process.platform;

  // 确保工作目录存在
  const tmpDir = os.tmpdir();
  const workDir = path.join(tmpDir, "launcher-app-temp");

  // 创建工作目录（如果不存在）
  if (!fs.existsSync(workDir)) {
    try {
      fs.mkdirSync(workDir, { recursive: true });
    } catch (error) {
      console.error("创建工作目录失败:", error);
    }
  }

  try {
    if (platform === "win32") {
      executeCommandForWindows(command, workDir);
    } else if (platform === "darwin") {
      executeCommandForMac(command, workDir);
    } else {
      executeCommandForLinux(command, workDir);
    }
  } catch (error) {
    console.error("执行命令出错:", error);
  }
}

/* Windows平台特定代码
* 使用CMD执行命令：
* 1. /K - 执行命令后保持窗口打开
* 2. /C - 执行命令后关闭窗口
* 3. 使用detached和unref，避免CMD窗口关闭时Launcher被关闭
*/
function executeCommandForWindows(command, workDir) {
  const execOptions = {
    windowsHide: false,
    detached: true,
    shell: true,
  };

  if (command.includes("\n")) {
    // 处理多行命令：创建临时批处理文件
    const batchFile = path.join(workDir, `launcher-cmd-${Date.now()}.bat`);

    // 写入批处理文件
    fs.writeFileSync(batchFile, `cd /d "${workDir}"\n${command}`, 'utf8');

    // 执行批处理文件
    const child = exec(`start cmd /K "${batchFile}"`, execOptions);
    child.unref();
  } else if (/^\/[KC]/i.test(command)) {
    // 命令自带 /K 或 /C 参数的情况

    // 提取开头的 /K 或 /C 及可能跟随的空格
    const cmdPrefix = command.match(/^\/[KC]\s*/i)[0];
    // 获取实际的命令部分
    const actualCommand = command.substring(cmdPrefix.length);

    // 构建新命令: start cmd /K(或/C) "cd /d 工作目录 && 实际命令"
    const newCommand = `start cmd ${cmdPrefix}"cd /d "${workDir}" && ${actualCommand}"`;

    const child = exec(newCommand, execOptions);
    child.unref();
  } else {
    // 默认使用 /K 模式保持窗口打开
    const child = exec(`start cmd /K "cd /d "${workDir}" && ${command}"`, execOptions);
    child.unref();
  }
}

/**
 * macOS平台执行命令
 * 使用AppleScript在Terminal中执行命令
 * 转义引号以防止命令注入攻击
 */
function executeCommandForMac(command, workDir) {
  if (command.includes("\n")) {
    // 处理多行命令：创建临时脚本文件
    const scriptFile = path.join(workDir, `launcher-cmd-${Date.now()}.sh`);

    // 写入脚本文件并添加执行权限
    fs.writeFileSync(scriptFile, `#!/bin/bash\ncd "${workDir}"\n${command}`, 'utf8');
    fs.chmodSync(scriptFile, '755');

    // 正确转义路径中的特殊字符，防止AppleScript执行时出错
    const escapedPath = scriptFile
      .replace(/\\/g, '\\\\')  // 转义反斜杠
      .replace(/"/g, '\\"')    // 转义双引号
      .replace(/'/g, "'\\''"); // 转义单引号

    exec(
      `osascript -e 'tell app "Terminal" to do script "${escapedPath}"'`
    );
  } else {
    // 更安全的转义处理
    // 首先转义工作目录路径中的特殊字符
    const escapedWorkDir = workDir
      .replace(/\\/g, '\\\\')  // 转义反斜杠
      .replace(/"/g, '\\"')    // 转义双引号
      .replace(/'/g, "'\\''"); // 转义单引号

    // 然后转义命令中的特殊字符
    const escapedCommand = command
      .replace(/\\/g, '\\\\')  // 转义反斜杠
      .replace(/"/g, '\\"')    // 转义双引号
      .replace(/'/g, "'\\''"); // 转义单引号

    // 构建完整的AppleScript命令，确保命令能在Terminal中正确执行
    exec(
      `osascript -e 'tell app "Terminal" to do script "cd \\"${escapedWorkDir}\\" && ${escapedCommand}"'`
    );
  }
}

/**
 * Linux平台执行命令
 * Linux有多种不同的终端模拟器，需要尝试多种终端
 */
function executeCommandForLinux(command, workDir) {
  if (command.includes("\n")) {
    // 处理多行命令：创建临时脚本文件
    const scriptFile = path.join(workDir, `launcher-cmd-${Date.now()}.sh`);

    // 写入脚本文件并添加执行权限
    fs.writeFileSync(scriptFile, `#!/bin/bash\ncd "${workDir}"\n${command}`, 'utf8');
    fs.chmodSync(scriptFile, '755');

    // 构建不同终端执行脚本的命令列表
    const terminals = [
      `gnome-terminal -- bash -c "${scriptFile}; exec bash"`,
      `konsole --noclose -e bash -c "${scriptFile}"`,
      `xterm -hold -e ${scriptFile}`,
      `x-terminal-emulator -e ${scriptFile}`
    ];

    // 尝试所有可能的终端，直到一个成功
    // 传递空字符串作为命令，因为命令已经包含在脚本文件中
    tryNextLinuxTerminal(terminals, 0, "", "");
  } else {
    const terminals = [
      'gnome-terminal -- bash -c "cd \\"{WORKDIR}\\" && {CMD}; exec bash"',  // GNOME桌面环境
      'konsole --noclose -e bash -c "cd \\"{WORKDIR}\\" && {CMD}"',          // KDE桌面环境
      'xterm -hold -e bash -c "cd \\"{WORKDIR}\\" && {CMD}"',                // 通用X终端
      'x-terminal-emulator -e bash -c "cd \\"{WORKDIR}\\" && {CMD}; exec bash"', // Debian/Ubuntu默认终端
    ];

    // 安全处理命令，转义引号以防止命令注入
    const escapedCommand = command
      .replace(/\\/g, '\\\\')  // 转义反斜杠
      .replace(/"/g, '\\"')    // 转义双引号
      .replace(/'/g, "'\\''"); // 转义单引号

    const escapedWorkDir = workDir
      .replace(/\\/g, '\\\\')  // 转义反斜杠
      .replace(/"/g, '\\"')    // 转义双引号
      .replace(/'/g, "'\\''"); // 转义单引号

    // 尝试所有可能的终端，直到一个成功
    tryNextLinuxTerminal(terminals, 0, escapedCommand, escapedWorkDir);
  }
}

/**
 * 递归尝试不同的Linux终端
 * @param {Array} terminals 终端命令列表
 * @param {number} index 当前尝试的索引
 * @param {string} command 要执行的命令
 * @param {string} workDir 工作目录路径
 */
function tryNextLinuxTerminal(terminals, index, command, workDir = "") {
  if (index >= terminals.length) {
    console.error("无法找到可用的终端");
    return;
  }

  // 替换命令模板中的{CMD}和{WORKDIR}为实际值
  let terminalCmd = terminals[index].replace("{CMD}", command);
  if (workDir) {
    terminalCmd = terminalCmd.replace("{WORKDIR}", workDir);
  }

  exec(terminalCmd, (error) => {
    if (error) {
      console.warn(`终端 ${index + 1}/${terminals.length} 失败，尝试下一个...`);
      // 递归尝试下一个终端
      tryNextLinuxTerminal(terminals, index + 1, command, workDir);
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
  getItemType,
};
