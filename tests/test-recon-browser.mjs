import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {flightPilotKeys} from './test-flight-pilot.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const shots=process.env.VEHICLE_SCREENSHOT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'neon-recon-'));fs.mkdirSync(shots,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:960,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 await page.goto(process.env.VEHICLE_TEST_URL||'http://127.0.0.1:5173/vehicle.html');await page.waitForFunction(()=>document.body.dataset.flightMissionStatus==='idle');
 const sentinel={'neon-eclipse.journey.v4':'recon-keep','neon-eclipse.naval-difficulty.v1':'easy','neon-eclipse-flight-invert-ws':'false'};await page.evaluate(s=>{for(const [k,v] of Object.entries(s))localStorage.setItem(k,v);},sentinel);
 const start=async()=>{await page.click('#start-recon');await page.click('#start-recon');await page.waitForFunction(()=>document.body.dataset.flightMissionType==='recon'&&document.body.dataset.driveActive==='true');};
 await page.click('#start-recon');assert.equal(await page.getAttribute('body','data-flight-mission-status'),'idle');await page.click('#start-recon');
 const read=()=>page.evaluate(()=>({type:document.body.dataset.flightMissionType,status:document.body.dataset.flightMissionStatus,phase:document.body.dataset.flightMissionPhase,route:{index:+document.body.dataset.flightMissionGate},progress:+document.body.dataset.reconProgress,upload:+document.body.dataset.reconUpload,records:JSON.parse(document.body.dataset.reconRecords),remaining:+document.body.dataset.flightMissionRemaining,p:JSON.parse(document.body.dataset.flightPlane)}));
 await page.waitForFunction(()=>document.body.dataset.flightMissionType==='recon');assert.equal((await read()).records.length,0);await page.keyboard.press('KeyE');assert.equal(await page.getAttribute('body','data-vehicle-kind'),'plane');
 const held=new Set();async function keys(next){for(const k of [...held])if(!next.includes(k)){await page.keyboard.up(k);held.delete(k);}for(const k of next)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}}
 const deadline=Date.now()+260000;let interrupted=false,pauseChecked=false,uploadChecked=false,last='',scanShot=false;const phases=new Set();
 while(Date.now()<deadline){
  const s=await read();if(last!==s.phase+':'+s.route.index){console.log('STATE',s.phase,s.route.index,JSON.stringify(s.p));last=s.phase+':'+s.route.index;}phases.add(s.phase);
  if(s.status!=='active'){assert.equal(s.status,'won',JSON.stringify(s));break;}
  const next=flightPilotKeys(s.p,s);if(s.phase==='route')next.push('KeyF');await keys(next);
  if(!interrupted&&s.progress>.25&&s.route.index===0){await keys(next.filter(k=>k!=='KeyF'));await page.waitForFunction(()=>+document.body.dataset.reconProgress===0);interrupted=true;continue;}
  if(interrupted&&!pauseChecked&&s.progress>.25&&s.route.index===0){await page.keyboard.press('Escape');await keys([]);const frozen=await read();await page.waitForTimeout(300);assert.deepEqual(await read(),frozen);await page.click('#resume-drive');pauseChecked=true;continue;}
  if(s.progress>.35&&!scanShot){await page.screenshot({path:path.join(shots,'recon-stable-scan.png')});scanShot=true;}
  if(s.phase==='upload'&&!uploadChecked){assert.equal(s.records.length,3);assert(s.p.onGround&&s.p.speed<=1);await keys(['Space']);await page.waitForTimeout(350);assert.equal((await read()).status,'active');assert.equal((await read()).upload,0);
   await keys(['Space','KeyF']);await page.waitForFunction(()=>+document.body.dataset.reconUpload>.3);await keys(['Space']);await page.waitForFunction(()=>+document.body.dataset.reconUpload===0);uploadChecked=true;
  }
  if(s.phase==='upload'&&uploadChecked)await keys(['Space','KeyF']);
  await page.waitForTimeout(45);
 }
 await keys([]);const victory=await read();assert.equal(victory.status,'won');assert.equal(victory.records.length,3);assert.equal(victory.p.landings,1);assert.equal(victory.upload,2);assert(interrupted&&pauseChecked&&uploadChecked&&scanShot);assert(phases.has('approach')&&phases.has('landing')&&phases.has('stop'));
 assert.match(await page.locator('#drive-overlay-copy').textContent(),/已安全返航并上传/);await page.screenshot({path:path.join(shots,'recon-return-victory.png')});
 await page.waitForFunction(()=>document.body.dataset.flightScorePending==='0'&&document.querySelector('#flight-records-panel').dataset.state==='ready');
 assert.equal(await page.getAttribute('[data-task=recon][data-rules=recon-v1]','data-count'),'1','actual win automatically commits one local score');

 await page.keyboard.press('Escape');assert.equal(await page.getAttribute('body','data-drive-active'),'false');await page.click('#retry-flight');await page.waitForFunction(()=>document.body.dataset.driveActive==='true');assert.equal((await read()).type,'recon');assert.equal((await read()).records.length,0);assert.equal((await read()).upload,0);
 await page.keyboard.down('Shift');await page.keyboard.down('KeyS');await page.waitForFunction(()=>document.body.dataset.flightMissionStatus==='lost',{},{timeout:60000});await page.keyboard.up('Shift');await page.keyboard.up('KeyS');assert.match(await page.locator('#drive-overlay-title').textContent(),/任务失败/);
 await page.click('#finish-flight-free');await page.waitForFunction(()=>document.body.dataset.flightMissionStatus==='idle');assert(await page.locator('#recon-scan-panel').isHidden());
 await page.keyboard.press('Escape');await start();
 for(const [width,height] of [[1280,720],[960,640],[390,640],[320,640]]){await page.setViewportSize({width,height});await page.waitForTimeout(150);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const overlap=await page.evaluate(()=>{const r=['.drive-objective','#flight-instruments','.drive-instruments'].map(s=>document.querySelector(s).getBoundingClientRect());return r.some((a,i)=>r.some((b,j)=>i<j&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));});assert(!overlap,'HUD overlap '+width+'x'+height);}
 await page.keyboard.press('Escape');await page.click('#start-flight');await page.click('#start-flight');await page.waitForFunction(()=>document.body.dataset.flightMissionType==='return');assert(await page.locator('#recon-scan-panel').isHidden());
 await page.keyboard.press('Escape');await page.click('#start-chase');await page.click('#start-chase');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='active');assert.equal((await read()).status,'idle');
 await page.keyboard.press('Escape');await start();assert.equal(await page.getAttribute('body','data-sea-projectiles'),'0');assert.equal(await page.getAttribute('body','data-chase-status'),'idle');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForFunction(()=>document.body.dataset.driveActive==='false');const frozen=await read();await page.waitForTimeout(250);assert.deepEqual(await read(),frozen);
 assert.deepEqual(await page.evaluate(s=>Object.fromEntries(Object.keys(s).map(k=>[k,localStorage.getItem(k)])),sentinel),sentinel);await page.reload();await page.waitForFunction(()=>document.body.dataset.flightMissionStatus==='idle');await page.waitForFunction(()=>document.querySelector('#flight-records-panel').dataset.state==='ready');assert.equal(await page.getAttribute('[data-task=recon][data-rules=recon-v1]','data-count'),'1','reload preserves score and failure does not add one');assert.deepEqual(errors,[]);
 console.log('PASS: full real-key recon scan/return/landing/upload; scan and upload release reset, pause, explicit ground upload, typed retry, boundary failure, mode transitions, responsive HUD, blur and save isolation');
}finally{await browser.close();}
