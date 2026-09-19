# P1｜CINDER / LANCE、BREAKER 重锤与九章 Boss 蓄力反制

状态：本批机制与下述自动化范围已验收。P1整体仍未完成。2026-09-19。

## 已接入的机制

| 武器 | 操作与弹药 | 战斗规则 |
| --- | --- | --- |
| CINDER | H 发射；1发弹匣＋7发备用，空仓H换弹1.1s | 1.2s完整引信、重力/薄墙扫掠弹跳、4m距离衰减爆炸，最高180基础伤害；有视线遮挡和最高35自伤 |
| LANCE | 完全开镜＋H；2发弹匣＋10发备用，空仓H换弹2.2s（换弹不要求开镜） | 70m、240基础伤害，至多两名普通敌人，第二目标70%；穿普通装甲、护盾兵正面能量盾及炮塔装甲，但不穿实墙、不绕过Boss既有保护机制 |
| BREAKER 重锤 | 占近战槽，数字4切出，按住左键或H挥击0.9s；不消耗枪弹；松开、暂停、换枪或受伤可取消 | 3.5m前方±35°范围、200基础伤害；地面普通敌人最多1.5m受碰撞限制的击退，固定炮塔不移动，高层不强行推离平台；九章Boss预警攻击每结构阶段仅打断一次 |

- 三者是新武器模块，不拿旧PULSE试点替代。不改变八种旧武器的弹药数组/解锁数据。
- 九章第2/3/4任务阶段入口分别放CINDER/LANCE/BREAKER弹药箱；阶段到达后可在同层2.4m、无遮挡处按F领取。每箱仅一次；CINDER/LANCE替换唯一主武器，BREAKER替换近战槽，保留主武器及GHOST/EMP。U可换回刀或已领取的重锤。
- U终端分别列出主武器、近战选择，未领取时不可装备；领取后可换回，换装不补弹。普通补给不补CINDER/LANCE。
- `ordnance`独立存档扩展保留已领取列表、弹匣、备用弹药及精确0值。旧检查点无该字段时不凭空持有重武器；未知新版本只读保留。死后/重试不留下弹体、蓄力或换弹临时对象。
- CINDER/LANCE发射会记入开火次数并失去本轮纯刀资格。重锤不是刀：实际挥击也使纯刀失败，但不伪造枪械射击，不影响无伤/生还等其他挑战，不撤销历史成就。单纯换装、取消蓄力或未开镜拒绝发射不伪造射击。

## Boss 打断范围

- Warden：共享弹丸队列中尚未释放的蓄力，按bossState.phase限一次；已飞出的弹丸不抹除。
- SWITCHYARD：只取消爆破预警，不取消解谜维护列车。
- OVERSEER：取消电弧预警，保留1920HP、节点、暴露窗口和随机高压位置。
- ELEVATOR：只取消扫掠预警，不改升降机/过载板/动力锁。
- SKYHOOK、LEVIATHAN：只取消当前攻击预警，不改机关操作、过渡或守卫。
- TETHER、ABYSS：取消尚未释放的脉冲/放电，不改重力带、水位或召唤。
- GLACIER：取消炮击预警，不改移动、压冰、陷冰及核心机制。
- 各世界经共同`createBossChargeInterrupt`适配器接线；本轮并未声称所有旧Boss生命周期或全系统攻击预算都已统一。

## 验证与失败记录

