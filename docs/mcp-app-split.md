# app.js 拆分：装配壳 + 职责模块（第一、二阶段）

状态：两个阶段均已实施并验收，见第 5 节与第 7 节。基线提交 `52aa1c9`（用户本地改动整体入库），拆分在其上进行。

## 1. 动机与边界

`app.js` 是浏览器入口（`index.html` 唯一 `<script type=module>`），拆分前 982 行 / 110 KB、122 条 import。
它同时承担：DOM 骨架、按地图选世界、反应堆关卡几何、玩家/武器/任务的可变状态、输入、主循环、P4 接缝、测试探针。

约束：
- 行为零变化：不改任何数值、字符串、事件顺序；浏览器链（smoke 15 步、章节链）作为回归。
- 不引入新框架/构建步骤，仍是原生 ES module。
- 只搬「与可变会话状态耦合弱」的块；`update()`/`shoot()`/`reset()`/输入监听/P4 API 这类深度共享 `let` 状态的代码保留在 `app.js`，留待第二阶段（需要先把会话状态收敛为对象）。

## 2. 模块划分

| 新文件 | 职责 | 从 app.js 搬走的内容 | 导出 |
| --- | --- | --- | --- |
| `session-brief.js` | 纯数据：每张地图的行动简报（标题 / 简介 / eyebrow / topstat）与美术图章 | 原 `if(IS_STATION){$('#session-title')...}` ×8 与 `if(IS_x){stamp.innerHTML=...}` ×8 | `SESSION_BRIEFS`, `DEFAULT_BRIEF`, `briefFor(mapId)`, `stampFor(mapId)` |
| `session-chrome.js` | 会话 DOM 骨架与瞬时反馈：overlay、stamp、compass、toast、damage-screen、hitmarker、streak-banner、画质按钮及其计时 | overlay 构建、stamp/compass/toast/damage/hit 创建、`notify`、`showStreak`、主循环里的 toast/damage/hit/streak 衰减、罗盘刷新 | `createSessionChrome({mapId,document?})` → `{overlay,toast,compass,qualityButton,$,notify,noticeVisible,flashDamage,flashHit,showStreak,setHeading,update(dt)}` |
| `reactor-arena.js` | 第一章反应堆关卡几何（材质、围墙、走道、掩体、反应堆核心、灯） | `box/solid`、材质常量、`buildReactor()` 全部 | `buildReactorArena({scene,renderer,obstacles,playerCeilings})` → `{art,reactor}` |
| `map-world.js` | 按地图挑选 art / 首领世界 / 敌人导航 / 出生点 / 运输车，含首领事件→音效表 | 三段大三元表达式 + 三张 `sounds` 表 + 出生点三元 | `createMapWorld({scene,renderer,obstacles,playerCeilings,navigation?...,getPlayerFeet,play,notify})` → `{art,overseer,enemyNavigation,spawn,transport,hasBossRecord,reactor}` |
| `app-probes.js` | 仅测试用的 `window.__polarProbe/__datacenterProbe/__orbitalProbe` | 三行探针 | `installTestProbes(mapId,ctx)`，`ctx` 用 getter/setter 读写 app.js 的 `health/yaw/selected` |

`app.js` 保留：import 表、所有 `create*` 装配、会话状态、输入监听、`update/frame`、P4 API、菜单配置。

## 3. 关键接口决策

