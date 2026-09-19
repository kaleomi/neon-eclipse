# Boss 第二批：第4章 ELEVATOR 升降机守卫

日期：2026-09-18。入口：`index.html?map=tower&menu=chapter` → 开始行动。

用户要求“继续别的关卡 boss”。本批接续第2章 SWITCHYARD，完成第4章；不扩展第5/6章、不改并行直升机原型，不打包 EXE、不自动 Git 暂存或提交。

## 已实现玩法

- 保留中枢塔原五阶段、21名守卫/增援和6米核心层的18秒防守。计时完成且清敌后才激活 Boss；最后一帧有门控，不能直接跳到撤离。
- **1500 HP，三组动力锁各500 HP**，按0 → 3 → 6米顺序击破。单次重击、霰弹后续弹丸不能跨锁提前扣下一层生命；第三锁才计一次击杀。
- 独立5×5米战斗升降台，速度0.65米/秒。击破一层后回台站稳，自动前往下一目标层。原0/6米维护梯及24秒循环不改。
- 0米可步行至检修台；3/6米需从升降台跳过1.4米缺口。踏稳青色过载板0.6秒，开启**6秒核心暴露**；枪械、能量刀均可，同层攻击才生效。窗口用完需离板再踏回。
- 护盾期间每轮有1.4秒紫色横向脉冲预警，锁定旧位置；可横移、跳跃、离层或利用遮挡规避，分层伤害14/18/22。暴露和升降中取消扫掠。
- **坠落恢复**：地面南侧及各检修台有呼叫柱，站定、面向同层按钮，按住 E 0.6秒召回升降台；再上台即可重返尚未击破的楼层。保留已造成的 Boss 伤害。
- 平台以小步进携带站立玩家，头顶/台下/敌人碰撞时停住而不碾压，解除阻挡后继续。暂停立即清除未完成的踏板/呼梯蓄力，平台、窗口和战报计时冻结。
- 工业守卫造型、分层踏板/指示灯、总血量/楼层锁/平台状态 HUD、投影呼梯标记、已有事件音效和战报接入。HALO仅有效核心命中累计标记，关窗、移动和换锁清理。
- 击败后保留0.8秒停机显示，再进入大厅撤离。6米连接桥接回原维护梯一侧，也可回原楼梯路线；撤离守卫与 E 确认流程保留。

## 兼容与边界

- `neon-eclipse.tower.v1`、原阶段索引与 `towerLiftTime` 不变，不新增 Boss 战内存档。
- stage 3检查点重试：恢复原阶段入口，重新完成防守，三锁和战斗台重置；stage 4旧档/重试：直接撤离，不强迫补打 Boss，战斗台固定6米以保留出口。
- 保留原补给、双楼梯、塔层守卫导航。未声称守卫会乘新增战斗台追击。
- 战报统计实际核心扣血、窗口、挥刀/开火、Boss 实际伤害；不伪加节点伤害。纯刀兼容既有资格规则；检查点重试仍不恢复完整关卡资格。
- `boss-framework.js`新增可幂等调用的`closeWindow()`；当前两位实际使用者为 SWITCHYARD / ELEVATOR。其他既有 Boss 未整体迁移，通用可破坏物仍不在本批范围。

## 文件

新增：

- `elevator-data.js`：三层几何、常量与踏板判定。
- `elevator-lift.js`：需求驱动平台与碰撞/乘客搬运。
- `elevator-rules.js`：三锁、窗口、移动模式、脉冲与重置。
- `elevator-world.js`：Three.js实体、射线、呼梯、标记、战报和生命周期。
- `elevator-ui.js`：Boss面板与呼梯标记。
- `test-elevator.mjs`、`test-elevator-world.mjs`、`test-elevator-browser.mjs`。

修改：`app.js`（工厂、运动前钩子、目标/HUD、战报、即时暂停）、`boss-framework.js`、`tower-data.js`、`maps/registry.js`。其他会话的直升机、载具及session生命周期文件未修改。

## 验证与证据

最终相关验证（全部串行）：

