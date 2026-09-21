# NEON ECLIPSE｜J01 / J02 两项视觉问题修复记录（2026-09-21）

入口：`docs/mcp-models-joint-acceptance-2026-09-21.md`（并行会话记录，未入库）中的 J01 / J02。用户选择“修理两项视觉问题”。本文件只记修复与验收，不覆盖并行会话原文。

## J02 · 固定翼仪表与武器 HUD 重叠（已修）

- 根因：`vehicle.css` 中 `<=1100px` 的 `#flight-instruments`（top 110 右栏）与 `<=1000px` 的 `#vehicle-weapon-panel`（top 115 右栏）占用同一区域；960×640 实测交集 270×116 px。
- 修复（仅样式，信息不删不透明化）：
  - `<=1100px` 且 `body[data-weapons-armed=true][data-vehicle-kind=plane]` 时仪表改置底部居中；`<=800px`（>560）收窄为 `left:190px; width:calc(100vw - 430px)`，让开左侧 `.drive-objective` 与右下 `.drive-instruments`；`<=560px` 改左下角窄栏（宽 `calc(100vw - 219px)`，字号收窄）。
  - 飞机在舱时 `#vehicle-weapon-panel` 压缩（top 234、padding 8/12），与仪表保持零交集。
- 验收：九种视口（1280×720…390×844）DOM 实测四面板（objective / flight-instruments / weapon-panel / drive-instruments）两两交集为零、无横向滚动、无越界；`test-flight-mission-browser.mjs` 的响应式 HUD 断言扩展纳入 `#vehicle-weapon-panel`，链 EXIT=0。

## J01 · 快艇前向视角被雷达/上层构件遮挡（已修）

- 根因两层：① 旧几何雷达拱位于艇首上方主观察区（并行会话 A/B 已证旧版亦有横杆）；② 当前代码中前向视角切换被 `!gunner` 挡住——`gunner` 初始为 true（漫游车炮手默认），导致游艇/固定翼按 C 永远进不了 hood，玩家与测试都无法使用。
- 修复：
  - `vehicle-app.js`：KeyC 条件改为 `kind&&(kind!=='rover'||!gunner)`，恢复游艇/固定翼前向视角切换（漫游车炮手席行为不变）；标签沿用既有“前向视角/追尾视角”文案。
  - 模型侧雷达拱下移后移由用户工作区 `vehicle-models.js` 完成（注释标明 J01），**不属本提交**；本提交只恢复可达性并验收组合效果。
- 验收：hood 视角静止与 46 km/h 航行截图（`.tools/j01-hood-parked.png` / `j01-hood-underway.png`）前方主观察区无遮挡，仅艇首低栏杆位于画面下缘；`test-sea-air-browser.mjs` 新增游艇 hood 切换回归（含标签断言与切回），链 EXIT=0。

## 连带修复：飞行任务浏览器链

- `test-flight-mission-browser.mjs` 在 UI 重组（简报迁入双层 tab deck，默认页不含启动按钮）后首步即超时，历史已坏。新增 `showButton`：沿 `aria-controls` 先开外层「独立任务」页、再开内层任务页，覆盖 start-flight / free-drive / retry / finish / start-chase 各点击点。链整体回绿并接管 J02 交集断言。

## 验证汇总

- check 659/659；`test-flight-mission-browser.mjs` EXIT=0；`test-sea-air-browser.mjs` EXIT=0（含新 hood 回归）。
- 未改物理、射击/伤害、AI、登乘与存档数值；未提交用户工作区模型文件。
