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
  pause();const isFrontier=FRONTIER_IDS.includes(id);const m=id==='escort'?escort:id==='naval'?chase:id==='recon'?sortie:id==='lighthouse'?lighthouse:isFrontier?frontier:joint;
  if(isFrontier){m.elapsed=200;m.stage='complete';m.completed=invalid?FRONTIER_STAGES[id].slice(0,-1):[...FRONTIER_STAGES[id]];if(m.hostiles.length===0)m.hostiles=[{id:'fixture',alive:true,hp:1}];m.hostiles.forEach(h=>{h.alive=false;h.hp=0;});if(m.mech){m.mech.alive=false;m.mech.hp=0;}}
  else if(id==='lighthouse'){m.elapsed=150;m.stage='complete';m.completed=[...LIGHTHOUSE_STAGES];m.surveys=invalid?2:3;}
  else if(id==='escort'){
   Object.assign(m.truck,{arrived:true,index:4});m.waves=[true,!invalid,true];m.waveIndex=3;m.spawned=m.profile.waves.reduce((a,b)=>a+b,0);m.killed=m.spawned;
   m.hounds=Array.from({length:m.spawned},(_,i)=>({id:i+1,type:'hound',alive:false,hp:0,maxHp:54,x:0,y:1,z:0,yaw:0,r:1,flash:0,mode:'recover',timer:0,lock:null}));m.elapsed=100;
  }else if(id==='naval'){
   Object.assign(m,{index:3,escaped:true,complete:!invalid,elapsed:45,remaining:m.naval.profile.timeLimit-45});m.naval.members.forEach(s=>{s.escaped=true;});
  }else if(id==='recon'){
   m.elapsed=100;m.phase='complete';m.route.index=3;m.route.complete=true;m.recon.uploadTime=2;m.recon.records=['north-relay','sea-beacon','airfield-terminal'].map(id=>({id}));
   m.result={attempt:m.attempt,completedAt:Date.now(),tookOff:true,approached:true,landedSafely:true,routeComplete:true,uploadTime:2,status:'won',elapsed:100,gates:3,stopTime:2,records:m.recon.records,uploaded:!invalid};
  }else{m.elapsed=300;m.stage='complete';m.completed=invalid?[]:[...JOINT_STAGES];m.flightId=crypto.randomUUID();}
  m.status='won';m.reason='受控集成夹具完成（非自然通关）';if(recovered)m.recovered=true;
  if(id==='escort')finishEscort();else if(id==='naval')finishChase();else if(id==='recon')finishFlight();else if(id==='lighthouse')finishLighthouse();else if(isFrontier)finishFrontier();else finishJoint();
 },
 async reachWindfarmHeli(){const {FRONTIER_SITES}=await import('./frontier-missions.js');const m=frontier;m.stage='snipe';m.completed=['drive','park','climb'];m.gate=3;m.elapsed=120;m.hostiles.forEach(h=>{h.alive=false;h.hp=0;});let changed=false;for(let i=0;i<40&&!changed;i++)changed=stepFrontierMission(m,{kind:null,player:{x:FRONTIER_SITES.tower.x,z:FRONTIER_SITES.tower.z},rover,yacht,plane,heli,action:false,boxes:[],ground:groundAt,paused:false},.1);if(changed){expeditionUI?.saveCheckpoint('windfarm',m);}return m.stage;},
 async reachHelipad(){const {LIGHTHOUSE_POINTS}=await import('./lighthouse-mission.js');const m=lighthouse;m.stage='survey-3';m.surveys=2;m.completed=['board','sail','land','survey-1','survey-2'];m.elapsed=90;let changed=false;for(let i=0;i<40&&!changed;i++)changed=stepLighthouseMission(m,{kind:null,player:{...LIGHTHOUSE_POINTS['survey-3']},yacht,heli,action:true},.1);if(changed){expeditionUI?.saveCheckpoint('lighthouse',m);}return m.stage;},
 lose(id){pause();const isFrontier=FRONTIER_IDS.includes(id);const m=id==='escort'?escort:id==='naval'?chase:id==='recon'?sortie:id==='lighthouse'?lighthouse:isFrontier?frontier:joint;m.status='lost';m.reason='受控失败';if(id==='escort')finishEscort();else if(id==='naval')finishChase();else if(id==='recon')finishFlight();else if(id==='lighthouse')finishLighthouse();else if(isFrontier)finishFrontier();else finishJoint();},
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
  const progress=(n,records=n)=>page.waitForFunction(([n,records])=>document.body.dataset.expeditionCompleted===String(n)&&document.body.dataset.expeditionRecords===String(records)&&document.body.dataset.expeditionState==='ready',[n,records]);
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
  await win('joint');await progress(4);assert(!(await page.locator('#expedition-continue').isDisabled()),'fifth mission is now open');assert.match(await page.locator('#expedition-status').textContent(),/灯塔岛登陆/);
  // Mission 5: native start from the marina with the campaign difficulty, standalone preference ignored, loss keeps progress, invalid evidence refused, then a qualified win.
  await page.evaluate(()=>localStorage.setItem('neon-eclipse.lighthouse-difficulty.v1','easy'));
  await twice('#expedition-continue');await running('lighthouse');assert.equal(await page.getAttribute('body','data-lighthouse-difficulty'),'hard');assert.equal(await page.getAttribute('body','data-lighthouse-stage'),'board');assert.equal(await page.getAttribute('body','data-vehicle-kind'),'walking');
  await page.keyboard.press('Escape');await page.evaluate(()=>window.__p3Fixture.lose('lighthouse'));await progress(4);
  await twice('#expedition-continue');await running('lighthouse');await win('lighthouse',{invalid:true});await progress(4);assert.match(await page.locator('#expedition-feedback').textContent(),/未满足/);
  // Safe node: driving the real mission rules to the third survey saves a helipad node; a loss keeps it; resuming restores a recovered run on the island with a cold helicopter.
  await twice('#expedition-continue');await running('lighthouse');assert(await page.locator('#expedition-checkpoint').isDisabled(),'no node yet');
  assert.equal(await page.evaluate(()=>window.__p3Fixture.reachHelipad()),'heli','real rules advanced from survey-3 to heli');
  await page.waitForFunction(()=>/灯塔停机坪/.test(document.querySelector('#expedition-checkpoint-info').textContent));
  await page.keyboard.press('Escape');await page.evaluate(()=>window.__p3Fixture.lose('lighthouse'));await progress(4);
  assert(!(await page.locator('#expedition-checkpoint').isDisabled()),'node survives the loss');
  await twice('#expedition-checkpoint');await running('lighthouse');
  assert.equal(await page.getAttribute('body','data-lighthouse-recovered'),'true');assert.equal(await page.getAttribute('body','data-lighthouse-stage'),'heli');assert.equal(await page.getAttribute('body','data-lighthouse-surveys'),'3');assert.equal(await page.getAttribute('body','data-expedition-resumed'),'true');
  assert.equal(await page.getAttribute('body','data-heli-powered'),'false');assert.equal(await page.getAttribute('body','data-lighthouse-difficulty'),'hard');
  const heliPos=await page.evaluate(()=>[Number(document.body.dataset.heliX),Number(document.body.dataset.heliZ)]);assert(Math.hypot(heliPos[0]-512,heliPos[1]-252)<1,'helicopter parked on island pad '+heliPos);
  await page.keyboard.press('Escape');await win('lighthouse',{recovered:true});await progress(5);
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="lighthouse"][data-difficulty="hard"]','data-resumed-count'),'1','resumed win recorded separately');
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="lighthouse"][data-difficulty="hard"]','data-count'),'0');
  assert(await page.locator('#expedition-checkpoint').isDisabled(),'node retired after completion');
  // Fresh campaign for the remaining clean-run assertions below.
  await page.selectOption('#expedition-difficulty','hard');await twice('#expedition-new');await running('escort');await win('escort');await progress(1,6);
  await twice('#expedition-continue');await running('naval');await win('naval');await progress(2,7);
  await twice('#expedition-continue');await running('recon');await win('recon');await progress(3,8);
  await twice('#expedition-continue');await running('joint');await win('joint');await progress(4,9);
  await page.keyboard.press('Escape');await twice('#start-lighthouse');await page.waitForFunction(()=>document.body.dataset.lighthouseStatus==='active'&&document.body.dataset.driveActive==='true');
  assert.equal(await page.getAttribute('body','data-expedition-mission'),'none','standalone lighthouse detaches the campaign');assert.equal(await page.getAttribute('body','data-lighthouse-difficulty'),'easy');await win('lighthouse');await progress(4,9);
  await twice('#expedition-continue');await running('lighthouse');await win('lighthouse');await progress(5,10);assert(!(await page.locator('#expedition-continue').isDisabled()),'sixth mission is open');
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="lighthouse"][data-difficulty="hard"]','data-count'),'1');
  assert.equal(await page.getAttribute('body','data-expedition-title'),'false');
  // Mission 6: real frontier rules advance snipe→heli (safe node), lose, resume from node, resumed win is recorded separately.
  await twice('#expedition-continue');await running('windfarm');assert.equal(await page.getAttribute('body','data-frontier-difficulty'),'hard');assert(await page.locator('#expedition-checkpoint').isDisabled(),'no frontier node yet');
  assert.equal(await page.evaluate(()=>window.__p3Fixture.reachWindfarmHeli()),'heli','real frontier rules advanced from snipe to heli');
  await page.waitForFunction(()=>/停机坪/.test(document.querySelector('#expedition-checkpoint-info').textContent));
  await page.keyboard.press('Escape');await page.evaluate(()=>window.__p3Fixture.lose('windfarm'));await progress(5,10);
  assert(!(await page.locator('#expedition-checkpoint').isDisabled()),'frontier node survives the loss');
  await twice('#expedition-checkpoint');await running('windfarm');
  assert.equal(await page.getAttribute('body','data-frontier-recovered'),'true');assert.equal(await page.getAttribute('body','data-frontier-stage'),'heli');assert.equal(await page.getAttribute('body','data-expedition-resumed'),'true');
  const farmPos=await page.evaluate(()=>[Number(document.body.dataset.heliX),Number(document.body.dataset.heliZ)]);assert(Math.hypot(farmPos[0]-40,farmPos[1]+360)<1,'helicopter parked on the wind-farm pad '+farmPos);
  await page.keyboard.press('Escape');await win('windfarm',{recovered:true});await progress(6,11);
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="windfarm"][data-difficulty="hard"]','data-resumed-count'),'1');
  await twice('#expedition-continue');await running('platform');const shorePos=await page.evaluate(()=>[Number(document.body.dataset.heliX),Number(document.body.dataset.heliZ)]);assert(Math.hypot(shorePos[0]-196,shorePos[1]-120)<1,'helicopter parked on the shore pad for the platform raid '+shorePos);await win('platform',{invalid:true});await progress(6,11);
  await twice('#expedition-continue');await running('platform');await win('platform');await progress(7,12);assert.equal(await page.getAttribute('body','data-expedition-title'),'false');
  // Standalone frontier start detaches the campaign and does not count.
  await page.keyboard.press('Escape');await page.selectOption('#frontier-difficulty-select','easy');await twice('#start-radar');await page.waitForFunction(()=>document.body.dataset.frontierStatus==='active'&&document.body.dataset.driveActive==='true');
  assert.equal(await page.getAttribute('body','data-expedition-mission'),'none','standalone frontier detaches the campaign');assert.equal(await page.getAttribute('body','data-frontier-difficulty'),'easy');await win('radar');await progress(7,12);
  await twice('#expedition-continue');await running('radar');await win('radar');await progress(8,13);assert(await page.locator('#expedition-continue').isDisabled());
  assert.equal(await page.getAttribute('body','data-expedition-title'),'true','title after eight in one campaign');assert.match(await page.locator('#expedition-title').textContent(),/先遣队/);
  await page.reload();await progress(8,13);assert.equal(await page.getAttribute('body','data-expedition-title'),'true','title survives reload');
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="radar"][data-difficulty="hard"]','data-count'),'1');
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="lighthouse"][data-difficulty="hard"]','data-count'),'1');
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="escort"][data-difficulty="hard"]','data-count'),'2','two campaigns');
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="naval"][data-difficulty="hard"]','data-count'),'2','two campaigns');
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="recon"][data-difficulty="fixed"]','data-count'),'2','two campaigns');
  assert.equal(await page.getAttribute('.expedition-record-row[data-mission="joint"][data-difficulty="fixed"]','data-count'),'2','two campaigns');
  assert.deepEqual(await page.evaluate(s=>Object.fromEntries(Object.keys(s).map(k=>[k,localStorage.getItem(k)])),sentinel),sentinel);
  for(const [width,height] of [[1280,900],[390,780],[320,700]]){await page.setViewportSize({width,height});await page.locator('#expedition-panel').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow '+width);}
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS step 3: fixed-rule recon/joint, separate records, legacy checkpoint detachment, fifth mission (lighthouse) and missions 6–8 (windfarm real-rule safe node save-lose-resume-recovered win, platform invalid refusal + shore pad, radar standalone detachment), eight-record completion + 先遣队 title + reload, grouped results, saved-data isolation and narrow layouts');
  // Screenshot a clean, unmodified production page, not the synthetic completion fixture.
  const clean=await browser.newContext({viewport:{width:1280,height:900}}),cleanPage=await clean.newPage();
  await cleanPage.goto(server.base+'/vehicle.html');await cleanPage.waitForFunction(()=>document.body.dataset.expeditionState==='ready');
  await cleanPage.locator('#expedition-panel').scrollIntoViewIfNeeded();await cleanPage.screenshot({path:path.join(shots,'p3-expedition-menu.png')});
  await cleanPage.setViewportSize({width:390,height:780});await cleanPage.locator('#expedition-panel').scrollIntoViewIfNeeded();await cleanPage.screenshot({path:path.join(shots,'p3-expedition-mobile.png')});await clean.close();
  console.log('PASS: eight-mission UI and score wiring. Terminal-state fixtures are not full natural/human playthroughs. Screenshots: '+shots);
}finally{await browser?.close();await server.stop();}
