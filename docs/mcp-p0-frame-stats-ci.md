# P0/P4 工程批次：帧时序统计、入口拆分第一步与 CI

> 状态入口仍是 `docs/mcp-project-status-roadmap.md`；本文记录本批实现与验收。对应总体方案 `docs/mcp-full-development-plan.md` §4.5（`app.js` 拆分）、§4.6（数据采集）、§4.7（CI）。

## 1. 范围

- **帧时序统计**（`frame-stats.js`，新）：纯算术采样器。`sample(now)` 每帧一次，产出 HUD 帧率；`begin(quality)/finish()` 在一次行动内采样帧间隔（上限 4096 个样本，超出只计数），结束时给出 `{frames,avgFps,p50Ms,p95Ms,maxMs,long(>50ms 帧数),quality}`。`validFramePerf` / `summarizeFramePerf` 供遥测与档案页复用。
- **遥测附加 `perf`**：`telemetry.js` 的记录在 schema 1 内新增可选 `perf`（缺省 `null`）；`validTelemetryRecord` 对缺失字段放行、对畸形字段拒绝，旧记录原样有效。`archive-summary.js` 投影 `perf` 并导出 `summarizeFramePerf`；`operations-archive.html/js/css` 新增「本机帧时序」面板（样本数、按帧数加权平均帧率、最差 P95、最长单帧/长帧数、按画质档位分组）。**不上传**，不改数据库版本。
- **`app.js` 拆分第一步**：`player-collision.js`（`createCollision(obstacles)` → `blocked/move`，行为不变）与帧率统计从 `app.js` 移出；`app.js` 由 917 行到 916 行但去掉了两段内联逻辑。这只是 §4.5 的起点，session/input/damage/objective-runner 未拆。
- **CI**：`.github/workflows/ci.yml`——`node-tests`（check → rules → integration，`--jobs 2`）与依赖其后的 `browser-smoke`（安装 Playwright Chromium，跑 `test-smoke-browser.mjs`、`test-expedition-browser.mjs`、`test-archive-browser.mjs`）。`package.json` 新增 `test:ci`。本仓库不推送，工作流尚未在 GitHub 上实际运行过——这是文件交付，不是 CI 通过证据。

## 2. 改动文件

| 文件 | 改动 |
| --- | --- |
| `frame-stats.js`（新） | 采样器 + 校验 + 聚合。 |
| `player-collision.js`（新） | 原 `app.js` `blocked/move` 提取。 |
| `app.js` | 引入两模块；`reset()` 内对遥测行动 `frameStats.begin(画质档)`；`end()` 把 `frameStats.finish()` 作为 `perf` 交给 `telemetry.record`；`toggleQuality` 同步档位；帧循环 HUD 改用 `frameStats.sample`（文本不变时不写 DOM）。 |
| `telemetry.js` | `telemetryRecordFromResult` 接受 `perf`，校验可选字段。 |
| `archive-summary.js` / `operations-archive.*` | `perf` 投影与帧时序面板。 |
| `test-frame-stats.mjs`（新，rules 层） | HUD 帧率、百分位/长帧/上限/重置、遥测可选字段与旧记录兼容、档案投影、聚合、碰撞提取等价。 |
| `test-frame-perf-browser.mjs`（新，浏览器层） | 真实 reactor 章：开局后 HUD 帧率为数字、Q 切档、死亡后 IndexedDB 记录带 `perf`（帧数/百分位单调/档位），档案页面板显示聚合。 |
| `.github/workflows/ci.yml`（新）、`package.json` | 见上。 |

## 3. 验证结果

- 诊断 0（app/telemetry/archive-summary/operations-archive/frame-stats/player-collision/test-frame-stats）。
- `run-tests`：check 467/467、rules 108/108、integration 42/42。
- 浏览器（串行）：`test-smoke-browser` 15/15、`test-archive-browser` PASS、`test-frame-perf-browser` PASS。

## 4. 失败记录（已修）

1. **真实回归**：把 `blocked/move` 从提升的 `function` 改成 `const` 解构后放在原位置（第 563 行），更早的调用点（武器击退）触发 TDZ，`app.js` 模块初始化抛 `Cannot access 'move' before initialization`，菜单永不打开，首轮 smoke 0/15（每项 45 s 超时）。`node --check`、rules、integration 都没有发现，只有浏览器层暴露。修正为紧随 `obstacles` 声明。这正是 CI 里必须保留 smoke 层的理由。
2. 测试自身两处：`legacy` 夹具与 `withPerf` 同 id 被去重；`p95` 期望值写错（10% 长帧下 P95 就是长帧）。

## 5. 边界

- 帧时序来自本浏览器，跨设备/画质不可比；档案页明确标注。
- `app.js` 拆分仅迈出一步，§4.5 目标结构（<150 行装配）未达成。
- CI 工作流未经 GitHub 实际执行；Windows 本机验证等价命令通过。
