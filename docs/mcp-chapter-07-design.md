# NEON ECLIPSE｜第 07 章设计：轨道电梯基座（ORBITAL TETHER BASE）

日期：2026-09-18

项目：`game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6`

归档：`docs/mcp-chapter-07-design.md`

上位方案：`docs/mcp-full-development-plan.md` 第 9 节（Phase 5 新章节内容库，编号 07）。

> 本文是第 07 章的实现设计。所有数值为本章新增内容的初始值，未改动任何已确认章节的难度、路线、存档格式或武器数值。工程约束沿用既定规则：只交付源码、不制作 EXE、不清空真实存档、无 three 之外的运行时依赖。

## 一、与现有工程约束的对齐

设计前核对了 `app.js`、`mission.js`、`campaign.js`、`journey.js`、`player-motion.js`、`tower-*.js`、`overseer-*.js`、`maps/registry.js`、`collectibles.js`、`hidden-data.js`、`save-hub.js`、`menu-state.js` 与对应测试。以下约束直接决定本章形态：

| 约束 | 来源 | 对本章的影响 |
| --- | --- | --- |
| 每章固定 5 个阶段 | `campaign.js` `stageIndex 0–4`、`unlocked 0–4`；结算文案 `/5` | 本章为 5 阶段，不新增第 6 阶段 |
| 检查点 `feetY` 允许范围 0–12 m | `campaign.js` `validCheckpoint` | 总方案中的"400 m 井道"改为紧凑基座：0 / 4 / 9 m 三段，隐藏星平台 11.4 m |
| 每章必须恰有一个防守阶段 | `mission-world.js` `STAGES.find(s=>s.defenseDuration)` 非空 | 第 3 阶段"锚索校准"为 18 s 防守 |
| 重力是常量 `PLAYER.gravity=20` | `player-motion.js` | 新增可选 `gravityAt(feetY)` 钩子，默认行为不变 |
| Boss 通过 `overseer` 接口接入主循环 | `app.js` 约 10 处 `overseer?.` | TETHER 暴露同形接口（`setStage/clear/update/hit/updateMarkers/battle/blocking/targets`），不新增第二套 Boss 分支 |
| 敌人跨层导航需分层 BFS + 楼梯链路 | `tower-navigation.js` | 新建 `orbital-navigation.js`，三层 + 两段楼梯 |
| 地图数量硬编码点 | `journey.js` v4、`collectibles.js` 6 星、`save-hub.js`、`menu-state.js`、`menu-ui.js` 文案、`achievement-gallery.js`、`chapter-achievements.js` | 第七章接入即触发 journey v5、stars v4 迁移；旧键只读保留 |

## 二、章节概要

| 项 | 内容 |
| --- | --- |
| id / code | `orbital` / `O-07` |
| 标题 | 轨道电梯基座 / ORBITAL TETHER BASE |
| 一句话 | 港口撤离后，小队追踪信号来到轨道电梯地面基座。基座被"TETHER"锚定核心占领，重力场随高度递减。 |
| 独特空间 | 中央 6×6 m 电梯井柱 + 4 m / 9 m 两层环形平台 + 两段楼梯，边长 76 m 的封闭基座 |
| 独特机制 | **三段重力**：0–3.5 m 为 1.0 g（20）、3.5–7.5 m 为 0.65 g（13）、7.5 m 以上为 0.4 g（8）。跳跃高度 1.44 → 2.22 → 3.61 m；滞空时间 0.76 → 1.17 → 1.9 s；后坐力 ×1.0 / ×1.25 / ×1.5 |
| 专属 Boss | TETHER 锚定核心：三段各一个稳定器，全部击破后核心暴露 8 s；重力脉冲按高度段打击，跳跃（滞空）可躲 |
| 环境互动 | ① 重力段本身（跳跃/躲避/探索都依赖）② 配重着陆区：4 个地面落点周期性砸落，琥珀预警 2 s 后 0.6 s 伤害 |
| 新敌人 | **蜂群无人机 drone**（低血高速成群，突击行为）、**狙击守卫 sniper**（62 m 紫色锁定线，1.6 s 蓄力 16 伤害，远程行为） |
| 隐藏星 | 9 m 环北缘起跳，经两块悬浮平台（10.2 m、11.4 m）到达；仅在 0.4 g 段可完成 |
| 数据碎片 | 总方案 6.5 节的碎片系统尚未实现，本章**不伪造**，留待 Phase 2 后续批次统一接入 |

