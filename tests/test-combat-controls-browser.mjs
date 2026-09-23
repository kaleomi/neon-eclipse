// Real app input/damage/pickup paths. Deterministic clocks and actors exist only in this test response.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium} = await import(process.env.VEHICLE_PLAYWRIGHT_MODULE || 'playwright');
let server, browser;
const output = path.resolve(process.env.CONTROLS_TEST_OUTPUT || '.tools/qa-combat-controls');
const passes = [], pass = message => { passes.push(message); console.log('PASS ' + message); };
try {
  const port = await new Promise(resolve => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
  server = spawn(process.execPath, ['server.cjs'], {env: {...process.env, PORT: String(port)}, stdio: ['ignore', 'pipe', 'pipe']});
  await new Promise((resolve, reject) => { const t = setTimeout(() => reject(Error('server timeout')), 15000); server.stdout.on('data', b => { if (String(b).includes('ready')) { clearTimeout(t); resolve(); } }); server.on('error', reject); });
  await mkdir(output, {recursive: true});
  browser = await chromium.launch({headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport: {width: 1280, height: 800}}), page = await context.newPage(), errors = [];
  page.setDefaultTimeout(60000); page.on('pageerror', error => errors.push(error.stack));
  await page.addInitScript(() => localStorage.setItem('neon-eclipse.presentation.v1', JSON.stringify({quality: 0, motion: false, scale: 1, density: 'standard', strength: 1})));
  await page.route('**/app.js', async route => {
    const response = await route.fetch(); let source = await response.text();
    assert(source.includes('requestAnimationFrame(frame);'));
    source = source.replaceAll('requestAnimationFrame(frame);', '/* Test-only manual clock. */');
    source += String.raw`
window.__controls = {
  setup({primary=0, stage=0, pools={light:0,heavy:0,energy:0,grenade:0}, light=false, target=false}={}) {
    chapterIntro?.cancel(); reset(stage); state='playing'; document.body.dataset.playState=state; overlay.hidden=true;
    for(const enemy of enemies)scene.remove(enemy.group); enemies.length=0; enemyProjectiles.clear();
    enemyDirector.update=()=>0; engineerDirector.update=()=>{};
    firing=false;fireBuffer=0;keys.clear();cooldown=0;reload=0;meleeRemaining=0;meleePending=false;meleeStrike.cancel();
    if(light)fieldKit.reset({...defaultKit(),mode:'light'});
    typedAmmo.reset({version:1,pools},[],null,light);syncTypedAmmo();
    loadout.equip(primary);changeWeapon(2);handling.update(1,false);cooldown=0;
    camera.position.set(0,1.7,0);playerMotion.reset(camera.position,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);
    this.enemy=null;
    if(target){
      obstacles.length=0;
      const group=createEnemyModel('assault');group.position.set(0,0,-2.5);scene.add(group);
      this.enemy={group,type:'assault',hp:5000,maxHp:5000,boss:false,speed:0,attack:9999,radius:.65,charge:0,seed:0};enemies.push(this.enemy);
    }
    return this.snap();
  },
  snap(){hud();gameMenu.update(state);return {state,map:MAP_ID,selected:selectedCarriedWeapon(),runtime:selected,slots:loadout.state,rounds:rounds.slice(),reserves:reserves.slice(),pools:typedAmmo.state.pools,cp:checkpoint(),ord:ordnance.snapshot(),kit:fieldKit.snapshot(),fieldEnabled:!!fieldLayout,hp:this.enemy?.hp??null,attacks:telemetryShots[3]||0,firing,buffer:fireBuffer,cooldown,meleeRemaining,collected:missionWorld.collected,keys:[...document.querySelectorAll('.weapon-card-main strong')].map(n=>n.textContent)};},
  advance(seconds){for(let left=seconds;left>1e-8;){const dt=Math.min(.05,left);if(state==='playing')update(dt);left-=dt;}return this.snap();},
  resume(){state='playing';document.body.dataset.playState=state;overlay.hidden=true;return this.snap();},
  cache(index){const entry=STAGE_ENTRIES[index===9?1:index===10?2:3];camera.position.set(entry.x,(entry.feetY||0)+1.7,entry.z);playerMotion.reset(camera.position,entry.feetY||0);handling.update(1,false);cooldown=0;if(!ordnance.pick())throw Error('cache not claimed');return this.snap();},
  // A stationary elevated target is not pushed out of range by the hammer's normal ground knockback.
  faceTarget(){if(this.enemy)this.enemy.group.position.y=.3;camera.position.set(0,1.7,0);playerMotion.reset(camera.position,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);handling.update(1,false);cooldown=0;return this.snap();},
  supply(){const item=SUPPLIES.find(s=>s.type==='ammo'&&!missionWorld.collected.includes(s.id));if(!item)throw Error('missing ammo crate');camera.position.set(item.x,(item.feetY||0)+1.7,item.z);playerMotion.reset(camera.position,item.feetY||0);update(0);return {...this.snap(),crate:item.id};},
  restore(cp){reset(cp.stageIndex,cp);state='playing';document.body.dataset.playState=state;overlay.hidden=true;for(const e of enemies)scene.remove(e.group);enemies.length=0;return this.snap();},
  kitAmmo(value){fieldKit.reset({...defaultKit(),heavy:value});return this.snap();}
};`;
    await route.fulfill({response, body: source});
  });
  await page.goto('http://127.0.0.1:' + port + '/index.html?map=reactor&menu=chapter&intro=0');
  await page.waitForFunction(() => window.__controls && document.body.dataset.uiReady === 'true');
  const run = (name, arg) => page.evaluate(([name, arg]) => window.__controls[name](arg), [name, arg]);
  let s = await run('setup', {primary: 7});
  await page.keyboard.press('Digit1'); s = await run('snap');
  assert.equal(s.selected, 7, '1 must select the CURRENT carried primary, not legacy weapon zero');
  await page.keyboard.press('Digit2'); assert.equal((await run('snap')).selected, 2);
  await page.keyboard.press('Digit3'); s = await run('snap'); assert.equal(s.selected, 3);
  assert.deepEqual(s.keys, ['1', '2', '3']);
  for (const key of ['Digit4','Digit5','Digit6','Digit7','Digit8']) { await page.keyboard.press(key); assert.equal((await run('snap')).selected, 3, 'retired direct-inventory key: ' + key); }
  assert.equal(await page.evaluate(() => window.neonInput.bindings.codesFor('ammoType').length), 0);
  pass('native 1/2/3 address carried slots; HUD follows slots; old 4-8 cannot select inventory');

  for (const index of [9,10,11]) {
    await run('setup', {stage:3}); await run('cache', index);
    await page.keyboard.press('Digit2'); await page.keyboard.press(index===11?'Digit3':'Digit1');
    s=await run('snap'); assert.equal(s.selected,index); assert(s.ord.owned.includes(index)); assert.deepEqual(s.keys,['1','2','3']);
  }
  pass('same three hotkeys select owned launcher, penetrator and hammer without changing stored IDs');

  await run('setup',{target:true});await page.keyboard.press('Digit3');await run('advance',.3);
  const bladeStart=await run('snap');await page.mouse.move(640,400);await page.mouse.down();s=await run('advance',1.7);
  assert(s.attacks-bladeStart.attacks>=3&&s.attacks-bladeStart.attacks<=4,'blade repeats at its existing cadence');assert(s.hp<bladeStart.hp-190);
  await page.mouse.up();await run('advance',.6);const bladeReleased=await run('snap');s=await run('advance',1.3);assert.equal(s.attacks,bladeReleased.attacks);assert.equal(s.hp,bladeReleased.hp);
  pass('one left-button hold chains blade swings; release ends the chain without extra queued swings');

  await page.mouse.down();await run('advance',.1);await page.keyboard.press('Digit2');const swapped=await run('snap');s=await run('advance',1);assert.equal(s.attacks,swapped.attacks);assert.equal(s.hp,swapped.hp);assert(!s.firing);await page.mouse.up();
  await page.keyboard.press('Digit3');await run('advance',.3);await page.mouse.down();await run('advance',.3);await page.keyboard.press('Escape');s=await run('snap');assert.equal(s.state,'paused');assert(!s.firing);assert.equal(s.buffer,0);await page.mouse.up();await run('resume');await run('advance',.6);const resumed=await run('snap');s=await run('advance',1);assert.equal(s.attacks,resumed.attacks);
  await page.mouse.down();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));s=await run('snap');assert.equal(s.state,'paused');assert(!s.firing);await page.mouse.up();
  pass('swap, pause and blur interrupt the hold; resume does not create a ghost attack');

  await run('setup',{target:true,stage:3});await run('cache',11);await page.keyboard.press('Digit3');await run('faceTarget');
  const hammerStart=await run('snap');await page.mouse.down();s=await run('advance',4.5);assert(hammerStart.hp-s.hp>=400,'held hammer must complete at least two real impacts');assert(hammerStart.hp-s.hp<=600,'existing hammer cooldown/charge remains bounded');
  await page.mouse.up();const hammerReleased=await run('snap');s=await run('advance',2);assert.equal(s.hp,hammerReleased.hp);assert(!s.ord.charging);assert.deepEqual(s.pools,hammerStart.pools);
  pass('hammer holds chain complete charge/impact cycles; release cancels pending charge; no ammo consumed');

  await run('setup');await page.keyboard.press('Digit2');await run('advance',.3);const pistolStart=await run('snap');await page.mouse.down();s=await run('advance',1.5);await page.mouse.up();assert.equal(pistolStart.rounds[2]-s.rounds[2],1,'semi-auto guns must stay semi-auto');
  await page.keyboard.press('Digit1');await run('advance',.3);const rifleStart=await run('snap');await page.mouse.down();s=await run('advance',.6);await page.mouse.up();assert(rifleStart.rounds[0]-s.rounds[0]>=3);
  pass('melee repeat does not convert semi-auto guns or remove automatic rifle fire');

  const normal={light:150,heavy:113,energy:48,grenade:4},caps={light:600,heavy:450,energy:192,grenade:14};
  const empty=await run('setup');for(let i=0;i<5;i++)await page.keyboard.press('KeyB');s=await run('supply');
  assert.deepEqual(s.pools,normal);assert(s.collected.includes(s.crate));assert.deepEqual(s.rounds,empty.rounds);assert.deepEqual(s.ord.owned,[]);assert.equal(s.cp.emp.charges,empty.cp.emp.charges);assert.deepEqual(s.cp.tactical,empty.cp.tactical);
  const saved=s.cp,restored=await run('restore',saved);assert.deepEqual(restored.pools,normal);assert.deepEqual(restored.cp.typedAmmo,saved.typedAmmo);assert(restored.collected.includes(s.crate));
  pass('one actual crate grants all four pools by 25%, ignores B and preserves magazines, locks, tools and checkpoint values');

  await run('setup',{pools:{light:599,heavy:449,energy:191,grenade:13}});s=await run('supply');assert.deepEqual(s.pools,caps);assert(s.collected.includes(s.crate));
  await run('setup',{pools:caps});s=await run('supply');assert(!s.collected.includes(s.crate),'full inventory must not spend a crate');assert.deepEqual(s.pools,caps);
  await run('setup',{pools:{...caps,energy:0}});s=await run('supply');assert.deepEqual(s.pools,{...caps,energy:48});assert(s.collected.includes(s.crate));
  pass('partial caps never overflow; any deficient type can collect; fully stocked crates stay on the ground');

  s=await run('setup',{light:true});assert(s.fieldEnabled,'reactor fixture has field-kit support');s=await run('supply');assert.deepEqual(s.pools,{light:98,heavy:73,energy:31,grenade:4});
  await run('setup',{pools:caps});await run('kitAmmo',0);s=await run('supply');assert.equal(s.kit.heavy,1);assert(s.collected.includes(s.crate));assert.deepEqual(s.pools,caps);assert.equal(s.cp.emp.charges,2);
  pass('25% uses light-load capacities; independent pulse-cannon ammo is included, not throwable charges');

  const baseline=await run('setup');const future={...baseline.cp,typedAmmo:{version:99,opaque:['keep',25]}};await run('restore',future);s=await run('supply');assert.deepEqual(s.cp.typedAmmo,future.typedAmmo);assert(!s.collected.includes(s.crate));
  pass('future ammo payload is preserved verbatim and cannot consume or mutate supply');
  assert.deepEqual(errors,[]);
  await writeFile(path.join(output,'results.json'),JSON.stringify({passes,errors,lastSnapshot:s},null,2)+'\n');
  console.log('TOTAL '+passes.length+' groups');await context.close();
}finally{await browser?.close();server?.kill();}
