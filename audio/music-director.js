// Generative music: a small state machine (explore / combat / boss / extract / won / lost / idle)
// driving layered procedural tracks. Each layer is a looping pattern of scheduled oscillator notes;
// layers fade in/out with the state's intensity. All pure scheduling logic is separated from
// Web Audio so state transitions and layer targets can be tested in Node.
export const MUSIC_STATES=Object.freeze(['idle','explore','combat','boss','extract','won','lost']);
// Layer targets per state (0..1). pad = harmonic bed, pulse = 8th-note bass, drums = kick/hat, lead = melodic arps, alarm = extract siren.
export const LAYER_TARGETS=Object.freeze({
 idle:{pad:.35,pulse:0,drums:0,lead:0,alarm:0},
 explore:{pad:.6,pulse:.35,drums:0,lead:.2,alarm:0},
 combat:{pad:.5,pulse:.8,drums:.85,lead:.5,alarm:0},
 boss:{pad:.7,pulse:1,drums:1,lead:.8,alarm:0},
 extract:{pad:.4,pulse:.9,drums:.9,lead:.3,alarm:.7},
 won:{pad:.8,pulse:0,drums:0,lead:.6,alarm:0},
 lost:{pad:.3,pulse:0,drums:0,lead:0,alarm:0}
});
export const LAYER_NAMES=Object.freeze(Object.keys(LAYER_TARGETS.idle));
// Decide the music state from gameplay facts. Pure.
export function resolveMusicState({playState,enemiesNear=0,bossActive=false,defending=false,extracting=false}){
 if(playState==='won')return 'won';
 if(playState==='lost')return 'lost';
 if(playState!=='playing')return 'idle';
 if(extracting)return 'extract';
 if(bossActive)return 'boss';
 if(defending||enemiesNear>0)return 'combat';
 return 'explore';
}
// Combat intensity decays slowly so music does not flicker when the last enemy dies.
export function createIntensity({attack=2.5,release=.35}={}){
 let value=0;
 return {get value(){return value;},update(dt,target){const rate=target>value?attack:release;value+=(target-value)*Math.min(1,dt*rate);if(Math.abs(target-value)<.002)value=target;return value;},reset(){value=0;}};
}
// Musical material: A minor pentatonic-ish set in a low register with a neon-synth feel.
const ROOT=55; // A1
const SCALE=[0,3,5,7,10,12,15,17,19,22];
const note=(deg,oct=0)=>ROOT*Math.pow(2,(SCALE[((deg%SCALE.length)+SCALE.length)%SCALE.length]+12*(Math.floor(deg/SCALE.length)+oct))/12);
const PROGRESSION=[0,0,5,3,0,0,7,5]; // bar roots (scale degrees)
export function createMusicDirector(bus,{bpm=112,random=Math.random}={}){
 const beat=60/bpm,bar=beat*4;
 let state='idle',layers=null,nextBar=0,barIndex=0,timer=null,running=false,current={pad:0,pulse:0,drums:0,lead:0,alarm:0};
 const intensity=createIntensity();
 function ensure(){
  const ctx=bus.context;if(!ctx||layers)return !!layers;
  const out=bus.input('music');if(!out)return false;
  layers={};
  for(const name of LAYER_NAMES){const g=ctx.createGain();g.gain.value=0;g.connect(out);layers[name]=g;}
  return true;
 }
 function setState(next){if(!MUSIC_STATES.includes(next)||next===state)return false;state=next;return true;}
 function targets(){
  const t={...LAYER_TARGETS[state]};
  if(state==='combat'){const k=.6+.4*intensity.value;t.drums*=k;t.pulse*=k;t.lead*=k;}
  return t;
 }
 function applyGains(ramp=1.2){
  if(!layers)return;const ctx=bus.context,t=ctx.currentTime,goal=targets();
  for(const name of LAYER_NAMES){const g=layers[name].gain;g.cancelScheduledValues(t);g.setTargetAtTime(goal[name]*.5,t,ramp/3);current[name]=goal[name];}
 }
 function tone(dest,type,f,t,len,gain,{fEnd,detune=0,q}={}){
  const ctx=bus.context,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(fEnd)o.frequency.exponentialRampToValueAtTime(fEnd,t+len);o.detune.value=detune;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+Math.min(.02,len*.2));g.gain.exponentialRampToValueAtTime(.0001,t+len);
  let node=o;if(q){const fl=ctx.createBiquadFilter();fl.type='lowpass';fl.frequency.value=q;o.connect(fl);node=fl;}
  node.connect(g).connect(dest);o.start(t);o.stop(t+len+.05);
 }
 function noiseHit(dest,t,len,gain,cutoff){
  const ctx=bus.context,src=ctx.createBufferSource();
  const n=Math.floor(ctx.sampleRate*len),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  src.buffer=b;const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=cutoff;const g=ctx.createGain();g.gain.value=gain;src.connect(f).connect(g).connect(dest);src.start(t);
 }
 function scheduleBar(t){
  const root=PROGRESSION[barIndex%PROGRESSION.length];
  // pad: two detuned saws through low-pass, whole bar
  for(const deg of [root,root+2,root+4]){tone(layers.pad,'sawtooth',note(deg,1),t,bar*1.05,.09,{detune:-6,q:900});tone(layers.pad,'sawtooth',note(deg,1),t,bar*1.05,.09,{detune:6,q:900});}
  // pulse: 8th-note bass
  for(let i=0;i<8;i++){const accent=i%2===0?.22:.14;tone(layers.pulse,'square',note(root,0),t+i*beat/2,beat*.42,accent,{q:700});}
  // drums: kick on 1 & 3, snare-ish on 2 & 4, hats on 8ths
  for(let i=0;i<4;i++){
   const bt=t+i*beat;
   if(i%2===0)tone(layers.drums,'sine',150,bt,.22,.5,{fEnd:40});
   else noiseHit(layers.drums,bt,.14,.35,1800);
   noiseHit(layers.drums,bt,.03,.12,6000);noiseHit(layers.drums,bt+beat/2,.03,.08,6000);
  }
  // lead: arpeggio choosing chord tones, occasional octave
  const pattern=[0,2,4,7,4,2,9,7];
  for(let i=0;i<8;i++){const deg=root+pattern[(i+barIndex)%pattern.length];if(random()<.85)tone(layers.lead,'triangle',note(deg,2),t+i*beat/2,beat*.55,.16);}
  // alarm: two-tone siren every half bar
  tone(layers.alarm,'square',880,t,beat*.9,.08,{q:2500});tone(layers.alarm,'square',659,t+bar/2,beat*.9,.08,{q:2500});
  barIndex++;
 }
 function tick(){
  if(!running||!layers)return;
  const ctx=bus.context;if(!ctx||ctx.state!=='running'){timer=setTimeout(tick,200);return;}
  while(nextBar<ctx.currentTime+.6){if(nextBar<ctx.currentTime)nextBar=ctx.currentTime+.05;scheduleBar(nextBar);nextBar+=bar;}
  timer=setTimeout(tick,150);
 }
 return {
  get state(){return state;},get layers(){return {...current};},intensity,
  start(){if(!ensure())return false;running=true;if(!timer){nextBar=bus.context.currentTime+.05;tick();}applyGains();return true;},
  stop(){running=false;if(timer){clearTimeout(timer);timer=null;}if(layers){const t=bus.context.currentTime;for(const n of LAYER_NAMES)layers[n].gain.setTargetAtTime(0,t,.3);}},
  update(dt,facts){
   const next=resolveMusicState(facts);
   intensity.update(dt,facts.enemiesNear>0?Math.min(1,facts.enemiesNear/4):0);
   const changed=setState(next);
   if(layers&&(changed||state==='combat'))applyGains(changed?(next==='won'||next==='lost'?.6:1.4):2.5);
   return changed;
  },
  setState(next){const c=setState(next);if(c)applyGains();return c;},
  targets
 };
}