## 三、空间布局（坐标单位 m，y 为脚底高度）

```text
          z = -38 (北)
   ┌──────────────────────────────┐
   │   [星台 B 11.4]  (0,-24)      │
   │   [星台 A 10.2]  (0,-19)      │
   │      ┌─ 9 m 环 N ─┐          │
   │      │ ┌ 4 m 环 N ┐│          │
   │ 落点 │ │ ┌──────┐ ││  落点     │
   │(-24, │W│ │ 井柱 │ │E│(24,-10) │
   │ -10) │ │ │ 6×6  │ │ │         │
   │      │ │ └──────┘ │ │         │
   │ 楼梯01═╡ └ 4 m 环 S ┘ ╞═楼梯02 │
   │ (西,0→4)  └ 9 m 环 S┘ (东,4→9)│
   │ 落点(-24,10)        落点(24,10)│
   │            ● 起点 (0,32)      │
   └──────────────────────────────┘
          z = +38 (南)
```

### 3.1 静态体积（渲染与物理共用，`ORBITAL_*` 常量）

- 地面：`{x:0,z:0,w:76,d:76,bottom:-.3,top:0}`；四周墙 `top:14`；玩家边界 `{x:37.1,z:37.1}`。
- 井柱：`{x:0,z:0,w:6,d:6,bottom:0,top:10}`，实心不可穿越；核心悬浮于柱顶上方 (0,11.5,0)。
- 4 m 环（内边 5、外边 13，`bottom:3.75,top:4`）：N `(0,-9,26,8)`、S `(0,9,26,8)`、W `(-9,0,8,10)`、E `(9,0,8,10)`。
- 9 m 环（`bottom:8.75,top:9`）：N `(0,-9,26,8)`、W `(-9,0,8,10)`、E `(9,0,8,10)`、S 仅西半 `(-5,9,16,8)`——东半留空给楼梯 02，避免楼梯上方出现天花板。
- 楼梯 01（0→4 m，西侧 z=0）：16 级，`x=-20.75+i*.5`，`top=(i+1)*.25`，`d:3`，`walkStep:true`。
- 楼梯 02（4→9 m，4 m 环 S 条东半 z=9）：20 级，`x=12.75-i*.5`，`bottom:4`，`top:4+(i+1)*.25`，`d:3`，`walkStep:true`。到顶后向西踏上 9 m 环 S 条。
- 净空核对：4 m 环上方到 9 m 环底 4.75 m ＞ 0.65 g 跳高 2.22 + 身高 1.8；楼梯 02 上方无遮挡。
- 掩体：地面 8 个 3×2.5×3 箱体（`(-22,-22) (22,-22) (-22,22) (22,22) (-30,0) (30,0) (0,-30) (0,30)` 中去掉起点附近的 `(0,30)`，改为 `(-10,30) (10,30)`）；4 m 环与 9 m 环各 4 个 1.2 m 矮护栏段作为掩体。
- 星台：A `(0,-19,1.6,1.6,top:10.2)`、B `(0,-24,1.6,1.6,top:11.4)`，注册进 `HIDDEN_VOLUMES.orbital`，由 `hidden-world.js` 渲染并加入碰撞。

### 3.2 重力函数

`orbitalGravity(feetY)`：`feetY<3.5 → 20`，`<7.5 → 13`，否则 `8`。每个物理子步按当前脚底高度取值（跨段下落时自然过渡）。`orbitalRecoilScale(feetY)`：对应 `1 / 1.25 / 1.5`。

## 四、任务阶段（5 个，`ORBITAL_STAGES`）

