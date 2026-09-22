# NEON ECLIPSE｜噩梦难度与新游戏难度选择（2026-09-22）

## 需求
- 噩梦难度：双倍刷怪；受到战斗伤害 200%；对敌伤害 50%；常规攻击间隔 50%。
- 游戏难度选择应放在“新游戏”处。

## 实现
- `combat-difficulty.js`：DIFFICULTIES 新增 `nightmare`（incoming 2 / outgoing .5 / cooldown .5 / spawns 2，描述“受到战斗伤害 200% · 对敌伤害 50% · 常规攻击间隔 50% · 刷怪数量 200%”）；新增 `spawnScale()`；选择控件支持多实例（uid + renders 集合，跨实例同步），下拉新增“噩梦 · 双倍敌人与双倍伤害”。
- `menu-ui.js`：新游戏/战备页（prepare）新增 `#menu-prepare-difficulty` 并绑定难度选择；设置页实例保留，二者实时同步。
- `mission.js`：`chooseEncounterSpawns(stage,player,obstacles,count=stage.count)`，生成点池按请求数量裁剪（默认不变）。
- `app.js`：`spawnEncounter` 按 `spawnScale()` 扩容：`want=count*scale`；含 warden 的 Boss 阶段不翻倍；生成点不足时 `count=Math.min(want,spots.length)` 优雅降级，基础数量仍不足才抛原错。
- `save-hub.js`：存档备份校验白名单加入 `nightmare`。
- P4/行动中枢沿用 `currentDifficulty()`，噩梦的受伤/输出/间隔自动生效；其刷怪经同一 `spawnEncounter` 同样翻倍。

## 验收
- `test-difficulty.mjs`：四档数值、噩梦 200/50/50、spawnScale、生成点池 4→8、Boss 不翻倍与降级守卫（源码断言）PASS。
- `test-difficulty-browser.mjs`：新游戏页四档选择、噩梦持久化、设置页同步、reload 持久、easy 开章、暂停改选持久（按现行“开章快照”契约）、存储失败、双视口布局、存档隔离；EXIT=0。
- `test-menu-polish-browser.mjs` EXIT=0（新页签不破坏焦点/版式）；`test-smoke-browser.mjs` 15/15 EXIT=0；check 663/663。
- 说明：难度在章节部署时快照生效（既有设计），暂停改选从下一次部署起生效；测试按此契约断言。噩梦实机手感未做自然通关验收。
