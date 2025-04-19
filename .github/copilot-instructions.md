# GitHub Copilot 指导文件

## 项目概述

Launcher App 是一个基于 Electron 的启动器应用程序，用于管理用户常用的文件、文件夹、URL 和指令。
该应用程序包含项目列表界面（主界面）、项目编辑界面、项目右键菜单、设置界面、托盘图标、托盘右键菜单等。
支持多平台（Windows, macOS, Linux）、多语言（中文、英文）和主题切换（浅色、深色）。

## 主要功能

1. **项目管理**
   - 添加、编辑和删除项目（文件、文件夹、URL、命令）
   - 拖放添加文件/文件夹
   - 项目排序与搜索
   - 右键菜单操作（打开、复制、在文件夹中显示等）

2. **用户界面**
   - 主窗口（项目列表）
   - 项目编辑窗口
   - 设置窗口
   - 系统托盘集成
   - 键盘导航与快捷键

3. **系统集成**
   - 全局快捷键（Alt+Shift+Q 呼出应用）
   - 系统托盘菜单（显示最近8个项目）
   - 跨平台终端命令执行
   - 系统文件操作（在文件夹中显示、复制文件）

4. **设置与配置**
   - 主题设置（浅色/深色/跟随系统）
   - 语言设置（中文/英文/跟随系统）
   - 数据管理（清空数据、查看数据存储位置）

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
    - `styles.css` - 基础样式
    - `themes.css` - 主题样式
  - `/js/` - 渲染进程 JavaScript 文件
    - `renderer.js` - 主窗口脚本
    - `edit-item.js` - 编辑窗口脚本
    - `settings.js` - 设置窗口脚本
    - `context-menu.js` - 右键菜单脚本
    - `list.js` - 列表操作脚本

- `/src/shared/` - 共享代码
  - `defines.js` - 共享常量和定义
  - `i18n.js` - 国际化支持

- `/src/assets/` - 图标和其他静态资源
  - `/icons/` - 应用和托盘图标

## 关键模块说明

### 主进程模块

1. **window-manager.js**
   - 负责创建和管理所有窗口（主窗口、项目编辑窗口、设置窗口）
   - 处理窗口生命周期、位置和大小记忆、平台特定窗口样式

2. **tray-manager.js**
   - 创建和管理系统托盘图标
   - 根据平台差异处理托盘图标和菜单
   - 显示最近使用的项目列表

3. **data-store.js**
   - 负责数据持久化存储
   - 提供项目CRUD操作
   - 存储窗口配置

4. **item-handler.js**
   - 处理项目类型判断
   - 执行项目操作（打开文件/文件夹/URL、执行命令）
   - 处理平台特定的终端命令执行

5. **ipc-handler.js**
   - 配置主进程与渲染进程间的通信
   - 处理窗口控制、数据操作、项目操作等IPC消息

### 渲染进程模块

1. **renderer.js**
   - 主窗口逻辑
   - 列表渲染和交互
   - 拖放处理
   - 键盘导航

2. **edit-item.js**
   - 项目编辑表单处理
   - 自动类型判断
   - 文件/文件夹选择对话框

3. **settings.js**
   - 主题和语言设置
   - 数据管理
   - 应用信息显示

4. **context-menu.js**
   - 右键菜单生成
   - 针对不同项目类型生成不同菜单项

### 共享模块

1. **defines.js**
   - 定义项目类型常量（文件、文件夹、URL、命令）

2. **i18n.js**
   - 多语言支持
   - 语言切换
   - 文本翻译

## 编码规范

此项目是 Electron 和 Web 技术的示例项目，需要遵守以下规范，以便入门者阅读学习。

1. 注重代码质量和可读性，使用有意义的变量和函数名称。

2. 添加详细的注释，尤其是处理平台特定代码时。

3. 分离关注点，将不同功能模块化处理。

4. 使用异步编程处理IO操作，避免阻塞主线程。

5. 使用预加载脚本来安全地暴露API，而不是直接启用nodeIntegration。

## API 参考

### Electron 特定API说明

- `webUtils.getPathForFile(file)` 是有效的Electron API，用于安全地获取拖放文件的路径
- 最新版Electron中，无法使用 `event.dataTransfer.files[0].path` 来获取文件路径，必须使用 `webUtils.getPathForFile(file)` 来获取文件路径

### 主进程暴露给渲染进程的API

通过预加载脚本(`preload.js`)，主进程向渲染进程暴露了以下API：

1. **窗口控制API**
   - `window.electronAPI.minimizeWindow()` - 最小化窗口
   - `window.electronAPI.closeWindow()` - 关闭/隐藏窗口
   - `window.electronAPI.showSettingsWindow()` - 显示设置窗口

2. **项目管理API**
   - `window.electronAPI.getItems()` - 获取所有项目
   - `window.electronAPI.addItem(item)` - 添加项目
   - `window.electronAPI.removeItem(index)` - 删除项目
   - `window.electronAPI.updateItem(index, updatedItem)` - 更新项目
   - `window.electronAPI.updateItemsOrder(items)` - 更新项目排序

3. **项目操作API**
   - `window.electronAPI.openItem(item)` - 打开项目
   - `window.electronAPI.showItemInFolder(path)` - 在文件夹中显示
   - `window.electronAPI.copyText(text)` - 复制文本
   - `window.electronAPI.getItemType(path)` - 获取项目类型

4. **文件选择API**
   - `window.electronAPI.selectFile()` - 打开文件选择对话框
   - `window.electronAPI.selectFolder()` - 打开文件夹选择对话框
   - `window.electronAPI.getFileOrFolderPath(item)` - 获取拖放文件的路径

5. **设置API**
   - `window.electronAPI.themeChanged(theme)` - 通知主题变更
   - `window.electronAPI.languageChanged(language)` - 通知语言变更
   - `window.electronAPI.openStorageLocation()` - 打开存储位置
   - `window.electronAPI.clearAllItems()` - 清空所有项目

6. **事件监听API**
   - `window.electronAPI.onItemsUpdated(callback)` - 监听项目更新
   - `window.electronAPI.onThemeChanged(callback)` - 监听主题变更
   - `window.electronAPI.onLanguageChanged(callback)` - 监听语言变更

7. **国际化API**
   - `window.electronAPI.i18n.t(key, params)` - 翻译文本
   - `window.electronAPI.i18n.setLanguage(language)` - 设置语言
   - `window.electronAPI.i18n.getCurrentLanguage()` - 获取当前语言
   - `window.electronAPI.i18n.getSystemLanguage()` - 获取系统语言

## 通用操作流程

1. **添加新项目流程**
   - 用户点击添加按钮或拖放文件
   - 显示编辑窗口
   - 填写/确认项目信息
   - 保存项目到数据存储
   - 刷新主窗口列表
   - 更新托盘菜单

2. **打开项目流程**
   - 用户双击项目或右键菜单选择打开
   - 根据项目类型执行对应操作:
     - 文件/文件夹: 使用shell.openPath
     - URL: 使用shell.openExternal
     - 命令: 使用平台特定方法在终端执行

3. **设置主题流程**
   - 用户在设置窗口选择主题
   - 保存主题设置到本地存储
   - 通知所有窗口应用新主题
   - 根据主题应用相应CSS类

4. **设置语言流程**
   - 用户在设置窗口选择语言
   - 保存语言设置
   - 使用i18n模块加载对应语言资源
   - 更新所有窗口的文本
