# GitHub Copilot 指导文件

## 项目概述

Launcher App是一个基于 Electron 的启动器应用程序，用于管理用户常用的文件、文件夹、URL和指令。
该应用程序包含项目列表界面（主界面）、项目编辑界面、项目右键菜单、设置界面、托盘图标、托盘右键菜单等。

## 代码结构

项目使用以下目录结构：

- `/src/main/` - Electron 主进程代码
  - `main.js` - 主进程入口文件
  - `window-manager.js` - 窗口管理
  - `tray-manager.js` - 系统托盘管理
  - `data-store.js` - 数据存储逻辑
  - `ipc-handler.js` - IPC 通信处理
  - `item-handler.js` - 项目处理逻辑

- `/src/preload/` - 预加载脚本
  - `preload.js` - 暴露给渲染进程的 API

- `/src/renderer/` - 渲染进程代码
  - `index.html` - 主窗口 HTML
  - `edit-item.html` - 项目编辑窗口
  - `settings.html` - 设置窗口
  - `/css/` - 样式文件
  - `/js/` - 渲染进程 JavaScript 文件

- `/src/shared/` - 共享代码
  - `defines.js` - 共享常量和定义

- `/src/assets/` - 图标和其他静态资源

## 编码规范

此项目是 Electron 和 Web 技术的示例项目，需要遵守以下规范，以便入门者阅读学习。

1. 注重代码质量和可读性，使用有意义的变量和函数名称。

2. 添加详细的注释，尤其是处理平台特定代码时。

## API说明

- `webUtils.getPathForFile(file)` 是有效的Electron API
- 最新版Electron中，无法使用 `event.dataTransfer.files[0].path` 来获取文件路径，必须使用 `webUtils.getPathForFile(file)` 来获取文件路径
