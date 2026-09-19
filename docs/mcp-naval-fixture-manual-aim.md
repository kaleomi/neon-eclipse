# 第二关浏览器基线修复：naval / sea-combat 夹具跟进手动舰炮

日期：2026-09-19。范围：只修测试夹具与一处只读 dataset，不改海战规则。

## 现象

`test-naval-browser.mjs`、`test-sea-combat-browser.mjs` 自 `4ddd5ea`（手动舰炮：F/左键沿世界瞄准方向开火，不再自动锁定敌艇）起持续失败：快艇按住 F 打了 20 余发全部落空（`seaHits=0`），在检查点 1 附近被拦截艇击沉。b10 期间用独立 worktree 在 `939bd1c` 复现，确认不是第 6–8 关引入。

## 修复

- `vehicle-app.js`：HUD dataset 追加只读 `navalAimYaw` / `navalAimX` / `navalAimZ`（来自 `navalAimPoint(navalAim,yacht)`），不改变任何输入或规则。
- 两个夹具新增 `aimAt()`：读取 `navalFleet` / 当前 `navalTarget`，按“无指针锁定时右键拖动瞄准”的真实路径（`mouse.down({button:'right'})` + 按 0.003 rad/px 移动）把世界瞄准转向目标，再按 F。不做任何注入或自动锁定；Q 切换目标的冷却隔离断言保留。
- `chase-rules.js`（b10 已提交）：钻井平台四角加入海上寻路节点，使夹具航线绕开第 7 关平台。

## 结果

两项单独串行重跑均 EXIT=0：naval 两艇 F/Q 战斗与撤离、sea-combat 真实击沉与敌方火力失败路径。真人手感不在本次范围。
