# P3 第三批交付：先遣队第 2 关「南湾突围」检查点

日期：2026-09-18
依据：`docs/mcp-full-development-plan.md` 第 7.5 节第 2 关——"南湾突围（已有海战，加入检查点）"，以及 7.6 验收"检查点恢复不影响原单项成绩；刷新恢复浏览器测试"。P0 / P1 / P2 由其他 AI 负责，本批只接手 P3 载具域源码，不制作 EXE。前两批见 [P3 车载武器与耐久交付](mcp-p3-vehicle-weapons.md)、[P3 车队护送交付](mcp-p3-convoy-escort.md)。

## 交付边界

**这是 P3 的第三批，不是整个 Phase 3 完成。** 计划对第 2 关的要求只有"给已有海战加入检查点"，本批严格按此做：海战规则、敌艇 AI、难度数值、舰炮一律未改。7.3 直升机、7.4 流式、7.5 第 3 关及以后（回声航线 / 海空接力已有任务的战役串联、成绩、称号）均未开始。

本批完成：

- **每过一个检查点自动保存安全节点**（北上水道 / 绕过北岛 / 外海折返 三个）。节点只记录：检查点序号、难度、当时船体百分比（向上取整）、已用时、保存时间、是否为恢复轮。**不保存实时位置、速度、敌艇状态或弹道。**
- **从节点恢复**：游艇重置到该检查点后方约 25 m、朝向下一航点的预设位置；追击艇重置到约 145 m 后方（有视线）、拦截艇重置到约 150 m 侧翼，全部满血、静止；沿用难度的起步缓冲（3～4 s）后才开始追击。任务计时、船体从节点数值继续；恢复的一轮标记为"检查点继续"，结算面板与 HUD 难度栏均显示该标记。
- **节点生命周期**与海空接力一致：新任务到达检查点后才替换旧节点；撤离成功后关闭本轮节点；失败保留节点可继续；中止返回自由试驾保留节点；刷新页面后仍可恢复。
- **暂停菜单新增"南湾突围 · 安全检查点"面板**：状态、从节点继续、重试未完成保存、读取最新检查点。
- **检查点存储层泛化**：`joint-checkpoint-store.js` 抽出 `createCheckpointStore({dbName,valid,canonical})`，`joint-checkpoint-ui.js` 抽出 `bindCheckpointUI({store,prefix,fromMission,label,channelName,...})`；原 `createJointCheckpointStore` / `bindJointCheckpointUI` 保留为薄封装，行为、数据库名、DOM id、事件频道均未变。

## 与既有任务的关系

| 项目 | 规则 |
| --- | --- |
| 海战规则 / AI / 数值 | **未改**。`chase-rules.js`、`naval-mission.js`、`sea-combat.js`、`naval-settings.js` 一字未动；`createNavalRun` 只是在 `createNavalMission` 外加 `runId` / `recovered` |
| 起步 | 起点不是安全节点；从头开始的一轮在过第 1 检查点前没有节点 |
| 海空接力检查点 | 不同数据库（`neon-eclipse.naval-checkpoint.v1` vs `neon-eclipse.joint-checkpoint.v1`）、不同广播频道、不同面板；两套校验器互相拒绝对方节点 |
| 飞行成绩 / 战役存档 | 不读不写 |
| 难度设置 | 节点内含难度；恢复时用节点难度，不受当前下拉选择影响 |
| 回收 / 试验调度 / 开始其他任务 | 结束当前一轮，不删除已保存节点 |

## 源码改动

新增：

- `naval-checkpoint-model.js` — 节点定义、校验、`createNavalRun`、`navalCheckpointFromMission`、`restoreNavalCheckpoint`（模板恢复）、`createNavalCheckpointStore`（纯模型 + 存储工厂）
- `test-naval-checkpoint.mjs`（rules 层自动发现）
- `test-naval-checkpoint-browser.mjs`（browser 层，可选）

修改：

- `joint-checkpoint-store.js` — 抽出通用 `createCheckpointStore`；`createJointCheckpointStore` 保留
- `joint-checkpoint-ui.js` — 抽出通用 `bindCheckpointUI`；`bindJointCheckpointUI` 保留
- `vehicle-app.js` — 开始任务先登记 run、过门时 `save`、胜利时 `complete`、恢复回调、结算文案、`data-chase-recovered` / `data-chase-run-id`
- `vehicle.html` — 南湾突围检查点面板、免责文案

未改：`chase-rules.js`、`naval-mission.js`、`sea-combat.js`、`naval-settings.js`、`joint-checkpoint-model.js`、`joint-mission.js`、`vehicle.css`（复用 `.chase-brief` 样式）、`package.json`、`scripts/run-tests.mjs`、`app.js`、`combat.js`、`audio/`、`weapons/`、`menu-ui.js`、`maps/`。无新增运行时依赖。

## 主要参数

