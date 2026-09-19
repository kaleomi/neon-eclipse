# Boss 与环境首批：第 2 章 SWITCHYARD 调度核心

日期：2026-09-18。范围由用户确认：最小可复用 Boss 框架 + 第 2 章完整试点。本批不是整条 Boss/环境路线完成。

## 1. 实现与玩法

保留运输站原五阶段、21 名守卫/增援、供电/车门/调度防守流程。调度区域仍先完成 18 秒防守并清除守卫，再激活 SWITCHYARD；击破 Boss 并结束 0.8 秒局部停机演出后，才进入末班列车撤离。

- Boss 位于调度区 `(22, -25)`，核心高度 1.9m，1200 HP。护盾状态不受武器伤害，核心暴露时接受现有枪械和能量刀伤害；半血进入第二档放电节奏。
- 三条轨道按 1 → 2 → 3 循环。每列维护列车有 4 秒来车预警、2.4 秒行驶；三处实体编号道岔位于调度区东侧。
- 站在控制器 2.2m 内，面向且视线通畅、站定并停止射击/换弹，按住 E 0.6 秒切换当前编号道岔。错误编号、移动、视线被挡、跳跃、未完成就松键/暂停等不触发。
- 已切岔列车沿支线撞击核心护盾，开启 6 秒弱点窗口；未切岔列车直行，不破盾。维护列车只破盾、不扣 Boss 血、不产生武器击杀归属。
- 红色轨道上的列车采用扫掠判定，每趟最多造成一次 24 点基础伤害；跳过列车需脚高达到 1.3m。地面放电有 1.2 秒旧位置圆圈预警，横移、跳跃和遮挡可以反制；基础伤害 14/18，沿用既有难度倍率。
- HUD 显示 HP、阶段、来车编号、道岔状态、核心暴露倒计时；场景有轨道灯、七段编号和投影标记。复用已有程序音效及 Boss 音乐状态，不引入外部资源。
- 停机演出不锁玩家输入、不全屏闪光、不改变全局时间速度。战报记录核心窗口、伤害与现有武器用量；运输站使用准确的“列车 / 地面放电”伤害名称。

为适配现有运输站，本批是调度室内的三轨维护列车机关，不宣称实现了大型中央控制塔、整张地图重建或载客列车物理系统。

## 2. 架构与文件边界

新增：

- `boss-framework.js`：纯规则生命周期（inactive → shield → exposed → defeated）、HP/半血档位、暴露窗口、停机完成门槛与重置。无存档、输入、渲染或全局难度依赖。
- `switchyard-rules.js`：来车/道岔/放电规则与小步扫掠；列车只触发暴露窗口。
- `switchyard-world.js`：Three.js 模型、碰撞、视线交互、HUD 适配、战报与原有 Boss 句柄接口。
- `switchyard-ui.js`：状态面板与道岔标记。
- `test-boss-framework.mjs`、`test-switchyard.mjs`、`test-switchyard-world.mjs`、`test-switchyard-browser.mjs`：对应分层测试，现有 runner 自动发现。

现有文件只做有范围的增量：

- `app.js`：运输站工厂接线、调度防守完成与 Boss 完成双门槛、交互/目标标记、战报与音效。新方法采用可选调用；其他 Boss 不迁移。
- `mission-ui.js`：新增可选机关阶段标记，Boss 战中隐藏旧防守交互提示，其他章节默认行为不变。
- `station-data.js`：仅更新调度任务标题、说明、完成消息；保留 ID、阶段索引、进入位置、守卫/增援配置和既有数值。
- `maps/registry.js`：运输站 Boss 标识及展示文案。
- `boss-battle-record.js`：可选伤害标签；旧 Boss 默认输出不变。

框架只有 SWITCHYARD 一个实际使用方，不能算现有 Boss 已全部迁移。第 4/5/6 章 Boss、爆炸桶/可破坏物、其他章节机关仍未实现。

## 3. 存档与资格

- 保留 `neon-eclipse.station.v1`、五阶段索引、journey.v7、SaveHub 格式及旧存档；不增加 Boss 运行时字段，不迁移或清空玩家数据。
- 旧 stageIndex=3 检查点恢复时重做原调度防守，再进入全新 Boss 战；旧 stageIndex=4 撤离检查点保留原进度，不强制回退补打 Boss。
- 不保存战斗中 HP、正在行驶的列车、未完成道岔输入或半个暴露窗口。死亡/重试清空临时状态。
- 道岔和撞盾不计枪械开火，也不代替刀击杀。开枪仍失去纯刀资格；读档/阶段训练/死亡重试仍不计完整单章挑战。旧已获成就不追溯撤销。
- 应用层额外阻止“18 秒防守完成的最后一帧直接进入撤离”，并等待真正击破和停机演出完成；重复阶段同步不重置正在进行的 Boss。

## 4. 验证与证据

### 最终通过的验证

