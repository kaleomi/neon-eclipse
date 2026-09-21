# 第二章运输站：材质与目标标识视觉试点

日期：2026-09-20；项目 `game/b4cac37d-4fa9-4d31-8c30-d07e3ee813a6`。

## 范围

新增 `station-look.js`，局部接入 `station-world.js`、`switchyard-world.js`。复用原材质、256×256 地面贴图与 768×192 指示牌 Canvas，没有新增纹理文件、外部依赖、灯光、模型或碰撞体。

- 地面密集横纹改为大块哑光地砖、接缝及轻微表面颗粒；现有贴图最多 4 倍各向异性过滤，受硬件能力上限约束。
- 区分墙体、列车喷涂金属、浅色金属、暗框、座椅与琥珀构件的颜色和粗糙度。
- 普通车厢轨道复用现有标准金属材质，不再与自发光灯带同材质。
- 指示牌提高文字/底色层级，保留原文字、箭头、位置、尺寸与方向，不另造导航路线。
- 调度核心框架、控制台及钢轨材质分层；非当前道岔数字提高灰蓝亮度。当前道岔琥珀、设置完成青色、危险红色和所有状态切换条件不变。

未修改 `station-data.js`、`switchyard-rules.js`、防守时长、Boss 数值/窗口、地图布局、碰撞、保存规则或成绩资格；未覆盖其他会话资产；未提交、推送或打包。

## 基线与画质对照

新增 `test-station-look-browser.mjs`：真实 station/switchyard 构建器和 presentation 控制器，固定站台/车厢/调度区视角，三档画质，共 9 组。修改前成功采集基线后才应用生产补丁。

| 画质 | 站台 calls / triangles | 车厢 calls / triangles | 调度区 calls / triangles | textures / lights |
|---|---|---|---|---|
| 性能 | 105 / 4886 | 108 / 5246 | 92 / 3986 | 9 / 3 |
| 均衡 | 105 / 4886 | 108 / 5246 | 92 / 3986 | 9 / 3 |
| 精细 | 204 / 9972 | 207 / 10332 | 191 / 9072 | 11 / 3 |

以上前后完全一致，五个阶段的障碍快照和顶部边界也一致。固定摄像机、CSS 480×270、DPR 1（性能档缩放至 0.8）、3 帧预热/9 帧测量、SwiftShader；截图 960×540。耗时仅作诊断，不作为实机帧率结论或零 GPU 成本承诺。各向异性过滤及材质明暗调整可能影响目标硬件的实际耗时。

## 验证结果

- 三个生产文件语法检查、新材质/绘图规则测试通过。
- `test-station.mjs`：五目标、21 守卫、8 补给、四道门、导航失效重建、18 秒调度防守、撤离与独立存档键通过。
- `test-switchyard.mjs` 与 `test-switchyard-world.mjs`：道岔顺序、长按/取消、三轨道、列车只破盾、6 秒核心窗口、不同帧率列车碰撞、遮挡、暂停、HALO、近战、旧检查点与清理通过。
- 九组画质/视角及五阶段边界对照通过，`STATION_VERIFIED_EXIT=0`。
- `test-switchyard-browser.mjs` 最终五组通过：未替换应用的 station/reactor/roof 启动与暂停；实际防守门、屏蔽命中与错误道岔；真实 E、刀击、单次 Boss 击杀与撤离/检查点/重试；八种武器真实输入命中；死亡重试重置。`STATION_NATIVE_VERIFIED_EXIT=0`，无页面异常。
- 项目诊断 0 项。已人工查看站台、车厢、调度区对照及带 HUD 的调度区截图。

## 回归期间的测试修正

1. 首次边界比较因运行时对象保留 `undefined` 字段，而 JSON 基线省略字段失败；两端按同一 JSON 表示比较，仍逐项核对全部已定义碰撞值。
2. 旧 Boss 浏览器夹具引用入口拆分前的 `damageTime`、`saveCheckpoint`、`retryStage`。仅测试改用现有 `chrome.update(dt)`、`flow.saveCheckpoint()` 和 `flow.retryStage()`；保留原断言和游戏实现。相关首次失败日志保留。

## 证据与边界

- `.tools/station-before.log`
- `.tools/station-look-validation.log`、`.tools/station-look-final.log`、`.tools/station-native-final.log`：含首次失败及定位过程。
- `.tools/station-look-verified.log`、`.tools/station-native-verified.log`：最终通过结果。
- `.tools/qa-station-look/before.json`、`after.json`
- 同目录 `before-/after-platform.png`、`before-/after-carriage.png`、`before-/after-dispatch.png`
- `native-exposed.png`、`native-exposed-arena.png`

对照截图使用固定视角与受控阶段；Boss 浏览器夹具省略前置守卫、摆位并受控步进，不是自然整章通关、真人辨识度或硬件性能验收。本批不是场景模型重制。

下一批：战斗提示可读性，先检查敌人预警、核心暴露与机关提示在复杂背景/不同画质/辅助模式下是否清楚；不改变预警时长、命中判定和伤害。
