# 第 4 章极地：雪地脚步素材替换

日期：2026-09-22
项目：`game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6`

## 用户反馈

“4 雪地的脚步太响了，换一个。” 用户选择：从网站下载新素材、切片接入并署名。

## 原状

- `audio/game-audio.js` 在 `facts.map==='polar'` 时每 1.65 m 播放 `player.step.snow`。
- `audio/recorded-audio.js` 中 `player.step.snow` gain 0.35（金属 / 砂砾均为 0.30）。
- 三条样本来自 Sonniss GDC 2019 `S23_SFX_Footsteps_Snow_Singles_Sequence.wav`，0.30 s，峰值约 -5 dBFS，冰壳碎裂感强、瞬态尖锐。
- 原始 Sonniss 素材包（4 GB）本机未留存，无法就地重切。

## 新素材

- 来源：OpenGameArt “42 Snow and Gravel Footsteps”，录音 Corsica_S，切分 Iwan “qubodup” Gabovitch，**CC0 1.0**。
  https://opengameart.org/content/42-snow-and-gravel-footsteps
- 从 18 条 `Walking_on_snow_covered_gravel_*.flac` 中按波峰因数最低、起音干净挑选 02 / 06 / 13。
- 处理：单声道 44.1 kHz，自起音起截 0.36 s，5.5 kHz 低通，80 ms 淡出，峰值归一 -9 dBFS，Vorbis 编码。
- `player.step.snow` gain 0.35 → 0.24。综合峰值下调约 4 dB、增益下调约 3.3 dB，合计约 -7 dB，且高频锐度降低。

## 改动文件

- `audio/samples/step-snow-1.ogg`、`step-snow-2.ogg`、`step-snow-3.ogg`（替换；旧文件与哈希备份在 `.tools/qa-snow-steps-2026-09-22/before/`）
- `audio/recorded-audio.js`：仅 `player.step.snow` gain
- `audio/samples/sources.json`：三条记录改为新来源、处理说明、下载地址与源 / 产物 SHA256
- `audio/samples/LICENSE.txt`、`audio/samples/CREDITS-MUSIC.txt`、`audio-credits.html`：增加 CC0 署名

未改 `game-audio.js` 的步距、地图判定与其它任何事件；未改存档、玩法或其它会话的未提交修改。

## 验证

- `node --check audio/recorded-audio.js`、`sources.json` JSON 解析通过；`git diff --check` 通过。
- `test-audio.mjs`、`test-asset-preload.mjs`、`test-audio-lifecycle.mjs` 退出 0。
- `test-recorded-audio-browser.mjs`（本机 Playwright，真实极地页面）退出 0：23 项检查、33 份录音全部解码，“actual polar page: wind, grounded footsteps, pause” PASS。日志 `.tools/qa-snow-steps-2026-09-22/`。
- `test-ground-audio-feedback.mjs` 2/6：4 项失败均为 `c.createRadialGradient is not a function`（Canvas mock 缺口，属前批已记录的主回归遗留项），与本次音频改动无关。

## 边界

- 是否“不再太响”最终需用户真机耳机 / 扬声器确认；若仍偏响，只需继续调低 `player.step.snow` gain。
- 未提交、未推送、未打包。
