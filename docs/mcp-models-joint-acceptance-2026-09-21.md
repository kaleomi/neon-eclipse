# 整批模型实际场景联合验收（2026-09-21）

## 结论

**功能与集成链通过；发现 2 项表现问题待修，不能据此标记视觉签收完成。**

范围为用户指定的 14 件重制模型，加此前完成的 EV01/EL01/EV02/EN01 环境四件套，共 18 份 GLB。冻结 70 份模型、清单、运行时/玩法文件；本轮前后 SHA-256 一致。没有重新生成模型、修改生产代码/玩法/相机数值，没有提交、推送或覆盖并行工作。

主验证链为 4 个只读构建验证 + 7 个浏览器程序，全部 exit 0、无超时，整条命令约 609.8 秒。这里的“通过”限于下述专项，不是自然全战役通关或目标 GPU 性能验收。

## 并行记录与本次冻结复核的关系

收尾时发现项目新增的并行报告 `docs/mcp-remake-joint-acceptance-2026-09-21.md`：该报告记录了另一时段 4/5 原套件通过、直升机物资链断言失败及入口从 `60e55ebe…` 到 `25599871…` 的变化。本轮没有覆盖、删除或将该历史失败改写成通过。

本轮主链冻结的入口已经是更晚的 `vehicle-app.js`：`e1b2c229ef4fba6836b2c1b1062b88b4432b672229b18d0973c313a0a2cfe792`。发现差异后，额外对**当前原版**直升机场地测试、入口、吊运/救援及本地静态导入依赖共 75 份文件冻结后复验：

- 当前原测试未改，SHA-256 为 `790261a8655bb4908a093560b3f3651ae7fc8f2e40c189377d0432235677a4ec`。
- 148.0 秒、exit 0，无超时，75 份文件前后 drift 为空。
- 当前扩展原测试包含 `loss starts the respawn timer`、物资链推进、平台交付、医疗吊运完成和评级断言，均执行到结尾。
- 这些是带既有位置/阶段夹具的受控流程（包括 skipToLastLeg），不是自然跑完整任务。结论仅为**该当前冻结版本的原用例复验通过**，不推断历史失败唯一根因，也不声明所有自然吊运/救援轨迹无缺陷。
- 最后对主链 70 文件与扩展复验 75 文件分别再次比对，两个 drift 数组都为空；两个批次入口 SHA 一致。

相关证据：`helicopter-recheck-baseline.json`、`helicopter-current-result.json`、`helicopter-current.log`、`final-cohort-comparison.json`。本次功能结论与旧报告的时间点、版本和覆盖范围必须区分。

## 覆盖矩阵

| 程序 | 结果 | 墙钟耗时 |
| --- | --- | --- |
| `build-interactive-props.mjs` | 通过 | 0.3 s |
| `build-environment-props.mjs` | 通过 | 0.2 s |
| `build-vehicle-models.mjs` | 通过 | 0.3 s |
| `build-weapon-models.mjs` | 通过 | 0.4 s |
| `scene-inventory-browser.mjs` | 通过 | 59.1 s |
| `test-barrel-browser.mjs` | 通过 | 89.9 s |
| `test-emp-browser.mjs` | 通过 | 53.9 s |
| `test-interactions-browser.mjs` | 通过 | 54.5 s |
| `vehicle-weapons-owned-browser.mjs` | 通过 | 76.9 s |
| `test-sea-air-browser.mjs` | 通过 | 85.4 s |
| `test-helicopter-field-browser.mjs` | 通过 | 186.0 s |

### FPS 场景的组合覆盖

- 只读追加观察实际生产场景，未替换启动/时钟/敌人逻辑：8 个 weapons-v2 视模、2 个 B01 props-v3、2 个 EN01、各 1 个 EV01/EL01/EV02 环境模型共同实例化，版本符合冻结清单，几何属性有限。
- 原生菜单部署、G 按住/释放创建 E01 props-v3；实测生命周期移除。未新增这批武器/道具/环境 GLB 的网络请求；P01 原有加载不在此排除条件中。
- 原燃料桶浏览器：八类武器对新版 B01 的攻击、爆炸、自伤、环境击杀归属、刀杀统计、Boss/实体掩体、暂停及存档/重置，随后检查其余 8 章铺设。
- 原 EMP 浏览器：原生 G 输入与引信、机械目标停机、掩体、刀杀/射击统计、充能 1/0 存档、结束/重置清理。
- 原环境浏览器：九章原生 E 阀门/照明操作、云内敌人效果、照明恢复、重置。

### 海陆空场景的组合覆盖

- 只读观察当前 P3 场地：V01/V03/V04 各 1、V02 共 3 个实例，均为 vehicles-v2；实际 native E 登乘。
- 原载具武器/耐久场景：行驶中进入炮手位、巡航、拒绝行进中下车、持续射击/松开停止、驾驶位禁射、撞击磨损、回收复位、任务禁用武器、隔离存档与窄屏。
- 原海空场景：固定翼原生起飞/空中禁离、快艇加速/刹车/离艇保护、调度重置和槽位。
- 原直升机场地：冷机/点火/升降、机炮/火箭、吊运挂接/低位释放、降落关机下机、步行实体阻挡、回收和灯塔岛停机坪。
- 这不是“18 件全部在一个地图同时活动”：FPS 与 P3 是不同页面，报告按实际场景分开覆盖。

