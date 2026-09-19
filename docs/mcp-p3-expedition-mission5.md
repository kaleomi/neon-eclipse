# P3 第 5 关：灯塔岛登陆（先遣队第五关接入）

> 状态入口仍是 `docs/mcp-project-status-roadmap.md`；本文是本批次的实现与验收记录。总体方案见 `docs/mcp-full-development-plan.md` §7.5。

## 1. 范围与取舍

- 接入先遣队第 5 关“灯塔岛登陆”：游艇码头登船 → 驶向东南灯塔岛（`ISLANDS[1]`，x 500 / z 260）北侧浮桥停稳 → E 下船、沿浮桥步行上岛 → 三处按住 F 清点 → 回船返港停稳下船。8 个阶段、三档难度（时限 480 / 360 / 270 秒，清点保持 1 / 1.5 / 2 秒）。
- 原方案第 5 关的“直升机撤离”**未接入**：`helicopter-*.js` 仍是独立场地（`helicopter-world.js` 自带 270×270 地面/山体，不能直接放进试验区），本批返程仍由游艇完成，界面文案已明说。直升机并入试验区、第 6–8 关、完整“先遣队”称号均未实现。
- 第 5 关**没有安全节点**：失败或中止后从码头重来。这样不必为登岛路线新增检查点模板；先遣队的“从安全节点继续”按钮对本关不可用（session 逻辑不变）。
- 先遣队档案规则 id 保持 `front4-v1`、schema 2 不变，旧四关档案原样可读；关卡数量改由 `EXPEDITION_MISSIONS.length`（`EXPEDITION_TOTAL`=5）派生，`EXPEDITION_FINAL`=8 只用于文案。第 5 关是“可选难度关”，锁定战役难度（与第 1、2 关同一档），`validExpedition` 的同战役难度一致性检查改为对所有 `selectable` 关生效。

## 2. 改动文件

| 文件 | 改动 |
| --- | --- |
| `maritime-rules.js` | 新增 `LIGHTHOUSE_ISLAND`、`ISLAND_PIER`（x 496–504 / z 204–240，沿 z 从水面 0.85 抬升到岛顶 9）、`LIGHTHOUSE_LANDING`（x 491 / z 216）；`isFootSurface` 接受浮桥与岛顶（半径 ≤ 0.78 r），`footHeight` 返回岛顶/浮桥坡度高度，`waterFree` 把浮桥当障碍。 |
| `lighthouse-mission.js`（新） | 纯规则：`LIGHTHOUSE_PROFILES/POINTS/STAGES/LABELS`、`createLighthouseMission(difficulty,active)`、`stepLighthouseMission`（阶段机、保持计时、超时失败、暂停冻结）、`lighthouseGoal`、`lighthouseBoardAllowed`（只允许游艇）、`lighthouseSummary`、`onIslandTop/onPier`。 |
| `lighthouse-world.js`（新） | 浮桥、灯塔塔身/红环/旋转光束、三处清点道具（常驻），阶段标记（仅任务中显示）。 |
| `vehicle-app.js` | 导入并创建 `lighthouse` 状态；`recover/resume/armed`、登船限制、R 回收屏蔽；`startLighthouse/finishLighthouse`、独立面板按钮与难度选择（`neon-eclipse.lighthouse-difficulty.v1`）；先遣队 `launchExpeditionMission` 的 `lighthouse` 分支（无节点恢复）；物理步进、HUD（`#lighthouse-panel`、目标/进度条/提示）、`data-lighthouse-*`、引导标记、世界更新。 |
| `vehicle.html` / `vehicle.css` | 第 5 关简介与按钮、状态面板（复用护送面板样式）。 |
| `expedition-model.js` | 第 5 关条目 `lighthouse-v1`、`EXPEDITION_TOTAL/FINAL`、证据分支（profile 匹配难度、`stage==='complete'`、`surveys===3`、8 阶段顺序、`elapsed<timeLimit`）。 |
| `expedition-session.js` / `expedition-ui.js` / `expedition-backup.js` / `expedition-backup-ui.js` | 去掉硬编码 4 / “前四关”，进度条、状态、备份摘要（`completed/total`）按关卡数派生。 |
| `test-lighthouse-mission.mjs`（新） | 岛顶/浮桥地表、坡度单调、浮桥挡船、停靠点可下船并可再登船、真实步行从浮桥脚走上岛顶、120 Hz 全阶段生命周期与保持/顺序/暂停/超时、证据拒绝、真实游艇物理三航点无碰撞抵达并可下船。 |
| `test-expedition.mjs` | 五关顺序、第六关不存在、第 5 关难度锁定、分组统计 10 条。 |
| `test-expedition-browser.mjs` | 第四关后继续按钮可用；第 5 关原生从码头启动（战役难度 hard 覆盖单项偏好 easy）、失败不推进、无效证据拒绝、单项模式脱离战役、通关推进到 5/5、“第 6–8 关未开放”、刷新后记录保留。 |
| `test-expedition-backup-browser.mjs` / `test-expedition-checkpoint-browser.mjs` | `2/4`、`0/4` → `2/5`、`0/5`。 |
| `test-session-lifecycle.mjs` | 夹具补 `lighthouse` 状态与 `createLighthouseMission`，终态阻止 resume 的循环加入 `lighthouse`。 |

## 3. 验证结果

- 诊断：以上源文件 `get_diagnostics` 0。
- `node scripts/run-tests.mjs`：check 464/464、rules 107/107（新增 `test-lighthouse-mission.mjs`）、integration 42/42。
- 浏览器（串行）：`test-expedition-browser.mjs`、`test-expedition-backup-browser.mjs`、`test-expedition-checkpoint-browser.mjs` 均 EXIT=0，页面无错误。
- 一次性探针（未入库）：路由注入夹具把任务置于登岛阶段并截图，确认 HUD 标题“灯塔岛登陆”、目标“清点点 1 … 27 m”、进度 3/8、右侧 LANDING 面板、灯塔与阶段标记渲染正常；步行 6 秒沿浮桥前进无报错。

## 4. 首轮失败记录（已修）

1. 浮桥最初放在岛西侧、沿 x 抬升：`seaPath` 静态可视图的岛周节点被浮桥挡住，`test-chase.mjs`/`test-handling.mjs` 断言路径为空。改到岛北侧沿 z 抬升（x 496–504）后追逐路线恢复。
2. 停靠点 `x 490` 时 `yachtExit` 五个候选点都落不到浮桥；改为 `x 491 / z 216` 后可下船。
3. 测试自身：初始玩家放在栈桥上导致“先走到栈桥入口”断言写反；`isFootSurface(I.x-I.r-2)` 取到浮桥上。均为测试修正，不是规则改动。
4. `test-session-lifecycle.mjs` 的 VM 夹具未定义 `lighthouse`，`resume/recover` 抛 ReferenceError；补夹具。

## 5. 未完成 / 边界

- 终态夹具不是真人通关；`test-lighthouse-mission.mjs` 里的游艇航行与步行是真实物理，但清点/返港由同一测试用瞬移位置驱动。
- 无直升机、无第 5 关安全节点、无第 6–8 关、无“先遣队”称号；`EXPEDITION_RULE` 未升版。
- 岛顶可走半径 0.78 r 是近似圆柱台面（渲染为 0.85 r 顶面）；灯塔塔身不是碰撞体。
