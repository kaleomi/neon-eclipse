# 飞机 W/S 反向设置

## 功能

- 主菜单「设置 → 操作」增加「飞机 W/S 反向」复选框。
- 联合试验场初始/暂停面板提供相同开关，不必离开试验场。
- 默认关闭：W 压低、S 抬头。开启后：W 抬头、S 压低。
- 仅改变飞机 W/S 俯仰；上下方向键、A/D 叠加方向舵、鼠标、步行及其他载具不变。
- 操作提示、入机提示和起飞提示随设置更新。
- 保存到独立 localStorage 键 neon-eclipse-flight-invert-ws；跨主菜单/试验场及刷新保留，不修改战役存档。
- 存储不可用时当前页面仍生效，并显示无法保存提示；损坏值退回默认。
- 暂停焦点循环包含新复选框，支持键盘操作。

## 文件

- [flight-settings.js](../flight-settings.js)：共享设置读写、控件和输入映射。
- [menu-ui.js](../menu-ui.js)、[vehicle.html](../vehicle.html)、[vehicle-app.js](../vehicle-app.js)：入口及控制集成。
- [test-flight-settings.mjs](../test-flight-settings.mjs)：由现有 test-handling.mjs 导入，纳入 npm test。
- [test-flight-settings-browser.mjs](../test-flight-settings-browser.mjs)：可选 Playwright 浏览器验证，使用已有 VEHICLE_TEST_URL / VEHICLE_PLAYWRIGHT_MODULE 环境变量。

## 验证范围

- 单元验证默认/正反向俯仰、偏好读写、损坏/拒绝存储及其他键不受影响。
- 软件 WebGL 实际勾选、刷新保持、反向 W 起飞、恢复默认 S 起飞、动态提示与存档哨兵均通过。
- 主菜单入口使用相同设置控件；本轮实际起飞浏览器测试在联合试验场运行，不代表 Windows GPU 性能测试。

不新增 EXE、任务或追逐 AI。
