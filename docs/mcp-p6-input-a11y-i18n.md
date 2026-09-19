# P6 交付：键位重绑 / 手柄 / 辅助功能 / i18n 骨架（2026-09-19）

> 对应 `docs/mcp-full-development-plan.md` §10（输入 / 可访问性 / 本地化）。本批是原定八个批次的最后一批。
> 状态只描述本批已验证事实；未做的项在文末明确列出，不以“已接入骨架”冒充完成。

## 1. 交付内容

### 1.1 键位绑定层 `input-bindings.js`（纯规则，无 DOM / three）

- `ACTIONS`：19 个动作（移动 6、战斗 7、菜单 4、键盘转向 2），每个动作带默认 `e.code` 列表、中文标签与分组。
- `createBindings({storage})`：`is(code,action)` / `held(keysSet,action)` / `actionFor(code)` / `codesFor(action)` / `legend()`。
  - `rebind(action,code)` 采用**交换语义**：目标键若已属于其他动作，对方取回本动作原主键，保证任何时候没有动作被绑空（测试逐动作断言）。
  - 保留键 `RESERVED_CODES`（Esc、方向键、Digit1–8、Enter、Tab）拒绝；`LOCKED_ACTIONS`（pause / turnLeft / turnRight）不可改。
  - 存储 `neon-eclipse.bindings.v1` 只保存覆盖项；恢复默认即删除该键；损坏 JSON、版本不符、非法 code、超过 2 键均被 `sanitizeOverrides` 丢弃。
- 手柄：`readGamepad` 按标准布局映射 17 键（`GAMEPAD_BUTTONS`），摇杆死区 0.18 + 视角 1.6 次幂曲线；`createGamepadInput` 逐帧输出 `pressed / released` 边沿、`move / look / held` 与 `active`。

### 1.2 `app.js` 接入

- 所有硬编码 `e.code==='KeyX'`（T/U/Q/F/G/V/B/H/R/Space）改为 `bindings.is(e.code,action)`；WASD / Shift / 方向键 / 按住 E 改为 `bindings.held(keys,action)`。`grep "e.code==='Key" app.js` 现为 0 处。
- `pollGamepad()` 在每帧 `update` 前运行：摇杆写入 `padMove / padLook / padHeld`；按键边沿分两类：
  - 无键盘对应的 `fire / aim / pause / weaponNext / weaponPrev` 直接调用 `firing / aiming / pause() / changeWeapon()`（换枪只在 `loadout.allows` 的槽位之间循环）。
  - 其余动作合成 `KeyboardEvent(keydown/keyup)`，`code` 取该动作当前主键——因此手柄自动跟随用户重绑，且 T/U 装备终端、G 预瞄/松手、H 蓄力等现有按键语义无需第二份实现。
- 手柄视角灵敏度复用现有“瞄准灵敏度”滑块（`combatUI.sensitivity`）与 ADS 缩放。
- 新增全局：`window.neonInput={bindings,gamepad}`、`window.neonA11y`、`window.neonI18n`、`window.neonShape`。

### 1.3 辅助功能 `accessibility.js`

- 偏好 `neon-eclipse.a11y.v1`：`colorMode`（off / deuteranopia / protanopia / tritanopia / high-contrast）、`shapes`、`subtitles`、`subtitleSize`（1 / 1.25 / 1.5）。
- 色觉模式：向 `body` 注入一次隐藏 `<svg id="a11y-filters">`（三种 `feColorMatrix`），把 `filter:url(#cvd-*)` 施加到 WebGL `canvas`；高对比为 `contrast(1.25) saturate(1.3)` 并在 `menu.css` 给 HUD 文本加描边。只影响画面，不改敌人规则或颜色常量。
- 形状标记：`COLOR_SHAPES` 把 `enemy-rules.js` 的 `attack.color`（orange ▲ / purple ◆ / amber ● / pink ✦ / blue ⬢ / green ⬟）映射为字形；`enemy-ui.js` 的目标检视名称在 `html[data-a11y-shapes=true]` 时前缀该字形。
- 音效字幕：`createSubtitles().attach(gameAudio)` 包装 `play(name,opts)`，`CAPTIONS` 表覆盖 21 个音效名；带 `position` 的音源按相机 yaw 计算 前/后/左/右 方位（`bearingFor`，已单测四象限与 yaw 旋转）；队列 250ms 去重合并计数、最多 4 行、2.4s 生存，`.sfx-subtitles` 面板 `role=log aria-live=polite`，菜单打开时隐藏。