| # | id | 位置 (x,z,feetY) | 目标 | 守卫 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 1 | `orbital-gate` | (0,22,0) | 解除基座门禁 | 4：assault, sniper, drone, drone | 狙击守卫刷在 4 m 环 W 条（spawnFeetY 由 spawn 条目单独给出）：首次见识"来自高处的锁定线" |
| 2 | `orbital-ring` | (-9,-3,4) | 启动一号稳定环供电 | 5：drone×3, ranged, assault | 4 m 环，0.65 g；无人机群沿楼梯 01 追上来 |
| 3 | `orbital-anchor` | (-9,3,9) | 守住顶层锚索校准 | 4 + 防守 3 + 增援 | 9 m 环，0.4 g；`defenseDuration:18, defenseRadius:8`；`defenseWaves:[{at:9,count:2,roles:['sniper','drone']}]` |
| 4 | `tether` | (0,-16,0) `boss:true` | 击破 TETHER 三段稳定器与核心 | 3：assault, drone, sniper | 阶段进入时 `tether.setStage(3)` 激活；`clear = enemies.length===0 && !tether.blocking` |
| 5 | `extract` | (0,32,0) | 返回地面升降平台撤离 | 4：assault, ranged, drone, sniper | 配重落点重新启用 |

每阶段均带 `radio` 文案与 `message`；`spawns` 逐点给出 `[x,z]`，跨层刷新的点使用 `{x,z,feetY}` 形式（`chooseEncounterSpawns` 需要支持每点 `feetY`，见第八节）。

入口 `ORBITAL_ENTRIES`：`[{x:0,z:32,feetY:0},{x:0,z:19,feetY:0},{x:-16,z:0,feetY:0},{x:-9,z:-9,feetY:4},{x:0,z:28,feetY:0}]`。

补给 `ORBITAL_SUPPLIES`（8 个，各层分布）：地面 med(-26,26) ammo(26,26) med(-30,-8) ammo(30,-8)；4 m 环 ammo(9,-9,4) med(-9,9,4)；9 m 环 med(9,-3,9) ammo(-9,-9,9)。

## 五、Boss：TETHER 锚定核心（`tether-rules.js` + `tether-world.js`）

### 5.1 状态

```text
core 1600 HP · stabilizers [90,90,90]（段 0 / 1 / 2）· phase shield|exposed|dead · tier 1|2
attack rest|warning|live · pulseBand 0..2 · timer
```

- 三个稳定器位置：S0 地面 `(0,-16,feet 0)`；S1 4 m 环 W `(-9,3,feet 4)`；S2 9 m 环 E `(9,-3,feet 9)`。玩家必须在三段间往返，重力变化是路线的一部分。
- 稳定器全部为 0 → `exposed`，核心可受伤 8 s，脉冲停止；到时未击杀 → 稳定器回满 90，回到 `shield`。
- 核心 `hp ≤ 800` → `tier 2`。
- 护盾期核心受击返回 `shielded:true`（HUD 提示"先击破三段稳定器"），与监察者一致。
- HALO 弱点标记：核心暴露期有效伤害可叠层，护盾/稳定器不叠层（复用 `halo-rules.js` 的 `haloTarget` 模式）。

### 5.2 重力脉冲

- `rest 2.0 s`（tier 2：1.4 s）→ `warning 1.6 s`：选择 `pulseBand`（玩家当前段；tier 2 额外打击相邻一段）→ `live 0.5 s`。
- `live` 期间若玩家 `band(feetY)` 被打击且 **处于地面接触状态**（`grounded`）→ 18 伤害（tier 2：22），每轮至多一次。
- 躲避方式：预警期起跳，在 live 窗口内保持滞空。0.4 g 段滞空 1.9 s 最宽松，1.0 g 段 0.76 s 需要卡时机；预警文案随段落说明。
- 视觉：井柱上对应高度亮起琥珀环带，live 转红；HUD 面板显示"脉冲 → 第 N 段 · 起跳躲避"。
- 与监察者相同，`update` 在非 playing 状态传 `dt=0`，暂停不推进。

### 5.3 战报

`createBossBattleRecord` 增加可选 `name`，`formatBossBattleRecord` 首行使用 `data.name||'枢纽监察者'`；其余字段（核心/节点伤害、开火统计、电弧→改称"脉冲实际扣血"仅在 name 为 TETHER 时）不变。

