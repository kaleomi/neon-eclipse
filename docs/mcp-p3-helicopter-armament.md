# 直升机武装：机头机炮 + 火箭吊舱（b14，2026-09-20）

## 范围
b9 遗留项之一。直升机获得固定朝前的机头机炮与 2 枚火箭，复用 `vehicle-weapons.js` 的弹链/装填/火箭/补给规则；只能在空中且发动机运转时开火；停机坪停稳自动补给。吊挂（sling-load）仍未做。

## 源码接线
- `vehicle-weapons.js`
  - `HELI_GUN` {interval .1, damage 8, range 240, belt 140, reload 2.8, spread .009, muzzleForward 3.2, muzzleDown 1.1, depression .14}。
  - `specFor(kind)`、`hasRockets(kind)`（plane/heli）取代原先散落的 `kind==='plane'?…` 分支；`createWeaponState('heli')`、`tickReload`、`stepRearm`、`weaponSummary` 统一走这两个入口。
  - `heliMuzzle(h)`、`heliAim(h)`（航向 + 固定下压 + 机身俯仰：前倾压低弹道）、`stepHeliGun(w,h,input,dt,range,boxes,opts)`：grounded / !powered / crashed 返回 null；火箭初速叠加 `h.vx/vy/vz`。
- `vehicle-app.js`
  - `heliGun=createWeaponState('heli')`，`recover` 重置；步进在飞机补给之前，目标为 `frontierActive()?frontierRange():range`，障碍 `planeBoxes`；击破提示。
  - 补给：`HELI_REARM` 动态取最近的停机坪（`HELI_PADS` + `FRONTIER_HELIPADS`，半径 12），着地即 `stopped:true`。
  - HUD：`#vw-*` 面板在直升机下显示机炮弹链与火箭；`#vw-hint`、`#control-hints` 新增直升机分支（此前直升机落到默认提示）；dataset 新增 `heliAmmo/heliRockets/heliShots/heliKills`。
  - `fireEffects.update([...,heliGun,...])` 复用曳光/火箭/爆炸渲染；音频计数器把直升机射击并入 `planeShots/rocketShots/planeHits`。
- `test-session-lifecycle.mjs`：VM 上下文加入 `heliGun`，recover 断言覆盖三把武器。

## 验收
- rules：新 `test-helicopter-gun.mjs`（状态/规格、枪口与俯仰耦合瞄准、空中限定开火门、弹链装填、火箭继承速度与间隔、停机坪补给、paused/NaN 惰性）PASS；weapons 相关既有测试全部 PASS。
- 浏览器：`test-helicopter-field-browser.mjs` 新增空中左键射击（`heliShots>0`、`heliAmmo` 下降）、右键火箭（`heliRockets<2`）、HUD 弹链文本断言；EXIT=0（HEAD vehicle.html，已恢复用户版本）。
- 分层：check 504/504、rules 117/117（此前 4 个武器 FAIL 已随用户自己的改动恢复）、integration 43/43。
- 未做：吊挂；直升机专属靶标/任务（当前打靶场与先遣队敌对单位）；机炮无法独立于机身瞄准（设计如此，提示已说明）。
