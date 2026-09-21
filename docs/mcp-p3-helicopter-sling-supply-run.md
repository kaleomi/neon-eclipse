# 直升机补给链（方案 A，2026-09-21）

## 范围
在 b18 吊挂物理之上加"任务化 + 计分"：吊箱从岸边停机坪旁出发，按固定顺序送到 车库物资区 → 灯塔岛平台 → 海上平台（新增区，`PLATFORM` 甲板中心 (420,60)，地面高 12）。送达后 3 s 新箱出现在原位；摔坏 / 落在区外 / 投错区 8 s 后重新出现，进度不回退。三箱送齐一次性奖励：机载火箭 +2、弹链补满。未做：计时 / 评级（方案 B）、吊重对飞行动力学反馈（方案 C）、音效。

## 源码接线
- `helicopter-sling.js`：`SLING_ZONES` 加 `platform`；新增 `SLING_RUN`、`createSlingRun`、`stepSlingRun(run,s,ev,dt)`（消费 `stepSling` 事件，返回 `leg` / `wrongZone` / `lost` / `respawn` / `complete`）、`resetCargo`、`slingRunTarget`、`claimSlingReward`（一次性）、`slingRunSummary`、`slingRunHint`。纯规则，无 DOM。
- `helicopter-sling-world.js`：`update(...,target)` 第五参，当前目标区环改为琥珀色快呼吸。
- `vehicle-app.js`：`slingRun` 状态；`recover()` 重置；每物理帧 `stepSlingRun`，`complete` 时 `claimSlingReward` 加到 `heliGun.rockets` 并补满弹链；提示合并入 `#vw-hint`；`dataset` 新增 `slingRunStatus/Leg/Target/Respawn`。
- `test-session-lifecycle.mjs` VM 上下文加入 `slingRun/createSlingRun`，断言 recover 重置。

## 验收
- rules：`test-helicopter-sling.mjs` 新块（投错区惩罚与重生、按序两段、重生期间事件忽略、末段损失后仍可完成、`complete` 与一次性奖励、done 后忽略事件、fresh run 无奖励、区外落下计损失、`platform` 区落在甲板高度）PASS；check 656/656；rules 除 `test-import-graph`（用户未提交的 6 个模型文件导致，与本批无关）外全过。
- 浏览器：`test-helicopter-field-browser.mjs` 吊挂段延长：低空脱钩（区外）→ `slingRunRespawn>0` → 等待重生 → 重新挂钩 → 传送到车库区上空放下 → `slingRunLeg=1`、目标变为 island、`slingDeliveries=1`，截图 `heli-sling-run.png`；EXIT=0（`.tools/b20-heli-field4.log`）。
- 测试时限调整：重生等待 15 s→45 s、Ctrl 降落 45 s→90 s。原因：吊挂段结束后直升机停在 ~13 m 而不是原来的 ~4 m，软件光栅下 `dt` 被钳到 0.1 使模拟时间被拉长；非产品行为变化。

## 音效（2026-09-21 追加）
事件计数 `audioSling` → `VEHICLE_EVENT_SFX`：hook→`vehicle.enter`(.6)、touchdown→`player.land`(.7)、delivered→`vehicle.checkpoint`、damaged/dropped→`vehicle.impact`(.8)、run complete→`objective.complete`。复用现有合成配方，无新采样。
