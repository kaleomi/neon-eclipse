# MCP session: repo layout step 2 — `src/` + `styles/` (2026-09-22)

Follow-up to `mcp-repo-layout-tests-2026-09-22.md`. The flat root held ~296 production `.js` and 35 `.css` files next to 20 HTML pages. This step moves the code into `src/` and the stylesheets into `styles/`; the HTML pages intentionally stay at the root.

## Why the pages stay at the root

- `server.cjs`, `desktop/main.cjs` (`/` -> `/index.html`) and every browser test navigate to `/index.html`, `/vehicle.html`, `/helicopter.html`, ... Moving pages would require URL mapping in two servers, CI and ~90 Playwright tests for no functional gain.
- Runtime string references (`p4-hub.html`, `operations-archive.html`, `vehicle.html`, `helicopter.html` in JS; `href="./index.html"` in pages) keep working unchanged.
- Root now contains only: HTML entry pages, `server.cjs`, `package*.json`, `README.md`, config dotfiles, plus the directories `src/ styles/ tests/ scripts/ audio/ characters/ weapons/ maps/ i18n/ models/ docs/ desktop/`.

## What moved (all `git mv`, history preserved)

| From | To | Count |
| --- | --- | --- |
| `./*.js` | `src/*.js` | 296 |
| `./*.css` | `styles/*.css` | 35 |

## Reference rewrites

- **`src/*.js`**: 213 specifiers `./audio|characters|weapons|maps|i18n|models|node_modules/...` -> `../...`; `p4-runtime.js` runtime `<link>` `./p4.css` -> `./styles/p4.css` (document-relative). Sibling imports (`./x.js`) unchanged.
- **`audio/ characters/ weapons/ maps/ i18n/ scripts/`**: 13 files `../x.js` -> `../src/x.js`.
- **HTML (18 files)**: `src=`, `href=` and `modulepreload` -> `./src/...`, `./styles/...`. Import maps (`three` -> `./node_modules/...`) untouched.
- **CSS**: `url("./maps/art/*.jpg")` -> `url("../maps/art/*.jpg")` (1 file).
- **tests/ (≈245 files)**: `../x.js` -> `../src/x.js`, `/x.js` -> `/src/x.js`, CSS likewise; dynamic loaders (`new URL('../'+file)`, baseline-source rewrites in `test-enemy-roster-world.mjs`, `test-helicopter-transfer-app.mjs`) resolve against `../src/`.
- **`scripts/run-tests.mjs`**: check layer syntax-scans `src/*.js` in addition to root `.js/.mjs/.cjs`.
- **`tests/test-import-graph.mjs`**: entry list -> `src/app.js`, `src/ui-shell.js`, ...

## Provenance hashes

`models/*.manifest.json` record `sourceHashes` of the generator sources. Root-level keys became `src/<file>` and the hashes were recomputed because the moved files' import lines changed (26 manifests, no binary/GLB changes). `scripts/build-*.mjs` hash `src/...` going forward. The local (git-ignored) QA baselines `.tools/qa-vehicles-v2` / `.tools/qa-weapons-v2` were updated the same way; `test-vehicle-models-refined.mjs` / `test-weapon-models-refined.mjs` map root names through `srcPath()` and their drift ledgers point at the post-move hashes.

## `package.json`

`test:legacy` (a ~200-entry hand-maintained `node --check ... && node tests/...` chain fully covered by `test:ci`) was removed in its own commit.

## Verification (Windows, Node 24)

| Layer | Result |
| --- | --- |
| check | 664/664 |
| rules | 136/136 |
| integration | 67/67 (after the fixes above) |
| browser smoke (`tests/test-smoke-browser.mjs`) | 14/15 in the full run; the failing case *"audio: … sfx during play"* also fails on the pre-move commit `d531778` under the same conditions and passes when run in isolation (2/2) — a timing flake (`fireBuffer` 180 ms vs. a loaded machine), not a layout regression. Baseline full run on `d531778` in a fresh worktree: 15/15 in 401 s. |
| `node desktop/stage.cjs` | OK — 569 assets, `desktop/web/src` (296) + `desktop/web/styles` (35), import existence check passes |
| `.tools/net-check.mjs` (Playwright, 6 pages via `server.cjs`) | 0 failed requests, 0 console/page errors |

Note: Playwright's browser cache had been removed on this machine; `npm install --no-save playwright` + `node node_modules/playwright/cli.js install chromium` restored it.

## Follow-ups (not in this change set)

- `desktop/main.cjs:54` runs `import('./flight-records-store.js')` inside `vehicle.html` for the desktop score smoke; it must become `./src/flight-records-store.js`. The file currently carries unrelated uncommitted work (range requests, asset smoke), so it was left untouched — apply the one-line change together with that work.
- Consider marking the audio smoke case `retry: 1` or lengthening its fire window.
