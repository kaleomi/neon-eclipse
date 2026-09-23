# 2–9 章掩体／障碍箱建模（cover-props）

日期：2026-09-22
项目：`game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6`
范围：用户提出"游戏中有很多正方体，能否给它建模"。经确认，范围是第 2–9 章战场里的掩体／障碍箱；方式为参数化程序建模为主，另出每章一个代表性 GLB 原型供目检；八章一次接完。第一章已有 `heavy-cover.glb`，不动。

## 结论

**功能接线完成，本地三层回归全绿，八章浏览器对照通过（碰撞／顶板／门／提示色逐项相等）。未做真人实机验收。**

- 新模块 `src/cover-props.js`（139 行）：8 个主题，按每个障碍箱自己的 `w×h×d` 生成边框、面板、槽位、警示带、灯位等部件，任何尺寸都贴合原碰撞体；`commit()` 按材质合并为静态网格，每章只增加 3–7 个 draw call。
- 8 个 world 文件各加 3–5 行：`station/roof/tower/train/harbor/orbital/datacenter/polar-world.js`。没有改任何 `*-data.js`、门、阶段、伤害、导航、存档。
- 新增 `tests/test-cover-props.mjs`（integration 层，自动纳入 `test:ci`）与 `tests/test-cover-props-browser.mjs`（opt-in 浏览器专项）。
- 新增 `scripts/build-cover-props.mjs` → `models/cover-*.glb` × 8 + manifest（含来源哈希），以及 `cover-props-preview.html` + `src/cover-props-preview.js` 预览页。游戏不请求这些 GLB。

## 1. 现状核对

`grep BoxGeometry` 全项目 113 处。真正被玩家当"正方体"看到的，是 2–9 章由 `*-data.js` 数据驱动、只赋纯色材质的掩体／障碍：

| 章 | 数据源 | 原状 | 本轮主题 | 处理数量 |
|---|---|---|---|---|
| 02 车站 | `STATION_COVER`（13） | 黑色方块；其中 4 个已是长椅 | `crate` 货箱 | 9 |
| 03 屋顶 | `ROOF_COVER`（12） | 灰／深色方块 | `relay` 中继柜 | 12（≤4.2 m 高） |
| 04 塔楼 | `TOWER_WALLS` 中 2×2 柱 | 墙材方块 | `locker` 服务器柜 | 1 |
| 05 列车 | `TRAIN_COVER`（9） | 深色车顶箱 | `crate` | 9 |
| 06 港口 | `HARBOR_CONTAINERS`（11） | 三色方块 + 细肋 | `container` 集装箱 | 8（排除船舱与矮箱） |
| 07 轨道 | `ORBITAL_COVER` 中 `cover:true` | 环色方块 + 青色顶标 | `pod` 配重舱 | 9 |
| 08 数据中心 | `DATACENTER_RACKS` + 主机 | 深色方块 + LED 条 | `rack` 机柜 | 14 |
| 09 极地 | `POLAR_HUTS` / `POLAR_BANKS` | 暖房墙板／平顶雪块 | `hut` / `snowbank` | 3 / 14 |

玩法上第一章 `art.js` 已用 GLB 替换掩体并保留占位组做碰撞，本轮沿用同样思路：**碰撞体永远是原方块**，建模只加子部件。极地雪堆例外：原平顶方块 `visible=false`，改为整体雪脊 + 冠部雪包，但 obstacle 仍是原方块。

## 2. 实现要点

- 部件位置由 `seedOf(x,z)` 确定，不消耗 `Math.random`：QA 对照稳定，同一位置每次生成一致。
- 面板外凸 1.2 cm（港口／数据中心 3 cm，越过宿主已有的肋条与 LED），避免 z-fighting；顶部附件 ≤ 1.2 m；xz 方向不超出碰撞体 ±32 cm。
- 材质每主题 7 个共享（含调用方传入的 body 材质，不由本模块释放）。`dispose()` 幂等。
- 合并后网格 `matrixAutoUpdate=false`，带包围球；`userData.coverProps=主题` 供测试识别。
- 没有贴图、没有下载、没有改 `chapter-surfaces.js`；材质是普通 `MeshStandardMaterial`，因此**不参与米制投影贴图**，也不会被章节 InstancedMesh 批处理二次合并（它们不是 BoxGeometry）。

