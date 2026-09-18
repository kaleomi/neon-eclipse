// Optional browser regression for 先遣队第 2 关 · 南湾突围 checkpoints. Real WebGL page, real keyboard, real
// IndexedDB in an isolated context; no test hooks in gameplay code. Install Playwright separately (VEHICLE_PLAYWRIGHT_MODULE).
import assert from 'node:assert/strict';
import {seaPath,pursuitInput,CHASE_GATES,CHASE_EVAC} from './chase-rules.js';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const url=process.env.VEHICLE_TEST_URL||'http://127.0.0.1:5173/vehicle.html';
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1100,height:760}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);page.on('dialog',d=>d.accept());
 await page.goto(url);await page.waitForSelector('#vehicle-scene canvas');
 await page.evaluate(()=>{localStorage.setItem('neon-eclipse.journey.v4','sentinel-journey');localStorage.setItem('neon-eclipse.campaign.v1','sentinel-campaign');localStorage.setItem('neon-eclipse.naval-difficulty.v1','easy');});
 await page.reload();await page.waitForSelector('#vehicle-scene canvas');
 const data=n=>page.evaluate(k=>document.body.dataset[k],n),panel=()=>page.evaluate(()=>({...document.querySelector('#naval-checkpoint-panel').dataset,info:document.querySelector('#naval-checkpoint-info').textContent}));
 await page.waitForFunction(()=>document.querySelector('#naval-checkpoint-panel').dataset.state==='ready');assert.equal((await panel()).stage,'','no naval node before any run');assert(await page.locator('#resume-naval-checkpoint').isDisabled());
 // Start the mission (two-step confirm); the run id is exposed and the node stays empty until a gate is passed.
 await page.click('#start-chase');await page.click('#start-chase');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='active');
 const runId=await data('chaseRunId');assert.match(runId,/^[a-zA-Z0-9-]{16,96}$/);assert.equal(await data('chaseRecovered'),'false');assert.equal((await panel()).stage,'');
 // Keyboard autopilot to the first gate, same controller as test-chase-browser.
 const held=new Set();async function keys(next){for(const key of [...held])if(!next.includes(key)){await page.keyboard.up(key);held.delete(key);}for(const key of next)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}}
 let nav=[],lastGate=-1,repath=0;const deadline=Date.now()+120000;
 while(Date.now()<deadline){
  const state=await page.evaluate(()=>({status:document.body.dataset.chaseStatus,index:Number(document.body.dataset.chaseGate),x:Number(document.body.dataset.yachtX),z:Number(document.body.dataset.yachtZ),yaw:Number(document.body.dataset.yachtYaw),speed:Number(document.querySelector('#drive-speed').textContent)/3.6}));
  assert.equal(state.status,'active');if(state.index>=1)break;
  const goal=CHASE_GATES[state.index]||CHASE_EVAC;if(Date.now()>repath||state.index!==lastGate){nav=seaPath(state,goal);repath=Date.now()+600;lastGate=state.index;}
  while(nav.length>1&&Math.hypot(state.x-nav[0].x,state.z-nav[0].z)<13)nav.shift();
  const input=pursuitInput(state,nav[0]||goal,nav,32),next=[];if(input.brake)next.push('Space');else next.push('KeyW');if(input.steer<-.16)next.push('KeyA');if(input.steer>.16)next.push('KeyD');await keys(next);await page.waitForTimeout(65);
 }
 await keys([]);assert.equal(Number(await data('chaseGate')),1,'reached the first gate');
 // Passing the gate saved a node for this run; the panel reflects it without a manual refresh.
 await page.waitForFunction(()=>document.querySelector('#naval-checkpoint-panel').dataset.stage==='gate-1'&&document.querySelector('#naval-checkpoint-panel').dataset.pending==='false');
 assert.match((await panel()).info,/北上水道/);assert.match((await panel()).info,/简单/);
 // Abandon the run from the pause menu; the saved node survives and can be restored after a full reload.
 await page.keyboard.press('Escape');await page.waitForSelector('#drive-overlay:not([hidden])');await page.click('#chase-free-drive');await page.click('#chase-free-drive');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='idle');
 await page.reload();await page.waitForSelector('#vehicle-scene canvas');await page.waitForFunction(()=>document.querySelector('#naval-checkpoint-panel').dataset.state==='ready'&&document.querySelector('#naval-checkpoint-panel').dataset.stage==='gate-1');
 assert(!(await page.locator('#resume-naval-checkpoint').isDisabled()));
 await page.click('#resume-naval-checkpoint');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='active'&&document.body.dataset.chaseRecovered==='true');
 assert.equal(Number(await data('chaseGate')),1,'restored at gate 1');assert.notEqual(await data('chaseRunId'),runId,'restore is a new run');assert.equal(await data('vehicleKind'),'yacht');
 const pos=await page.evaluate(()=>({x:Number(document.body.dataset.yachtX),z:Number(document.body.dataset.yachtZ)}));assert(Math.hypot(pos.x-334,pos.z+86)<2,'yacht re-seated on the gate-1 template: '+JSON.stringify(pos));
 assert.match(await page.textContent('#naval-active-difficulty'),/检查点继续/);
 // Restored hull is the saved hull (100 here), enemies are placed and idle during the head start; the timer continued from the node.
 assert.equal(await data('chaseHull'),'100.00');assert(Number(await data('chaseRemaining'))<210);
 // Storage isolation: joint checkpoint database untouched, campaign keys untouched.
 assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('neon-eclipse.journey.v4'),localStorage.getItem('neon-eclipse.campaign.v1')]),['sentinel-journey','sentinel-campaign']);
 const dbs=await page.evaluate(async()=>(await indexedDB.databases()).map(d=>d.name).sort());assert(dbs.includes('neon-eclipse.naval-checkpoint.v1'),'naval db created: '+dbs);
 assert.equal(await page.evaluate(()=>document.querySelector('#joint-checkpoint-panel').dataset.stage),'','joint node unaffected');
 for(const size of [{width:960,height:640},{width:390,height:780}]){await page.setViewportSize(size);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);
 console.log('PASS: real WebGL naval checkpoint flow — run id, gate-1 node auto-saved, survives abandon + reload, restore re-seats yacht on template as a recovered run, joint/campaign storage untouched, narrow layouts');
}finally{await browser.close();}
