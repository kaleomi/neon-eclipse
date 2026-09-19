# P1 追加交付：Boss 框架统一读取层与全局攻击预算（2026-09-19）

> 本文是本批实现与验证记录；当前状态入口仍是 `docs/mcp-project-status-roadmap.md`。Git 提交不是功能验收证据。

## 1. 范围与决策

- 用户批准顺序第③批。目标不是重写九个 Boss，而是：① 给三种形态的 Boss 规则模块一个统一的只读视图 + 统一的打断入口；② 让 Boss 预警、重炮机甲迫击炮与普通弹丸攻击者共享同一份“同时最多 3 个预警”的预算。
- 不修改任何 Boss 的机关、血量、暴露窗口、阶段阈值或伤害；不改 WARDEN（反应堆普通 Boss 走 `enemy-ai.js`，不在场地 Boss 之列）。

## 2. 新模块

- `boss-adapter.js`：`createBossAdapter(rules,kind,{name,maxHp})`。kind ∈ overseer/tether/abyss（旧状态机）、glacier（armored/sunk/climbing）、blast/beam/siege（`boss-framework` 派生）。统一提供 `status`（inactive/shield/exposed/defeated）、`telegraph`（rest/warning/live）、`threatening`、`exposed`、`alive`、`blocking`、`snapshot()`、`interruptCharge()`、`resetInterrupt()`；打断逻辑仍由 `boss-charge-interrupt.js` 承担，适配器只是拥有它。
- `attack-budget.js`：`createAttackBudget({max:3})`，来源用 `register(key,countFn)` 注册实时计数；`allow(key)` = 本源 + 其它源 < max；`external(key)`、`total()`、`count(key)`。非有限计数按 0 处理。

## 3. 源码接线

- 七个场地世界模块（`overseer/switchyard/elevator/siege/tether/abyss/glacier-world.js`）：以 `createBossAdapter` 替代直接 `createBossChargeInterrupt`，保留 `breaker.interrupt/reset` 现有调用路径，并对外新增 `boss` 只读属性。
- `projectiles.js`：新增可选 `hooks.budget`；排队时 `已占槽 + budget.external('projectiles') >= maxAttackers` 即拒绝。已持槽的攻击者仍可续排。
- `enemy-ai.js`：`createEnemyDirector({attackBudget})` 注册 `mortars` 来源；重炮机甲只在 `attackBudget.allow('mortars')` 时预警（无预算时回退旧的 `attackers<3`）。
- `app.js`：`const attackBudget=createAttackBudget({max:3})`，来源 `projectiles`（`enemyProjectiles.attackers`）、`boss`（`overseer?.boss?.threatening?1:0`）、`mortars`（导演注册）；传入 `createEnemyProjectiles` 与 `createEnemyDirector`。

## 4. 验证

- 规则 `test-boss-adapter.mjs`：八个真实 Boss 规则模块（含 SKYHOOK/LEVIATHAN）状态/预警/暴露映射、打断每结构阶段一次、不改血量/阶段；预算注册/外部计数/allow 语义/Boss 占槽/注销/NaN 计数。
- 集成 `test-attack-budget-world.mjs`：真实 `createEnemyProjectiles` 在 Boss 预警时只放两个攻击者、预警结束恢复；真实监察者适配器作为预算来源并可被打断释放；真实导演的重炮机甲在预算满时不预警、释放一个槽后预警、迫击炮飞行期间占槽、落地释放。
- 浏览器 `test-attack-budget-browser.mjs`（roof 真实页面）：阶段 1 真实刷怪，三攻击者上限成立；监察者 warning 时同时攻击者最多两个、总数不超 3；`overseer.interruptCharge()` 释放。
- 回归：`test-boss-charge-interrupt`、`test-boss-framework`、`test-siege-bosses`、`test-squad-world`、`test-enemies`、`test-commander`、`test-swarm` 通过；`test-ordnance-browser.mjs`（九章 Boss 打断）通过。
- 全量 `scripts/run-tests.mjs --jobs 2`：445/445 check、104/104 rules、40/40 integration，退出 0；`get_diagnostics` 0。

## 5. 失败与修正记录

- 规则测试首版预算算术写错（两攻击者 + 一迫击炮应当拒绝第三攻击者），修正的是断言而非实现。
- 浏览器用例首版在 roof 阶段 0 用任意偏移摆位，守卫与玩家之间有屋顶掩体导致 0 次攻击（不是预算问题）；改用 `spawnEncounter(mission.current)` 在阶段 1 的真实刷怪点。`overseer-world` 不直接暴露 `state`，用例改经 `overseer.boss.rules.state`。

## 6. 未完成 / 边界

- 适配器是读取层与打断入口，不是九 Boss 生命周期的全面合并；各自机关/阶段仍在各自规则模块。
- 预算目前接入弹丸、迫击炮、场地 Boss 预警；哨兵/蜂群仍经弹丸系统间接受限，未单独建模。WARDEN 与地面危害不占预算。
- 无真人手感/性能验收。
