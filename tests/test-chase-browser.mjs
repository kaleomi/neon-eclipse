import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {seaPath,pursuitInput,CHASE_GATES,CHASE_EVAC} from '../src/chase-rules.js';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const shots=process.env.VEHICLE_SCREENSHOT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'neon-chase-'));fs.mkdirSync(shots,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1000,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 await page.goto(process.env.VEHICLE_TEST_URL||'http://127.0.0.1:5173/vehicle.html');
 await page.evaluate(()=>{localStorage.setItem('neon-eclipse.campaign.v1','chase-sentinel');localStorage.setItem('neon-eclipse.journey.v4','journey-sentinel');});
 await page.click('#start-chase');assert.equal(await page.getAttribute('body','data-chase-status'),'idle','start requires confirmation');await page.click('#start-chase');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='active');assert.equal(await page.getAttribute('body','data-vehicle-kind'),'yacht');
 await page.keyboard.press('KeyE');assert.equal(await page.getAttribute('body','data-vehicle-kind'),'yacht');await page.keyboard.down('KeyR');await page.waitForTimeout(1650);await page.keyboard.up('KeyR');assert.equal(await page.getAttribute('body','data-chase-status'),'active','R cannot bypass mission');
 await page.keyboard.press('Escape');const paused=await page.evaluate(()=>[document.body.dataset.chaseRemaining,document.body.dataset.chaseEnemyX,document.body.dataset.chaseEnemyZ,document.body.dataset.yachtX]);await page.waitForTimeout(300);assert.deepEqual(await page.evaluate(()=>[document.body.dataset.chaseRemaining,document.body.dataset.chaseEnemyX,document.body.dataset.chaseEnemyZ,document.body.dataset.yachtX]),paused,'pause freezes both boats and deadline');
 await page.click('#resume-drive');const held=new Set();
 async function keys(next){for(const key of [...held])if(!next.includes(key)){await page.keyboard.up(key);held.delete(key);}for(const key of next)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}}
 let nav=[],lastGate=-1,repath=0,maxGate=0;const deadline=Date.now()+170000;
 while(Date.now()<deadline){
  const state=await page.evaluate(()=>({status:document.body.dataset.chaseStatus,index:Number(document.body.dataset.chaseGate),x:Number(document.body.dataset.yachtX),z:Number(document.body.dataset.yachtZ),yaw:Number(document.body.dataset.yachtYaw),speed:Number(document.querySelector('#drive-speed').textContent)/3.6}));
  if(state.status!=='active'){assert.equal(state.status,'won','keyboard-driven route must win');break;}
  maxGate=Math.max(maxGate,state.index);const goal=CHASE_GATES[state.index]||CHASE_EVAC;
  if(Date.now()>repath||state.index!==lastGate){nav=seaPath(state,goal);repath=Date.now()+600;lastGate=state.index;}
  while(nav.length>1&&Math.hypot(state.x-nav[0].x,state.z-nav[0].z)<13)nav.shift();
  const input=pursuitInput(state,nav[0]||goal,nav,32),next=[];if(input.brake)next.push('Space');else next.push('KeyW');if(input.steer<-.16)next.push('KeyA');if(input.steer>.16)next.push('KeyD');await keys(next);await page.waitForTimeout(65);
 }
 await keys([]);assert.equal(await page.getAttribute('body','data-chase-status'),'won');assert.equal(maxGate,3);assert.equal(await page.getAttribute('body','data-chase-escaped'),'true');assert.match(await page.locator('#drive-overlay-title').textContent(),/撤离成功/);assert(await page.locator('#resume-drive').isHidden());await page.screenshot({path:path.join(shots,'chase-victory.png')});
 // Actual repeated impacts into the coast exercise failure presentation and a clean retry.
 await page.click('#start-chase');await page.click('#start-chase');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='active');assert.equal(Number(await page.getAttribute('body','data-chase-hull')),100);assert.equal(await page.getAttribute('body','data-chase-gate'),'0');
 for(let attempt=0;attempt<8&&await page.getAttribute('body','data-chase-status')==='active';attempt++){
  if(attempt){await keys(['Space']);await page.waitForTimeout(500);await keys(['KeyS']);await page.waitForTimeout(3000);await keys([]);}
  const oldHull=Number(await page.getAttribute('body','data-chase-hull')),impactDeadline=Date.now()+12000;
  while(Date.now()<impactDeadline&&Number(await page.getAttribute('body','data-chase-hull'))===oldHull&&await page.getAttribute('body','data-chase-status')==='active'){
   const yaw=Number(await page.getAttribute('body','data-yacht-yaw')),error=Math.atan2(Math.sin(-Math.PI/2-yaw),Math.cos(-Math.PI/2-yaw)),input=['KeyW'];if(error<-.1)input.push('KeyA');if(error>.1)input.push('KeyD');await keys(input);await page.waitForTimeout(70);
  }
  await keys([]);
 }
 assert.equal(await page.getAttribute('body','data-chase-status'),'lost','actual repeated hull impacts cause failure');assert.match(await page.locator('#drive-overlay-title').textContent(),/任务失败/);await page.screenshot({path:path.join(shots,'chase-failure.png')});
 await page.keyboard.press('Escape');assert.equal(await page.getAttribute('body','data-drive-active'),'false','terminal result cannot resume by Escape');
 await page.click('#start-chase');await page.click('#start-chase');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='active');assert.equal(Number(await page.getAttribute('body','data-chase-hull')),100);await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(shots,'chase-pause-mobile.png')});
 await page.click('#chase-free-drive');await page.click('#chase-free-drive');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='idle');assert.equal(await page.getAttribute('body','data-vehicle-kind'),'walking');
 assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.campaign.v1')),'chase-sentinel');assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v4')),'journey-sentinel');assert.deepEqual(errors,[]);
 console.log('PASS: real keyboard full pursuit/checkpoints/escape/extraction victory, actual hull-impact failure, confirmation/retry/free-drive, E/R protections, pause freeze, narrow layout and campaign save isolation');
}finally{await browser.close();}
