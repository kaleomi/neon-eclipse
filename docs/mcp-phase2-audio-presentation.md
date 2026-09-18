# Phase 2 · 音频系统与表现反馈

> **历史交付记录，含已被接续的待办**：本文记录音频首批，旧“载具尚未接线”不再代表当前代码。载具事件音频和第 7–9 章机制提示现已接线，详见 `docs/mcp-audio-integration-2026-09-18.md`。保留下方首批测试数量和后续建议，不能当作当前验证结论。当前总进度见 `docs/mcp-project-status-roadmap.md`。

对应 `docs/mcp-full-development-plan.md` 的 P2。目标：给六章 FPS 与载具试验区补上一套**零资源文件、纯程序合成**的音频系统，并升级击杀/受击反馈。所有内容仅改源码；不改玩法数值、不改难度、不改存档格式、不新增运行时依赖。

## 1. 交付清单

| 文件 | 作用 |
| --- | --- |
| `audio/audio-bus.js` | 五路总线（master/music/sfx/ui/voice）+ 压限器；设置读写 `neon-eclipse.audio.v1`；手势解锁；`hold/release` 叠加式挂起（`paused`、`hidden`） |
| `audio/synth.js` | 配方渲染器：tones / noise（白、粉、棕，缓存 buffer）/ FM 三类层，ADSR 包络，`validRecipe` 校验 |
| `audio/sfx-catalog.js` | 71 条音效配方（武器 4、换弹 3、命中 4、击杀 3、连杀、玩家受伤/低血心跳/死亡/跳跃/落地/危险区、补给 2、预警 6 色、敌方射击 2、子弹撞墙、Boss 3、精英排气、目标 6、任务胜负、检查点、星星、UI 8、载具 6、舰炮 3、扫描 2）；`TELEGRAPH_BY_COLOR`、`WEAPON_FIRE` |
| `audio/sfx-player.js` | 冷却、24 复音上限、随机音高微扰、`spatialize()`（按监听者朝向左右声像、48 m 距离衰减、遮挡低通 1.1 kHz）、`stats()` |
| `audio/music-director.js` | 生成式配乐：112 BPM，A 小调五声，五层（pad/pulse/drums/lead/alarm）按 `idle/explore/combat/boss/extract/won/lost` 状态机交叉淡入；战斗强度 2.5 s 起 / 0.35 s 慢放，避免最后一个敌人倒下时音乐闪烁 |
| `audio/game-audio.js` | FPS 页门面：`play / weaponFire / hit / hurt / telegraph / setListener / update / pause / resume / unlock`；连杀计数（3/5/10，4 s 窗口）；低血心跳；`visibilitychange` 自动挂起 |
| `audio/vehicle-audio.js` | 载具页连续声：地面车引擎（saw+sub 经低通，随速度/油门变频）、固定翼涡轮呼啸 + 风噪 + 失速警报、游艇柴油机 + LFO 海浪；纯映射函数 `roverEngine/planeEngine/yachtEngine` 可测 |
| `audio/audio-settings-ui.js` | 设置页「声音」面板：5 条滑块、静音、音效试听（14 个样例）、音频状态提示 |
| `app.js` | 移除旧 `sound()`（13 处）全部改走 `gameAudio`；新增 `onQueue/onEmit` 预警钩子、击杀类型判定（精英/Boss）、连杀横幅、每帧 `setListener + update(facts)` |
| `projectiles.js` | `createEnemyProjectiles(..., hooks)`：`onQueue(origin,attack,boss,owner)`、`onEmit(origin,attack,boss)`，只用于音频，不影响判定 |
| `menu-ui.js` / `menu.css` | 「声音」面板挂载 `#menu-audio`；连杀横幅样式；`hitmarker[data-kind=armor/core]` |
| `scripts/run-tests.mjs` | 语法检查层纳入 `audio/`、`maps/` 子目录 |
| `test-audio.mjs` | 纯逻辑测试（见 §4） |
| `test-smoke-browser.mjs` | 新增 step「audio: unlock, pause suspend, volume persistence, sfx during play」 |

## 2. 设计要点

### 2.1 总线与设置
- `settings = {master, music, sfx, ui, voice, muted}`，默认 `.8/.55/.9/.7/.8/false`；滑块值经 `v^1.8` 感知曲线转增益；损坏 JSON、越界、NaN 均回退默认值。
- `AudioContext` 只在首个 `pointerdown/keydown` 或 `enterPlay()` 时创建；启动即静默不会触发浏览器自动播放限制。
- 挂起是**原因集合**：`pause()` → `hold('paused')`，切标签 → `hold('hidden')`；只有全部释放才 `resume()`，避免「暂停中切回标签页就出声」。
- 所有音效经 master 后过 `DynamicsCompressor(-12 dB, 3:1)`，集火时不削波。

### 2.2 敌方预警的「颜色语言」
`projectiles.queue()` 已用颜色区分攻击（orange 普通 / purple 锁定 / amber 三连 / pink Warden / gold 港务精英）。本阶段给每种颜色一个**可盲听区分**的签名，`test-audio.mjs` 断言各配方签名互不相同：

| 颜色 | 声音签名 | 想传达 |
| --- | --- | --- |
| orange | 两声短方波 blip | 普通蓄力，可走位 |
| purple | 上滑锯齿 + 高频 FM | 正在锁定你，快离开射线 |
| amber | 三下低频 thump | 三连发即将到来 |
| pink | 宽 FM 低吼 | Warden 大招 |
| gold | 金属 FM 敲击 | 港务精英排气窗口 |
| green | 柔和双音 | 预留（增援/友方）|

