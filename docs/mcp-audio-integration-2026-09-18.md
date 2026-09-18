# 音频增量补记：载具事件与第 7–9 章提示

> 后续稳定性修复：`docs/mcp-audio-lifecycle-stability.md` 已补 FPS 重试/延迟连杀清理、载具完整音频 reset 和波浪输出隔离。下方是最初接线记录；真人试听及完整生命周期验收仍未完成。

日期：2026-09-18。本轮补记录与归档既有源码，不新增音频玩法、不改任务数值、不制作 EXE。当前总进度：`docs/mcp-project-status-roadmap.md`。

## 已接入的实现

### 载具

- `vehicle-app.js` 创建 `createVehicleAudio({storage:localStorage})`；用户手势解锁，手动暂停/恢复调用音频总线，帧循环更新当前载具、速度、油门、失速/坠毁和水边状态。
- `audio/vehicle-audio.js` 保留越野车、游艇、固定翼连续声床；新增纯函数 `vehicleAudioEvents`，以计数快照差分触发一次性音效，首次只建立基线，计数回落不补播历史事件。
- 实际接线包括车顶/飞机射击与命中、火箭、海战射击/命中、维修、补弹、着陆、节点、船体受损和护送波次等。枚举中存在的 `seaSplashes` 不等于入口已提供该计数，不能仅凭映射表声称所有事件均已接线。
- 载具音频和先遣队在 `vehicle-app.js` 同行交叉接线；本轮保留完整既有入口，不把其他会话的新原型变更带入。

### 第 7–9 章

- `chapter-cues.js` 从世界/Boss 快照产生提示，`app.js` 将提示送入已有 `gameAudio.play`。
- 第 7 章：重力带、平台触发、TETHER 预警/脉冲及暴露窗口。
- 第 8 章：水位阶段、ABYSS 放电/召唤与暴露窗口。
- 第 9 章：暴风雪阶段、低体温/进入冻伤、GLACIER 重炮/压冰/陷冰/爬出。
- `audio/sfx-catalog.js` 补程序化配方及蓝色蜂群预警；`tether-world.js`、`abyss-world.js` 暴露状态供提示读取。
- 本批是状态提示音，不等于完整环境声床、语音或混音已验收；进入冻伤提示不是每次持续冻伤扣血必播。

## 验证证据与边界

- 历史 `test-vehicle-audio-browser.mjs` 首轮启动等待超时；原脚本复测 3/3、退出码 0。已读取工作区 `.tools/p3-expedition-batch5/reconnect-audio-default-results.json` 核对返回码。该脚本覆盖首次手势、越野车射击及暂停/恢复，不覆盖所有载具/所有事件，也不证明音质。
- `test-chapter-cues-browser.mjs` 已存在，使用受控章节探针验证提示播放计数；本轮未找到其完成结果，不声称该专项已通过，更不当作自然通关或真人听感。
- `test-audio.mjs`、`test-chapter-cues.mjs` 是本轮选择的串行轻量验证；最终结果见 `docs/mcp-change-ownership-2026-09-18.md`。
- 完整默认套件历史结果包含上述规则脚本；浏览器不包含在默认 `npm test` 内。

## 稳定性待验收

1. 人工试听三类载具与七八九章：音量平衡、预警可辨、静音及设置保存。
2. 暂停/恢复、切出页面、任务结算、死亡/重试、跨关时没有持续声或旧状态误提示；检查 `resetEvents` / `chapterCues.reset` 的实际调用需求，不因函数存在就宣称生命周期完整。
3. 低帧率下提示不过密、不漏关键预警；性能测试需用户同意后独立执行。
4. 环境声床、缺失事件、完整空间化与混音作为后续，不重复实现已接入内容。
