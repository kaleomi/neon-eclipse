// Actual pages/menu/store; controlled checkpoints and terminal outcomes, NOT natural chapter clears.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
import {MAP_REGISTRY} from './maps/registry.js';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer(),results=[];let browser;
const fixture=`
window.__journeyAudit={frozen:true,snapshot:()=>({map:MAP_ID,state,runMode,health,stage:mission.state.index,checkpoint:checkpoint(),journey:journey.data,pending:pendingJourneyResult}),save(){health=73;rounds[0]=Math.max(0,rounds[0]-2);mission.state.time=42;flow.saveCheckpoint();return this.snapshot();},lose(){end(false);},win(){end(true);},step(){chrome.update(.016);update(.016);}};`;
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:1100,height:760}}),p=await context.newPage(),errors=[];p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>{if(!localStorage.getItem('neon-eclipse.presentation.v1'))localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0,motion:false}));const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__failJourney&&k==='neon-eclipse.journey.v7')throw new DOMException('Controlled write failure','QuotaExceededError');return original.call(this,k,v);};});
 const source=await readFile('app.js','utf8');assert(source.includes("if(state==='playing')update(dt);"));await context.route('**/app.js',r=>r.fulfill({contentType:'text/javascript',body:source.replace("if(state==='playing')update(dt);","if(state==='playing'&&!window.__journeyAudit?.frozen)update(dt);")+fixture}));
 const loaded=()=>p.waitForFunction(()=>window.__journeyAudit&&document.body.dataset.menuOpen==='true'),playing=()=>p.waitForFunction(()=>document.body.dataset.playState==='playing'),snap=()=>p.evaluate(()=>__journeyAudit.snapshot());
 await p.goto(server.base+'/index.html?map=reactor');await loaded();await p.evaluate(()=>localStorage.setItem('journey-audit-unrelated','keep'));
 const restored=(s,saved)=>{for(const key of ['stageIndex','health','rounds','reserves','selected','time','kills','loadout','typedAmmo'])assert.deepEqual(s.checkpoint[key],saved[key],'restored '+key);};
 const slots=()=>p.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),MAP_REGISTRY.map(m=>m.saveKey));const initialSlots=await slots();
 await p.click('#menu-new');await p.click('#menu-begin');await playing();
 for(let i=0;i<MAP_REGISTRY.length;i++){
  const map=MAP_REGISTRY[i].id;if(i){await loaded();await p.click('#deploy');await playing();}
  let s=await snap();assert.equal(s.map,map);assert.equal(s.runMode,'journey');assert.equal(s.journey.chapter,i);assert.equal(s.journey.results.length,i);assert.equal(s.journey.status,'active');assert(await p.locator('#game canvas').count());
  await p.evaluate(()=>__journeyAudit.step());await p.keyboard.press('Escape');await p.waitForFunction(()=>document.body.dataset.playState==='paused');await p.click('#deploy');await playing();
  s=await p.evaluate(()=>__journeyAudit.save());assert.equal(s.journey.checkpoint.health,73);const saved=s.journey.checkpoint;
  await p.evaluate(()=>__journeyAudit.lose());await p.waitForFunction(()=>document.body.dataset.playState==='lost');s=await snap();assert.equal(s.journey.status,'active');assert.equal(s.journey.results.length,i);assert.deepEqual(s.journey.checkpoint,saved);
  await p.click('#deploy');await playing();s=await snap();assert.equal(s.health,73);assert.equal(s.stage,saved.stageIndex);restored(s,saved);
  await p.goto(server.base+'/index.html?map='+map+'&mode=journey');await loaded();await p.click('#menu-continue');await playing();s=await snap();assert.equal(s.health,73);assert.deepEqual(s.journey.checkpoint,saved);restored(s,saved);
  if(i===0){
   const bytes=await p.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v7')),url=p.url();await p.evaluate(()=>{window.__failJourney=true;__journeyAudit.win();});s=await snap();assert(s.pending);assert.equal(s.journey.status,'active');await p.click('#deploy');assert.equal(p.url(),url);assert.equal(await p.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v7')),bytes);assert((await snap()).pending);await p.evaluate(()=>window.__failJourney=false);
  }else{
   await p.evaluate(()=>__journeyAudit.win());s=await snap();assert.equal(s.journey.status,i===8?'complete':'between');assert.equal(s.journey.results.length,i+1);assert.equal(s.pending,null);
   if(i===1){const bytes=await p.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v7')),url=p.url();await p.evaluate(()=>window.__failJourney=true);await p.click('#deploy');assert.equal(p.url(),url);assert.equal(await p.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v7')),bytes);assert.equal((await snap()).journey.status,'between');await p.evaluate(()=>window.__failJourney=false);}
  }
  assert.deepEqual(await slots(),initialSlots,'journey must not overwrite single-chapter slots');assert.equal(await p.evaluate(()=>localStorage.getItem('journey-audit-unrelated')),'keep');assert.deepEqual(errors,[]);
  results.push({map,entry:true,pause:true,deathRetry:true,checkpointReload:true,terminal:'controlled'});console.log('PASS '+map+' native menu entry/pause/retry/reload; isolated single slots; controlled result');
  if(i<8){await p.click('#deploy');await p.waitForURL(u=>u.searchParams.get('map')===MAP_REGISTRY[i+1].id,{timeout:90000});}else{await p.click('#deploy');assert.equal((await snap()).journey.status,'complete');assert(await p.locator('#menu-new').isVisible());}
 }
 const final=(await snap()).journey;assert.equal(final.results.length,9);assert.equal(final.version,7);assert.equal(final.checkpoint,null);assert.deepEqual(errors,[]);await mkdir('.tools/qa-journey-flow',{recursive:true});await writeFile('.tools/qa-journey-flow/results.json',JSON.stringify({scope:'Controlled outcomes and frozen AI; real pages, UI, checkpoints and navigation; not natural clears',results,final,errors},null,2)+'\n');console.log('PASS nine-chapter continuity; result/advance write failures do not navigate or mutate durable bytes; final complete state and home return');
}finally{await browser?.close();await server.stop();}
