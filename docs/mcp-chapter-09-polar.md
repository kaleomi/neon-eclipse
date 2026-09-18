# P5 第三批交付：第九章「极地雷达阵列」（P-09）

交付日期：2026-09-18。设计稿见 `docs/mcp-chapter-09-design.md`，本文记录实际落地内容、与设计稿的差异、验证结果与未完成项。

## 1. 交付范围

- 新章节 `polar`（P-09 / 极地雷达阵列 / POLAR RADAR ARRAY），接入地图注册表第九位；单章模式、连续战役、阶段训练、检查点、星星、单章成就、SaveHub、菜单卡片与关卡菜单全部可用。
- 暴风雪周期：晴 18 s → 转暴 5 s → 暴风雪 12 s → 放晴 5 s（共 40 s）。强度 ≥ 0.6 时能见度约 10 m（雾密度 0.012 → 0.178），敌人切换为热成像：26 m 内无视雪堆遮挡（墙、塔基、暖房仍挡视线）；玩家侧三塔顶信号灯与暖房门灯在暴风雪时点亮。屏幕上方常驻天气牌（相位 / 能见度 / 体温 / 下次暴风雪倒计时 / 暖房、加热板与冻伤提示）。
- 体温：0–100，晴天 −1.2/s，暴风雪 −4/s（按强度插值）；暖房内 +18/s，塔顶加热板 +6/s。体温归零后每秒 4 点冻伤（走进暖房或塔顶即停止）；≤ 30 天气牌转琥珀并提示回暖房。
- 空间：76×76 雪原（活动边界 ±37.1），三座雷达塔 (−24, −18) / (24, −18) / (0, 26)：2.4 m 基座、四面 0.3 m 台阶可走上、顶部 10×10 平台与 9 m 天线桅杆；三间暖房 (−28, 22) / (28, 22) / (0, −30)，5×5 南向开口；中央半径 9 m 薄冰湖（与雪地同高，仅材质与边缘标记不同）；12 组 1.2 m 雪堆掩体（可跳上）、4 处补给箱台、4 处猎犬窝。
- 五阶段：接通西塔（塔顶）→ 接通东塔（塔顶）→ 守住北塔 24 s / 6 m（第 10 s 增援）→ 击沉 GLACIER → 返回南暖房撤离。
- Boss「GLACIER 重炮机甲」：1800 HP，从北面 (0, −22) 出场，以 2.2 m/s 追向玩家、5 m 内停下；每 4 s（半血后 3 s）一发重炮，预警 1.2 s 地面红圈锁定玩家当时位置，半径 3 m，22 / 26 伤害。装甲状态伤害 ×0.15；机甲中心在薄冰湖内累计 2.5 s「压冰」后陷冰 8 s（伤害 ×1、核心 ×2），随后 1.5 s 爬出并回到出场点、6 s 内不再压冰。击沉是唯一实用输出窗口，玩家必须在暴风雪与体温压力下把机甲引过湖心。
- 新敌人：猎犬机 `hound`（38 HP，速度 5.2，0.45 s 蓄力后突进，5 伤害，低矮四足模型，热成像标记）；西 / 东 / 北 / Boss 阶段都投放。设计稿中的「重炮机甲」即 Boss，不作为普通敌人投放。
- 隐藏星星 (32, −30, 2.4 m)：东南角雪堆 → 冰台 → 塔外檐两跳路线；测试证明地面起跳无法直接上檐。

## 2. 与设计稿的差异

- 敌人导航到塔顶的终点允许 3.5 m 误差（`createNavigator` 的目标半径 + 台阶上沿），测试按实际行为断言，不改导航器。
- 猎犬机模型直接移除人形骨架（原计划仅隐藏），避免隐藏网格仍参与命中与包围盒。
- 浏览器测试不等待真实 40 s 暴风雪，`__polarProbe().advanceStorm(s)` / `setWarmth(v)` / `heal()` 直接推进状态（仅 `?map=polar` 暴露，不影响正式玩法）。
- 重炮命中没有独立音效；雪粒为 420 粒固定粒子云随强度显隐，暖房门灯与塔顶信号灯为自发光网格而非点光源（与其他章节一致，保证软件渲染下的帧率），维持「不新增运行时依赖」。

## 3. 共享代码改动（全部向后兼容）

