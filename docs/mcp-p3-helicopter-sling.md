# 直升机吊挂（b18，2026-09-20）+ 触屏显示判定修正

## 范围
b9 最后一个遗留：直升机吊运。岸边停机坪旁一个物资吊箱，两个投放区（车库物资区、灯塔岛平台）。悬停挂钩 → 吊运（弹簧滞后摆动）→ 缓降触地 → 脱钩计送达；高空脱钩摔坏；区外落地计 dropped。自由试驾且武器可用（`armed()`）时启用。

附带修正：b16 的触屏显示判定在"桌面 + 触摸屏"（远端 Windows 报告 `maxTouchPoints=10` 但主指针 fine）下会挂载覆盖层，其 look 区吃掉画布中央的鼠标事件导致左键无法开火（直升机机炮浏览器测试因此超时）。

## 源码接线
- 新 `helicopter-sling.js`（纯规则）：`SLING` {cable 9, hookRadius 4, hookMin/Max 5/14, safeDrop 3.2 m/s, zoneRadius 7}；`SLING_CARGO` (214,104)、`SLING_ZONES` 车库 (-92,118) / 灯塔岛 (island.x-10, z+6)；`createSling`、`hookBlocked(s,h)`（原因字符串：悬停/横向/太低/太高/速度）、`toggleHook`、`stepSling(s,h,dt,groundAt)`（挂钩：吊箱悬在钩下 cable 处，水平弹簧 14/阻尼 4.5 跟随，地面比缆绳近则松弛触地 `touchdown`；坠毁自动 `release`；自由：重力下落，落地按冲击速度判 `damaged` / 区内 `delivered` / 区外 `dropped`）、`slingSummary`、`slingHint`。
- 新 `helicopter-sling-world.js`：木箱（损坏换深色）、机腹到箱顶的缆线、投放区呼吸光环。
- `vehicle-app.js`：`sling`/`slingModel`；直升机内 F（`armed()` 时）挂/脱钩；`stepSling` 每物理帧运行（不限当前载具，脱钩后箱体仍会落地）；事件 notify；`#vw-hint` 直升机分支追加吊挂提示；dataset `slingHooked/slingDeliveries/slingDamaged/slingCargoY`；`recover` 重置。
- `vehicle-touch.js`：`shouldShowTouch` 改为 `coarse && maxTouchPoints>0`（`?touch=1/0` 仍优先）；覆盖层对 `pointerType==='mouse'` 且非按钮的事件放行。
- `test-session-lifecycle.mjs` VM 上下文加入 `sling/createSling`，断言 recover 脱钩。

## 验收
- rules：新 `test-helicopter-sling.mjs`（布局在可行走地面/岛台、挂钩门五种拒绝原因、缆长悬挂、弹簧滞后与收敛、触地松弛、区内送达、高空摔坏、区外 dropped、坠毁释放、dt 惰性、zones 不共享）PASS；`test-vehicle-touch.mjs` 更新判定断言；check 520/520、rules 122/122、integration 43/43。
- 浏览器：`test-helicopter-field-browser.mjs` 新增吊挂段（悬停挂钩 → `slingHooked=true`、箱体离地 → 降到 0.3 m 脱钩 → 完好）EXIT=0；`test-vehicle-touch-browser.mjs` 新增"非触屏上下文不挂载"步骤 6/6。
- 未做：吊挂对飞行动力学的反馈（当前箱体不影响直升机姿态/功率）；吊运任务化/计分；音效。
