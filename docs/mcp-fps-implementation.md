# NEON ECLIPSE FPS

## 实现
保留原有战术 HUD，新增 app.js（三维场景、移动碰撞、四种武器、五波敌人及 Warden、补给、胜负和暂停循环）、game.css（交互界面）、server.cjs（静态服务）。index.html 引入新增样式，package.json 使用 ES module 并增加启动及语法检查命令。

## 运行与操作
项目目录执行 npm run dev，打开 http://localhost:5173。缺少依赖时先 npm install。需要 WebGL 和桌面键鼠，不使用 file://。WASD 移动，Shift 冲刺，鼠标瞄准，左键射击，右键精确瞄准，1–4 切换，R 换弹，ESC 暂停。鼠标锁定受限时可按住左键拖动或使用左右方向键转向。

## 验证
远端 npm test 退出码 0（仅语法检查）；编辑器诊断 0 条错误或警告。独立 Linux 副本 Chromium 冒烟测试通过画布加载、射击扣弹、武器切换、换弹及暂停，pageerror 为 0。远端服务已启动，首页和 Three.js 模块 HTTP 200。

尚未完成 Windows 人工视觉验收、五波通关及长时间稳定性测试。敌人使用简单追踪避障，武器共用基础视模；后续可完善模型、寻路和难度平衡。
