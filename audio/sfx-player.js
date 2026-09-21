// Plays catalog recipes through the bus with per-event cooldowns, a global voice cap,
// random pitch variation, and optional 3D placement (pan + distance + occlusion low-pass).
import {SFX} from './sfx-catalog.js';
import {isCriticalSfx,RESERVED_CRITICAL_VOICES} from './sfx-priority.js';
import {renderRecipe,recipeDuration} from './synth.js';
import {RECORDED_EVENTS,recordedBank} from './recorded-audio.js';
export const MAX_VOICES=24;
export const HEAR_DISTANCE=48;
// Pure: compute pan (-1..1), distance gain (0..1) and low-pass cutoff (Hz) from listener + source.
// listener: {x,z,yaw}  source: {x,z}  occluded: boolean
export function spatialize(listener,source,occluded=false,hearDistance=HEAR_DISTANCE){
 const dx=source.x-listener.x,dz=source.z-listener.z,dist=Math.hypot(dx,dz);
 if(dist>hearDistance)return {pan:0,gain:0,cutoff:20000,distance:dist};
 // Camera forward in this project is (sin(yaw), cos(yaw)) rotated: right vector = (cos yaw, -sin yaw).
 const rx=Math.cos(listener.yaw),rz=-Math.sin(listener.yaw);
 const pan=dist<.5?0:Math.max(-1,Math.min(1,(dx*rx+dz*rz)/dist));
 const gain=Math.pow(1-dist/hearDistance,1.35);
 const cutoff=occluded?1100:Math.max(1800,20000-dist*280);
 return {pan,gain,cutoff,distance:dist};
}
// `preloadFiles`: optional subset of recorded sample ids to warm on unlock (default: whole bank). Anything not
// warmed is still fetched on first play by the bank, so a narrower subset only trades bandwidth for first-hit latency.
export function createSfxPlayer(bus,{catalog=SFX,random=Math.random,preloadFiles=null}={}){
 const last=new Map();let active=0,played=0,dropped=0;
 const bank=recordedBank(bus),sampleVoices=new Set(),synthVoices=new Set();let recorded=0;
 const preload=(files=preloadFiles)=>bank.preload(files||Object.values(RECORDED_EVENTS).flatMap(r=>r.files));
 bus.subscribe?.(()=>{if(bank.supported())void preload();});
 function play(name,{pitch=1,gain=1,at=null,position=null,listener=null,occluded=false}={}){
  const sample=RECORDED_EVENTS[name];
  const recipe=catalog[name]||(sample?{bus:'sfx',cooldown:.2,vary:.05}:null);if(!recipe)return false;
  const ctx=bus.context;if(!ctx||!bus.ready)return false;
  let buffer=null;
  if(sample&&bank.supported()){
   const id=sample.files[Math.min(sample.files.length-1,Math.floor(random()*sample.files.length))];
   buffer=bank.get(id);if(!buffer){void bank.load(id);dropped++;return false;}
  }
  const now=ctx.currentTime;
  const cd=recipe.cooldown||0;
  if(cd&&now-(last.get(name)??-1)<cd){dropped++;return false;}
  const limit=isCriticalSfx(name)?MAX_VOICES:MAX_VOICES-RESERVED_CRITICAL_VOICES;
  if(active>=limit){dropped++;return false;}
  last.set(name,now);
  let destination=bus.input(recipe.bus||'sfx');if(!destination)return false;
  let g=gain;const spatialNodes=[];
  if(position&&listener){
   const s=spatialize(listener,position,occluded);
   if(s.gain<=0.01)return false;
   g*=s.gain;
   const panner=ctx.createStereoPanner();panner.pan.value=s.pan;
   const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=s.cutoff;
   filter.connect(panner).connect(destination);destination=filter;
   spatialNodes.push(filter,panner);
  }
  const vary=recipe.vary||0;
  const p=pitch*(vary?1+(random()*2-1)*vary:1);
  const start=at??now;
  active++;played++;
  if(buffer){
   const source=ctx.createBufferSource(),level=ctx.createGain();source.buffer=buffer;source.playbackRate.value=Math.max(.25,p);
   const duration=Math.min(buffer.duration,sample.duration??buffer.duration),end=start+duration/source.playbackRate.value;
   level.gain.setValueAtTime(g*sample.gain,start);level.gain.setValueAtTime(g*sample.gain,Math.max(start,end-.015));level.gain.linearRampToValueAtTime(0,end);
   source.connect(level).connect(destination);
   const voice={source,finish:null};let finished=false;
   voice.finish=()=>{if(finished)return;finished=true;sampleVoices.delete(voice);active=Math.max(0,active-1);source.disconnect();level.disconnect();for(const node of spatialNodes)node.disconnect();};
   source.onended=voice.finish;sampleVoices.add(voice);source.start(start,0,duration);recorded++;return true;
  }
  const output=ctx.createGain();output.connect(destination);
  const end=renderRecipe(ctx,output,recipe,start,{pitch:p,gain:g});
  const ms=Math.max(20,(end-now)*1000+30);
  const voice={timer:null,finish:null};
  voice.finish=()=>{if(!synthVoices.delete(voice))return;clearTimeout(voice.timer);output.gain.setValueAtTime(0,ctx.currentTime);output.disconnect?.();active=Math.max(0,active-1);for(const node of spatialNodes)node.disconnect?.();};
  synthVoices.add(voice);voice.timer=setTimeout(voice.finish,ms);
  return true;
 }
 function reset(){for(const v of sampleVoices){v.source.stop();v.finish();}for(const v of synthVoices)v.finish();last.clear();}
 return {play,reset,preload,get active(){return active;},stats:()=>({played,dropped,active,recorded,samples:bank.stats()}),duration:name=>catalog[name]?recipeDuration(catalog[name]):0};
}
