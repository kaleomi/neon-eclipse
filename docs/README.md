# NEON ECLIPSE 文档入口

- **当前状态（唯一摘要入口）**：`docs/mcp-project-status-roadmap.md`
- **短期稳定性计划与人工验收**：`docs/mcp-stability-plan.md`
- **改动归属、提交与回退边界**：`docs/mcp-change-ownership-2026-09-18.md`
- **先遣队备份/检查点交付**：`docs/mcp-p3-expedition-backup-recovery.md`
- **先遣队第 5 关 · 灯塔岛登陆**：`docs/mcp-p3-expedition-mission5.md`
- **载具与章节音频补记**：`docs/mcp-audio-integration-2026-09-18.md`
- **九章Boss总交付与后续方案**：`docs/mcp-boss-completion.md`
- **Boss 连贯验收第一批：港口路线 / 九章重试**：`docs/mcp-boss-polish-validation.md`
- **Boss 连贯验收第二批：列车上下层 / 实际自动检查点**：`docs/mcp-train-route-validation.md`
- **Boss 连贯验收第三批：运输站 / 中枢塔 / 目标引导**：`docs/mcp-link-route-validation.md`
- **Boss 与环境首批（第 2 章）**：`docs/mcp-boss-switchyard.md`
- **Boss 第二批（第 4 章）**：`docs/mcp-boss-elevator.md`
- **P1 弹反试点与验证边界**：`docs/mcp-p1-parry.md`
- **P1 可破坏物：反应堆薄板试点**：`docs/mcp-p1-destructibles.md`
- **P1 爆炸桶与后续开发方案**：`docs/mcp-p1-barrels.md`
- **P1 四阶段与 U 携行合并：节点 / 运输站道具 / 处决 / 改装重炮**：`docs/mcp-p1-four-stage.md`
- **P1 重武器改装（CINDER / LANCE 三槽）**：`docs/mcp-p1-heavy-mods.md`
- **P1 敌人生态与小队协同（冲锋机 / 重炮机甲 / 行为树）**：`docs/mcp-p1-enemy-ecology.md`
- **P1 Boss 适配器与全局攻击预算**：`docs/mcp-p1-boss-budget.md`
- **P1 九章环境交互（排气阀 / 照明开关）**：`docs/mcp-p1-environment.md`
- **P2 表现层：天气 / 击杀表现 / 章节过场**：`docs/mcp-p2-presentation.md`
- **长期目标（非完成清单）**：`docs/mcp-full-development-plan.md`

- **P4 完整交付：八种可玩模式 / 个人档案 / 称号 / 幽灵回放 / 每日周常**：`docs/mcp-p4-full-delivery.md`（当前 P4 结论入口）
- **P4 独立只读行动档案：筛选 / 统计 / JSON导出**：`docs/mcp-p4-operations-archive.md`（早期只读批次，历史快照）

## 历史文档规则

其余 `mcp-*.md` 专项记录默认是各批次当时的快照；“未实现”“下一步”和测试计数不能自动当作今天的结论。冲突时先核对当前源码、明确关联版本的验证证据，再更新当前状态入口。不删除旧失败记录，不把后来的功能或复测伪写成早先已经完成。

阶段交付不等于发行验收。源码已接线、规则通过、浏览器通过、人工通过、性能通过分别记录。Git 只保存变更历史，不作为功能完成证明；提交前保留其他会话的工作边界。
