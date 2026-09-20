# 主菜单与章节选择 · 首批美化交付

日期：2026-09-20。项目：NEON ECLIPSE。

## 范围与基线

在用户现有未提交工作树上进行增量修改，未重置、提交、推送或打包。生产修改限于 `menu-ui.js`、`ui-clean.css`；未改战斗规则、存档格式、装备配置、音频或 3D 模型。基线 HEAD 为 `137ea9d`，不以 HEAD 代表整个工作树。

基线文件保存在 `.tools/qa-menu-polish/baseline/`，其 ui-clean.css 和 menu-ui.js SHA-256 分别与接手时的 `0910bf034641aa133facb37bf4a0e8e1e2bfc1365f309feb09391ecadd4e6bda`、`4d7c61c5ba201f1dc97d971bbf4b76e47d52e63554f6053e1677658d3398a188` 一致。修改前截图通过隔离浏览器路由回放这两个基线文件，不回滚用户工作区。

## 已实施

- 首页统一为行动菜单与大幅章节主视觉，消除右上无目的留白，主视觉与文字区重新对齐。
- 保留深色科幻工业风与薄荷青强调，控制高亮范围；调整标题、说明、图标、按钮节奏，明确主要操作。
- 无可恢复进度时，新游戏排首位；有可恢复进度时，继续游戏排首位。移动原按钮节点，保留监听器，DOM 顺序与键盘顺序一致。
- 首页图片绑定真实当前地图，不再所有首页图片默认指向反应堆。
- 九章卡片增加图像面积、阅读空间与当前关卡文字标记；不伪造已完成或锁定状态，不改变章节入口权限。
- 首页和章节链接提供可见键盘焦点；窄屏改为单列内容、内部滚动，保留主要操作；减少动态效果模式禁用卡片过渡。
- 合并旧主页重复样式，清理无效的主页场景背景定义与后置尺寸覆盖；保留章节、简报和结算的原图片资源。

## 验证与修复过程

新增 `test-menu-polish-browser.mjs` 和 `test-menu-polish-native-browser.mjs`。没有修改已有 UI 回归测试来迎合新行为。

首轮完整 UI 回归发现，通用 `data-primary` 属性与装备面板选择器冲突；已改成专属 `data-home-primary` 后复测。视觉复核发现主操作说明受旧高优先级选择器影响偏暗，已修复；收紧按钮垂直尺寸，使常规桌面首页的其他行动入口也完整可见。

### 最终结果

| 项目 | 结果 |
| --- | --- |
| 3 个 JS 文件语法检查 | 通过 |
| `test-menu.mjs` | 通过 |
| 新菜单浏览器检查 | 六种视口：1920×1080、1440×900、1280×720、1024×640、768×1024、390×844；菜单/章节无横向溢出，DOM/Tab 顺序、焦点、章节入口、继续/新游戏、减少动态效果、存档字节保护通过 |
| `test-ui-clean-browser.mjs` | 20 组通过 |
| `test-ui-clean-layout-browser.mjs` | 33 场景通过 |
| 新增原生 WebGL 入口检查 | 实际启动、首页、九章入口、真实关卡部署、暂停→首页→继续通过；无页面异常 |
| 编辑器诊断 | 当前项目错误/警告 0 |
| `git diff --check`（两生产文件） | 无输出 |

最终生产文件 SHA-256：

- `ui-clean.css`: `9c09b8086178fc5e139523621d6851af547d9b2f66616f00baf83c552550a68b`
- `menu-ui.js`: `9afd95600a151d8ae3da66f72670b095d7f8ce9138197c8b846307e82414491d`


## 证据与复跑

- 最终串行测试日志：`.tools/qa-menu-polish/final.log`
- 修改前截图：`.tools/qa-menu-polish/before/`
- 六种视口截图及测量：`.tools/qa-menu-polish/`、`.tools/qa-menu-polish/results.json`
- HUD 与暂停/结算回归截图：`.tools/qa-menu-polish/layout/`
- 原 UI 回归的最新输出：`.tools/qa-clean-ui/`
- 原生入口截图：`.tools/qa-menu-polish/native-home.png`、`.tools/qa-menu-polish/native-chapters.png`

在已有 Playwright 环境下执行：

```bash
node test-menu.mjs
node test-menu-polish-browser.mjs
node test-ui-clean-browser.mjs
UI_LAYOUT_OUTPUT=.tools/qa-menu-polish/layout node test-ui-clean-layout-browser.mjs
node test-menu-polish-native-browser.mjs
```

仓库没有本地 Playwright 依赖时，沿用现有 `VEHICLE_PLAYWRIGHT_MODULE` 配置。两项新增浏览器测试自建临时服务与隔离浏览器上下文，结束时关闭自己的资源；不使用用户真实浏览器档案或存档。

## 验证边界

UI 夹具复用真实菜单与控件，但不运行战斗循环。原生检查使用软件 WebGL，截图只短暂暂停帧调度，不修改玩法状态；不是 GPU 性能、自然通关、九章战斗或真实移动设备验收。本轮没有重跑全量旧 smoke，不能将其历史两项设置页失败宣称为已解决。

只更新网页源码，没有制作或覆盖 EXE。确认首批视觉后，再单独推进设置与装备工坊，不在本批扩展范围。
