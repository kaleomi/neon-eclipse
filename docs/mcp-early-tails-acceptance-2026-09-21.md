# 第 1–3 章 Boss 后尾段原生连续验收（2026-09-21，MCP 自动化）

> 最新状态见文末“追加：原生前段与塔楼默认尾程”及 `docs/mcp-native-early-fronts-2026-09-21.md`。下方旧的未完成项／shim 描述保留为历史批次记录。

## 结论
新增 `test-early-tails-browser.mjs`（Playwright + 软件 WebGL，隔离浏览器上下文，不触碰真实存档），把第一章反应堆 WARDEN、第二章车站 SWITCHYARD、第三章屋顶 OVERSEER 的"Boss 后尾段"从夹具摆位升级为原生连续路线，三章均 PASS：

| 章节 | 原生 Boss 击破 | 真实检查点 retry（stage 4） | 原生击杀撤离守卫 | 步行到撤离点 | 中断负例 + 真实 E 保持 → won | 结果 |
|---|---|---|---|---|---|---|
| 01 反应堆 WARDEN（hp1000） | 步枪保持距离（<9m 即后撤）+ 连续侧移，非暴露 0.55x/暴露核心 2.5x 全部原生结算，boss 死亡时 health 100 | ✔ 位置/血量与存档一致，守卫重建 | 4 名（grid spawns） | (0,-10)…(0,32) | ✔ | PASS kills=5 health=100 |
| 02 车站 SWITCHYARD（hp1200） | 先步行进入调度防守区触发 Boss（防守进度为预置夹具，见边界）；每轮：等 warning>3.6s → 步行到道岔 (28.7,z) → 真实 E 保持 0.7s 布置 → 撤到 (24.5,-15) 避开爆破区 → 列车过车暴露 6s → 步行回 (24.5,-25) 刀击核心；两轮暴露内 coreDamage=1200 | ✔ | 4 名 | 经闸门 (8,-28) 到 (-22,-28) | ✔ | PASS kills=5 health=81 |
| 03 屋顶 OVERSEER（hp1920） | 步枪打两座节点（LOS 不足时自动挪位）→ 暴露 8s 内近身刀击核心，电弧 warning 末段 Space 起跳躲避；Boss 死后真实 E 保持 2.2s 开启上传 → 原生守住 20s 防守（3 名防守者自然击杀） | ✔ | 5 名 | (0,-20)…(0,32)，沿 x=0 穿过 z=-8 与 z=22 墙缺口 | ✔ | PASS kills=9 health=68 |

日志：`.tools/early-tails-reactor.log`、`.tools/early-tails-sr.log`（station）、`.tools/early-tails-roof.log`；截图 `.tools/qa-early-tails/{reactor,station,roof}-extraction-won.png`。
运行方式：`TAIL_MAPS=reactor,station,roof TAIL_SCREENSHOTS=.tools/qa-early-tails node test-early-tails-browser.mjs`（`TAIL_MAPS` 可单选；串行运行，单章约 1.5–4 分钟）。

## 本次发现的阻断性生产缺陷（未修改，需归属会话处理）
- **`weapon-models.js:124` 引用未声明的 `grips`**（`grips[0]=hands[0];…` 然后传给 `attachPlayerArmsViewModel`），`createWeapons()` 抛 `ReferenceError: grips is not defined` → **游戏在浏览器中完全无法进入游玩**（菜单不出现），任何浏览器层测试都会失败。文件 mtime 04:39，同期还有 `characters/player-arms*.js`、`test-player-arms.mjs`（04:49）在改动，判断为并行"玩家手臂视图模型"会话的进行中修改，**本会话未改动该文件**。
- 为了不阻塞本次验收，`test-early-tails-browser.mjs` 只在检测到该确切缺陷模式时于路由层临时补 `const grips=[]`（打印 `SHIM …` 警告；生产文件不动；缺陷修复后自动无效）。**这不是修复**：在该行修正前，主回归与真实游玩仍会失败。

## 边界（如实）
- 三章均从**阶段 3 受控起点**开始，并清掉阶段 3 初始守卫（反应堆保留 WARDEN 本体）；第二章调度台防守进度预置为 17.95/18 让 Boss 立即激活（与既有 `test-switchyard-browser.mjs` 夹具一致）。不是自然整章通关。
- 瞄准由脚本计算（`face()` 解析式 yaw/pitch，并用 `getWorldDirection` 校验），步进为逐 tick 受控推进；伤害/护盾/暴露窗/列车/爆破/电弧/检查点/守卫生成/撤离门禁全部走生产逻辑。
- 软件 WebGL（SwiftShader）只证明逻辑，不证明真实显卡帧率；无实体手柄；无人耳试听。
- 第四章塔楼 ELEVATOR：既有 `test-elevator-browser.mjs` 已是原生击破 + 真实 cp retry；**尾段（从 6m 层下到大厅再步行到 (-25,16) 撤离）仍是夹具摆位**。升降机是"呼叫式"（`elevator-lift.js` 只能 request 到呼叫点所在层），Boss 死后从 6m 下行需经 `ELEVATOR_BRIDGE` 回核心层再走原始楼梯/东侧维护升降机，本批未取到楼梯几何，未做。
- 各章**前段目标与防守战**（阶段 0–2）仍未做原生覆盖。

## 未完成清单（下一批默认）
1. 第四章塔楼尾段原生下楼 + 步行撤离（需读 `tower-world.js`/`tower-lift.js` 楼梯与维护升降机几何）。
2. 第 1–4 章前段目标（阶段 0–2）与防守战原生覆盖。
3. 等并行会话修复 `weapon-models.js` 的 `grips` 后，去掉 shim 依赖并重跑主回归 `node scripts/run-tests.mjs`（当前浏览器层必然失败）。
4. 必须用户实机：真实显卡帧率、实体手柄、耳机/扬声器听感、提交/打包/发布授权。

