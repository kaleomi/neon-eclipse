// Geometry regression for the actual UI/CSS, including the legacy weapon skins.
// A UI-only fixture replaces app.js: real controls/models, no WebGL loop or player storage.
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import path from 'node:path';

const {chromium} = await import(process.env.VEHICLE_PLAYWRIGHT_MODULE || 'playwright');
const output = path.resolve(process.env.UI_LAYOUT_OUTPUT || '.tools/qa-clean-ui-layout');
const measurements = [], errors = [];
let browser, server;

try {
  const port = await new Promise(resolve => {
    const socket = createServer();
    socket.listen(0, '127.0.0.1', () => {
      const value = socket.address().port;
      socket.close(() => resolve(value));
    });
  });
  server = spawn(process.execPath, ['server.cjs'], {
    env: {...process.env, PORT: String(port)}, stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('UI fixture server timeout')), 15000);
    server.stdout.on('data', chunk => {
      if (String(chunk).includes('ready')) { clearTimeout(timer); resolve(); }
    });
    server.on('error', error => { clearTimeout(timer); reject(error); });
    server.on('exit', code => { clearTimeout(timer); reject(Error('Server exited: ' + code)); });
  });
  await mkdir(output, {recursive: true});
  browser = await chromium.launch({headless: true, args: ['--disable-gpu']});
  const context = await browser.newContext({viewport: {width: 1280, height: 800}, locale: 'zh-CN'});
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  const source = await readFile('session-chrome.js', 'utf8');
  const overlay = source.match(/overlay\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1];
  assert(overlay, 'Read the actual mount markup, not a hand-authored menu substitute');
  await page.route('**/app.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: "import {mountCleanFixture} from '../src/browser-ui-clean-fixture.js';mountCleanFixture(" + JSON.stringify(overlay) + ');'
  }));
  await page.goto('http://127.0.0.1:' + port + '/index.html');
  await page.waitForFunction(() => window.__cleanUI && document.body.dataset.uiReady === 'true');

  async function configure(density, primary = '0', melee = '3') {
    await page.evaluate(() => { window.__cleanUI.setState('ready'); window.__cleanUI.menu.home(); });
    await page.click('#menu-settings');await page.click('#settings-tab-gameplay');await page.click('[data-menu-gear]');
    await page.selectOption('.carry-panel [data-primary]', primary);
    await page.selectOption('.carry-panel [data-melee]', melee);
    await page.click('.carry-panel [data-equip]');
    await page.click('.carry-panel [data-close]');
    await page.click('#settings-tab-interface');
    await page.selectOption('#hud-density', density);
    await page.evaluate(() => window.__cleanUI.setState('playing'));
  }

  async function measure(name, {width, height, scale = 1, screenshot = false}) {
    await page.setViewportSize({width, height});
    // Test the supported HUD scale independently of input-event behavior.
    await page.evaluate(value => document.documentElement.style.setProperty('--hud-scale', value), String(scale));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const result = await page.evaluate(() => {
      const rect = node => {
        const {left, top, right, bottom, width, height} = node.getBoundingClientRect();
        return {left, top, right, bottom, width, height};
      };
      const visible = node => !!node && !!node.getClientRects().length && getComputedStyle(node).display !== 'none' && !node.closest('[hidden]');
      const cards = [...document.querySelectorAll('.equipped-rack .loadout-card')].filter(visible).map(card => ({
        name: card.querySelector('.weapon-card-name b').textContent,
        kind: card.dataset.ammoKind,
        active: card.classList.contains('active'),
        rect: rect(card),
        parts: [...card.querySelectorAll('.weapon-card-main,.weapon-card-ammo,.weapon-ammo-caption,.weapon-ammo-track,.weapon-ammo-detail')].filter(visible).map(node => ({className: node.className, rect: rect(node)})),
        percentage: card.querySelector('.weapon-ammo-caption b').textContent
      }));
      return {density: document.body.dataset.hudDensity, rack: rect(document.querySelector('.equipped-rack')), cards};
    });
    measurements.push({name, width, height, scale, ...result});
    // Save even on a red regression so the clipping is visible, not just asserted.
    if (screenshot) await page.screenshot({path: path.join(output, name + '.png')});
    await writeFile(path.join(output, 'measurements.json'), JSON.stringify(measurements, null, 2) + '\n');
    assert.equal(result.cards.length, 3, name + ': exactly three equipped weapons');
    for (const [index, card] of result.cards.entries()) {
      assert(card.rect.left >= -1 && card.rect.top >= -1 && card.rect.right <= width + 1 && card.rect.bottom <= height + 1, name + ': card stays in viewport: ' + card.name);
      assert(card.parts.some(part => part.className === 'weapon-ammo-track'), name + ': ammo bar stays visible');
      assert(card.kind === 'melee' ? card.percentage === '∞' : /^\d+%$/.test(card.percentage), name + ': percent or real unlimited-melee label');
      for (const part of card.parts) {
        assert(part.rect.left >= card.rect.left - 1 && part.rect.right <= card.rect.right + 1 && part.rect.top >= card.rect.top - 1 && part.rect.bottom <= card.rect.bottom + 1,
          name + ': ' + card.name + ' / ' + part.className + ' must fit INSIDE its own card');
      }
      const main = card.parts.find(part => part.className === 'weapon-card-main');
      const ammo = card.parts.find(part => part.className === 'weapon-card-ammo');
      assert(main.rect.bottom <= ammo.rect.top + 1, name + ': percentage is BELOW weapon identity');
      if (index) assert(result.cards[index - 1].rect.bottom < card.rect.top, name + ': cards never overlap');
    }
    console.log('PASS ' + name + ': all three ammo rows contained, legible and separate');
  }

  // Start with the reproduced compact-mode defect (inactive cards previously fixed at 32px).
  await configure('compact');
  await measure('compact-1280x800', {width: 1280, height: 800, screenshot: true});
  for (const density of ['standard', 'compact']) {
    await page.setViewportSize({width: 1280, height: 800});
    await configure(density);
    for (const [width, height] of [[1440, 960], [1024, 640], [390, 844]]) {
      for (const scale of [.8, 1, 1.15]) {
        await measure(density + '-' + width + 'x' + height + '-scale-' + scale, {width, height, scale, screenshot: scale === 1});
      }
    }
  }
  // HALO's legacy :has(...) skin has an even more specific compact-height rule.
  await page.setViewportSize({width: 1280, height: 800});
  await configure('compact', '5');
  await measure('compact-halo-1280x800', {width: 1280, height: 800, screenshot: true});
  // Longer Chinese names remain readable at the narrow breakpoint.
  await configure('standard', '7');
  await measure('long-name-390x844', {width: 390, height: 844, scale: 1, screenshot: true});

  // Action buttons must be fully in view, not merely attached/"visible" below a clipped footer.
  for (const [width, height, notice] of [[1440, 960, false], [1024, 640, false], [390, 844, false], [1024, 640, true]]) {
    await page.setViewportSize({width, height});
    for (const state of ['paused', 'won', 'lost']) {
      await page.evaluate(value => window.__cleanUI.setState(value), state);
      await page.evaluate(warning => { const note = document.getElementById('menu-notice'); note.hidden = !warning; note.textContent = warning ? '存档暂未完成，请检查本地存储后重试。既有记录不会被覆盖。' : ''; }, notice);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const result = await page.evaluate(() => {
        const button = document.getElementById('deploy'), view = document.querySelector('.menu-views');
        const b = button.getBoundingClientRect(), v = view.getBoundingClientRect();
        const points = [[b.left + 7, b.top + 7], [b.right - 7, b.top + 7], [b.left + b.width / 2, b.bottom - 7]];
        return {button: {top: b.top, bottom: b.bottom, left: b.left, right: b.right},
          view: {top: v.top, bottom: v.bottom, left: v.left, right: v.right},
          hit: points.every(([x, y]) => button.contains(document.elementFromPoint(x, y))),
          headingSize: parseFloat(getComputedStyle(document.getElementById('menu-context-title')).fontSize)};
      });
      const name = 'context-' + state + '-' + width + 'x' + height + (notice ? '-notice' : '');
      measurements.push({name, width, height, ...result});
      await page.screenshot({path: path.join(output, name + '.png')});
      await writeFile(path.join(output, 'measurements.json'), JSON.stringify(measurements, null, 2) + '\n');
      assert(result.button.top >= result.view.top && result.button.bottom <= result.view.bottom,
        name + ': resume / continue / retry stays above the footer without scrolling');
      assert(result.button.left >= 0 && result.button.right <= width && result.hit, name + ': entire primary button is clickable');
      assert(result.headingSize <= 32, name + ': inherited oversized heading is retired');
      console.log('PASS ' + name + ': primary action visible and reachable without scrolling');
    }
  }

  assert.deepEqual(errors, [], 'No page errors during layout checks');
  console.log('TOTAL ' + measurements.length + ' layout cases; artifacts ' + output);
  await context.close();
} finally {
  await browser?.close();
  server?.kill();
}
