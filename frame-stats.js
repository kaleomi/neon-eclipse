// Frame timing sampler for the render loop. Pure arithmetic, no DOM: app.js feeds `sample(now)` once per frame.
// Produces the HUD fps text and an attempt-level performance summary that telemetry may attach as `perf`.
export const FRAME_STATS_MAX_SAMPLES=4096;
export function createFrameStats({hudInterval=.5,maxSamples=FRAME_STATS_MAX_SAMPLES}={}){
 let previous=null,frames=0,window=0,hud=0,recording=false,samples=[],dropped=0,quality=null;
 return {
  get hud(){return hud;},
  sample(now){
   const dt=previous===null?0:Math.min((now-previous)/1000,1);previous=now;
   frames++;window+=dt;if(window>hudInterval){hud=Math.round(frames/window);frames=0;window=0;}
   if(recording&&dt>0){if(samples.length<maxSamples)samples.push(dt*1000);else dropped++;}
   return hud;
  },
  begin(q=null){recording=true;samples=[];dropped=0;quality=q;},
  setQuality(q){quality=q;},
  // Ends the recording and returns a compact summary (or null if nothing was captured).
  finish(){
   recording=false;if(!samples.length)return null;
   const sorted=[...samples].sort((a,b)=>a-b),sum=samples.reduce((a,b)=>a+b,0),pick=p=>sorted[Math.min(sorted.length-1,Math.floor(p*sorted.length))];
   const summary={frames:samples.length+dropped,avgFps:Math.round(1000/(sum/samples.length)),p50Ms:Math.round(pick(.5)*10)/10,p95Ms:Math.round(pick(.95)*10)/10,maxMs:Math.round(sorted[sorted.length-1]*10)/10,long:samples.filter(ms=>ms>50).length,quality};
   samples=[];return summary;
  },
  reset(){previous=null;frames=0;window=0;hud=0;recording=false;samples=[];dropped=0;}
 };
}
export function validFramePerf(p){
 if(p===null||p===undefined)return true;
 if(!p||typeof p!=='object')return false;
 const int=(v,max)=>Number.isInteger(v)&&v>=0&&v<=max,num=(v,max)=>Number.isFinite(v)&&v>=0&&v<=max;
 return int(p.frames,1e8)&&int(p.avgFps,1000)&&num(p.p50Ms,1e5)&&num(p.p95Ms,1e5)&&num(p.maxMs,1e6)&&int(p.long,1e8)&&(p.quality===null||int(p.quality,2));
}
export function summarizeFramePerf(records){
 const list=records.map(r=>r.perf).filter(p=>p&&validFramePerf(p));
 if(!list.length)return {samples:0,avgFps:null,p95Ms:null,worstMs:null,longFrames:0,byQuality:{}};
 const weight=list.reduce((n,p)=>n+p.frames,0)||1;
 const byQuality={};for(const p of list){const key=p.quality===null?'unknown':String(p.quality);const q=byQuality[key]||(byQuality[key]={attempts:0,avgFps:0});q.attempts++;q.avgFps+=p.avgFps;}
 for(const q of Object.values(byQuality))q.avgFps=Math.round(q.avgFps/q.attempts);
 return {samples:list.length,avgFps:Math.round(list.reduce((n,p)=>n+p.avgFps*p.frames,0)/weight),p95Ms:Math.round(Math.max(...list.map(p=>p.p95Ms))*10)/10,worstMs:Math.round(Math.max(...list.map(p=>p.maxMs))*10)/10,longFrames:list.reduce((n,p)=>n+p.long,0),byQuality};
}