## 追加（同日续批）：第 4 章塔楼尾段原生化进度
- `grips` 阻断已由归属会话修复（`weapon-models.js:124` 现为 `const grips=hands.slice();`），浏览器层可正常启动；`test-early-tails-browser.mjs` 里的 shim 已自动失效。
- `test-elevator-browser.mjs`：
  - 修复一处启动竞态：`goto(?map=tower&menu=chapter)` 后先等 `menuOpen==='true'` 再点 `#deploy`（此前直接点击已开始超时）。
  - 新增夹具方法 `face/walkTo/guardAim/missionAim` 与快照字段 `count/rounds0`；新增 **`ELEVATOR_NATIVE_TAIL=1`** 分支：真实 cp retry 后不摆位，从 6 m 平台西缘走出（6 m 处 x<21 无楼板）**自然坠落到大厅 0 m**（落地 grounded、health 100，无坠落伤害）→ 原生枪击撤离守卫。已验证到：坠落落地、4 名守卫中 2–3 名原生击杀（`.tools/elevator-native-tail.log`）。
  - **未完成**：剩余守卫不进入视线时的接近步行在 (9.6,8.5) 附近撞到室内几何（`TOWER_WALLS` 的 `[-1,1].map(sign=>…)` 内墙未读取），以及到 (-25,16) 的路线 [[8,5],[-4,9],[-14,12],[-25,16]] 未验证。默认（不设该 env）仍走文档化摆位尾段，`node test-elevator-browser.mjs` 5/5 PASS，EXIT 0（`.tools/elevator-default.log`）。
  - 下一步：读 `tower-data.js` 第 13 行内墙定义，改接近/撤离路线绕开内墙后把 `ELEVATOR_NATIVE_TAIL` 变为默认。

## 交接记录（2026-09-21 末次尝试后）
- 塔楼原生尾段（`ELEVATOR_NATIVE_TAIL=1`）三次运行一致：坠落落地正常、守卫原生击杀 2–3 名，但**地面层 x≈9.55、z∈[-4,8.5] 存在一道不可见的竖直阻挡**（三次都停在 x=9.54–9.59，z=-4/5/8.5），从升降机竞技场落地点无法向西步行进入塔内。这与电台提示"原路下楼，或从东侧升降机返回地面"一致：设计路径不是从竞技场地面向西走。
- 建议路线（未验证）：Boss 死后留在 6 m 平台 → 走 `ELEVATOR_BRIDGE`（z=6，x 21.5→15）→ 6 m 核心层楼板 x≤12（中间 3 m 空隙，需确认能否冲刺跳过或桥实际连通）→ 第二段楼梯 x -0.25→-5.75 下到 3 m → 3 m 层向西 → 第一段楼梯 x -12.25→-17.75 下到 0 m → 穿 x=-19.2 门洞（z∈(-3,3)，楼梯旁 z≈±2.25 的 1.5 m 空带）→ (-25,16)。楼梯均为 `walkStep:true` 的 0.25 m 台阶，可直接步行。
- 默认运行仍为夹具尾段，`node test-elevator-browser.mjs` 5/5 PASS；`.tools/elevator-native-tail.log` 为最近一次原生分支失败日志。

## 追加：原生前段与塔楼默认尾程（2026-09-21）
- `test-elevator-browser.mjs` 已按“6 m 平台 → 战斗升降台 → 桥 → 冲刺跳过 x=15→12 → 核心层 → 6/3/0 m 楼梯 → x=-19.2、z≈2.25 门洞 → (-25,16)”通过。已移除 `ELEVATOR_NATIVE_TAIL` 和摆位撤离回退；默认复跑 `ELEVATOR_DEFAULT_EXIT=0`，原生击杀 4 名撤离守卫后 won，kills=5、health=100。尾程开始后 `place/clearGuards` 被锁定。
- 新增 `test-early-stages-browser.mjs`：第 1–4 章均已有从真实部署入口开始的阶段 0–2 原生专项 PASS；反应堆 25s 防守、车站／塔楼 18s Boss 前防守、屋顶双中继、半径负例、塔楼错误楼层负例均覆盖。没有阶段 reset／摆位／清敌／血弹注入／防守进度预置。仍有脚本瞄准、只读路点规划和受控 tick；前段与 Boss 尾程不是同一局自然通关。
- 已删除 `test-early-tails-browser.mjs` 中失效的 `grips` 临时 shim；生产文件未改。
- 原串行回归结果现已全部取回：默认塔楼 `ELEVATOR_DEFAULT_EXIT=0`、四章同版本前段 `EARLY_FRONTS_EXIT=0`、无 shim 三章尾程 `EARLY_TAILS_NO_SHIM_EXIT=0`。主回归语法 656/656、规则 134/135、集成 63/66，`MAIN_REGRESSION_EXIT=1`，整轮 `NATIVE_EARLY_FINAL_EXIT=1`。四个失败入口为 `test-import-graph.mjs`、`test-ground-audio-feedback.mjs`、`test-naval-manual-aim.mjs`、`test-vehicle-models-refined.mjs`；本轮未改这些模块／测试，也未为消红暂存、提交或重置他人工作。
- MCP 曾返回 HTTP 502、未返回 command_id；当时停止新增执行。随后只读恢复，以上结果均来自原命令，没有重发。**默认下一步：暂停扩展，将四项主回归失败交归属会话／用户确认；处理后串行复验，再考虑前段→Boss→尾程同局串联。** 完整证据、失败定位、诚实边界和 ABYSS 归属会话提醒见 `docs/mcp-native-early-fronts-2026-09-21.md`。
