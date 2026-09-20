# 先遣队 6–8 表现音效（b13，2026-09-20）

## 范围
为 b12 的敌对死亡表现补音频：无人机空爆/落地爆炸、炮塔/雷达/机甲倒塌、机甲脚步。沿用车辆音频的"计数器差分 → 目录音效"路径，不新增合成配方。

## 源码接线
- `frontier-missions.js`：`pushEffect` 同时累加 `m.effectCounts.{explode,collapse,step}` 并记录 `m.lastEffect`（mission 初始化含 `effectCounts`）。
- `audio/vehicle-audio.js`：`VEHICLE_EVENT_SFX` 新增 `frontierExplosions:'kill.boss'`、`frontierCollapses:'vehicle.impact'`、`mechSteps:'player.land'`；新增 `EVENT_GAIN` 表（hullHits .9、frontierHits .9、frontierExplosions .7、frontierCollapses .8、mechSteps .45）替代原先硬编码；`mechSteps` 每帧最多触发 1 次。
- `vehicle-app.js`：`vehicleAudio.events({...})` 追加 `frontierExplosions:frontier.effectCounts?.explode`、`frontierCollapses:…collapse`、`mechSteps:frontier.mechSteps`。

## 验收
- rules：`test-audio.mjs` 新增表现事件映射/增益/脚步合帧断言；`test-frontier-presentation.mjs` 新增 `effectCounts`/`lastEffect` 断言；`test-ground-audio-feedback`、`test-helicopter-audio`、`test-frontier-missions` 保持 PASS。
- 浏览器：`test-vehicle-audio-browser.mjs` 新增第 4 步——开始风电场、fixture 击落一架无人机，观察到 `events()` 输出两次 `kill.boss`（空爆 + 落地），`effectCounts.explode===2`；5/5 EXIT=0（HEAD vehicle.html，已恢复用户版本）。注意：任务开始后 `vehicleAudio.reset()` 会把下一帧记为基线，fixture 需等待约 400 ms 再击杀，否则第一次爆炸被吞成基线。
- 分层：check 500/500，rules 111/115（4 FAIL 为用户未提交武器改动 halo/railspike/tempest/volt），integration 43/43。
- 未做：脚步/爆炸的 3D 定位（`sfx.play` 支持 position/listener，但 `events()` 路径未传位置，全部为非定位播放）；无专用爆炸配方，复用 `kill.boss`。
