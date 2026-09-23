# NEON ECLIPSE — Windows 便携桌面版

## 运行

交付文件：`release-desktop/NEON-ECLIPSE-1.4.0-win-x64.exe`（相对游戏项目根目录）。

- 面向 Windows 10/11 x64；需要支持 WebGL 2 的显卡与驱动。
- 双击 EXE，等待首次解压后进入独立游戏窗口。无需安装 Node.js、Three.js 或其他浏览器。
- 这是单文件便携程序：运行时会把内置 Chromium 运行环境解压到临时目录，不代表运行中完全不写文件。
- F11 或 Alt+Enter 切换全屏；Esc 保持原有游戏暂停/返回行为；Alt+F4 退出。
- 版本未进行商业代码签名，Windows 可能显示未知发布者提示。不要为了运行游戏关闭系统防护；请核对来源与交付的 SHA-256。

## 存档

桌面版使用固定的本地来源 `neon://game/`，无随机端口，也不启动外部 HTTP 服务。

存档位于 `%APPDATA%\NEON-ECLIPSE` 的 Chromium 本地存储中。移动 EXE 或退出后重新打开，不会因临时解压路径改变而切换存档来源。

这是“程序免安装便携”，不是“存档跟随 EXE 的绿色便携”。浏览器版和桌面版的存档相互独立；本次没有自动导入、覆盖或删除浏览器存档。卸下 EXE 不会自动删除桌面版存档。不要在游戏运行时复制或手动修改其存储文件。

## 重新构建

在游戏根目录已经安装 Three.js 的前提下，从 `desktop/` 执行：

```bash
npm ci --no-audit --no-fund
npm run pack
```

首次安装需要网络下载 Electron 与构建工具；打包完成后的游戏不依赖网络。`desktop/package-lock.json` 固定工具链；`desktop/web/` 是生成目录。`stage.cjs` 仅替换这一生成目录，不改写游戏原始源码。

打包时复制根目录运行用 JS/CSS/HTML；将生成副本中的 Three.js 引用改到 `vendor/three/`，随包包含运行模块与许可证。不把测试脚本、开发文档或构建工具当作游戏内容打包。

输出目录是 `release-desktop/`。其中 `win-unpacked/` 为调试用展开产物，正常交付只需单个 portable EXE。

## 安全边界

渲染窗口禁用 Node 集成，启用上下文隔离、沙箱与 Web 安全；禁止远程资源请求、外部导航和新窗口。游戏通过只读本地自定义协议加载，不监听网络端口。仅允许游戏页面所需的指针锁定权限。

`--smoke-test --smoke-output=<绝对路径>` 为打包后自动冒烟测试入口，使用新的临时用户数据目录，不访问正常桌面存档。依次加载六章，检查菜单、WebGL 2、画布与本地存储；结果不是人工六章通关证明。
