# 第 1–4 章原生前段与塔楼默认尾程：验收及交接

日期：2026-09-21
项目：`game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6`
以下路径均以该项目目录为基准。

## 结论

**用户指定的两个开发任务已取得通过证据：塔楼原生尾程提升为默认；第 1–4 章前段目标与相应防守战新增原生覆盖。** 删除 `grips` 临时 shim 后的第 1–3 章尾程也全部复跑通过。

**主回归没有全绿：4 个测试入口失败，整轮最终标记为 `NATIVE_EARLY_FINAL_EXIT=1`。** 本轮未改动这些失败涉及的生产模块或测试，未为消除失败而暂存／提交他人文件、删导入、改模型或回滚。已停止扩展，按约定交接。

### 最终串行结果

| 项目 | 实际结果 |
|---|---|
| 默认塔楼 `test-elevator-browser.mjs` | `ELEVATOR_DEFAULT_EXIT=0`；不设置原生尾程 env |
| 四章同版本前段 `test-early-stages-browser.mjs` | `EARLY_FRONTS_EXIT=0`；reactor / station / roof / tower 均 PASS |
| 无 shim 三章尾程 `test-early-tails-browser.mjs` | `EARLY_TAILS_NO_SHIM_EXIT=0`；reactor / station / roof 均 PASS |
| 主回归扫描语法 | 656 / 656 |
| 规则测试入口 | 134 / 135 |
| 世界集成测试入口 | 63 / 66 |
| 主回归及整轮 | `MAIN_REGRESSION_EXIT=1`；`NATIVE_EARLY_FINAL_EXIT=1` |

主回归命令为 `node scripts/run-tests.mjs --jobs 1`，默认只含语法、规则、集成层。上表浏览器部分是本轮选定的三个脚本，**不是仓库全部 Playwright 专项**。

总摘要：`.tools/native-early-final-summary-2026-09-21.log`。
主回归日志：`.tools/native-early-main-final-2026-09-21.log`。

## 1. 塔楼尾程：默认已原生化

`test-elevator-browser.mjs` 已删除 `ELEVATOR_NATIVE_TAIL` 条件与旧的摆位撤离回退，也删除不再使用的 `extract()` 夹具。

真实 stage-4 检查点 retry 后，`place()` 和 `clearGuards()` 被锁定，路线为：

1. 留在 Boss 死后的 6 m 小平台，使用 W / Shift / Space 跳到战斗升降台。
2. 经 `ELEVATOR_BRIDGE` 向西行走。
3. 冲刺跳过 **x=15 至 x=12 的 3 m 空隙**，落到 6 m 核心层。
4. 经原第二段楼梯下到 3 m，再经第一段楼梯下到 0 m。
5. 从 x=-19.2 门洞旁 **z≈2.25** 的空带穿过，原生清理四名撤离守卫；必要时绕核心区南侧 z=12 走廊取得末名守卫视线。
6. 步行至 (-25,16)，验证不足时长不完成、松 E 清零，再保持 E 完成真正的 won。

实际桥西端站位约 `(x=15.50, feetY=6, z=5.99)`；冲刺跳跃后约 `(10.70, 6, 6.00)` 落地，`grounded=true`。没有填桥、删除护栏、移动升降机或修改碰撞。

默认复跑结果：总 kills=5（Boss 1 + 撤离守卫 4），health=100。既有未修改启动、护盾／暂停、三动力锁、八武器输入路径、呼梯、死亡 retry 专项也通过。

- 日志：`.tools/elevator-native-default-final-2026-09-21.log`。
- 已查看截图：`.tools/qa-elevator-native/elevator-extraction-won.png`；显示第 04 章完成、击破 5 个目标与下一关入口。没有据此宣称下一章已游玩或九章已通关。
- 首次楼梯失败是测试停得过早，仍踩在最后一级 3.25 m 台阶上；修正路点后通过。随后补南侧守卫接近路线。三次调试日志 `.tools/elevator-bridge-2026-09-21{,-r2,-r3}.log` 均保留，第三次退出 0 后才提升默认。

## 2. 第 1–4 章前段：同版本全部通过

新增 `test-early-stages-browser.mjs`。每章独立浏览器上下文，从真实菜单部署入口、正常难度开始；**不调用阶段 reset，不摆位、不清守卫，不注入生命／弹药，不预置目标或防守进度**。

瞄准由脚本计算；只读同层寻路只选择路点。位移、射击、换弹、补给拾取、E 保持与任务推进均走原生输入及生产逻辑。覆盖中断保持负例、真实保持、自动检查点以及屋顶双中继顺序。