## 六、新敌人（`enemy-rules.js` `ENEMY_TYPES` 新增两项）

| 字段 | drone 蜂群无人机 | sniper 狙击守卫 |
| --- | --- | --- |
| color | `0x7dff9a`（绿） | `0xe4f0ff`（冷白） |
| hp / hpPerLevel | 34 / 4 | 58 / 6 |
| speed / turn | 4.4 / 5 | 1.7 / 2.2 |
| scale / radius | .7 / .45 | 1.02 / .65 |
| near / far / range | 4 / 8 / 16 | 20 / 34 / 62 |
| cooldown | 1.25 | 4.4 |
| attack | orange, charge .35, speed 19, damage 3 | purple, charge 1.6, speed 34, damage 16, showAim |
| behavior | `assault` | `ranged` |
| hint | 低血高速成群逼近 · 霰弹与近战最有效 | 远距紫色锁定线 · 1.6 秒蓄力 · 逼近或切断视线 |

- `movementIntent` 与 `enemy-ai.js` 的对齐阈值/开火门限改为读取 `profile.behavior||type`，未定义 `behavior` 的既有敌人行为完全不变。
- 模型：`enemy-model.js` 新增 `drone`（小型悬浮体 + 四臂旋翼，顶部传感器为 `head` 区）与 `sniper`（细长枪管 + 高位瞄具天线）分支；不改既有四种模型。
- 雷达/检视器/音效沿用 `name/color/hint/attack.color`，无需新增音效配方（橙/紫已有签名）。
- 颜色语言保持：橙=普通蓄力可走位，紫=正在锁定你。

## 七、进度、收藏与迁移

### 7.1 journey v5

- `JOURNEY_KEY='neon-eclipse.journey.v5'`，`SIX_CHAPTER_JOURNEY_KEY='neon-eclipse.journey.v4'`。
- 新增 `migrateSixChapterJourney`：v4 `active/between` 原样升 v5；v4 `complete` → `between`（chapter 5），并标记 `sixChapterImported:true`，允许直接进入第七章；v4 键只读保留。
- 读取顺序：v5 → v4 → v3 → v2 → v1（沿用现有链）。
- `CHAPTERS` 由注册表派生，自动变为 7 项。

### 7.2 星星 v4

- `STAR_SITES.orbital = {x:0,z:-24,feetY:11.4}`；`STAR_MAPS` 变 7 项，解锁条件 7/7。
- 读取：`version 1→4 星`、`2→5`、`3→6`、`4→7`；旧档已集齐 6 星者 `legacyRequired=6`（"旧版成就保留"），新收集需 7/7 才解锁新版。
- 写入 `version:4`。save-hub 校验 `[1,2,3,4]`。

### 7.3 其它键与文案

- 单章检查点键 `neon-eclipse.orbital.v1`；`menu-state.js` 的 `SINGLE_KEYS` 改为从注册表 `saveKey` 派生。
- `save-hub.js`：新增 v5 当前槽、v4 旧档槽、第 7 章检查点槽。
- `chapter-achievements.js` `CHALLENGE_MAPS`、`achievement-gallery.js` `CHAPTER_NAMES` 增补；`counter` 仍仅港口。
- `menu-ui.js` / `app.js` / `star-world.js` 中"六章""SIX CHAPTERS"改为动态或"七章"；`primaryAction` 的 `index===5` 改为 `CHAPTERS.length-1`。
- `journey-ui.js` 当前未被任何入口引用（仅语法检查），本轮不改动。

## 八、共享代码的最小改动清单

