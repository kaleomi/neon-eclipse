# 资源体积与懒加载审计（2026-09-20）

> 只审计、不改源码。数字来自 HEAD `dcd982c` 工作区（`du`、GLB JSON 头解析、OGG 页头解析、`gzip -c | wc -c`）。所有建议按“收益 / 风险 / 是否需要用户决定”分级；未做任何一项。

## 1. 总览

| 类别 | 体积 | 文件数 | 加载时机（源码接线） |
| --- | --- | --- | --- |
| `models/*.glb` | 5.3 MB | 9 GLB + 7 manifest | 按敌人类型首次实例化时 `GLTFLoader.loadAsync`（`characters/*-runtime.js`），单例 promise 缓存；`heavy-cover.glb` 在 `art.js` 场景构建时加载 |
| `audio/samples/*.ogg` | 2.6 MB | 33 OGG + 4 文本 | `sfx-player.js:24` / `vehicle-audio.js:31` 在音频总线解锁后**一次性 preload 全部**；音乐两轨在 `recorded-music.js start()` 时 preload |
| `maps/art/*.jpg` | 2.6 MB | 13 JPG，全部 1376×768 | `ui-clean.css` 36 条 `background-image`，浏览器按当前 `data-map` 选择器只拉取匹配的一张（CSS 背景是懒的），主页只触发 1 张 |
| JS 源码（不含 test/scripts/desktop） | 1.64 MB 原始 / **0.59 MB gzip** | 278 个模块 | 全部 ESM 静态 import，无动态 `import()`；`three.module.js` 单独 648 KB（gzip 131 KB） |
| CSS | 23 个 `<link>`（index.html） | — | 全部同步加载 |
| Git 仓库 | pack 225 MiB | — | `.tools/` 已追踪 243 文件 / 63 MB，其中 188 张 QA 截图 62 MB；`release-desktop/*.json` 已追踪，EXE/unpacked 已忽略 |

首屏（主菜单）实际网络成本：JS ~0.6 MB gz + three 0.13 MB gz + CSS + 1 张 200 KB 封面。模型和录音都不在首屏路径上。

## 2. 模型（5.3 MB）

七个守卫 GLB 各 540–910 KB，构成：

| 文件 | 总计 | 网格属性 | 动画 | 顶点 | 节点 |
| --- | --- | --- | --- | --- | --- |
| engineer-guard-e02 | 907 KB | 670 KB | 125 KB（6 段） | 28 620 | 105 |
| ranged-guard-r07 | 871 KB | 728 KB | 51 KB | 23 304 | 88 |
| shield-guard-b04 | 712 KB | 554 KB | 71 KB | 23 652 | 89 |
| commander-guard-c01 | 703 KB | 499 KB | 102 KB | 21 300 | 100 |
| heavy-guard-h12 | 687 KB | 560 KB | 54 KB | 23 916 | 84 |
| sniper-guard-s09 | 649 KB | 506 KB | 62 KB | 21 624 | 82 |
| assault-guard-a03 | 543 KB | 421 KB | 49 KB | 17 976 | 83 |

- 没有内嵌贴图（`images` 为空），体积全在几何：每模型 80–105 个节点、约 2 万顶点，属性未量化。
- 已经是懒加载：只在该类型第一次生成时拉取，且按类型单例缓存。一章通常只会碰到 3–5 种类型，实际每章 2–4 MB，且发生在战斗中（可能造成首只该类敌人出现时的一帧卡顿 + 网络等待）。
- 可选项：
  1. **Draco / meshopt 压缩**（`gltf-transform optimize`）：几何 500–700 KB → 通常 100–200 KB，合计 5.3 → 约 1.5 MB。需要在加载器上挂 `DRACOLoader`（三方 wasm ~300 KB，一次）或 `MeshoptDecoder`（~30 KB）。**风险**：蒙皮权重/法线精度、动画曲线量化后的手感需要用户目视验收；每个 `characters/*-runtime.js` 与 `enemy-*-preview.js` 共 11 处构造 `GLTFLoader` 要统一走一个工厂。
  2. **章首预热**：在 `spawnEncounter` 前按本章敌人名单 `Promise.all` 预取（现有 `loadGuardVariantAsset(type)` 即可复用），把卡顿从战斗中挪到已有的章节过场/准备页。零格式风险，改动约 20 行。
  3. 合并 4 段公共动画（Idle/Patrol/Aim/Hit 七份几乎相同的曲线）为共享 clip：省 ~300 KB，但要改导出流程，收益低于 1。

## 3. 录音（2.6 MB）

