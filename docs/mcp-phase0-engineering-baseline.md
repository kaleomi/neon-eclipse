# NEON ECLIPSE｜Phase 0 工程基线交付

日期：2026-09-17

项目：`game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6`

归档：`docs/mcp-phase0-engineering-baseline.md`

上位方案：[完整开发方案](mcp-full-development-plan.md) 第 4 节。

## 一、结论

Phase 0 的六项交付全部完成并提交到本地 Git：**可回退基线、自动发现的分层测试、SaveHub 统一存档层、地图注册表、本地遥测、浏览器冒烟**。玩法、数值、关卡路线、挑战规则和所有存档格式均未改变；没有新增运行时依赖；没有打包 EXE；没有触碰用户真实存档。

最终验证：`npm test` 退出码 0（184 项语法检查、49 个规则测试、9 个集成测试，墙钟约 18 秒）；`npm run test:browser:smoke` 11/11 通过（约 64 秒）；编辑器诊断 0 条。

## 二、交付明细

### 1. Git 本地基线

- 项目根初始化仓库，分支 `main`，`core.autocrlf=false`，`.gitattributes` 统一 LF。
- `.gitignore` 排除 `node_modules/`、`desktop/node_modules/`、`desktop/web/`、`release-desktop/*.exe`、`release-desktop/win-unpacked/`、构建器日志和 `.tokeny/`。历史 `release-*.json` / `smoke-*.json` 作为交付记录保留在版本控制中。
- 首个提交打标签 `baseline-2026-09-17`，代表 Phase 0 之前的源码快照。任何一轮改动都可以 `git revert` 或 `git diff baseline-2026-09-17`。
- 没有配置远程仓库，也没有推送。

提交序列：

```text
baseline: NEON ECLIPSE source snapshot 2026-09-17 (pre Phase 0)
p0: auto-discovering test runner (scripts/run-tests.mjs), layered npm scripts
p0: SaveHub unified save layer (health, export, import preview/apply, pre-import backup, restore) + settings UI
p0: maps/registry.js as single chapter source; level.js, journey.js, menu-state.js, radar.js derive from it
p0: local battle telemetry (IndexedDB, opt-out, clearable) recorded at attempt end; settings toggle
p0: browser smoke test (own server, isolated context) + runner auto-detects external Playwright
p0: phase 0 documentation
```

### 2. 测试自动发现与分层

新增 `scripts/run-tests.mjs`，替换 `package.json` 中手写的 1.5 KB 命令串。

| 层 | 命令 | 发现规则 | 本次结果 |
| --- | --- | --- | --- |
| check | `npm run test:check` | 根目录、`desktop/*.cjs`、`scripts/` 全部 `.js/.mjs/.cjs` 的 `node --check` | 184/184 |
| rules | `npm run test:rules` | `test-*.mjs` 中不导入 three 的脚本 | 49/49 |
| integration | `npm run test:integration` | `test-*.mjs` 中导入 three 的脚本 | 9/9 |
| browser | `npm run test:browser` | `test-*-browser.mjs`，顺序执行 | 按需 |

- `npm test` = check + rules + integration；并行度默认 4（`--jobs n` 或 `TEST_JOBS`），`--filter 文本`、`--list`、`--verbose` 可用。
- 被其他非浏览器测试 `import` 的脚本（如 `test-difficulty.mjs` 由 `test-handling.mjs` 导入）不再重复执行；`test-flight-pilot.mjs` 识别为辅助模块。
- 此前不在 `npm test` 里的 `test-chase.mjs`、`test-naval.mjs`、`test-sea-combat.mjs`、`test-difficulty.mjs`、`test-flight-settings.mjs` 现在通过导入链或直接发现纳入默认运行。
- 旧命令串保留为 `npm run test:legacy` 以便对照；原有 `test:vehicle`、`test:*:browser` 等入口不变。
- 浏览器层在未设置 `VEHICLE_PLAYWRIGHT_MODULE` 时，会自动查找 `node_modules/playwright` 或工作区 `.tools/playwright`。本次 Playwright 1.58.0 安装在 `E:\data\workspace_shuncode\.tools\playwright`（项目外），复用已有的 `ms-playwright/chromium-1208`，项目 `package.json` 未增加任何依赖。

