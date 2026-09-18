import {createAudioBus} from './audio/audio-bus.js';
// Reuse the existing bus, but explicitly inject a non-persistent adapter. null would fall back to localStorage.
export function createHelicopterAudio({contextFactory}={}){
  const memoryOnly={getItem:()=>null,setItem:()=>{}};
  const bus=createAudioBus({storage:memoryOnly,...(contextFactory?{contextFactory}:{})});
  bus.setMuted(true);
  let enabled=false,paused=true,nodes=null,disposed=false;
  function build(){
    if(nodes||!bus.context||disposed)return;
    const ctx=bus.context,carrier=ctx.createOscillator(),lfo=ctx.createOscillator(),depth=ctx.createGain(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
    carrier.type='triangle';carrier.frequency.value=75;lfo.type='sine';lfo.frequency.value=8;
    depth.gain.value=0;gain.gain.value=0;filter.type='lowpass';filter.frequency.value=550;filter.Q.value=.5;
    lfo.connect(depth).connect(gain.gain);carrier.connect(filter).connect(gain).connect(bus.input('sfx'));
    carrier.start();lfo.start();nodes={carrier,lfo,depth,gain,filter};
  }
  async function activate(){
    if(disposed||!enabled||paused)return false;
    await bus.release('muted');await bus.release('paused');if(disposed||paused||!enabled)return false;const ok=await bus.unlock();
    if(disposed){try{await bus.context?.close();}catch{}return false;}if(paused){await bus.hold('paused');return false;}
    if(!enabled){await bus.hold('muted');return false;}if(ok)build();return ok;
  }
  async function setEnabled(value){
    enabled=value===true;bus.setMuted(!enabled);
    if(!enabled){await bus.hold('muted');return false;}
    return activate();
  }
  function pause(){paused=true;return bus.hold('paused');}
  function resume(){paused=false;return activate();}
  function update(s){
    if(!enabled||paused||!nodes||!bus.ready||disposed)return;
    const t=bus.now,r=s.status==='crashed'?0:s.rpm,speed=Math.hypot(s.vx,s.vz);
    nodes.carrier.frequency.setTargetAtTime(65+130*r+speed*.9,t,.08);
    nodes.lfo.frequency.setTargetAtTime(3+17*r,t,.08);
    nodes.gain.gain.setTargetAtTime(.029*r,t,.08);nodes.depth.gain.setTargetAtTime(.012*r,t,.08);
  }
  async function dispose(){
    disposed=true;enabled=false;
    if(nodes){for(const node of [nodes.carrier,nodes.lfo])try{node.stop();}catch{}for(const node of Object.values(nodes))try{node.disconnect();}catch{}nodes=null;}
    try{await bus.context?.close();}catch{}
  }
  return {setEnabled,pause,resume,update,dispose,subscribe:bus.subscribe,snapshot:()=>({enabled,paused,...bus.snapshot()})};
}
