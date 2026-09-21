# P01 SENTINEL 第一人称手臂接管完成报告（2026-09-21，MCP 自动化）

## 范围与结论
并行"玩家手臂视模"会话遗留了资产但集成停在半路：游戏生产入口 `createWeapons()` 经 `app.js:209` 在浏览器中直接抛错后 stalled（见 early-tails 文档记录的 `grips` 缺陷链）。本会话完成接管：修复集成、跑通全部契约测试与真实浏览器验证，并把资产登记进 Git。

**当前状态：8 把武器的第一人称手臂全部精确贴合（误差 <1e-6 m），Node 契约 8/8 PASS，真实浏览器（软件 WebGL）6/6 PASS，生产入口无 shim 启动零错误。**

## 交付资产（全部已提交 Git）
| 文件 | 说明 |
|---|---|
| `characters/player-arms.js` | P01 程序化源（13 节点刚性关节骨架：肩/臂/前臂/肘/手 ×2 + 头肩胸壳体；41 网格 / 4880 三角形 / 6 材质） |
| `characters/player-arms-viewmodel.js` | 视模适配层：挂点、GLB 异步热切换（procedural → glb → fallback）、解析式双骨臂求解（肘部 hint 保证刚性甲板不穿模） |
| `models/player-arms-p01.glb` | 烘焙资产（661,320 字节，SHA `7243c27d…de89b`），含 5 段 30fps 剪辑：Idle / Sprint / Reload / Melee / Hit |
| `models/player-arms-p01.manifest.json` | 清单（bytes/sha256/统计/源哈希/生成器版本） |
| `test-player-arms.mjs` | 8 项 Node 契约（真实 Three.js + 真实 weapon-models；无浏览器/无存档） |
| `test-player-arms-browser.mjs` | 6 项真实浏览器验证（截图产物在 `.tools/qa-player-arms/`） |
| `scripts/build-player-arms.mjs` | 可复现构建：默认只比对；`--write` 重建 GLB+manifest。默认运行结果 **GLB 与 shipped 资产逐字节一致** |

## 并行会话遗留缺陷与本会话修复（weapon-models.js / player-arms-viewmodel.js）
1. **`grips` 只传 3 把武器**（`hands.slice(0,3)`）：武器 3–7 右手无锚点可解，只能落到静息姿态 → 改为全 8 把登记（`hands[i]=hand(...)` 补齐 arc-blade/tempest/halo/railspike/volt 分支）。
2. **霰弹枪泵动支撑锚点挤占 `hands[4]`**：与武器 4（tempest）槽位语义冲突 → 独立 `pumpSupport` 变量，装填供弹动画与每帧求解改走该变量。
3. **后坐踢在 IK 求解之后施加**：`Shoulders.rotation.x+=recoil*.10` 让手部每帧偏出约 11.8mm → 调整为先加踢再求解，踢近似保留、落点回到 <1e-6。
4. **契约测试导入写成 `../`**：在仓库根目录约定下永远无法解析（测试从未运行过）→ 改为 `./`。
5. 新文件未进 Git（import-graph 红灯）→ 已提交；`environment-surfaces.js` 一并登记（属 ground/audio 会话资产，仅 `git add` 未代提交）。

## 验证记录
- `node test-player-arms.mjs`：**8/8 PASS**（含 GLB↔manifest 哈希与 5 段剪辑校验、procedural↔GLB 结构一致）。
- `node scripts/run-tests.mjs --jobs 2`：check 621/621，rules 134/135，integration 56/57，61–65s。失败项见【边界】。
- `node test-player-arms-browser.mjs`（Playwright + SwiftShader，200 OK 取证）：生产无 shim 菜单启动零错误 → GLB 加载并热切换 → 8 武器浏览器内贴点 <1e-6 → 后坐 0.85 不脱锚 → 霰弹装填 1.5 秒亚微米跟踪 → 8 张第一人称截图互异、零页面错误。
- `node scripts/build-player-arms.mjs`：重建 GLB 与现网资产 SHA 完全一致（661,320 B / `7243c27d…`）。

## 边界（如实）
- `test-ground-audio-feedback.mjs` 4/6 失败为**改前既有**：`environment-surfaces.js` 在该测试的 canvas stub 上调用了未实现的 `createRadialGradient`，属 ground/audio 会话修复范围，本会话未动其代码。
- 命中求解为解析式双骨链（非完整骨架 IK）；手臂是**刚性装甲关节**风格而非蒙皮人体，符合项目硬表面约定。
- 软件 WebGL 只证明逻辑与渲染正确性，不证明真实显卡帧率；未做实体手柄/听感验证。
- 视模动画为程序化姿态驱动（Idle/Sprint/Reload/Melee/Hit 由同一姿态函数烘焙成剪辑并运行时直接调用），**没有**引入独立骨骼动画状态机。
- third-person 玩家全身模型、换弹指部微动画、更多呼吸/冲刺姿态仍是未来范围。

## 下一批默认
1. （可选）冲刺/受击时把这些剪辑接入现有 `Sprint`/`Hit` 游戏事件（当前运行时主用 Idle/Reload 两态 + IK）。
2. （可选）if 需要第三人称/影子/载具内可见身体：在 P01 骨架下补下半身与站姿。
3. 用户实机：真实 GPU 帧率手感、提交/打包/发布授权。
