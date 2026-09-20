// Isolated Chromium contexts + temporary server. Never touch the player's profile or saves.
// Software WebGL is functional/visual evidence, not target-device performance acceptance.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium} = await import(process.env.VEHICLE_PLAYWRIGHT_MODULE || 'playwright');
const root = path.dirname(fileURLToPath(import.meta.url));
const destination = path.join(root, '.tools', 'qa-ranged-guard');
await mkdir(destination, {recursive: true});
let server, browser; const checks = [];
const record = (name, data = {}) => { checks.push({name, ...data}); console.log('PASS:', name, JSON.stringify(data)); };
async function pageFor(context) {
  const p = await context.newPage(), errors = [];
  p.setDefaultTimeout(60000); p.on('pageerror', e => errors.push(e.message)); return {p, errors};
}
async function instrument(context) {
  await context.route('**/app.js', async route => {
    const response = await route.fetch(); let source = await response.text();
    const tick = "if(state==='playing')update(dt);";
    assert(source.includes(tick), 'test fixture must recognize the current game frame loop');
    source = source.replace(tick, 'if(false)update(dt);');
    source += `
window.__r07Integration = {
 setup(){reset(0);this.r=enemies.find(e=>e.type==='ranged');if(!this.r)throw Error('No natural ranged spawn');
  camera.position.set(0,1.7,29);playerMotion.reset(camera.position,0);
  for(const [i,e] of enemies.entries()){e.group.position.set(e===this.r?0:25+i*2,0,e===this.r?22:-25);e.group.rotation.y=0;e.speed=0;e.attack=99;e.charge=0;}
  state='playing';document.body.dataset.playState=state;overlay.hidden=true;cooldown=0;reload=0;selected=0;handling.update(1,false);health=100;
  scene.updateMatrixWorld(true);this.aim();update(0);return this.snapshot();},
 aim(){const head=this.r.group.children.find(m=>m.userData.hitZone==='head');scene.updateMatrixWorld(true);camera.lookAt(head.getWorldPosition(new THREE.Vector3()));yaw=camera.rotation.y;pitch=camera.rotation.x;},
 fire(){cooldown=0;handling.update(1,false);this.aim();shoot();return this.snapshot();},
 snapshot(){const r=this.r||enemies.find(e=>e.type==='ranged');return {hp:r?.hp,source:r?.group.userData.rangedGuardSource,proxies:r?.group.children.filter(m=>m.isMesh).length,visuals:r?.group.children.filter(m=>m.name==='R07_Visual').length,headshot:!!fieldRecord,shots:telemetryShots[0],kills,geometry:renderer.info.memory.geometries,types:enemies.map(e=>e.type)};},
 remember(){this.old=this.r.group;return this.old.userData.rangedGuardSource;},
 oldState(){return {parent:!!this.old.parent,source:this.old.userData.rangedGuardSource,visuals:this.old.children.filter(m=>m.name==='R07_Visual').length};},
 render(){renderer.render(scene,camera);return this.snapshot();}
};`;
    await route.fulfill({response, body: source});
  });
}
try {
  const port = await new Promise(resolve => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
  server = spawn(process.execPath, ['server.cjs'], {cwd: root, env: {...process.env, PORT: String(port)}, stdio: ['ignore', 'pipe', 'pipe']});
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('server timeout')), 20000);
    server.stdout.on('data', d => { if (String(d).includes('ready')) { clearTimeout(timer); resolve(); } }); server.on('error', reject); });
  const base = `http://127.0.0.1:${port}`;
  browser = await chromium.launch({headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});

  const previewContext = await browser.newContext({viewport: {width: 1440, height: 1000}});
  const {p: preview, errors: previewErrors} = await pageFor(previewContext);
  await preview.goto(base + '/enemy-ranged-preview.html');
  await preview.waitForFunction(() => window.__r07Preview?.state.ready);
  assert.equal(await preview.evaluate(() => __r07Preview.state.source), 'glb');
  await preview.locator('#pause').check();
  await preview.screenshot({path: path.join(destination, 'r07-hero.png')});
  for (const motion of ['Patrol', 'Aim', 'Hit', 'Idle']) {
    await preview.click(`[data-motion="${motion}"]`); assert.equal(await preview.getAttribute(`[data-motion="${motion}"]`, 'aria-pressed'), 'true');
  }
  await preview.locator('#wireframe').check();
  assert(await preview.evaluate(() => { let yes = true; __r07Preview.model.traverse(o => { if (o.isMesh && !o.material.wireframe) yes = false; }); return yes; }));
  await preview.locator('#wireframe').uncheck();
  await preview.click('[data-view="back"]'); await preview.screenshot({path: path.join(destination, 'r07-back.png')});
  await preview.click('[data-view="front"]'); await preview.screenshot({path: path.join(destination, 'r07-front.png')});
  record('preview loads real GLB; four clips, wireframe and camera controls', await preview.evaluate(() => __r07Preview.state.stats));
  await preview.setViewportSize({width: 390, height: 844});
  assert(await preview.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert(await preview.locator('.download').isVisible());
  await preview.screenshot({path: path.join(destination, 'r07-mobile.png'), fullPage: true});
  assert.deepEqual(previewErrors, []); record('390px preview has no horizontal overflow or page errors');
  await previewContext.close();

  const context = await browser.newContext({viewport: {width: 1280, height: 800}});
  await instrument(context);
  const {p, errors} = await pageFor(context); const requests = [];
  p.on('request', r => { if (r.url().endsWith('/models/ranged-guard-r07.glb')) requests.push(r.url()); });
  await p.goto(base + '/index.html?map=reactor&menu=chapter');
  await p.waitForFunction(() => !!window.__r07Integration);
  await p.evaluate(() => localStorage.setItem('r07-test-sentinel', 'keep'));
  await p.evaluate(() => __r07Integration.setup());
  await p.waitForFunction(() => __r07Integration.snapshot().source === 'glb');
  const before = await p.evaluate(() => __r07Integration.snapshot());
  assert.equal(before.visuals, 1); assert(before.proxies > 10); assert(before.types.includes('assault') && before.types.includes('heavy'));
  await p.screenshot({path: path.join(destination, 'r07-in-game.png')});
  const after = await p.evaluate(() => __r07Integration.fire());
  assert(after.hp < before.hp, 'native game shoot damages new GLB-backed enemy'); assert.equal(after.shots, before.shots + 1);
  record('natural reactor ranged spawn loads GLB and the real shoot path damages it', {beforeHp: before.hp, afterHp: after.hp});
  await p.screenshot({path: path.join(destination, 'r07-hit.png')});
  for (let i = 0; i < 6; i++) { await p.evaluate(() => __r07Integration.setup()); await p.waitForFunction(() => __r07Integration.snapshot().source === 'glb'); }
  assert.equal(requests.length, 1, 'all instances/resets share a single asset request');
  assert.equal(await p.evaluate(() => __r07Integration.snapshot().visuals), 1);
  assert.equal(await p.evaluate(() => localStorage.getItem('r07-test-sentinel')), 'keep');
  assert.deepEqual(errors, []); record('six resets: one GLB request, one visual per enemy, isolated storage preserved');
  await context.close();

  const delayed = await browser.newContext({viewport: {width: 960, height: 720}}); await instrument(delayed);
  let release; const gate = new Promise(resolve => { release = resolve; });
  await delayed.route('**/models/ranged-guard-r07.glb', async route => { await gate; await route.continue(); });
  const {p: dp, errors: de} = await pageFor(delayed);
  await dp.goto(base + '/index.html?map=reactor&menu=chapter'); await dp.waitForFunction(() => !!window.__r07Integration);
  await dp.evaluate(() => __r07Integration.setup());
  assert.equal(await dp.evaluate(() => __r07Integration.remember()), 'procedural');
  const dhp = await dp.evaluate(() => __r07Integration.snapshot().hp);
  assert((await dp.evaluate(() => __r07Integration.fire())).hp < dhp, 'fallback is hittable before network completes');
  await dp.evaluate(() => __r07Integration.setup()); release();
  await dp.waitForFunction(() => __r07Integration.snapshot().source === 'glb');
  const old = await dp.evaluate(() => __r07Integration.oldState());
  assert.equal(old.parent, false); assert.equal(old.source, 'procedural'); assert.deepEqual(de, []);
  record('delayed GLB: fallback is hittable; reset/disposed instance is not resurrected'); await delayed.close();

  const offline = await browser.newContext({viewport: {width: 960, height: 720}}); await instrument(offline);
  await offline.route('**/models/ranged-guard-r07.glb', route => route.fulfill({status: 404, body: 'intentional asset-failure fixture'}));
  const {p: op, errors: oe} = await pageFor(offline);
  await op.goto(base + '/index.html?map=reactor&menu=chapter'); await op.waitForFunction(() => !!window.__r07Integration);
  await op.evaluate(() => __r07Integration.setup());
  await op.waitForFunction(() => __r07Integration.snapshot().source === 'procedural-fallback');
  const hp = await op.evaluate(() => __r07Integration.snapshot().hp);
  assert((await op.evaluate(() => __r07Integration.fire())).hp < hp); assert.deepEqual(oe, []);
  record('404 GLB: visual fallback and native shooting remain functional'); await offline.close();
  await writeFile(path.join(destination, 'results.json'), JSON.stringify({checks, softwareWebGL: true, targetHardwareValidated: false}, null, 2) + '\n');
  console.log(`PASS ${checks.length} browser acceptance groups`);
} finally { await browser?.close(); server?.kill(); }
