// P01 first-person arms: real-browser proof. Boots the actual app (no shims) with the RAF loop
// replaced by a manual clock (same pattern as test-aim-mode-browser.mjs), then verifies:
//  1. the page boots to the menu through the production createWeapons() path with zero errors;
//  2. models/player-arms-p01.glb is fetched over HTTP 200 and the view model swaps to the GLB source;
//  3. with real weapon switching, the solved right hand stays within 1e-6 m of every weapon's grip
//     anchor and the left hand tracks its support anchor (incl. the shotgun pump) — in the browser,
//     including under recoil kicks and during the reload pose;
//  4. per-weapon screenshots land in .tools/qa-player-arms/ for visual review.
// Isolated context: never touches real player storage. Kills its own static server on exit.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
let child,browser;
const output=path.resolve('.tools/qa-player-arms');
const passes=[],pass=t=>{passes.push(t);console.log('PASS '+t);};

const ARMS_API=String.raw`
window.__playerArms={
 setup(){chapterIntro?.cancel();reset(0);state='playing';document.body.dataset.playState=state;overlay.hidden=true;document.activeElement?.blur?.();for(const e of enemies)scene.remove(e.group);enemies.length=0;enemyProjectiles.clear();enemyDirector.update=()=>0;engineerDirector.update=()=>{};camera.position.set(0,1.7,0);playerMotion.reset(camera.position,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);cooldown=0;gamepad.reset();return this.probe();},
 step(seconds){for(let left=seconds;left>1e-8;){const dt=Math.min(.05,left);if(state==='playing')update(dt);left-=dt;}return this.probe();},
 render(){renderer.render(scene,camera);},
 force(i){selected=i;viewModel.select(i);weaponHUD.render();return this.probe();},
 kick(v){recoil=v;return this.probe();},
 pose(v){reload=v;return this.probe();},
 rel(node,stop){const out=new THREE.Matrix4();const stack=[];for(let o=node;o&&o!==stop;o=o.parent)stack.push(o);for(let i=stack.length-1;i>=0;i--){stack[i].updateMatrix();out.multiply(stack[i].matrix);}return out;},
 pos(o){return new THREE.Vector3().setFromMatrixPosition(this.rel(o,gun));},
 hands(){const st=gun.userData.playerArmsState;if(!st)return {attached:false};
  const a=st.anchors,n=st.visual.nodes;
  const dR=this.pos(a.hands[selected]).distanceTo(this.pos(n.Hand_R));
  const anchorL=selected===1?a.pumpSupport:a.supports[selected];
  const dL=anchorL?this.pos(anchorL).distanceTo(this.pos(n.Hand_L)):null;
  let meshes=0;st.visual.root.traverse(o=>{if(o.isMesh)meshes++;});
  return {attached:true,source:st.source,selected,dR,dL,meshes};},
 probe(){const st=gun.userData.playerArmsState;return {state,selected,source:st?.source||null,hostAttached:!!st};},
};`;