| 章节 | 覆盖终点与防守 | 最终同版本观测 |
|---|---|---|
| 01 反应堆 WARDEN | 阶段 0–2 全部目标／守卫；完整 25 秒权限上传防守，离开半径暂停负例；进入阶段 3 | kills=28，health=71，shots=244；原生拾取 ammo-east |
| 02 车站 SWITCHYARD | 供电、站台、车厢、调度守卫；完整 18 秒防守及半径负例后才激活 Boss | kills=17，health=85，shots=141 |
| 03 屋顶 OVERSEER | 检修门、西中继→东中继、天线控制柜及守卫；进入阶段 3 | kills=11，health=92，shots=107 |
| 04 塔楼 ELEVATOR | 从大厅沿原楼梯逐层推进；完整 18 秒隔离防守，半径负例及“同一水平半径内、错误楼层”暂停负例；激活 Boss | kills=17，health=56，shots=103；原生拾取 tower-ammo-service |

日志：`.tools/early-stages-final-2026-09-21.log`。
截图：`.tools/qa-early-stages-final/{reactor,station,roof,tower}-front-complete.png`。

首次屋顶组合尝试中，换弹时沿用 2.6 秒侧移输入，走上可选挑战楼梯，导致同层寻路失败。已改为每 0.1 秒重查侧移碰撞与楼板支撑，未改生产关卡。失败组合 `.tools/early-stages-srt-2026-09-21.log` 保留；不能因为其中车站通过，就把该组合写成退出 0。修正后先完成屋顶／塔楼组合，再完成上述四章同版本复跑。

## 3. 去掉 shim 后的原有尾程复跑

删除 `test-early-tails-browser.mjs` 中针对 `weapon-models.js` 未声明 `grips` 的响应层临时 shim，生产文件未改。

本次无 shim 结果：

- 反应堆：PASS，kills=5，health=100。
- 车站：PASS，kills=5，health=76。
- 屋顶：PASS，kills=9，health=58；包括 Boss 后原生 20 秒上传防守。

日志：`.tools/early-tails-no-shim-final-2026-09-21.log`。
截图：`.tools/qa-early-tails-no-shim/{reactor,station,roof}-extraction-won.png`。

浏览器脚本的页面异常断言通过，但该日志仍有音乐资源请求 `net::ERR_ABORTED`。未将其抹去，也不据此宣称音频请求链或最终听感已经验收。

## 4. 主回归失败：只读定位，未跨会话修复

以下是本次运行的实际失败，不是对责任归属或真实游戏缺陷的完整鉴定。本轮开始时没有重跑完整主回归作对照，不能声称已逐一证明由哪一会话造成。

### `test-import-graph.mjs:22`

该测试要求从页面入口静态导入可达的模块被 Git 跟踪。本次实际返回六个未跟踪模块，而预期为 `[]`：

- `interactive-prop-models.js`
- `environment-prop-models.js`
- `weapon-asset-models.js`
- `mission-prop-models.js`
- `reactor-posters.js`
- `vehicle-models.js`

这些是生产入口导入链上的文件，不是本轮新增浏览器测试。不能把“本机文件存在、能运行”替代干净检出可用性的要求。**没有自动 git add／commit，也没有删除导入来消除失败；跟踪与提交安排由用户／归属会话确认。**

### `test-ground-audio-feedback.mjs`

2/6 子项通过，四个场景／地面检查报 `c.createRadialGradient is not a function`。已只读确认该测试第 13 行的 Canvas context mock 仅实现 `fillRect/strokeRect/fillText`，未提供渐变方法。没有修改 mock 或场景。

### `test-naval-manual-aim.mjs:56`

9/10 子项通过。失败为 `hull and deck remain`，对应 `model.root.children.length > 10` 的直接子节点数量断言。它是模型结构契约失败，**不能单凭该断言宣布船体／甲板真实消失**。应由归属会话核对当前模型层级和验证方式，不应为了消红随意补空节点或回滚模型。

### `test-vehicle-models-refined.mjs:105`

`helicopter-sling.js untouched` 哈希不匹配：预期前缀 `92291c78…`，实际 `1ec7b5ad…`。测试读取基线 `.tools/qa-vehicles-v2/before/source-hashes.json` 并要求 `unchanged-gameplay` 文件字节不变。本轮未改吊索文件或基线；需归属会话核对并行改动，不可为恢复旧哈希重置他人文件。

## 5. MCP 502 事件与原任务收尾

最终串行回归请求曾返回 **HTTP 502 Bad Gateway**，没有收到该请求的 `command_id`。当时立即停止新增测试启动并说明，没有重发原命令，也没有盲目终止 Node／Chromium 进程。

随后只读访问恢复，逐步从原任务日志确认：默认塔楼退出 0、四章前段退出 0、无 shim 尾程退出 0、主回归退出 1。最后摘要已写出 **`NATIVE_EARLY_FINAL_EXIT=1`**；原链的最终结果不再处于未知状态。

502 后的操作仅为读取原有结果／诊断和同步交接文档，没有再次发起浏览器或主回归。三个改动测试文件的 `get_diagnostics` 均为 0 条 error/warning。

## 6. 诚实边界与保护规则

