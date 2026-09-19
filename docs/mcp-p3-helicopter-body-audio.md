# P3 增量：停放直升机实体碰撞与旋翼音频（2026-09-19）

范围：b9 遗留两项。不涉及 `app.js` / `weapons/*`（另一会话在改）。

## 1. 停放机体碰撞（`helicopter-field.js`）

- `HELI_BODY`：机身沿机头→座舱→尾梁 9 个采样圆（r 1.5）+ 两侧滑橇各 2 个（r 0.7），`reach` 9 m 做快速剔除。
- `helicopterBodyPoints(s)` 随 `yaw` 旋转，与 `helicopterDoorPoints` 同一坐标系；`helicopterBlocks(s,x,z,r)`：只有 `grounded` 的机体阻挡（空中不挡地面；坠毁残骸继续挡）。
- `vehicle-app.js`：`walkingWorld.free` 追加 `!helicopterBlocks(heli,x,z,r)`；`roverWorld.free` 追加 `helicopterBlocks(heli,x,z,r+.6)`。舱门站立点（offset 3.3 > 机身半径）保持可站立，不影响 E 上机。
- 测试：`test-helicopter-field.mjs` 新增机身/机头/滑橇实体、舱门自由、空中不挡、残骸挡、越野车半径、朝向旋转断言；`test-helicopter-field-browser.mjs` 新增“离机后面向座舱按住 W 1.5 s，停在 1.4–3.6 m”原生按键检查（首次 5 点采样在 1.29 m 穿入间隙，改为 9 点后通过）。

## 2. 旋翼音频（`audio/vehicle-audio.js`）

- 纯映射 `helicopterRotor(rpm,collective,speed,crashed)` → `{slap,freq,gain,whine,whineGain,wind}`：冷机 0 增益，转速抬高桨叶拍频 2.5→18 Hz、涡轮音高与增益，总距加载，坠毁静音，输入夹紧。
- 图：在现有引擎床上增加 `slapLfo→slapDepth→engGain.gain` 幅度调制（独立于海浪 LFO），`kind!=='helicopter'` 时归零；`silence()` 一并清零。`vehicle-app.js` 现在把 `kind:'helicopter'`、`rpm`、`collective` 直接传给 `update`（原先伪装成 `plane`）。
- 一次性事件：`VEHICLE_EVENT_SFX` 新增 `rifleShots→fire.vanguard`、`rifleKills/frontierKills→kill`、`frontierHits→vehicle.impact(gain .9)`；`vehicle-app.js` 统计先遣队敌对单位存活数下降为 `audioFrontierKills`，步枪射击计数直接来自 `rifle.shots`（生命受击沿用 `audioHullHits`）。
- 只读 `vehicleAudio.bed()` 暴露最近一次映射参数，供测试/调试，不参与逻辑。
- 测试：`test-audio.mjs` 新增旋翼映射与先遣队事件断言；`test-vehicle-audio-browser.mjs` 新增真实链路：刹停下车 → 舱门 E 上机 → 冷机 bed 增益 0 → I 启动后 slap/whine/gain 上升 → I 熄火后增益回落（4/4）。

## 3. 验收

- 诊断 0；check 498/498、integration 43/43；rules 110/114 —— 4 项失败为 `test-halo/railspike/tempest/volt`（`formatBossBattleRecord` 输出），来自另一会话未提交的 `weapons/*` / `boss-battle-record.js` 改动，不属于本批。
- 浏览器串行：helicopter-field-browser、expedition-browser、vehicle-audio-browser 通过。注意工作区 `vehicle.html` 有另一会话未提交的 `ui-shell.js`/`ui-clean` 改动，会隐藏 `#expedition-difficulty` 等控件导致载具侧浏览器测试无法点击；本批验证时临时以 HEAD 版本 `vehicle.html` 运行，测完恢复其工作副本，未提交对方改动。
- 未做：机体与飞机/快艇之间的互撞、旋翼下洗音效、真人手感。
