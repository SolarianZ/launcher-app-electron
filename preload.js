const { contextBridge, ipcRenderer, webUtils } = require("electron");

// 安全地暴露API给渲染进程
contextBridge.exposeInMainWorld("electronAPI", {
  // 窗口控制
  minimizeWindow: () => ipcRenderer.send("minimize-window"),
  closeWindow: () => ipcRenderer.send("close-window"),
  closeAddItemWindow: () => ipcRenderer.send("close-add-item-window"),

  // 监听列表更新事件
  onItemsUpdated: (callback) => {
    ipcRenderer.on("items-updated", () => callback());

    // 返回清理函数
    return () => {
      ipcRenderer.removeAllListeners("items-updated");
    };
  },

  // 监听编辑条目数据
  onEditItemData: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on("edit-item-data", listener);
    return () => {
      ipcRenderer.removeListener("edit-item-data", listener);
    };
  },

  // 项目管理
  getItems: () => ipcRenderer.invoke("get-items"),
  addItem: (item) => ipcRenderer.invoke("add-item", item),
  removeItem: (index) => ipcRenderer.invoke("remove-item", index),
  updateItemsOrder: (items) => ipcRenderer.invoke("update-items-order", items),
  showAddItemDialog: () => ipcRenderer.send("show-add-item-dialog"),
  showEditItemDialog: (item, index) =>
    ipcRenderer.send("show-edit-item-dialog", { item, index }),

  // 获取项目类型
  getItemType: (path) => ipcRenderer.invoke("get-item-type", path),

  // 项目操作
  updateItem: (index, updatedItem) =>
    ipcRenderer.invoke("update-item", { index, updatedItem }),
  openItem: (item) => ipcRenderer.send("open-item", item),
  showItemInFolder: (path) => ipcRenderer.send("show-item-in-folder", path),
  copyText: (text) => ipcRenderer.send("copy-text", text),
  copyFile: (path) => ipcRenderer.send("copy-file", path),

  // 获取文件或文件夹路径
  getFileOrFolderPath: (item) => {
    if (!item) return undefined;
    return webUtils.getPathForFile(item);
  },

  // 文件和文件夹选择
  selectFile: () => ipcRenderer.invoke("select-file"),
  selectFolder: () => ipcRenderer.invoke("select-folder"),

  // 获取平台信息
  getPlatform: () => process.platform,
});