- `test-ordnance.mjs`：专用有限弹药、两发弹匣、单主武器约束、0值/旧/未来存档、真实Three薄墙弹跳、完整引信、暂停、Warden阶段预算。
- `test-boss-charge-interrupt.mjs`：八个真实独立Boss规则模块，预警/已释放边界、每tier/动力单元一次、复位、不改变血量/暴露窗口/机关列车/升降流程。
- 新浏览器专项：原生F/H/右键，九章原入口领取；CINDER爆炸/反弹/自伤/伤敌；LANCE两目标穿甲/实墙阻挡/两发及有限换弹；BREAKER完整0.9s、松开取消、伤害击退、死亡清理；九Boss实际世界适配器由真实H发射命中进行三次验证（首个预警打断、同阶段第二次不打断、下一阶段重新允许）。Boss阶段/预警和站位由测试夹具安排，使用手动重武器时钟，不冒充真人自然打完九Boss。
- 原案复核发现最初把BREAKER接成远程冲击炮，与原文近战重锤不符；已改为近战槽、3.5m范围挥击、无枪弹消耗，补原生左键、范围/超距、终端刀锤切换及严格纯刀非刀攻击资格测试。中间版本的primary11及第三弹药字段可读迁移/保留，但当前重锤不使用这些弹药。
- 初轮CINDER自伤断言夹具误以为反弹后仍距玩家4m内；改为在引爆前明确将玩家置于实际弹体附近验证自伤，没有更改伤害/半径。
- 初轮Warden Boss夹具以原始未缩放模型在1.7m高度瞄准，射线经过躯干与头的间隙；改为1.2m瞄准躯干，不改生产碰撞或伤害规则。
- 扩大回归发现三个旧Boss浏览器伤害循环仍假定八种武器随时可持有。仅测试夹具改为经生产loadout.equip准备当前单主武器，再走真实数字键/鼠标射击；没有恢复无限携带或放宽实际终端权限。
- 首轮重武器联合 cmd_29028204b102cd6ab95cc81efd25f71e0d32a94a1cd4afdd 退出0：399 check / 95 rules / 36 integration＋七个浏览器专项。此时尚未加入全部独立Boss适配器。
- 修正近战形态后的联合命令 `cmd_f6d328e9317dadf1f7a46968cd0a9d569f16ad54a61dc2d1` 中，401 check / 96 rules / 36 integration、重武器/锤、携带、掉落、field-systems、九章Boss重试/港口原生刀通关路线、弹反均通过；旧刀专项随后因测试依赖固定5173服务器未启动而退出1，不能将该联合命令写成全绿。
- 将旧刀浏览器脚本改为自启临时端口服务器，保留可注入GAME_TEST_URL，finally关闭自己的浏览器/服务器；测试断言、游戏近战判定未放宽。
- 最后边界补丁：固定炮塔不被击退以免模型/碰撞锚点分离；新尝试清空章节领取记录时，不能继承已失去所有权的重武器/锤草案；普通刀仍是默认近战。以上均新增断言。
- `cmd_7fad8c4b2813cd9736552ab1cd9cb051c809036a4e8720dd` 退出0，177224ms：401/401 check、96/96 rules、36/36 integration，新重武器/近战/九Boss完整专项及九章携带浏览器通过。
- `cmd_6204d05554fe9eec6c0ab0d3bb3304ce525eb373222c784a` 退出0，70837ms：再次401/401、96/96、36/36；修正启动方式后的旧刀、工程兵维修、EMP三个浏览器专项通过。
- 独立Boss适配器版本在改锤前还跑过 `cmd_e68cdbc471ae47dedf7d8871427cb5cef95f068c578a9771`，退出0，447317ms，包含switchyard/elevator/siege/orbital/datacenter/polar等12个浏览器脚本。它是适配器/既有流程回归证据，不替代改为近战后的新锤测试。
- 最终诊断0 errors / warnings。最终截图 `.tools/p1-ordnance.png` 与 `.tools/p1-ordnance-breaker.png` 已查看：CINDER弹体/专用余量、真正重锤/无限近战显示、1920HP监察者面板与蓄力提示可见。截图为受控测试场景，非真人平衡或性能证据。
- 未提交Git或打包；没有修改视角输入、隐藏星布局或独立直升机玩法文件。

## 明确未覆盖

未声称P1整体完成、CINDER/LANCE各自单独使用有限弹药可通关九Boss、真人难度/乐趣平衡或目标硬件帧率达标。还有其他投掷物、正式改装解锁/共享弹药、原方案处决效果、剩余敌人/跨章生态、环境和统一Boss架构/攻击预算等遗留。

