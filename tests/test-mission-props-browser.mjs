// Isolated software-WebGL validation; never touches the player's browser profile/storage.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const output='.tools/qa-mission-props';let child,browser;const errors=[],passes=[];
const pass=s=>{passes.push(s);console.log('PASS '+s);};
try{
 await mkdir(output,{recursive:true});
 const port=await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 child=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});child.on('error',reject);child.on('exit',c=>{clearTimeout(timer);reject(Error('server exit '+c));});});
 const base=`http://127.0.0.1:${port}`;
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:820}}),p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));
 const loaded=[];p.on('response',r=>{if(r.url().endsWith('.glb'))loaded.push({url:r.url(),status:r.status()});});
 await p.goto(base+'/mission-props-preview.html');
 for(const type of ['health','ammo','terminal']){
  await p.selectOption('#asset',type);
  await p.waitForFunction(type=>document.body.dataset.assetReady===type&&document.body.dataset.assetSource==='glb',type);
  const glb=await p.evaluate(()=>window.__missionPropsPreview.stats());
  assert(glb.meshes>0);await p.evaluate(()=>window.__missionPropsPreview.render());await p.screenshot({path:`${output}/${type}-glb.png`});
  await p.click('#back');await p.evaluate(()=>window.__missionPropsPreview.render());await p.screenshot({path:`${output}/${type}-back.png`});
  await p.selectOption('#source','procedural');await p.waitForFunction(()=>document.body.dataset.assetSource==='procedural');
  const source=await p.evaluate(()=>window.__missionPropsPreview.stats());assert.equal(source.triangles,glb.triangles);assert.equal(source.meshes,glb.meshes);
  await p.check('#wire');await p.uncheck('#wire');await p.selectOption('#source','glb');await p.waitForFunction(()=>document.body.dataset.assetSource==='glb');
  pass(type+' GLB HTTP load, source geometry parity, front/back render and wireframe controls');
 }
 assert(loaded.length>=3&&loaded.every(r=>r.status===200));
 await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:`${output}/mobile.png`,fullPage:true});
 pass('390px layout has no horizontal overflow');await context.close();
 // Append read-only inspection to the production app. No shim and no replacement of gameplay logic.
 const game=await browser.newContext({viewport:{width:1280,height:820}}),page=await game.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app.js',async route=>{const response=await route.fetch();const body=await response.text();await route.fulfill({response,body:body+`\nwindow.__missionPropsQA={snapshot(){const props=[];scene.traverse(o=>{if(o.userData.missionProp)props.push(o.userData.missionProp);});return {props,terminalCount:obstacles.filter(o=>o.terminal).length,supplyCount:SUPPLIES.length,state,available:missionWorld.available.length};}};`});});
 for(const map of ['reactor','train','polar']){
  await page.goto(base+'/index.html?map='+map+'&menu=chapter');await page.waitForFunction(()=>!!window.__missionPropsQA);
  let s=await page.evaluate(()=>window.__missionPropsQA.snapshot());assert.equal(s.props.filter(t=>t==='terminal').length,s.terminalCount);assert.equal(s.props.filter(t=>t!=='terminal').length,s.supplyCount);
  assert(s.props.includes('health')&&s.props.includes('ammo')&&s.props.includes('terminal'));
  await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.playState==='playing');
  await page.screenshot({path:`${output}/game-${map}.png`});
  pass(map+' production world contains all three props and deploys without a shim');
 }
 assert.deepEqual(errors,[]);await game.close();
 await writeFile(output+'/result.json',JSON.stringify({passes,errors,renderer:'SwiftShader',boundaries:'Controlled startup and prop gallery, not natural chapter completion or target-GPU performance.'},null,2)+'\n');
 console.log('PASS mission-props browser: '+passes.length+' groups');
}finally{await browser?.close();child?.kill();}