预警和 `enemy.fire`、`bolt.wall` 均带 `position`，由 `spatialize()` 用玩家 `yaw` 计算左右声像；预警若被障碍遮挡（`lineOfSight()` 射线检测）则低通闷化，玩家能靠声音判断敌人在墙后。

### 2.3 音乐状态机
`resolveMusicState(facts)` 优先级：won/lost > 非 playing → idle > extracting > bossActive > defending 或 enemiesNear>0 → combat > explore。`app.js` 每帧传 `enemiesNear`（45 m 内敌人数）、`bossActive`（`overseer.blocking` 或存在 `enemy.boss`）、`defending`（`mission.state.defending`）。战斗层增益 = 目标 × (0.6 + 0.4 × intensity)，敌人越多鼓点越满。

### 2.4 表现反馈
- 命中标记新增 `armor`（灰蓝）与 `core`（青色）两种颜色，和音效 `hit.armor/hit.core` 对齐，让「打到护甲没伤害」与「打到弱点」一眼可辨。
- 连杀横幅 `.streak-banner`：×3 橙、×5 粉、×10 青，1.6 s 淡出；音效 `streak` 在击杀音后 120 ms 叠加。
- 精英击杀 `kill.elite`、Boss 击杀 `kill.boss` 使用更长的下落扫频 + 噪声尾巴。
- 生命 ≤25 时 `player.heartbeat` 以 1.05 s（≤12 时 0.7 s）节奏播放，回血后立即停止。

### 2.5 载具页（`vehicle-audio.js`）
提供 `createVehicleAudio()`，`update(dt,{kind,speed,throttle,onGround,stall,crashed,impacts,active,nearWater})` 每帧调用。**尚未接入 `vehicle-app.js`**——该文件当前由另一个会话（联合检查点）持续修改，为避免写冲突，本阶段只交付模块与测试，接线放到该会话收尾后（见 §6）。

## 3. 不做的事 / 边界
- 不引入音频文件、不引入依赖；不改 `package.json`（另一会话正在修改）。
- 不改任何伤害、冷却、Boss 数值；`projectiles.js` 的钩子只读。
- 不动真实存档键；新键仅 `neon-eclipse.audio.v1`。
- 语音（voice 总线）已预留，但本阶段没有语音内容。

## 4. 验证

### 4.1 纯逻辑：`node test-audio.mjs`
用一个记录节点/参数调用的假 `AudioContext` 覆盖：
1. 设置默认、夹取、持久化、坏 JSON、NaN、感知曲线、静音、无 storage。
2. 总线懒创建、unlock、`hold/release` 叠加、增益应用、订阅、无 AudioContext 的降级。
3. 目录：71 条配方全部 `validRecipe`、总线合法、时长 ≤3 s；`WEAPON_FIRE.length === WEAPONS.length`；六色预警签名互异。
4. 渲染器：每个源都 start/stop、包络用指数斜坡、FM 用双振荡器。
5. 空间化：左右/前后/旋转监听者、距离衰减、超距静音、遮挡低通。
6. 播放器：未解锁拒绝、未知名、冷却、24 复音上限、空间节点插入、超距丢弃。
7. 音乐：状态优先级、强度快升慢降、层目标单调性、导演状态切换与强度爬升。
8. 连杀 3/5/10 与窗口过期；门面 `hit()` 路由（head/armor/core/body/elite/boss）、`hurt()`、心跳节奏、`weaponFire`、`telegraph` 回退。
9. 载具引擎映射单调且有界。

### 4.2 `npm test`
check 199/199（新增 `audio/*`、`maps/*` 语法检查）· rules 52/52（含 `test-audio.mjs`）· integration 9/9。

### 4.3 浏览器冒烟 `node scripts/run-tests.mjs --layer browser --filter smoke`
新增 step 验证：进入前 `snapshot().state==='none'`；开局后 context 存在；开火/换弹/挥刀后 `sfx.stats().played ≥ 3` 且音乐状态属于 explore/combat/boss；暂停后 `suspendedBy` 含 `paused`；设置页拖动音乐滑块到 20%、勾选静音后 `localStorage['neon-eclipse.audio.v1']` 为 `{music:.2,muted:true}`，刷新后滑块与静音恢复；试听按钮无 console 错误。结果见 §5。

## 5. 结果记录
- `node test-audio.mjs`：PASS。
- `npm test`：check 199/199 · rules 52/52 · integration 9/9。
- 冒烟：12/12 通过，52.4 s（原 11 步 + audio）。调试中两次失败均为测试脚本自身问题：在暂停上下文页点击 `#menu-settings`（不可见）、试听按钮位于折叠的 `<details>` 内；修正后通过。期间主机一度高负载（安全软件 + WebView）导致单步 20–60 s，非回归。

## 6. 后续（进入 P3 前）
1. `vehicle-app.js` 接线：在 `frame()` 中调用 `vehicleAudio.update(dt,{kind,speed:entity().speed,throttle,onGround:plane.onGround,stall:plane.stall,crashed:plane.crashed,impacts:entity().impacts,active})`，`pause()/resume()` 调 `hold/release`；检查点保存播 `vehicle.checkpoint`，舰炮播 `cannon.*`。
2. 第三章天穹通讯枢纽高空风噪、第五章列车轮轨节奏、第六章港口雨声：用 `noiseBuffer` 做章节环境床（music 总线 pad 层旁路）。
3. 若后续加入语音提示，直接走 `voice` 总线，UI 已预留滑块。