## 最终源码指纹

- `app.js`：`sha256:03da1fde0867fa2934da286bac59ea64eea1ad00889cd849ab5dd6ae3dcf0009`
- `ordnance-rules.js`：`sha256:ebe7cd9a081e6564b2024d79e81ee13933a89e485533c1708407431f8cf6ca8e`
- `cinder-world.js`：`sha256:6a2014001749a5f8b7268f3a958b1e21e4a86bbe2772266c43abae9001ce04a8`
- `ordnance-world.js`：`sha256:37450748b30dde5041c748a1b94ad29fe6c6b4c187e7fef8d82b6729126638d1`
- `boss-charge-interrupt.js`：`sha256:17595845b8f26515557b8a10bd84f7201f5c3c11736ada2949b75704ed0ed5f7`
- `loadout-rules.js`：`sha256:683c16948042a2a7051c43b2c364fbbf6760b1562269f1c02c8c2265d625dd34`
- `loadout-world.js`：`sha256:a1d575d74e2c2456558e30a3c603442b76df268abed7007e766e46497cc95fd8`
- `campaign.js`：`sha256:f7d442c1ebee1bde7b2108d82885f2e9c0a3cb4741794365ba5d12e0b255d7d9`
- `chapter-achievements.js`：`sha256:5d3dbc1e71ecd1db33c8e889769b3b966fab07750a660df9ee1763560f24f933`
- `achievement-ui.js`：`sha256:54b30ba6435be5daba73834e985f79ba6eb9a5850deaf79123b5b262d02df605`
- `challenge-progress.js`：`sha256:93bffbc137f1cd997e09a143c74f19c55fb4b0961110b7fa3fc485b11f4b8d57`
- `overseer-world.js`：`sha256:2b7e1e4efdbb597dcdea3f6110000fd6c8d0d803b89b51c75058c61d6b68e688`
- `switchyard-world.js`：`sha256:a8583fa1f267654e8d654c56e8fcfff42a55eaf2d2f93b990aa2a7f87b7da857`
- `elevator-world.js`：`sha256:c7c8a7ebb6c6d95ac9c7a95a919645e1814bbd82b78b6048b03daff6316e8d27`
- `siege-world.js`：`sha256:75165cbe7d8714e1ff8cb261960cb5d30ce5ff2acc4ae4c1154cbd5506751553`
- `tether-world.js`：`sha256:c0ff8c5f27a0b641160cad8eb1d9e5ee1db19c84caf34311e298a71c7d68622d`
- `abyss-world.js`：`sha256:d7969f516271fda98ac4ddf969cab5223cf649c79fcb446973302afe92d0838d`
- `glacier-world.js`：`sha256:99d3267ac2bddf66f6ffc96d7b592331325d98000a32da4558d4a7fd89713d0c`
- `test-ordnance.mjs`：`sha256:a1c9e0c814a675238e03c6498aa7d3338cfd2fe2b7847f51d8c8bd42f5bcc9ab`
- `test-boss-charge-interrupt.mjs`：`sha256:839e8a87efac5b3b32e435b8f4ac80a8a0de95fc49b128652888acf5f637acf2`
- `test-ordnance-browser.mjs`：`sha256:3f6c85b049db33285b36139d39458c08d3812606df7f3f79b717b173ab46d425`
- `test-melee-strike-browser.mjs`：`sha256:e75b7e22ada4db6dadcf9029f6fd314f123e1799069c52f51c574f93af161588`
- `test-switchyard-browser.mjs`：`sha256:d6d010fe6785cb19966c0bec418645a434c6794a6264a955fb61335c1cd82049`
- `test-elevator-browser.mjs`：`sha256:80ad0cd4d967f2e8d76803a5c54e263f74d1ecdf28a47346c5185208f47a8718`
- `test-siege-browser.mjs`：`sha256:e9663e4b68b552ef88f9587f9a67192a1878f224010925dee8e3a04a634e318a`
