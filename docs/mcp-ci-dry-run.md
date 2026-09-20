# CI 工作流首次本地演练（2026-09-20）

## 背景
`.github/workflows/ci.yml`（P7 交付）自写入以来从未运行——仓库没有远端，无法触发 GitHub Actions。本次在远端机上用**干净克隆**按 workflow 步骤逐条演练，验证提交树（而非工作树）能通过。

## 方法
`git clone . .tools/ci-sim`（HEAD `0fd39f3`）→ `npm ci --ignore-scripts` → `node scripts/run-tests.mjs --layer check` → `--layer rules --jobs 2` → `--layer integration --jobs 2` → `node test-smoke-browser.mjs` → `node test-expedition-browser.mjs && node test-archive-browser.mjs`（`VEHICLE_PLAYWRIGHT_MODULE` 指向本机 playwright；workflow 中为 `npm install --no-save playwright@1` + `npx playwright install --with-deps chromium`，本地未重复安装）。

## 结果
- node-tests：`npm ci` 退出 0；check **497/497**、rules **119/119**、integration **42/42**（比工作树少的计数是用户未提交的测试文件，不在提交树内）。
- browser-smoke：`test-smoke-browser.mjs` 15/15 EXIT=0；`test-expedition-browser.mjs` EXIT=0；`test-archive-browser.mjs` EXIT=0。
- 首次 smoke 运行曾在 tower/train 章节超时：当时隧道中断导致前一条后台链留下孤儿 Chromium/node 进程与之争抢 CPU；清理后单独重跑全绿。结论仍是"不要并行跑多条浏览器链"（`docs/README.md` 既有规则），CI 的 `needs: node-tests` 串行设计与此一致。

## 未做 / 限制
- 未在真实 GitHub Actions（ubuntu-latest、Node 22、`playwright install --with-deps`）上运行；本地演练是 Windows + 本机 playwright。
- 未验证 `cache: npm` 与 `package-lock.json` 在 Linux 下的一致性。
- workflow 文件本身未改动。