| 文件 | 改动 | 兼容性 |
| --- | --- | --- |
| `player-motion.js` | `createPlayerMotion(obstacles,ceilings,bounds,{gravityAt})`，子步内取 `gravityAt?.(state.y)??PLAYER.gravity` | 不传参时逐位相同 |
| `combat.js` | `createHandling().shot(weapon,random,scale=1)` 后坐乘以 `scale` | 默认 1 |
| `mission.js` | `chooseEncounterSpawns` 支持 spawn 条目为 `{x,z,feetY}`；`applySupply` 不变 | `[x,z]` 数组照旧 |
| `enemy-rules.js` | 新增两型；`movementIntent` 用 `behavior` | 既有类型无 behavior → 原逻辑 |
| `enemy-ai.js` | 对齐阈值/开火门限用 `behavior` | 同上 |
| `enemy-model.js` | 新增两个模型分支 | 既有分支不动 |
| `boss-battle-record.js` | `start(name)`、格式化首行取 name | 无 name → 原文 |
| `app.js` | `IS_ORBITAL` 文案/印章、world/nav/boss 三处三元、`playerMotion` 传 gravity、`handling.shot` 传 scale、`overseer.update` 多传 `grounded`、护盾/击破提示改读 `overseer.labels` | 其余章节路径不变 |
| `level.js` `mission.js` `campaign.js` `arena.js` `mission-ui.js` | 各加一个 `IS_ORBITAL` 分支 | — |
| `maps/registry.js` | 追加第 7 项 | 派生消费者自动更新 |
| `levels.css` | 7 列关卡菜单、`.orbital-stamp` | — |
| `menu-art.js` | 第 7 章矢量插画 | — |

## 九、文件清单（新增）

```text
orbital-data.js          ORBITAL_ARENA/ENTRIES/STAGES/SUPPLIES/FLOORS/STAIRS/WALLS/COVER/PADS, orbitalGravity, orbitalRecoilScale, orbitalObstacles(stage)
orbital-world.js         渲染 + 配重落点 hazardDamage + 重力段 HUD + setStage/clear/burst/update/setQuality/ceilings/gravityAt/recoilScale
orbital-navigation.js    三层 BFS + 两段楼梯链路 route/move/invalidate
tether-rules.js          纯规则：createTether(), TETHER_* 常量, bandOf(feetY), pulse 时序
tether-world.js          Boss 渲染、HUD、markers、hit/update/targets/battle/labels（与 overseer-world 同形）
test-orbital.mjs         数据一致性：5 阶段、入口/刷新点可占位、两段楼梯攀爬、三层敌人导航上/下、分层交互与防守、重力段跳高、星台仅 0.4 g 可达
test-tether.mjs          Boss 纯规则：稳定器→暴露→回满、tier 2、脉冲命中/滞空免伤/暂停不推进、HALO 标记边界
test-orbital-enemies.mjs 新敌人 profile 校验、behavior 意图、resolveEnemyDamage 无隐藏减伤
test-orbital-migration.mjs journey v4→v5（active/between/complete）只读迁移、七章通关、stars v3 六星→legacyRequired=6、v4 写入
test-orbital-browser.mjs 第七章启动、检查点写入 orbital.v1、从港口结算进入第七章、暂停/重试、无控制台错误
```

更新：`test-map-registry.mjs`（7 项）、`test-journey.mjs`、`test-stars.mjs`、`test-menu.mjs`、`test-tower-migration.mjs`、`test-train-migration.mjs`、`test-smoke-browser.mjs`（journey.v5 断言）、`test-save-hub.mjs`。

## 十、验收标准（DoD 对齐）

1. `npm test` 全通过；诊断 0；`test-orbital*.mjs`、`test-tether.mjs` 新增并通过。
2. 旧存档：v4 journey（三种状态）、v3 stars、六章单章检查点在隔离存储中导入后行为正确，旧键未被改写。
3. 六章既有测试（tower/train/harbor/roof/melee/weapons）不因本章改动而修改断言。
4. 浏览器：`test-browser:smoke` 自动覆盖第七章启动；`test-orbital-browser.mjs` 覆盖开始/暂停/重试/检查点。
5. 未改动任何既有章节难度数值；未新增运行时依赖；未制作 EXE。
6. 本文档、`docs/mcp-project-status-roadmap.md` 顶部交付记录、`docs/mcp-chapter-07-orbital.md` 交付记录在结束前写入。

## 十一、明确不在本批范围

- 数据碎片系统（需先有 Phase 2 6.5 的通用碎片/档案页）。
- 第 08、09 章。
- 手柄/触屏、性能采样、EXE 打包。
- 新音效配方（沿用橙/紫预警与既有 Boss 音效）。
