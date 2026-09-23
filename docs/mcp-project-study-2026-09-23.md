# NEON ECLIPSE 项目研究报告（2026-09-23，只读）

范围：`game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6`（以下简称“主项目”）。本轮只读，未修改主项目任何源码、资产、测试或 Git 历史；本文档是本轮唯一写入主项目的文件。
关联交付：独立新项目 `game/phase-echo`（设计与验证见 `game/phase-echo/docs/mcp-phase-echo-design.md`）。

## 1. 快照

| 项 | 观察值 |
| --- | --- |
| HEAD | `db804ef`（main），领先 `origin/main`（`0cf9cfa`）12 个提交（`git rev-list --count origin/main..HEAD`） |
| 已追踪文件 | 1156（tests 332、src 296、docs 203、models 102、audio 54、styles 35、release-desktop 27、characters 22、scripts 21、weapons 14、maps 14） |
| 工作区改动 | 8 个 `src/*-world.js` 修改（+33/−10），25 个未追踪文件（cover-props 批次：`src/cover-props*.js`、`models/cover-*.glb` 及清单、`scripts/build-cover-props.mjs`、两项测试、两份 docs、`cover-props-preview.html`） |
| 运行时 | Node 24.15、npm 11.12、Git 2.55（Windows / PortableGit bash） |
| 依赖 | 仅 `three@^0.186.0`；`node_modules` 另有 `playwright@1.63.0`（浏览器层测试使用） |
| 服务 | `server.cjs`：静态服务，端口 `PORT` 或 5173，含 Range 请求与媒体 MIME，路径越界 403 |

## 2. 结构

- **入口页**：`index.html`（九章 FPS 战役）、`vehicle.html`（海陆空载具场）、`helicopter.html`、`p4-hub.html` / `p4-vehicle.html`（P4 模式）、`operations-archive.html`、`audio-credits.html`，以及十余个 `*-preview.html` 资产展厅。
- **`src/`（约 298 个模块、1.74 万行）**：按“规则 / 世界 / UI”后缀拆分，例如 `*-rules.js`（纯规则，可 Node 测试）、`*-world.js`（Three.js 场景）、`*-ui.js`（DOM）。最大文件为 `p4-app-candidate.js`（849 行）、`app.js`（775 行）、`menu-ui.js`（467 行）、`vehicle-app.js`（458 行）。
- **`app.js`**：FPS 总装配点，导入约 110 个模块；通过惰性访问器对象 `ctx` 把约 80 个模块级绑定共享给 `session-flow.js` / `session-input.js` / `p4-bridge.js`（三阶段拆分的产物，见 `docs/mcp-app-split.md`）。
- **`weapons/`**：数据驱动武器注册表（`registry.js` + 每把武器一个定义文件 + `schema.js` 校验），`LEGACY_WEAPON_IDS` 固定四把旧武器槽位顺序以兼容存档。
- **`maps/registry.js`**：章节注册表（九章），取代早期 `level.js` 的布尔常量分支。
- **其他**：`characters/`（GLB 角色运行时加载器）、`models/`（GLB + manifest）、`audio/`（录音 + 程序化配方 + 音频总线）、`i18n/`、`desktop/` 与 `release-desktop/`（便携 EXE 打包）。

## 3. 测试与 CI

- `scripts/run-tests.mjs` 自动发现 `tests/test-*.mjs` 并分层：`check`（全部 JS 语法检查）、`rules`（不导入 three 的纯规则测试）、`integration`（导入 three 的场景/导演测试）、`browser`（`*-browser.mjs`，Playwright，默认不跑）。默认并发 2。
- `.github/workflows/ci.yml`：`node-tests`（check → rules → integration）与 `browser-smoke`（`test-smoke-browser.mjs` + expedition/archive）两个 job；文档记录首次全绿为 `4256b35`。
- 浏览器测试自带静态服务与隔离 Chromium 上下文，使用 `--use-angle=swiftshader`，不触碰真实存档（`test-smoke-browser.mjs` 头部注释）。
- `tests/test-import-graph.mjs`：从页面入口遍历静态 import，引用未追踪模块即失败（防止“本地能跑、干净检出白屏”）。

## 4. 文档与协作约定（必须遵守）

- `docs/README.md` 是入口；**当前状态唯一摘要**是 `docs/mcp-project-status-roadmap.md`；其余 `mcp-*.md` 是各批次当时的快照，不得把其中的“未实现 / 下一步”当作今天的结论。
- 交付分级记录：源码已接线、规则通过、浏览器通过、人工通过、性能通过分别写；Git 提交不是功能完成证明。
- 不删除旧失败记录，不把后来的结果伪写成早先完成；提交前保留其他会话的工作边界（`docs/mcp-change-ownership-2026-09-18.md`）。
- `.gitattributes` 统一 LF；`.gitignore` 忽略 `.tools/`（QA 截图、探针脚本）与 `artifacts/`。
- 用户长期约束（见 `docs/mcp-full-development-plan.md`）：只交付源码、不制作 EXE、不清空真实存档、不无依据削弱已确认难度；多处记录“每批给出继续 / 停止选择”。

## 5. 当前开发状态（据 roadmap 与近期提交）

- 内容：九章战役（每章 Boss 已补齐）、八把武器（含 W01–W08 v2 视模）、敌人名册与盾卫/狙击/工程/指挥官等 GLB 模型、先遣队 8 关载具任务、直升机吊运/医疗后送、P4 八种模式、噩梦难度。
- 近期：`db804ef` 桌面 1.5.4 资源完整构建；`f39cb2a` 源码迁入 `src/`、样式迁入 `styles/`；`d531778` 测试迁入 `tests/`。
- 未决（roadmap 原文）：J01 快艇前向视角遮挡、J02 960×640 固定翼仪表与武器 HUD 重叠——“等待修复 / 停止选择，不自动改相机或 HUD”；联合验收“非全绿”，不宣称视觉签收、自然通关或目标 GPU 性能。
- 工作区：cover-props（掩体道具 CP02–CP09）批次处于未提交状态，另有 8 个章节 world 文件的接线改动。

## 6. 对新项目的借鉴

`game/phase-echo` 采用了主项目验证过的做法，但代码完全独立、不复制主项目源码：

1. 规则层与 Three.js 表现层分离，规则层可在 Node 无头测试（主项目 `*-rules.js` / `*-world.js` 的思路）；新项目更进一步，整局可由机器人在 Node 中打完。
2. 自带静态服务 + 隔离 Chromium 的浏览器冒烟测试（主项目 `test-smoke-browser.mjs` 的思路），并加入着色器程序数与堆内存观测。
3. 文档写入 `docs/mcp-*.md`、LF、无行尾空格；截图与探针输出放在被忽略的目录。

## 7. 观察到的风险（仅记录，未处理）

- `app.js` 仍通过约 80 个绑定的 `ctx` 访问器耦合会话模块，第四阶段（`reset/end/pause` 迁出）未做。
- 未提交的 cover-props 模块若被入口 import，会触发 `test-import-graph.mjs` 失败（与 roadmap 中 `4256b35` 前的 CI 事故同类）。
- 仓库历史曾追踪 62 MB QA 截图（`docs/mcp-asset-size-audit.md`），`.tools/` 已停止追踪，但历史 pack 体积仍在。
- 工作区根目录（`/e/data/workspace`）自身也是一个 Git 仓库（`a812c87 first commit`），且其索引中暂存了大量 `.tools/` 文件；与主项目仓库嵌套，提交时需分清仓库边界。
