# NEON ECLIPSE 开发进度复核（2026-09-20）

## 结论与基线

核查时 HEAD 为 b9ed5f7，工作树含并行音频、app.js 等未提交改动与未跟踪素材；不是干净发行基线。本次仅新增本报告，不修改游戏源码、不提交、不打包、不操作玩家存档。

核心内容已成型，当前重点是整合、自然流程验收和发行收尾，不提供无工作量依据的整体百分比。

## 当前进度

- 主战役：maps/registry.js 注册九章与九 Boss。
- 先遣队：expedition-model.js 和 frontier-missions.js 已接入八关，包含风电场夺控、离岸平台突击、雷达站总攻；八关同战役完成授予称号。旧报告的 5/8 已过时。
- 第五关：最新交付记录已改为直升机撤离，并有安全节点。
- 直升机：并入载具场，已有武装、碰撞、吊挂；吊挂动力学反馈和任务化仍待完善。
- 重玩：p4-catalog.js 定义生存、突袭、修饰符、竞速幽灵、靶场、载具计时、Boss 冲刺、无尽塔八模式。
- 平台：载具手柄、触屏、界面英文化已有专项记录，不等于主游戏触屏、全量翻译或真实设备验收完成。
- 最近音频：docs/mcp-recorded-audio-2026-09-20.md 记录 21 个录音素材接入，当前仍有未提交文件；普通枪声、飞机发动机等未全面替换，人工听感待验收。
- 工程：入口拆分第一阶段已提交，CI 已有本地干净克隆演练，但不等于 GitHub Actions/Linux 实跑。

## 验证证据

本轮串行运行 test-frontier-missions.mjs、test-helicopter-field.mjs、test-aim-mode.mjs、test-audio.mjs、test-audio-lifecycle.mjs，五个入口全部通过，命令退出 0。语言服务错误/警告返回 0。它们不是浏览器、真人通关或性能验收。

历史最新拆分记录：check 527/527、rules 124/124、integration 43/43；浏览器 smoke 13/15，两项设置选择器失败在拆分前基线亦复现。本轮未重跑该 smoke，不能宣称当前已修复或全部通过。最新录音专项文档记录录音检查 15 项和载具音频 5/5；是既有记录而非本轮重跑。

## 下一步建议

1. 确认并行改动边界，形成稳定验收基线；同步 docs/mcp-project-status-roadmap.md 中仍保留旧四关/独立直升机口径的摘要表。
2. 复测和解决最新设置页 smoke 两项失败，并在整合后的当前工作树完成常规及关键浏览器回归。
3. 九章、八关先遣队、八种模式分批自然试玩，覆盖死亡重试、暂停、存档恢复、成绩资格与输入设备。
4. 补齐已确定的翻译与平台范围，检查混音、机甲寻路、平台碰撞、吊挂任务化和称号进入 P4 档案等专项尾项。
5. 目标硬件性能、长时间稳定性、实际 CI 与安装验收独立记录；新打包/签名/发布须另行授权。

## 依据

- docs/mcp-project-status-roadmap.md
- docs/mcp-app-split.md
- docs/mcp-recorded-audio-2026-09-20.md
- docs/mcp-controls-aim-mode-2026-09-20.md
- maps/registry.js
- expedition-model.js
- frontier-missions.js
- p4-catalog.js
