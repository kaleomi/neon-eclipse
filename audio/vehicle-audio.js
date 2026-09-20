// Continuous vehicle sounds: engine (rover), turbine (plane), marine engine + waves (yacht),
// wind at speed, stall warning. Driven every frame from vehicle state; no per-frame allocations.
// Pure mapping functions are exported for tests.
import {createAudioBus} from './audio-bus.js';
import {createSfxPlayer} from './sfx-player.js';
import {noiseBuffer} from './synth.js';
import {createRecordedLoops,vehicleRecordingTargets} from './recorded-audio.js';
// speed m/s, throttle -1..1 -> engine params. Pure.
export function roverEngine(speed,throttle){
 const s=Math.abs(speed);const load=Math.max(0,Math.min(1,Math.abs(throttle)));
 const rpm=.25+Math.min(1,s/29)*.75*(.6+.4*load); // 0.25 idle .. 1
 // Trim only the rover engine bed (~-3.7 dB); do not alter user/bus volumes or other vehicles.
 return {freq:38+rpm*110,gain:(.16+rpm*.22+load*.06)*.65,cutoff:400+rpm*1600};
}
export function planeEngine(throttle,speed,onGround){
 const t=Math.max(0,Math.min(1,throttle)),s=Math.min(1,Math.abs(speed)/50);
 return {freq:90+t*260,gain:.08+t*.28,whine:1800+t*2600,wind:onGround?s*.05:.06+s*.3};
}
// Rotorcraft: rpm 0..1 drives blade-slap rate and turbine pitch; collective adds load; speed adds wind. Pure.
export function helicopterRotor(rpm,collective,speed,crashed=false){
 const r=crashed?0:Math.max(0,Math.min(1,rpm)),load=Math.max(0,Math.min(1,Math.abs(collective))),s=Math.min(1,Math.abs(speed)/30);
 return {slap:2.5+r*15.5,freq:48+r*70+load*8,gain:r*(.14+load*.08),whine:900+r*1900,whineGain:r*.05,wind:.02+s*.16*r};
}
export function yachtEngine(speed,throttle){
 const s=Math.min(1,Math.abs(speed)/13),load=Math.max(0,Math.min(1,Math.abs(throttle)));
 return {freq:28+s*40+load*10,gain:.1+s*.18+load*.05,wave:.06+s*.14};
}
export function createVehicleAudio({storage,bus=createAudioBus({storage})}={}){
 const sfx=createSfxPlayer(bus);
 const recordings=createRecordedLoops(bus);
 bus.subscribe?.(()=>{if(recordings.bank.supported())void recordings.bank.preload(['rover-idle','rover-drive','rotor','boat','water','wind','plane-idle','plane-flight']);});
 let nodes=null,kind=null,stallTimer=0,lastImpacts=0,lastKind=null,lastBed=null;// lastBed: read-only mapped params for tests / HUD debug
 function build(){
  const ctx=bus.context,out=bus.input('sfx');if(!ctx||!out||nodes)return !!nodes;
  const mk=(type,f)=>{const o=ctx.createOscillator();o.type=type;o.frequency.value=f;return o;};
  const gainNode=v=>{const g=ctx.createGain();g.gain.value=v;return g;};
  const lp=(f,q=.8)=>{const b=ctx.createBiquadFilter();b.type='lowpass';b.frequency.value=f;b.Q.value=q;return b;};
  const noise=color=>{const s=ctx.createBufferSource();s.buffer=noiseBuffer(ctx,color);s.loop=true;s.start();return s;};
  // Engine: saw + sub square through low-pass.
  const engOsc=mk('sawtooth',60),subOsc=mk('square',30),engFilter=lp(800),engGain=gainNode(0);
  engOsc.connect(engFilter);subOsc.connect(engFilter);engFilter.connect(engGain).connect(out);engOsc.start();subOsc.start();
  // Whine (plane turbine): high sine + bandpassed noise.
  const whineOsc=mk('sine',2000),whineGain=gainNode(0);whineOsc.connect(whineGain).connect(out);whineOsc.start();
  // Wind / wave / water: filtered noise beds.
  const windSrc=noise('white'),windFilter=lp(1200),windGain=gainNode(0);windSrc.connect(windFilter).connect(windGain).connect(out);
  const waveSrc=noise('brown'),waveFilter=lp(500),waveMod=gainNode(1),waveGain=gainNode(0);waveSrc.connect(waveFilter).connect(waveMod).connect(waveGain).connect(out);
  // Modulate upstream of the final envelope: additive AudioParam input must never bypass a zero waveGain.
  const lfo=mk('sine',.35),lfoGain=gainNode(.5);lfo.connect(lfoGain).connect(waveMod.gain);lfo.start();
  // Rotor slap: separate amplitude LFO on the engine bed so the thump rate can follow rpm without touching the wave LFO.
  const slapLfo=mk('sine',8),slapDepth=gainNode(0);slapLfo.connect(slapDepth).connect(engGain.gain);slapLfo.start();
  nodes={engOsc,subOsc,engFilter,engGain,whineOsc,whineGain,windFilter,windGain,waveGain,slapLfo,slapDepth};
  return true;
 }
 function set(param,value,t,tc=.08){param.setTargetAtTime(value,t,tc);}
 function silence(t){if(!nodes)return;set(nodes.engGain.gain,0,t);set(nodes.whineGain.gain,0,t);set(nodes.windGain.gain,0,t);set(nodes.waveGain.gain,0,t);set(nodes.slapDepth.gain,0,t);}
 // state: {kind:'rover'|'plane'|'yacht'|'helicopter'|null, speed, throttle, onGround, stall, crashed, impacts, active, rpm, collective}
 function update(dt,state){
  if(!bus.ready)return;
  const t=bus.context.currentTime;
  if(!state.active){silence(t);recordings.update({});return;}
  if(state.kind!==lastKind){if(lastKind!==null||state.kind!==null)sfx.play(state.kind?'vehicle.enter':'vehicle.exit');lastKind=state.kind;lastImpacts=state.impacts||0;}
  if((state.impacts||0)>lastImpacts){sfx.play('vehicle.impact',{gain:Math.min(1,.5+Math.abs(state.speed||0)/20)});lastImpacts=state.impacts;}
  kind=state.kind;
  const targets=vehicleRecordingTargets(state);
  if(targets!==null&&recordings.bank.supported()){
   silence(t);recordings.update(targets);
   const params=kind==='rover'?roverEngine(state.speed||0,state.throttle||0):kind==='helicopter'?helicopterRotor(state.rpm||0,state.collective||0,state.speed||0,!!state.crashed):kind==='yacht'?yachtEngine(state.speed||0,state.throttle||0):{};
   lastBed={kind,...params,recorded:true};
   if(kind==='plane'&&state.stall&&!state.onGround&&!state.crashed){stallTimer-=dt;if(stallTimer<=0){sfx.play('vehicle.stall');stallTimer=.6;}}else stallTimer=0;
   if(state.touchdown)sfx.play('vehicle.touchdown');
   return;
  }
  recordings.update({});
  if(!build())return;
  if(kind!=='helicopter')set(nodes.slapDepth.gain,0,t);
  if(kind==='rover'){
   const e=roverEngine(state.speed||0,state.throttle||0);
   set(nodes.engOsc.frequency,e.freq,t);set(nodes.subOsc.frequency,e.freq/2,t);set(nodes.engFilter.frequency,e.cutoff,t);set(nodes.engGain.gain,e.gain,t);lastBed={kind,...e};
   set(nodes.whineGain.gain,0,t);set(nodes.windGain.gain,Math.min(.12,Math.abs(state.speed||0)/29*.12),t);set(nodes.waveGain.gain,0,t);
  }else if(kind==='plane'){
   const e=planeEngine(state.crashed?0:(state.throttle||0),state.speed||0,state.onGround);
   set(nodes.engOsc.frequency,e.freq,t,.25);set(nodes.subOsc.frequency,e.freq/2,t,.25);set(nodes.engFilter.frequency,900+e.freq*4,t);set(nodes.engGain.gain,e.gain*.7,t,.25);
   set(nodes.whineOsc.frequency,e.whine,t,.25);set(nodes.whineGain.gain,e.gain*.12,t,.25);set(nodes.windFilter.frequency,600+Math.abs(state.speed||0)*40,t);set(nodes.windGain.gain,e.wind,t);set(nodes.waveGain.gain,0,t);
   if(state.stall&&!state.onGround){stallTimer-=dt;if(stallTimer<=0){sfx.play('vehicle.stall');stallTimer=.6;}}else stallTimer=0;
   if(state.touchdown)sfx.play('vehicle.touchdown');
  }else if(kind==='helicopter'){
   const e=helicopterRotor(state.rpm||0,state.collective||0,state.speed||0,!!state.crashed);
   set(nodes.engOsc.frequency,e.freq,t,.15);set(nodes.subOsc.frequency,e.freq/2,t,.15);set(nodes.engFilter.frequency,300+e.freq*5,t);set(nodes.engGain.gain,e.gain,t,.15);
   set(nodes.slapLfo.frequency,e.slap,t,.1);set(nodes.slapDepth.gain,e.gain*.6,t,.15);lastBed={kind,...e};
   set(nodes.whineOsc.frequency,e.whine,t,.2);set(nodes.whineGain.gain,e.whineGain,t,.2);set(nodes.windFilter.frequency,500+Math.abs(state.speed||0)*30,t);set(nodes.windGain.gain,e.wind,t);set(nodes.waveGain.gain,0,t);
   if(state.touchdown)sfx.play('vehicle.touchdown');
  }else if(kind==='yacht'){
   const e=yachtEngine(state.speed||0,state.throttle||0);
   set(nodes.engOsc.frequency,e.freq,t,.2);set(nodes.subOsc.frequency,e.freq/2,t,.2);set(nodes.engFilter.frequency,350+e.freq*3,t);set(nodes.engGain.gain,e.gain,t,.2);
   set(nodes.whineGain.gain,0,t);set(nodes.windGain.gain,Math.min(.08,Math.abs(state.speed||0)/13*.08),t);set(nodes.waveGain.gain,e.wave,t,.3);
  }else{
   silence(t);lastBed={kind:null};
   set(nodes.waveGain.gain,state.nearWater?.05:0,t,.5);
  }
 }
 function bindLifecycle(){
  if(typeof document==='undefined')return;
  document.addEventListener('visibilitychange',()=>{if(document.hidden)bus.hold('hidden');else bus.release('hidden');});
  const gesture=()=>{bus.unlock();};
  for(const type of ['pointerdown','keydown'])window.addEventListener(type,gesture,{passive:true});
 }
 bindLifecycle();
 // One-shot events derived from monotonic gameplay counters (see vehicleAudioEvents). Keeps vehicle-app.js to a single call.
 let counters=null;
 function events(next){const out=vehicleAudioEvents(counters,next);counters={...next};for(const e of out)sfx.play(e.name,e.opts);return out;}
 function reset(){
  recordings.reset();sfx.reset();
  counters=null;lastKind=null;lastImpacts=0;stallTimer=0;kind=null;
  if(nodes)silence(bus.context.currentTime);// Preserve pause/hidden holds and persisted volume settings.
 }
 return {bus,sfx,recordings,update,events,reset,bed:()=>lastBed,play:(n,o)=>sfx.play(n,o),pause(){bus.hold('paused');},resume(){bus.release('paused');},unlock:()=>bus.unlock(),resetEvents(){counters=null;}};
}
// Pure: diff two counter snapshots into sfx events. `prev` null = first frame (records baseline, plays nothing).
// counters: {roofShots,planeShots,rocketShots,roofHits,planeHits,seaShots,seaHits,seaSplashes,repairs,rearms,landings,checkpoints,hullHits,waves,houndKills,paused}
export const VEHICLE_EVENT_SFX=Object.freeze({
 roofShots:'fire.vanguard',planeShots:'fire.tempest',rocketShots:'cannon.fire',roofHits:'hit.body',planeHits:'hit.body',
 seaShots:'cannon.fire',seaHits:'cannon.hit',seaSplashes:'cannon.splash',repairs:'supply.health',rearms:'supply.ammo',
 landings:'vehicle.touchdown',checkpoints:'vehicle.checkpoint',hullHits:'vehicle.impact',waves:'telegraph.orange',houndKills:'kill',
 // Frontier (expedition 6–8): on-foot rifle, hostile kills and player health hits share the existing catalogue entries.
 rifleShots:'fire.vanguard',rifleKills:'kill',frontierKills:'kill',frontierHits:'vehicle.impact',
 // Frontier presentation (drone air/ground explosions, turret/dish/mech collapse, mech footsteps) reuse boss/player cues at reduced gain.
 frontierExplosions:'kill.boss',frontierCollapses:'vehicle.impact',mechSteps:'player.land'
});
const EVENT_GAIN=Object.freeze({hullHits:.9,frontierHits:.9,frontierExplosions:.7,frontierCollapses:.8,mechSteps:.45});
export function vehicleAudioEvents(prev,next){
 if(!prev||!next)return [];
 const out=[];
 for(const key of Object.keys(VEHICLE_EVENT_SFX)){
  const a=Number(prev[key])||0,b=Number(next[key])||0;
  if(b>a)out.push({name:VEHICLE_EVENT_SFX[key],opts:EVENT_GAIN[key]?{gain:EVENT_GAIN[key]}:undefined,count:Math.min(b-a,key==='mechSteps'?1:b-a)});
 }
 return out;
}
