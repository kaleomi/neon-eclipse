// Real UI controllers + raycast target; controlled fixtures, no damage/AI/world-telegraph changes.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');const server=await startVehicleTestServer();let browser;
try{
 browser=await chromium.launch({headless:true});const p=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const source=await readFile('session-chrome.js','utf8'),overlay=source.match(/overlay\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1];assert(overlay);
 const fixture=(await readFile('browser-ui-clean-fixture.js','utf8')).replace('createCombatUI();','window.__cueCombat=createCombatUI();');
 await p.route('**/browser-ui-clean-fixture.js',r=>r.fulfill({contentType:'text/javascript',body:fixture}));await p.route('**/app.js',r=>r.fulfill({contentType:'text/javascript',body:"import {mountCleanFixture} from './browser-ui-clean-fixture.js';mountCleanFixture("+JSON.stringify(overlay)+');'}));
 await p.goto(server.base+'/index.html');await p.waitForFunction(()=>window.__cleanUI&&document.body.dataset.uiReady==='true');
 await p.click('#menu-settings');await p.click('#settings-tab-controls');await p.click('[data-bind=interact]');await p.keyboard.press('KeyJ');
 await p.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),{createEnemyUI}=await import('/enemy-ui.js'),{createSwitchyardUI}=await import('/switchyard-ui.js'),{createMissionUI}=await import('/mission-ui.js'),{shapeFor}=await import('/accessibility.js');
  window.neonShape=shapeFor;createMissionUI();document.querySelector('#mission-hud').hidden=false;document.querySelector('.mission-tracker li').dataset.state='current';document.querySelector('.mission-timer').textContent='00:42 / 5 个敌人';document.querySelector('.objective-marker').hidden=true;document.querySelector('.interact-prompt').hidden=true;
  const camera=new T.PerspectiveCamera(74,innerWidth/innerHeight,.08,100);camera.position.set(0,1.7,0);camera.lookAt(0,1.7,-5);camera.updateMatrixWorld();
  const group=new T.Group();group.position.set(0,1.7,-5);group.add(new T.Mesh(new T.BoxGeometry(1,2,1),new T.MeshBasicMaterial()));group.updateMatrixWorld(true);
  const target={type:'ranged',hp:60,maxHp:60,group,boss:false},enemy=createEnemyUI(),sw=createSwitchyardUI();
  const rules={state:{phase:'shield',active:true,timer:6,hp:1200,maxHp:1200,tier:1},rail:{lane:0,mode:'warning',armed:false,timer:4,hold:.3}};
  const draw=(phase='shield',playing=true,interaction={})=>{
   const warden=phase.startsWith('warden');target.boss=warden;target.type=warden?'warden':'ranged';target.bossState={phase:0,openRemaining:phase==='warden-exposed'?2:0,transitionRemaining:phase==='warden-warning'?1:0};
   rules.state.phase=phase==='complete'?'defeated':phase==='exposed'?'exposed':'shield';rules.rail.mode=phase==='moving'?'moving':'warning';rules.rail.armed=phase==='armed';
   sw.update(rules,playing&&!warden,interaction);enemy.update(.2,playing,camera,[target],[]);
   window.__cueCombat.update(.016,{playing,ammo:0,capacity:30,reserve:120,health:20,reloading:0,reloadDuration:1.4,switching:0,heat:0,spread:.009,player:{x:0,z:0},yaw:0});
  };
  window.__cleanUI.setState('playing');window.__cues={draw,enemy,sw,rules,target};draw();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;canvas.style.cssText='width:100%;height:100%;image-rendering:pixelated';const ctx=canvas.getContext('2d');ctx.fillStyle='#bac8b8';ctx.fillRect(0,0,64,64);ctx.fillStyle='#193b42';ctx.fillRect(0,0,32,32);ctx.fillRect(32,32,32,32);document.querySelector('#game').append(canvas);
 });
 assert.match(await p.locator('.switchyard-panel').textContent(),/按住 J/);assert(await p.locator('.enemy-inspector').isVisible());
 await mkdir('.tools/qa-combat-cues',{recursive:true});let count=0;
 for(const [width,height] of [[1440,960],[1024,640],[390,844]]){
  await p.setViewportSize({width,height});
  for(const mode of ['off','deuteranopia','protanopia','tritanopia','high-contrast'])for(const phase of ['shield','moving','exposed']){
   await p.evaluate(({mode,phase})=>{window.neonA11y.set({colorMode:mode,shapes:true});document.documentElement.style.setProperty('--hud-scale','1.15');window.__cues.draw(phase);},{mode,phase});
   assert(await p.evaluate(mode=>{const filter=document.querySelector('canvas').style.filter;return mode==='off'?!filter:mode==='high-contrast'?filter.includes('contrast'):filter.includes('cvd-'+mode);},mode));
   const measured=await p.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect(),a=rect('.switchyard-panel'),e=rect('.enemy-inspector'),alerts=rect('.combat-alerts'),m=rect('.mission-tracker'),rack=rect('.equipped-rack');
    const center={left:innerWidth/2-22,right:innerWidth/2+22,top:innerHeight/2-22,bottom:innerHeight/2+22},overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const inside=a=>a.left>=0&&a.top>=0&&a.right<=innerWidth&&a.bottom<=innerHeight;
    return {fit:inside(a)&&inside(e),bossClear:[center,alerts,m,rack,e].every(b=>!overlap(a,b)),targetClear:!overlap(e,center)&&!overlap(e,rack),background:getComputedStyle(document.querySelector('.switchyard-panel')).backgroundColor,targetBox:{left:e.left,right:e.right,top:e.top,bottom:e.bottom},rackBox:{left:rack.left,right:rack.right,top:rack.top,bottom:rack.bottom},animation:getComputedStyle(document.querySelector('.switchyard-panel')).animationName,box:{top:a.top,bottom:a.bottom,left:a.left,right:a.right}};
   });assert(measured.fit&&measured.bossClear&&measured.targetClear,JSON.stringify({width,height,mode,phase,measured}));assert.equal(measured.animation,'none');assert.match(measured.background,/rgba?\(/);
   assert.match(await p.locator('.enemy-inspector b').textContent(),/◆/);count++;
   if(mode==='high-contrast'&&phase==='moving')await p.screenshot({path:`.tools/qa-combat-cues/moving-${width}.png`});
  }
 }
 await p.setViewportSize({width:1024,height:640});
 for(const phase of ['warden-shield','warden-warning','warden-exposed','armed','complete']){await p.evaluate(phase=>window.__cues.draw(phase),phase);const panel=phase.startsWith('warden')?p.locator('#enemy-combat-hud .boss-mechanic'):p.locator('.switchyard-panel');assert(await panel.isVisible());assert(await panel.evaluate(e=>e.getBoundingClientRect().bottom<innerHeight/2-22));}
 const frozen=await p.evaluate(()=>({rules:JSON.stringify(window.__cues.rules),storage:JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))}));
 await p.evaluate(()=>{window.__cues.sw.update(window.__cues.rules,false);window.__cues.enemy.update(.2,false,null,[],[]);window.__cueCombat.update(0,{playing:false});});assert(await p.locator('.switchyard-panel').isHidden());assert(await p.locator('#enemy-combat-hud').isHidden());
 assert.deepEqual(await p.evaluate(()=>({rules:JSON.stringify(window.__cues.rules),storage:JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))})),frozen);
 await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>window.__cues.draw('shield',true,{near:true,id:0,allowed:true}));assert.match(await p.locator('.switchyard-panel').textContent(),/按住 J · 切岔 50%/);
 assert.deepEqual(errors,[]);console.log('PASS '+count+' color-mode/viewport/state layouts; 115% scale; shape tags; reduced motion; real rebind; WARDEN states; pause hides cues; read-only state/storage');
}finally{await browser?.close();await server.stop();}
