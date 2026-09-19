# P3 直升机并入试验区 · 第 5 关直升机撤离与安全节点

> 状态入口仍是 `docs/mcp-project-status-roadmap.md`；本文是本批次的实现与验收记录。上一批第 5 关记录见 `docs/mcp-p3-expedition-mission5.md`，直升机独立原型见 `helicopter.html` 相关文档。

## 1. 范围与取舍

- 直升机成为试验区第四种载具：常驻停在游艇码头西北岸边停机坪（`SHORE_HELIPAD` x 196 / z 120），与越野车、固定翼、游艇共用 E 登离、R 回收、C 视角、HUD 与音频链路（音频复用固定翼引擎床）。
- 复用独立原型的物理与规则（`helicopter-rules.js` 的 `stepHelicopter`），只把“地面高度 / 禁区 / 障碍”抽象为 `site` 适配器：试验区地面 = 灯塔岛顶 9 m / 码头 0.85 m / 陆地 0，海面为禁区（触水即坠毁），灯塔塔身与码头建筑为碰撞包络。独立页 `helicopter.html` 的 7 条测试不变。
- 第 5 关改为 10 阶段：登船 → 驶向灯塔岛 → 浮桥登岛 → 清点 ×3 → **登上直升机 → 起飞离地 8 m → 飞往岸边停机坪 → 停机坪内平稳着陆并熄火**。规则 id 由 `lighthouse-v1` 升为 `lighthouse-v2`，旧 v1 成绩通过 `legacyRules` 仍可读、仍计入分组成绩，但不再是当前规则。
- 第 5 关安全节点：第三处清点完成即写入“灯塔停机坪”节点（与第 2/4 关节点同一存储与 UI）。恢复后玩家站在岛顶停机坪旁、直升机冷机、已完成 6 阶段、耗时保留、`recovered=true`，成绩单独记为“检查点继续”。
- 未做：吊运 / 武装、第 6–8 关、直升机专属音频、直升机与步行玩家的机体阻挡（可穿过机体）。

## 2. 改动文件

| 文件 | 改动 |
| --- | --- |
| `helicopter-rules.js` | `siteGround(site,x,z)` 地面相对高度；`createHelicopter(spawn)`；`site.forbidden(x,z)` 触地即判失败；天花板提示改用 `site.ceiling`。独立场地行为不变。 |
| `helicopter-field.js`（新） | `FIELD_HELI_SITE`、`fieldGround`、`HELI_PADS{island,shore}`、`createFieldHelicopter/parkHelicopter`、侧门上机判定、`helicopterExit`（空中 / 未熄火 / 旋翼未停不可离机）、`helicopterInput`（W/S 俯仰、A/D 偏航、←/→ 横移、Shift/Ctrl 升降、空格悬停刹车）、`HELICOPTER_HINT`、`helicopterStatusLabel`。 |
| `helipad-world.js`（新） | 两处停机坪 H 标记与目标脉冲信标。 |
| `lighthouse-mission.js` | `LIGHTHOUSE_RULE='lighthouse-v2'`，`ISLAND_HELIPAD`（岛顶东北肩，避开塔身旋翼包络）/ `SHORE_HELIPAD`，阶段 `heli/lift/evac/touchdown`，`lighthouseExitAllowed`、`onIslandHelipad`，安全节点 `lighthouseCheckpointFromMission / validLighthouseCheckpoint / canonicalLighthouseCheckpoint / lighthouseCheckpointLabel / restoreLighthouseCheckpoint`；直升机坠毁 = 任务失败。 |
| `lighthouse-world.js` | 停机坪阶段标记环尺寸。 |
| `expedition-model.js` | 第 5 关 `rule:'lighthouse-v2', legacyRules:['lighthouse-v1']`；灯塔节点携带难度。 |
| `vehicle-app.js` | 创建 `heli/heliModel/helipads`；`entity/nearby/interact/recover` 覆盖直升机；KeyI 启停发动机；直升机物理分支与坠毁遮罩；相机 / HUD（AIR / 直升机）/ 雷达 H 标记 / dataset `heliStatus/Powered/Grounded/X/Y/Z`、`lighthouseRecovered`；第 5 关启动时直升机停岛顶停机坪，阶段推进即 `saveCheckpoint('lighthouse')`；`restoreLighthouseRun` 从节点恢复；R 回收要求直升机在地面。 |
| `vehicle.html` | 为裸 `three` 加 importmap（`helicopter-world.js` 需要）；第 5 关简介、码头站点说明。 |
| `test-helicopter-field.mjs`（新） | 地面适配、停机坪出生、侧门上机、岛顶起降、落水坠毁、塔身 / 建筑 / 天花板碰撞、回收、键位；独立场地回归。 |
| `test-helicopter-field-browser.mjs`（新） | 真实页面：岸边停机坪出生、E 上机、冷机不可升空、I 启动后不可离机、Shift 离地 > 4 m、Ctrl 平稳着陆、熄火等旋翼停转后 E 下机、回收归位、第 5 关单项启动直升机停岛顶。 |
| `test-lighthouse-mission.mjs` | 10 阶段生命周期用真实旋翼物理跑通；节点创建 / 校验 / 恢复；坠毁失败；规则 id v2。 |
| `test-expedition-browser.mjs` | 第 5 关：真实规则推进到第三处清点 → 节点出现 → 失败后节点保留 → “从安全节点继续” 恢复（recovered、阶段 heli、清点 3、直升机冷机停岛顶）→ 通关计入“检查点继续 1 次”、节点退役；随后新建第二场战役完成原有完整流程断言。 |
| `test-expedition.mjs` / `test-expedition-recovery.mjs` / `test-session-lifecycle.mjs` | v2 + 旧 v1 记录；naval/joint/lighthouse 三类节点恢复；夹具补直升机。 |
| `package.json` | `test:helicopter-field`、`test:browser:helicopter-field`。 |

## 3. 验证结果（2026-09-19，远程 Windows）

- `get_diagnostics`：改动的 7 个源码文件均 0 条。
- `node scripts/run-tests.mjs`：check 478/478、rules 112/112、integration 42/42（jobs=2）。
- 浏览器（串行）：`test-expedition-browser.mjs` PASS（含安全节点保存 / 失败保留 / 恢复 / 检查点通关）；`test-helicopter-field-browser.mjs` PASS；`test-smoke-browser.mjs` 15/15。截图确认直升机在岸边 H 停机坪上空 4.5 m、HUD 为 AIR / 直升机。
- 未做真人验收：直升机手感（升降响应、着陆判定阈值）与第 5 关全程真人通关时间未实测。

## 4. 遗留

- 第 6–8 关与完整“先遣队”称号；直升机吊运 / 武装；直升机专属音频；步行玩家与机体碰撞；旧 `lighthouse-v1` 成绩在分组表中与 v2 合并显示（规则字段仍保留在记录内）。