- **瞬时计时收进 chrome**：`toastTime/damageTime/hitTime/streakTime` 原来是 app.js 顶层 `let`，只在四处赋值、一处衰减。改为 `chrome.flashDamage()`（=.3s）、`chrome.flashHit(seconds)`、`chrome.notify(text)`（=3s）、`chrome.showStreak(step)`，衰减统一在 `chrome.update(dt)`。`weaponDrops` 的 `isNoticeVisible` 改读 `chrome.noticeVisible()`。探针继续读 `chrome.toast.textContent`。
- **map-world 的延迟依赖**：首领世界回调需要 `playerMotion.state.y`、`gameAudio`、`notify`，而 `playerMotion` 在 art 之后才能创建。保留原写法：传入 `getPlayerFeet:()=>playerMotion.state.y` 闭包，装配顺序与原文件一致（先 art → 再 playerMotion），不会触发 TDZ。
- **reactor 旋转**：主循环里 `if(reactor)reactor.rotation.y=...` 改读 `mapWorld.reactor`（非反应堆图为 `null`，与原 `let reactor=null` 语义一致）。
- **`$`** 仍由 chrome 暴露（`chrome.$`），app.js 里 `const $=chrome.$` 保持所有 `$('#...')` 调用不动。
- 去掉的死 import：`p4Damage`（仍用）、`cinderDamage`/`KILL_FX`/`WEAPONS`/`STAGES`/`incomingDamage` 等在 app.js 中 0 引用的名字**不动**——它们的 import 行仍在，避免与用户本地改动的阅读习惯冲突；留给第二阶段。

## 4. 验证

- `node --check` 全部新文件与 app.js；`get_diagnostics` 0。
- 新增 `test-session-brief.mjs`（rules）：9 张图都有简报与图章、`briefFor` 未知 id 回落默认、字段非空。
- 新增 `test-session-chrome.mjs`（rules，注入最小 fake document）：notify → 3s 可见；flashHit/flashDamage 衰减；streak 文案分档；setHeading 八向。
- 分层：check / rules / integration 全绿；浏览器：`test-smoke-browser.mjs` 15 步（覆盖 reactor 几何 + chrome）、`test-polar-browser.mjs` 与 `test-datacenter-browser.mjs`（覆盖探针与 map-world 选择）。

## 5. 验收记录（2026-09-20）

- 基线：`52aa1c9`（用户本地 80 个文件改动整体入库；含 `nul` 加入 `.gitignore`）。
- 结果：`app.js` 982 → 885 行；新增 `session-brief.js`、`session-chrome.js`、`reactor-arena.js`、`map-world.js`、`app-probes.js`；app.js 移除 24 条 world/nav import，新增 3 条。
- 源码接线：`node --check` 六个文件 OK；`get_diagnostics` 六个文件均 0。
- 规则：新增 `test-session-brief.mjs`、`test-session-chrome.mjs` PASS；分层 check 527/527、rules 124/124、integration 43/43（`--jobs 2`）。
- 浏览器（串行）：`test-polar-browser.mjs` 4/4、`test-datacenter-browser.mjs` 4/4、`test-orbital-browser.mjs` 4/4（覆盖探针、首领世界选择、出生点）。
- 浏览器 smoke：`test-smoke-browser.mjs` 13/15。失败两步「audio: unlock…」「settings: save hub…」在 `#menu-settings` 后等待 `#menu-audio [data-audio-bus=music]` / `#menu-save-hub [data-save-export]` 可见超时（元素存在但 hidden）。**用 HEAD 版 app.js 复跑结果相同 13/15**（日志 `.tools/split-smoke-head.log`），即失败来自基线里用户对 `menu-ui.js` 设置页的改动（设置页分组/分页），与拆分无关；九章 boot、start/pause/retry、journey 迁移、telemetry、vehicle 页均通过。该两步需要随设置页新结构更新测试选择器，未在本批处理。
- 未做：第二阶段（会话状态对象化、P4 桥、输入监听搬出、清理 0 引用 import）。

## 6. 第二阶段设计

第一阶段结论里「先把会话状态对象化才能搬流程/输入」被放弃：把 40 个顶层 `let` 全改成对象字段会触碰 `update/shoot/reset` 等 600 行热路径，回归面太大。改用**惰性访问器 `ctx`**：

```js
const ctx={get state(){return state;},set state(v){state=v;},get reset(){return reset;},...};
```

