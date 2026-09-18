# 稳定性第三批：暂停、重试与任务切换

日期：2026-09-18。接续 `docs/mcp-stability-plan.md`。本批实际修复为载具入口与联合/海战共用检查点面板；FPS 只进行独立模块复测，不修改正在并行编辑的 `app.js`。

## 已确认问题与修复

| 场景 | 修复前 | 修复后 |
| --- | --- | --- |
| 长按 Esc | 重复 keydown 在 repeat 检查之前反复触发暂停/继续 | Esc 仍阻止默认行为，但忽略 repeat；重新按下一次才切换 |
| 联合/海战任务等待检查点读取时失焦、切到隐藏页或暂停 | 已经不 active 时 pause 直接返回，迟到的启动结果仍可能恢复游戏 | pause 在提前返回之前递增启动意图号，使等待中的旧启动失效 |
| 等待新任务时选择继续原任务 | 旧异步结果仍可能在稍后重置当前任务 | 成功 resume 同样使之前的启动意图失效；终局任务仍禁止直接继续 |
| 取消迟到启动后的检查点归属 | 仅拦截最终启动不够：begin 已可能切换 currentRun、丢弃待重试操作或采纳新 revision | begin 接受可选的 isCurrent；等待当前写入、读取后检查有效性，仅有效启动才采纳版本、清空旧待办和切换归属 |

`vehicle-app.js` 的两个异步启动入口均向 `begin` 传入当前意图判断，并保留原有 await 后的意图检查。`joint-checkpoint-ui.js` 的 begin 默认判断始终为真，保留未传该参数的旧调用方式。

取消启动不是撤销已经提交的存储写入，也不是取消原生 IndexedDB 事务：本批拦截的是过期结果对当前任务的后续激活/归属修改。只读刷新可以更新面板显示，但取消的 begin 不自动采纳它的 revision 作为下一次写入依据。

## 保留的正确行为

- 暂停/继续清除按住的键、射击/拖动/火箭标志、回收长按进度和固定步进积欠；继续更新计时基准，但不重置当前武器、位置或任务。
- 回收/新任务重建武器状态，清除武器弹体、短期效果、装填/冷却等计时器，重置三条路线和任务状态。
- 胜利/失败任务不允许直接 resume，必须选择重试或其他任务。
- 已存在的“较新任务覆盖较旧异步启动”检查保留；检查点 begin 返回失败时不会激活任务。
- FPS `projectiles.clear()` 清除已发弹体与蓄力/连发队列及场景对象；随后 update 不会复活旧弹体，新一轮仍可发射。
- FPS `lookInput.reset()` 丢弃旧拖动状态，首个指针锁定切换样本仍被过滤。

## 本批验证

新增 `test-session-lifecycle.mjs`，先做红灯再修复：

- 最初 8 组测试为 5/8；补充真实检查点控制器的取消归属测试后为 **5/9，退出码 1**。
- 修复后 **9/9，退出码 0**；四组原失败场景均变绿。
- 入口测试从当前 `vehicle-app.js` 提取实际函数/键盘处理器，在 Node VM 中执行；渲染、音频、任务工厂和 UI 使用替身，存储延迟由 Promise 控制。
- 检查点面板使用真实 `bindCheckpointUI`、模拟 DOM 和内存 store；验证取消 begin 后旧任务仍能保存/完成，写入使用旧预期 revision，非迟到读取的版本。原生 BroadcastChannel 被禁用。
- FPS 弹体使用真实 Three.js 场景对象，但不创建 WebGL renderer，不打开浏览器；视角与武器暂停测试调用真实规则模块。

串行相关回归：

```bash
node test-session-lifecycle.mjs
node test-look-input.mjs
node test-vehicle-weapons.mjs
node test-joint-checkpoint.mjs
node test-naval-checkpoint.mjs
node test-expedition-recovery.mjs
node test-audio-lifecycle.mjs
```

七个脚本全部通过，退出码 0，MCP 命令耗时 **9763 ms（约 9.8 秒）**。海战检查点脚本含规则层的 30/60/120 Hz 恢复模拟，不是实机帧率测量。音频生命周期为既有模拟图/静态接线 4/4，通过不代表听感验收。

三个改动 JS/MJS 文件语法检查与范围内 `git diff --check` 通过；语言服务诊断为 **0 errors / 0 warnings**。没有执行完整 npm test、浏览器集成或性能采样，没有读取或清空玩家存档。

## 文件归属与提交

开始时 HEAD 为 `4c49ea1283c06e271ed39800ffe518d6fac8dfc2`。当时 `vehicle-app.js` 与 `joint-checkpoint-ui.js` 无工作区差异，读取后按版本哈希应用小补丁；提交前再次逐文件核对。

本批只纳入五个文件：上述两个源码、新测试、本记录、`docs/mcp-stability-plan.md`。提交名：`fix(lifecycle): cancel stale vehicle launches on pause and resume`。不整仓暂存，不推送，不改写历史；需要回退时应追加独立 revert，而非硬重置工作区。

排除所有 Boss/第二章、直升机原型与其文档，以及并行修改的 `app.js`、`mission-ui.js`、统一进度入口、README 和总体方案。不因这些文件存在于工作区，就将它们算作本批交付或验收。

## 待办与验收边界

1. VM、模拟 DOM 与规则测试不等于真实浏览器事件顺序验收。需在隔离配置中人工检查长按 Esc、失焦/回页、慢存储期间切换意图、重试后无残余开火；目前不能勾选四关连续试玩完成。
2. FPS 共享入口正在并行编辑，本批没有修改其暂停/异步进入游戏逻辑，也未完成九章入口全流程验证；待并行工作收尾后再做针对性审查。
3. 原生 IndexedDB、实际指针锁定/焦点竞态、音效听感与实机负载仍待验证；重型浏览器或性能测试必须另经用户同意。
4. 下一步优先进行低负载人工关键流程验收或协调 FPS 入口收尾，不扩展新玩法、不介入直升机、不自动启动全套回归。
