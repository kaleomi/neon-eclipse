# 载具场界面英文化（b17，2026-09-20）

## 范围
b8 遗留"i18n 缺口"中的载具页部分：`vehicle.html` 的静态界面文案（标题、任务简报、按钮、难度选项、键位图例、面板标题）接入既有 `i18n/` 骨架，并在开场面板加语言选择器。**运行时文案**（HUD、`notify()` 提示、任务开始按钮的 开始/重试/确认 状态文本、任务目标）仍为中文——它们由 `vehicle-app.js` / `flight-mission-ui.js` / `expedition-ui.js` 每帧写入，不在本批范围。

## 源码接线
- `i18n/zh-CN.js` / `i18n/en.js`：新增 63 个 `vehicle.*` 键（总 108，parity 测试通过）。`vehicle.start.*` 有意不收录（见上）。
- 新 `vehicle-i18n.js`
  - `VEHICLE_I18N_MAP`：选择器 → 键（不改 `vehicle.html` 标记，避免与用户工作树冲突）；`keepChildren` 用于 `#pause-drive`（保留 `<kbd>`）和 `#drive-overlay-title`（保留 `<em>`）。
  - `STRONG_BY_BUTTON`：无类名区分的简报（联合任务 / 飞行任务 / 两个检查点小节）按其包含的按钮定位 `<strong>` / `<p>`。
  - 难度 `<label>`/`<option>`、`.shared-control-legend` 文本节点单独处理。
  - `mountVehicleLanguagePicker`：在 `#drive-overlay-copy` 后插入 `#vehicle-language-select`，与主游戏共用 `neon-eclipse.locale.v1`。
  - `bindVehicleI18n`：load 时 apply，`onChange` 重新 apply，写 `html.lang` 与 `body.dataset.locale`。
- `vehicle-app.js`：在 `$`/`overlay` 定义后立即 `bindVehicleI18n(...)`，`window.neonVehicleI18n`。

## 验收
- rules：新 `test-vehicle-i18n.mjs`（映射键存在于双语字典、所有 `vehicle.*` 键被引用、英文简报无 CJK、`vehicle.html` 源文案与字典漂移守卫、DOM stub apply）PASS；`test-i18n.mjs` parity 108 键 PASS；check 513/513、rules 120/120、integration 43/43。
- 浏览器：新 `test-vehicle-i18n-browser.mjs`——默认 zh-CN、切英文后简报/按钮/难度/图例/隐藏面板标题均翻译、任务开始按钮保持中文（设计）、刷新后持久化并可切回、切换后仍能进入试验区；4/4 EXIT=0（HEAD vehicle.html，已恢复用户版本）。
- 未做：运行时文案（HUD/提示/目标/成绩面板内容）翻译；`index.html` 主游戏战斗内文案；用户当前工作树的 `vehicle.html`（ui-shell 版）未验证选择器是否仍匹配——未匹配的选择器会被静默跳过，不报错。
