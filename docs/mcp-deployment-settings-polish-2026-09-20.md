# 战备预览与设置 / 工坊视觉精修

日期：2026-09-20。项目：game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6。以下文件路径相对项目根目录。

## 本批范围

- 在当前四项主菜单基础上继续，不改变首页导航。
- 战备页增加六种主武器的类型示意图、定位与用途说明。示意图是轻量内嵌 SVG，不是真实 3D 模型截图，也不请求外部资源。
- 弹匣容量、最大射程、装填时间直接读取 weapons/runtime.js 的基础 profile。霰弹枪逐发装填显示“单发装填”，不冒充整匣换弹时间。不展示未经计算的强度评分或 DPS。
- 投掷物随选择显示用途说明；固定副武器、近战与出发草稿状态独立显示。草稿提示通过 aria-live 礼貌播报，明确开始游戏后应用。
- 桌面采用左侧预览、右侧选择与随队配置。截图复查后把固定装备和草稿收进右栏，降低页面高度；短窗口和窄屏允许内容区域滚动，开始按钮可滚动到达。
- 统一设置与工坊的选择控件高度、字号、说明文字、分组间距和键盘焦点；窄屏工坊按单列排列。
- 不修改武器数值、章节解锁、掉落、战斗逻辑、存档结构或玩家原浏览器存储。不修改并行音频和模型成果。

## 文件边界

- 新增 deployment-preview.js：显示元数据、类型 SVG 与预览绑定。
- 修改 menu-deployment.js：出发面板展示，保留原控件 ID、白名单校验和 value 接口。
- 修改 ui-clean.css：只针对战备、设置、工坊的表现样式，不重置战斗 HUD。
- 新增 test-deployment-polish-browser.mjs：使用真实 UI 绑定器的隔离夹具，无 WebGL 战斗循环。

## 验证记录

- JavaScript 语法检查通过；test-menu-deployment.mjs 和 test-session-flow.mjs 通过。
- 新增浏览器测试：24 个主武器/投掷物组合，基础参数一致、六种示意图、逐发装填说明、投掷物描述、选择期间不写存储；1440×960、1024×640、390×844 布局；键盘 Tab/Shift+Tab 焦点可见；取消回首页不改变存储；窄屏工坊无横向溢出。
- 最终版本 test-ui-clean-browser.mjs：20 组通过，包含真实设置模型、刷新持久化、重绑、未来版本存档保护、装备与工坊草稿及重开确认。
- 最终版本 test-ui-clean-layout-browser.mjs：33 个布局场景通过。
- 原生入口 test-menu-simplify-browser.mjs：11 组通过（含 9 个多尺寸检查），实际战备进入新战役检查点、旧记录覆盖取消、跨章节携带配置、海陆空返回及取消/确认均通过，页面异常为零。最终串行命令 VALIDATION_EXIT=0。
- 编辑器错误/警告 0 项。index.html、menu-deployment.js、deployment-preview.js、ui-clean.css 均 HTTP 200，服务内容 SHA-256 与磁盘一致。

## 失败与修正

1. 两次新 PTY 初始化超时，改用已存在的空闲终端执行。此失败是命令环境问题，不视作测试通过或代码失败。
2. 第一版焦点测试在鼠标点击后直接调用 focus，浏览器不进入键盘 focus-visible 状态，断言失败。测试改用原生 Tab / Shift+Tab 返回该控件，同时断言真实活动元素与 focus-visible 状态；未删除焦点断言，也未更改生产样式掩盖问题。
3. 首次截图显示战备内容过高，随后收紧左右栏布局并重新跑全部相关 UI 和布局测试。
4. 一次日志等待辅助命令从工作区根目录启动而非项目目录，找不到日志；改为明确项目路径。该辅助失败不影响测试进程。

## 证据与复现

- .tools/deployment-polish-validation.log：首次规则通过和焦点测试失败。
- .tools/deployment-polish-validation-final.log：首轮焦点修正后专项、20 组 UI 和 33 个布局通过。
- .tools/deployment-polish-final.log：布局收紧后的最终串行回归。
- .tools/qa-deployment-polish/：战备、设置和工坊截图。

配置现有 VEHICLE_PLAYWRIGHT_MODULE 后串行执行：

```bash
node test-menu-deployment.mjs
node test-session-flow.mjs
node test-deployment-polish-browser.mjs
node test-ui-clean-browser.mjs
node test-ui-clean-layout-browser.mjs
node test-menu-simplify-browser.mjs
```

夹具检查不代表 3D 画质或性能验收，原生菜单回归不代表九章自然通关。未提交、推送或打包。

## 下一批

优先成就与行动档案：统一卡片、已获得/未获得状态、进度和空状态，再处理 HUD、暂停、结算的信息层级。真实武器模型缩略图可另做离线固定镜头渲染；当前类型示意图不冒充已有 3D 美术。
