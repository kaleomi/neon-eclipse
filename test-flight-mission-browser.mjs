import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {flightPilotKeys} from './test-flight-pilot.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const screenshots=process.env.VEHICLE_SCREENSHOT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'neon-flight-'));fs.mkdirSync(screenshots,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:960,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 const url=process.env.VEHICLE_TEST_URL||'http://127.0.0.1:5173/vehicle.html';await page.goto(url);await page.waitForFunction(()=>document.body.dataset.flightMissionStatus==='idle');
 const sentinel={'neon-eclipse.journey.v4':'flight-test-keep','neon-eclipse.combat-difficulty.v1':'hard','neon-eclipse.naval-difficulty.v1':'easy'};
 await page.evaluate(s=>{for(const [k,v] of Object.entries(s))localStorage.setItem(k,v);},sentinel);
 const start=async()=>{await page.click('#start-flight');await page.click('#start-flight');await page.waitForFunction(()=>document.body.dataset.flightMissionStatus==='active');};
 await page.click('#start-flight');assert.equal(await page.getAttribute('body','data-flight-mission-status'),'idle','first click only confirms');await page.click('#start-flight');await page.waitForFunction(()=>document.body.dataset.flightMissionStatus==='active');
 assert.equal(await page.getAttribute('body','data-vehicle-kind'),'plane');assert.equal(await page.getAttribute('body','data-chase-status'),'idle');
 await page.keyboard.press('KeyE');assert.equal(await page.getAttribute('body','data-vehicle-kind'),'plane','mission blocks exit');
 await page.keyboard.down('KeyR');await page.waitForTimeout(1800);await page.keyboard.up('KeyR');assert.equal(await page.getAttribute('body','data-flight-mission-status'),'active','mission blocks quick recovery');
 await page.keyboard.press('Escape');const before=await page.evaluate(()=>[document.body.dataset.flightMissionRemaining,document.body.dataset.flightPlane]);await page.waitForTimeout(300);assert.deepEqual(await page.evaluate(()=>[document.body.dataset.flightMissionRemaining,document.body.dataset.flightPlane]),before);
 await page.screenshot({path:path.join(screenshots,'flight-task-briefing.png')});
 await page.click('#flight-free-drive');await page.click('#flight-free-drive');await page.waitForFunction(()=>document.body.dataset.flightMissionStatus==='idle');assert.equal(await page.getAttribute('body','data-vehicle-kind'),'walking');await page.keyboard.press('Escape');await start();
 const held=new Set();async function keys(next){for(const k of [...held])if(!next.includes(k)){await page.keyboard.up(k);held.delete(k);}for(const k of next)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}}
 const read=()=>page.evaluate(()=>({status:document.body.dataset.flightMissionStatus,phase:document.body.dataset.flightMissionPhase,route:{index:+document.body.dataset.flightMissionGate},remaining:+document.body.dataset.flightMissionRemaining,p:JSON.parse(document.body.dataset.flightPlane)}));
 const phases=new Set(),deadline=Date.now()+240000;let last='',snapshot=false;
 while(Date.now()<deadline){
  const s=await read();if(s.phase!==last){console.log('PHASE',s.phase,JSON.stringify(s.p));last=s.phase;}phases.add(s.phase);
  if(s.status!=='active'){assert.equal(s.status,'won',JSON.stringify(s));break;}
  await keys(flightPilotKeys(s.p,s));
  if(s.route.index===5&&!snapshot){snapshot=true;assert.equal(s.status,'active','all five gates do not award airborne victory');await page.screenshot({path:path.join(screenshots,'flight-return-approach.png')});}
  await page.waitForTimeout(45);
 }
 await keys([]);assert.equal((await read()).status,'won');assert(snapshot);assert(phases.has('landing')&&phases.has('stop'));
 assert.equal((await read()).p.landings,1);assert((await read()).p.onGround);assert((await read()).p.speed<=1);assert.match(await page.locator('#drive-overlay-title').textContent(),/返航成功/);assert(await page.locator('#resume-drive').isHidden());assert(await page.locator('#retry-flight').isVisible());
 await page.screenshot({path:path.join(screenshots,'flight-return-victory.png')});
 await page.waitForFunction(()=>document.body.dataset.flightScorePending==='0'&&document.querySelector('#flight-records-panel').dataset.state==='ready');
 assert.equal(await page.getAttribute('[data-task=return][data-rules=return-v1]','data-count'),'1','actual win automatically commits one local score');

 const terminal=await page.getAttribute('body','data-flight-mission-remaining');await page.keyboard.press('Escape');await page.waitForTimeout(200);assert.equal(await page.getAttribute('body','data-drive-active'),'false');assert.equal(await page.getAttribute('body','data-flight-mission-remaining'),terminal);
 await page.click('#retry-flight');await page.waitForFunction(()=>document.body.dataset.flightMissionStatus==='active');assert.equal((await read()).route.index,0);assert((await read()).remaining>297);assert.equal((await read()).p.landings,0);
 // Take off with real keys, then retain full climb until the northern field boundary fails.
 await page.keyboard.down('Shift');await page.keyboard.down('KeyS');await page.waitForFunction(()=>document.body.dataset.flightMissionStatus==='lost',{},{timeout:60000});await page.keyboard.up('Shift');await page.keyboard.up('KeyS');
 assert.match(await page.locator('#drive-overlay-title').textContent(),/任务失败/);assert(await page.locator('#resume-drive').isHidden());
 await page.screenshot({path:path.join(screenshots,'flight-return-failure.png')});await page.click('#finish-flight-free');await page.waitForFunction(()=>document.body.dataset.flightMissionStatus==='idle');
 await page.keyboard.press('Escape');await start();
 for(const [width,height] of [[1280,720],[960,640],[390,640],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(120);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width);
  const overlaps=await page.evaluate(()=>{const r=['.drive-objective','#flight-instruments','.drive-instruments'].map(s=>document.querySelector(s).getBoundingClientRect());return r.some((a,i)=>r.some((b,j)=>i<j&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));});assert(!overlaps,'flight HUD overlaps '+width+'x'+height);
 }
 await page.keyboard.press('Escape');await page.click('#start-chase');await page.click('#start-chase');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='active');assert.equal(await page.getAttribute('body','data-flight-mission-status'),'idle');assert(await page.locator('#flight-instruments').isHidden());
 await page.keyboard.press('Escape');await start();assert.equal(await page.getAttribute('body','data-chase-status'),'idle');assert.equal(await page.getAttribute('body','data-sea-projectiles'),'0');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForFunction(()=>document.body.dataset.driveActive==='false');const frozen=await page.getAttribute('body','data-flight-mission-remaining');await page.waitForTimeout(250);assert.equal(await page.getAttribute('body','data-flight-mission-remaining'),frozen);
 assert.deepEqual(await page.evaluate(s=>Object.fromEntries(Object.keys(s).map(k=>[k,localStorage.getItem(k)])),sentinel),sentinel);
 await page.reload();await page.waitForFunction(()=>document.body.dataset.flightMissionStatus==='idle');await page.waitForFunction(()=>document.querySelector('#flight-records-panel').dataset.state==='ready');assert.equal(await page.getAttribute('[data-task=return][data-rules=return-v1]','data-count'),'1','reload preserves score and failure does not add one');assert.deepEqual(errors,[]);
 console.log('PASS: real keyboard full flight mission victory, no airborne success, safe landing/stop, retry, actual boundary failure, exit/recovery guards, pause/blur, sea-air cleanup, refresh/save isolation and responsive HUD. Screenshots: '+screenshots);
}finally{await browser.close();}
