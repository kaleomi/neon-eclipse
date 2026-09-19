# P1 追加交付：重武器改装（CINDER / LANCE 三槽）（2026-09-19）

## 范围

- 原方案 5.2 "武器改装" 只覆盖七把常规枪；本批把 CINDER 与 LANCE 接入同一改装工坊，各三个互斥槽，每槽原装＋两种取舍组件。BREAKER 重锤不改装。
- 解锁门槛与常规枪完全一致：枪口 1 星、弹匣 2 星、瞄具 3 星或任一历史挑战。未领取重武器时也可保存配置，领取后于下次章首生效。
- 伤害、弹匣容量、备弹一律不变。所有组件均为取舍。

## 组件表

| 武器 | 槽 | 组件 1 | 组件 2 |
| --- | --- | --- | --- |
| CINDER | 发射管 | 长发射管：初速 +15%，装填 +10% | 短发射管：初速 −15%，装填 −8% |
| CINDER | 引信 | 速燃：引信 1.2→0.9 s，半径 4→3.4 m | 缓燃：引信 1.2→1.6 s，自伤 +20% |
| CINDER | 瞄具 | 广角：倍率 16，冷却 +8% | 抛物：倍率 28，装填 +6% |
| LANCE | 线圈 | 稳定：开镜阈值 0.9→0.75，第二目标衰减 0.7→0.6 | 加速：射程 70→90 m，换弹 +18% |
| LANCE | 能室 | 快装：换弹 −20%，冷却 +15% | 双能室：冷却 0.65→0.5 s，换弹 +15% |
| LANCE | 瞄具 | 广角镜：倍率 26 | 长焦镜：倍率 40，开镜阈值 0.9→0.95 |

## 实现

- `weapon-mods-rules.js`：`weaponMods.v1` 新增可选 `heavy:[[m,f,s],[c,e,s]]`（CINDER、LANCE）。旧检查点没有 `heavy` 字段仍合法并按原装读取；`heavyProfile(index,row)` 由不可变的 `ORDNANCE` 表派生冻结副本，`ORDNANCE` 本身不改。
- `weapon-mods-ui.js`：工坊追加重武器区（`heavySupported` 为假的地图隐藏），共用保存 / 二次确认重开 / 未来版本只读 / P4 禁用逻辑；导出 `heavy(index)` 供开火时读取。
- `ordnance-world.js`：新增 `getProfile` 注入；换弹时长、冷却、CINDER 引信 / 初速、LANCE 开镜提示均读改装后配置。`cinder-world.js` 的 `launchCinder` 接受 `{speed,fuse}`，默认值与原来相同。
- `app.js`：`createOrdnance` 注入 `workshop.heavy`；`cinderBlast` 半径 / 自伤、LANCE 射线射程 / 第二目标衰减 / 开镜阈值、开镜视野倍率读取改装配置。
- 附带修正（并行会话遗留）：`field-layouts.js` 数据中心薄板 `[10,26]` 与 `dc-intake` 出生点重合、列车爆炸桶 `[0,-11]` 与 `train-control` 出生点重合，均会触发 `spawnEncounter` 的 "Not enough safe encounter spawn points" 抛错并卡死浏览器测试。已移到 `[16,28]` / `[-1,-14]`，并在 `test-field-layouts.mjs` 追加九章出生点排除检查。

## 验证

- 新增 `test-heavy-mods.mjs`：可选 / 旧版形状、共享解锁门槛、27 种组合零伤害 / 弹药膨胀、各组件取舍、发射参数进入真实弹道、检查点信封。
- `test-weapon-mods-browser.mjs` 追加重武器场景：保存→章首应用→真实 H 发射按 0.9 s 引信爆炸→LANCE 在 75% 开镜时发射→旧 payload 回读为原装；选择器计数 21→27；九章工坊全部通过。
- `test-ordnance-browser.mjs` 九章 BREAKER / Boss 打断回归通过。
- 默认套件：435/435 check、102/102 rules、38/38 integration（`--jobs 2`），诊断 0。
- 边界：受控夹具，不代表真人手感与实机性能验收；P4 独立模式不应用；未改伤害、弹药、Boss 或存档键。
