# Launcher App

> 🚀 快速访问常用文件、文件夹、URL 和命令的桌面启动器应用

![使用Electron构建](https://img.shields.io/badge/Built%20with-Electron-47848F)
![MIT许可证](https://img.shields.io/badge/License-MIT-green)

## 📋 项目简介

Launcher App 是一款基于 Electron 开发的桌面快速启动器工具，帮助用户快速访问常用的文件、文件夹、网站和命令。应用以简洁的列表形式呈现所有项目，支持拖放、搜索和自定义操作。

> ⚠️ **声明：** 本项目的代码主要由人工智能辅助生成。项目结构、功能实现及界面设计均使用了 AI 技术。<br/>
> 此文档内容亦由 AI 生成。

## ✨ 主要功能

- 🗂️ 添加和管理多种类型的条目
  - 文件
  - 文件夹
  - 网址和 Deep Link
  - 命令行指令
- 🔍 快速搜索条目
- 🖱️ 支持拖放文件/文件夹直接添加
- 📋 右键菜单提供丰富操作选项
- 🌓 自动适应系统亮/暗主题
- ⌨️ 全局快捷键 (Alt+Shift+Q) 呼出应用
- 🧩 系统托盘集成，显示最近使用的条目
- 🔄 支持拖拽重新排序列表
- ⚡ 通过双击或回车快速打开项目

### TODO

- [ ] 支持多语言
- [ ] 优化列表条目显示
    - 显示文件类型图标
    - 显示网址标题
- [ ] 修复拖拽排序问题

## 🚀 使用方法

### 添加新条目

1. 点击界面右上角的"+"按钮
2. 输入路径、URL 或命令
3. 选择正确的类型（文件/文件夹、URL 或命令）
4. 点击"保存"

### 快速操作

- **搜索**: 在搜索框中输入关键字
- **打开项目**: 双击列表项或选中后按 Enter 键
- **编辑/删除**: 右键点击项目，选择相应选项
- **拖拽排序**: 拖动列表项调整顺序
- **键盘导航**: 使用上下箭头键选择项目

### 全局快捷键

- **Alt+Shift+Q**: 显示/隐藏主窗口

## 📥 构建

1. 确保已安装 [Node.js](https://nodejs.org/) (22 LTS 或更高版本)

2. 克隆仓库:

```bash
git clone https://github.com/SolarianZ/launcher-app-electron.git
cd launcher-app-electron
```

3. 安装依赖:

```bash
npm install
```

4. 启动应用:

```bash
npm start
```

### 🔧 自定义

应用数据存储在用户数据目录，可以通过编辑 CSS 文件自定义界面样式：

- `app/css/styles.css`: 基础样式
- `app/css/themes.css`: 主题配置

### 📦 打包应用

使用 electron-builder 打包为可分发的应用程序:

```bash
npm run build
```

生成的安装包将保存在 `dist` 目录中。
