# P3 交付：先遣队第 6–8 关（风电场夺控 / 钻井平台突袭 / 雷达站攻坚）

日期：2026-09-19。范围：用户选定的“复用现有四种载具 + 步行”的三关，各三档难度、有效成绩、安全节点；同一战役完成全部 8 关授予“先遣队”称号。不含新载具、吊运/武装直升机、真人手感验收。

## 1. 新增 / 修改文件

- `frontier-site.js`：场地几何（8 座风机、3 道机组门、控制塔 + 坡道、风电场/机场/平台停机坪、钻井平台（`maritime-rules.js` 中的 `PLATFORM`）、雷达站围栏/大门/三座天线、机甲出生点）；`siteHeight` / `onControlTower` / `stepAllowed`（步行不可从塔顶直接跳下、只能沿坡道进出）；`SITE_VEHICLE_BOXES` / `SITE_HELI_OBSTACLES`；步枪 `createRifle` / `stepRifle`（8 发弹带、2.2 s 换弹、240 m 命中扫描，复用 `vehicle-weapons.js` 的 `hitscan/damageTarget`）。
- `frontier-missions.js`：三关规则（`windfarm-v1` / `platform-v1` / `radar-v1`）、难度 PROFILES、阶段表、敌对单位（哨戒机 / 平台炮塔 / 重型机甲）、`stepFrontierMission`、安全节点（`heli` / `clear` / `boss`）的生成 / 校验 / 恢复、`frontierSummary`、雷达标签。
- `frontier-world.js`：Three.js 场景（风机、塔、平台设施、雷达天线、敌对单位网格、停机坪）及雷达绘制。
- `maritime-rules.js`：新增 `PLATFORM` 甲板为可步行 / 可着陆表面（`isFootSurface/footHeight/landSurface`），`waterFree` 把平台视为障碍。
- `expedition-model.js`：`EXPEDITION_MISSIONS` 扩到 8 项，`EXPEDITION_FINAL=8`，`EXPEDITION_TITLE='先遣队'`，`expeditionTitleEarned`；第 6–8 关成绩要求阶段全部完成、用时小于时限、生命 > 0、敌对全部击毁。恢复的安全节点成绩仍记为 schema 2（检查点继续）。
- `expedition-ui.js` / `expedition-session.js`：第 6–8 关启动 / 恢复分派、`#expedition-title` 与 `data-expedition-title`。
- `vehicle-app.js`：`#frontier-panel` HUD、`.frontier-brief` 三个两次点击启动按钮、共享难度选择（`neon-eclipse.frontier-difficulty.v1`）、自由驾驶退出；步行步枪（左键）、车顶枪 / 机炮在任务中打向敌对单位；到达安全节点自动 `saveCheckpoint`；`resume()` 在第 6–8 关终态时拒绝恢复；R 回收在任务中禁用。
- `vehicle.html` / `vehicle.css`：面板与样式。
- 测试：新 `test-frontier-missions.mjs`；`test-expedition.mjs`（8 关排序 / 16 条成绩 / 称号）、`test-expedition-browser.mjs`（第 6–8 关）、`test-session-lifecycle.mjs`（frontier 终态）更新。
- `package.json`：`test:frontier-missions`。

## 2. 三关规则摘要

| 关 | 载具链 | 阶段 | 时限（易/普/难） | 安全节点 |
| --- | --- | --- | --- | --- |
| 6 风电场夺控 | 越野车 → 步行 → 直升机 | 穿越 3 门 → 塔下停车 → 登塔 → 步枪击落 4/5/6 架哨戒机 → 登机 → 离地 8 m → 飞回机场 → 着陆 | 600/480/360 s | 哨戒机清空（风电场停机坪） |
| 7 钻井平台突袭 | 直升机 → 步行 → 快艇 | 岸边登机 → 起飞 → 飞抵平台 → 着陆 → 步枪清除 3 座炮塔 → 安放炸药（75/55/40 s 引信） → 登快艇 → 逃出 110/130/150 m | 540/420/330 s | 炮塔清空（平台停机坪） |
| 8 雷达站攻坚 | 飞机 → 越野车 + 步行 | 飞机机炮摧毁 3 座天线 → 越野车抵达大门 → 重型机甲（500/700/900 HP）追击，车顶枪 + 步枪击毁 | 720/600/480 s | 天线摧毁（大门） |

