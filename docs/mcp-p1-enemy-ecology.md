# P1 追加交付：敌人生态与小队协同（冲锋自爆机 / 重炮机甲 / 行为树小队）（2026-09-19）

> 本文是本批实现与验证记录；当前状态入口仍是 `docs/mcp-project-status-roadmap.md`。Git 提交不是功能验收证据。

## 1. 范围与决策

- 用户批准的开发顺序第②批：敌人生态（两种新敌人）+ 小队协调层。不改 Boss 框架、不引入全局攻击预算（第③批）。
- 新增独立模块 `squad.js`：极简行为树组合子（selector / sequence / inverter / condition / action，RUNNING / SUCCESS / FAILURE）、小队角色分配与协调器、冲锋机与重炮机甲的纯规则。世界侧新增 `mortar-world.js`（迫击炮落点圈）。
- 现有 `enemy-ai.js` 的统一导演继续负责移动/射击；小队层只在“有队员看见玩家”时调整意图（掩护→横移、包抄→先走到侧向点），没有视野时按最后已知点搜索，`memorySeconds` 后遗忘。蜂群协调（`swarmCoordinated`）、港口人工包抄路线（`flankRoute`）、Boss、哨兵、冲锋机不参与小队。
- 接入章节保持克制：中枢塔 `tower-access`、港口 `harbor-crane` 各一名冲锋机；数据中心 `dc-pump-2` 防守波一名重炮机甲。其余章节角色不变，`roleForStage` 与既有测试断言的角色集合未受影响。

## 2. 规则（来源：`squad.js`、`enemy-rules.js`）

| 项 | 数值 |
| --- | --- |
| 小队 | 最多 2 压制 + 2 包抄，其余压制；远程/狙击固定掩护；侧向偏移 6m；记忆 6s；每 2.5s 重新分配并翻转包抄侧 |
| 冲锋自爆机 `rusher` | 44HP、速度 5.6、机械、不入小队、不发弹；2.2m 内武装，1s 后引爆；半径 3.5m、玩家 38 伤害线性衰减、需遮挡检查（`blastVisible`）；对周围非 Boss 敌人 24 伤害；被 EMP 冻结时不前进不引爆 |
| 重炮机甲 `artilleryMech` | 320HP、速度 1.05、比例 1.35、机械；不发弹丸而是迫击炮：2s 橙色落点圈预警后落弹，3m 半径 26 伤害线性衰减；6m 内不开火（后撤）；占用共享攻击者预算（<3 时才预警）；躯干/核心装甲 ×0.2，膝部 ×1.6，两次膝部命中打开舱盖 5s，期间核心 ×2.5、躯干全额 |
| EMP | `EMP_TYPES` 增加 `rusher`、`artilleryMech` |

## 3. 源码接线

- `enemy-ai.js`：`createEnemyDirector` 新增 `onRusherBlast`、`onMortar`、`squadEnabled`；迫击炮队列在导演内计时并触发 `land` 事件；暴露 `squad`、`mortars` 只读状态，`clear()` 重置。
- `enemy-model.js`：冲锋机红色载荷穹顶随距离闪烁；重炮机甲膝部 `hitZone:'leg'`、舱盖遮挡核心，暴露时舱盖隐藏。
- `app.js`：`environmentHurt` 复用受伤/护甲/处决无敌路径；`rusherBlast` 走 `blastVisible` 遮挡；`mortarEvent` 画圈并播放橙色预警音；导演更新后清理已引爆冲锋机；`reset()`/`end()` 清空落点圈。
- 章节数据：`tower-data.js`、`harbor-data.js`、`datacenter-data.js`；`emp-rules.js`。

## 4. 验证

- 规则：`test-squad.mjs`（行为树语义、角色上限/排除/确定性、记忆与侧向偏移、冲锋机武装/引信/衰减、装甲→膝部→核心窗口与关闭、迫击炮数学、章节接线、EMP 允许表、三章全部阶段角色可解析）。
- 集成：`test-squad-world.mjs`（真实模型 + 真实导演：冲锋机接近/引爆/EMP 冻结；迫击炮预警→落点一致且不跟随移动后的玩家、落点圈生命周期、最小射程；真实小队压制/包抄/掩护位移）。
- 浏览器：`test-squad-browser.mjs`（反应堆真实页面：冲锋机引爆扣血并移除；重炮机甲 4m 内不预警、后撤到 6m 外才预警；落点圈出现、落弹扣血；核心 8 → 膝部两次 → 核心 100；小队角色出现；重置清空落点圈；无页面错误）。
- 回归：`test-enemies`、`test-commander`、`test-swarm`、`test-polar-enemies`、`test-emp-world`、`test-emp`、`test-tower`、`test-harbor`、`test-harbor-combat`、`test-harbor-hard`、`test-tower-combat`、`test-train-combat`、`test-height-director`、`test-datacenter-enemies` 通过。
- 全量 `scripts/run-tests.mjs --jobs 2`：440/440 check、103/103 rules、39/39 integration，退出 0；`get_diagnostics` 0。

## 5. 失败与修正记录

- 首版小队包抄偏移在“没有视野”时也生效，导致 `test-harbor-combat` 的港口人工包抄计时失败；改为仅在本帧可见、非搜索状态、距离 >4m 时应用，人工 `flankRoute` 优先。
- 首版 `squad.state.roles` 以 `type:seed` 为键，真实场景中 seed 可重复导致键覆盖；改为 `索引:type`。
- 冲锋机引爆后 `hp=0` 但只有玩家击杀路径会移除敌人，浏览器用例首轮失败；在导演更新后增加冲锋机专用清理。
- 重炮机甲“最小射程”首版断言 60 帧内不预警，但机甲会在 1s 内后撤到 6m 外并合法开火；用例改为断言预警发生时机甲已在 6m 外。

## 6. 未完成 / 边界

- 未做真人手感与性能验收；软件 WebGL 下的浏览器用例是逻辑接线证据。
- 冲锋机/重炮机甲只接入三处；其它章节与关卡 5–8 的分布留待第③④批和关卡批次统一调配。
- 小队层不改 Boss 场地、不做全局攻击预算（下一批）。