- `ctx` 在 `let gameMenu` 之后、所有 `const` 之前构造；getter 惰性求值，不触发 TDZ。
- 只暴露被搬出模块实际引用的 78 个名字（由 AST 扫描生成，非手写）；`let` 带 setter，`const`/函数只读。
- 被搬出的代码用 acorn 做**作用域感知**的标识符改写（`state` → `ctx.state`，简写属性 `{state}` → `{state:ctx.state}`；局部参数/声明同名者不改），文本其余部分逐字保留。

| 新文件 | 内容 | 对 app.js 的接口 |
| --- | --- | --- |
| `session-flow.js` | `saveCheckpoint/refreshJourney/openMenuChapter/startJourney/continueJourney/startSingleChapter/enterPlay/requestIntro/beginChapterIntro/continueCampaign/retryStage/startReplay`；私有 `navigating`、`introRequested` | `const flow=createSessionFlow(ctx)`；app.js 内 12 处调用改为 `flow.X`，菜单 `navigating:flow.navigating` |
| `session-input.js` | pointerlockchange / blur / mousemove / 画布 mousedown+leave / 捕获 keydown / 冒泡 keydown / keyup / mousedown / mouseup / contextmenu，顺序不变 | `bindSessionInput(ctx)` 放在原监听器位置 |
| `p4-bridge.js` | `p4API` 门面、`createP4Runtime`、`registerHit/hurt` 包装、boot 或 hub 链接 | `const p4API=createP4Bridge(ctx)`；**`p4API` 必须保留为 app.js 绑定**——`test-p4-browser.mjs` 会把探针追加到 app.js 末尾并按名字读 `p4API/enemies/loadout/overseer/p4/end/health/update/shoot` |

其它改动：`toastTime=.6`（交互提示短 toast）改为 `chrome.notify(hint,.6)`，`session-chrome.notify` 增加可选秒数参数。

## 7. 第二阶段验收（2026-09-20）

- 起点 `b9ed5f7`；用户同时在改 `reactor-arena.js`（GLTF/PMREM）、`index.html`（importmap）、`session-chrome.js`（`overlay.dataset.map`）、`app.js`（音频 update 参数）等，未提交；本阶段基于其工作树版本生成，未回退任何用户改动。
- 结果：`app.js` 885 → 757 行；新增 `session-flow.js`（84 行）、`session-input.js`（51）、`p4-bridge.js`（34）。
- 源码接线：`node --check` OK；`get_diagnostics` 四文件均 0；AST 自由变量扫描：四文件无未声明标识符。
- 规则：新增 `test-session-flow.mjs`（continue/start/replay/retry/navigating 守卫/journey 分支）PASS；check 533/533、rules 125/125、integration 43/43。
- 浏览器：smoke 13/15（与基线相同的两步 settings 选择器失败；`start / pause / retry loop`、九章 boot、journey 迁移、telemetry、vehicle 全过）；polar 4/4。
- 浏览器未通过且**与本阶段无关**：`test-p4-browser.mjs` 在 survival 模式等 `装备主武器` 按钮超时、`test-expedition-browser.mjs` 在 `#expedition-difficulty` 不可见超时——用 HEAD 版 app.js 复跑结果相同（日志 `.tools/s2-p4-head.log`、`.tools/s2-expedition-head.log`），来源是基线中用户的 UI 改动。p4 链在第一个断言前已通过 `__p4Probe.snapshot().state==='playing'` 与暂停/继续，说明 `p4-bridge` 接线正常。
- 过程中修过的两个生成器缺陷（已在最终版修复、由测试覆盖）：① `checkpoint` 作为 `requestIntro(stageIndex,checkpoint)` 参数名遮蔽了全局函数，首版把整块内的 `checkpoint()` 一律跳过导致 `ReferenceError`，改为按作用域链判断遮蔽；② `p4API` 首版未保留为绑定，P4 探针报 `p4API is not defined`。
- 未做：清理 app.js 中 0 引用 import（`p4Damage/cinderDamage/KILL_FX/WEAPONS/STAGES/incomingDamage/...`）；`update/shoot/reset/end/pause` 仍在 app.js（它们是会话状态的主要写入者，搬出前需要真正的状态对象化）。
