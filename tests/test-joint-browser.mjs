import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {flightPilotKeys} from './test-flight-pilot.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');const shots=process.env.VEHICLE_SCREENSHOT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'joint-'));fs.mkdirSync(shots,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function walk(p,g){const dx=g.x-p.x,dz=g.z-p.z,f=dx*Math.sin(p.yaw)-dz*Math.cos(p.yaw),r=dx*Math.cos(p.yaw)+dz*Math.sin(p.yaw),a=[];if(Math.abs(f)>.4*Math.abs(r))a.push(f>0?'KeyW':'KeyS');if(Math.abs(r)>.4*Math.abs(f))a.push(r>0?'KeyD':'KeyA');return [...a,'ShiftLeft'];}
function drive(p,g,boat=false,last=true){const d=dist(p,g),angle=wrap(Math.atan2(g.x-p.x,-(g.z-p.z))-p.yaw);if(d<(boat&&last?1:2.5))return ['Space'];const speed=boat?(Math.abs(angle)>.35?5:d<18?3:16):(Math.abs(angle)>.35?6:d<20?5:16),a=[];if(angle>.035)a.push('KeyD');if(angle<-.035)a.push('KeyA');if(p.speed<speed)a.push('KeyW');if(p.speed>speed+1)a.push('Space');return a;}
try{const page=await browser.newPage({viewport:{width:960,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Drive native physics with real keys at a controlled browser-clock cadence, independent of slow CDP/render round trips.
 // This is not a realtime/performance acceptance run. Keep the original wall-time deadline and every gameplay assertion.
 let controlled=false;
 const waitFor=async(fn,arg)=>{if(!controlled)return page.waitForFunction(fn,arg);const end=Date.now()+30000;while(Date.now()<end){if(await page.evaluate(fn,arg))return;await page.clock.runFor(32);}throw Error('Native page condition timed out');};
 await page.clock.install();
 // Read-only native exit probe. The pilot still moves exclusively with real keys; no pose/task mutations.
 const source=fs.readFileSync(new URL('../src/vehicle-app.js',import.meta.url),'utf8');
 await page.route('**/vehicle-app.js',route=>route.fulfill({contentType:'text/javascript',body:source+'\nwindow.__jointDockProbe=(pose={...yacht,speed:0})=>yachtExit(pose,safeExitWorld).ok;\n'}));
 await page.goto(process.env.VEHICLE_TEST_URL||'http://127.0.0.1:5173/vehicle.html');await waitFor(()=>document.body.dataset.jointStatus==='idle');
 // The previously stalled pose is within 1.5 m of the target but faces no walkable exit.
 assert.equal(await page.evaluate(p=>window.__jointDockProbe(p),{x:277.3568243181151,z:181.21581898762992,yaw:-2.4151898998831327,speed:0}),false,'distance alone does not guarantee safe disembarkation');
 assert.equal(await page.evaluate(()=>window.__jointDockProbe({x:278,z:180,yaw:0,speed:0})),true,'the native stopped docking template is safe');
 await page.click('#start-joint');assert.equal(await page.getAttribute('body','data-joint-status'),'idle');await page.click('#start-joint');await waitFor(()=>document.body.dataset.jointStatus==='active');
 await page.clock.pauseAt(new Date(Date.now()+100));controlled=true;
 const read=()=>page.evaluate(()=>{const d=document.body.dataset;return {status:d.jointStatus,stage:d.jointStage,kind:d.vehicleKind,active:d.driveActive==='true',elapsed:Number(d.jointElapsed),canDock:window.__jointDockProbe(),player:JSON.parse(d.jointPlayer),rover:JSON.parse(d.jointRover),yacht:JSON.parse(d.jointYacht),p:JSON.parse(d.flightPlane),type:d.flightMissionType,phase:d.flightMissionPhase,route:{index:+d.flightMissionGate}};});
 const held=new Set();async function keys(next){for(const k of [...held])if(!next.includes(k)){await page.keyboard.up(k);held.delete(k);}for(const k of next)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}}
 let last='',way=0,pauseTest=false,restoredAirport=false,backOut=false,stuckSince=0,pulse=0;const savedStages=new Set();const visited=new Set(),deadline=Date.now()+1050000;
 while(Date.now()<deadline){const s=await read();if(Date.now()-pulse>15000){console.log('PILOT',JSON.stringify(s));pulse=Date.now();}if(s.stage!==last){console.log('STAGE',new Date().toISOString(),s.stage,JSON.stringify(s));last=s.stage;visited.add(last);await page.screenshot({path:path.join(shots,'joint-'+last+'.png')});}if(s.status!=='active'){assert.equal(s.status,'won',JSON.stringify(s));break;}assert.equal(s.active,true,'Unexpected pause: '+JSON.stringify(s));
  if(['drive','airfield','board-plane'].includes(s.stage)&&!savedStages.has(s.stage)){
   await keys([]);await waitFor(stage=>{const d=document.querySelector('#joint-checkpoint-panel').dataset;return d.state==='ready'&&d.stage===stage;},s.stage);savedStages.add(s.stage);
  }
  if(s.stage==='board-plane'&&!restoredAirport){
   await keys([]);const previousRun=await page.getAttribute('body','data-joint-run-id');await page.reload();await waitFor(()=>document.body.dataset.jointStatus==='idle'&&document.querySelector('#joint-checkpoint-panel').dataset.state==='ready');
   await page.locator('#joint-checkpoint-panel').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(shots,'checkpoint-airport-after-reload.png')});page.once('dialog',d=>d.accept());await page.click('#resume-joint-checkpoint');await waitFor(()=>document.body.dataset.jointStage==='board-plane'&&document.body.dataset.driveActive==='true');
   assert.notEqual(await page.getAttribute('body','data-joint-run-id'),previousRun);assert.equal(await page.getAttribute('body','data-joint-recovered'),'true');const restored=await read();assert.equal(restored.kind,'walking');assert.equal(restored.p.speed,0);assert.equal(restored.p.throttle,0);assert.equal(restored.p.crashed,false);assert.equal(restored.p.landings,0);await page.screenshot({path:path.join(shots,'checkpoint-airport-restored.png')});restoredAirport=true;continue;
  }
  let next=[];
  if(s.stage==='pickup'){if(dist(s.player,{x:-112,z:112})>4.3)next=walk(s.player,{x:-112,z:112});else next=['KeyF'];}
  if(['drive','airfield'].includes(s.stage)){if(s.kind!=='rover'){let g=s.rover;if(s.player.x>219)g={x:218,z:180};if(dist(s.player,s.rover)<4){await keys([]);await page.keyboard.press('KeyE');}else next=walk(s.player,g);}else next=drive(s.rover,s.stage==='drive'?{x:207,z:195}:{x:-310,z:245});}
  if(s.stage==='board'){if(s.kind==='rover'){await keys([]);await page.keyboard.press('KeyE');}else if(s.kind==='walking'){const g=s.player.x<216?{x:218,z:180}:{x:271,z:180};if(dist(s.player,{x:272,z:180})<2.3){await keys([]);await page.keyboard.press('KeyE');}else next=walk(s.player,g);}}
  // HUD phase publication is throttled. Once aboard, never press E again while waiting for the next phase.
  if(s.stage==='deliver'){assert.equal(s.kind,'yacht','Pilot must remain aboard for delivery');next=drive(s.yacht,{x:420,z:360},true);next.push('KeyF');}
  if(s.stage==='return'&&s.kind==='yacht'){
   const points=[{x:335,z:325},{x:277,z:250},{x:277,z:180}],d=dist(s.yacht,points[2]);
   if(backOut){next=['KeyS'];if(d>14){backOut=false;way=0;stuckSince=0;next=['Space'];}}
   else{
    if(way<2&&dist(s.yacht,points[way])<7)way++;next=drive(s.yacht,points[way],true,way===2);
    if(way===2&&d<8&&s.canDock){next=['Space'];stuckSince=0;if(Math.abs(s.yacht.speed)<.4){await keys(next);await page.keyboard.press('KeyE');}}
    else if(way===2&&d<4&&Math.abs(s.yacht.speed)<.3){stuckSince||=Date.now();if(Date.now()-stuckSince>1200){backOut=true;next=['KeyS'];console.log('DOCK retry through real reverse keys:',JSON.stringify(s.yacht));}}
    else stuckSince=0;
   }
  }
  if(s.stage==='board-plane'){if(s.kind==='rover'){await keys([]);await page.keyboard.press('KeyE');}else if(s.kind==='walking'){if(dist(s.player,s.p)<9.3){await keys([]);await page.keyboard.press('KeyE');}else next=walk(s.player,s.player.x<s.rover.x+4&&s.player.z>s.rover.z-3?{x:s.rover.x+7,z:s.rover.z+4}:s.p);}}
  if(s.stage==='recon'){next=flightPilotKeys(s.p,s);if(['route','upload'].includes(s.phase))next.push('KeyF');}
  if(s.stage==='handoff'){if(s.kind==='plane'){await keys(['Space']);await page.keyboard.press('KeyE');}else if(dist(s.player,{x:-316,z:-275})>4.2)next=walk(s.player,{x:-316,z:-275});else next=['KeyF'];}
  if(!pauseTest&&s.stage==='drive'){await keys([]);await page.keyboard.press('Escape');const before=await page.getAttribute('body','data-joint-elapsed');await page.clock.runFor(300);assert.equal(await page.getAttribute('body','data-joint-elapsed'),before);await page.click('#resume-drive');pauseTest=true;}
  // One native animation frame per decision; no renderer or gameplay state is stubbed.
  await keys(next);await page.clock.fastForward(50);
 }
 await keys([]);const final=await read();assert.equal(final.status,'won',JSON.stringify(final));assert.equal(visited.size,10);assert(restoredAirport);assert.equal(savedStages.size,3);await waitFor(()=>document.querySelector('#joint-checkpoint-panel').dataset.state==='ready'&&document.querySelector('#joint-checkpoint-panel').dataset.stage==='');assert(await page.locator('#resume-joint-checkpoint').isDisabled());assert.equal(await page.getAttribute('[data-task=recon][data-rules=recon-v1]','data-count'),'0','joint flight never creates standalone score');assert.deepEqual(errors,[]);
 await page.reload();await waitFor(()=>document.querySelector('#joint-checkpoint-panel').dataset.state==='ready');assert(await page.locator('#resume-joint-checkpoint').isDisabled());await page.click('#start-joint');await page.click('#start-joint');await waitFor(()=>document.body.dataset.jointStatus==='active'&&document.body.dataset.jointStage==='pickup');await page.keyboard.press('Escape');page.once('dialog',d=>d.accept());await page.click('#abort-joint');await waitFor(()=>document.body.dataset.jointStatus==='idle');assert.equal(await page.getAttribute('body','data-flight-mission-status'),'idle');
 console.log('PASS: controlled-clock real-key joint pickup, drive, boarding, sea delivery, docking/disembark, land transfer, recon, safe landing and handoff; pause, restart, abort, no standalone score; all 3 checkpoints saved, airport reload/restore, recovered qualification, completion cleanup survives reload');
}finally{await browser.close();}
