# P1｜工程兵可打断维修

## 机制与接线

- 在既有工程兵导演中增加维修通道，不增加第二只炮塔、不改原单次部署配额。已有炮塔受到损伤后，8m内、层差≤1.2m、无遮挡的工程兵可启动1.6秒琥珀维修链路。
- 每次最多恢复24耐久，不超过原maxHp；每名工程兵最多成功2次，成功/打断后6秒冷却。不复活已毁炮塔，不治疗Boss、玩家或其他敌种，同一炮塔不同时接受多条维修。
- 工程兵受伤、被击倒、目标被击毁/移除、距离/高度失效、出现掩体、炮塔被EMP失能均取消当前维修，不先偷偷结算治疗。暂停冻结通道；死亡/重试/关卡清理移除链路。
- 维修时工程兵停步、抬臂且不能同时射击或部署；仅该支援动作新增，原弹丸预警/伤害不缩短。指挥官不加速维修通道，也不把正在维修的工程兵计入增益人数。
- 目标检查器、顶部提示与维修余量已接入。新增携带/拾取提示移出雷达区，并在重要toast出现时让位，避免新提示覆盖原雷达或维修预警；不改视角控制。
- 维修计数、链路和敌人HP仍是当前遭遇临时状态，不向旧检查点添加敌人序列化字段；原检查点/严格挑战资格保持。

## 验证与失败记录

- 规则/真实世界：完整1.6秒、零dt暂停、24HP/上限、6秒冷却/两次配额、真墙遮挡、死亡/EMP/层高/移除中断、40次链路创建清理通过。
- 浏览器使用原访问权限上传与原工程兵部署逻辑生成真实炮塔，再设定受损夹具；原生步枪打断、真实G投掷EMP、真实RAIL击杀维修源/目标、暂停、检查点、结算清理通过。手动设置受损HP及摆位不冒充真人自然战斗。
- 首轮浏览器遮挡断言失败：夹具长盒沿链路摆放，使两端都处于单面材质盒内部。修正为垂直链路的薄墙后真实遮挡断言通过；生产LOS规则未放宽。
- 联合命令 cmd_856bf9c0b04ce466ef9f9b865fbb75282a5fdc217d3823ab 退出0，179294ms：394/394 check、95/95 rules、35/35 integration，以及维修、原工程兵、指挥官、炮塔、EMP、field-systems、九章loadout、weapon-drops八个浏览器专项通过。
- 截图检查发现新携带提示与顶部维修toast交叠，增加重要通知让位；最后 cmd_d4ac8b338458d874c8e8f132f4484d06cd10178765d35a85 退出0，85871ms，语法及维修/loadout/weapon-drops再次通过。最终截图 .tools/p1-engineer-repair.png 已查看，维修提示可读且雷达无遮盖。
- 最终诊断0 errors / warnings；未Git提交/打包，不改独立直升机或Boss模块。以上不等于真人平衡/目标硬件性能或P1整体完成。

## 后续方向

维修本批接入现有工程兵遭遇，不冒充机械生态已跨九章完整推广。继续原方案三种重武器、其他投掷物、正式改装/共享弹药及剩余敌人/环境/框架内容；用户已授权持续推进，不重复询问是否继续。

## 最终源码指纹

- `app.js`：`sha256:be649ebca8ddca1bdd88d29223267b4bfca8c6992060a5aa4352f874d215c436`
- `engineer-repair.js`：`sha256:7db0abba89c9ab9d29c307e3996b39a37890b2b70113eddccd969c939d2e60c8`
- `engineer-repair-rules.js`：`sha256:bcd7c5bde98a6d39c01fa0580349b18e79a1f963f319af240c4f6d541af634f8`
- `engineer-director.js`：`sha256:08b27ec934c29eb30eb99b7ffd43bd800e24c870f44617eceba9ea27443be5b8`
- `enemy-ai.js`：`sha256:262f05c83ef9409325dedca79b9b4a13e2ad331b1d1c0afb53aa766c9f61f18e`
- `enemy-ui.js`：`sha256:e8b16b6344c597a464030a9e31b788b0364a32bf33bceaf717bc4f4a8487dd75`
- `commander-rules.js`：`sha256:701cc014bd7fd9ddda3189bbe477e9dac61872c0cc06b11e084de34023ab5f53`
- `enemy-rules.js`：`sha256:58a5752a1789e1cbb32d07f81838beb530c632e42cd227457bfec8855ab0ad3b`
- `loadout-world.js`：`sha256:014a4f7e50fdb7ca70fab4d2f78cda367d05f278d82131c3278e8f673063739d`
- `weapon-drops.js`：`sha256:e0f74b6901723dfda3e3b2aa8541aa0a1019bc032ee4a848c62af0bcff1c35d8`
- `test-engineer-repair.mjs`：`sha256:629b2f0a6ab0f2934c177bdcb70399c6dcdd1487b66b2d7336467295ff9ba2ff`
- `test-engineer-repair-browser.mjs`：`sha256:00fb69bd85347ff0d451f4ed3da6635e23de93805e13775d61e16ddd580014b4`
