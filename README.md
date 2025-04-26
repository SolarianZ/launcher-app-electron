# Launcher App

[中文](./README_zh.md)

> 🚀 A desktop launcher application for quick access to frequently used files, folders, URLs, and commands

![Built with Electron](https://img.shields.io/badge/Built%20with-Electron-47848F)
![MIT License](https://img.shields.io/badge/License-MIT-green)

![Main Window](./doc/imgs/launcher_app_main_window.png)

## 📋 Project Introduction

Launcher App is a desktop quick launcher tool developed with Electron, helping users quickly access commonly used files, folders, websites, and commands.

> ⚠️ **Disclaimer:** 
> 1. The code of this project is mainly generated with AI assistance. The project structure, functionality implementation, and interface design all used AI technology.
> 2. This document content is also mainly AI-generated.
> 3. The software has not been rigorously tested.

## ✨ Main Features

- 🗂️ Add and manage multiple types of items
  - Files
  - Folders
  - URLs and Deep Links
  - Command line instructions
- 🔍 Quick item search
- 🖱️ Support drag and drop to add files/folders
- 📋 Rich operations through right-click menu
- 🌓 Support dark and light themes
- 🌍 Support for multiple languages
  - Built-in Chinese and English support
  - Support more languages by adding translation files
- ⌨️ Custom global shortcut key to bring up the app (default is Alt+Shift+Q)
- 🧩 System tray integration, showing recently used items
- 🔄 Support drag and drop to reorder the list
- ⚡ Quick open items with double-click or Enter key
- 💬 Cross-platform support (Windows, macOS, Linux, not rigorously tested)

## 📥 Build

1. Make sure you have [Node.js](https://nodejs.org/) installed (recommended 22 LTS or higher)

2. Clone the repository

```bash
git clone https://github.com/SolarianZ/launcher-app-electron.git
cd launcher-app-electron
```

3. Install dependencies

```bash
npm install
```

4. Start the application

```bash
npm start
```

### 📦 Package the Application

Use electron-builder to package for distribution:

```bash
npm run build
```

The generated installation packages will be saved in the `dist` directory.

## 🧩 Technical Implementation

- **Electron**: Cross-platform desktop application framework
- **Modular Architecture**: Separation of main process and renderer process
- **IPC Communication**: Secure inter-process communication
- **Local Storage**: JSON file for persistent data
- **Internationalization**: Multi-language support system
- **Responsive UI**: Adapts to different sizes and themes

For more project details, refer to [copilot-instructions](./.github/copilot-instructions.md).