- Boss 专项仍是“**阶段 3 受控起点 + 清初始守卫**”。塔楼 Boss 主体保留独立摆位／武器／呼梯等夹具，只有 retry 后的尾程禁止再摆位和清敌。
- 新前段从真实部署入口开始，但它与 Boss／尾程是分开的测试运行，**不等于一局自然整章通关，更不等于九章自然通关**。
- 屋顶 20 秒上传防守位于 Boss 之后，由无 shim 尾程专项复跑覆盖，不冒充新增前段脚本的覆盖。
- 脚本瞄准、只读路点规划和受控逐 tick 推进仍是自动化夹具；不代表人工操作难度／完整实时环境周期已验收。
- SwiftShader 软件 WebGL 不代表真实显卡帧率；本轮没有实体手柄测试，模拟手柄也不等于硬件；试听仍需人耳。
- 所有浏览器均为隔离上下文，没有清除真实存档。只改指定项目，保留其他会话改动，未提交、推送或打包。
- 代码改动只有三个测试文件；另新增本报告并同步 `docs/mcp-early-tails-acceptance-2026-09-21.md`、`docs/mcp-presentation-next-tasks-2026-09-20.md`。未修改生产碰撞、战斗数值、存档、模型或音频。

## 7. 默认下一步与复验命令

1. 暂停扩展，把第 4 节的四项主回归失败交归属会话／用户确认。不要自动暂存或提交他人的新模块，也不要回滚模型、吊索或更改历史基线来消红。
2. 归属问题处理后，串行复跑主回归并更新真实结果。现有浏览器证据不能替代主回归全绿。
3. 再优先把第 1–4 章“前段 → Boss → 尾程”接成同一局，保留阶段 3 初始守卫，取消接合处重置／摆位。此项本轮未完成，不应把分段 PASS 当作已完成。
4. 继续补后续章节前段／完整衔接；真实显卡、实体手柄、耳机／扬声器与发行仍需实机或单独授权。

在项目目录运行；以下命令仅供下一轮复验，本轮没有在 502 后重发：

```bash
export VEHICLE_PLAYWRIGHT_MODULE=file:///E:/data/workspace_shuncode/.tools/playwright/node_modules/playwright/index.mjs
ELEVATOR_SCREENSHOT=.tools/qa-elevator-native/elevator.png node test-elevator-browser.mjs
EARLY_SCREENSHOTS=.tools/qa-early-stages-final node test-early-stages-browser.mjs
TAIL_SCREENSHOTS=.tools/qa-early-tails-no-shim node test-early-tails-browser.mjs
node scripts/run-tests.mjs --jobs 1
```

可用 `EARLY_MAPS=reactor,station,roof,tower` 或 `TAIL_MAPS=reactor,station,roof` 选择子集。日志／截图放 `.tools/`，报告放 `docs/mcp-*.md`；不要并行重负载浏览器测试。

## 8. ABYSS 归属会话提醒（用户转交，非本轮重新验证）

> `abyss-world.js` 第 15 行护罩球本身就是 `core` 目标，任何 z≥−9 的射手射线都不会先碰箱体；侧面盲区只在 z<−9 站位，挪到 −7.3 也解决不了；真正该查的是 `attachArenaBossVisual` 的新 Hull 有没有进 `obstacles`。

当前 MCP 工具集中没有跨会话发信工具。提醒已写入仓库交接文档，**没有声称已直接送达另一个 AI 会话**；本轮未修改 ABYSS。

## 9. MCP 工具与交接来源

成功初始化 `shuncode-bridge` 0.7.4，协商协议 `2024-11-05`，取得 `Mcp-Session-Id`。会话过期需重新 initialize；隧道错误不等于会话过期，不能盲目重发执行请求。

15 个可用工具：

- 发现／读取：`list_directory`、`find_files`、`search_files`、`read_files`、`read_image`、`lsp`。
- 修改：`apply_patch`。先 `read_files`，从旧／新文本用 difflib 生成补丁，携带 `expected_versions`；版本过期先重读，不覆盖并发修改。
- 执行／验证：`run_command`、`get_command_output`、`send_command_input`、`cancel_command`、`get_diagnostics`。查询／停止命令使用准确的原 capability ID。
- 协调：`set_todos`、`update_plan`、`report_progress`。

远程为 Windows PortableGit Bash，源码一空格缩进。独立读取可并行，写同一文件串行，重负载测试串行。遇隧道或并行改动造成的外部阻断时停止并说明。

已完整读取的原始事实来源：

- `docs/mcp-early-tails-acceptance-2026-09-21.md`
- `docs/mcp-presentation-next-tasks-2026-09-20.md`
- `docs/mcp-continuous-acceptance-2026-09-21.md`

统一章节名称：01 反应堆 WARDEN、02 车站 SWITCHYARD、03 屋顶 OVERSEER、04 塔楼 ELEVATOR、07 轨道 TETHER、08 数据中心 ABYSS、09 极地 GLACIER。
