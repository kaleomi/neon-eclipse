# 仓库结构整理：tests/ 目录迁移

日期：2026-09-22
项目：`game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6`

## 目的

根目录约 700 个文件平铺，其中 329 个 `test-*.mjs` 与 296 个生产 `.js` 混在一起。第一步只迁移测试，不动生产源码与页面，保证 `index.html` 等入口和桌面打包路径不变。

## 改动

- `git mv` 329 个 `test-*.mjs` 与 3 个测试专用 helper（`browser-loadout-driver.mjs`、`helicopter-test-pilot.mjs`、`roster-browser-driver.mjs`）到 `tests/`。
- 测试内 `'./x'` 相对路径改写为 `'../x'`（265 份），测试之间的互相 import 保留 `./`。
- 28 份浏览器测试 `spawn(server.cjs,{cwd:process.cwd()})` 改为项目根锚定；6 份 `const root=dirname(import.meta.url)` 改为上一级；11 份裸 `readFileSync('models/…')` 等改为 `new URL('../…',import.meta.url)`。
- `test-enemy-roster-world.mjs` 基线模块重写、`test-helicopter-transfer-app.mjs` 源码 import 解析均改为相对项目根。
- `scripts/run-tests.mjs`：从 `tests/` 发现与启动测试；`check` 层额外覆盖 `tests/*.mjs`；`THREE_RE` 接受 `../node_modules/three`。
- `package.json` 17 条脚本、`.github/workflows/ci.yml` 2 处改为 `node tests/…`；`desktop/stage.cjs` 忽略 `tests/`。

## 验证（迁移后）

- check **664/664**、rules **136/136**、integration **67/67**，与迁移前完全一致。
- `tests/test-smoke-browser.mjs` **15/15**（323 s）。中途一次 10/15 是同机并发跑了两份 smoke 争抢 Chromium，单跑通过。
- 未提交前 `test-import-graph` 331 modules all tracked。

## 未做 / 下一步

- 生产源码仍在根目录（296 个 `.js` + 20 个 `.html`）。移动它们需要同时改 HTML `src`、`import.meta.url` 资源解析、`desktop/stage.cjs` 的相对导入重写和 `server.cjs` 根，风险与收益应单独评估。
- `package.json` 中 `test:legacy` 一长串命令与 `run-tests.mjs` 重复，可考虑删除。
