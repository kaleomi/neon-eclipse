import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {seaPath,pursuitInput,CHASE_GATES,CHASE_EVAC} from './chase-rules.js';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const shots=process.env.VEHICLE_SCREENSHOT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'neon-sea-combat-'));fs.mkdirSync(shots,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 await page.goto(process.env.VEHICLE_TEST_URL||'http://127.0.0.1:5173/vehicle.html');await page.evaluate(()=>{localStorage.setItem('neon-eclipse.campaign.v1','sea-combat-sentinel');localStorage.setItem('neon-eclipse.journey.v4','journey-sentinel');});
 await page.click('#start-chase');await page.click('#start-chase');await page.waitForFunction(()=>document.body.dataset.seaWarning==='aim');assert.equal(await page.getAttribute('body','data-sea-enemy-shots'),'0','visible warning precedes first volley');await page.screenshot({path:path.join(shots,'sea-lock-warning.png')});
 await page.keyboard.press('Escape');const frozen=await page.evaluate(()=>[document.body.dataset.seaWarningRemaining,document.body.dataset.seaGunCooldown,document.body.dataset.seaProjectiles,document.body.dataset.chaseHull]);await page.keyboard.down('KeyF');await page.waitForTimeout(350);await page.keyboard.up('KeyF');assert.deepEqual(await page.evaluate(()=>[document.body.dataset.seaWarningRemaining,document.body.dataset.seaGunCooldown,document.body.dataset.seaProjectiles,document.body.dataset.chaseHull]),frozen);assert.equal(await page.getAttribute('body','data-sea-shots'),'0');

 // Manual cannon (docs/mcp-naval-manual-aim.md): F fires along the world aim, never auto-locking. The fixture aims
 // like a player without pointer lock: right-button drag rotates the aim (0.003 rad per px) towards the selected target.
 async function aimAt(targetIndex=null){
  const d=await page.evaluate(()=>({...document.body.dataset}));if(d.chaseStatus!=='active')return;
  const fleet=JSON.parse(d.navalFleet||'[]'),target=fleet[targetIndex??Number(d.navalTarget||0)]||fleet.find(s=>!s.sunk);if(!target||target.sunk)return;
  const want=Math.atan2(target.x-Number(d.yachtX),-(target.z-Number(d.yachtZ))),have=Number(d.navalAimYaw||0);
  const err=Math.atan2(Math.sin(want-have),Math.cos(want-have));if(Math.abs(err)<.02)return;
  const px=Math.max(-190,Math.min(190,Math.round(err/.003)));
  await page.mouse.move(500,400);await page.mouse.down({button:'right'});await page.mouse.move(500+px,400,{steps:2});await page.mouse.up({button:'right'});
 }
 await page.click('#resume-drive');const held=new Set();async function keys(next){for(const key of [...held])if(!next.includes(key)){await page.keyboard.up(key);held.delete(key);}for(const key of next)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}}
 let nav=[],lastGate=-1,repath=0,sawSunk=false;const deadline=Date.now()+170000;
 while(Date.now()<deadline){
  const state=await page.evaluate(()=>({status:document.body.dataset.chaseStatus,index:Number(document.body.dataset.chaseGate),x:Number(document.body.dataset.yachtX),z:Number(document.body.dataset.yachtZ),yaw:Number(document.body.dataset.yachtYaw),speed:Number(document.querySelector('#drive-speed').textContent)/3.6,sunk:document.body.dataset.seaEnemySunk==='true'}));
  if(state.status!=='active'){if(state.status!=='won'){console.log('Route failure',JSON.stringify(await page.evaluate(()=>({data:{...document.body.dataset},reason:document.querySelector('#drive-overlay-copy').textContent}))));await page.screenshot({path:path.join(shots,'unexpected-route-failure.png')});}assert.equal(state.status,'won');break;}
  if(state.sunk&&!sawSunk){sawSunk=true;assert(state.index<3,'destroying enemy does not skip remaining checkpoints');await page.screenshot({path:path.join(shots,'sea-enemy-destroyed.png')});}
  const goal=CHASE_GATES[state.index]||CHASE_EVAC;if(Date.now()>repath||state.index!==lastGate){nav=seaPath(state,goal);repath=Date.now()+600;lastGate=state.index;}
  while(nav.length>1&&Math.hypot(state.x-nav[0].x,state.z-nav[0].z)<13)nav.shift();await aimAt();const input=pursuitInput(state,nav[0]||goal,nav,32),next=['KeyF'];if(input.brake)next.push('Space');else next.push('KeyW');if(input.steer<-.16)next.push('KeyA');if(input.steer>.16)next.push('KeyD');await keys(next);await page.waitForTimeout(65);
 }
 await keys([]);assert.equal(await page.getAttribute('body','data-chase-status'),'won');assert(sawSunk,'F really destroys moving enemy during the route');assert.equal(await page.getAttribute('body','data-sea-enemy-hull'),'0');assert(Number(await page.getAttribute('body','data-sea-hits'))>=5);assert.equal(await page.getAttribute('body','data-sea-projectiles'),'0');assert.equal(await page.getAttribute('body','data-sea-warning'),'none');await page.screenshot({path:path.join(shots,'sea-combat-victory.png')});
 await page.click('#start-chase');await page.click('#start-chase');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='active');assert.equal(await page.getAttribute('body','data-sea-enemy-hull'),'100');assert.equal(await page.getAttribute('body','data-sea-shots'),'0');
 await page.waitForFunction(()=>Number(document.body.dataset.seaEnemyHits)>0);assert(Number(await page.getAttribute('body','data-chase-hull'))<100,'real enemy shells damage an idle player');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='lost',null,{timeout:90000});assert.equal(await page.getAttribute('body','data-sea-projectiles'),'0');assert.equal(await page.getAttribute('body','data-sea-warning'),'none');await page.screenshot({path:path.join(shots,'sea-combat-failure.png')});
 await page.click('#start-chase');await page.click('#start-chase');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='active');await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(shots,'sea-combat-mobile.png')});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.keyboard.press('Escape');await page.click('#chase-free-drive');await page.click('#chase-free-drive');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='idle');await page.keyboard.down('KeyF');await page.waitForTimeout(250);await page.keyboard.up('KeyF');assert.equal(await page.getAttribute('body','data-sea-shots'),'0');assert(await page.locator('#sea-weapon-panel').isHidden());
 assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.campaign.v1')),'sea-combat-sentinel');assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v4')),'journey-sentinel');assert.deepEqual(errors,[]);
 console.log('PASS: real enemy warning/pause, keyboard F aimed shells destroy moving enemy, full checkpoint/extraction victory, actual enemy fire failure, reset/free-drive cleanup, narrow layout and save isolation');
}finally{await browser.close();}
