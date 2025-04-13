/**
 * 共享常量和类定义
 * 此文件包含在主进程和渲染进程之间共享的常量、枚举和类定义
 * 用于确保代码一致性和类型安全
 */

/**
 * 路径类型枚举
 * 用于标识不同类型的项目
 * @readonly
 * @enum {string}
 */
const PathType = {
  FILE: "file",         // 文件类型
  FOLDER: "folder",     // 文件夹类型
  URL: "url",           // 网址类型
  COMMAND: "command",   // 命令类型
};

/**
 * 列表项类
 * 表示启动器中的一个项目
 */
class ListItem {
  /**
   * 创建一个新的列表项
   * @param {string} path - 项目的路径、URL或命令
   * @param {string} type - 项目类型，使用PathType枚举值
   */
  constructor(path, type) {
    this.path = path;
    this.type = type;
    // 注意：name属性可以后续添加，默认为空
  }
}

// 导出模块定义
module.exports = {
  PathType,
  ListItem,
};