- 两条音乐轨 `music-combat.ogg` / `music-explore.ogg` 各 ~840 KB：32 kHz、60 s 循环、~113 kbps。其余 31 条 SFX/载具环境 0.9 MB，单条 ≤108 KB。
- 当前策略：**总线一解锁就 preload 全部 SFX**（`sfx-player.js:24`），载具页再 preload 8 条环境音；音乐在 `start()` 时才拉。解码后驻留内存：60 s × 32 kHz × 立体声 × float32 ≈ 15 MB/轨。
- 可选项：
  1. 音乐降到 **80 kbps / 单声道或 24 kHz**（都是氛围垫底）：每轨 840 → ~450 KB。需要用户试听确认；`audio/samples/CREDITS-MUSIC.txt` 与 `sources*.json` 要同步。
  2. SFX preload 改成“按当前地图/模式子集”：`RECORDED_EVENTS` 已按事件分组，只需在 `preload` 处过滤。收益 ~0.4 MB，风险低，但首发时可能出现首次事件延迟（现有 `load()` 已能在缺失时回退合成音，行为可接受）。
  3. 音乐不预取两轨而是按 `MUSIC_TRACKS` 当前状态只拉一轨、切换时再拉另一轨（`recorded-music.js:10`）：省 840 KB 首次下载，代价是首次切战斗音乐时有 0.7 s 淡入期内可能静音——现有 fade 0.7 s 基本能盖住。

## 4. 章节封面（2.6 MB）

- 13 张 1376×768 JPEG，160–240 KB/张，质量偏高。实际展示尺寸：主页 `.menu-home-art` 在 1920 宽下约 700 px 宽，390 宽手机下约 350 px。
- CSS 背景按 `data-map` 选择器懒取，主页只请求 1 张；章节网格 `chapterArtwork()` 内联 SVG，不用 JPG。所以**首屏只付 1 张**，其余 12 张只有在切章预览时才拉。
- 可选项：
  1. 重编码为 **WebP q75 或 JPEG q70，最长边 1024**：每张约 60–90 KB，合计 2.6 → ~1 MB。需要用户目视对比（封面是他们最近调过的美术）。
  2. 不动。当前策略已经是懒的，绝对值不大。

## 5. JS / three.js

- 278 个模块全部静态 import，`index.html` 无 `modulepreload`，浏览器按 import 图逐层发现，深度约 6–7 层，**HTTP/1.1 下瀑布明显**（本地 file/Electron 无此问题，Cloudflare/HTTP2 下影响小）。
- P4 运行时（`p4-*.js` 16 个模块）、载具场（仅 `vehicle.html` 用）、`operations-archive.js` 已经是按页面分离的；主页 `app.js` 静态引入的 P4 部分只有 `p4-runtime.js`/`p4-bridge.js`。
- 可选项：
  1. 对 `three.module.js` 和 `app.js` 前 2 层加 `<link rel="modulepreload">`：零风险，改 index.html 约 10 行；需要用 `test-frame-perf-browser` 或 DevTools 看瀑布确认收益。
  2. 把 `p4Requested()` 为假时不需要的 P4 运行时改成 `await import()`：省 ~60 KB gz 首屏，但 `createP4Bridge` 现在在启动同步链里，要改成异步就绪门；收益小于成本，暂不建议。
  3. three 换成 tree-shaken 构建：需要打包器，与“无构建步骤”的现状冲突，不建议。

## 6. Git 仓库本身（比资源更值得先处理）

- `.tools/` 下 188 张 QA 截图 62 MB 已被 `e929dea` 等提交追踪，且每次跑 polish/clean-ui 链都会重写它们（本轮就出现 26 张“已修改”截图）。这是 pack 225 MiB 的主要来源，也是今后每次提交的噪音源。
- 建议（需要用户决定，因为涉及已提交历史与你们的验收凭证习惯）：
  - A. 继续追踪但把测试改为写到 `.tools/qa-*/latest/` 并忽略该子目录，只在人工验收时手动复制到追踪目录；
  - B. 整个 `.tools/` 加入 `.gitignore`，截图凭证只在 docs 里引用路径不入库；
  - C. 用 Git LFS。
  - 任一方案都不需要重写历史；历史 pack 体积保留。

## 7. 建议的落地顺序（若用户同意）

1. §6 截图追踪策略（先止血，避免下一批提交继续带 60 MB 图）。
2. §2.2 章首模型预热 + §5.1 modulepreload：低风险、纯接线，可一次做完并用 smoke + polar + frame-perf 链复测。
3. §3.2/§3.3 SFX 子集 preload、音乐单轨预取：低风险。
4. §2.1 GLB 压缩、§3.1 音乐码率、§4.1 封面重编码：都改变资产内容，**必须由用户目视/试听验收**，逐项单独提交。

未做：任何源码或资产改动；未测量真实网络下的首屏时间（只有静态体积与 gzip 估算）。