## 3. 验证记录

本机（用户 Windows，Node 24.15.0，Three 0.186）：

| 项 | 结果 | 证据 |
|---|---|---|
| `npm run test:ci` | check 669/669 · rules 136/136 · integration 68/68（含新增 `test-cover-props.mjs`） | `.tools/cover-props-ci-2026-09-22.log` |
| `test-cover-props.mjs` | 8 主题、生产选择共 70 个掩体、32 024 三角形；足迹／高度包络、确定性、无泄漏 | 同上 |
| `test-cover-props-browser.mjs` | 8 章：五阶段碰撞／顶板快照、Basic 材质提示色与门几何与基线逐项相等；draw call 增量 = 合并网格数（q=2 阴影×2）；纹理数不增 | `.tools/cover-props-browser-2026-09-22-r3.log`（1–7 章）+ `-r4-polar.log`（第 9 章） |
| 基线 | 改动前用 `test-chapter-surfaces-browser.mjs SURFACE_CAPTURE=before` 采到独立目录 | `.tools/qa-cover-props-2026-09-22/before.json` |
| 截图 | `.tools/qa-cover-props-2026-09-22/cover-<map>.png` × 8，已目视：车站／屋顶／列车／港口／数据中心／极地均可见新建模 | — |
| `test-chapter-surface-boot-browser.mjs` | 九章原生菜单→部署→W 移动→暂停→画质切换全部通过（首次跑第一章 W 位移断言偶发失败，单独重跑全绿；第一章本轮未改） | `.tools/cover-props-boot-2026-09-22-r2.log` |
| `test-station-look-browser.mjs` | **预期失败**：其「draw call 不增」断言与本轮目标相反（车站 +4 合并网格）；未改该测试、未重采其基线 | `.tools/cover-props-station-look-2026-09-22.log` |
| `get_diagnostics` | 0 | — |
| `build-cover-props.mjs` | 8 个 GLB 全部 ≤ 900 三角形、≤ 7 网格，manifest 校验通过 | `models/cover-props.manifest.json` |

各章均衡档主视角 draw / 三角形（前 → 后）：车站 25→29 / 2 872→5 032；屋顶 31→35 / 7 040→9 176；塔楼 138→144 / 3 216→3 468；列车 303→307；港口 101→105；轨道 143→147；数据中心 87→91；极地 44→45。

浏览器对照过程中修正的两处：数据中心机柜第一版槽位过密（+25 k 三角形），改为每舱一块面板 + 稀疏槽位（14 柜 7 368 三角形）；极地雪堆隐藏原方块后 draw 反而减少，测试为该主题单独放行"减少"方向。

## 4. 没有做／边界

- 未做真人实机与帧率验收（S8 仍空）；软件 WebGL 计数不代表核显 60 fps。
- `test-chapter-surfaces-browser.mjs`（几何签名相等）与 `test-station-look-browser.mjs`（draw 不增）两个 opt-in 对照对本轮**必然失败**：它们锁定的是「场景网格集合／draw 数不变」，而本轮就是新增网格。两者都没有改、也没有重采基线，留给下一轮决定是把 `.tools/qa-cover-props-2026-09-22/` 提升为新基线，还是给它们加 cover-props 白名单。
- 载具／先遣队／直升机场景（`frontier-world.js` 等 ~30 处 BoxGeometry 建筑、机甲）、`characters/player-body.js`、敌人 `dressEnemy` 不在本轮范围。
- 塔楼只有 1 根 2×2 柱符合条件，视觉增量最小；如需更多，需在 `tower-data.js` 增加掩体数据（属于关卡改动，本轮不做）。
- GLB 原型是目检用，未接入 `desktop/verify.cjs` 的最小数量（≥49，仍满足）。EXE 未重打包。
- 未提交、未推送。

## 5. 复验

```bash
node tests/test-cover-props.mjs
node scripts/build-cover-props.mjs            # 校验；--write 重新生成
export VEHICLE_PLAYWRIGHT_MODULE=file:///E:/data/workspace_shuncode/.tools/playwright/node_modules/playwright/index.mjs
node tests/test-cover-props-browser.mjs        # 需要 .tools/qa-cover-props-2026-09-22/before.json
```

预览页：`cover-props-preview.html`（同源 three，无 CDN）。
