# MCP 联合验收补充复核:反应堆同框 census 与载具截图(2026-09-21)

## 定位与并行报告关系
- 本报告是 `docs/mcp-models-joint-acceptance-2026-09-21.md`(冻结批次联合复核:功能链全过,J01 快艇视角遮挡与 J02 固定翼 HUD 重叠两项表现问题待修)与 `docs/mcp-remake-joint-acceptance-2026-09-21.md`(重制后联合矩阵)之后的**独立只读补充**,不覆盖、不重复二者的覆盖矩阵与结论,也不改写其历史失败记录。
- 本轮新增:反应堆同框逐件 census 数字(含 W02 瞬态装填弹壳的统计口径说明)、两张反应堆同框截图、四张重制后载具场景截图的本地归档,以及合并后的遗留细节清单。

## 边界声明
- 隔离 Chromium + SwiftShader 软件渲染 + 受控确定性夹具;反应堆联合夹具为服务端原生启动;载具截图来自重制后已全绿的原生输入遗留套件实拍。
- 未做完整 CI、自然战役通关、目标 GPU 性能或人工美术验收;软渲染下 FPS 徽标读数偏低属环境产物。
- **未修改任何玩法数值、碰撞、时机、放置或存档**;同源运行时模型,无新增 GLB 网络请求;独占备份与各批次已通过回归未重跑。

## 方法
- 新增独立只读夹具 `.tools/qa-joint-acceptance/joint-acceptance-capture.mjs`(不改动任何原测试):复用 test-barrel-browser.mjs 的 app.js 路由钩子模式,注入 `__joint` 手动时钟(仅验收进程内生效,不改发布文件)。
- 流程:反应堆 `?map=reactor&menu=chapter` 原生启动 → 1 号武器 → B01 桶前截图 → 原键位投掷 E01(仅使用作者配置的 2 充能,未改数值)→ EMP 视角截图 → 只读 census(遍历 scene/gun,读取 userData 资产标记与网格/三角统计)。
- census 口径:W02 瞬态装填弹壳(`createLiveReloadShell`,`userData.transient`)按设计排除,不计入静态资产统计(第一轮曾把瞬态弹壳计入导致断言失败,属统计口径问题,非缺陷;修正口径后通过)。

## 结果一:反应堆场景(props + weapons 同框)
| 对象 | 运行时标记 | 网格 | 三角 |
| --- | --- | --- | --- |
| W01–W08 ×8(viewmodel) | weapons-v2 | 7/7/7/7/7/7/8/8 | 3324/3060/3260/1184/2716/4208/4016/4362 |
| P01 第一人称手臂 | glb(P01_ViewmodelHost) | 41 | 4880 |
| B01 燃料桶 ×2(场景对象,含运行时附加子件) | props-v3 | 18 | 3804 |
| E01 投掷体(隐藏物理球 + E01_Visual) | props-v3,assetId=E01 | 6 | 2412 |

- 场景桶/投掷体对象包含运行时附加子件(交互环、引信表现等);资产本体(B01 2,492 tri、E01 2,332 tri)已在各自批次核实,本表为场景实测。
- 反应堆 authored EMP 充能 2(读数,未改动);投掷、引信链路表现正常,toast 提示正确。无 pageerror;`capture-pass3.log` PASS + `joint-census.json`。
- 截图:`joint-barrel-vanguard.png`(B01 与 W01 同框)、`joint-emp-in-scene.png`(E01 飞行中与场景同框)。

## 结果二:载具真实场景(vehicles 共存)
重制后已全绿的原生遗留套件截图各取一张,均为真实任务场景实拍:
- `legacy-vehicle-browser/vehicle-driving.png`:V01 越野车跑道/后备胎/尾灯与场景标牌、风车带同框正常;
- `legacy-sea-air-browser/aircraft-flight.png`:V02 固定翼 156 km/h 飞行姿态正常;**该图同样可见 J02 所述飞行仪表与武器 HUD 重叠**,未修;
- `legacy-sea-air-browser/yacht-underway.png`:V03 游艇离港 75 km/D;**该图同样可见 J01 所述上层构件对前向视野的遮挡**,未修;
- `legacy-helicopter-field-browser/heli-airborne.png`:V04 直升机 5.1 m 悬停、转速 98%,阴影接地正确。
未见重制引入的接缝、错位或材质异常;六张截图已取回本地工作区 `game-work/joint-acceptance-renders/`(含 retrieval-manifest.json)。

## 遗留细节清单(合并视图;均不改玩法数值)
1. 【J01·未修,归属并行报告】快艇前向视角被雷达/上层构件遮挡;本轮游艇截图独立可见同一现象。修复涉及相机/自身遮挡策略,需用户确认后另行实施。
2. 【J02·未修,归属并行报告】≤1100px/≤1000px 下固定翼仪表与武器 HUD 面板重叠(实测交集 270×116.078 px);本轮固定翼截图独立可见同一现象。属 vehicle.css 响应式布局问题,与 GLB 无关。
3. 【设计确认,无需处理】W02 实时 viewmodel 装填动画期间因瞬态弹壳暂 +2 网格(7→9);静态资产仍 7 网格,符合本批 ≤8 预算。
4. 【候选·视觉,本轮新增】W02 泵动护木下四枚装饰壳鞍座与机匣同色系,近距离辨识度可再提升(仅资产配色微调,不动几何)。
5. 【候选·视觉,本轮新增】直升机主旋翼动态模糊盘在追尾视距下存在感偏弱(`helicopter-world.js` 运行时效果);如需增强需另行批准。
6. 【环境说明,非缺陷】SwiftShader 软渲染使 FPS 徽标读数 1–5;链路断言均正常,无性能结论。

## 证据索引
- 远程 `.tools/qa-joint-acceptance/`:joint-acceptance-capture.mjs、capture-pass1/2/3.log、joint-census.json、joint-barrel-vanguard.png、joint-emp-in-scene.png、inventory.txt、grep-w02.txt、emp-src*.txt
- 本地 `game-work/joint-acceptance-renders/`:6 张截图 + retrieval-manifest.json
- 并行报告证据:`.tools/qa-models-joint-2026-09-21/`、`.tools/qa-remakes-joint-2026-09-21/`;批次证据:`.tools/qa-interactive-props-v3/`、`.tools/qa-vehicles-v2/`、`.tools/qa-weapons-v2/`
