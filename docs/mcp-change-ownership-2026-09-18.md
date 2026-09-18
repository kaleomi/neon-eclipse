# 未提交改动归属与源码整理记录

日期：2026-09-18。用户已明确授权按功能建立可回退提交，且确认仅另一个会话在推进直升机独立原型。本轮不改变此前误触提交，不推送远程。

## 审核口径

初始 HEAD：`29ef072de1d6dc5b900e520722607cf71f4e1ac4`。初始 index 无暂存内容。取得 110 个已修改/未跟踪文件的逐字节快照和 SHA-256；43 个已跟踪文件保存 HEAD 对照。机器清单与副本保存在工作区 `.tools/stability-audit-20260918/`，不放进项目 docs 或提交。

“归属”是按现有交付文档、实际差异/导入依赖划分功能域，不臆测作者身份。核对 P3 第五批历史结果 JSON 及 13 个源码/测试 SHA 与当前快照一致。快照之后新增的任何文件默认排除；白名单文件若变化则拒绝对应提交，重新核对，不覆盖并发编辑。

P1 与第九章在 app/campaign/mission/enemy 等文件中交叉，且旧历史已有混合 WIP。为避免临时改写工作区或制造缺失依赖的中间节点，本轮将它们归为 **FPS 集成批次**，不是宣称可以独立回退每个 P1 子功能。音频基础先行，两个入口集成随后，文档最后。载具音频和 P3 恢复在同一入口同行交叉，随载具集成整体归档。

## 文件白名单与依赖

### A 音频基础：事件差分、程序配方与规则测试

- `audio/sfx-catalog.js`
- `audio/vehicle-audio.js`
- `chapter-cues.js`
- `test-audio.mjs`

### B FPS 集成：P1 机械生态/EMP、第九章、迁移及章节音频入口

依赖 A；不包含直升机原型。

- `abyss-world.js`
- `app.js`
- `campaign.js`
- `chapter-achievements.js`
- `collectibles.js`
- `emp-rules.js`
- `emp-system.js`
- `emp-ui.js`
- `emp-world.js`
- `emp.css`
- `enemy-ai.js`
- `enemy-model.js`
- `enemy-rules.js`
- `enemy-ui.js`
- `engineer-director.js`
- `engineer-rules.js`
- `glacier-rules.js`
- `glacier-world.js`
- `index.html`
- `journey.js`
- `level.js`
- `levels.css`
- `maps/registry.js`
- `menu-art.js`
- `menu-state.js`
- `menu-ui.js`
- `mission.js`
- `polar-data.js`
- `polar-navigation.js`
- `polar-world.js`
- `projectiles.js`
- `save-hub.js`
- `sentry-director.js`
- `sentry-model.js`
- `sentry-rules.js`
- `swarm-coordination.css`
- `swarm-coordination.js`
- `swarm-director.js`
- `swarm-model.js`
- `swarm-rules.js`
- `test-chapter-cues-browser.mjs`
- `test-chapter-cues.mjs`
- `test-datacenter-browser.mjs`
- `test-emp-browser.mjs`
- `test-emp-world.mjs`
- `test-emp.mjs`
- `test-engineer-browser.mjs`
- `test-engineer-world.mjs`
- `test-engineer.mjs`
- `test-glacier.mjs`
- `test-harbor-migration.mjs`
- `test-map-registry.mjs`
- `test-menu.mjs`
- `test-orbital-browser.mjs`
- `test-orbital-migration.mjs`
- `test-polar-browser.mjs`
- `test-polar-enemies.mjs`
- `test-polar.mjs`
- `test-save-hub.mjs`
- `test-sentry-browser.mjs`
- `test-sentry-world.mjs`
- `test-sentry.mjs`
- `test-smoke-browser.mjs`
- `test-stars.mjs`
- `test-swarm-browser.mjs`
- `test-swarm-coordination-browser.mjs`
- `test-swarm-coordination-world.mjs`
- `test-swarm-coordination.mjs`
- `test-swarm-world.mjs`
- `test-swarm.mjs`
- `test-tower-migration.mjs`
- `test-train-migration.mjs`
- `tether-world.js`
- `volt-world.js`

