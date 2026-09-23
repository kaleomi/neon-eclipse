# 八把第一人称主战武器重制与完整交付（2026-09-21）

## 结论与范围

W01–W08 已实际重做几何、重新生成 GLB 并接回生产视模。连同此前 B01/E01 两件设备、V01–V04 四款载具，用户明确指定的 **14 件重制队列全部完成**。此前 EV01/EL01/EV02/EN01 环境四件套独立计数，不混入这 14 件。

这不是重新导出旧网格，也不是全项目发行声明。玩法、P01 手臂资产与存档未改；没有提交或推送 Git，没有回滚并行工作。下一步需按用户要求提供继续/停止选择框，不自动扩展任务。

## 最终资产

| 编号 | 名称 | 三角面 | 网格 / 材质 | 去重关节 | GLB 字节 |
| --- | --- | --- | --- | --- | --- |
| W01 VG-30 | 先锋突击步枪 | 3,324 | 7 / 7 | 7 | 615,220 |
| W02 BR-08 | 破门霰弹枪 | 3,060 | 7 / 7 | 6 | 567,160 |
| W03 GH-15 | 幽灵消音手枪 | 3,260 | 7 / 7 | 6 | 602,716 |
| W04 ARC-01 | 电弧战刃 | 1,184 | 7 / 7 | 3 | 227,428 |
| W05 TM-36 | 风暴冲锋枪 | 2,716 | 7 / 7 | 6 | 505,196 |
| W06 HL-24 | 光环精准步枪 | 4,208 | 7 / 7 | 6 | 773,668 |
| W07 RS-01 | 磁轨穿透枪 | 4,016 | 8 / 8 | 5 | 740,152 |
| W08 VT-06 | 雷霆电弧霰弹枪 | 4,362 | 8 / 8 | 6 | 803,912 |
| 合计 | 8 把独立资产 | 26,130 | 58 / 58 | 45 | 4,835,452 |

- 本批采用每件严格 <5,000 三角面、最多 8 网格/8 材质的细化预算。旧武器测试没有这条硬上限，不能误称为沿用原武器上限。
- 坐标和原点保留：+Y 向上、−Z 前方，规范导出 scale 1.0；游戏视模仍为原 0.65。W04 刀刃沿原 +Y 长轴前倾，未强制改成枪管方向。
- 基本 PBR 与顶点色，无外部贴图；识别字样为几何笔画。没有把 Canvas 标签换成空白板来冒充独立材质一致。
- 刚性单关节权重保持硬壳，不做软体弯曲；枪机、弹匣、泵动、握持/支撑和枪口/刀尖为命名关节。每材质网格分别绑定 skin，关节引用同一层级，表中不重复计数。
- 独立 GLB 不含 P01 手臂、枪口闪光、供弹临时弹壳或烘焙动作。原运行时继续负责这些效果与动作。
- 八份精确远端 GLB、8 份单件清单和总清单已取回，核对 SHA-256/字节数；Khronos glTF Validator 2.0.0-dev.3.10 八份均 **0 错误、0 警告、0 信息、0 提示**。

## 实际重做内容

- W01：分层机匣、通风护木、框架瞄具、握柄与带侧板弹匣。
- W02：加固机匣、泵动护木、双管轮廓、破门枪口与外置弹架。
- W03：分体滑套、滑套导轨连接、多段消音筒、照门和握柄。
- W04：切面刀脊、双面能量槽、分段护手、柄尾和几何识别细节。
- W05：紧凑机匣、短护木、实体准星支座、短托与长直弹匣。
- W06：延长护木、分段长枪管、双支座光学镜组与弹匣。
- W07：开放磁轨、四组电感线圈、握柄电池匣与隔离的琥珀发光材质。
- W08：双发射器、冷却/电容结构、大电池匣与隔离的青色发光材质。

## 代码与兼容性

