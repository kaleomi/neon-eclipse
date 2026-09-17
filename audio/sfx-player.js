// Plays catalog recipes through the bus with per-event cooldowns, a global voice cap,
// random pitch variation, and optional 3D placement (pan + distance + occlusion low-pass).
import {SFX} from './sfx-catalog.js';
import {renderRecipe,recipeDuration} from './synth.js';
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
export function createSfxPlayer(bus,{catalog=SFX,random=Math.random}={}){
 const last=new Map();let active=0,played=0,dropped=0;
 function play(name,{pitch=1,gain=1,at=null,position=null,listener=null,occluded=false}={}){
  const recipe=catalog[name];if(!recipe)return false;
  const ctx=bus.context;if(!ctx||!bus.ready)return false;
  const now=ctx.currentTime;
  const cd=recipe.cooldown||0;
  if(cd&&now-(last.get(name)??-1)<cd){dropped++;return false;}
  if(active>=MAX_VOICES){dropped++;return false;}
  last.set(name,now);
  let destination=bus.input(recipe.bus||'sfx');if(!destination)return false;
  let g=gain;
  if(position&&listener){
   const s=spatialize(listener,position,occluded);
   if(s.gain<=0.01)return false;
   g*=s.gain;
   const panner=ctx.createStereoPanner();panner.pan.value=s.pan;
   const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=s.cutoff;
   filter.connect(panner).connect(destination);destination=filter;
  }
  const vary=recipe.vary||0;
  const p=pitch*(vary?1+(random()*2-1)*vary:1);
  const start=at??now;
  active++;played++;
  const end=renderRecipe(ctx,destination,recipe,start,{pitch:p,gain:g});
  const ms=Math.max(20,(end-now)*1000+30);
  setTimeout(()=>{active=Math.max(0,active-1);},ms);
  return true;
 }
 return {play,get active(){return active;},stats:()=>({played,dropped,active}),duration:name=>catalog[name]?recipeDuration(catalog[name]):0};
}