### C 载具集成：先遣队前四关、备份/节点资格、载具音频入口

依赖 A；不包含直升机原型。

- `expedition-backup-ui.js`
- `expedition-backup.js`
- `expedition-model.js`
- `expedition-session.js`
- `expedition-store.js`
- `expedition-ui.js`
- `expedition.css`
- `flight-mission-ui.js`
- `save-hub-ui.js`
- `scripts/vehicle-browser-server.mjs`
- `test-expedition-backup-browser.mjs`
- `test-expedition-browser.mjs`
- `test-expedition-checkpoint-browser.mjs`
- `test-expedition-recovery.mjs`
- `test-expedition-storage-browser.mjs`
- `test-expedition.mjs`
- `test-joint-browser.mjs`
- `test-vehicle-audio-browser.mjs`
- `vehicle-app.js`
- `vehicle.html`

### D 文档

既有 P1/P5/P3 专项文档、当前总进度、历史标注、音频补记、稳定性计划和本归属记录。文档参考源码与证据，不把历史提交当作正式交付证明。修改文件统一 LF、无行尾空白，保留历史失败记录。

## 验证与提交结果

### 已建立的源码提交

| 批次 | 提交 | 文件数 | 范围 |
| --- | --- | --- | --- |
| A | `b0acc259f8eaa36790829b24d22d485e30d86f7f` | 4 | 音频配方、载具事件差分、章节提示模块与基础音频规则 |
| B | `649c3ebbb1ffcc7fcb0e15f2c6186a04911e9fb1` | 74 | FPS 集成与章节提示测试，依赖 A |
| C | `bbac485cf2bba3de0aa04d5188eb762766baf8a3` | 20 | 载具/先遣队恢复与音频入口，依赖 A |

D 文档以独立提交 `docs: unify current progress and record stability batches` 接续；为避免自引用，其提交号以 `git log` 为准。提交保存已有实现，不宣称本轮重新开发或完成发行验收。未 push、未回退此前历史、未制作 EXE。

### 本轮实际验证

- `node test-audio.mjs && node test-chapter-cues.mjs && node test-expedition-recovery.mjs` 串行通过，命令退出码 0，约 2.5 秒；没有运行完整默认套件或浏览器。
- 98 个源码/测试/样式文件在分组提交前后检查快照哈希；暂存对象核对通过，未重写这些文件。批次边界的相对模块导入闭合检查通过（第三方 node_modules 不作为源码提交）；章节提示规则测试依赖第九章，故随 B 而非 A 提交。
- 每批 index 起始为空、路径为明确白名单，`git diff --cached --check` 通过；提交后的路径清单与计划逐一相等。没有使用 `git add .` 或全量暂存。
- 当前语言服务返回 0 errors / warnings。文档执行 LF、行尾空白与引用路径检查；最终工作区检查不清理其他会话新增内容。
- 历史完整默认结果为 298/298、77/77、18/18；本轮未再次执行，亦未把旧结果当作新提交的完整回归。

人工九章/四关连续流程、章节音频浏览器、旧联合实时驾驶稳定性及实机性能仍按 `docs/mcp-stability-plan.md` 跟踪。

## 排除与风险

- 直升机原型归其他会话，初始快照没有 heli/rotor 命名文件；这不是按名称认定全部归属，提交仍仅限上述逐项审核白名单及固定哈希。
- 快照后新增/变化的文件、其他会话暂存内容、机器日志/截图、node_modules、EXE 均不纳入。
- 源码提交只是可回退快照，不自动升级为无缺陷或发行验收。章内调试探针、音频重试/结算生命周期、旧联合实时驾驶器稳定性仍应在后续稳定性工作核对。
- 源码回退不降级 IndexedDB/schema 或真实存档。按 `docs/mcp-stability-plan.md` 的依赖逆序回退规则操作；本轮不实际执行回退。
