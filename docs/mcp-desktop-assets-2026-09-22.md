# Desktop 1.5.4 resource-complete delivery

Date: 2026-09-22

## Conclusion

The previous 1.4.0 Portable EXE is superseded and must not be used as the final
delivery. Its staging rule recursively visited directories but copied only
`.js`, `.css`, and `.html`, so the generated manifest had code but no runtime
audio, GLB, or map artwork.

The corrected delivery is:

`release-desktop/NEON-ECLIPSE-1.5.4-win-x64.exe`

No commit or push was performed.

## Source and staging correction

`desktop/stage.cjs` now treats `audio/`, `models/`, and `maps/` as runtime
asset roots. It copies the binary/data extensions used by those trees,
including `.ogg`, `.mp3`, `.glb`, `.bin`, `.png`, `.jpg`, `.jpeg`, `.webp`,
`.svg`, `.json`, and `.txt`. Code files continue to go through the existing
Three.js import transformation.

After copying, staging compares every runtime asset against its source SHA-256
and aborts if any file is missing or changed. This prevents a future package
from silently reverting to code-only staging.

The current source-root inventory and resulting `desktop/web/build-manifest.json`
are:

| Runtime group | Source files | Staged/manifest files |
| --- | ---: | ---: |
| `audio/samples/*.ogg` | 33 | 33 |
| `audio/music/*.mp3` | 5 | 5 |
| `models/*.glb` | 49 | 49 |
| `maps/art/*.jpg` | 13 | 13 |
| All manifest assets | — | 569 |

The GLB files carry their material data internally in the current asset set;
there are no additional runtime PNG/JPG texture files outside `maps/art/` in
the current source roots. The map artwork URLs remain the existing relative
CSS URLs such as `./maps/art/reactor.jpg`; model URLs remain relative
`../models/*.glb` URLs; recorded audio remains `./samples/*.ogg` and music
remains `./music/*.mp3` relative to the audio modules.

## Background music runtime finding

The first resource-complete package still had a separate Desktop-only defect:
the `neon://` protocol returned `.mp3` and `.ogg` as generic binary responses
and did not implement byte-range responses. Browser tests using the normal test
server passed, but Portable Electron `Audio` returned
`MEDIA_ERR_SRC_NOT_SUPPORTED` for both background music formats. This is why
the earlier “files exist” check was insufficient.

`desktop/main.cjs` now declares the audio/image/model MIME types and handles
`Range` requests with `206`, `Content-Range`, `Content-Length`, and
`Accept-Ranges`. The Desktop smoke test now creates real `Audio` elements and
waits for metadata decode, in addition to fetching the resources.

## Packaging and verification

`desktop/package.json` and the lockfile were advanced to `1.5.4`; the portable
artifact name was changed accordingly. Commands executed in the project root:

```text
npm --prefix desktop run stage
npm --prefix desktop run pack
npm --prefix desktop run verify
node desktop/smoke.cjs --unpacked
node desktop/smoke.cjs
```

The staging manifest is version `1.5.4`. `verify.cjs` reads the generated
`win-unpacked/resources/app.asar`, checks every manifest SHA-256, and enforces
the four runtime groups above. Result:

- `ok: true`
- Portable EXE size: `130357609` bytes
- Portable EXE SHA-256:
  `b1f6b1fe3820d22f5dfcc7b93feb1ffa2bc6970c24d4c7cbd5ba3e1da390206`
- app.asar manifest assets: `569`
- runtime counts: OGG `33`, MP3 `5`, GLB `49`, JPG `13`

As an additional archive-level binary check, every one of the 33 OGG files,
5 MP3 files, 49 GLB files, and 13 JPG files was read from the packaged
`app.asar`. Their container signatures were valid: `OggS`, MP3 ID3/frame,
GLB `glTF` version 2, and JPEG `FF D8 FF` respectively.

Both unpacked and Portable EXE smoke runs returned `ok: true` with no renderer
errors. The Portable run reported successful metadata decode through the actual
`neon://` protocol for all five background MP3 tracks and the recorded OGG
sample:

- `last-and-first-light.mp3`: `468.796281` seconds;
- `legionnaire.mp3`: `184` seconds;
- `pathfinder.mp3`: `204.321927` seconds;
- `the-fury.mp3`: `425.828889` seconds;
- `titan.mp3`: `175.756735` seconds;
- `music-explore.ogg`: `60` seconds.

The same run returned HTTP `200` with `audio/mpeg` and `audio/ogg`, and the
model/map probes returned `model/gltf-binary` and `image/jpeg`. The repository
browser music test also passed full-track metadata, explore/combat switching,
pause/hidden handling, playlist rotation, reset and stop checks. A separate
FPS-page browser probe had an intermittent 15-second footstep wait timeout on
the final actual-page step; all 23 preceding audio checks, including decoded
recordings and audible PCM, passed. That timeout is not used as evidence for
background music failure.

These are controlled smoke/probe tests, not claims of natural gameplay
completion, hardware FPS, hardware WebGL parity, physical gamepad input, or
audibility on every machine. The Portable `Audio` metadata decode is now
verified; full speaker audibility remains machine/output-device dependent.

## 1.4.0 disposition

The old `release-desktop/NEON-ECLIPSE-1.4.0-win-x64.exe` was built before the
resource staging correction and is not a valid final delivery. The intermediate
1.5.0–1.5.3 artifacts are also superseded: 1.5.2 exposed the remaining
Desktop-only media decode failure, and 1.5.3 only sampled one full MP3 plus
the OGG layer. The 1.5.4 artifact is the first delivery after both the
resource staging fix and the `neon://` media range/MIME fix with all five MP3
tracks and the OGG layer decoded; it
includes the current mouse-look source and the parallel material/progress
changes present in this working tree.
