// Audio bus: five named buses (master, music, sfx, ui, voice) with independent, persisted volume.
// Synth cues and licensed local recordings share these gains. The AudioContext is created lazily on first user
// gesture and suspended while the game is paused or the tab is hidden. Pure logic (volume math,
// persistence, state machine) is testable without Web Audio; see test-audio.mjs.
export const AUDIO_SETTINGS_KEY='neon-eclipse.audio.v1';
export const BUSES=Object.freeze(['master','music','sfx','ui','voice']);
export const DEFAULT_VOLUMES=Object.freeze({master:.8,music:.55,sfx:.9,ui:.7,voice:.8});
const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));
// Perceptual curve: slider 0..1 -> gain 0..1 with a gentle exponential so the lower half is usable.
export const sliderToGain=v=>{v=clamp01(v);return v<=0?0:Math.pow(v,1.8);};
export function readAudioSettings(storage){
 const out={...DEFAULT_VOLUMES,muted:false};
 try{
  const raw=(storage??globalThis.localStorage)?.getItem(AUDIO_SETTINGS_KEY);
  if(!raw)return out;
  const s=JSON.parse(raw);
  if(!s||typeof s!=='object')return out;
  for(const b of BUSES)if(typeof s[b]==='number'&&Number.isFinite(s[b]))out[b]=clamp01(s[b]);
  if(typeof s.muted==='boolean')out.muted=s.muted;
 }catch{}
 return out;
}
export function writeAudioSettings(settings,storage){
 try{const t=storage??globalThis.localStorage;if(!t)return false;const s={};for(const b of BUSES)s[b]=clamp01(settings[b]);s.muted=settings.muted===true;t.setItem(AUDIO_SETTINGS_KEY,JSON.stringify(s));return true;}catch{return false;}
}
// Effective gain of a bus given master + mute.
export function effectiveGain(settings,bus){
 if(settings.muted)return 0;
 const master=sliderToGain(settings.master);
 return bus==='master'?master:master*sliderToGain(settings[bus]);
}
export function createAudioBus({storage,contextFactory=defaultContextFactory,now=()=>Date.now()}={}){
 const settings=readAudioSettings(storage);
 let ctx=null,nodes=null,suspendedBy=new Set(),unlocked=false;
 const listeners=new Set();
 function emit(){for(const l of listeners)try{l(snapshot());}catch{}}
 function snapshot(){return {...settings,state:ctx?ctx.state:'none',unlocked,suspendedBy:[...suspendedBy]};}
 function build(){
  if(nodes||!ctx)return;
  const master=ctx.createGain(),comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-12;comp.knee.value=18;comp.ratio.value=3;comp.attack.value=.004;comp.release.value=.18;
  master.connect(comp).connect(ctx.destination);
  nodes={master,comp};
  for(const b of BUSES){if(b==='master')continue;const g=ctx.createGain();g.connect(master);nodes[b]=g;}
  applyGains(0);
 }
 function applyGains(ramp=.04){
  if(!nodes)return;
  const t=ctx.currentTime;
  nodes.master.gain.cancelScheduledValues(t);nodes.master.gain.setTargetAtTime(effectiveGain(settings,'master'),t,ramp);
  for(const b of BUSES){if(b==='master')continue;const g=sliderToGain(settings[b]);nodes[b].gain.cancelScheduledValues(t);nodes[b].gain.setTargetAtTime(settings.muted?0:g,t,ramp);}
 }
 // Must be called from a user gesture (click / keydown). Safe to call repeatedly.
 async function unlock(){
  try{
   if(!ctx){ctx=contextFactory();if(!ctx)return false;build();}
   if(ctx.state!=='running'&&suspendedBy.size===0)await ctx.resume();
   unlocked=ctx.state==='running'||suspendedBy.size>0;
   emit();return unlocked;
  }catch{return false;}
 }
 // Suspend reasons stack: pause + hidden both hold; audio resumes only when all are released.
 async function hold(reason){suspendedBy.add(reason);if(ctx&&ctx.state==='running'){try{await ctx.suspend();}catch{}}emit();}
 async function release(reason){suspendedBy.delete(reason);if(ctx&&suspendedBy.size===0&&unlocked&&ctx.state==='suspended'){try{await ctx.resume();}catch{}}emit();}
 function setVolume(bus,value){if(!BUSES.includes(bus))return false;settings[bus]=clamp01(value);writeAudioSettings(settings,storage);applyGains();emit();return true;}
 function setMuted(value){settings.muted=value===true;writeAudioSettings(settings,storage);applyGains();emit();return settings.muted;}
 return {
  get context(){return ctx;},get ready(){return !!ctx&&ctx.state==='running';},
  get settings(){return {...settings};},
  input(bus){return nodes?nodes[BUSES.includes(bus)&&bus!=='master'?bus:'sfx']:null;},
  unlock,hold,release,setVolume,setMuted,snapshot,
  subscribe(l){listeners.add(l);return ()=>listeners.delete(l);},
  get now(){return ctx?ctx.currentTime:0;}
 };
}
function defaultContextFactory(){
 const C=globalThis.AudioContext||globalThis.webkitAudioContext;
 return C?new C({latencyHint:'interactive'}):null;
}
