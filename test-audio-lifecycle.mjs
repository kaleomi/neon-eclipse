// Low-load regression: mock WebAudio graph + real facades; no Chromium, GPU or player storage.
// Entry-point assertions below are static wiring guards, NOT end-to-end browser coverage.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAudioBus} from './audio/audio-bus.js';
import {createVehicleAudio} from './audio/vehicle-audio.js';
import {createGameAudio} from './audio/game-audio.js';
import {createChapterCues} from './chapter-cues.js';
const memory=()=>({getItem(){return null;},setItem(){}});
function fakeContext(){
 const created=[];
 const param=(value=0)=>{const p={value};for(const name of ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime','setTargetAtTime'])p[name]=v=>{p.value=v;return p;};p.cancelScheduledValues=()=>p;return p;};
 const node=kind=>{const n={kind,connections:[],connect(dest){n.connections.push(dest);return dest;},start(){},stop(){}};created.push(n);return n;};
 const ctx={state:'suspended',currentTime:0,sampleRate:8000,created,destination:node('destination'),
  async resume(){ctx.state='running';},async suspend(){ctx.state='suspended';},
  createGain(){return Object.assign(node('gain'),{gain:param(1)});},
  createOscillator(){return Object.assign(node('osc'),{frequency:param(440),detune:param(0),type:'sine'});},
  createBiquadFilter(){return Object.assign(node('filter'),{frequency:param(350),Q:param(1)});},
  createStereoPanner(){return Object.assign(node('panner'),{pan:param(0)});},
  createDynamicsCompressor(){const n=node('comp');for(const k of ['threshold','knee','ratio','attack','release'])n[k]=param();return n;},
  createBuffer(ch,length,sampleRate){const data=Array.from({length:ch},()=>new Float32Array(length));return {length,sampleRate,getChannelData:i=>data[i]};},
  createBufferSource(){return node('buffer');}};
 return ctx;
}
let failed=0;
async function test(name,fn){try{await fn();console.log('PASS',name);}catch(error){failed++;console.error('FAIL',name,error.message);}}
await test('wave modulation remains upstream of the final mute gain',async()=>{
 const ctx=fakeContext(),bus=createAudioBus({storage:memory(),contextFactory:()=>ctx}),audio=createVehicleAudio({bus});await audio.unlock();
 audio.update(.016,{kind:'yacht',speed:4,throttle:1,active:true});
 const lfo=ctx.created.find(n=>n.kind==='osc'&&n.frequency.value===.35);assert.ok(lfo);
 const depth=lfo.connections[0],modParam=depth.connections[0],mod=ctx.created.find(n=>n.gain===modParam);
 const final=mod.connections[0];assert.ok(final?.gain,'LFO must feed a modulation stage, not the final output gain');
 assert.ok(final.gain.value>0);assert.ok(depth.gain.value>0&&depth.gain.value<mod.gain.value,'modulation cannot invert the wave envelope');
 audio.update(.016,{kind:'rover',speed:0,throttle:0,active:true});assert.equal(final.gain.value,0,'dry rover has no wave output');
 audio.update(.016,{kind:null,nearWater:true,active:true});assert.ok(final.gain.value>0);
 audio.update(.016,{kind:null,nearWater:false,active:true});assert.equal(final.gain.value,0,'dry walking has no wave output');
 audio.update(.016,{kind:'yacht',speed:4,active:true});audio.update(.016,{active:false});assert.equal(final.gain.value,0,'inactive output is silent even while LFO runs');
});
await test('vehicle reset re-baselines collision/events and preserves pause + hidden holds',async()=>{
 const ctx=fakeContext(),bus=createAudioBus({storage:memory(),contextFactory:()=>ctx}),audio=createVehicleAudio({bus});await audio.unlock();
 const played=[];audio.sfx.play=name=>{played.push(name);return true;};
 audio.update(.1,{kind:'plane',speed:20,throttle:.5,onGround:false,stall:true,impacts:8,active:true});
 audio.events({roofShots:10});assert.equal(audio.events({roofShots:11}).length,1);
 audio.pause();await bus.hold('hidden');const reasons=bus.snapshot().suspendedBy.sort();
 assert.equal(typeof audio.reset,'function');audio.reset();assert.deepEqual(bus.snapshot().suspendedBy.sort(),reasons,'reset must not release pause/hidden');
 assert.deepEqual(audio.events({roofShots:99}),[],'first restored snapshot does not replay shots');
 audio.resume();assert.equal(ctx.state,'suspended');await bus.release('hidden');assert.equal(ctx.state,'running');played.length=0;
 audio.update(.1,{kind:'plane',speed:20,throttle:.5,onGround:false,stall:true,impacts:0,active:true});
 assert.ok(played.includes('vehicle.stall'),'new session does not inherit stall timer');assert.ok(!played.includes('vehicle.impact'),'restoration is not a collision');
 audio.update(.1,{kind:'plane',speed:20,throttle:.5,onGround:false,stall:true,impacts:1,active:true});assert.equal(played.filter(x=>x==='vehicle.impact').length,1,'first new collision is not suppressed by old count');
 const none=createVehicleAudio({storage:memory()});assert.doesNotThrow(()=>none.reset());
});
await test('FPS reset clears streak state and cancels pending delayed streak cue',async()=>{
 const timers=new Map(),originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;let id=0;
 globalThis.setTimeout=fn=>{timers.set(++id,fn);return id;};globalThis.clearTimeout=handle=>timers.delete(handle);
 try{
  const ctx=fakeContext(),bus=createAudioBus({storage:memory(),contextFactory:()=>ctx}),audio=createGameAudio({bus,music:false});await audio.unlock();
  const played=[];audio.sfx.play=name=>{played.push(name);return true;};
  for(let i=0;i<3;i++)audio.hit({killed:true});assert.equal(timers.size,1);audio.reset();
  assert.equal(audio.streak.count,0);assert.equal(timers.size,0,'no old-run delayed cue survives reset');
  for(let i=0;i<3;i++)audio.hit({killed:true});const [key,fn]=[...timers.entries()][0];timers.delete(key);fn();assert.equal(played.filter(n=>n==='streak').length,1,'new streak still plays');
 }finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
await test('chapter reset is a silent new baseline; production entry points call resets',()=>{
 const played=[],cues=createChapterCues(name=>played.push(name));
 cues.update({map:'polar',stormPhase:'whiteout',frost:true});cues.reset();cues.update({map:'polar',stormPhase:'closing',frost:false});assert.deepEqual(played,[]);
 cues.update({map:'polar',stormPhase:'whiteout',frost:false});assert.deepEqual(played,['storm.whiteout']);
 const fps=readFileSync(new URL('./app.js',import.meta.url),'utf8'),vehicle=readFileSync(new URL('./vehicle-app.js',import.meta.url),'utf8');
 const reset=fps.slice(fps.indexOf('function reset('),fps.indexOf('function end('));
 assert.match(reset,/chapterCues\.reset\(\)/,'FPS retry/restore must reset chapter cue baseline');assert.match(reset,/gameAudio\.reset\(\)/,'FPS retry must reset streak state');
 const recover=vehicle.slice(vehicle.indexOf('function recover('),vehicle.indexOf('function nearby('));assert.match(recover,/vehicleAudio\.reset\(\)/,'task/recovery entry must reset audio session');
});
if(failed)process.exitCode=1;
console.log(`audio lifecycle: ${4-failed}/4 passed (mock graph + static wiring; no browser run)`);
