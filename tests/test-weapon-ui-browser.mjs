// Native skip/scroll/buttons in isolated browser storage. World/ammo fixtures and forced drop rolls
// are test-response-only; they do not claim natural chapter completion or hardware performance.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const artifacts=process.env.UI_POLISH_ARTIFACTS||path.resolve('.tools/qa-ui-polish');
let browser,server;
const passed=[];
function check(label,value=true){assert(value,label);passed.push(label);console.log('PASS '+label);}
// Pointer lock deliberately retargets native mouse events to the game canvas. Click real coordinates
// rather than requiring Playwright's unlocked-DOM hit target; never dispatch a synthetic element.click().
async function nativeClick(page,selector){const rect=await page.locator(selector).boundingBox();assert(rect&&rect.width>0&&rect.height>0,'visible native target '+selector);await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);}
try{
 const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n));});});
 server=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),15000);server.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:800}}),p=await context.newPage(),errors=[];p.setDefaultTimeout(60000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();
  assert(source.includes("if(state==='playing')update(dt);"));
  source=source.replace("if(state==='playing')update(dt);","if(state==='playing'&&!window.__polishFreeze)update(dt);");
  source=source.replace('renderer.render(scene,camera);requestAnimationFrame(frame);','renderer.render(scene,camera);if(!window.__polishCapture)requestAnimationFrame(frame);else window.__polishCaptured=true;');
  source=source.replace('const weaponDrops=createWeaponDrops({','const weaponDrops=createWeaponDrops({random:()=>window.__dropRoll??Math.random(),');
  source+=`
window.__uiPolish={
 snap(){return {state,selected,carried:selectedCarriedWeapon(),special:selectedSpecial,carry:loadout.state,rounds:[...rounds],typed:typedAmmo.state,ordnance:ordnance.snapshot(),drops:weaponDrops.snapshot(),intro:chapterIntro?{active:chapterIntro.active,hidden:chapterIntro.element.hidden,display:getComputedStyle(chapterIntro.element).display,time:chapterIntro.time}:null,keys:[...keys],health,kills};},
 lowQuality(){for(let n=0;n<3&&document.body.dataset.renderQuality!=='0';n++)toggleQuality();},
 resumeFrames(){if(window.__polishCaptured){window.__polishCapture=false;window.__polishCaptured=false;last=performance.now();requestAnimationFrame(frame);}},
 fresh(){reset(0);window.__polishFreeze=true;for(const e of enemies)disposeGroup(e.group);enemies.length=0;enemyDirector.clear?.();enemyProjectiles.clear();state='playing';document.body.dataset.playState=state;overlay.hidden=true;firing=false;aiming=false;keys.clear();cooldown=0;handling.update(1,false);hud();return this.snap();},
 intro(){this.fresh();beginChapterIntro();return this.snap();},
 tick(dt){if(state==='playing')update(dt);hud();return this.snap();},
 equip(primary=0,melee=3){ordnance.reset({version:1,owned:[9,10,11],rounds:[1,2,0],reserve:[7,10,0]});loadout.equip(primary);loadout.equipMelee(melee);changeWeapon(primary);cooldown=0;handling.update(1,false);hud();return this.snap();},
 ammo(mode){selectedSpecial=null;loadout.equip(0);changeWeapon(0);rounds[0]=0;typedAmmo.reset({version:1,pools:{light:60,heavy:mode==='reload'?120:0,energy:24,grenade:4}});syncTypedAmmo();reload=0;cooldown=0;handling.update(1,false);hud();return this.snap();},
 drop(roll=.99,roles=['heavy']){this.fresh();window.__dropRoll=roll;weaponDrops.reset();camera.position.set(0,1.7,0);playerMotion.reset(camera.position,0);camera.rotation.set(0,0,0);yaw=pitch=0;obstacles.length=0;this.corpse=null;for(let i=0;i<roles.length;i++){const e={type:roles[i],hp:0,group:{position:new THREE.Vector3((i%2)*1.3-.3,0,-1.45-Math.floor(i/2)*.7)}};weaponDrops.drop(e);this.corpse=e;}hud();return this.snap();},
 repeatDrop(){weaponDrops.drop(this.corpse);return this.snap();},
 gallery(){this.drop(0,['assault','heavy','ranged','harborElite']);camera.position.set(0,3.6,2.4);camera.lookAt(0,.35,-1.9);yaw=camera.rotation.y;pitch=camera.rotation.x;playerMotion.reset(camera.position,1.9);hud();return this.snap();},
 heavyEmpty(){ordnance.reset({version:1,owned:[9,10,11],rounds:[0,0,0],reserve:[7,10,0]});typedAmmo.reset({version:1,pools:{light:60,heavy:90,energy:60,grenade:5}});hud();return this.snap();}
};`;await route.fulfill({response,body:source});});
 async function capture(file){
  // Read one fully rendered frame with the GPU idle; this is a screenshot fixture, not a performance claim.
  await p.evaluate(()=>window.__polishCapture=true);await p.waitForFunction(()=>window.__polishCaptured===true);
  await p.screenshot({path:path.join(artifacts,file),timeout:30000});await p.evaluate(()=>window.__uiPolish.resumeFrames());
 }
 async function exercise(){
 if(process.argv.includes('--layout')){
  await p.goto(`http://127.0.0.1:${port}/index.html?map=reactor&menu=chapter&intro=0`);await p.waitForFunction(()=>!!window.__uiPolish);await p.evaluate(()=>window.__uiPolish.lowQuality());await p.click('#deploy');await p.waitForFunction(()=>document.body.dataset.menuOpen==='false');await p.evaluate(()=>window.__uiPolish.fresh());
  await mkdir(artifacts,{recursive:true});
  for(const [width,height] of [[1280,800],[960,720],[700,800],[1280,600]]){
   await p.setViewportSize({width,height});await p.waitForFunction(()=>document.querySelector('.emp-status')?.parentElement.classList.contains('equipped-rack'));
   const layout=await p.locator('.loadout-card').evaluateAll(cards=>cards.map(c=>{const r=c.getBoundingClientRect(),ammo=c.querySelector('.weapon-card-ammo').getBoundingClientRect();return {height:r.height,inside:ammo.bottom<=r.bottom+1,visible:getComputedStyle(c).display!=='none',detailSize:parseFloat(getComputedStyle(c.querySelector('.weapon-ammo-detail')).fontSize)};}));
   assert.equal(layout.length,3);assert(layout.every(c=>c.visible&&c.inside),'ammo rows must fit their own cards: '+JSON.stringify(layout));
   const overlap=await p.evaluate(()=>{const a=document.querySelector('.right-panel').getBoundingClientRect(),b=document.querySelector('footer .ammo').getBoundingClientRect();return {bottom:a.bottom,footer:b.top,inside:a.right<=innerWidth+1,top:a.top};});
   assert(overlap.inside&&overlap.top>=68&&overlap.bottom<=overlap.footer+1,'rack and footer must not overlap '+JSON.stringify(overlap));
   await capture(`layout-${width}x${height}.png`);check('ammo rows / utility / footer layout '+width+'x'+height);
  }
  await p.setViewportSize({width:1280,height:800});await p.evaluate(()=>window.__uiPolish.gallery());await capture('distinct-ground-weapons-final.png');assert.deepEqual(errors,[]);check('final rendered layout has no page errors');await context.close();return;
 }
 const url=`http://127.0.0.1:${port}/index.html?map=reactor&menu=chapter&intro=1`;
 await p.goto(url);await p.waitForFunction(()=>!!window.__uiPolish);await p.click('#deploy');
 await p.waitForFunction(()=>document.body.dataset.cinematic==='true');await p.keyboard.press('Space');
 await p.waitForFunction(()=>{const el=document.querySelector('.chapter-intro');return el?.hidden&&getComputedStyle(el).display==='none';});
 check('native Space removes the visible overlay, not only its hidden attribute');
 const run=(m,...args)=>p.evaluate(([m,args])=>window.__uiPolish[m](...args),[m,args]);
 let s=await run('snap');assert.equal(s.state,'playing');assert(!s.keys.includes('Space'));check('skip does not leak a held jump key');
 await run('intro');await p.keyboard.press('Enter');await p.waitForFunction(()=>!window.__uiPolish.snap().intro.active);assert.equal((await run('snap')).intro.display,'none');check('Enter skips immediately');
 await run('intro');await nativeClick(p,'[data-intro-close]');await p.waitForFunction(()=>!window.__uiPolish.snap().intro.active);assert.equal((await run('snap')).intro.display,'none');check('visible close button dismisses intro');
 await run('intro');await nativeClick(p,'[data-intro-skip]');await p.waitForFunction(()=>!window.__uiPolish.snap().intro.active);check('mouse skip remains usable');
 await run('intro');await p.keyboard.press('Escape');await p.waitForFunction(()=>document.body.dataset.playState==='paused');assert.equal((await run('snap')).intro.display,'none');check('Escape closes intro and preserves pause-menu semantics');
 await run('intro');await p.waitForFunction(()=>!window.__uiPolish.snap().intro.active,null,{timeout:18000});assert.equal((await run('snap')).intro.display,'none');check('intro automatically ends on real elapsed time');
 await run('fresh');await p.waitForFunction(()=>document.querySelectorAll('.loadout-card').length===3);
 assert.deepEqual(await p.locator('.loadout-card').evaluateAll(es=>es.map(e=>Number(e.dataset.weaponIndex))),[0,2,3]);
 assert.equal(await p.locator('.loadout-card:visible').count(),3);check('exactly three actual equipped cards are visible');
 const names=await p.locator('.weapon-card-name b').allTextContents();assert.deepEqual(names,['先锋突击步枪','幽灵消音手枪','电弧战刃']);check('weapon names are Chinese');
 await p.mouse.move(620,400);await p.mouse.wheel(0,120);await p.waitForFunction(()=>window.__uiPolish.snap().carried===2);await p.waitForTimeout(190);await p.mouse.wheel(0,120);await p.waitForFunction(()=>window.__uiPolish.snap().carried===3);await p.waitForTimeout(190);await p.mouse.wheel(0,120);await p.waitForFunction(()=>window.__uiPolish.snap().carried===0);check('native wheel cycles primary / secondary / melee, no uncarried guns');
 await p.waitForTimeout(190);await p.mouse.wheel(0,-120);await p.waitForFunction(()=>window.__uiPolish.snap().carried===3);check('wheel reverses and wraps');
 await p.keyboard.press('Escape');await p.waitForFunction(()=>document.body.dataset.playState==='paused');const paused=(await run('snap')).carried;await p.mouse.wheel(0,120);assert.equal((await run('snap')).carried,paused);check('paused-menu scrolling never switches a weapon');
 await run('fresh');for(const index of [1,4,5,6,7]){await run('equip',index);await p.waitForFunction(i=>document.querySelector('.loadout-card[data-carry-slot="primary"]')?.dataset.weaponIndex===String(i),index);assert.equal(await p.locator('.loadout-card').count(),3);assert(await p.locator(`[data-weapon-index="${index}"]`).evaluate(e=>e.classList.contains('active')));}check('all normal primaries replace the first card instead of exposing inventory');
 await run('fresh');for(const index of [8,9,10]){await run('equip',index);assert.equal((await run('snap')).carried,index);await p.waitForFunction(i=>document.querySelector('.loadout-card[data-carry-slot="primary"]')?.dataset.weaponIndex===String(i),index);await p.waitForTimeout(190);await p.mouse.wheel(0,120);await p.waitForFunction(()=>window.__uiPolish.snap().carried===2);await p.waitForTimeout(190);await p.mouse.wheel(0,-120);await p.waitForFunction(i=>window.__uiPolish.snap().carried===i,index);assert.equal((await run('snap')).selected,2);}check('special primaries participate in wheel selection without corrupting legacy indices');
 await run('equip',9);const before=await run('snap');await p.mouse.click(610,400);s=await run('snap');assert.equal(s.ordnance.rounds[0],before.ordnance.rounds[0]-1);assert.equal(s.rounds[2],before.rounds[2]);check('left click on held grenade launcher consumes heavy ammo, not pistol ammo');
 await run('equip',10);await p.mouse.down({button:'right'});await run('tick',.5);const lanceBefore=await run('snap');await p.mouse.click(610,400);s=await run('snap');assert.equal(s.ordnance.rounds[1],lanceBefore.ordnance.rounds[1]-1);assert.equal(s.rounds[2],lanceBefore.rounds[2]);await p.mouse.up({button:'right'});check('held lance preserves ADS requirement and its separate magazine');
 await run('heavyEmpty');await p.keyboard.press('r');assert((await run('snap')).ordnance.reload>0);await run('tick',3);assert.equal((await run('snap')).ordnance.rounds[1],2);check('R reloads the held special weapon without changing pistol ammo');
 await run('equip',0,11);await p.waitForTimeout(190);await p.mouse.wheel(0,-120);await p.waitForFunction(()=>window.__uiPolish.snap().carried===11);await p.waitForFunction(()=>document.querySelector('[data-weapon-index="11"]')?.classList.contains('active'));assert.equal(await p.locator('[data-weapon-index="11"] .weapon-ammo-caption b').textContent(),'∞');check('hammer is the third equipped slot and has no fictitious ammo percentage');
 await run('fresh');await run('ammo','zero');await p.waitForFunction(()=>document.querySelector('[data-weapon-index="0"] [role="progressbar"]')?.getAttribute('aria-valuenow')==='0');check('empty magazine and reserve show 0% directly below the weapon');
 await run('ammo','reload');await p.waitForFunction(()=>document.querySelector('[data-weapon-index="0"] [role="progressbar"]')?.getAttribute('aria-valuenow')==='25');await p.keyboard.press('r');await run('tick',2);await p.waitForFunction(()=>document.querySelector('[data-weapon-index="0"] [role="progressbar"]')?.getAttribute('aria-valuenow')==='25');assert.equal((await run('snap')).rounds[0],30);check('reload transfers ammo without magically refilling the total-ammo bar');
 assert.equal(await p.locator('[data-weapon-index="3"] [role="progressbar"]').count(),0);check('melee does not expose a false 100% ammo progress value');
 await mkdir(artifacts,{recursive:true});await p.screenshot({path:path.join(artifacts,'equipped-three-slots.png')});
 s=await run('drop',.99,['heavy']);assert.equal(s.drops.length,0);s=await run('repeatDrop');assert.equal(s.drops.length,0);check('a failed drop roll remains absent on repeated corpse callbacks');
 s=await run('drop',0,['heavy']);assert.equal(s.drops.length,1);const inventory={rounds:s.rounds,typed:s.typed};await p.keyboard.press('f');s=await run('snap');assert.equal(s.carry.primary,1);assert.equal(s.drops.length,0);assert.deepEqual({rounds:s.rounds,typed:s.typed},inventory);await p.waitForFunction(()=>document.querySelector('.loadout-card[data-carry-slot="primary"]')?.dataset.weaponIndex==='1');check('native F swaps the primary card without adding ammo');
 await run('gallery');await p.waitForFunction(()=>document.querySelectorAll('.loadout-card').length===3);await p.screenshot({path:path.join(artifacts,'distinct-ground-weapons.png')});
 s=await run('snap');assert.equal(s.drops.length,4);check('ground drops stay within four slots');
 await p.setViewportSize({width:700,height:800});await p.screenshot({path:path.join(artifacts,'compact-three-slots.png')});assert.equal(await p.locator('.loadout-card:visible').count(),3);assert(await p.locator('.right-panel').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));check('compact layout retains three equipped cards inside viewport');
 assert.deepEqual(errors,[]);check('no page errors during the regression');
 console.log('TOTAL '+passed.length+' targeted browser checks; screenshots: '+artifacts);await context.close();
 }
 await exercise();
}finally{await browser?.close();server?.kill();}
