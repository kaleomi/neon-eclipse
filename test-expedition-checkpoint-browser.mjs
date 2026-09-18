// Real app and native checkpoint event callsites. Positions/terminal states are controlled fixtures,
// not a natural four-stage playthrough. Original keyboard regressions remain separate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
const fixture=`
window.__p3Checkpoint={
 state:()=>expeditionUI.snapshot(),
 async seed(count){const m=await import('./expedition-model.js'),{createExpeditionStore}=await import('./expedition-store.js');let a=m.newExpeditionCampaign(m.emptyExpedition(),'hard');
  for(let i=0;i<count;i++){const s=m.EXPEDITION_MISSIONS[i];a=m.advanceExpedition(a,{schema:1,id:crypto.randomUUID(),campaignId:a.campaign.id,mission:s.id,rule:s.rule,difficulty:s.selectable?'hard':'fixed',resumed:false,elapsedMs:100000,completedAt:Date.now()});}
  const store=createExpeditionStore(),r=await store.read();const result=await store.write({operationId:crypto.randomUUID(),checkpoint:a},r.revision);store.close();return result;
 },
 async legacy(seed=false){const {createJointCheckpointStore}=await import('./joint-checkpoint-store.js'),{checkpointFromMission}=await import('./joint-checkpoint-model.js');
  const a=createNavalCheckpointStore(),b=createJointCheckpointStore();
  if(seed){const m=createNavalRun(yacht,'easy');m.index=1;m.elapsed=10;const n=createJointMission(true);n.stage='drive';n.completed=['pickup'];n.elapsed=10;
   for(const [s,c] of [[a,navalCheckpointFromMission(m)],[b,checkpointFromMission(n)]]){const r=await s.read();await s.write({operationId:crypto.randomUUID(),checkpoint:c},r.revision);}}
  const r=[await a.read(),await b.read()];a.close();b.close();return r;
 },
 navalPoint(index){pause();const g=CHASE_GATES[index-1];Object.assign(yacht,{x:g.x,z:g.z,speed:0});resume();updatePhysics(1/120);pause();return chase.index;},
 jointPoint(stage){pause();joint.flightId=null;
  if(stage==='drive'){joint.stage='pickup';joint.completed=[];joint.hold=1;kind=null;player={x:-112,z:112,yaw:0};}
  else if(stage==='airfield'){joint.stage='return';joint.completed=JOINT_STAGES.slice(0,4);kind=null;player={x:272,z:180,yaw:0};Object.assign(yacht,{x:278,z:180,speed:0});}
  else{joint.stage='airfield';joint.completed=JOINT_STAGES.slice(0,5);joint.hold=2;kind='rover';Object.assign(rover,{x:-310,z:245,speed:0});}
  resume();if(stage==='drive')keys.add('KeyF');updatePhysics(1/120);pause();return joint.stage;
 },
 loseNaval(){pause();chase.status='lost';chase.reason='受控失败';finishChase();},
 win(id){pause();const m=id==='naval'?chase:joint;
  if(id==='naval'){Object.assign(m,{status:'won',index:3,escaped:true,complete:true,elapsed:60,remaining:m.naval.profile.timeLimit-60});m.naval.members.forEach(s=>s.escaped=true);finishChase();}
  else{Object.assign(m,{status:'won',stage:'complete',completed:[...JOINT_STAGES],flightId:crypto.randomUUID(),elapsed:300});finishJoint();}
 },
 template:()=>({naval:{index:chase.index,recovered:chase.recovered,difficulty:chase.naval?.profile.id,speed:yacht.speed},joint:{stage:joint.stage,recovered:joint.recovered,completed:[...joint.completed],roverSpeed:rover.speed,planeSpeed:plane.speed,throttle:plane.throttle}})
};`;
try{
  browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const c=await browser.newContext({viewport:{width:1280,height:900}}),p=await c.newPage(),errors=[];p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await c.route('**/vehicle-app.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(new URL('./vehicle-app.js',import.meta.url),'utf8')+'\n'+fixture}));
  await p.goto(server.base+'/vehicle.html');await p.waitForFunction(()=>document.body.dataset.expeditionState==='ready');
  const twice=async s=>{await p.click(s);await p.click(s);};
  const ready=n=>p.waitForFunction(n=>document.body.dataset.expeditionState==='ready'&&document.body.dataset.expeditionCompleted===String(n),n);
  const playing=id=>p.waitForFunction(id=>document.body.dataset.expeditionState==='playing'&&document.body.dataset.expeditionMission===id,id);
  const node=stage=>p.waitForFunction(stage=>{const s=window.__p3Checkpoint.state();return !s.busy&&!s.pending&&s.archive.checkpoint?.node.stage===stage;},stage);
  const legacy=await p.evaluate(()=>window.__p3Checkpoint.legacy(true));
  assert((await p.evaluate(()=>window.__p3Checkpoint.seed(1))).ok);await p.click('#expedition-refresh');await ready(1);
  await twice('#expedition-continue');await playing('naval');assert.equal(await p.evaluate(()=>window.__p3Checkpoint.navalPoint(1)),1);await node('gate-1');
  assert.deepEqual(await p.evaluate(()=>window.__p3Checkpoint.legacy()),legacy,'campaign checkpoint must not replace standalone nodes');
  await p.reload();await ready(1);await p.click('#expedition-checkpoint');assert.equal(await p.getAttribute('body','data-chase-status'),'idle','first click only previews');await p.click('#expedition-checkpoint');await playing('naval');
  let state=await p.evaluate(()=>window.__p3Checkpoint.template());assert.equal(state.naval.index,1);assert(state.naval.recovered);assert.equal(state.naval.difficulty,'hard');assert.equal(state.naval.speed,0);assert.equal(await p.getAttribute('body','data-expedition-resumed'),'true');assert(await p.locator('[data-exp-backup-file]').isDisabled());
  for(const i of [2,3]){assert.equal(await p.evaluate(i=>window.__p3Checkpoint.navalPoint(i),i),i);await node('gate-'+i);}
  await p.evaluate(()=>window.__p3Checkpoint.loseNaval());await ready(1);await p.reload();await ready(1);await twice('#expedition-checkpoint');await playing('naval');
  assert.equal((await p.evaluate(()=>window.__p3Checkpoint.template())).naval.index,3);await p.evaluate(()=>window.__p3Checkpoint.win('naval'));await ready(2);
  assert.equal(await p.getAttribute('.expedition-record-row[data-mission="naval"][data-difficulty="hard"]','data-count'),'0');assert.equal(await p.getAttribute('.expedition-record-row[data-mission="naval"][data-difficulty="hard"]','data-resumed-count'),'1');
  assert.equal(await p.evaluate(()=>window.__p3Checkpoint.state().archive.checkpoint),null);assert.deepEqual(await p.evaluate(()=>window.__p3Checkpoint.legacy()),legacy);
  console.log('PASS native naval save callsites at all three gates, refresh/failure/resume, difficulty, no solo-store pollution, recovered completion advances without a clean score');

  assert((await p.evaluate(()=>window.__p3Checkpoint.seed(3))).ok);await p.click('#expedition-refresh');await ready(3);await twice('#expedition-continue');await playing('joint');
  for(const stage of ['drive','airfield','board-plane']){assert.equal(await p.evaluate(stage=>window.__p3Checkpoint.jointPoint(stage),stage),stage);await node(stage);}
  assert.deepEqual(await p.evaluate(()=>window.__p3Checkpoint.legacy()),legacy);
  await p.reload();await ready(3);await twice('#expedition-checkpoint');await playing('joint');state=await p.evaluate(()=>window.__p3Checkpoint.template());
  assert.equal(state.joint.stage,'board-plane');assert(state.joint.recovered);assert.equal(state.joint.completed.length,6);assert.equal(state.joint.roverSpeed,0);assert.equal(state.joint.planeSpeed,0);assert.equal(state.joint.throttle,0);assert.match(await p.locator('.drive-objective>small').textContent(),/检查点继续/);
  await p.evaluate(()=>window.__p3Checkpoint.win('joint'));await ready(4);assert.equal(await p.getAttribute('.expedition-record-row[data-mission="joint"]','data-count'),'0');assert.equal(await p.getAttribute('.expedition-record-row[data-mission="joint"]','data-resumed-count'),'1');assert(await p.locator('#expedition-checkpoint').isDisabled());
  assert.equal(await p.evaluate(()=>window.__p3Checkpoint.state().archive.checkpoint),null);assert.deepEqual(await p.evaluate(()=>window.__p3Checkpoint.legacy()),legacy);await c.close();
  assert.deepEqual(errors,[]);console.log('PASS native joint safe-node callsites, approved stopped templates, resumed HUD/progression, separate qualification and unchanged legacy nodes');

  // Capture a clean production menu, never a fixture victory.
  const clean=await browser.newContext({viewport:{width:1280,height:1000}}),cp=await clean.newPage();await cp.goto(server.base+'/vehicle.html');await cp.waitForFunction(()=>document.body.dataset.expeditionState==='ready');
  await cp.click('.expedition-backup>summary');await cp.waitForFunction(()=>document.querySelector('[data-exp-backup-health]').textContent.includes('0/4'));
  const shots=process.env.VEHICLE_SCREENSHOT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'neon-expedition-b5-'));fs.mkdirSync(shots,{recursive:true});
  await cp.locator('.expedition-backup').screenshot({path:path.join(shots,'p3-backup-desktop.png')});
  for(const width of [390,320]){await cp.setViewportSize({width,height:900});await cp.locator('.expedition-backup').scrollIntoViewIfNeeded();assert(await cp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===390)await cp.locator('.expedition-backup').screenshot({path:path.join(shots,'p3-backup-mobile.png')});}
  await clean.close();console.log('PASS clean production backup panel desktop/mobile; screenshots '+shots);
}finally{await browser?.close();await server.stop();}