- 本批12个源码/测试文件 `node --check`：12/12通过。
- 规则/Three集成/兼容回归：28个脚本通过，命令退出码0；包括旧塔关卡、SWITCHYARD、存档/成就、音频与session生命周期。未修改后两项测试或并行实现。
- 浏览器：`test-elevator-browser.mjs` 1/1（25.9秒）、`test-switchyard-browser.mjs` 1/1（19.9秒）通过，均无页面错误。
- ELEVATOR浏览器覆盖原生tower/station/roof启动/暂停、五阶段防守门控、盾体拒伤、三层真实刀击、W/Space跳跃和乘梯、真实E坠落呼梯、升降中暂停、八种武器输入、唯一击杀与1500核心伤害、stage 3/4重试及撤离。
- Three集成另外覆盖实际几何可站立性/守卫出生点/补给、旧检查点、核心刀距射线/HALO、出口连接桥；平台规则覆盖30/60/120/144帧率搬运和防碾压恢复。
- 语言服务：0 errors / 0 warnings；`git diff --check`通过。两张1100×760最终截图已实际查看；不以软件WebGL帧率判定性能。

证据位于工作区 `.tools/boss-elevator/`（从项目根目录为 `../../.tools/boss-elevator/`）：

- `initial.log`：首轮8个相关脚本通过。
- `browser-initial.log`：首次失败，缺少Boss公共接口`updateMarkers`；已补真实呼梯标记而非绕开调用。同时修正夹具最后一帧必须在6米防守区的摆位。
- `browser-recheck.log`：再次失败，暂停后0.3秒踏板蓄力未即时清零；已将非playing更新加入暂停入口，不再依赖后续渲染帧清理。未删断言或改低Boss数值。
- `browser-recheck2.log`：修复后ELEVATOR通过。
- `browser-final.log`：最终ELEVATOR + SWITCHYARD顺序通过；截图改为稍远镜头并刷新高度显示。
- `targeted-final.log`：最终12文件语法、28脚本、差异格式及工作区状态。
- `final-sha256.txt`：本批12文件最终SHA基线；文档归档后复核一致。
- `exposed-final.png`、`exposed-final-arena.png`：最终核心暴露和战斗井截图。

复跑浏览器（隔离存储，须按项目约定在允许浏览器负载的会话执行）：

```bash
ELEVATOR_SCREENSHOT=../../.tools/boss-elevator/exposed-final.png node scripts/run-tests.mjs --layer browser --filter elevator --jobs 1 --verbose
node scripts/run-tests.mjs --layer browser --filter switchyard --jobs 1 --verbose
```

本批实际串行执行的28个脚本如下，可在项目根逐个`node <文件>`复跑：

```text
test-boss-framework.mjs
test-elevator.mjs
test-elevator-world.mjs
test-tower.mjs
test-tower-combat.mjs
test-tower-migration.mjs
test-switchyard.mjs
test-switchyard-world.mjs
test-station.mjs
test-mission.mjs
test-campaign.mjs
test-journey.mjs
test-map-registry.mjs
test-menu.mjs
test-battle-record.mjs
test-overseer.mjs
test-overseer-world.mjs
test-tether.mjs
test-abyss.mjs
test-glacier.mjs
test-orbital.mjs
test-datacenter.mjs
test-chapter-achievements.mjs
test-save-hub.mjs
test-melee-strike.mjs
test-player-motion.mjs
test-audio-lifecycle.mjs
test-session-lifecycle.mjs
```

## 人工验收建议

1. 从第4章自然开局，走原两段楼梯并完成6米防守；确认计时完成、清敌之后才出现 Boss。
2. 去东侧0米检修台开第一锁；回战斗台升至3米，向北跳到青色踏板，再升6米完成第三锁。分别试枪械和近战。
3. 在3/6米失足落地，去南侧亮灯呼叫柱按住 E，验证可回目标层且不回血；试一次运行中暂停/继续。
4. 不踩板等待紫色预警，分别横移和跳跃躲避；检查听感、颜色辨识及操控舒适度。
5. 击败后跳回平台，经桥/原维护梯或楼梯返回大厅，清敌并 E 撤离；分别试 stage 3失败重试、stage 4继续旧档。

浏览器夹具跳过前置守卫并显式摆位、使用受控50毫秒时钟；虽真实运行输入/物理/武器/任务流程，**不等于真人从关首自然完整通关或自然解锁纯刀成就**。音频只验证事件接线，听感、平衡、目标硬件性能仍待人工；软件WebGL截图的FPS不作性能结论。未运行完整默认/全部浏览器套件。

下一批候选：第5章 SKYHOOK；第6章港口 Boss随后单独推进。独立 H-01 原型不等于第5章 Boss。
