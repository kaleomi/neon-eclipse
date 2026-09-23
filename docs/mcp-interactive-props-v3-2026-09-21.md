# B01 / E01 重制与 GLB 交付（2026-09-21）

## 结论与边界

本批已在当前项目实际替换 B01 高爆压缩燃料桶、E01 EMP 脉冲发生器的建模源，重新生成 GLB、独立清单与总清单，接回生产模型，并完成下述专项回归。不是将旧几何重新导出。原版已备份；没有暂存、提交或推送 Git，也没有修改其他模型批次。

游戏继续使用与 GLB 同源的程序建模对象；本批不引入这些 GLB 的异步网络加载。GLB 为独立预览/DCC 资产，无外部贴图、骨骼或烘焙动画，动态警示与投掷由原运行时驱动。

四类载具和八把武器仍等待用户下一批继续/停止选择，不算本批已重制。软件 WebGL 专项测试不代表目标 GPU 性能、自然战役通关、全部 CI 或真人美术签收。

## 模型结果

| 资产 | 本次真实几何重做 | 网格 / 材质 | 三角面 | GLB 字节 |
| --- | --- | --- | --- | --- |
| B01 `explosive-barrel-b01.glb` | 碟形压力罐肩、压缩箍、防撞筋、吊装把手、调节器、压力表、安全阀与危险铭牌 | 5 / 5 | 2,492 | 184,104 |
| E01 `emp-node-e01.glb` | 六瓣分段护甲、外露铜色线圈、传感器、保险滑块、磁吸触点 | 5 / 5 | 2,332 | 172,400 |
| 合计 | `props-v3` | 10 / 10 | 4,824 | 356,504 |

- 旧 B01 为 4 网格 / 1,036 三角面，旧 E01 为 4 / 1,716；这次重新组织了轮廓和零件。
- 两件继续满足既有每件严格小于 2,500 三角面的预算，未上调旧断言。
- 米制、+Y 向上、+Z 正面，保留原枢轴契约。
- E01 最大顶点半径 `0.1182307084m`，小于原 `EMP.bodyRadius = 0.12m`；没有扩大投掷扫描半径。
- 精确远端 GLB 已取回并校对字节数、SHA-256，随后以 Khronos glTF Validator `2.0.0-dev.3.10` 验证：两份均为 0 错误、0 警告、0 信息、0 提示。

| GLB | SHA-256 |
| --- | --- |
| B01 | `e8fe6bc172406890a264053325e0d8fa41bb5e23a513ad7d4a8264df463da206` |
| E01 | `2bbd23a88648601d0b3bcc00b4b1dbd37e02a5350a9ad92b2a7f95cab7436017` |

## 集成与归属

- `interactive-prop-models.js`：重做两件几何；装饰网格不参与命中射线。共享不可变几何/静态材质，B01 可变警示材质按实例隔离。
- `barrel-world.js`：仅保留 visual 引用并把原 `<20 HP` 警示状态同步到新模型可见材质。原代理、碰撞、爆炸、连锁、掩体、环境击杀归属、放置及重置规则未变。
- `emp-system.js` 原本就调用 E01 建模 API，本次不改它；保留原 1.2 秒引信、扫描碰撞、充能、机械目标、Boss/掩体及存档规则。
- `scripts/build-interactive-props.mjs`：默认模式实际比较导出字节、全部单件清单和总清单；记录建模源与构建脚本哈希，拒绝越过原预算。不以只重算内存值代替保存文件核验。
- 新增 `interactive-props-preview.html`、`interactive-props-preview.js`：独立 GLB / 同源程序模型切换、正背透视、旋转、线框、警示状态及下载。
- 新增 `test-interactive-props-refined.mjs`、`test-interactive-props-browser.mjs`；原模型测试 `test-interactive-props.mjs` 未改。
- `test-barrel-browser.mjs`、`test-emp-browser.mjs` 仅修复过时的注入夹具：墙体显式构造 THREE 网格，恢复/保存委托当前 `flow.enterPlay`、`flow.saveCheckpoint`。墙体尺寸、位置、碰撞记录和所有断言不变，不向生产入口添加兼容别名。

