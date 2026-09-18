# P5 第一批交付：第七章「轨道电梯基座」（O-07）

交付日期：2026-09-18。设计稿见 `docs/mcp-chapter-07-design.md`，本文记录实际落地内容、与设计稿的差异、验证结果与未完成项。

## 1. 交付范围

- 新章节 `orbital`（O-07 / 轨道电梯基座 / ORBITAL TETHER BASE），接入地图注册表第七位；单章模式、连续战役、阶段训练、检查点、星星、单章成就、SaveHub、菜单卡片与关卡菜单全部可用。
- 三段重力场：脚高 `<3.5 m` 为 1.0 g（20 m/s²）、`<7.5 m` 为 0.65 g（13）、其余 0.4 g（8）。跳跃峰值分别约 1.41 / 2.18 / 3.57 m；后坐倍率 1 / 1.25 / 1.5。屏幕上方始终显示当前重力段（金/青/紫三色）。
- 空间：76×76 基座，中央 6×6 立柱，4 m 一号环与 9 m 二号环，西侧金色台阶 0→4 m，一号环南段东端台阶 4→9 m。四处地面配重着陆区（琥珀预警 2 s → 红色 0.6 s 落地 14 伤害，周期 7.5 s 错相）。
- 五阶段：解除门禁（0 m）→ 稳定环供电（4 m）→ 守住锚索校准（9 m，18 s，8 m 半径，第 9 s 增援）→ 击破 TETHER → 返回升降平台撤离。
- Boss「TETHER 锚定核心」：1600 HP，三个 90 HP 稳定器分别位于 0 / 4 / 9 m 三个重力段，全部击破后核心暴露 8 s，之后稳定器重生。重力脉冲：休止 2.0 s（半血后 1.4 s）→ 预警 1.6 s → 释放 0.5 s，锁定预警时玩家所在重力段（半血后同时锁定相邻两段），仅命中释放期间站在该段地面上的玩家（18 / 22），起跳滞空即可躲避。
- 新敌人：蜂群无人机（橙色，34 HP，速度 4.4，3 伤害，突击行为）与狙击守卫（紫色锁定线 1.6 s，58 HP，16 伤害，62 m 射程，远程行为）。
- 隐藏星星：二号环北缘起跳，经 (0,-19) 10.2 m 与 (0,-24) 11.4 m 两块平台抵达；测试证明同一跳在 1 g 下无法完成。

## 2. 与设计稿的差异

- 一号环西/东段宽度由 8 改为 10（内缘 3 m 贴合立柱），二号环南段延长为 18 m 并新增东侧 4×8 m 落脚平台 `ORBITAL_LANDING`，以便第二段台阶（x 14.75→5.25）在 4 m 环上有起点、在 9 m 环上有落点。
- 阶段入口 3 从 (-16,0) 改到 (-24,0)（原坐标压在台阶上）；撤离阶段两处地面刷新点内移到 (±18,18)。
- 蜂群无人机蓄力 0.45 s（设计 0.35）：现有 `test-enemies.mjs` 要求所有敌人 telegraph ≥ 0.45 s，本轮遵守而不是放宽该可读性下限。
- 数据碎片、轨道电梯乘坐演出维持不做。

## 3. 共享代码改动（全部向后兼容）

| 文件 | 改动 |
| --- | --- |
| `player-motion.js` | `createPlayerMotion(..., {gravityAt})` 可选钩子；未传时与原逻辑逐字节一致 |
| `combat.js` | `shot(weapon, random, scale=1)` 后坐倍率 |
| `mission.js` | 刷新点支持 `{x,z,feetY}` 对象（原 `[x,z]` 保留） |
| `enemy-rules.js` / `enemy-ai.js` | 新增 `drone`、`sniper`；`behavior` 字段 + `enemyBehavior()` 复用突击/远程移动与瞄准判定 |
| `enemy-model.js` | 无人机四旋翼吊舱、狙击长枪管两种剪影 |
| `boss-battle-record.js` | `start(name)` 可选 Boss 名称，战报首行随之变化 |
| `journey.js` | `JOURNEY_KEY` → v5，新增 `SIX_CHAPTER_JOURNEY_KEY`（v4 只读导入，六章通关档在 6/7 章之间继续）；v1/v2/v3 迁移目标同步为 v5 |
| `collectibles.js` | 星星存档版本 4、上限 7；v3 六星成就以 `legacyRequired:6` 保留 |
| `maps/registry.js` `level.js` `campaign.js` `menu-state.js` `save-hub.js` `chapter-achievements.js` `achievement-gallery.js` `menu-art.js` `menu-ui.js` `levels.css` `star-world.js` `app.js` | 第七章注册、`IS_ORBITAL`、存档槽、文案「六章」→「七章」、菜单插画、Boss 消息由世界对象提供 |

`app.js` 通过与枢纽监察者相同的 `overseer` 句柄驱动 TETHER（`setStage/clear/update/hit/updateMarkers/battle/targets`），并新增 `origin`、`message`、`killMessage` 字段供 HUD 使用；`update` 追加 `grounded` 参数。仅在 `?map=orbital` 下暴露 `window.__orbitalProbe`（读脚高/Boss 状态、测试传送），供浏览器测试使用。

## 4. 新增文件

`orbital-data.js`（几何、阶段、补给、重力段、着陆区纯函数）、`orbital-navigation.js`（三层导航）、`orbital-world.js`（渲染、着陆区、重力段 HUD）、`tether-rules.js`（Boss 纯规则）、`tether-world.js`（Boss 渲染与面板）、`test-tether.mjs`、`test-orbital.mjs`、`test-orbital-enemies.mjs`、`test-orbital-migration.mjs`、`test-orbital-browser.mjs`。

## 5. 验证

- `npm run test:check` 231/231、`test:rules` 63/63（含四个新纯规则测试）、`test:integration` 12/12；`get_diagnostics` 0。
- 更新的既有测试：`test-journey` `test-tower-migration` `test-train-migration` `test-harbor-migration` `test-stars` `test-menu` `test-map-registry` `test-save-hub` `test-enemies`（六章 → 七章、v4 → v5、星星 6 → 7），`test-smoke-browser` 断言键改为 `journey.v5`。
- `test-orbital-browser.mjs`（Playwright，隔离上下文）：第七章启动与菜单卡片、单章开局重力段 HUD / 1 g 与 0.65 g 跳高 / 西侧台阶登环 / 检查点写入、Boss 阶段训练面板与脉冲预警、v4 战役档在 6/7 章之间恢复。
- 关卡几何验证方式：玩家运动模型逐帧走台阶、跳平台，敌人导航三种半径上下三层，全部刷新点/补给/入口/稳定器可站立。

## 6. 未完成与建议

- 无人机尚未做「六机编队蜂鸣预警」（路线图 5.3 描述），本章只用 2–3 机小群；编队 AI 可作为独立一批。
- 着陆区落下的配重目前只做位移动画，没有冲击粒子与音效；Boss 脉冲也复用监察者的电弧音效名，没有新音源。
- 未做难度遥测校准：重力段与脉冲数值来自设计稿，需按 `telemetry` 数据再调整（遵守「无数据不降难度」约束）。
- 第八、九章（P5 后续）等待用户决定后再开工。
