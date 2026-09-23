import assert from 'node:assert/strict';
import {createAudioBus} from '../audio/audio-bus.js';
const tick=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
function rig(){
 const pending=[],calls=[];let failNext=false;
 const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(){}}),node=()=>({gain:param(),connect(n){return n;}});
 const ctx={state:'suspended',currentTime:0,destination:node(),createGain:node,createDynamicsCompressor(){return {...node(),...Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,param()]))};},resume(){return change('running');},suspend(){return change('suspended');}};
 function change(state){calls.push(state);return new Promise((resolve,reject)=>pending.push(()=>{if(failNext){failNext=false;reject(Error('device unavailable'));}else{ctx.state=state;resolve();}}));}
 const bus=createAudioBus({storage:{getItem(){return null;},setItem(){}},contextFactory:()=>ctx});
 return {ctx,bus,calls,fail(){failNext=true;},async finish(){assert(pending.length,'expected pending audio operation');pending.shift()();await tick();}};
}
{
 const r=rig(),opening=r.bus.unlock();await tick();const hidden=r.bus.hold('hidden');await tick();await r.finish();
 assert.equal(r.bus.ready,false,'hidden intent must block sound while resume settles');assert.deepEqual(r.calls,['running','suspended'],'late resume must reconcile hidden hold');await r.finish();await Promise.all([opening,hidden]);assert.equal(r.ctx.state,'suspended');
 const visible=r.bus.release('hidden');await tick();await r.finish();await visible;assert.equal(r.bus.ready,true);
}
{
 const r=rig(),open=r.bus.unlock();await tick();await r.finish();await open;
 const pause=r.bus.hold('paused');await tick();assert.equal(r.bus.ready,false,'pending pause blocks new voices');const resume=r.bus.release('paused');await r.finish();assert.equal(r.calls.at(-1),'running','late suspension must not strand resumed gameplay');await r.finish();await Promise.all([pause,resume]);assert.equal(r.ctx.state,'running');
 const p=r.bus.hold('paused'),h=r.bus.hold('hidden');await tick();await r.finish();await Promise.all([p,h]);await r.bus.release('paused');assert.equal(r.ctx.state,'suspended');const show=r.bus.release('hidden');await tick();await r.finish();await show;
}
{
 const r=rig(),a=r.bus.unlock(),b=r.bus.unlock();await tick();assert.equal(r.calls.length,1);await r.finish();assert.deepEqual(await Promise.all([a,b]),[true,true]);assert.equal(r.calls.length,1);
}
{
 const r=rig();r.fail();const first=r.bus.unlock();await tick();await r.finish();assert.equal(await first,false);const retry=r.bus.unlock();await tick();await r.finish();assert.equal(await retry,true,'rejection must not poison transition queue');
 r.bus.setMuted(true);r.bus.setVolume('music',.2);const saved=r.bus.settings;const hold=r.bus.hold('hidden');await tick();await r.finish();await hold;const release=r.bus.release('hidden');await tick();await r.finish();await release;assert.deepEqual(r.bus.settings,saved);
}
console.log('PASS delayed resume/hidden, delayed suspend/resume, nested reasons, concurrent unlock, rejection recovery, mute and volume preservation');
