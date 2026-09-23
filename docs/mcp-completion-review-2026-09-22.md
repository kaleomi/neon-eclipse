# NEON ECLIPSE｜项目完成度只读评估（2026-09-22）

日期：2026-09-22
项目：`game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6`
性质：远程 MCP 会话只读评估；未修改任何源码、资产、存档或 Git 历史，仅新增本文档。
证据来源：`docs/mcp-project-status-roadmap.md`、`docs/mcp-full-development-plan.md`、`docs/mcp-stability-plan.md`、`docs/mcp-continuous-acceptance-2026-09-21.md`、2026-09-22 五份最新批次文档、当前源码与本轮实测。

## 一、一句话结论

NEON ECLIPSE 是一款 Three.js 单依赖、纯程序化美术 + CC0 实录音频的 Web/Electron 第一人称射击游戏。按 `docs/mcp-full-development-plan.md` 的七阶段路线（P0–P6）衡量，**功能接线层面约 85–90% 已完成**，且今日实测 CI 三层全绿、诊断 0、工作树干净；**剩余缺口集中在“真人自然通关 / 实机性能 / 听感”三类人工验收与发行收尾**，而非功能开发。

## 二、本轮实测快照（2026-09-22，Windows / Node v24.15.0）

| 项目 | 结果 |
| --- | --- |
| `npm run test:check` | **664/664** 通过（27.6 s） |
| `npm run test:rules` | **136/136** 通过（17.4 s） |
| `npm run test:integration` | **67/67** 通过（17.9 s） |
| `get_diagnostics`（error + warning） | **0** |
| `git status --short` | **0** 项未提交改动（工作树干净） |
| Git | 分支 `main`，HEAD `db804ef`，共 92 次提交，领先 `origin/main` 12 次（未推送） |
| 首次提交 | 2026-09-17 22:44（`baseline: NEON ECLIPSE source snapshot`）—— 全部开发史仅 6 天 |
| 最近提交 | 2026-09-22 11:12 `desktop: 1.5.4 resource-complete build` |

浏览器层（`test:browser`，Playwright + SwiftShader，126 个脚本）本轮未运行；最近记录为 09-22 smoke 15/15、audio 单例偶发 flake（`docs/mcp-repo-layout-src-2026-09-22.md`）。

## 三、代码与资产规模

| 维度 | 数量 |
| --- | --- |
| 生产源码 `src/*.js` | 296 个文件，约 1.74 MB / 17.2k 行（密集长行风格） |
| 样式 `styles/*.css` | 35 个 |
| 测试 `tests/*.mjs` | 332 个（其中 126 个浏览器脚本），约 2.7 MB |
| 领域模块 | `audio/` 11、`characters/` 22、`weapons/` 14、`maps/` 1 + art 13 张 |
| GLB 模型 | 49 个（`models/`，21 MB，含 manifest 溯源哈希） |
| 音频 | 33 个 OGG 音效 + 5 首 MP3 音乐（25 MB） |
| 页面入口 | 20 个 HTML（主战役 `index.html`、载具 `vehicle.html`、直升机、P4 hub、行动档案、10 余个模型预览页） |
| 文档 | `docs/` 202 篇 `mcp-*.md`（1.8 MB） |
| 桌面发行物 | `release-desktop/NEON-ECLIPSE-1.5.4-win-x64.exe`（130,357,609 B，569 资源；1.0.0–1.5.3 共 9 个历史版本） |

## 四、按七阶段路线评估

评分口径：**接线** = 源码已实现且规则/集成测试通过；**验收** = 真人/实机/浏览器路径已确认。两者分开，符合 `docs/README.md` 的“阶段交付不等于发行验收”原则。

