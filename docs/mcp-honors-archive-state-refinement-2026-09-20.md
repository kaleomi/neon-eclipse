# 成就与行动档案：整合复核及状态精修

日期：2026-09-20。项目：game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6。以下路径相对项目根目录。

## 接手基线

本轮接入时，工作树已经包含 honors-presentation.js、archive-presentation.js、成就概览/卡片、档案空状态、返回成就路由，以及 docs/mcp-honors-archive-polish-2026-09-20.md。保留并复核这些成果，不声称它们全部由本轮新写，也不重复叠加 UI。

现有成就页提供按章节范围的已保存荣誉计数、已获得/未获得标签、历史与本轮挑战分离、九章名称、筛选空状态恢复。状态筛选不改变完成率分母；读取失败不判断为全部未获得。

## 本轮新增与修正

### 可见且可逐项清除的筛选条件

- 在档案摘要下显示当前已生效的章节、难度、模式、恢复标记、时间筛选标签。
- 收起完整筛选面板后，标签仍可见；点击标签清除对应条件，不重置其他筛选。
- 复用原 select 与 change 处理，不复制过滤算法，不写存储。
- 清除操作重绘后，键盘焦点移到下一枚标签；最后一枚清除后返回筛选展开按钮，避免焦点落到已删除节点。
- 标签名称使用 textContent，不把记录里的章节名称作为 HTML。

### 读取失败不再展示误导零值

- 原先错误提示虽然说明“无法读取”，汇总卡片仍会显示 0、0/0，帧时序也显示“无样本”。
- 现在读取失败时，行动次数、胜负、时长、射击、帧时序数值均显示“—”，并用暖色状态区分正常数据。
- 胜率、表格、武器分布与分页同步说明“暂不可读取”，不把未知状态当作零历史。
- 将纯展示适配器调用移到统计 DOM 更新之后，确保未知状态不被刚写入的零值覆盖。
- 正常空档案仍显示真实的零样本状态；导出在无记录或读取失败时保持禁用。

## 文件边界

- 新增 archive-view-state.js：筛选标签与错误展示助手。
- 修改 archive-presentation.js：挂载标签，接入未知状态。
- 修改 operations-archive.js：调整展示调用时序，不改读库、汇总、分页与导出算法。
- 修改 ui-clean.css：追加档案范围内的标签与未知数据样式，不影响战斗 HUD。
- 扩展 test-archive-browser.mjs：标签清除保留其他筛选、焦点恢复、重置清空标签、拒绝读取显示未知而非零。

## 本轮验证结果

- 四个相关 JS 文件语法检查通过。
- 五项规则测试通过：test-achievement-gallery.mjs、test-chapter-achievements.mjs、test-archive-reader.mjs、test-archive-summary.mjs、test-challenge-progress.mjs。
- test-honors-polish-browser.mjs 通过：已保存/指定章节计数、九章名称、状态筛选分母、空状态恢复、未来版本字节保护、三种成就页面尺寸、档案空状态/拒绝读取/返回成就。
- 扩展后的 test-archive-browser.mjs 通过：27 条隔离示例记录、分页、筛选、实际 JSON 下载、导出移除死亡坐标、逐项清除筛选与焦点、XSS 文本安全、390px、拒绝访问、未来数据库结构、Storage/IndexedDB 零写入与原记录等价。
- test-ui-clean-browser.mjs 20 组全部通过，保留设置、装备、工坊、暂停/结算及其他入口行为。
- 串行验证完成，HONORS_STATE_EXIT=0；编辑器错误/警告 0 项。
- 六个服务资源 HTTP 200，响应字节 SHA-256 与磁盘相同：operations-archive.html、operations-archive.js、archive-presentation.js、archive-view-state.js、honors-presentation.js、ui-clean.css。

## 证据与边界

- .tools/honors-archive-state-validation.log：本轮串行测试日志。
- .tools/qa-honors/archive-active-filters.png：实际生效的标签与筛选记录。
- .tools/qa-honors/archive-unavailable-metrics.png：拒绝读取时的未知数值与提示。
- .tools/qa-honors/achievements-desktop.png：成就页面截图。

截图使用隔离测试数据，不代表用户真实成绩。测试不读取、清理或迁移玩家原浏览器存档。没有修改成就授予、战斗数值或存档格式；未提交、推送、打包。一次本地补丁准备脚本的缩进匹配断言失败发生在发送补丁之前，未修改远端文件；修正后使用读取版本哈希安全应用。

## 体验与下一批

打开 http://localhost:5173/ 并 Ctrl+F5：成就 → 行动档案。已有记录时改变筛选，收起面板后可直接通过标签逐项清除。当前服务已确认可访问。

下一批聚焦 HUD、暂停和结算：生命/弹药/目标的信息优先级、克制的危险提示、结算统计与主要操作；继续保持实际玩法、任务流程和存档规则不变。
