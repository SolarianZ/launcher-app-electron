const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  clipboard,
  Menu,
  Tray,
  globalShortcut,
  nativeImage,
  webContents,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

// 全局变量
let mainWindow = null;
let addItemWindow = null;
let tray = null;
let dataFilePath = path.join(app.getPath("userData"), "items.json");
let items = [];

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 300,
    minHeight: 300,
    maximizable: false,
    fullscreenable: false,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      height: 30,
      color: "rgba(0, 0, 0, 0)",
      symbolColor: "white",
    },
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "app", "index.html"));
  // mainWindow.webContents.openDevTools();
  
  // 避免白屏
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // 不在任务栏显示
  mainWindow.setSkipTaskbar(true);

  // 处理快捷键
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape") {
      mainWindow.hide();
      event.preventDefault();
    }
  });
}

// 创建添加条目窗口
function createAddItemWindow() {
  if (addItemWindow) {
    addItemWindow.focus();
    return;
  }

  addItemWindow = new BrowserWindow({
    width: 400,
    height: 250,
    resizable: false,
    frame: false,
    modal: true,
    parent: mainWindow,
    show: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  addItemWindow.loadFile(path.join(__dirname, "app", "edit-item.html"));

  addItemWindow.once("ready-to-show", () => {
    addItemWindow.show();
  });

  addItemWindow.on("closed", () => {
    addItemWindow = null;
  });
}

// 创建编辑条目窗口 - 复用添加条目窗口但传入不同参数
function createEditItemWindow(item, index) {
  if (addItemWindow) {
    addItemWindow.focus();
    return;
  }

  addItemWindow = new BrowserWindow({
    width: 400,
    height: 250,
    resizable: false,
    frame: false,
    modal: true,
    parent: mainWindow,
    show: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  addItemWindow.loadFile(path.join(__dirname, "app", "edit-item.html"));

  addItemWindow.once("ready-to-show", () => {
    // 发送编辑数据到窗口
    addItemWindow.webContents.send("edit-item-data", { item, index });
    addItemWindow.show();
  });

  addItemWindow.on("closed", () => {
    addItemWindow = null;
  });
}

// 创建系统托盘
function createTray() {
  // 根据平台选择不同的图标处理方式
  const iconPath = path.join(
    __dirname,
    "app",
    "assets",
    "icons",
    "tray-icon.png"
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
  tray.setToolTip("Launcher");

  updateTrayMenu();

  tray.on("click", () => {
    toggleMainWindow();
  });
}

// 更新托盘菜单
function updateTrayMenu() {
  const recentItems = items.slice(0, 8).map((item) => {
    return {
      label: item.name || item.path,
      click: () => handleItemAction(item),
    };
  });

  const contextMenu = Menu.buildFromTemplate([
    ...recentItems,
    { type: "separator" },
    {
      label: "退出",
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// 注册全局快捷键
function registerGlobalShortcuts() {
  // Shift+Alt+Q 快捷键
  globalShortcut.register("Alt+Shift+Q", () => {
    toggleMainWindow();
  });
}

// 切换主窗口显示状态
function toggleMainWindow() {
  // 检查窗口是否存在且未被销毁
  if (!mainWindow || mainWindow.isDestroyed()) {
    // 如果窗口不存在或已销毁，则创建新窗口
    createWindow();
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

// 加载数据
function loadItems() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, "utf8");
      items = JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading items:", error);
    items = [];
  }
}

// 保存数据
function saveItems() {
  try {
    const dirPath = path.dirname(dataFilePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(items, null, 2), "utf8");
    updateTrayMenu();
  } catch (error) {
    console.error("Error saving items:", error);
  }
}

// 处理项目动作
function handleItemAction(item) {
  switch (item.type) {
    case "file":
    case "folder":
      shell.openPath(item.path);
      break;
    case "url":
      shell.openExternal(item.path);
      break;
    case "command":
      /*
            exec(item.path, (error, stdout, stderr) => {
                if (error) {
                    console.error(`执行命令出错: ${error}`);
                    return;
                }
                console.log(`命令输出: ${stdout}`);
            });
            */

      // 根据平台打开终端窗口执行命令
      const platform = process.platform;
      try {
        if (platform === "win32") {
          // Windows - 使用 start cmd 打开命令窗口并执行命令
          if (/^\/[KC]/i.test(item.path)) {
            // 若已经包含 /K 或 /C 则直接执行
            exec(`start cmd ${item.path}`);
          } else {
            exec(`start cmd /K ${item.path}`); // 否则使用 /K 执行命令（保持CMD窗口打开）
          }
        } else if (platform === "darwin") {
          // macOS - 使用 osascript 打开 Terminal 并执行命令
          const escapedCommand = item.path.replace(/"/g, '\\"');
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
            "{CMD}",
            item.path.replace(/"/g, '\\"')
          );
          exec(command, (error) => {
            if (error) {
              console.error("打开终端失败，尝试其他终端");
              // 如果失败可以尝试其他终端，但为简化代码，此处不实现
            }
          });
        }
      } catch (error) {
        console.error("执行命令出错:", error);
      }

      break;
  }
}

// 判断项目类型
function getItemType(path) {
  if (!path || typeof path !== "string") {
    console.warn("Invalid path provided to getItemType:", path);
    return "unknown"; // 返回一个默认类型
  }

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.includes("://")
  ) {
    return "url";
  }

  try {
    const stats = fs.statSync(path);
    return stats.isDirectory() ? "folder" : "file";
  } catch (error) {
    // 不是URL也不是文件/文件夹，则认为是命令
    return "command";
  }
}

// 初始化
app.whenReady().then(() => {
  loadItems();
  createWindow();
  createTray();
  registerGlobalShortcuts();

  // 设置IPC处理器
  setupIpcHandlers();
});

// IPC处理器设置
function setupIpcHandlers() {
  // 窗口控制
  ipcMain.on("minimize-window", () => {
    mainWindow.minimize();
  });

  ipcMain.on("close-window", () => {
    mainWindow.hide();
  });

  ipcMain.on("close-add-item-window", () => {
    if (addItemWindow) {
      addItemWindow.close();
    }
  });

  // 项目管理
  ipcMain.handle("get-items", () => {
    return items;
  });

  ipcMain.handle("add-item", (event, item) => {
    // 检查是否已存在
    const exists = items.some((i) => i.path === item.path);
    if (exists) {
      return { success: false, message: "条目已存在" };
    }

    items.push(item);
    saveItems();

    // 通知主窗口更新列表
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("items-updated");
    }

    return { success: true };
  });

  ipcMain.handle("update-item", (event, { index, updatedItem }) => {
    items[index] = updatedItem;
    saveItems();

    // 通知主窗口更新列表
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("items-updated");
    }

    return { success: true };
  });

  ipcMain.handle("remove-item", (event, index) => {
    items.splice(index, 1);
    saveItems();

    // 通知主窗口更新列表
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("items-updated");
    }

    return { success: true };
  });

  ipcMain.handle("update-items-order", (event, newItems) => {
    items = newItems;
    saveItems();

    // 通知主窗口更新列表
    // if (mainWindow && !mainWindow.isDestroyed()) {
    //     mainWindow.webContents.send('items-updated');
    // }

    return { success: true };
  });

  ipcMain.on("show-add-item-dialog", () => {
    createAddItemWindow();
  });

  ipcMain.on("show-edit-item-dialog", (event, { item, index }) => {
    createEditItemWindow(item, index);
  });

  // 项目类型判断
  ipcMain.handle("get-item-type", (event, path) => {
    return getItemType(path);
  });

  // 项目操作
  ipcMain.on("open-item", (event, item) => {
    handleItemAction(item);
  });

  ipcMain.on("show-item-in-folder", (event, path) => {
    shell.showItemInFolder(path);
  });

  ipcMain.on("copy-text", (event, text) => {
    clipboard.writeText(text);
  });

  // 复制文件/文件夹
  ipcMain.on("copy-file", (event, path) => {
    try {
      if (fs.statSync(path).isDirectory()) {
        // 目录不能直接复制，通知用户
        return;
      }

      // 读取文件并存入剪贴板
      const content = fs.readFileSync(path);
      clipboard.writeBuffer("FileContents", content);
    } catch (error) {
      console.error("复制文件错误:", error);
    }
  });
}

// 当所有窗口关闭时
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// macOS点击dock图标时
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 退出前清理
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