失败：生命归零、时限、直升机坠毁 / 飞机坠毁、引信到时仍在危险区。

## 3. 验收

- 源码接线：`vehicle-app.js` 直接调用上述模块（无夹具分支）；`get_diagnostics` 对 8 个改动文件均为 0。
- 规则层：`test-frontier-missions.mjs` 以真实 `stepRover/stepHelicopter/stepYacht/stepPlane` 物理跑完三关（含失败路径：引信、坠毁、生命、时限），安全节点创建 / 校验 / 恢复，8 条成绩战役 + 称号。`test-expedition.mjs` 8 关排序、双战役 16 条成绩、第 9 关不存在。
- 浏览器层：`test-expedition-browser.mjs` 第 6 关真实规则从 snipe 推进到 heli 安全节点 → 失败保留节点 → 恢复（直升机停在风电场停机坪 (40,-360)）→ 恢复通关单独计数；第 7 关无效成绩拒绝、直升机停岸边停机坪；第 8 关单项启动脱离战役；8 关后 `data-expedition-title=true` 且刷新后保留；窄屏无横向溢出。
- 手动 / 截图：`docs` 外 `.tools/b10-windfarm.png`（风电场任务启动后 HUD、任务卡、雷达），无 pageerror。真人手感、平衡性未验收。
- 全量 `--layer all`（jobs=2）：483/483 check、113/113 rules、42/42 integration；browser 56/70。浏览器失败分类：
  - `test-expedition-backup-browser` / `test-expedition-checkpoint-browser`：文案 `n/5` → `n/8`，已修并单独重跑通过。
  - `test-helicopter-browser`、`test-handling-browser`：全量并发下失败（音频 `suspended`、时序），单独串行重跑通过。
  - `test-naval-browser`、`test-sea-combat-browser`：本批前 HEAD `939bd1c`（`git stash` / 独立 worktree）同样失败（快艇在检查点 1 附近被拦截艇击沉、`sawOne` 未出现），非本批引入；`chase-rules.js` 已把钻井平台四角加入海上寻路节点以免夹具撞平台，但失败根因待查，保留记录。
  - `test-destructible/difficulty/halo/link-route/ordnance/railspike/tempest/volt-browser`：FPS 侧，工作区同时存在另一会话对 `app.js` / `weapons/*` 的未提交修改，不属于本批范围，未处理。

## 4. 调试中修正的问题（保留）

- 风机 (30,-430) 落在门 2→3 直线上、控制塔挡在门 3 与塔脚之间：调整风机布局和第 3 门坐标，测试改为绕塔东侧路点停车。
- 直升机 `brake` 会把垂直速度目标置零，边刹车边下降无效：测试自动驾驶改为先刹停再单独下降；`lift:-1` 落地不带 brake。
- 平台系泊点 (395,60) 距平台 130 m 逃离圈太近且步行上艇点在水中：改为 (393,60) 朝西，`yachtExit` 落在甲板 (402,60)。
- 恢复第 6 关节点时 `hostiles` 为空导致通关成绩被判无效：`restoreFrontierCheckpoint` 现在带上已清空的哨戒机列表（规则测试已加断言）。
- `resume()` 未把第 6–8 关终态计入，导致会话生命周期测试 2 例失败：已补。

## 5. 未做

- 真人手感 / 难度平衡；机甲仅追击 + 直射，无寻路；哨戒机无还击以外行为。
- 平台甲板与直升机机体、步行者的精细碰撞；步枪无独立音效。
- 称号仅在先遣队面板显示，不进入 P4 元游戏档案。
