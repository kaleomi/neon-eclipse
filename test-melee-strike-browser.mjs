// L3: real app shoot/update/input/damage paths with deterministic scene fixtures.
// Instrumentation exists only in this Playwright response, never in shipped app.js.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
let browser=null,child=null;
try{
 let base=process.env.GAME_TEST_URL;
 if(!base){
  const port=await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
  child=spawn(process.execPath,['server.cjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('test server timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});child.on('error',reject);child.on('exit',c=>{clearTimeout(timer);reject(new Error('server exit '+c));});});
  base='http://127.0.0.1:'+port+'/index.html?map=reactor&menu=chapter';
 }
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:960,height:720}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 await page.addInitScript(()=>{globalThis.__p1manual=true;});
 await page.route('**/app.js',async route=>{
  const response=await route.fetch();let source=await response.text();
  assert(source.includes("if(state==='playing')update(dt);"));
  source=source.replace("if(state==='playing')update(dt);","if(state==='playing'&&!globalThis.__p1manual)update(dt);");
  source+=`\nwindow.__meleeFixture={
   setup({x=0,z=-2.5,wall=false,hiddenWall=false}={}){
    reset();for(const e of enemies)scene.remove(e.group);enemies.length=0;
    obstacles.length=0;state='playing';overlay.hidden=true;
    camera.position.set(0,1.7,0);camera.rotation.set(0,0,0);yaw=0;pitch=0;
    playerMotion.reset(camera.position,0);changeWeapon(3);handling.update(1,false);cooldown=0;
    const group=createEnemyModel('assault');group.position.set(x,0,z);scene.add(group);
    const enemy={group,type:'assault',hp:300,maxHp:300,boss:false,speed:0,attack:9999,radius:.65,charge:0,seed:0};enemies.push(enemy);this.enemy=enemy;
    if(wall){const mesh=box(5,4,.2,0,2,-1);mesh.visible=!hiddenWall;obstacles.push({x:0,z:-1,w:5,d:.2,bottom:0,top:4,mesh});}
    scene.updateMatrixWorld(true);return this.snapshot();
   },
   tick(dt){if(state==='playing')update(dt);return this.snapshot();},
   move(x,z){this.enemy.group.position.set(x,0,z);this.enemy.group.updateMatrixWorld(true);},
   snapshot(){return {hp:this.enemy?.hp,selected,remaining:meleeRemaining,pending:meleePending,state,shots:[...telemetryShots],pose:meleePose(meleeRemaining),active:meleeStrike.active};},
   resume(){return enterPlay();},resetAction(){reset();return {pending:meleePending,active:meleeStrike.active};}
  };`;
  await route.fulfill({response,body:source});
 });
 await page.goto(base);
 await page.waitForFunction(()=>Boolean(window.__meleeFixture));
 await page.evaluate(()=>localStorage.setItem('p1-melee-save-sentinel','keep'));
 const setup=options=>page.evaluate(o=>window.__meleeFixture.setup(o),options);
 const tick=dt=>page.evaluate(d=>window.__meleeFixture.tick(d),dt);
 const snapshot=()=>page.evaluate(()=>window.__meleeFixture.snapshot());
 // Real mouse and keyboard events; no direct call to shoot or substitute damage.
 const click=async()=>{await page.waitForFunction(()=>document.body.dataset.menuOpen==='false');await page.mouse.click(480,360);};
 async function swing(){await click();return tick(0);}
 await setup();await swing();assert.equal((await tick(.1)).hp,300,'windup has no damage');
 let s=await tick(.02);assert.equal(s.hp,205);assert(s.pose.progress>=.28&&s.pose.progress<=.58,'damage during visible strike');
 s=await tick(.12);assert.equal(s.hp,205);assert.equal(s.shots[3],1,'multiple frames do not inflate telemetry');
 await tick(.3);await swing();s=await tick(.12);assert.equal(s.hp,110,'next swing can hit same entity again');
 for(const options of [{x:1.65,z:-2.5},{x:-1.65,z:-2.5},{x:0,z:0}]){
  await setup(options);await swing();assert.equal((await tick(.12)).hp,205,'arc edge / close contact');
 }
 for(const options of [{x:3,z:-2.5},{z:-4.2},{wall:true},{wall:true,hiddenWall:true}]){
  await setup(options);await swing();await tick(.12);assert.equal((await tick(.12)).hp,300,'outside arc/range or behind cover');
 }
 await setup({x:4,z:-2.5});await swing();s=await tick(.12);assert.equal(s.hp,300);assert(s.pending);
 await page.evaluate(()=>window.__meleeFixture.move(0,-2.5));s=await tick(.12);assert.equal(s.hp,205,'target entering after first window sample');assert.equal(s.shots[3],1);
 await setup({x:4,z:-2.5});await swing();await tick(.12);await tick(.12);s=await tick(.02);assert.equal(s.shots[3],1,'one whiff at window end');
 await page.evaluate(()=>window.__meleeFixture.move(0,-2.5));assert.equal((await tick(.1)).hp,300,'recovery cannot hit');
 await setup();await swing();await tick(.05);await page.keyboard.press('Digit1');s=await tick(.12);assert.equal(s.hp,300);assert.equal(s.active,false,'switch cancels pending strike');
 await setup();await swing();await tick(.05);await page.keyboard.press('Escape');const paused=await snapshot();s=await tick(.5);assert.equal(s.state,'paused');assert.equal(s.remaining,paused.remaining);assert.equal(s.hp,300);
 await page.evaluate(()=>window.__meleeFixture.resume());s=await tick(.12);assert.equal(s.hp,205,'paused swing resumes, not lost or duplicated');
 await setup();await swing();assert.deepEqual(await page.evaluate(()=>window.__meleeFixture.resetAction()),{pending:false,active:false});
 assert.equal(await page.evaluate(()=>localStorage.getItem('p1-melee-save-sentinel')),'keep');
 assert.deepEqual(errors,[]);console.log('PASS: real app input/update/shoot/damage; visible-window contact, arc/close/range/cover, late entry, 120ms frames, one hit/whiff/telemetry, switch/pause/reset and save sentinel; no page errors');
 await context.close();
}finally{await browser?.close();child?.kill();}