| 项 | 值 |
| --- | --- |
| 节点 | `gate-1` (334,-86) / `gate-2` (526,-345) / `gate-3` (531,91)，游艇朝向下一航点 |
| 追击艇复位 | 节点后方 131～146 m，与游艇有水面视线 |
| 拦截艇复位 | 侧翼约 150 m（简单档无拦截艇） |
| 起步缓冲 | 难度 `headStart`（简单 4 s / 普通、困难 3 s），从恢复时刻起算 |
| 校验 | `schema 1`、`rule naval-v1`、runId 16～96 字符、难度三档之一、`elapsedMs` < 该难度时限、`hull` 1～100 整数 |
| 数据库 | `neon-eclipse.naval-checkpoint.v1`（IndexedDB，单行 CAS，与联合任务同一实现） |

## 验证结果

### 远端全量默认测试：通过

`npm test`（命令 `cmd_80a684185f86780e614c82fb75bb51e85e6fe10bd7af31ca`，退出码 0）：

- check：**235 / 235**
- rules：**64 / 64**（`test-naval-checkpoint.mjs` 被自动发现；其余增量来自其他 AI 的同期提交）
- integration：**12 / 12**

编辑器诊断（7 个改动 / 新增文件）：**0 error / 0 warning**。

### 规则专项（`test-naval-checkpoint.mjs`）

三个模板全部落在开阔水面、追击艇有视线、敌艇在 120 m 火力圈外、游艇已在门后；起点无节点、每过一门恰好一个节点、终点后无节点、船体 0 / 计时到期 / 已结束不生成节点；13 组篡改字段全部被拒且不可恢复；恢复不读坐标、生成新 runId、敌艇满血静止、暂停冻结、简单档只有一艘；起步缓冲期内敌艇不动；**从三个节点恢复后，普通档在 30 / 60 / 120 Hz 全部用与 `test-naval.mjs` 相同的自动驾驶通关**，并保持 `recovered=true`；两套存储互拒对方节点，`unavailable` / `denied` 错误码保留。

### 浏览器（`test-naval-checkpoint-browser.mjs`）：通过

命令 `cmd_bc02cca94898b1d54629d50a2c850508b8d2d179838feb95`，1/1。真实 WebGL 页面、真实键盘、隔离上下文里的真实 IndexedDB：开始任务前无节点 → 两步确认开始、暴露 runId → 键盘自动驾驶过第 1 检查点 → 面板无需手动刷新即显示节点 → Esc 中止返回自由试驾 → **整页刷新**后节点仍在、可恢复 → 恢复后在第 1 检查点、新 runId、游艇落在模板位置（误差 <2 m）、HUD 显示"检查点继续"、船体与计时从节点继续 → 战役键未动、联合任务节点为空 → 960 / 390 宽度无横向滚动。

### 既有回归

| 测试 | 结果 | 命令 |
| --- | --- | --- |
| `test-joint-checkpoint.mjs`（rules，走泛化后的存储） | 通过（含于 `npm test`） | `cmd_80a684185f86780e614c82fb75bb51e85e6fe10bd7af31ca` |
| `test-joint-checkpoint-browser.mjs`（走泛化后的存储与面板控制器） | 1/1 通过 | `cmd_ad78ab5679d892a4d2de73aaa4a92a0182ea5a9fa7aaac6d` |
| `test-checkpoint-failure-browser.mjs` | 1/1 通过 | 同上 |
| `test-chase-browser.mjs`（键盘全程通关） | 1/1 通过 | `cmd_af3c916838830d181d6f0172fd9a5006a278831392b8edf2` |
| `test-naval-browser.mjs`（双艇 F/Q 交战全程） | 1/1 通过 | 同上 |

调试记录：`test-chase-browser` / `test-naval-browser` 第一次复跑报 `'active' !== 'won'`，是两条重型浏览器测试在同一命令里并行、软件 WebGL 下模拟速率降到约 0.8×，超出测试自带的 170 s 通关期限；用 HEAD 版本 `vehicle-app.js` 同环境复现相同现象，串行复跑两者均通过（本批版本 57 s 墙钟通关）。不是本批改动导致。

### 未完成的验证

- 未复跑 `test-sea-combat-browser.mjs`、`test-vehicle-*-browser.mjs`、`test-escort-browser.mjs`（本批未改这些路径的规则与 DOM，只在 `vehicle-app.js` 海战分支加了保存钩子）。
- 未做真人体验：恢复后敌艇 145 m 后方 + 起步缓冲是否"太轻松"没有遥测；模板位置是按航线几何算的，不是手调。

## 已知限制

- 节点只在过门时保存，门与门之间失败必须从上一门重来；撤离阶段（第 3 门之后）没有节点。
- 恢复后敌艇是全新的：之前打掉的敌艇会回来，之前的舰炮命中数清零；这是"只存模板"的代价，也避免了反序列化敌艇状态。
- 恢复的一轮不计为完整一命；目前海战本身没有成绩档案，所以"不影响原单项成绩"只体现在标记与结算文案。
- 与联合任务相同：多标签页并发写入按 CAS 拒绝，需手动"读取最新检查点"。

## 下一批方向

继续 P3：7.5 第 3 / 4 关（回声航线、海空接力已有任务，主要工作是战役串联与成绩），或 7.3 直升机（新载具与飞行模型，需 30/60/120/144 Hz 一致性测试），按用户选择。
