# NEON ECLIPSE｜鼠标上下视角跳变修复与 1.4.0 EXE 交付

日期：2026-09-22  
范围：`game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6`  
决策：用户已明确授权本轮修复后重新制作 EXE；未提交、未推送。

## 结论

已修复 FPS 战斗页鼠标上下移动偶发大距离跳变的输入边界和生命周期问题，并生成新的 Windows x64 portable EXE。

这次修复没有降低整体鼠标灵敏度：正常 `movementX/movementY` 仍按原灵敏度计算，只对异常单事件做边界保护，并在输入来源／焦点切换时清空旧状态。

## 源码定位

- Pointer Lock 下的 `MouseEvent.movementX/movementY` 是相对增量，不是绝对屏幕坐标；旧 `look-input.js` 仅拒绝非有限值和绝对值大于 600 的样本，因此 160–600 的异常单帧增量仍会直接乘灵敏度写入 yaw/pitch，足以造成明显上下跳变。
- Pointer Lock 切换、窗口失焦、页面隐藏／恢复和锁定错误没有共享完整的 look 状态清理路径；长停顿后到达的旧鼠标事件也没有被识别为 stale sample。
- 当前证据是源码级复现夹具和输入状态回归；没有把软件 WebGL 或自动化事件描述成用户 Windows 鼠标硬件的逐次复现，也不据此断言 Windows 驱动或鼠标加速是根因。

## 修改

- `look-input.js`
  - 新增 `MAX_LOOK_DELTA=160`：异常单事件被丢弃，不改变正常灵敏度。
  - 新增 `MAX_LOOK_GAP_MS=250`：长时间停顿或时间戳回退后的第一条事件丢弃，拖动模式同时重置坐标锚点。
  - 对 `movementX/movementY`、拖动坐标和时间戳做有限性检查；锁定初次捕获和模式切换仍丢弃首个过渡样本。
- `session-input.js`
  - 用统一 `resetLook()` 接入 `pointerlockchange`、`pointerlockerror`、`blur`、`focus` 和 `visibilitychange`。
  - 页面隐藏或窗口失焦时暂停并退出 Pointer Lock；恢复焦点不继承旧 look 增量。
- `test-look-input.mjs`
  - 覆盖正常小幅上下／左右增量、边界值、异常垂直增量、NaN、长停顿、Pointer Lock 初次捕获和非锁定拖动。
- `desktop/stage.cjs`
  - 修复当前桌面工程只复制根目录文件导致子目录运行时 import 无法进入 EXE 的 staging 问题；递归复制运行时代码，并补齐离线 Three.js loader 依赖与相对 import 重写。
- `desktop/main.cjs`
  - 仅修正桌面 smoke 夹具对异步海上追逐启动的等待竞态；没有改变载具玩法。
- `desktop/package.json`、`desktop/package-lock.json`、`desktop/README.md`
  - 版本提升为 `1.4.0`，避免覆盖既有 1.3.0 产物。

## 源码与浏览器验证

以下命令均在 Windows PortableGit Bash 的项目目录串行执行：

| 验证 | 结果 |
|---|---|
| `node --check look-input.js && node --check session-input.js && node test-look-input.mjs` | 退出码 0；look 输入回归通过 |
| `node test-session-lifecycle.mjs` | 9/9，退出码 0 |
| `node test-combat-controls.mjs` | 8 groups，退出码 0 |
| `test-combat-controls-browser.mjs`（Playwright、SwiftShader、隔离上下文） | 10/10，退出码 0 |
| `get_diagnostics` | 0 error / 0 warning |
| `node --check desktop/stage.cjs && node --check desktop/main.cjs` | 退出码 0 |

两个既有视觉 look 专项在本轮运行中出现 draws／纹理预算波动红灯：`test-reactor-look-browser.mjs` 报既有 calls budget、`test-station-look-browser.mjs` 报既有 textures budget；这与鼠标输入代码无关，且历史路线图已记录其中的 Boss 视觉基线原因。本轮没有修改视觉预算来掩盖它们。

`test-smoke-browser.mjs` 曾完成九章启动和启动／暂停输出，但旧脚本完成输出后未自行退出，已停止该进程；没有把它写成完整 exit 0 或自然通关证据。EXE 冒烟使用独立的桌面 smoke 入口，结果见下节。

## EXE 交付

- 产物：`release-desktop/NEON-ECLIPSE-1.4.0-win-x64.exe`
- 大小：`101,048,905` bytes（约 96.37 MiB）
- SHA-256：`4c27f49be5d6f3b4097a35c6cd653f709705cc6cbb63d719b3686494435645da`
- 构建命令：`cd desktop && npm run pack`
- 构建结果：退出码 0；最终命令记录 `cmd_4a8d6e125a9187a64471ece361f47c12f2dc864fc5724f3c`
- staging manifest：版本 `1.4.0`，`411` 个资源；其中包含修复后的 `look-input.js` 和 `session-input.js`。
- portable EXE 验证：`node desktop/smoke.cjs`，退出码 0；报告 `release-desktop/smoke-1.4.0-portable.json`，7 个检查（6 章 + vehicle）、WebGL、存储、海上追逐、飞行、暂停／重置、记录写入／去重／读取／重载均通过，errors 为空。
- 展开版验证：`node desktop/smoke.cjs --unpacked`，退出码 0；报告 `release-desktop/smoke-1.4.0-unpacked.json`，同样通过。
- 构建配置保持未签名 portable 发行方式；不把构建日志中的 signtool 步骤解释为有效 Authenticode 签名，也不声称通过杀毒认证。

## 验收边界

- 浏览器输入回归和 Electron smoke 证明了输入模块、入口、WebGL、存储和任务夹具可启动；它们不能替代用户在真实 Windows 鼠标、显示器刷新率、DPI、驱动和显卡上的手感验收。
- EXE smoke 没有模拟用户手动上下移动鼠标，也不等于自然六章通关、硬件 FPS、实体手柄或所有 Windows 设备兼容性验收。
- 建议先运行 1.4.0，在任一章节进入战斗后快速小幅上下移动，再反复暂停／恢复、切换窗口和重新捕获鼠标；若仍出现跳变，请同时提供章节、是否锁定、窗口切换动作和录屏／输入日志，以便区分硬件驱动与运行时事件。

## 保留与交付纪律

- 没有重置、覆盖或回滚其他会话改动；九章墙地材质和 SWITCHYARD E 切岔进度条保留。
- 没有提交或推送；当前项目仍保留用户此前的并行改动状态。
- 没有把本轮局部输入／桌面 smoke 结果扩写为全项目主回归全绿或用户实机全面验收。