最终逐字节 SHA-256 比较确认 `barrel-rules.js`、`emp-rules.js`、`emp-system.js`、`emp-world.js`、`field-layouts.js` 及 `app.js` 均未变化。`app.js` 仍为 `0a9cee09ab974e7513bc626577f98e466b7517f4b7785b1a6411f9a82d61ecc2`。

## 验证记录

| 层级 | 已执行结果 |
| --- | --- |
| 语法与导出 | 本批 JS/MJS 语法检查；`--write` 生成后默认模式验证；最终再次默认验证通过 |
| 原模型 Node | 5 组：有限几何、原预算/包络、装饰射线排除、真实 GLB/源几何一致、零外部依赖与克隆释放隔离 |
| 新模型 Node | 3 组：九地图旧代理射线一致、每图 40 次燃料桶重置、实例警示隔离、40 次 EMP 完整引爆/释放 |
| 原玩法 Node | `test-barrel.mjs`、`test-barrel-world.mjs`、`test-emp.mjs`、`test-emp-world.mjs` 全部通过 |
| 新浏览器 | 4 组 / 23.4 秒：两模型真实 GLB/源切换、正背面/状态/线框、390px 窄屏、未替换入口启动及原生 G 松开创建 E01 v3 |
| 原燃料桶浏览器 | 71.4 秒通过：8 类原生武器、自伤、环境击杀与严格刀杀归属、Boss 免疫、实体掩体、暂停、安全存档/重置及其余 8 张地图铺设 |
| 原 EMP 浏览器 | 32.7 秒通过：原生 G 蓄力/释放/取消/重复、飞行暂停、精确引信、机械目标完整 3 秒停机、待发取消、不伤害/不污染统计/不罚刀杀、掩体、单飞行体/双充能、1/0 充能存档、重试/结束/重置清理 |
| 格式与诊断 | 两个精确 GLB 的 Khronos 检查全零；最终项目诊断 0 错误/警告；本批文本及目标 Git 差异空白检查通过 |

最终正面/背面渲染已查看；这些是实际 GLB 渲染，不是生成式概念图。上述浏览器使用隔离 Chromium/软件 WebGL；部分玩法条件由受控夹具设置，不能描述为自然通关。

### 保留的失败与修复

1. `validation-pass1.log` 中，生成、Node、新浏览器及原燃料桶 8 类武器均通过，随后旧夹具调用不存在的 `box` 失败；EMP 浏览器未运行到。
2. 显式构造测试墙后，`legacy-browser-pass2.log` 又暴露旧夹具的 `enterPlay` 引用。核对当前 `session-flow.js`/生产菜单委托，同时修正旧保存调用。
3. `legacy-browser-pass3.log` 中两套旧浏览器顺序重跑均退出 0。没有删除断言或放宽几何预算；失败记录保留，不将前两条链描述为全通过。

## 证据与复现

机器日志、清单、截图与备份都在 `.tools/qa-interactive-props-v3/`，不放进 docs：

- `before/`：13 份原源文件/资产/规则记录和两个旧浏览器测试备份。
- `validation-pass1.log`、`legacy-browser-pass2.log`、`legacy-browser-pass3.log`。
- `result.json`、正背面截图与原生页面截图。
- `gltf-validation.json`：取回精确 GLB 后执行的 Khronos 报告。
- `gameplay-hashes-final.json`：六个未变化生产文件的最终哈希。

```bash
node scripts/build-interactive-props.mjs
node test-interactive-props.mjs
node test-interactive-props-refined.mjs
node test-barrel.mjs
node test-barrel-world.mjs
node test-emp.mjs
node test-emp-world.mjs
node scripts/run-tests.mjs --layer browser --filter interactive-props --jobs 1 --verbose
node scripts/run-tests.mjs --layer browser --filter barrel --jobs 1 --verbose
node scripts/run-tests.mjs --layer browser --filter emp-browser --jobs 1 --verbose
```

如需重建，在审查源文件后运行 `node scripts/build-interactive-props.mjs --write`。默认验证命令不会覆盖已保存资产。回退时只恢复本批所属文件，不重置并行工作或整个脏工作树。

## 下一批

按用户明确顺序，等待选择继续或停止：四类海陆空载具 V01–V04 → 八把第一人称独立主战武器 W01–W08。继续时必须真实重做几何、重新生成 GLB，保留既有挂点、碰撞及玩法合同；不能因已有旧资产而跳过。
