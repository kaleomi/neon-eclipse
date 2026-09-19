# P1 追加交付：共享类型弹药与类型补给（2026-09-19）

## 范围与决策
- 用户选定 A 之后的下一批：把“八把枪各存各的无限式储备”改为四类共享类型弹药：**轻弹 / 重弹 / 能量 / 榴弹**。已装备弹匣仍是独立实体，类型池只管理后备。
- 单位成本：VANGUARD 重弹1、BREACHER 轻弹6、GHOST 轻弹1、TEMPEST 轻弹1、HALO 重弹2、RAILSPIKE 能量3、VOLT 能量1、CINDER 榴弹1、LANCE 能量6；刀/重锤/PULSE 不消耗类型池。
- 上限：轻弹600、重弹450、能量192、榴弹14；单箱补给 90/90/36/3；轻量背包（T）只把非榴弹箱容量缩到 65%，不销毁已持有超档存量，精确 0 保留。
- B 循环选择自动/轻/重/能量/榴弹。自动跟随已选枪（持刀跟随主武器；副武器位为 CINDER/LANCE 且副武器选中时回退主武器类型）。弹药箱只补所选类型，不再“一箱补所有枪”；池满或未来版本不支持时不消耗箱子；榴弹类型在未拥有 CINDER 前拒绝。
- 旧存档一次性换算：常规储备按成本加权（558/390/90/0 初始），已拥有 CINDER 追加榴弹、LANCE 追加能量×6，超限取上限。新检查点以权威 `typedAmmo:{version:1,pools:{...}}` 落盘，**不再**把各枪镜像相加；未来 `version>1` 原样保留、只读、0 可用、已装弹匣仍可用。
- 领取即一次性：CINDER +7 榴弹、LANCE +60 能量（另加弹匣内 1/2），重复保存不翻倍。
- 重装（CINDER/LANCE）走 `reserveSource` 可选外部供给；普通枪 `advanceReload` 完成后按 `插入发数×成本` 扣池并同步镜像，中途中断保留已完成弹丸。重武器快照镜像仍按 7/10 截断以兼容旧校验器，HUD 显示真实可负担数。
- P4 独立模式禁用共享池（保持其原携行/补给行为）；EMP/脉冲/诱饵/烟雾 2 枚独立，不按弹药补给；纯刀与 EMP 工具规则不变。
- 新增青色类型弹药面板（右 34 / 底 246）：四类总量、B 当前类型、当前武器单发成本；非游玩或 P4 隐藏。

## 文件
- 新增：`typed-ammo.js`（权威池/换算/校验/镜像）、`typed-ammo-ui.js`、`test-typed-ammo.mjs`、`test-typed-ammo-browser.mjs`。
- 修改：`app.js`（reset 播种/镜像、装填扣池、B 补给选择、HUD 替换、面板）、`campaign.js`（存档校验）、`ordnance-rules.js`（`reserveSource` 可选外部供给）、`ordnance-world.js`（HUD 真实可负担）。
- 夹具适配（不改玩法断言）：`test-ordnance-browser.mjs`（零检查点改为权威 `typedAmmo.pools.grenade=0`；LANCE 两次装填断言能量池 90+60-12=138、镜像 10）、`test-field-systems-browser.mjs`（霰弹单发扣轻弹 6 改断言 `pools.light`）、`test-weapon-mods-browser.mjs`（`zero()` 改为真实抽干权威池）。

## 结果
- 最终命令 `cmd_dae3ae76e4d15ecdf66d3f7e2a4778bcfcdd3f2a5def3aa1` 退出 0 / 1240.1s：`434/434 check、102/102 rules、37/37 integration`；随后 typed-ammo / ordnance（含九章 BREAKER-Boss 打断）/ field-systems / weapon-mods（九章）/ execution（九章）/ tactical（九章）浏览器全部通过，页面错误 0。
- app sha256 `ade796c9ffe49164564bf1ef80d35dc5947ca0ffdda15c295f3327d5ca6b2c50`（本批基线）；诊断 0。
- 过程中隧道两次 502/530：第一次长命令丢失 command_id，事后从 `.tools/p1-ammo-first.log` 确认 npm 与 loadout 已通过、ordnance 夹具失败；第二次上传新浏览器失败后重试成功。未重复启动未知任务。

## 边界（不是完成）
- 重武器（CINDER/LANCE/BREAKER）改装槽仍未接入工坊（原方案遗留，未本批宣称）。
- `bossLoadout()` 仍输出旧序列化弹药数组，Boss 遥测是否并入 `typedAmmo` 待审计。
- 共享弹药不是“弹药无限”：箱数、上限、成本全部有限；未做真人/性能验收。
- 下一批：EMP 对护盾兵的破盾反制（原方案 5.3 反制表缺口）。