1. 新 `weapon-asset-models.js` 是 DOM/P01-free 的独立建模源；生产视模和 GLB 直接复用，不新增武器 GLB 网络加载。
2. `weapon-models.js` 只变成薄适配器，保持前 8 个 gun 子节点、原视模缩放、14 个 P01 挂点和 flash 对象；增加可选幂等 dispose，不改变既有调用方式。
3. 原 `select()` / `animate()` 函数体逐字保留（校验时仅统一行尾），并对比改动前采集的 48 组选择/后坐/装填/充能快照。枪口闪光位置、活动部件完整相对矩阵、显示状态、缩放和能量公式一致。
4. 两把能量武器的可变发光材质按实例隔离；GPU 骨骼贴图与几何/材质一起去重释放。
5. `scripts/build-weapon-models.mjs` 不再为每把武器创建整套 8 武器+P01，再克隆并强制显示临时弹壳。现直接导出单件，并在默认模式真实核对保存的二进制、完整单件清单及总清单。
6. 原 GLB 契约、P01 Node、P01 浏览器、ADS 浏览器及原生 registry 浏览器断言均未改。为避免覆盖其他会话的截图，P01/ADS 浏览器仅复制到本批 tools 目录并替换输出路径。

最终确认 13 份玩法/P01 源或资产与**本批起点**逐字节一致。该范围包括 app.js、combat.js、action-poses.js、显示/选择/掉落/mod/HUD，以及两个 P01 源、P01 GLB 与清单；不把其他并行会话此前的改动算成本批变更或回滚。当前本批 app.js 哈希为 `166ccc2b6cd664ae32ddd90af892327b6b3a80aa1402cb8fa082b691cfe5afcd`。

## 验证结果

| 层级 | 取得的结果 |
| --- | --- |
| 导出/语法 | 本批 JS/MJS 语法、生成、默认模式完整再验证通过 |
| 原模型契约 | 8 组通过 |
| 新模型测试 | 11 组：8 款全部顶点在 3 个刚性姿态下源/GLB 一致、权重/锚点/来源/预算；48 组原动作快照；14 个挂点和 P01 手部 <1e-6 m；48 次含骨骼贴图的创建/幂等释放；13 份文件不变 |
| 原 P01 Node | 8 组通过；原手臂 GLB、13 节点与 5 段既有剪辑保持 |
| 新展厅/启动浏览器 | 10 组 / 最终 41.1 秒：8 款 GLB/源、背面、线框、挂点、部件/能量；390px；未经替换的原生菜单启动；只读观察确认 8 个 v2 视模及 .65 缩放、无武器 GLB 请求 |
| 原第一人称浏览器 | 6 组通过：真实 createWeapons、P01 HTTP 200 与热切换、八把握持/支撑误差 <1e-6 m、后坐和供弹姿态、8 张不同的实际第一人称截图 |
| 原 ADS 浏览器 | 10 组通过：按住/切换瞄准、真实插值、换弹降低瞄具、切枪/格挡、暂停/失焦/死亡/重置、鼠标/手柄隔离、LANCE ADS 门槛、原生页面输入 |
| 原生 registry 浏览器 | 未注入 app 的终端装备、1/2/3 槽切换、步枪/霰弹枪/手枪射击、逐发装填、刀刃无限弹药、暂停、隔离存档哨兵通过 |
| 相关规则 Node | combat、combat-controls、aim-mode、melee-strike、melee-sweep、weapon-upgrade/registry/UI/mods 通过；首链还执行了既有 handling 聚合测试，不把其海空内容冒称武器专项 |
| 独立离线包 | 精确 HTML 以 file://、浏览器网络 OFFLINE 实测：8 内嵌 GLB、8 第一人称截图、姿态/线框/视角切换、390px，0 外部请求/0 页面异常 |
| 收尾 | 精确远端 GLB Khronos 全零；13 份文件/原动作函数体复核通过；诊断 0；本批文本/Git 差异空白检查通过 |

所有第一人称图都来自真实游戏的受控场景，不是生成式概念图。P01/部分 ADS 场景采用手动 RAF/场景夹具；另有未改 app 的原生输入检查。以上不是自然战役通关、全 CI、实机目标 GPU 或真人美术签收。

## 审查修正与中断记录

