// Isolated Chromium + software WebGL; no real player profile or saves.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { FIELD_LAYOUTS } from '../src/field-layouts.js';
const { chromium } = await import(process.env.VEHICLE_PLAYWRIGHT_MODULE || 'playwright');
const output = '.tools/qa-environment-props';
let child, browser;
const errors = [], passes = [], loaded = [];
const pass = text => { passes.push(text); console.log('PASS ' + text); };
try {
  await mkdir(output, { recursive: true });
  const port = await new Promise((resolve, reject) => {
    const server = createServer(); server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
  child = spawn(process.execPath, ['server.cjs'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('server timeout')), 15000);
    child.stdout.on('data', data => { if (String(data).includes('ready')) { clearTimeout(timer); resolve(); } });
    child.on('error', reject); child.on('exit', code => { clearTimeout(timer); reject(Error('server exit ' + code)); });
  });
  const base = `http://127.0.0.1:${port}`;
  browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().endsWith('.glb')) loaded.push({ url: response.url(), status: response.status() }); });
  const waitPreview = async (type, source) => {
    await page.waitForFunction(([type, source]) => document.body.dataset.assetReady === 'error' ||
      (document.body.dataset.assetReady === type && document.body.dataset.assetSource === source), [type, source]);
    const state = await page.evaluate(() => ({ ready: document.body.dataset.assetReady, source: document.body.dataset.assetSource, status: document.querySelector('#status').textContent }));
    assert.equal(state.ready, type, state.status); assert.equal(state.source, source, state.status);
  };
  await page.goto(base + '/environment-props-preview.html');
  for (const type of ['vent', 'light', 'nozzle', 'node']) {
    await page.selectOption('#asset', type);
    await waitPreview(type, 'glb');
    const glb = await page.evaluate(() => window.__environmentPropsPreview.stats()); assert(glb.meshes > 0);
    if (type !== 'nozzle') await page.selectOption('#state', 'ready');
    await page.evaluate(() => window.__environmentPropsPreview.render());
    await page.screenshot({ path: `${output}/${type}-glb.png` });
    await page.locator('#stage').screenshot({ path: `${output}/${type}-detail.png` });
    await page.click('#back'); await page.evaluate(() => window.__environmentPropsPreview.render());
    await page.screenshot({ path: `${output}/${type}-back.png` });
    if (type !== 'nozzle') {
      await page.selectOption('#state', type === 'node' ? 'spent' : 'off');
      await page.screenshot({ path: `${output}/${type}-state.png` });
      await page.selectOption('#state', 'ready');
    }
    await page.selectOption('#source', 'procedural');
    await waitPreview(type, 'procedural');
    const source = await page.evaluate(() => window.__environmentPropsPreview.stats());
    assert.equal(source.triangles, glb.triangles); assert.equal(source.meshes, glb.meshes);
    await page.check('#wire'); await page.uncheck('#wire');
    await page.selectOption('#source', 'glb'); await waitPreview(type, 'glb');
    pass(type + ' GLB/source parity, front/back views, status controls and wireframe');
  }
  assert(loaded.length >= 4 && loaded.every(item => item.status === 200));
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${output}/mobile.png`, fullPage: true });
  pass('390px inspector without horizontal overflow');
  await context.close();

  // Read-only inspection appended to the real application. No startup shim, clock or actor replacement.
  const game = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const p = await game.newPage(); p.setDefaultTimeout(90000);
  p.on('pageerror', error => errors.push(error.message));
  await p.route('**/app.js', async route => {
    const response = await route.fetch(), source = await response.text();
    await route.fulfill({ response, body: source + `\nwindow.__environmentPropsQA={snapshot(){const props=[];scene.traverse(o=>{if(o.userData.environmentProp)props.push(o.userData.environmentProp);});return {props,consoles:obstacles.filter(o=>o.interaction).length,nodeTargets:obstacles.filter(o=>o.mesh?.userData.energyNode!==undefined).length,state};}};` });
  });
  for (const map of ['reactor', 'station', 'train']) {
    await p.goto(base + '/index.html?map=' + map + '&menu=chapter');
    await p.waitForFunction(() => !!window.__environmentPropsQA);
    let snapshot = await p.evaluate(() => window.__environmentPropsQA.snapshot());
    for (const type of ['vent', 'light', 'nozzle']) assert.equal(snapshot.props.filter(value => value === type).length, 1, map + ' ' + type);
    assert.equal(snapshot.consoles, 2);
    await p.click('#deploy'); await p.waitForFunction(() => document.body.dataset.playState === 'playing');
    snapshot = await p.evaluate(() => window.__environmentPropsQA.snapshot());
    const authoredNodes = FIELD_LAYOUTS[map]?.nodes.length || 0;
    assert.equal(snapshot.props.filter(type => type === 'node').length, authoredNodes, map + ' matches authored node count');
    assert.equal(snapshot.nodeTargets, authoredNodes, map + ' retains authored energy node targets');
    await p.screenshot({ path: `${output}/game-${map}.png` });
    pass(map + ' unmodified production startup/deploy and authored props with legacy targets');
  }
  assert.deepEqual(errors, []); await game.close();
  await writeFile(output + '/result.json', JSON.stringify({ passes, errors, loaded, renderer: 'SwiftShader', boundaries: 'Gallery and native production startup, not natural completion, visual sign-off or target-GPU performance.' }, null, 2) + '\n');
  console.log('PASS environment props browser: ' + passes.length + ' groups');
} catch (error) {
  await writeFile(output + '/failure.json', JSON.stringify({ error: error.stack, passes, errors, loaded }, null, 2) + '\n');
  throw error;
} finally { await browser?.close(); child?.kill(); }
