import assert from 'node:assert/strict';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
try{
 browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage();
 await page.route('**/loop-probe.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Vehicle loop regression</title>'}));
 await page.goto(server.base+'/loop-probe.html');
 const result=await page.evaluate(async()=>{
  const {createVehicleAudio}=await import('../audio/vehicle-audio.js');
  const audio=createVehicleAudio();await audio.unlock();await audio.recordings.bank.preload(['rover-idle','rover-drive','wind']);
  const state={kind:'rover',speed:24,throttle:1,active:true};audio.update(.016,state);
  const starts=audio.recordings.stats().starts;
  for(let i=0;i<3600;i++)audio.update(1/60,{...state,speed:18+Math.sin(i/20)*.2});
  const bounded=audio.recordings.stats().starts===starts;
  const bed=audio.recordings.stats().voices.includes('rover-idle');
  const buffer=audio.recordings.bank.get('rover-drive');const levels=[];
  for(const rate of [.8,1,1.15]){
   const ctx=new OfflineAudioContext(1,44100*20,44100),s=ctx.createBufferSource();
   s.buffer=buffer;s.loop=true;s.playbackRate.value=rate;s.connect(ctx.destination);s.start();
   const pcm=(await ctx.startRendering()).getChannelData(0),rms=[];
   for(let i=0;i+4410<=pcm.length;i+=4410){let power=0;for(let j=i;j<i+4410;j++)power+=pcm[j]**2;rms.push(Math.sqrt(power/4410));}
   levels.push({rate,min:Math.min(...rms),max:Math.max(...rms)});
  }
  audio.reset();await audio.bus.context.close();return {bounded,bed,levels};
 });
 assert.ok(result.bounded,'steady speed must not restart sources');assert.ok(result.bed,'cruising retains engine bed');
 for(const r of result.levels){assert.ok(r.min>.055,'no quiet holes across loop joins');assert.ok(r.max/r.min<1.8,'no repeated deceleration envelope');}
 console.log('PASS 60 seconds of speed updates without restarts; 20 seconds of rendered audio at each of three speeds',JSON.stringify(result));
}finally{await browser?.close();await server.stop();}