- 首轮图检发现 GH-15 滑套下方缺少实体导轨连接、TM-36 前准星缺支座。补上结构后重新导出，原/新模型 Node、P01 Node、展厅和第一人称/ADS/原生输入浏览器均再次通过；首轮源、清单和截图保留在 `visual-pass1/`。
- 旧导出器默认只计算数据后打印 VERIFIED，没有读取保存资产进行比对；已改成完整比对，而非信任旧提示。
- 一次新 PTY 没在 8 秒内到首提示，未获得 command_id、测试未开始；使用显式项目 cd 并省略 cwd 重用空闲终端后成功。
- 原隧道一度在 `2026-09-21T14:14:20Z` 返回 HTTP 530 / Cloudflare 1033。恢复后只取回已有展厅命令结果，没有重复生成或重复创建独占备份。中断时本地“待收尾”记录已由本报告取代，未把未知结果当通过。
- 一次 PTY 标准输出传输返回空捕获，未从中假造二进制。改为在 tools 目录写 gzip/base64 文本，通过文件工具取回，再逐一核对 SHA/长度。全部 17 份最终资产/清单均验证成功。

## 文件与证据

- 实质代码：`weapon-asset-models.js`、`weapon-models.js`、`scripts/build-weapon-models.mjs`。
- 新展厅：`weapon-models-preview.html`、`weapon-models-preview.js`。
- 新测试：`test-weapon-models-refined.mjs`、`test-weapon-models-browser.mjs`。
- GLB/清单：`models/weapon-*-w0*.glb`、各单件清单、`models/player-weapons.manifest.json`。
- `.tools/qa-weapons-v2/before/`：36 份原文件、源哈希、48 组 `animation-contracts.json`。不能覆盖这份基线。
- `.tools/qa-weapons-v2/`：`node-pass1.log`、`first-person-pass1.log`、`gallery-pass1.log`、`visual-pass2.log`、`fps-regression-pass1.log`、`gallery-result.json`、`first-person/`、`aim/`、`visual-pass1/`。
- 格式/最终边界：`gltf-validation.json`、`contracts-hashes-final.json`。
- 离线：`delivered-offline-inspector.html`、`offline-bundle-check.log`、`offline-inspector-result.json`、`offline-inspector.png`。精确 HTML SHA-256：`fbfd7446792b322403f53b6629365901419e9716ca2cadf75cc85bd4014dad2e`。

最终 GLB SHA-256：

- `weapon-vanguard-w01.glb`：`86a748ac0893606cc3cc40b950f1ae58b6b1847b279873ba72b97b321ca95a08`
- `weapon-breacher-w02.glb`：`60443cf971b5af3ae1935d441f04ed8480bed7683d332d6ddb863959b385f8af`
- `weapon-ghost-w03.glb`：`240cf7cc11c82b2f2fde39ffc96dbb1ca88b6983c8982dbbeb8534264615b7b0`
- `weapon-arcblade-w04.glb`：`784196b919f3dfa9da51ff1310c02981df52684e87db759592eb4478568ad76e`
- `weapon-tempest-w05.glb`：`c58319ed64b21f58a7d87d1e66bb5c8491b07aa41daec7d0462ab87a68d0e84d`
- `weapon-halo-w06.glb`：`fa514d54d8c58ad0a431dae8b8ee792ecb804ab82e238f5725338eab56a1781d`
- `weapon-railspike-w07.glb`：`0df680a57b837b441a0921cc0410d275c5e0b73c723063cfff93bfcc14c3d391`
- `weapon-volt-w08.glb`：`c1a3f409bc16c94060c8abd3505a9ba7467b4d8622cf4762827eeca23bc6c7e2`

## 复现与回退

```bash
node scripts/build-weapon-models.mjs
node test-weapon-models-contract.mjs
node test-weapon-models-refined.mjs
node test-player-arms.mjs
node scripts/run-tests.mjs --layer browser --filter weapon-models --jobs 1 --verbose
node .tools/qa-weapons-v2/run-browser-regressions.mjs
```

需要重建时才为构建器加 `--write`；默认不覆盖已保存资产。回退只恢复本批所属文件，不重置整个脏工作树。测试 harness 只管理自己的服务器/子进程，不停止开发者服务。

交付另有八把武器 ZIP、内置 GLB 与第一人称截图的离线 HTML，以及汇总 B01/E01 + V01–V04 + W01–W08 的 14 件完整包。任务队列的 14/14 仅针对这次明确指定的资产重做。
