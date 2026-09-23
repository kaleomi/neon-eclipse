# 环境交互模型精细化：EV01 / EL01 / EV02 / EN01

日期：2026-09-21。项目：`game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6`。以下路径相对于该项目根目录。

## 本轮范围与 MCP 使用规则

用户要求连接 MCP、明确使用规则、查看 game 进度并继续生成未精细的模型。连接 `shuncode-bridge 0.7.4`，完成 initialize 与 tools/list，共 15 个可用工具。

- 文件发现：list_directory / find_files；原文定位：search_files；语义导航：lsp；先用 read_files 读取目标，图像用 read_image。
- 修改：apply_patch，既有文件带读取版本 SHA-256；不覆盖并行改动。源码编辑与运行输出分开记录。
- 执行与验收：run_command / get_command_output；必要时 cancel_command / send_command_input；修改后 get_diagnostics。
- 任务协调：set_todos（update_plan 为兼容形式），最多一个 in_progress；report_progress 报告临时进度。
- 独立读取可并行，同一文件写入串行；本批重负载浏览器串行。结论写入 docs，机器基线、截图与日志放在 `.tools/qa-environment-props/`。
- 仅改当前 game 项目。本轮不安装宿主依赖、不操作真实玩家存档、不暂存/提交/推送、不制作 EXE。不更改伤害、碰撞、交互时长、章节布局或存档格式。

## 接手时进度核对

- 起始 HEAD：`5a1a6cf`；工作区有其他会话未提交内容，未清理或归为本轮成果。
- 九章战役、八关先遣队、八种重玩模式已有实现与专项交付。仍需连续自然流程、平衡、视觉和真实硬件验收；不提供缺乏工作量基线的总体完成百分比。
- 已有敌人花名册、P01 手臂、M01/A01/T01、B01/E01、四类载具、八把常规武器及 P01_BODY 等资产文件/清单。本轮不重复生成，也不把文件存在视为全部运行时接线及美术验收完成。
- `docs/mcp-model-gap-fill-2026-09-21.md` 是之前首批交付记录，其“后续尚未实施”不能直接覆盖当前目录中更晚的资产。
- 本轮选择仍使用简易箱体/圆柱结构的环境交互控制台、喷口和可击破储能节点；与已存在的可投掷 E01 EMP 资产是不同对象。

## 四件真实模型

| ID | 资产 | 网格 / 材质 | 三角面 | 字节 |
| --- | --- | --- | ---: | ---: |
| EV01 | `models/vent-console-ev01.glb` | 6 / 6 | 2,988 | 220,472 |
| EL01 | `models/light-console-el01.glb` | 6 / 6 | 2,760 | 204,044 |
| EV02 | `models/steam-nozzle-ev02.glb` | 5 / 5 | 1,896 | 140,988 |
| EN01 | `models/energy-node-en01.glb` | 12 / 7 | 6,424 | 472,424 |

共 1,037,928 字节、14,068 三角面。原创程序化硬表面资产，PBR 与状态指示材质；米制、+Y 向上、+Z 正面，地面中心为枢轴。无外部贴图、无骨骼、无烘焙动画，不宣称电影级写实。

- EV01：三轴倒角壳体、机械压力表、辐条手轮、流向符号、状态条、检修后盖与连接器。
- EL01：防护断路器、实体拨杆、分路保险、灯泡符号、独立琥珀状态显示。
- EV02：深腔开口格栅、环形法兰、加强筋、紧固件与安全标记。
- EN01：开放式核心、铜色线圈、电磁底座；保留低耐久变色、核心消失与耗尽底座。

## 实际接入及资源边界

`environment-prop-models.js` 是导出和游戏的共同建模源；`scripts/build-environment-props.mjs` 写入四份 GLB、独立 manifest 与 `models/environment-props.manifest.json`。默认无参数不是空跑，而是重建后逐字节、完整元数据及来源哈希核对。

- 游戏同步使用同源程序模型，不新增这四份 GLB 的网络加载。独立 GLB 供交付、展厅及 DCC 使用。
- `interaction-world.js` 保留原两座 `.6 × 1.1 × .6` 碰撞/射线代理、布局、判定与状态机，只隐藏代理材质并挂接新视觉；地面交互环、云雾范围和照明强度逻辑不变。
- `energy-nodes.js` 保留原 `.7m` 核心目标、圆柱底座、30 耐久、EMP 范围/遮挡/机械敌人限制、一次放电、重试与恢复语义。EN01 是独立无射线视觉，核心与底座可独立呈现状态。
- 细节按材质合并，不为每个螺栓增加绘制调用；不可变几何/材质共享，仅状态材质各实例克隆。模板上限四类，交互世界释放幂等；节点 reset 不重建几何。
- 展厅：`environment-props-preview.html`。可切换真实 GLB / 同源源模型，正背面、线框、旋转、状态预览与下载；390px 响应式以实际浏览器结果另行记录。