try{
 const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 child=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),15000);child.stdout.on('data',b=>{if(String(b).includes('ready')){clearTimeout(timer);resolve();}});child.on('error',reject);});
 await mkdir(output,{recursive:true});
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error'&&!/WebGL|GPU|swiftshader|Automatic fallback/i.test(m.text()))errors.push('console: '+m.text());});
 const glbRequests=[];
 page.on('response',r=>{if(r.url().endsWith('/models/player-arms-p01.glb'))glbRequests.push(r.status());});

 await page.route('**/app.js',async route=>{
  const response=await route.fetch({maxRetries:2});let source=await response.text();
  assert(source.includes('requestAnimationFrame(frame);'));
  source=source.replaceAll('requestAnimationFrame(frame);','/* test-only manual clock */');
  source+=ARMS_API;
  await route.fulfill({response,body:source});
 });

 // 1. Real production boot: module init runs createWeapons() synchronously; the historical
 //    ReferenceError at this point kept the menu from ever appearing.
 await page.goto(`http://127.0.0.1:${port}/index.html`);
 await page.waitForFunction(()=>document.body.dataset.menuOpen==='true');
 assert.deepEqual(errors,[]);
 pass('production menu boot through createWeapons() with zero page/console errors (no shim)');

 // 2. GLB fetch + source swap to the baked asset.
 await page.evaluate(()=>window.__playerArms.setup());
 await page.waitForFunction(()=>window.__playerArms.probe().source==='glb',{timeout:20000});
 assert.ok(glbRequests.length>=1&&glbRequests.every(s=>s===200),'glb fetched: '+JSON.stringify(glbRequests));
 pass('models/player-arms-p01.glb HTTP 200; view model source swapped procedural -> glb');

 // 3. All eight weapons: right hand within 1e-6 m of the weapon's grip anchor; left hand tracks
 //    its support anchor where the weapon has one (0/2/4/5/7 + shotgun pump on 1).
 const shots=[];
 for(let i=0;i<8;i++){
  await page.evaluate(i=>window.__playerArms.force(i),i);
  let h=await page.evaluate(()=>{window.__playerArms.step(.35);return window.__playerArms.hands();});
  assert.equal(h.attached,true);assert.equal(h.source,'glb');
  assert.ok(h.dR<1e-6,`weapon ${i} right hand error ${h.dR}`);
  const hasSupport=[0,2,4,5,7].includes(i)||i===1;
  if(hasSupport)assert.ok(h.dL!==null&&h.dL<1e-6,`weapon ${i} left hand error ${h.dL}`);
  else assert.equal(h.dL,null);
  await page.evaluate(()=>window.__playerArms.render());
  shots.push(await page.screenshot({path:path.join(output,`arms-weapon-${i}.png`)}));
 }
 pass('solved hands land within 1e-6 m on every grip/support anchor for all 8 weapons in-browser');

 // 3b. Recoil kick must not slide the hands off (regression: kick used to be applied after the solve).
 let h=await page.evaluate(()=>{window.__playerArms.force(0);window.__playerArms.step(.2);window.__playerArms.kick(.85);const r=window.__playerArms.step(.02);window.__playerArms.kick(0);return window.__playerArms.hands();});
 assert.ok(h.dR<1e-6,'recoil right hand error '+h.dR);
 pass('recoil kick 0.85 keeps the right hand on the grip anchor (<1e-6 m)');

 // 3c. Reload pose: run the shotgun through a real reload cycle and keep both anchors tracked.
 h=await page.evaluate(()=>{window.__playerArms.force(1);window.__playerArms.pose(0.8);let worst={dR:0,dL:0};for(let k=0;k<30;k++){window.__playerArms.step(.05);const h=window.__playerArms.hands();worst.dR=Math.max(worst.dR,h.dR);if(h.dL!==null)worst.dL=Math.max(worst.dL,h.dL);}window.__playerArms.pose(0);return worst;});
 assert.ok(h.dR<1e-6&&h.dL<1e-6,'reload worst error '+JSON.stringify(h));
 pass('shotgun reload pose: pump/support tracking stays sub-micrometre over 1.5 simulated seconds');

 // 3d. Screenshots actually differ per weapon (arms re-solve onto distinct anchors).
 const uniq=new Set(shots.map(b=>b.length));
 assert.ok(uniq.size>=7,'screenshot set should be visually distinct: '+[...uniq]);
 assert.deepEqual(errors,[]);
 pass('8 per-weapon first-person screenshots captured, visually distinct, zero page errors');
 await page.screenshot({path:path.join(output,'arms-final.png')});

 await writeFile(path.join(output,'summary.json'),JSON.stringify({passes,glbRequests},null,2));
 console.log(JSON.stringify({passes:passes.length,glbRequests}));
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(child)child.kill();
}
