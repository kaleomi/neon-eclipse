# 第一章「反应堆设施」写实科幻工业材质与模型样板升级（2026-09-20）

## 1. 目标与范围边界

- **用户需求**：针对游戏主题，寻找适合的写实科幻工业模型与材质，并替换接入。
- **范围与样板**：以第一章「反应堆设施（K-19 / Reactor Complex）」作为第一批视觉样板。
- **严守约束**：
  1. **零外部网络/CDN依赖**：遵循项目自给自足规范（如 `docs/mcp-neon-art.md`），所有贴图采用本地程序化 Canvas 烘焙生成，纹理及逻辑自包含，无外部链接或闭源版权侵权风险。
  2. **玩法与物理碰撞 100% 保持**：`obstacles` 几何尺寸、掩体高度、通道路线、大型敌人 40 条导航路线（`test-core.mjs`）保持严格一致。
  3. **不影响并行改动**：不重置其他会话正在进行的音频与设置项代码，不执行 git commit 或 git push。

## 2. 材质与视觉升级明细

| 部件 | 原始实现 | 升级实现（写实科幻工业） |
|---|---|---|
| **围墙表面 (wallMap)** | 简单纯色板加五道横条与 4 个小点螺栓 | 模块化重装甲复合钢板：加入微观金属噪点与划痕表面、倒角拼接缝隙、主结构工字钢横梁、沉头高强度铆钉组合、深层散热排风百叶窗及内腔凹槽、黄色安全警戒标线与「SEC-01 / COOLANT / HIGH P」工业模板字符编码。 |
| **围墙物理材质 (wall material)** | `color: 0x526975, metalness: 0.55, roughness: 0.65` | `color: 0x5e727e, metalness: 0.62, roughness: 0.52`，开启 8 倍各向异性过滤（`anisotropy`），高角度下防拉伸模糊。 |
| **地表底板 (floorMap)** | 单调双层方框 + 简单点线横纹 | 强化工业重型防滑钢网与导流地坪：暗色基底噪点、外围厚重金属膨胀边框、四角沉头加固法兰螺栓盖板、错落防滑钢格栅踏板、低饱和青色战术通行指示边界线与琥珀色中心地标。 |
| **地表物理材质 (floor material)** | `roughness: 0.48, metalness: 0.65` | `roughness: 0.42, metalness: 0.72`，突出重工业钢板的光泽质感。 |
| **通用金属结构件 (metal / black)** | `metalness: 0.25/0.18, roughness: 0.5/0.52` | `metal: metalness: 0.58, roughness: 0.38`；`black: metalness: 0.42, roughness: 0.52`，提升管线、立柱与法兰的质感层次。 |

## 3. 验证与诊断结果

- **语法与类型检查**：`node --check art.js`、`node --check reactor-arena.js` 通过。
- **核心物理与导航回归**：`node test-core.mjs` 退出码 0，40 条大型敌人寻路路线及碰撞体积完好无损。
- **关联子模块回归**：`node test-session-chrome.mjs`、`node test-session-brief.mjs`、`node test-map-registry.mjs` 全部通过。
- **静态分析与代码诊断**：LSP `get_diagnostics` 结果为 0 个错误，0 个警告。
- **素材来源与授权**：自主程序化算法生成，无版权争议，代码受项目 MIT/ISC 协议约束。