## 验证记录

已完成的首轮：

- 七个新增/修改 JS/MJS 语法检查通过。
- 四份 GLB 生成及默认逐字节/来源复核通过。
- `test-environment-props.mjs` 7 组通过：有限数值、预算、碰撞包络、GLB 头/解析/边界、来源哈希、300 次实例创建释放、私有状态材质、九章 144 条控制台射线、节点代理与 100 次破坏/重置。
- `test-interactions.mjs`、`test-interactions-world.mjs` 通过。第一轮命令随后引用了旧注释中的不存在文件 `test-interaction-layouts.mjs` 而退出 1；不把该整条命令记为全通过，不新造测试或放宽旧断言。九章位置验收已在现存交互规则脚本中。
- 编辑器首次诊断：0 error/warning。

### 最终复核（隧道恢复后已取回）

- 断线前浏览器首轮只完成 EV01，在 EL01 返回 GLB 时等待超时；没有把当时的运行中状态当作通过。展厅改为按需渲染，空闲时不持续占用软件 WebGL，并增加载入失败即时报告；保持原 60 秒断言超时，没有放宽测试。
- 实际 GLB 截图检查发现 EL01 拨杆被背板部分遮住；调整背板深度及拨杆厚度/倾角，继续保持原碰撞包络，重建并重新通过全部 Node 验证。
- 第二轮四模型展厅与 390px 通过，但测试误认为运输站含储能节点。读取 `field-layouts.js` 与 `app.js` 确认只有反应堆有两个节点，运输站与其他章为空。测试改为逐图对照真实布置并明确断言零节点，未增加节点或修改游戏布局。
- 末轮 `test-environment-props-browser.mjs` **8 组通过，退出 0**：四模型真实 GLB HTTP 200/同源程序几何对照/正背面/状态/线框、390px、reactor/station/train 原生部署，页面异常为 0；约 36.9 秒。
- 原有 `test-interactions-browser.mjs` **九章通过，退出 0**：原生 E 按住、提示百分比、排气效果、照明切换/恢复及 reset；约 41.6 秒。夹具控制时钟/摆位，不宣称自然通关。
- 最终四模型构建复现、新增 Node 7 组、现有 `test-interactions.mjs` / `test-interactions-world.mjs` / `test-energy-nodes-world.mjs` 全部通过。现存旧断言未放宽。
- 从宿主取回四份 GLB 的精确副本，与宿主清单逐份 SHA-256/长度匹配；Arena 侧 Khronos glTF Validator 2.0.0-dev.3.10 检查合计 **0 错误、0 警告、0 信息**。宿主未安装 validator，报告位于 `.tools/qa-environment-props/gltf-validation.json`。
- 最终编辑器诊断 0 error/warning。没有运行完整 CI、全部浏览器测试、实机 GPU 性能或真人视觉签收。

首次失败日志 `node-pass1.log`、`browser-pass1.log`、`final-pass2.log` 均保留；最终浏览器链为 `.tools/qa-environment-props/browser-pass3.log`，结构化结果为同目录 `result.json`。浏览器使用隔离 Chromium / SwiftShader，不使用玩家真实配置。

## 复跑入口

```bash
node scripts/build-environment-props.mjs
node test-environment-props.mjs
node test-interactions.mjs
node test-interactions-world.mjs
node test-energy-nodes-world.mjs
node scripts/run-tests.mjs --layer browser --filter environment-props --jobs 1 --verbose
node scripts/run-tests.mjs --layer browser --filter interactions --jobs 1 --verbose
```

## 后续模型工作

1. PULSE、CINDER、LANCE、BREAKER 的持用/拾取模型专项；当前八把常规武器 GLB 不覆盖全部重武器与近战。
2. 其他投掷物、携行/改装设备逐项核对；无独立 GLB 不等于游戏没有视觉。
3. P01_BODY 的真实使用入口、动画及阴影接线另行验收，不因清单的 runtime 描述自动判为已接入。
4. 已有资产的远距离识别、LOD、实机 GPU、完整关卡视觉与人工审美验收。

本批只交付上述四件环境模型，不将“全部模型已精细化”或“发行验收完成”作为结论。

## 用户追加顺序与选择框

隧道恢复后，用户明确要求重新制作 B01 高爆压缩燃料桶、E01 EMP 脉冲发生器、四类海陆空载具、八把第一人称主战武器，并要求后续每批提供“继续 / 停止”选择框。本篇只记录环境四件套；追加批次独立记录，不把尚未重做的十四件记为本批交付。
