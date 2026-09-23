# MCP 表现修复批次:J01/J02 收敛与小优化(2026-09-21)

用户在联合验收选择框后选择「J01+J02 与小优化都做」。本批只做表现层修改,不改任何玩法数值、物理、伤害、AI、登乘或存档规则。

## 本批实际改动(2 个生产文件)
1. **J01 · 快艇前向视角遮挡**:`naval-aim.js` hood 视点高度 `y:3.9 → y:4.7`(一处常量)。原因:hood 视点在船体中心前 2 m、y=3.9,恰好处于驾驶舱顶(~2.85)与雷达拱顶(~3.7,近水平瞄准线)之间,系泊/低速时前向视野被自身上层结构占据。并行 A/B 已证实旧几何同样存在,属相机表现配合问题。抬高后瞄准线越过拱顶;追尾视角、navalAim、炮位与存档数值全部未动。
2. **旋翼模糊盘存在感**:`helicopter-world.js` 运行时半透明盘(非第八材质)峰值不透明度 `0.19 → 0.29`、颜色 `0xced8ce → 0xdfe8df`,并更新本会话自有的 `test-vehicle-models-refined.mjs` 期望值(.19 → .29)。仅视觉;转数曲线、可见性切换逻辑、物理不变。

## 并行会话已修、本批锁定验证(未重复修改)
- **J02 · 固定翼 HUD 重叠**:`vehicle.css` 已被并行会话加入 battle-cruise 布局(armed 时 `#flight-instruments` 钉 `bottom:100px`、面板 `top:104px`)。本批 960×640 地面+空中实测交集为 **0 px**(此前 270×116.078 px);HA>1280 追尾布局不变。`vehicle.css` 本批零改动。
- **W02 装饰壳鞍座辨识度**:`weapon-asset-models.js` 已被并行会话改为交替黄铜 `Signal` 壳。本批 `scripts/build-weapon-models.mjs` 校验模式 8/8 VERIFIED(W02 3060 tri/7 网格/567,168 B,Khronos 批次基线未回退),GLB 与当前源一致。该文件本批零改动。

## 验证
- **修复探针** `.tools/qa-joint-fixes-2026-09-21/joint-fixes-probe.mjs`(独立、不改原测试):先 DIAG 后断言两轮。
  - J01:hood 相机 y=4.7,前方 90 m 射线 0 命中(修复前同点位曾命中拱顶);航行截图前向视野开阔。
  - J02:地面交集 0、空中交集 0(armed=true)。
  - 旋翼盘:悬停 rpm≈0.99 时 opacity 0.285(修复前 0.188),截图可见盘面。
  - 结果:`probe-final.log` PASS;截图 joint-yacht-hood-960.png、joint-plane-air-960.png、joint-heli-disc.png。
- **回归链**(全部 exit 0):`test-weapon-models-refined.mjs`(11 组,含 48 快照/锚点/预算)、`test-vehicle-models-refined.mjs`(8 组,含 253,800 posed vertices、V04 模糊恢复、P4/入口钉)、`test-sea-air-browser.mjs`、`test-helicopter-field-browser.mjs`、`test-helicopter-browser.mjs`(10/10)。
- **漂移守卫维护**(诚实记录并行演进,基线不改):
  - `test-weapon-models-refined.mjs`:13 项 unchanged 契约中仅 `app.js` 因并行工作漂移(166ccc2b… → 9a6bca75…,非本批);新增 `.tools/qa-joint-fixes-2026-09-21/fixed-batch-boundary.json` 记录本轮起点值,守卫改为「批次起点或本轮边界」,原基线 JSON 保留原值。
  - `test-vehicle-models-refined.mjs` driftLedger:`vehicle-app.js` 迁移至当前值 1d8d4691…(并行在 e1b2c229… 之后又演进;`helicopter-rules.js`/`helicopter-sling.js` 与台账一致未动)。备注内保留旧版本号。

## 边界
- 隔离 Chromium/SwiftShader + 受控夹具;未做完整 CI、自然战役通关、目标 GPU 性能或真人美术签收;修复效果以几何/布局断言与软渲染截图为准,最终视角手感需人工确认。
- 本批前四文件备份于 `.tools/qa-joint-fixes-2026-09-21/before/`(naval-aim.js 20060b8f…、vehicle.css 29c37057…、weapon-asset-models.js 746531a3…、helicopter-world.js b3ba3b6a…)。
- 改动后:`naval-aim.js` 684ce980…、`helicopter-world.js` b95cbcb4…、`vehicle.css`/`weapon-asset-models.js` 未变(与备份一致,即证未动)。
- 测试维护仅限上述两处期望值/台账;未放宽任何断言(交集为零、射线零命中、盘不透明度均为新增/收紧)。

## 证据索引
`.tools/qa-joint-fixes-2026-09-21/`:joint-fixes-probe.mjs、probe-diag.log、probe-final.log、probe-result.json、regression-pass1–4.log、fixed-batch-boundary.json、before/、joint-*.png、locate*/guard*/post-shas 等诊断文本。本地工作区另存关键截图(`game-work/joint-fix-renders/`)。
