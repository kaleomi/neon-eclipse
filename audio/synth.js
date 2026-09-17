// Procedural synthesizer primitives. Every sound is described by a recipe (plain object) so the
// catalog is data and can be validated in Node without an AudioContext. The renderer turns a recipe
// into Web Audio nodes attached to a destination at a given time.
//
// Recipe layers (all optional, mixed together):
//   tones:  [{type:'sine'|'square'|'sawtooth'|'triangle', f:220, fEnd:110, fCurve:'exp'|'lin', gain:.4, a:.005, d:.1, s:0, r:.05, detune:0, delay:0}]
//   noise:  [{color:'white'|'pink'|'brown', gain:.3, a:.001, d:.08, r:.02, filter:{type:'lowpass'|'highpass'|'bandpass', f:1200, fEnd:400, q:1}, delay:0}]
//   fm:     [{carrier:300, ratio:2.5, index:80, indexEnd:0, gain:.3, a:.002, d:.15, r:.05, delay:0}]
//   pitch:  optional multiplier applied to all frequencies (random variation lives in the catalog)
//   duration: total length in seconds (defaults to the longest layer)
const NOISE_SECONDS=2;
const noiseCache=new WeakMap();
export function noiseBuffer(ctx,color='white'){
 let byCtx=noiseCache.get(ctx);if(!byCtx){byCtx=new Map();noiseCache.set(ctx,byCtx);}
 if(byCtx.has(color))return byCtx.get(color);
 const length=Math.floor(ctx.sampleRate*NOISE_SECONDS),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
 let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,last=0;
 for(let i=0;i<length;i++){
  const w=Math.random()*2-1;
  if(color==='white')data[i]=w;
  else if(color==='brown'){last=(last+.02*w)/1.02;data[i]=last*3.5;}
  else{ // pink (Paul Kellet)
   b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;
   data[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926;
  }
 }
 byCtx.set(color,buffer);return buffer;
}
function envelope(param,t,peak,a=.005,d=.1,s=0,r=.05,hold=0){
 const floor=.0001;
 param.setValueAtTime(floor,t);
 param.linearRampToValueAtTime(Math.max(floor,peak),t+a);
 const sustain=Math.max(floor,peak*s);
 param.exponentialRampToValueAtTime(sustain,t+a+d);
 if(hold>0)param.setValueAtTime(sustain,t+a+d+hold);
 param.exponentialRampToValueAtTime(floor,t+a+d+hold+r);
 return a+d+hold+r;
}
export function layerDuration(layer){return (layer.delay||0)+(layer.a??.005)+(layer.d??.1)+(layer.hold||0)+(layer.r??.05);}
export function recipeDuration(recipe){
 if(recipe.duration)return recipe.duration;
 let max=.05;
 for(const key of ['tones','noise','fm'])for(const l of recipe[key]||[])max=Math.max(max,layerDuration(l));
 return max;
}
export function validRecipe(recipe){
 if(!recipe||typeof recipe!=='object')return false;
 const num=(v,min,max)=>v===undefined||(Number.isFinite(v)&&v>=min&&v<=max);
 for(const l of recipe.tones||[]){if(!['sine','square','sawtooth','triangle'].includes(l.type||'sine'))return false;if(!num(l.f,10,20000)||!num(l.fEnd,10,20000)||!num(l.gain,0,2)||!num(l.a,0,5)||!num(l.d,0,10)||!num(l.s,0,1)||!num(l.r,0,10)||!num(l.delay,0,10))return false;if(l.f===undefined)return false;}
 for(const l of recipe.noise||[]){if(!['white','pink','brown'].includes(l.color||'white'))return false;if(!num(l.gain,0,2)||!num(l.a,0,5)||!num(l.d,0,10)||!num(l.r,0,10)||!num(l.delay,0,10))return false;if(l.filter&&(!['lowpass','highpass','bandpass','notch'].includes(l.filter.type)||!num(l.filter.f,10,20000)||!num(l.filter.fEnd,10,20000)||!num(l.filter.q,.01,50)))return false;}
 for(const l of recipe.fm||[]){if(!num(l.carrier,10,20000)||l.carrier===undefined||!num(l.ratio,.01,32)||!num(l.index,0,5000)||!num(l.indexEnd,0,5000)||!num(l.gain,0,2)||!num(l.a,0,5)||!num(l.d,0,10)||!num(l.r,0,10)||!num(l.delay,0,10))return false;}
 if(!num(recipe.duration,.01,30)||!num(recipe.pitch,.1,10))return false;
 if(!(recipe.tones?.length||recipe.noise?.length||recipe.fm?.length))return false;
 return true;
}
// Render a recipe into `destination` starting at time t. Returns the end time. Never throws to callers.
export function renderRecipe(ctx,destination,recipe,t,{pitch=1,gain=1}={}){
 const p=(recipe.pitch||1)*pitch;let end=t;
 const stop=(node,at)=>{try{node.stop(at);}catch{}};
 for(const l of recipe.tones||[]){
  const osc=ctx.createOscillator(),g=ctx.createGain();osc.type=l.type||'sine';
  const start=t+(l.delay||0),f=Math.max(10,l.f*p);
  osc.frequency.setValueAtTime(f,start);
  if(l.fEnd!==undefined){const fe=Math.max(10,l.fEnd*p);if((l.fCurve||'exp')==='exp')osc.frequency.exponentialRampToValueAtTime(fe,start+(l.a??.005)+(l.d??.1));else osc.frequency.linearRampToValueAtTime(fe,start+(l.a??.005)+(l.d??.1));}
  if(l.detune)osc.detune.setValueAtTime(l.detune,start);
  const len=envelope(g.gain,start,(l.gain??.3)*gain,l.a,l.d,l.s,l.r,l.hold);
  osc.connect(g).connect(destination);osc.start(start);stop(osc,start+len+.02);end=Math.max(end,start+len+.02);
 }
 for(const l of recipe.noise||[]){
  const src=ctx.createBufferSource();src.buffer=noiseBuffer(ctx,l.color||'white');src.loop=true;src.loopStart=Math.random()*(NOISE_SECONDS-.5);
  const g=ctx.createGain();let chain=src;const start=t+(l.delay||0);
  if(l.filter){const f=ctx.createBiquadFilter();f.type=l.filter.type;f.Q.value=l.filter.q??1;f.frequency.setValueAtTime(Math.max(10,l.filter.f*p),start);if(l.filter.fEnd!==undefined)f.frequency.exponentialRampToValueAtTime(Math.max(10,l.filter.fEnd*p),start+(l.a??.001)+(l.d??.08));chain.connect(f);chain=f;}
  const len=envelope(g.gain,start,(l.gain??.3)*gain,l.a??.001,l.d??.08,l.s??0,l.r??.02,l.hold);
  chain.connect(g).connect(destination);src.start(start,src.loopStart);stop(src,start+len+.02);end=Math.max(end,start+len+.02);
 }
 for(const l of recipe.fm||[]){
  const car=ctx.createOscillator(),mod=ctx.createOscillator(),mg=ctx.createGain(),g=ctx.createGain();
  const start=t+(l.delay||0),fc=Math.max(10,l.carrier*p);
  car.frequency.setValueAtTime(fc,start);mod.frequency.setValueAtTime(fc*(l.ratio??2),start);
  mg.gain.setValueAtTime(l.index??50,start);if(l.indexEnd!==undefined)mg.gain.linearRampToValueAtTime(l.indexEnd,start+(l.a??.002)+(l.d??.15));
  mod.connect(mg).connect(car.frequency);
  const len=envelope(g.gain,start,(l.gain??.3)*gain,l.a??.002,l.d??.15,l.s??0,l.r??.05,l.hold);
  car.connect(g).connect(destination);mod.start(start);car.start(start);stop(mod,start+len+.02);stop(car,start+len+.02);end=Math.max(end,start+len+.02);
 }
 return end;
}
// Small procedural impulse response for a room reverb: exponentially decaying noise.
export function impulseResponse(ctx,seconds=1.2,decay=2.8){
 const rate=ctx.sampleRate,length=Math.floor(rate*seconds),buffer=ctx.createBuffer(2,length,rate);
 for(let c=0;c<2;c++){const d=buffer.getChannelData(c);for(let i=0;i<length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/length,decay);}
 return buffer;
}
