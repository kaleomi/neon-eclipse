import assert from 'node:assert/strict';
import {createHelicopterAudio} from './helicopter-audio.js';
let storageReads=0,created=0,started=0,stopped=0;
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){storageReads++;throw Error('Storage forbidden');}});
const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(v){assert(Number.isFinite(v));this.value=v;}});
const node=()=>({connect(target){return target;},disconnect(){}});
const contextFactory=()=>{
 created++;
 return {state:'suspended',currentTime:0,destination:node(),
  createGain(){return {...node(),gain:param()};},
  createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};},
  createOscillator(){return {...node(),frequency:param(),start(){started++;},stop(){stopped++;}};},
  createBiquadFilter(){return {...node(),frequency:param(),Q:param()};},
  async resume(){this.state='running';},async suspend(){this.state='suspended';},async close(){this.state='closed';}
 };
};
try{
 const audio=createHelicopterAudio({contextFactory});assert.equal(created,0);assert.equal(audio.snapshot().muted,true);
 await audio.setEnabled(true);assert.equal(created,0,'silent while paused/intro');
 assert(await audio.resume());assert.equal(created,1);assert.equal(started,2);assert.equal(audio.snapshot().state,'running');
 audio.update({status:'running',rpm:1,vx:5,vz:0});await audio.pause();assert.equal(audio.snapshot().state,'suspended');
 await audio.setEnabled(false);await audio.resume();assert.equal(audio.snapshot().state,'suspended');
 await audio.setEnabled(true);assert.equal(created,1);assert.equal(started,2);assert.equal(audio.snapshot().state,'running');
 await audio.dispose();assert.equal(stopped,2);assert.equal(audio.snapshot().state,'closed');
 const unavailable=createHelicopterAudio({contextFactory:()=>null});await unavailable.setEnabled(true);assert.equal(await unavailable.resume(),false);await unavailable.dispose();
 const race=createHelicopterAudio({contextFactory});await race.resume();const enable=race.setEnabled(true);await race.pause();await enable;assert.notEqual(race.snapshot().state,'running');await race.dispose();
 assert.equal(storageReads,0,'prototype must never fall back to shared audio preferences');
 console.log('PASS helicopter audio: lazy opt-in, memory-only shared-bus adapter, stacked mute/pause, resume reuse, disposal and unavailable/racing context');
}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
