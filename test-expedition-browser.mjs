// Isolated real app/UI + native IDB. Terminal mission fixtures are deliberately synthetic;
// they verify the new score wiring, not natural gameplay completion or human difficulty.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
const shots=process.env.VEHICLE_SCREENSHOT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'neon-expedition-'));fs.mkdirSync(shots,{recursive:true});
const fixture=`
// Browser-route-only fixture; not present in the delivered vehicle-app.js.
window.__p3Fixture={
 deferNaval(){const original=navalCheckpointUI.begin;window.__releaseNaval=null;navalCheckpointUI.begin=async(...args)=>{await new Promise(resolve=>window.__releaseNaval=resolve);navalCheckpointUI.begin=original;return original(...args);};},
 win(id,{invalid=false,recovered=false}={}){
  pause();const m=id==='escort'?escort:id==='naval'?chase:id==='recon'?sortie:joint;
  if(id==='escort'){
   Object.assign(m.truck,{arrived:true,index:4});m.waves=[true,!invalid,true];m.waveIndex=3;m.spawned=m.profile.waves.reduce((a,b)=>a+b,0);m.killed=m.spawned;
   m.hounds=Array.from({length:m.spawned},(_,i)=>({id:i+1,type:'hound',alive:false,hp:0,maxHp:54,x:0,y:1,z:0,yaw:0,r:1,flash:0,mode:'recover',timer:0,lock:null}));m.elapsed=100;
  }else if(id==='naval'){
   Object.assign(m,{index:3,escaped:true,complete:!invalid,elapsed:45,remaining:m.naval.profile.timeLimit-45});m.naval.members.forEach(s=>{s.escaped=true;});
  }else if(id==='recon'){
   m.elapsed=100;m.phase='complete';m.route.index=3;m.route.complete=true;m.recon.uploadTime=2;m.recon.records=['north-relay','sea-beacon','airfield-terminal'].map(id=>({id}));
   m.result={attempt:m.attempt,completedAt:Date.now(),tookOff:true,approached:true,landedSafely:true,routeComplete:true,uploadTime:2,status:'won',elapsed:100,gates:3,stopTime:2,records:m.recon.records,uploaded:!invalid};
  }else{m.elapsed=300;m.stage='complete';m.completed=invalid?[]:[...JOINT_STAGES];m.flightId=crypto.randomUUID();}
  m.status='won';m.reason='受控集成夹具完成（非自然通关）';if(recovered)m.recovered=true;
  if(id==='escort')finishEscort();else if(id==='naval')finishChase();else if(id==='recon')finishFlight();else finishJoint();
 },
 lose(id){pause();const m=id==='escort'?escort:id==='naval'?chase:id==='recon'?sortie:joint;m.status='lost';m.reason='受控失败';if(id==='escort')finishEscort();else if(id==='naval')finishChase();else if(id==='recon')finishFlight();else finishJoint();},
 async seedJointCheckpoint(){
  const {checkpointFromMission}=await import('./joint-checkpoint-model.js');const {createJointCheckpointStore}=await import('./joint-checkpoint-store.js');
  const m=createJointMission(true);m.stage='drive';m.completed=['pickup'];m.elapsed=20;const c=checkpointFromMission(m);const store=createJointCheckpointStore(),r=await store.read();
  const result=await store.write({operationId:m.runId+':fixture',checkpoint:c},r.revision);store.close();return result;
 }
};`;
try{
  browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(45000);
  await context.route('**/vehicle-app.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(new URL('./vehicle-app.js',import.meta.url),'utf8')+'\n'+fixture}));
  const sentinel={'neon-eclipse.journey.v6':'expedition-keep','neon-eclipse.chapter-achievements.v1':'achievements-keep','neon-eclipse.naval-difficulty.v1':'easy','neon-eclipse.escort-difficulty.v1':'normal'};
  await context.addInitScript(s=>{for(const [k,v] of Object.entries(s))if(localStorage.getItem(k)===null)localStorage.setItem(k,v);},sentinel);
  await page.goto(server.base+'/vehicle.html');await page.waitForFunction(()=>document.body.dataset.expeditionState==='ready');
  const twice=async selector=>{await page.click(selector);await page.click(selector);};
  const running=id=>page.waitForFunction(id=>document.body.dataset.expeditionMission===id&&document.body.dataset.expeditionState==='playing',id);
  const progress=n=>page.waitForFunction(n=>document.body.dataset.expeditionCompleted===String(n)&&document.body.dataset.expeditionRecords===String(n)&&document.body.dataset.expeditionState==='ready',n);
  const win=async(id,options={})=>page.evaluate(([id,options])=>window.__p3Fixture.win(id,options),[id,options]);
  await page.selectOption('#expedition-difficulty','hard');await page.click('#expedition-new');assert.equal(await page.getAttribute('body','data-escort-status'),'idle','first click only arms');
  await page.click('#expedition-new');await running('escort');assert.equal(await page.getAttribute('body','data-escort-difficulty'),'hard');
  await page.keyboard.press('Escape');assert.equal(await page.getAttribute('body','data-drive-active'),'false');assert.equal(await page.getAttribute('body','data-expedition-mission'),'escort');
  await page.evaluate(()=>window.__p3Fixture.lose('escort'));await progress(0);
  await twice('#expedition-continue');await running('escort');await win('escort',{invalid:true});await progress(0);assert.match(await page.locator('#expedition-feedback').textContent(),/未满足/);
  await twice('#expedition-continue');await running('escort');await win('escort');await progress(1);await win('escort');await progress(1);
  console.log('PASS step 1: armed entry, native mission start/difficulty, pause, loss/invalid refusal, qualified single save, duplicate callback');
  await page.reload();await progress(1);
  await page.evaluate(()=>window.__p3Fixture.deferNaval());await twice('#expedition-continue');await page.waitForFunction(()=>typeof window.__releaseNaval==='function');
  await twice('#start-recon');await page.waitForFunction(()=>document.body.dataset.flightMissionType==='recon'&&document.body.dataset.driveActive==='true');
  await page.evaluate(()=>window.__releaseNaval());await page.waitForFunction(()=>document.body.dataset.expeditionState==='ready');
  assert.equal(await page.getAttribute('body','data-chase-status'),'idle','late naval start must not override newer recon selection');
  await page.keyboard.press('Escape');await twice('#expedition-continue');await running('naval');assert.equal(await page.getAttribute('body','data-naval-difficulty'),'hard','campaign difficulty survives reload and ignores standalone preference');
  await page.keyboard.press('Escape');await twice('#start-recon');await page.waitForFunction(()=>document.body.dataset.flightMissionType==='recon'&&document.body.dataset.driveActive==='true');
  assert.equal(await page.getAttribute('body','data-expedition-mission'),'none');await win('recon');await progress(1);
  await page.waitForFunction(()=>document.querySelector('[data-task="recon"][data-rules="recon-v1"]')?.dataset.count==='1');
  await twice('#expedition-continue');await running('naval');await win('naval',{recovered:true});await progress(1);
  await twice('#expedition-continue');await running('naval');await win('naval');await progress(2);
  console.log('PASS step 2: reload current mission, locked difficulty, single-mode detachment and recovered result rejection');
  await twice('#expedition-continue');await running('recon');assert.match(await page.locator('.drive-objective>small').textContent(),/固定规则/);
  await win('recon');await progress(3);await win('recon');await progress(3);assert(await page.locator('#flight-result-actions').isHidden());
  assert.equal(await page.getAttribute('[data-task="recon"][data-rules="recon-v1"]','data-count'),'1','campaign recon must not enter standalone flight archive');
  await twice('#expedition-continue');await running('joint');assert.equal(await page.getAttribute('body','data-joint-stage'),'pickup');
  await page.keyboard.press('Escape');assert((await page.evaluate(()=>window.__p3Fixture.seedJointCheckpoint())).ok);
  await page.click('#refresh-joint-checkpoint');await page.waitForFunction(()=>!document.querySelector('#resume-joint-checkpoint').disabled);
  await page.click('#resume-joint-checkpoint');await page.waitForFunction(()=>document.body.dataset.jointRecovered==='true');
  assert.equal(await page.getAttribute('body','data-expedition-mission'),'none');await win('joint');await progress(3);
  await twice('#expedition-continue');await running('joint');assert.equal(await page.getAttribute('body','data-joint-recovered'),'false');
  await win('joint');await progress(4);assert(await page.locator('#expedition-continue').isDisabled());assert.match(await page.locator('#expedition-status').textContent(),/第 5–8 关未开放/);
  await page.reload();await progress(4);
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="escort"][data-difficulty="hard"]','data-count'),'1');
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="naval"][data-difficulty="hard"]','data-count'),'1');
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="recon"][data-difficulty="fixed"]','data-count'),'1');
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="joint"][data-difficulty="fixed"]','data-count'),'1');
  assert.deepEqual(await page.evaluate(s=>Object.fromEntries(Object.keys(s).map(k=>[k,localStorage.getItem(k)])),sentinel),sentinel);
  for(const [width,height] of [[1280,900],[390,780],[320,700]]){await page.setViewportSize({width,height});await page.locator('#expedition-panel').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow '+width);}
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS step 3: fixed-rule recon/joint, separate records, legacy checkpoint detachment, fourth mission completion/reload, grouped results, saved-data isolation and narrow layouts');
  // Screenshot a clean, unmodified production page, not the synthetic completion fixture.
  const clean=await browser.newContext({viewport:{width:1280,height:900}}),cleanPage=await clean.newPage();
  await cleanPage.goto(server.base+'/vehicle.html');await cleanPage.waitForFunction(()=>document.body.dataset.expeditionState==='ready');
  await cleanPage.locator('#expedition-panel').scrollIntoViewIfNeeded();await cleanPage.screenshot({path:path.join(shots,'p3-expedition-menu.png')});
  await cleanPage.setViewportSize({width:390,height:780});await cleanPage.locator('#expedition-panel').scrollIntoViewIfNeeded();await cleanPage.screenshot({path:path.join(shots,'p3-expedition-mobile.png')});await clean.close();
  console.log('PASS: front-four UI and score wiring. Terminal-state fixtures are not full natural/human playthroughs. Screenshots: '+shots);
}finally{await browser?.close();await server.stop();}