## 图检发现与优先级

### J01 · P1 · 快艇前向视角被雷达/上层构件遮挡（未修）

- 复现：vehicle.html → 码头调度 → E 登艇 → C 前向视角；静止和航行截图都可见宽横梁/雷达架占据明显视野。
- 已做诊断 A/B：测试响应中仅将 `sea-air-world.js` 替换为重制前备份，不写生产文件；其余当前代码保持。旧/新两次 ship 均为 `(278,180), yaw=0, speed=0`，camera 均为 `[278,3.9,182]`。
- **旧几何也有横杆遮挡**；新几何的雷达架形态更复杂、遮挡构件更多。不能将其全部归因于这次重制，也不能因旧版存在就视为已验收。
- 归类：相机/自身船体的表现配合问题，不是未加载 GLB、玩法碰撞半径或模型损坏。
- 建议下一步：单独审查艇首视角位置或自身遮挡渲染策略，使雷达/支架退出前方主要观察区；保留物理、射击/伤害、AI、登乘和存档数值。修复需用户下一步确认。
- 证据：`yacht-hood-previous-geometry.png`、`yacht-hood-remade-geometry.png`、`vehicle-scenes/yacht-underway.png`、`visual-ab-result.json`。

### J02 · P2 · 固定翼仪表与武器 HUD 重叠（未修）

- 复现视口：960 × 640，进入飞机；实际起飞截图和地面诊断均见右上面板重叠。
- DOM 实测：`#flight-instruments` 为 x628/y110/w310/h121.078；`#vehicle-weapon-panel` 为 x668/y115/w270/h162.172，交集 **270 × 116.078 px**。
- 当前 `vehicle.css` 的 <=1100px 飞行仪表定位与 <=1000px 武器面板定位占用同一区域；与 3D 模型几何无关。本轮没有修改该样式。
- 建议下一步：调整/统筹响应式 HUD 布局，并增加面板交集为零的验收，不仅检查无横向滚动。不能只靠透明度或删信息掩盖重叠。
- 证据：`flight-hud-overlap.png`、`vehicle-scenes/aircraft-flight.png`、`visual-ab-result.json`；已定位 `vehicle.css` 相关选择器。

## 观察到但未作为通过结论的指标

- FPS 冷启动 GPU 资源计数 189 geometries / 33 textures，进入实战并投掷后 271 / 33；P3 初始 322 / 26。包含加载/上传/热身与不同可见对象，只是瞬时观察，不能由此判定泄漏或稳定帧率。
- 截图内低 FPS 数字来自隔离 Chromium/SwiftShader 环境，不能直接判定玩家硬件性能。
- 基础 PBR/顶点色、第一人称金属高光与手指包覆等仍属于人工美术签收范围；本轮没有据数值 IK 误差宣称“所有角度完全无穿模”。

## 变更归属

本轮只新增 `.tools/qa-models-joint-2026-09-21/` 的验收/诊断程序、记录与本报告；不改生产文件。

- `scene-inventory-browser.mjs`：追加只读版本/有限性观察，原生输入。
- `run-joint.mjs`：默认只读构建验证、顺序浏览器执行、前后 70 文件哈希。
- `vehicle-weapons-owned-browser.mjs`：现有测试的本轮副本；补正常“任务 → 南湾突围”页签点击与两张截图，原断言保持，不 force click，不改 DOM/游戏。
- `visual-ab-browser.mjs`：旧/新快艇几何只在隔离测试响应里切换，测量视角与面板矩形。
- `helicopter-current-recheck.mjs`：当前扩展原测试及本地导入依赖的 75 文件冻结复验，不修改原断言。
- 原有生产文件与原测试文件未改。临时服务器与浏览器均由各程序自己管理并结束。

## 证据与复现

全部机器证据在 `.tools/qa-models-joint-2026-09-21/`：

- `frozen-baseline.json`、`result.json`、`joint-pass1.log` 与每程序日志。
- `scene-inventory-result.json`、FPS 与 P3 场景截图。
- `visual-ab-result.json`、`visual-ab.log`、旧/新艇首和 HUD 截图。

```bash
node .tools/qa-models-joint-2026-09-21/run-joint.mjs
node .tools/qa-models-joint-2026-09-21/visual-ab-browser.mjs
# helicopter-current-recheck.mjs 保存的是本次独占基线；再次执行请先使用新证据目录，不覆盖旧基线。
```

本轮交付用户可读联合验收报告和 18 资产清单。14 件模型包维持原版，不因验收而覆盖。下一步提供“修复这两项表现问题 / 停止任务”选择，未经选择不改生产相机或 HUD。