| 阶段 | 计划目标 | 接线完成度 | 验收状态 | 主要剩余 |
| --- | --- | --- | --- | --- |
| **P0 工程基线** | Git / CI / 分层测试 / SaveHub / 地图注册表 / app.js 拆分 / 帧统计 | **~95%** | GitHub Actions 已真实全绿（run 35535553441）；09-22 完成 `tests/`、`src/`、`styles/` 目录重构 | `app.js` 第四阶段（`reset/end/pause` 仍依赖约 40 个模块级 `let`）；`desktop/main.cjs:54` 一行路径待改 |
| **P1 战斗深度** | 1 主 1 副 + 近战 + 投掷；8–10 武器与改装；12+ 敌人生态；每章 Boss；环境可破坏 | **~90%** | 九章 Boss 全部接线并通过受控浏览器路线；弹反/薄板/爆炸桶/EMP 节点/处决/重武器三槽改装均交付 | 平衡与遥测闭环；Boss 行为仅“读取层统一”未逐一重写；真人自然通关 |
| **P2 音频与表现** | 音频总线 / 音乐状态机 / 天气 / 击杀演出 / 过场 | **~90%** | 实录 SFX + 5 首全长配乐 + 混音生命周期已过规则/浏览器；09-22 换雪地脚步素材、九章墙地材质系统交付 | 听感为人工项（S7）；运输站之后的逐章视觉打磨；战斗提示可读性复查（任务表第 3 项） |
| **P3 载具 / 先遣队** | 联合任务检查点 / 车载武器 / 直升机 / 载具战役线 | **~85%** | 先遣队八关串联；直升机并入 `vehicle.html`（吊挂、机炮、火箭）；手柄/触屏/英文化；V01–V04 重制 GLB | 吊挂未任务化；大地图分区与流式（§7.4）未做；真人连续八关未验 |
| **P4 元游戏** | Profile / 称号徽章 / 可重玩模式 / 每日周常 | **~95%** | 八种模式 + 个人档案 + 幽灵回放 + 每日/周常 + 只读行动档案，25 场景浏览器夹具通过 | 真人平衡；仅受控夹具 |
| **P5 新章节 7–9** | 每章独特机制 + Boss | **~95%** | 轨道电梯（重力）/ 沉没数据中心（潮汐）/ 极地雷达（体温薄冰）全部注册、journey.v7 迁移、Boss 核心可达性八章几何专项通过 | S2 三章机制真人可理解性待验 |
| **P6 平台与发行** | 手柄 / 触屏 / 无障碍 / 双语 / 性能验收 / EXE | **~70%** | 键位重绑、手柄、辅助功能、`i18n/` 骨架（载具场 63 键）、**1.5.4 便携 EXE 已通过资源完整性与 `neon://` 媒体解码 smoke** | 主 FPS 页面运行时文案未全部进 i18n（用户已决定不做英文 i18n）；**S8 实机性能采样未授权/未做**；EXE 未签名；`scripts/perf-capture.mjs` 未见落地 |

**加权估算：功能接线约 88%，含人工验收口径约 70–75%。**

## 五、九章战役与内容清单（源码核对）

`maps/registry.js` 注册九章，`src/journey.js` 由注册表派生 `CHAPTERS`，存档键 `neon-eclipse.journey.v7`，含 v1–v6 旧档迁移：

| # | 代号 | 章节 | Boss | 备注 |
| --- | --- | --- | --- | --- |
| 01 | K-19 | 反应堆设施 REACTOR COMPLEX | WARDEN | GLTF 场景、薄板/爆炸桶/哨兵炮塔/工程兵试点 |
| 02 | U-02 | 地下运输站 UNDERGROUND TRANSIT | SWITCHYARD | 09-22 新增独立切岔进度条 |
| 03 | A-03 | 天穹通讯枢纽 SKYLINK ARRAY | 监察者 OVERSEER | |
| 04 | C-04 | 多层中枢塔 CONTROL SPIRE | ELEVATOR | 0/3/6 m 三锁 |
| 05 | T-05 | 疾驰货运列车 RUNAWAY FREIGHT | SKYHOOK | 上下层实际自动检查点已验 |
| 06 | H-06 | 风暴港口 STORM HARBOR | LEVIATHAN | |
| 07 | O-07 | 轨道电梯基座 ORBITAL TETHER BASE | TETHER | 连续路线 09-21 通过 |
| 08 | D-08 | 沉没数据中心 SUNKEN DATA CENTER | ABYSS | 09-21 修复核心被箱体遮挡 |
| 09 | P-09 | 极地雷达阵列 POLAR RADAR ARRAY | GLACIER | 09-21 修复致命一击归类 |

其他内容：难度四档（含 09-22 新增“噩梦”：受伤 200% / 输出 50% / 攻击间隔 50% / 刷怪 200%，Boss 阶段不翻倍）；先遣队八关（护送 → 南湾 → 回声航线 → 海空接力 → 灯塔岛 → 风电场 → 钻井平台 → 雷达站）；P4 八模式（生存 / 突袭 / 修饰符 20 种 / 竞速幽灵 / 靶场 / 载具计时赛 / Boss 冲刺 / 无尽塔）；14 件指定模型重制（W01–W08、V01–V04、B01、E01）+ 环境四件套 + 任务道具三件全部交付。

