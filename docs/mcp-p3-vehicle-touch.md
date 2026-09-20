# 载具场触屏控制（b16，2026-09-20）

## 范围
b8 遗留"触屏"缺口，仅针对 `vehicle.html`。虚拟摇杆 + 右侧视角拖拽区 + 11 个按钮，走与键盘/手柄相同的键码注入路径；不改 `vehicle.html` 标记（DOM 与样式由模块自建）。

## 源码接线
- 新 `vehicle-touch.js`
  - `shouldShowTouch({matchMedia,search,maxTouchPoints})`：`(pointer: coarse)` 或 `maxTouchPoints>1` 或 `?touch=1`；`?touch=0` 强制关闭。
  - `stickToKeys(dx,dy)`：半径 56 px、死区 .12、阈值 .3 → WASD；向量裁剪到单位圆。
  - `createTouchState()`：多指针状态机（stick / look / button），`read()` 每帧消费 look 增量与 tap；`clear()`。
  - `TOUCH_BUTTONS`：刹车(Space,hold) 上下车(E) 炮手(F) 启停(I) 视角(C) 拉起(Shift,hold) 下降(Ctrl,hold) 回收(R,hold) 开火(action) 火箭(action) 暂停(Escape)。
  - `mountVehicleTouch(doc)`：注入 `#touch-controls` + `<style>`，pointer 事件；`poll()` 返回 `{press,release,edges,fire,rocket,look}`（与 `vehicle-gamepad` 相同契约），`reset()`。
- `vehicle-app.js`
  - `touchEnabled` 判定 → `mountVehicleTouch(document)`；`dataset.touchControls`；`window.neonVehicleTouch`。
  - `pollTouch()` 紧随 `pollGamepad()`；edge 键回放 keydown/keyup；非 active 时释放注入键与 fire。
  - 火箭键统一为 `syncRocket()`：`mouseRocket || padRocket || touchRocket || held('KeyG')`，消除三路输入互相覆盖；`clearInput` 一并清零。

## 验收
- rules：新 `test-vehicle-touch.mjs` PASS；check 510/510、rules 119/119、integration 43/43。
- 浏览器：新 `test-vehicle-touch-browser.mjs`（`hasTouch` 上下文，`?touch=1`）——挂载 11 个按钮、上下车、摇杆驾驶、刹车、炮手位、开火/停火、视角拖拽、暂停/恢复清理高亮、`?touch=0` 隐藏；5/5 EXIT=0。注意 swiftshader 下同一 page 二次 `goto` 会卡在 load，改用新 page + `domcontentloaded`。
- 未做：真机验收；按钮按载具情境隐藏（当前全部常显）；`vehicle.css` 未改；主游戏 `index.html` 触屏仍是缺口。
