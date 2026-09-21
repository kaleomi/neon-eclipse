// Actual combat/menu controllers; controlled UI fixture, not a natural playthrough.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
try{
 browser=await chromium.launch({headless:true,args:['--disable-gpu']});const c=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'}),p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(20000);
 const source=await readFile('session-chrome.js','utf8'),overlay=source.match(/overlay\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1];assert(overlay);
 let fixture=await readFile('browser-ui-clean-fixture.js','utf8');assert(fixture.includes('createCombatUI();'));assert(fixture.includes('pending:false,navigating:false'));
 fixture="import {createMissionUI} from './mission-ui.js';\n"+fixture.replace('createCombatUI();',"window.__hudCombat=createCombatUI();createMissionUI();document.querySelector('#mission-hud').hidden=false;document.querySelector('.mission-tracker ol li').dataset.state='current';document.querySelector('.objective-marker').hidden=true;document.querySelector('.interact-prompt').hidden=true;").replace('pending:false,navigating:false','pending:!!window.__hudPending,navigating:false');
 await p.route('**/browser-ui-clean-fixture.js',r=>r.fulfill({contentType:'text/javascript',body:fixture}));
 await p.route('**/app.js',r=>r.fulfill({contentType:'text/javascript',body:"import {mountCleanFixture} from './browser-ui-clean-fixture.js';mountCleanFixture("+JSON.stringify(overlay)+');'}));
 await p.goto(server.base+'/index.html');await p.waitForFunction(()=>window.__cleanUI&&document.body.dataset.uiReady==='true');
 const info={playing:true,ammo:4,capacity:30,reserve:120,health:20,melee:false,reloading:0,reloadDuration:1.4,switching:0,heat:0,spread:.009,player:{x:0,z:0},yaw:0};
 await p.click('#menu-settings');await p.click('#settings-tab-controls');await p.click('[data-bind=reload]');await p.keyboard.press('KeyJ');
 await p.evaluate(info=>{window.__cleanUI.setState('playing');window.__hudInfo=info;window.__hudCombat.update(.016,info);document.querySelector('#health').textContent=info.health;document.querySelector('#healthbar').style.width=info.health+'%';document.querySelector('#player-hud .health').dataset.low='true';document.querySelector('#ammo').textContent=info.ammo;},info);
 assert.match(await p.locator('.ammo-warning').textContent(),/J 换弹/);assert(await p.locator('.low-health').isVisible());assert(await p.locator('.reload-status').isHidden(),'inactive reload must stay hidden');
 assert.equal(await p.locator('#healthbar').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 157, 135)');
 const before=await p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))));
 await p.evaluate(()=>{window.__alertMutations=0;new MutationObserver(m=>window.__alertMutations+=m.length).observe(document.querySelector('.combat-alerts'),{subtree:true,attributes:true,childList:true,characterData:true});for(let i=0;i<60;i++)window.__hudCombat.update(.016,window.__hudInfo);});
 assert.equal(await p.evaluate(()=>window.__alertMutations),0,'unchanged frames must not re-announce text or change live-region attributes');
 await mkdir('.tools/qa-hud-polish',{recursive:true});
 for(const [width,height] of [[1440,960],[1024,640],[390,844]])for(const scale of [.8,1,1.15]){
  await p.setViewportSize({width,height});await p.evaluate(v=>document.documentElement.style.setProperty('--hud-scale',v),String(scale));
  const result=await p.evaluate(()=>{
   const rect=s=>document.querySelector(s).getBoundingClientRect();const a=rect('.combat-alerts'),m=rect('.mission-tracker'),r=rect('.equipped-rack'),low=rect('.low-health'),ammo=rect('.ammo-warning');
   const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
   const center={left:innerWidth/2-24,right:innerWidth/2+24,top:innerHeight/2-24,bottom:innerHeight/2+24};
   const panels=['#player-hud .health','#player-hud .ammo'].map(rect);
   return {inside:a.left>=0&&a.right<=innerWidth&&a.top>=0&&a.bottom<=innerHeight,clear:!overlap(a,m)&&!overlap(a,r)&&!overlap(a,center),separate:low.bottom<=ammo.top,panels:panels.every(x=>x.left>=0&&x.right<=innerWidth&&x.bottom<=innerHeight)&&!overlap(...panels),animation:getComputedStyle(document.querySelector('.low-health')).animationName};
  });assert(result.inside&&result.clear&&result.separate&&result.panels,JSON.stringify({width,height,scale,result}));assert.equal(result.animation,'none');
  if(scale===1)await p.screenshot({path:`.tools/qa-hud-polish/alerts-${width}.png`});
 }
 console.log('PASS 9 alert layouts: clear reticle/task/rack, separate warnings, health/ammo contained, reduced-motion');
 // Interaction prompt with a hold in progress: compact (no phantom empty area below the bar), clear of reticle and context stack.
 for(const [width,height] of [[1440,960],[1024,640],[390,844]]){
  await p.setViewportSize({width,height});
  const r=await p.evaluate(()=>{const el=document.querySelector('.interact-prompt');el.hidden=false;el.querySelector('span').textContent='按住 E · 解除闸门（松开或受击会中断）';el.querySelector('i').style.width='40%';
   const stack=document.querySelector('.ui-context-stack');let toast=stack?.querySelector('.toast');if(stack&&!toast){toast=document.createElement('div');toast.className='toast';stack.append(toast);}if(toast){toast.textContent='中继员 // 测试提示';toast.style.opacity='1';}
   const b=el.getBoundingClientRect(),s=stack?stack.getBoundingClientRect():null,c={left:innerWidth/2-24,right:innerWidth/2+24,top:innerHeight/2-24,bottom:innerHeight/2+24};
   const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;const text=el.querySelector('span').getBoundingClientRect(),bar=el.querySelector('[role=progressbar]').getBoundingClientRect();
   if(toast)toast.textContent='';el.hidden=true;
   return {height:b.height,compact:b.height<=bar.bottom-text.top+40,inside:b.top>=0&&b.bottom<=innerHeight,clear:!overlap(b,c)&&(!s||s.height===0||!overlap(b,s))};});
  assert(r.compact&&r.inside&&r.clear,JSON.stringify({width,height,r}));
 }
 console.log('PASS 3 interaction prompt layouts: compact box, clear of reticle and context stack');
 await p.evaluate(()=>window.__hudCombat.update(.016,{...window.__hudInfo,reloading:.7,ammo:0}));assert.equal(await p.locator('.ammo-warning').textContent(),'');assert.equal(await p.locator('.reload-status').getAttribute('aria-valuenow'),'50');
 await p.evaluate(()=>window.__hudCombat.update(.016,{...window.__hudInfo,ammo:0,reserve:0}));assert.match(await p.locator('.ammo-warning').textContent(),/耗尽/);
 await p.evaluate(()=>window.__hudCombat.update(.016,{...window.__hudInfo,melee:true,ammo:Infinity,capacity:Infinity,health:100}));assert.equal(await p.locator('.ammo-warning').textContent(),'');assert(await p.locator('.low-health').isHidden());assert.equal(await p.locator('#player-hud .ammo').getAttribute('data-ammo-state'),'normal');
 console.log('PASS real bound-key label, stable live region, reload progress, exhausted and melee states');
 for(const [width,height] of [[1440,960],[1024,640],[390,844]]){
  await p.setViewportSize({width,height});
  for(const state of ['paused','won','lost','pending']){
   await p.evaluate(state=>{window.__hudPending=state==='pending';window.__cleanUI.setState(state==='pending'?'won':state);window.__hudCombat.update(.016,{...window.__hudInfo,playing:false});},state);
   assert.equal(await p.locator('.menu-context').getAttribute('data-presentation-state'),state);assert(await p.locator('#combat-feedback').isHidden());
   if(state==='pending')assert.match(await p.locator('#menu-result-stats').textContent(),/保存状态.*待保存/);
   assert(await p.locator('#deploy').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));}));
   if(width===1440)await p.screenshot({path:`.tools/qa-hud-polish/${state}.png`});
  }
 }
 assert.equal(await p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))),before);
 assert.deepEqual(errors,[]);console.log('PASS 12 pause/result/pending layouts: correct state, primary hit target, no alert bleed, zero new storage writes');
}finally{await browser?.close();await server.stop();}