- 原 Windows 主机 Node 24.15.0，13 个本批源码/测试文件 `node --check` 通过；20 个相关规则/集成脚本串行通过。最终命令 `cmd_97eff83d1f40da1cfc25b785dc9168da6fa2501077e3451c`，exit 0；同时 `git diff --check` 通过，并保存 13 文件 SHA-256。
- 20 个脚本：`test-boss-framework.mjs`、`test-switchyard.mjs`、`test-switchyard-world.mjs`、`test-station.mjs`、`test-campaign.mjs`、`test-journey.mjs`、`test-map-registry.mjs`、`test-menu.mjs`、`test-battle-record.mjs`、`test-overseer.mjs`、`test-overseer-world.mjs`、`test-chapter-achievements.mjs`、`test-save-hub.mjs`、`test-tether.mjs`、`test-abyss.mjs`、`test-glacier.mjs`、`test-melee-strike.mjs`、`test-mission.mjs`、`test-orbital.mjs`、`test-datacenter.mjs`。这些是脚本数，不是覆盖率或断言数。
- 浏览器专项 `test-switchyard-browser.mjs` 1/1 通过、无 pageerror：命令 `cmd_e22854d1037689e880fd469233eba4ef10d7d3b678a7fed4`，exit 0；约 24.5 秒为该浏览器脚本运行时间，不作性能结论。
- 浏览器覆盖：未注入的 station/reactor/roof 原生页面启动与暂停、九章菜单；调度防守最后一帧门槛；护盾阻挡真实枪击；错误编号、按住 E、暂停取消；列车破盾；八种武器真实鼠标/数字键/射线/刀打击窗口/三连发/磁轨蓄力；实际刀击杀只计一次与战报；撤离解锁、stage 4 检查点重试、最终胜利；死亡后 stage 3 防守与 Boss 状态重置。
- 集成补充检查：包含新增碰撞的五个目标、守卫和补给导航；玩家真实运动到近战位置；墙体阻断道岔与核心射线；HALO 标记；防守→Boss→停机→撤离；旧 stage 3/4 checkpoint 合法且 version=1；dispose 清除所属对象。
- 规则层包含 30/60/120/144 Hz 下列车单次伤害、跳跃避让、旧位置放电/遮挡、6 秒窗口、无效时间输入及重复调用边界。
- 最终语言服务查询：0 errors / warnings。已读取并检查两张截图（护盾/场地、近战距离暴露态），修复旧防守提示与 Boss HUD 重叠。

### 首轮失败与修正

1. `cmd_438b7f5bce7825d2c4e29153ea9fa0d8ce95cbdfc749b1e0` 首轮集成失败在“近战位置可达”。初始断言把保守的敌人导航网格直接用于玩家贴近位置；改为先验证附近导航点，再用真实 `createPlayerMotion.step` 从该点走到刀距，并保留真实射线命中验证。未移动 Boss 或削弱碰撞以使测试通过。
2. `cmd_19f3255a15f201b6f3b61fe104a7d693cd0e4225e5a67b9a` 首轮浏览器已通过切岔、近战击杀及撤离，但胜利后直接重设夹具的下一组切岔断言失败。该组改为先刷新并经原生开始入口启动，再复测死亡/重试；原断言保留，另增全部八种武器验证。没有用减少 Boss HP、直接设置胜利或删除失败日志代替修复。
3. 两类首轮日志保留；最终通过记录不改写首轮失败。

### 证据与复跑

机器日志和截图保留在工作区工具目录（相对项目根）：`../../.tools/boss-switchyard/`，不放入 docs 或提交。

- `targeted-initial.log`、`targeted-recheck.log`、`targeted-final.log`
- `browser-initial.log`、`browser-recheck.log`
- `final-sha256.txt`
- `exposed-final.png`、`exposed-final-arena.png`（隔离受控摆位，不是自然通关画面）

轻量复跑：

```bash
node test-boss-framework.mjs
node test-switchyard.mjs
node test-switchyard-world.mjs
node scripts/run-tests.mjs --layer browser --filter switchyard --jobs 1 --verbose
```

测试不使用真实玩家浏览器配置；浏览器夹具只注入隔离请求的 app.js 响应，不写入生产调试探针。夹具跳过先前关卡/守卫并受控摆位，真实 E/武器/物理/任务路径仍执行；不能当作自然完整运输站通关、真人平衡或实机性能结果。本轮没有执行完整默认 npm test 或全部浏览器套件，没有测量目标硬件帧率；测试使用软件 WebGL，截图中的 FPS 不作性能验收。

## 5. 人工验收与后续

1. 在第 2 章正常推进到调度区，确认防守结束后能理解道岔编号、来车预警和六秒输出窗口。
2. 分别用枪械和纯刀自然通关，检查弹药/难度/可达性；本批新 Boss 数值不是已有难度参数的下调，尚需真人平衡反馈。
3. 检查暂停、重试、阶段训练、单章/连续战役、旧撤离档和音频听感。
4. 在目标 Windows 设备单独验收负载与长稳；软件 WebGL 和自动化测试耗时不作硬件性能结论。
5. 稳定后再决定将框架推广到下一章，而不是同时扩展其余三章。

最终工作区检查发现并行新增的 helicopter 系列源码/测试和 test-save-stability.mjs；均不属于本批，未改动、暂存或清理。本轮不打包 EXE、不安装依赖、不修改真实存档，不自动提交或推送 Git。
