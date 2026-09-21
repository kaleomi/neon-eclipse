import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer(),baseline=process.env.AUDIO_PRIORITY_BASELINE==='1';let browser;
try{
 browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/__priority.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Controlled voice-pressure probe</title>'}));await p.goto(server.base+'/__priority.html');
 const result=await p.evaluate(async baseline=>{
  const {createAudioBus}=await import('/audio/audio-bus.js'),{createSfxPlayer,MAX_VOICES}=await import('/audio/sfx-player.js'),{SFX}=await import('/audio/sfx-catalog.js');
  const bus=createAudioBus({storage:{getItem(){return null;},setItem(){}}});await bus.unlock();const catalog={...SFX,load:{tones:[{type:'sine',f:180,gain:.01,a:.001,d:2,r:.1}],bus:'sfx'},'fire.vanguard':{...SFX['fire.vanguard'],cooldown:0}},sfx=createSfxPlayer(bus,{catalog,random:()=>.5,preloadFiles:['rifle-ar']});await sfx.preload(['rifle-ar']);const before=JSON.stringify(SFX),checks={};const analyser=bus.context.createAnalyser();analyser.fftSize=2048;bus.input('sfx').connect(analyser);const pcm=new Float32Array(2048),peak=()=>{analyser.getFloatTimeDomainData(pcm);return Math.max(...pcm.map(Math.abs));};
  const fill=(name='load')=>{let accepted=0;for(let i=0;i<MAX_VOICES;i++)accepted+=Number(sfx.play(name,{at:bus.now+3}));return accepted;};
  const ordinary=fill(),accepted=sfx.play('telegraph.purple');checks.telegraphSurvives=accepted;const first={ordinary,accepted,active:sfx.active};if(!baseline){await new Promise(r=>setTimeout(r,80));checks.warningSignal=peak()>.00001;}sfx.reset();
  if(!baseline){
   const {CRITICAL_SFX,RESERVED_CRITICAL_VOICES}=await import('/audio/sfx-priority.js');checks.reserve=ordinary===MAX_VOICES-RESERVED_CRITICAL_VOICES;
   checks.everyProtected=true;for(const name of CRITICAL_SFX){fill();checks.everyProtected&&=sfx.play(name);checks.everyProtected&&=sfx.active===21;sfx.reset();}
   checks.recorded=fill('fire.vanguard')===20&&sfx.stats().recorded===20&&sfx.play('telegraph.orange');sfx.reset();
   fill();const names=['telegraph.orange','telegraph.purple','telegraph.amber','telegraph.pink'];checks.fourSlots=names.every(n=>sfx.play(n))&&sfx.active===24;checks.bound=!sfx.play('telegraph.gold')&&!sfx.play('load')&&sfx.active===24;sfx.reset();
   for(let i=0;i<24;i++)sfx.play('boss.phase',{at:bus.now+3});checks.criticalBound=sfx.active===24&&!sfx.play('boss.window.open');sfx.reset();
   fill();checks.cooldown=sfx.play('telegraph.purple')&&!sfx.play('telegraph.purple')&&sfx.active===21;sfx.reset();
   fill();checks.distance=!sfx.play('telegraph.orange',{position:{x:100,z:0},listener:{x:0,z:0,yaw:0}})&&sfx.active===20;sfx.reset();
   fill();await bus.hold('paused');checks.pause=!sfx.play('telegraph.orange');sfx.reset();checks.reset=sfx.active===0;await bus.release('paused');checks.reuse=sfx.play('telegraph.orange');sfx.reset();
   checks.immutable=JSON.stringify(SFX)===before;await new Promise(r=>setTimeout(r,3200));checks.noLate=sfx.active===0&&peak()<.00001;checks.loaded=sfx.stats().samples.loaded.includes('rifle-ar');
  }
  sfx.reset();await bus.context.close();return {first,checks};
 },baseline);
 await mkdir('.tools/qa-audio',{recursive:true});await writeFile('.tools/qa-audio/priority-'+(baseline?'before':'after')+'.json',JSON.stringify(result,null,2)+'\n');for(const [name,ok] of Object.entries(result.checks))assert.equal(ok,true,name+' '+JSON.stringify(result.first));assert.deepEqual(errors,[]);console.log('PASS voice reservation: '+Object.keys(result.checks).length+' real Web Audio checks; synthetic and recorded pressure, protected catalog, global bound, cooldown, distance, pause/reset/reuse; no page errors');
}finally{await browser?.close();await server.stop();}
