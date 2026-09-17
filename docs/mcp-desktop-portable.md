# NEON ECLIPSE｜Windows x64 便携版打包交付

日期：2026-09-17

## 交付

- 单文件程序：`release-desktop/NEON-ECLIPSE-1.0.0-win-x64.exe`。
- 版本：1.0.0；Windows x64 portable；文件约 96 MiB。
- SHA-256：`19c7e7289dcd28ff373702ef19f4e3aa51081d74e1cdb14c329d97780ae9fa4c`。
- 实测数字签名状态：`NotSigned`。构建日志中的 signtool 步骤不表示已获得有效签名。
- 使用与重建说明：`desktop/README.md`。

独立游戏窗口，内置 Electron 44.4.1 与离线 Three.js 资源。无需用户安装 Node.js 或浏览器，不启动 HTTP 服务，也不依赖外部 CDN。F11 / Alt+Enter 切换全屏，Esc 沿用游戏暂停/返回，Alt+F4 退出。

单文件启动时仍需解压运行环境至临时目录。存档位于 `%APPDATA%\NEON-ECLIPSE`，并非保存在 EXE 旁边。固定页面来源为 `neon://game/`，浏览器版原存档保持独立，没有执行迁移或删除。

## 构建变更

新增独立的 `desktop/` 打包工程：

- `package.json`、`package-lock.json`：固定 Electron 44.4.1 / electron-builder 26.15.3 工具链。
- `main.cjs`：本地协议、独立窗口、全屏、单实例与隔离测试入口。
- `stage.cjs`：从当前游戏源码生成离线副本，重写副本的 Three.js 资源位置，检查相对模块引用。
- `smoke.cjs`：运行最终 portable 或展开 EXE 的六章冒烟检查；清理编辑器继承的 `ELECTRON_RUN_AS_NODE` / `NODE_OPTIONS` 子进程环境。

未修改根项目玩法代码和根依赖配置。构建工具仅在 `desktop/` 安装；`desktop/web/` 和 `release-desktop/` 是生成产物。

渲染窗口禁用 Node 集成，启用上下文隔离、沙箱与 Web 安全；本地协议有路径边界检查；阻止远程资源、外部导航及新窗口；仅开放游戏所需指针锁定。

## 实际验证

1. 原项目 `npm test` 及桌面入口语法检查通过，退出码 0。命令：`cmd_0ba63d7ee1ebe7ff4dec410913096f958ea709b479702763`。
2. Windows 上 `npm install --no-audit --no-fund && npm run pack` 成功，退出码 0。命令：`cmd_4f930e27d178b15d1ff3701b761c4ad309a8e17d8b16b1b5`。
3. 展开版在六章均成功创建菜单、画布和 WebGL 2 上下文，本地存储可读写，捕获脚本错误为空。结果：`release-desktop/smoke-unpacked.json`。
4. 最终单文件 EXE 使用 `node desktop/smoke.cjs` 在 Windows 上通过相同六章检查，退出码 0。结果：`release-desktop/smoke-portable.json`。命令：`cmd_e62c64e12ff95bc1c2cfd10f38571d62c72f3a8ab93ecd41`。
5. 检查实际 `app.asar` 包含当前桌面入口及 94 个文件/目录项；不是仅交付未打包源码。
6. 编辑器对桌面工程的首次诊断为 0 条。最终程序的 Authenticode 检查为未签名；不声称通过商业签名或杀毒认证。

最初从编辑器终端直接启动测试时，继承的 Node-only 环境导致 EXE 把应用参数当成 Node 参数；清除子进程环境后已重测通过，没有改动系统全局环境。

测试均使用独立临时用户数据目录，未打开用户正常桌面或浏览器存档。六章启动检查不等于人工六章战斗通关、鼠标操作手感验收、长时间性能测试或全部 Windows 设备兼容性验证。面向 Windows 10/11 x64 与 WebGL 2 显卡环境；未测试 Windows ARM 或 32 位系统。

## 重跑

在游戏根目录：

```bash
node desktop/smoke.cjs
node desktop/smoke.cjs --unpacked
```

在 `desktop/` 中重新构建：

```bash
npm ci --no-audit --no-fund
npm run pack
```

未签名 EXE 可能触发 Windows 来源提示；核对来源和 SHA-256，不建议关闭系统安全防护。
