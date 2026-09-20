# NEON ECLIPSE 主菜单与章节选择：首批交付记录

日期：2026-09-20。项目：game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6。
以下文件路径均相对项目根目录。基线 HEAD：137ea9d；保留已有未提交改动。

## 本轮范围

- 首页仅保留四个按钮，DOM、视觉和键盘顺序一致：继续游戏、新游戏、设置、成就。
- 新游戏先进入准备页，选择主武器和投掷物，再点击开始游戏；固定副武器和近战清楚展示。此阶段选择是独立的新战役草稿，不修改正在进行的行动、生命、弹药或存档。
- 新战役从第一章开始；主武器使用现有常规武器定义，章节内特殊装备不提前授予。
- 原装备与改装面板保留在设置中的游戏分类及游戏内 U 快捷键，不删除现有功能。
- 选择关卡位于新游戏准备页及子页导航，保留九个独立章节；海陆空先遣和行动中枢集中在关卡页顶部。
- 行动档案移入成就页，本次战斗记录也从该页进入。
- 海陆空各菜单分类共用底部返回主菜单按钮，复用原返回链接的确认处理；不重置先遣队存档。

## 实现与保护

- menu-state.js：首页四项定义。
- menu-ui.js：准备页、层级导航、原重开确认、结果待保存阻止离开、v1–v7 旧记录检测；游戏手柄主操作不再绕过准备页直接开局。
- menu-deployment.js：出发配置展示、白名单校验、跨章节开新战役的配置传递；不在准备期间写 localStorage。
- session-flow.js：确认后才创建新战役；应用战备后保存真实第一章检查点。跨章节从第一章新入口继续，只有第一章无检查点的新战役接纳出发配置。
- ui-panels.js：海陆空返回按钮放到模态菜单内部，解决原页眉返回入口在遮罩外、键盘焦点不可达的问题。
- ui-clean.css：四项首页的高度调整，准备页与模式入口布局，窄屏单栏。复用现有科幻视觉，不覆盖已有材质、图片和音频工作。
- 测试适配：UI 夹具改从入口拆分后的 session-chrome.js 读取实际骨架；装备入口改为真实设置路径；smoke 按七分类设置结构选择声音和存档页，不删除原断言。

## 本轮已获得的验证结果

- 相关 JavaScript 语法检查通过。
- test-menu.mjs、test-loadout.mjs、test-journey.mjs 通过。
- test-menu-deployment.mjs 通过：24 种出发组合往返、固定副武器与近战、拒绝非法和章节拾取装备。
- test-session-flow.mjs 通过：真实携带状态先应用后保存检查点；非法选择、待保存结果、写入失败不会误进入战斗。
- test-ui-clean-browser.mjs：20 组通过，包括设置、持久化、未来版本单章存档保留、装备、工坊、焦点和独立页面。
- 编辑器诊断返回错误/警告 0 项；定向 git diff --check 通过。六个生产源文件 SHA-256 复核一致；现有 5173 服务返回的 menu-ui.js 与磁盘版本哈希一致。
- 已检查真实入口生成的首页、准备页、章节页及手机宽度准备页截图。章节模式按钮发现继承横向布局后，已补充 display:block 修正。

## 原生与布局验证

- test-menu-simplify-browser.mjs 最终复测 11 组全部通过（其中包含 9 个多尺寸页面检查）：四项首页、准备页取消无存档写入、关卡与档案路由、真实战备检查点、取消覆盖保留字节、跨章节新战役携带配置、海陆空返回与取消/确认流程，以及页面异常检查。
- MENU_RETURN_ONLY=1 的海陆空独立复测也通过，退出码 0；完整原生复测随后也通过。
- test-ui-clean-browser.mjs 最终复测 20/20；test-ui-clean-layout-browser.mjs 33/33。
- test-smoke-browser.mjs 最终复测 **15/15 通过**：九章 WebGL 启动、开始/暂停/重试、音频、旧战役迁移、存档导出/导入/恢复、统计与载具入口。

## 首次失败与修正记录

- 原生长链首次在再次导航首页时等待 load 超时；此前新战役、跨章节配置与保存断言均通过。之后将独立场景改为同一隔离 context 中的新页面，保留存储并释放旧页面资源，最终完整复测通过。不据此声称已定位所有真实硬件性能问题。
- 首轮 smoke 为 13/15：统计设置位于折叠说明中，测试未展开；载具入口测试仍从首页直接点击已移入准备页的关卡按钮。脚本现按真实用户路径打开折叠项、经新游戏进入关卡，不删除原数据断言、不对隐藏元素强制点击。
- 截图检查发现模式卡片继承了全局按钮的横向 flex 排列，已在卡片职责范围内明确 display:block；最终截图复查标题和描述分行正常。
- 一次仅用于生成哈希的 node -e 辅助命令引号被外层 shell 吞掉，改用 sha256sum 后成功；此前语法及规则检查均通过。此失败不属于游戏代码故障。

## 证据与复现

- .tools/menu-simplify-regression.log：20 组 UI、33 个布局场景及首次 smoke 记录。
- .tools/menu-simplify-native.log：原生长链首次超时记录。
- .tools/menu-return-native.log：原生海陆空返回专项。
- .tools/menu-simplify-native-final.log：最终完整原生检查。
- .tools/menu-simplify-smoke-final.log：最终 smoke 记录。
- .tools/menu-simplify-source-hashes.txt：六个生产源文件最终 SHA-256，已与编辑器读取的版本核对一致。
- .tools/qa-menu-simplify/：真实首页、准备、章节、窄屏和载具返回截图。

使用仓库现有 VEHICLE_PLAYWRIGHT_MODULE 配置，串行运行：

```bash
node test-menu-deployment.mjs
node test-session-flow.mjs
node test-menu.mjs
node test-ui-clean-browser.mjs
node test-ui-clean-layout-browser.mjs
node test-menu-simplify-browser.mjs
node test-smoke-browser.mjs
```

这些脚本使用隔离浏览器上下文和自己启动的临时服务，不读取、迁移或清空玩家原浏览器存档。截图不作为真实 GPU 性能结论；本轮不等于九章自然通关或所有先遣队任务验收。未提交、未推送、未打包；已有其他会话的模型、音频与未提交内容均保留。
