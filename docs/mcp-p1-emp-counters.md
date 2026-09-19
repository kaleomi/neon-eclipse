# P1 追加交付：EMP 反制补全（护盾破盾 + 猎犬机械瘫痪）（2026-09-19）

## 范围
- 原方案 5.3 反制表缺口：护盾兵“盾可被 LANCE/EMP 破”。LANCE 穿甲穿盾已存在（重武器批）；本批补 EMP 一侧。
- 猎犬机反制表为“侧跳/霰弹/VOLT”；猎犬是四足机械体，本批把它并入 EMP 机械允许表（与 EMP 节点“机械瘫痪”一致），补齐机械生态反制。

## 行为
- EMP 对护盾兵：只破盾，不冻结、不取消已瞄准弹道、不扣血。`shieldDownRemaining=6s` 期间正面 0 伤害挡弹失效（可正常命中），背部核心 ×2 不变；6s 后护盾恢复，正面重新绝对挡弹。护盾板/横梁 6s 内隐藏，恢复后复原。
- EMP 对猎犬：与哨兵/无人机同一机械失能路径（3s 冻结、不能排队攻击、恢复后可继续行动）。猎犬不新增伤害模型，只改反制可达性。
- EMP 仍：0 伤害、2 枚/章、1.2s 引信、6m 球域、纯刀不受影响、Boss/工程兵免疫、EMP 节点仍只机械 3s（节点文案不变）。
- 提示更新：EMP 爆发 toast 改为“N 个目标受冲击 · 机械失能3s / 护盾破6s · Boss 与工程兵免疫”；护盾兵/猎犬提示写明 EMP 反制。

## 文件
- `emp-rules.js`（`EMP.shieldDuration:6`；`EMP_TYPES` 增加 `hound`）、`emp-world.js`（applyEmp 护盾分支；empVisual 护盾板）、`emp-system.js`（护盾计时衰减/清理）、`enemy-rules.js`（破盾期正面不再挡弹；护盾/猎犬 hint）、`enemy-model.js`（`parts.shield=[plate,edge]`，不改变直接子级射线命中）、`app.js`（toast 文案）。
- 测试：`test-emp-world.mjs`（护盾破盾 6s/不冻结/恢复；猎犬 EMP 冻结/无法排队/3s 恢复后移动）、`test-emp.mjs`（允许表更新并补齐 commander/shield/stalker/sniper 不可瘫痪断言）、`test-tactical-browser.mjs`（真实 G 投 EMP 打护盾兵：无伤害、6s 隐藏、不冻结、恢复）。

## 结果
- 最终 `434/434 check、102/102 rules、37/37 integration`；`test-emp-world.mjs` 全绿；tactical 浏览器（含护盾原生用例）全绿、页面错误 0；typed-ammo/ordnance/field-systems/weapon-mods/execution 浏览器在本批前后连续通过。
- app sha256 `8d3027b0fa2a71e36abe558d98904aca8e1f027576e6fb4522edaf08d8323c88`；诊断 0。
- 环境抖动记录：tactical 浏览器两次出现启动 `#deploy` 60s 超时（headless 启动 flake），原样重跑即通过，非代码回归；一次链上缺少 `VEHICLE_PLAYWRIGHT_MODULE` 导致 playwright 导入失败，补环境变量后通过。

## 边界
- EMP 破盾不引入永久破甲；护盾 6s 后恢复，难度曲线未放宽。
- 猎犬并入机械允许表后，EMP 节点（反应堆）也能瘫痪 6m 内猎犬——与节点“机械瘫痪3s”语义一致，不新增伤害。
- 剩余 P1：九章主题环境交互 ≥2/章、Boss 统一框架迁移、重武器改装、遥测平衡验收。本批不等于 P1 完成。
