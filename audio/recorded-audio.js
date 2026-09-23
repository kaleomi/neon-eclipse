// Licensed field recordings. Shared decode cache per bus; never replay a late network event.
const banks=new WeakMap();
export const RECORDED_EVENTS=Object.freeze({
 'fire.vanguard':{files:['rifle-ar'],gain:.65},
 'fire.halo':{files:['rifle-ar'],gain:.5},
 'fire.breacher':{files:['shotgun'],gain:.75},
 'fire.ghost':{files:['pistol-soft'],gain:.4},
 'fire.tempest':{files:['smg'],gain:.52},
 'fire.railspike':{files:['rifle-ak'],gain:.7},
 'fire.volt':{files:['pistol-1911'],gain:.55},
 'enemy.fire':{files:['rifle-ak'],gain:.3},
 'reload.start':{files:['magazine'],gain:.45},
 'reload.shell':{files:['magazine'],gain:.3,duration:.3},
 'reload.done':{files:['cocking'],gain:.45},
 'reload.tempest':{files:['magazine'],gain:.45},
 'weapon.switch':{files:['magazine'],gain:.2,duration:.25},
 'fire.empty':{files:['cocking'],gain:.18,duration:.15},
 'cannon.fire':{files:['cannon-a','cannon-b'],gain:.7},
 'cannon.hit':{files:['metal-crash'],gain:.5},
 'kill.boss':{files:['cannon-b'],gain:.6},
 'cannon.splash':{files:['water'],gain:.35,duration:1},
 'hit.armor':{files:['metal-hit'],gain:.25,duration:.28},
 'bolt.wall':{files:['metal-hit'],gain:.18,duration:.2},
 'vehicle.impact':{files:['metal-crash'],gain:.45},
 'vehicle.touchdown':{files:['metal-drop'],gain:.25,duration:.6},
 'player.land':{files:['step-metal-1','step-metal-2'],gain:.4},
 'player.step':{files:['step-metal-1','step-metal-2','step-metal-3'],gain:.3},
 'player.step.snow':{files:['step-snow-1','step-snow-2','step-snow-3'],gain:.24},
 'player.step.gravel':{files:['step-gravel-1','step-gravel-2','step-gravel-3'],gain:.3},
});
export function recordedBank(bus){
 if(banks.has(bus))return banks.get(bus);
 const buffers=new Map(),pending=new Map(),failed=new Set();
 const supported=()=>typeof bus.context?.decodeAudioData==='function';
 function load(id){
  if(buffers.has(id))return Promise.resolve(buffers.get(id));
  if(pending.has(id))return pending.get(id);
  if(!supported()||failed.has(id))return Promise.resolve(null);
  const job=(async()=>{try{
   const response=await fetch(new URL(`./samples/${id}.ogg`,import.meta.url));
   if(!response.ok)throw Error(`Audio HTTP ${response.status}: ${id}`);
   const buffer=await bus.context.decodeAudioData(await response.arrayBuffer());buffers.set(id,buffer);return buffer;
  }catch(error){failed.add(id);console.warn('Recording unavailable:',id,error.message);return null;}finally{pending.delete(id);}})();
  pending.set(id,job);return job;
 }
 const api={supported,load,get:id=>buffers.get(id),preload:ids=>Promise.all([...new Set(ids)].map(load)),stats:()=>({loaded:[...buffers.keys()],pending:[...pending.keys()],failed:[...failed]})};
 banks.set(bus,api);return api;
}
// A small bounded set of loop voices. Fade when switching, stop immediately on session reset.
export function createRecordedLoops(bus,{busName='sfx',fade=.04,settle=.12}={}){
 const bank=recordedBank(bus),voices=new Map(),retiring=new Set();let starts=0;
 function stopVoice(v,immediate=false){
  const t=bus.context.currentTime;
  v.gain.gain.cancelScheduledValues(t);
  if(immediate){v.gain.gain.setValueAtTime(0,t);v.source.stop();}
  else{retiring.add(v);v.gain.gain.setTargetAtTime(0,t,fade);v.source.stop(t+fade*5);}
 }
 function update(targets){
  if(!bank.supported())return false;
  if(!bus.ready)return true;
  for(const [id,v] of voices)if(!targets[id]||targets[id].gain<=.0001){stopVoice(v);voices.delete(id);}
  for(const [id,opts] of Object.entries(targets)){
   if(opts.gain<=.0001)continue;
   let v=voices.get(id);
   if(!v){const buffer=bank.get(id);if(!buffer){void bank.load(id);continue;}
    const ctx=bus.context,source=ctx.createBufferSource(),gain=ctx.createGain();
    source.buffer=buffer;source.loop=true;gain.gain.value=0;
    source.connect(gain).connect(bus.input(busName));source.onended=()=>{retiring.delete(v);source.disconnect();gain.disconnect();};
    source.start();v={source,gain};voices.set(id,v);starts++;
   }
   const t=bus.context.currentTime;
   v.gain.gain.setTargetAtTime(Math.min(1,opts.gain),t,settle);
   v.source.playbackRate.setTargetAtTime(Math.max(.5,Math.min(1.8,opts.rate??1)),t,.18);
  }
  return true;
 }
 function reset(){for(const v of new Set([...voices.values(),...retiring]))stopVoice(v,true);voices.clear();retiring.clear();}
 return {update,reset,bank,stats:()=>({voices:[...voices.keys()],starts,...bank.stats()})};
}
export function vehicleRecordingTargets(s){
 if(!s.active)return {};
 const speed=Math.abs(s.speed||0),load=Math.min(1,Math.abs(s.throttle||0));
 const wind={gain:Math.min(.13,speed/250),rate:1};
 if(s.crashed&&s.kind)return {};
 // Keep the recorded engine bed alive at cruising speed; acceleration blends over it.
 if(s.kind==='rover'){const mix=Math.min(1,speed/18);return {'rover-idle':{gain:.24*(1-.8*mix),rate:1+load*.12},'rover-drive':{gain:.32*mix,rate:.8+mix*.35},wind};}
 if(s.kind==='helicopter'){const rpm=Math.max(0,Math.min(1,s.rpm||0));return {rotor:{gain:rpm*.34,rate:.55+rpm*.45},wind:{gain:wind.gain*rpm}};}
 if(s.kind==='yacht')return {boat:{gain:.22+load*.08,rate:.85+Math.min(1,speed/13)*.35},water:{gain:.09+Math.min(1,speed/13)*.1},wind};
 if(s.kind==='plane'){const mix=Math.max(0,Math.min(1,s.throttle||0));return {'plane-idle':{gain:.2*(1-mix),rate:.85+mix*.3},'plane-flight':{gain:.28*mix,rate:.8+mix*.4},wind};}
 return s.nearWater?{water:{gain:.1}}:{};
}
