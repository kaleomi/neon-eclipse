# 载具场手柄支持（b15，2026-09-20）

## 范围
b8 遗留"手柄"缺口。`vehicle.html` 之前完全没有 Gamepad 输入（主游戏 `app.js` 已有 `createGamepadInput`）。本批加入标准布局手柄映射，四种载具 + 步行 + 炮手位 + 暂停均可用；不做自定义映射与震动。

## 源码接线
- 新 `vehicle-gamepad.js`（纯函数 + 轮询器）
  - `VEHICLE_PAD`：held {A→Space, B→ControlLeft, 十字上→ShiftLeft, 十字下→ControlLeft}，edge {X→KeyF, Y→KeyC, LB→KeyE, RB→KeyI, Back→KeyR, Start→Escape, RS 按下→KeyQ}，左摇杆阈值 .35 → WASD，LS 按下→ShiftLeft（冲刺），RT→fire，LT→rocket，右摇杆→look（×14，鼠标 movement 单位）。
  - `mapVehiclePad(gp,prevButtons)` 返回 `{keys,edges,look,fire,rocket,buttons,active}`；edge 只在上升沿产生。
  - `createVehicleGamepad({getGamepads})`：跨帧 press/release 差分，只释放自己注入过的键（不影响键盘按住的键）；`reset()` 返回需释放的键；拔掉手柄自动释放。
- `vehicle-app.js`
  - 鼠标 `mousemove` 处理体抽成 `applyLook(mx,my)`，手柄右摇杆复用。
  - `pollGamepad()` 在 `frame()` 每帧开头调用：edge 键通过合成 `KeyboardEvent('keydown'/'keyup')` 走既有 keydown 处理（含 E/F/I/C/R/Q 全部分支），Start 直接 pause/resume；非 active 时释放注入键。
  - `dataset.gamepad`；首次检测到手柄弹出 `VEHICLE_PAD_HELP` 提示。
  - 未改动 `vehicle.html`。

## 验收
- rules：新 `test-vehicle-gamepad.mjs`（摇杆/死区/阈值、右摇杆、held vs edge、扳机、轮询器 press/release/edge/reset、断开与 null 槽位）PASS；check 507/507、rules 118/118、integration 43/43。
- 浏览器：新 `test-vehicle-gamepad-browser.mjs`（`navigator.getGamepads` 桩）——插入提示、LB 上车、左摇杆驾驶、A 刹车、X 炮手位、RT 射击、右摇杆瞄准、松开停火、Start 暂停/恢复、拔出清理；5/5 EXIT=0（HEAD vehicle.html，已恢复用户版本）。
- 未做：真实手柄真人验收；自定义映射/震动；触屏；`package.json` 未加脚本（避免碰用户工作树之外的入口，可直接 `node test-vehicle-gamepad-browser.mjs`）。