| 文件 | 改动 |
| --- | --- |
| `enemy-rules.js` | 新增 `hound` 档案（`thermal:true`，`behavior:'assault'`）；伤害规则走默认分支 |
| `enemy-model.js` | `createEnemyModel('hound')` 四足低矮框架；其他类型不变 |
| `enemy-ai.js` | `createEnemyDirector` 新增可选 `thermalVision()` 回调：返回 true 时 `THERMAL_RANGE`（26 m）内忽略 `bank` / `ledge` 类障碍的视线遮挡；未传入时行为与之前完全一致 |
| `campaign.js` | 检查点可选 `stormTime`（0–86400）与 `warmth`（0–100） |
| `journey.js` | `JOURNEY_KEY` → v7，新增 `EIGHT_CHAPTER_JOURNEY_KEY`（v6 只读导入，八章通关档在 8/9 章之间继续）；v1–v5 迁移目标同步为 v7 |
| `collectibles.js` | 星星存档版本 6、上限 9；v5 八星成就以 `legacyRequired:8` 保留 |
| `maps/registry.js` `level.js` `mission.js` `campaign.js` `save-hub.js` `chapter-achievements.js` `menu-art.js` `menu-ui.js` `menu-state.js` `levels.css` `app.js` | 第九章注册、`IS_POLAR`、存档槽（v6 战役标记为八章旧档）、文案「八章」→「九章」、菜单插画、天气牌 / 印章样式 |

`app.js`：世界工厂 / Boss 工厂 / 导航链各加一段 `IS_POLAR` 分支；`createEnemyDirector` 传入 `thermalVision:()=>art.thermal`；检查点快照带 `stormTime` 与 `warmth`，恢复时经 `art.restoreMotion` 复位；`art.hazardDamage` 复用第八章接口输出冻伤。其他章节代码路径不变。

## 4. 新增文件

`polar-data.js`（几何、阶段、补给、暴风雪与体温规则纯函数）、`polar-navigation.js`（地面 / 塔顶两层导航）、`polar-world.js`（渲染、雪粒与雾、天气牌、信号灯）、`glacier-rules.js`（Boss 纯规则：移动、炮击、压冰 / 陷冰状态机）、`glacier-world.js`（Boss 渲染与面板）、`test-polar.mjs`、`test-glacier.mjs`、`test-polar-enemies.mjs`、`test-polar-browser.mjs`、`docs/mcp-chapter-09-design.md`、本文。

## 5. 验证（远端，Node v24）

- `scripts/run-tests.mjs`：check 277/277、rules 73/73（新增 3 个纯规则测试；`test-enemies` 的全局 ≥ 0.45 s 预警下限同样约束猎犬机）、integration 16/16；`get_diagnostics` 0。`test-orbital-migration` / `test-harbor|tower|train-migration` / `test-map-registry` / `test-menu` / `test-stars` / `test-save-hub` 按九章更新。
- `test-polar-browser.mjs` 4/4：九张章节卡；单章运行中天气牌晴 → 暴风雪（雾密度 > 3 倍、热成像开启、能见度 < 12 m）、暴风雪中体温流失、暖房回温、归零冻伤扣血并提示、塔顶加热、检查点含 `stormTime` / `warmth`；Boss 训练装甲 → 湖心压冰陷冰露出 → 爬出回到出场点；v6 八章通关档只读导入并在 8/9 章之间继续。
- 回归：`test-orbital-browser.mjs` 4/4（章节卡数按九章更新）、`test-datacenter-browser.mjs` 4/4、`test-smoke-browser.mjs` 15/15。
- 浏览器测试在软件渲染下帧率很低，因此全部等待游戏状态条件而非墙钟时间，并通过 `__polarProbe` 的 `advanceStorm` / `setWarmth` / `heal` / `placeBoss` / `advanceBoss` 推进状态（仅 `?map=polar`）。

## 6. 未完成 / 后续

- 重炮 / 冰裂音效、雪地脚印与冰面裂纹贴图。
- 遥测校准：暴风雪周期、体温速率、压冰时长沿用设计值，未用实测数据调整。
- 第七 / 八章遗留：无人机编队 AI、放电与涨水音效；`vehicle-entry` / `vehicle-app` 文案中的旧 `journey` 引用未更新。
- 全部开发计划 §9 的九章至此交付完毕；后续可转向 P1 其余敌人生态或各章遗留项。
