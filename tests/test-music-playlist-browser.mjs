import assert from 'node:assert/strict';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
try{
 browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/music-probe.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Music test</title>'}));
 await page.goto(server.base+'/music-probe.html');
 const result=await page.evaluate(async()=>{
  const {createAudioBus}=await import('../audio/audio-bus.js');
  const {createRecordedMusicDirector}=await import('../audio/recorded-music.js');
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(fn){for(let i=0;i<150;i++){if(fn())return;await wait(40);}throw Error('Media timeout');}
  const bus=createAudioBus();await bus.unlock();const media=[];
  const music=createRecordedMusicDirector(bus,{random:()=>.5,mediaFactory:()=>{const m=new Audio();media.push(m);return m;}});
  const current=()=>media.find(m=>!m.paused);
  music.start();await until(()=>current()?.currentTime>.1);
  const explore=music.stats().track;
  current().currentTime=15;await until(()=>current()?.currentTime>=15);
  music.update(.1,{playState:'playing',enemiesNear:2});await until(()=>current()&&music.stats().currentTime>.1);
  const checks={fullExplore:media[0].duration>170,combatSwitch:music.stats().track!==explore};
  music.update(2,{playState:'playing',enemiesNear:0});checks.hold=music.state==='combat';
  music.update(7,{playState:'playing',enemiesNear:0});await until(()=>current()===media[0]);
  checks.resume=music.stats().track===explore&&music.stats().currentTime>=15;
  await bus.hold('paused');const t=music.stats().currentTime;await wait(200);checks.pause=media.every(m=>m.paused)&&Math.abs(music.stats().currentTime-t)<.1;
  await bus.hold('hidden');await bus.release('paused');checks.hidden=media.every(m=>m.paused);
  await bus.release('hidden');await until(()=>current());
  music.setState('combat');await until(()=>current()===media[1]);
  const played=[music.stats().track];
  for(let i=0;i<4;i++){
   const previous=music.stats().track;await until(()=>Number.isFinite(current()?.duration));
   current().currentTime=current().duration-.15;
   await until(()=>music.stats().track!==previous&&current()?.currentTime>.05);
   played.push(music.stats().track);
  }
  checks.shuffle=new Set(played.slice(0,3)).size===3&&played.every((v,i)=>!i||v!==played[i-1]);
  checks.bounded=media.length===2&&music.stats().players===2;
  const manifest=await (await fetch('../audio/music/sources.json')).json();
  for(const row of manifest){const m=new Audio(new URL('../audio/music/'+row.file,location.href));m.preload='metadata';await until(()=>m.duration>0);if(Math.abs(m.duration-row.duration)>.2)throw Error('Wrong full duration '+row.file);m.removeAttribute('src');m.load();}
  checks.fullTracks=manifest.length===5&&manifest.every(r=>r.duration>170);
  music.reset();checks.reset=music.stats().voices.length===0&&media.every(m=>m.paused&&!m.getAttribute('src'));
  music.stop();music.update(1,{playState:'playing'});checks.stop=music.stats().players===0;
  music.dispose();await bus.context.close();return {checks,played,totalMinutes:manifest.reduce((s,r)=>s+r.duration,0)/60};
 });
 for(const [k,v]of Object.entries(result.checks)){assert.equal(v,true,k);console.log('PASS',k);}
 assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}finally{await browser?.close();await server.stop();}
