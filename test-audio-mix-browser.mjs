// Real Web Audio graph, user-gesture unlock and post-compressor signal checks; not a listening test.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__audio-mix.html',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><button id="start">Start audio</button><script type="module">
 import {createAudioBus} from '/audio/audio-bus.js';
 let compressor;const bus=createAudioBus({storage:{getItem(){return null},setItem(){}},contextFactory:()=>{const ctx=new AudioContext();const original=ctx.createDynamicsCompressor.bind(ctx);ctx.createDynamicsCompressor=()=>compressor=original();return ctx;}});
 window.probe={bus,get compressor(){return compressor}};document.querySelector('#start').onclick=async()=>{window.started=await bus.unlock();};
 </script>`}));
 await page.goto(server.base+'/__audio-mix.html');await page.waitForFunction(()=>window.probe);assert.equal(await page.evaluate(()=>probe.bus.context),null);await page.click('#start');await page.waitForFunction(()=>window.started===true);
 const result=await page.evaluate(async()=>{
  const {bus,compressor}=probe,ctx=bus.context,analyser=ctx.createAnalyser();analyser.fftSize=2048;compressor.connect(analyser);const pcm=new Float32Array(2048),wait=ms=>new Promise(r=>setTimeout(r,ms));
  const rms=()=>{analyser.getFloatTimeDomainData(pcm);return Math.sqrt(pcm.reduce((sum,v)=>sum+v*v,0)/pcm.length);};const levels=[];
  for(const name of ['music','sfx','ui','voice']){
   const source=ctx.createOscillator(),gain=ctx.createGain();source.frequency.value=440;gain.gain.value=.04;source.connect(gain).connect(bus.input(name));source.start();bus.setMuted(false);bus.setVolume(name,.8);await wait(400);const audible=rms();
   bus.setVolume(name,0);await wait(400);const zero=rms();bus.setVolume(name,.8);bus.setMuted(true);await wait(400);const muted=rms();bus.setMuted(false);bus.setVolume('master',0);await wait(400);const masterZero=rms();bus.setVolume('master',.8);source.stop();source.disconnect();gain.disconnect();levels.push({name,audible,zero,muted,masterZero});
  }
  const settings=bus.settings;for(let i=0;i<20;i++){await Promise.all([bus.hold('paused'),bus.release('paused'),bus.hold('hidden')]);if(ctx.state!=='suspended')throw Error('late resume');await bus.release('hidden');if(ctx.state!=='running')throw Error('late suspend');}
  await bus.hold('paused');await bus.hold('hidden');await bus.release('paused');const time=ctx.currentTime;await wait(100);const frozen=ctx.currentTime===time;await bus.release('hidden');const resumed=ctx.state==='running',unchanged=JSON.stringify(settings)===JSON.stringify(bus.settings);await ctx.close();return {levels,frozen,resumed,unchanged};
 });
 for(const row of result.levels){assert(row.audible>.001,row.name);for(const name of ['zero','muted','masterZero'])assert(row[name]<row.audible*.01,JSON.stringify(row));}assert(result.frozen&&result.resumed&&result.unchanged);assert.deepEqual(errors,[]);await mkdir('.tools/qa-audio',{recursive:true});await writeFile('.tools/qa-audio/mix.json',JSON.stringify(result,null,2)+'\n');console.log('PASS real gesture unlock; four post-compressor bus signals; group/master zero and mute; 20 rapid pause/hidden cycles; frozen clock, resume and preserved preferences; no page errors');
}finally{await browser?.close();await server.stop();}
