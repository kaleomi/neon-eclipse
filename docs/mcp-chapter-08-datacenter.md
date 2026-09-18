# P5 第二批交付：第八章「沉没数据中心」（D-08）

交付日期：2026-09-18。设计稿见 `docs/mcp-chapter-08-design.md`，本文记录实际落地内容、与设计稿的差异、验证结果与未完成项。

## 1. 交付范围

- 新章节 `datacenter`（D-08 / 沉没数据中心 / SUNKEN DATA CENTER），接入地图注册表第八位；单章模式、连续战役、阶段训练、检查点、星星、单章成就、SaveHub、菜单卡片与关卡菜单全部可用。
- 潮汐时钟：低 14 s → 涨 6 s → 高 14 / 10 / 7 s（0 / 1 / 2 台泵）→ 排 6 s，最高 1.2 m。水中移速 ×0.55；HALO / RAILSPIKE / VOLT 在枪口没水时短路（射击取消并提示「能量武器在水中短路」），实弹与近战不受影响。屏幕上方常驻水位牌（相位 / 水位 / 泵数 / 周期 / 水中提示，涨水琥珀、高水位红）。
- 空间：76×76 机房，四座 1.5 m 阶梯基座（任意方向可走上，顶面永远干燥），12 组 2.4 m 机柜，中央 6×6×5 m 水冷主机，墙面 1.2 m 水线。
- 五阶段：解除进气闸（地面）→ 启动一号泵（西南基座顶）→ 守住二号泵（东南基座顶，20 s / 6 m，第 8 s 增援）→ 击破 ABYSS → 返回进气闸撤离。泵数随阶段推进 0 → 1 → 2，高水位随之缩短，是玩家可见的环境反馈。
- Boss「ABYSS 水冷主机」：1500 HP，水位 < 0.3 m 时核心露出、否则冷却液护罩伤害为 0；高水位放电（休息 3 s / 半血 1.5 s → 预警 1.5 s → 放电 0.5 s，仅命中脚在水中的玩家，20 / 24，每次只结算一次）；每次进入高水位召唤 2 / 3 只潜行者（场上上限 4，刷新在离玩家最远的水池）。
- 新敌人：潜行者（46 HP，0.45 s 蓄力，6 伤害，远处 8% 不透明度、7 m 内显形、蓄力强制显形）与盾卫（120 HP，0.8 s 蓄力，8 伤害，正面护盾伤害 ×0、背部核心 ×2）。
- 隐藏星星 (−29, −13, 2.4 m)：基座顶 → 机柜 A → 机柜 B 两跳路线；测试证明地面起跳无法上机柜。

## 2. 与设计稿的差异

- 一号泵阶段原本有一处基座顶刷新点放在承载终端的基座上，会与终端碰撞体重叠；改到东北基座顶 (20, 20, 1.5)。
- 星星路线机柜从 (−25, −20) / (−30, −14) 微调到 (−24.6, −20) / (−29, −14)，保证两跳都在 1 g 跳高内。
- 浏览器测试不等待真实 40 s 潮汐，`__datacenterProbe().advanceWater(s)` 直接推进时钟（仅 `?map=datacenter` 暴露，不影响正式玩法）。
- ABYSS 放电没有独立音效；水面为单一半透明平面（无波浪着色器），维持「不新增运行时依赖」。

## 3. 共享代码改动（全部向后兼容）

| 文件 | 改动 |
| --- | --- |
| `enemy-rules.js` | 新增 `stalker`、`shield` 档案；`resolveEnemyDamage` 新增 `shield` 分支（正面 ×0 + `armored`，核心 ×2 + `weak`），置于 `heavy` 之前 |
| `enemy-model.js` | 盾卫前置半透明盾板 + 背部核心；潜行者透明材质；`stalkerOpacity()`；`animateEnemy(enemy,time,walking,playerDistance)` 第四参数可选 |
| `enemy-ai.js` | 向 `animateEnemy` 传入玩家距离（其他敌人忽略） |
| `campaign.js` | 检查点可选 `waterTime`（0–86400） |
| `journey.js` | `JOURNEY_KEY` → v6，新增 `SEVEN_CHAPTER_JOURNEY_KEY`（v5 只读导入，七章通关档在 7/8 章之间继续）；v1–v4 迁移目标同步为 v6 |
| `collectibles.js` | 星星存档版本 5、上限 8；v4 七星成就以 `legacyRequired:7` 保留 |
| `maps/registry.js` `level.js` `mission.js` `campaign.js` `save-hub.js` `chapter-achievements.js` `menu-art.js` `menu-ui.js` `menu-state.js` `levels.css` `app.js` | 第八章注册、`IS_DATACENTER`、存档槽（v5 战役标记为七章旧档）、文案「七章」→「八章」、菜单插画、水位牌样式 |

`app.js`：世界对象新增可选 `moveScale(feetY)`（乘在移动速度上）与 `shorted(weaponIndex,feetY)`（`shoot()` 在装填判定前拦截）；`overseer.update` 第六参数传入场上潜行者数量，新增可选 `overseer.takeSummons(player)` 由主循环消费并经 `spawnEncounter` 生成潜行者；检查点快照带 `waterTime`，恢复时经 `art.restoreMotion` 复位潮汐时钟。

## 4. 新增文件

`datacenter-data.js`（几何、阶段、补给、潮汐与水规则纯函数）、`datacenter-navigation.js`（地面 / 基座顶两层导航）、`datacenter-world.js`（渲染、水面、水位牌、泵状态）、`abyss-rules.js`（Boss 纯规则）、`abyss-world.js`（Boss 渲染与面板）、`test-datacenter.mjs`、`test-abyss.mjs`、`test-datacenter-enemies.mjs`、`test-datacenter-browser.mjs`。

## 5. 验证（远端，Node v24）

- `scripts/run-tests.mjs`：check 244/244、rules 67/67（新增 3 个纯规则测试；`test-orbital-migration` / `test-harbor|tower|train-migration` / `test-map-registry` / `test-menu` / `test-stars` / `test-save-hub` 按八章更新）、integration 12/12；`get_diagnostics` 0。
- `test-datacenter-browser.mjs` 4/4：八张章节卡；单章运行中水位牌低→高、水中移速 0.55 且实测位移 < 干地 75%、HALO 水中短路提示、基座顶速度倍率 1 且不短路、检查点含 `waterTime`；Boss 训练两泵运行、低水位露出 → 高水位护罩 → 排水后再次露出；v5 七章通关档只读导入并在 7/8 章之间继续。
- 回归：`test-orbital-browser.mjs` 4/4、`test-smoke-browser.mjs` 14/14。

## 6. 未完成 / 后续

- 放电与涨水音效、水面波纹着色器；潜行者水中涟漪特效。
- 遥测校准：潮汐周期、放电伤害与召唤数量沿用设计值，未用实测数据调整。
- 第七章遗留：无人机编队 AI、着陆区/脉冲音效；`vehicle-entry` / `vehicle-app` 文案中的 `journey.v4` 引用未更新。
- 第九章按同一流水线推进。