### 3. SaveHub 统一存档层

新增 `save-hub.js`（纯模块）、`save-hub-ui.js`（设置页控件）、`test-save-hub.mjs`。

- 注册 18 个已知槽位：`journey.v1–v4`、六章检查点键、`stars.v1`、`chapter-achievements.v1`、`achievement-notices.v1`、`combat-difficulty.v1`、`naval-difficulty.v1`、`presentation.v1`、`controls.v1`、`neon-eclipse-flight-invert-ws`；飞行成绩通过现有 `createFlightRecordStore` 读写。
- **各模块继续用自己的键和格式读写，SaveHub 不迁移、不重写任何槽位。** 它只提供：健康检查（正常 / 无数据 / 版本未知 / 已损坏 / 不可用）、导出 bundle、导入预览、导入执行、导入前自动备份、恢复备份。
- 导入规则：先写 `neon-eclipse.save-hub.backup.v1` 备份，备份失败则整个导入取消；损坏或未知键跳过而不是失败；合并模式只写 bundle 里有的槽位，替换模式同时删除 bundle 里没有的已知槽位；从不触碰未注册的键。恢复备份时把当前状态换入备份槽，因此恢复也可以再撤销。
- bundle 格式：`{app:'neon-eclipse', schema:1, exportedAt, slots:{key:rawString}, flightRecords?:[]}`，上限 4 MiB。
- 入口：主菜单 → 设置 → 「存档备份」面板。文案明确区分「战斗记录」页的单场战报导出。
- 测试覆盖：注册表与各模块导出键一致、健康检查不改写损坏数据、导出只含已知键、预览分类、合并/替换、备份失败中止、部分写入失败报告、字节级往返。

### 4. 地图注册表

新增 `maps/registry.js` 与 `test-map-registry.mjs`。

- `MAP_REGISTRY` 是六章的唯一有序来源：`id / order / code / title / english / brief / features / color / radarLabel / saveKey / boss / traits / modules`。
- `level.js` 通过 `resolveMapId(location.search)` 解析地图，未知或缺失回退第 1 章，与历史行为一致；`IS_*` 布尔继续导出给现有 7 个消费者，新代码应读 `MAP` / `MAP_ID`。选关导航条由注册表生成。
- `journey.js` 的 `CHAPTERS`、`menu-state.js` 的 `MENU_CHAPTERS`（原硬编码 `themes` 数组）、`radar.js` 的标题均改为派生。
- **本阶段是并存迁移的第一步**：`arena.js`、`campaign.js`、`mission.js`、`mission-ui.js`、`app.js` 中约 45 处 `IS_*` 分支尚未迁移。`modules` 字段目前只是声明路径，还没有改为动态加载。后续每触碰一处功能时顺带迁移，每步跑冒烟。
- 测试锁定：注册表形状、URL 解析回退、`CHAPTERS` / `MENU_CHAPTERS` / `CHALLENGE_MAPS` / `STAR_MAPS` / SaveHub 检查点槽位与注册表一致、Node 环境下 `level.js` 解析为第 1 章。

### 5. 本地遥测

新增 `telemetry.js` 与 `test-telemetry.mjs`；`app.js` 接入 5 行；设置页新增「本地统计」面板。

- 每次行动结束（撤离成功或死亡）写一条记录到 IndexedDB `neon-eclipse.telemetry.v1`：章节、模式（单章 / 战役 / 阶段训练）、锁定时的战斗难度、起始阶段、是否读档、结束阶段、胜负、击破、用时、承伤、耗弹、按武器耗弹、精英窗口与利用数、死亡阶段与坐标、各阶段行。
- 数据直接来自现有 `field-record.js` 的阶段记录，不另起一套统计口径。
- 默认开启，可在设置关闭（`neon-eclipse.telemetry-enabled.v1`）；提供「清除本地统计」。上限 2000 条，达到上限后拒绝新增而不删旧。任何存储失败都被吞掉，不影响战斗流程。
- **不上传任何数据**，也没有统计页；`summarizeTelemetry()` 已实现每章尝试 / 胜负 / 最好时间（排除读档与训练）/ 各阶段死亡数 / 最致命阶段 / 每难度胜率，供 Phase 4 统计页与 Phase 1 调参使用。
- 运行时对象暴露为 `window.neonTelemetry`，供设置控件与浏览器测试读取。