## 六、最近 72 小时动态（09-20 → 09-22）

- 09-20：资源懒加载、`app.js` 拆分三阶段、CI 真实全绿、载具场手柄/触屏/英文化、直升机吊挂。
- 09-21：14 件模型重制收尾与三轮联合验收；TETHER/ABYSS/GLACIER 连续路线；ABYSS 核心遮挡与 GLACIER 记账两处阻断修复；J01 快艇遮挡 / J02 固定翼 HUD 重叠已在 `b01980c` 修复。
- 09-22：鼠标上下视角跳变修复（`MAX_LOOK_DELTA=160` / `MAX_LOOK_GAP_MS=250`）；SWITCHYARD E 进度条；噩梦难度；九章墙地材质；雪地脚步换素材；`tests/`→`src/`→`styles/` 目录重构；桌面 1.5.4 资源完整 EXE（修复 1.4.0 只打包代码、1.5.2 `neon://` 无 Range 导致 MP3 无法解码）。

节奏：6 天 92 次提交、202 篇文档，平均每天 15 次提交；文档纪律严格（每批记录失败、复测与验收边界）。

## 七、剩余缺口（按阻断程度排序）

### 7.1 必须由真人 / 实机完成（自动化无法替代）

| ID | 项目 | 来源 |
| --- | --- | --- |
| S8 | 实机负载与长时间稳定性：目标 1080p 均衡档核显 ≥ 60 fps、1% low ≥ 40；需硬件/画质/场景采样 | `docs/mcp-stability-plan.md`、计划 §10.4 |
| S1/S2 | 九章全程自然通关（现有浏览器路线均为“阶段 3 受控起点 + 清初始守卫”夹具） | `docs/mcp-continuous-acceptance-2026-09-21.md` |
| S4 | 先遣队八关连续自然驾驶通关 | 同上 |
| S7 | 音频最终听感：循环接缝、混音掩蔽、提示可辨性 | 同上 |
| — | 噩梦难度实机手感；鼠标跳变修复在真实鼠标/DPI/刷新率下的确认 | 09-22 两份文档 |
| — | 九章墙地材质用户目检与真实显卡开销 | `docs/mcp-chapter-surfaces-2026-09-22.md` |

### 7.2 已知未做的工程/功能项

1. `app.js` 第四阶段拆分（约 40 个模块级 `let` 的会话状态对象化）。
2. `desktop/main.cjs:54` `import('./flight-records-store.js')` 应改为 `./src/flight-records-store.js`（目录重构遗留一行）。
3. 浏览器 smoke “audio: sfx during play” 偶发 flake，建议 `retry: 1` 或加长 `fireBuffer` 窗口。
4. 直升机吊挂任务化；大地图分区与流式（计划 §7.4，未启动）。
5. 主 FPS 页面运行时文案 i18n（用户已决定暂不做英文）。
6. `scripts/perf-capture.mjs` 性能采样脚本（计划 §10.4）未见落地。
7. 发行：12 次提交未推送；EXE 未 Authenticode 签名；`scripts/build-web.mjs` 网页版打包未做。

### 7.3 非缺陷候选（可选打磨）

W02 装饰壳鞍座近距同色辨识度、直升机旋翼模糊盘追尾视距存在感（`docs/mcp-joint-coexistence-supplement-2026-09-21.md`）。

## 八、建议的下一步（供用户选择，不自动执行）

1. **推送 `main`**（领先 origin 12 次、工作树干净、CI 三层本地全绿）——建立安全恢复点。
2. 顺手修 `desktop/main.cjs:54` 一行路径 + smoke audio 用例 `retry: 1`，重跑 `test:browser:smoke` 后再打 1.5.5。
3. 按 `docs/mcp-stability-plan.md` S1–S8 表逐项做人工验收，优先 S8 性能采样（先定硬件与画质档），把结论写入 `docs/`。
4. 人工验收通过后再决定是否进入计划 §14 剩余项（`app.js` 第四阶段、流式分区）或直接进入发行准备。

## 九、评估边界

- 本文只读；未运行浏览器层、性能压测或真机；未打开用户存档。
- 百分比为对照 `docs/mcp-full-development-plan.md` 各阶段目标条目的人工估算，不是测试覆盖率，也不能替代 `docs/mcp-project-status-roadmap.md` 作为状态入口。
- 历史批次的“未实现”均按 `docs/README.md` 规则以当前源码与最新批次为准核对，未把旧快照当作今日结论。
