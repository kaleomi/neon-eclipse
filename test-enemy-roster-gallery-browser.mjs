import assert from 'node:assert/strict';
import path from 'node:path';
import {startRosterBrowser,trackedPage} from './roster-browser-driver.mjs';
const env=await startRosterBrowser(),checks=[];
try{
 const context=await env.browser.newContext({viewport:{width:1360,height:920}}),{page:p,errors}=await trackedPage(context);
 await p.goto(env.base+'/enemy-roster-complete.html');await p.waitForFunction(()=>window.__rosterPreview?.state.ready);await p.locator('#pause').check();
 const entries=await p.evaluate(()=>__rosterPreview.state.assets);assert.equal(entries.length,24);assert.equal(entries.filter(e=>e.category==='boss').length,9);
 for(const e of entries){await p.evaluate(type=>__rosterPreview.select(type),e.role);await p.waitForFunction(type=>__rosterPreview.state.ready&&__rosterPreview.state.selected===type,e.role);
  const clips=await p.evaluate(()=>Array.from(document.querySelectorAll('[data-motion]'),e=>e.dataset.motion));assert.equal(clips.length,e.animations.length);
  for(const name of clips)await p.evaluate(name=>{__rosterPreview.motion(name);__rosterPreview.mixer.update(.24);__rosterPreview.renderer.render(__rosterPreview.scene,__rosterPreview.camera);},name);
  await p.evaluate(name=>{__rosterPreview.motion(name);__rosterPreview.mixer.update(.3);__rosterPreview.view('hero');__rosterPreview.renderer.render(__rosterPreview.scene,__rosterPreview.camera);},clips[0]);
  await p.locator('#viewport canvas').screenshot({path:path.join(env.dir,e.role+'-preview.png')});
  const finite=await p.evaluate(()=>{let ok=true;__rosterPreview.model.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))ok=false;});return ok;});assert(finite,e.role);
  checks.push({type:e.role,clips:clips.length,source:'glb'});console.log('PASS gallery',e.role,clips.join(','));
 }
 await p.click('[data-filter="boss"]');assert.equal(await p.locator('[data-model]:visible').count(),9);await p.click('[data-filter="unit"]');assert.equal(await p.locator('[data-model]:visible').count(),15);await p.click('[data-filter="all"]');assert.equal(await p.locator('[data-model]:visible').count(),24);
 await p.evaluate(()=>__rosterPreview.select('warden'));await p.screenshot({path:path.join(env.dir,'roster-library.png')});
 await p.locator('#wireframe').check();assert(await p.evaluate(()=>{let okay=true;__rosterPreview.model.traverse(o=>{if(o.isMesh&&!o.material.wireframe)okay=false;});return okay;}));await p.locator('#wireframe').uncheck();
 await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:path.join(env.dir,'roster-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(await p.evaluate(()=>__rosterPreview.state.errors),[]);await context.close();
 await env.save('gallery-results.json',{assets:24,bosses:9,checks,filters:true,mobile390:true,softwareWebGL:true,targetHardwareValidated:false});console.log('PASS 24 real GLBs, all clips, filters, mobile and no page errors');
}finally{await env.close();}
