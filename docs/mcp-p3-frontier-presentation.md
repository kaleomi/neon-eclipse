# 先遣队 6–8 敌对表现 + 直升机/飞机/游艇碰撞（b12，2026-09-20）

## 范围
1. 敌对单位死亡不再只是"变灰"：无人机空中爆炸→坠落→落地二次爆炸；炮塔炮管下垂、底座焦黑；雷达碟倾倒下滑；机甲按血量发红、死亡后倾侧下沉；机甲行走每 3.2 m 一次脚步扬尘。
2. 直升机飞行模型把停放的飞机、越野车当作实体障碍；停放的直升机对滑跑飞机是实体障碍。

## 源码接线
- `frontier-missions.js`
  - hostile 新增 `wreck/wreckY/wrecked`；mission 新增 `effects[]`（上限 24）、`effectSerial`、`mechSteps`。
  - 导出 `FRONTIER_EFFECT_TTL` {explode 1.1s, collapse 1.6s, step .5s}、`stepFrontierPresentation(m,dt,groundAt)`、`hostileDamageFraction(h)`。
  - 无人机死亡：推 `explode` 特效，`wreckY` 以 9 m/s 起加速下坠到 `groundAt(x,z)`，落地再推一次 `explode`（测试断言恰好 2 次）。其他单位死亡推 `collapse`。
  - `mechStride` 每走 3.2 m 推 `step` 特效并累加 `m.mechSteps`。
  - `stepFrontierMission` 在 elapsed 累加后调用 `stepFrontierPresentation(m,step,s.ground)`；idle 或 dt≤0 不产生效果。
- `frontier-world.js`
  - 无人机死亡渲染在 `wreckY`，翻滚旋转、缩到 .7、`deadMat`，残骸 6 s 后隐藏。
  - 炮塔：`barrel.rotation.x` 下垂、整体倾侧，1.2 s 后底座换焦黑材质。雷达碟：`rotation.z` 到 1.3 rad 并沿桅杆下滑 55%。
  - 机甲：`mechMat.emissive` 按 `hostileDamageFraction` 泛红，死亡后 `rotation.z` 倾侧、下沉 1.6 m。
  - 24 个特效网格池：explode 橙球膨胀、collapse 灰烟上升、step 小土黄尘团；透明度按 `age/ttl` 衰减。
- `helicopter-field.js` 新增 `vehicleHeliObstacles(plane,rover,ground)`（仅 onGround 且未坠毁的飞机 12×12×4 m 盒，越野车 5.2×5.2×2.4 m）与 `helicopterPlaneBox(s)`（着地直升机 → flight-rules 盒 `{minX,maxX,minZ,maxZ,h}`；空中返回 null）。
- `vehicle-app.js`：飞机步进的 boxes 追加 `heliBox`；直升机步进用 `{...HELI_SITE,obstacles:[...HELI_SITE.obstacles,...vehicleHeliObstacles(plane,rover)]}`。游艇：`stepYacht` 仅用 `waterFree`（静态水域），直升机停机坪均在陆地，游艇与直升机不共享可达区域，故未加游艇盒（如日后有水上停机坪需补）。

## 验收
- rules：新 `test-frontier-presentation.mjs`（无人机爆炸/坠落/落地二次爆炸、炮塔与雷达 collapse、机甲脚步计数与扬尘、伤害比例、残骸状态、效果池上限、idle 安全）PASS；`test-helicopter-field.mjs` 追加飞机/越野车飞行障碍与直升机滑跑障碍断言 PASS。
- 分层：check 499/499，rules 111/115（4 FAIL 为用户未提交武器改动 halo/railspike/tempest/volt 的 `formatBossBattleRecord`，与本批无关），integration 43/43。
- 浏览器：`test-helicopter-field-browser.mjs`、`test-expedition-browser.mjs` EXIT=0（HEAD vehicle.html，跑完已恢复用户版本）。临时探针（未入库）在风电场 snipe 阶段击落两架无人机，`frontier.effects` 观察到 `['explode','explode']`、残骸 `wreckY` 归 0，页面无错误；swiftshader 截图耗时约 2 s，无法精确抓到爆炸瞬间，特效外观未做人工视觉验收。
- 未做：游艇↔直升机碰撞（理由见上）、音效（爆炸/脚步暂无音频）、手动游玩验收。
