# P2 表现层：天气预设 / 击杀表现 / 章节过场（2026-09-19）

> 状态入口仍是 `docs/mcp-project-status-roadmap.md`；本文是本批次的实现、验收与失败记录。对应 `docs/mcp-full-development-plan.md` §6.3–6.5。

## 1. 范围

| 项 | 计划要求 | 本批实现 | 未做 |
| --- | --- | --- | --- |
| 天气 | 晴/雨/雾/沙尘/夜 + 强度 0～1；雾 = 远程锁定距离 −30%；不改碰撞 | `weather-rules.js`（六预设含雪）、`weather-world.js`（雾密度/色调、灯光缩放、相机跟随粒子）；URL `?weather=<id>&weather-intensity=<0-1>`；章节默认取自 `maps/registry.js` `traits.weather` | 地面反射；挑战修饰符随机（Phase 4 再接） |
| 击杀表现 | 轮廓闪白 + 溶解 0.4s；精英/Boss 慢动作 0.3s（可关）；3/5/10 连杀提示 | `kill-fx-rules.js` / `kill-fx-world.js`：击杀前快照敌人网格为白色幽灵（0.1s 闪白 → 0.3s 溶解上浮），精英/Boss 触发 0.3s 实时 ×0.35 慢动作；设置页三项开关持久化 `neon-eclipse.presentation-fx.v1` | 连杀 HUD 已由既有 `streak-banner` + `gameAudio.streak` 覆盖，未重复实现；音乐层级 +1 未做 |
| 过场 | 开场 8～12s 飞掠 + 三行文本 + 目标卡，可跳过；章节间简报数据驱动 | `cinematic-rules.js` / `cinematic-world.js`：10s 相机绕出生点收敛飞掠，三行（简介/特性/威胁）分别在 0.6/3.2/5.8s 出现，8s 目标卡，0.4s 后可 Space/Enter/左键/按钮跳过；Esc 暂停即取消并恢复相机。`menu-ui.js` 在"进入下一关"结算页新增 `#menu-briefing`（上章战报 / 下章威胁 / 战役累计），全部由 `journey.results` 与注册表生成 | 数据碎片收集（§6.5 第三点）未做 |

## 2. 接线点（`app.js`）

- 天气：`createWeatherWorld` 在 `createPresentation` 之后创建（presentation 会重写太阳强度，天气以其结果为基准）；`toggleQuality` 后调用 `weather.reapply()` 修正世界模块 `setQuality` 对雾密度的覆写。`weatherModifiers` 经 `enemyDirector.environment.weather` 进入 `environmentModifiers`，仅乘 `range`；`speed=1`、不动 `canTelegraph`/`ventDps`。
- 港口（rain）与极地（snow）由各自世界模块负责视觉，`WORLD_OWNED_WEATHER` 令 `weather-world` 跳过雾/灯/粒子，只保留射程修饰；URL 显式覆盖时才接管视觉。
- 击杀：八处 `weaponDrops.drop(...)；disposeGroup(...)` 前插入 `killPresentation(enemy)`；`frame()` 中 `frameTimeScale=slowmo.step(dt)`，`update(dt)` 首行 `dt*=frameTimeScale`（P4 固定步长仍收到缩放前后一致的 dt 语义；P4 激活时慢动作禁用）。`reset()` 清空幽灵与慢动作。
- 过场：`requestIntro(stageIndex,checkpoint)` 仅在新战役/单章从头开始/无检查点继续时置位，由 `enterPlay()` 消费；`update()` 在 intro 激活时直接返回，鼠标/键盘/开火被屏蔽，`fieldKit.render`/`ordnance.render` 收到 `playing&&!introActive` 以免重新显示枪模。
- 自动化保护：`navigator.webdriver` 下默认不播开场、不生成幽灵、不慢动作（既有 200+ 浏览器测试依赖确定性场景图与时序）；测试用 `?intro=1` / `?fx=1` 显式开启。`shouldPlayIntro` 的规则测试覆盖这条判定。

## 3. 验收记录

| 层 | 结果 |
| --- | --- |
| 源码接线 | `app.js`、`menu-ui.js`、`interaction-rules.js`、`index.html`（新增 `presentation-fx.css`）；新模块 9 个 |
| 规则测试 | `test-presentation-fx.mjs`：预设边界、URL 解析/非法值、强度插值、雾 ×0.7 且速度/预警/DPS 不变、与黑暗叠乘、幽灵时间线、慢动作不叠加/可关、设置持久化与损坏回退、开场时间线/跳过门槛/自动结束、`shouldPlayIntro` 五种判定、简报数据驱动 |
| 集成测试 | `test-presentation-world.mjs`：晴天零改动、雾密度/灯光精确缩放、雨粒子随 dt 运动/暂停静止/跟随相机、粒子 opt-out 射线、港口世界所有权、**雾下敌人 60 帧移动轨迹与晴天逐帧相同**、幽灵不可被射线命中且 0.4s 后释放、上限与开关 |
| 浏览器测试 | `test-presentation-browser.mjs`（真实页面 + 路由注入 `__env`）：雾/半强度雨/港口默认三种天气；普通击杀幽灵、精英击杀 ×0.35 慢动作且 `elapsed` 按缩放推进、0.3s 后恢复、两项开关关闭生效并落盘；开场 4s 两行、9s 三行+目标卡、开场期间 `elapsed` 不变、Space 跳过后相机精确复位、10s 自动结束、Esc 取消、设置关闭与 webdriver 默认不播；`between` 存档点击继续后简报三段文本 |
| 全量 | 461/461 check、106/106 rules、42/42 integration；串行复跑 smoke 15/15、interactions 九章、boss-polish、datacenter 4/4、polar 4/4 均退出 0；`get_diagnostics` 13 个文件 0 |
| 手动 / 性能 | 未做真人游玩与帧率测量；粒子上限 900 点（性能档隐藏非雨粒子），慢动作仅改 dt 不加渲染负载 |

## 4. 失败与修正记录

0. 命名冲突：本批规则测试首版覆盖了既有 `test-presentation.mjs`（HUD 跟随/战场记录测试），提交前发现并从 Git 还原，本批测试改名 `test-presentation-fx.mjs`；rules 层由 105 变为 106。

1. 规则测试浮点：`lightScale .45` 插值得 `.44999…`，改为容差断言；慢动作 6×0.05 后剩余 1e-17 导致多走一帧，`createSlowmo.step` 对 <1e-9 归零。
2. 浏览器"dissolve off"首版失败：前一次精英击杀的幽灵尚未推进帧即被计数，测试先 flush 10 帧再断言。
3. `kill()` 助手直接调 `shoot()` 被冷却/换弹拦截 → 助手重置 `cooldown/reload/rounds`，并对 `killed===1` 断言。
4. 开场期间枪模仍可见：`fieldKit.render(playing)` 每帧把 `gun.visible` 置回 true；改为传 `playing&&!introActive` 并在 intro 中强制隐藏。
5. 简报测试首版用 `?menu=chapter` 直接进入章节视图，`#menu-continue` 不在该视图 → 改为默认主页并等待按钮可用；`between` 存档写入 `neon-eclipse.journey.v7`。
6. 集成测试假设 `Points` 在 threshold 0 时不命中，实际 three r16x 仍命中 2 点 → 粒子对象显式 `raycast=()=>{}`，测试把 threshold 提到 50 验证 opt-out。

## 5. 下一批

b6：第 5–8 关深度 / 直升机与载具演进（计划 §7）。P2 未完成项：音乐层级随连杀 +1、数据碎片收集、挑战修饰符随机天气（并入 Phase 4）。