### 1.4 i18n 骨架 `i18n/`

- `zh-CN.js`（源真相）与 `en.js`：45 键，覆盖主菜单五项、设置页标题/分组/底栏、键位绑定、手柄、辅助功能、语言面板。
- `createI18n`：`t(key,vars)` 占位符替换、回退 zh-CN 再回退 key；`apply(root)` 处理 `data-i18n` 与 `data-i18n-attr="attr:key;…"`，同时设置 `<html lang>`；`neon-eclipse.locale.v1` 持久化，未保存时按 `navigator.languages` 探测。
- 明确边界：**战斗内文案（任务、提示、Boss、HUD）未翻译**，语言面板提示已如实写明。

### 1.5 设置界面 `input-settings-ui.js` + `menu-ui.js` + `menu.css`

- “操作”面板追加：键位绑定表（三组、点击监听、Esc 取消、保留键提示、交换提示、● 标记自定义、恢复默认）与手柄状态（监听 `gamepadconnected`）。
- 新增“辅助功能”面板（色觉单选、形状/字幕勾选、字幕大小）与“语言”面板。
- 设置页现有标题/分组补 `data-i18n`，语言切换即时 `apply(card)`。

## 2. 验证

| 层 | 结果 |
| --- | --- |
| `node scripts/run-tests.mjs --layer check` | 474/474 |
| `--layer rules` | 111/111（新增 `test-input-bindings.mjs`、`test-accessibility.mjs`、`test-i18n.mjs`） |
| `--layer integration` | 42/42 |
| `get_diagnostics` | app.js / menu-ui.js / enemy-ui.js / 新文件 / menu.css 均 0 |
| `test-smoke-browser.mjs` | 15/15（九章启动、开始/暂停/重试、音频、存档、遥测、载具页） |
| `test-input-a11y-browser.mjs`（新） | 连续 3 次 PASS |

浏览器专项实际覆盖：设置页把跳跃从 SPACE 重绑到 X 并落盘 → 进入反应堆后 Space 不再起跳、X 起跳（以脚部高度观测，因 `jumpRequested` 一帧内被消费）；方向键重绑被拒并显示“该键为保留键”；勾选字幕/形状、选绿色弱后 `canvas.style.filter` 含 `cvd-deuteranopia` 且 SVG 滤镜存在；切到 en 后标题变 `Settings`、`<html lang=en>`，切回 zh-CN 复原；伪造标准手柄（`navigator.getGamepads` 注入）左摇杆前推玩家位移 >0.5m、RT 置 `firing`、RB 切到下一个可用武器槽（反应堆默认 [0,2,3] → 2）、Start 进入 `paused`；对局中字幕面板出现至少一条（观察到“继续”“◀ 敌方开火”）。全程 `pageerror` 为空。

失败记录（已修正，保留）：首版测试用 `?menu=chapter` 打开导致 `#menu-settings` 不可见；`[data-a11y-shapes]` 选择器同时命中 `<html>` 数据属性，改为 `#menu-a11y input[...]`；软件 WebGL 下 150ms 固定等待偶发失败（RT / RB / 跳跃），改为状态等待。

## 3. 本批未完成 / 不宣称

- 触屏（虚拟摇杆）未做；计划 §10 标注“轻量”，本批优先手柄。
- 手柄未提供自定义映射 UI，仅标准布局；无震动反馈；菜单导航仍靠鼠标 / 键盘（Start 在菜单中触发主按钮）。
- 色觉滤镜是 canvas 级后处理近似，未针对每种模式重调敌人调色板；形状标记只出现在目标检视与字幕，未画进 3D 预警特效。
- 字幕只覆盖 `gameAudio.play` 名称表，程序化音乐层与载具页 `vehicle-app.js` 未接。
- i18n 仅菜单/设置骨架；`vehicle.html`、行动档案页、战斗 HUD 未接入；无第三语言。
- 无真人手柄 / 色觉用户验收，本节均为自动化与开发者自测。