### 6. 浏览器冒烟

新增 `test-smoke-browser.mjs`，`npm run test:browser:smoke`。

- 自行在空闲端口启动 `server.cjs`，使用隔离 Chromium 上下文；**不依赖开发者正在运行的 5173 服务，不读写真实存档**。
- 11 个步骤：六章各自启动（`data-map`、WebGL 上下文、选关高亮、无页面错误）；新游戏 → 暂停 → 重试阶段 → 暂停，并验证 localStorage 哨兵未被动；旧 `journey.v3` 记录被识别且旧键保留；设置页 SaveHub 导出下载 → 修改后导入预览 → 合并 → 备份存在 → 恢复 → 非法文件拒绝；遥测开关持久化；遥测 IndexedDB 保存 / 读取 / 清除往返；载具试验区入口确认框与 `vehicle.html` 启动。
- 本次 11/11 通过，约 64 秒。软件 WebGL 渲染只证明页面可启动与流程可走通，不代表画面或性能验收。

## 三、修改文件

新增：`.gitignore`、`.gitattributes`、`scripts/run-tests.mjs`、`maps/registry.js`、`save-hub.js`、`save-hub-ui.js`、`telemetry.js`、`test-save-hub.mjs`、`test-map-registry.mjs`、`test-telemetry.mjs`、`test-smoke-browser.mjs`、本文档。

修改：`package.json`（scripts）、`level.js`、`journey.js`、`menu-state.js`、`radar.js`、`menu-ui.js`（两个设置面板）、`menu.css`（面板样式）、`app.js`（遥测 5 行）。

## 四、并行会话说明

本轮进行期间，同一工作区另有会话在开发联合任务检查点（`joint-checkpoint-*.js`、`test-joint-checkpoint*.mjs`、`vehicle-app.js`、`vehicle.html`、`joint-mission.js`、`test-joint-browser.mjs`、`package.json` 中两个新脚本）。Phase 0 的每个提交只暂存自己的文件；这些改动保留在工作区未提交状态，由其所属工作完成后自行提交。第 3 个提交曾误把当时的检查点文件一并暂存，已在下一步用 `reset --soft` 重做为只含注册表文件。

## 五、边界与未做

- 没有初始化远程仓库、CI 或提交钩子；`npm test` 仍由人工触发。
- SaveHub 未改变任何槽位格式，也没有把各模块的读写改为经过 SaveHub；那是后续 v5 存档工作的内容。
- 注册表未迁移 `app.js` / `arena.js` / `campaign.js` / `mission.js` / `mission-ui.js` 的 `IS_*` 分支，`modules` 字段尚未用于动态加载；`app.js` 的职责拆分尚未开始。
- 遥测没有统计页、没有导出，也没有用于任何调参。
- 冒烟没有覆盖章节衔接、死亡结算、星星拾取、挑战资格授予或载具任务；这些仍靠现有专项浏览器测试。
- 未在目标设备做性能采样；未打包 EXE。

## 六、复测

```text
npm test                        # check + rules + integration，约 18 秒
npm run test:browser:smoke      # 需要 Playwright；自动查找 .tools/playwright
npm run test:list               # 查看四层各自发现的脚本
git log --oneline               # 七个提交；git diff baseline-2026-09-17 查看全部 Phase 0 改动
```

浏览器测试的 Playwright 模块位置可用 `VEHICLE_PLAYWRIGHT_MODULE=file:///E:/data/workspace_shuncode/.tools/playwright/node_modules/playwright/index.mjs` 显式指定。
