// Pure kill-presentation rules: dissolve timeline, elite/boss slow-motion clock, streak steps and settings.
export const KILL_FX=Object.freeze({flash:.1,dissolve:.4,slowmoDuration:.3,slowmoScale:.35,streakSteps:Object.freeze([3,5,10])});
export const FX_SETTINGS_KEY='neon-eclipse.presentation-fx.v1';
export const DEFAULT_FX_SETTINGS=Object.freeze({slowmo:true,dissolve:true,intro:true});
export function validateFxSettings(raw){
 const out={...DEFAULT_FX_SETTINGS};
 if(!raw||typeof raw!=='object')return out;
 for(const key of Object.keys(DEFAULT_FX_SETTINGS))if(typeof raw[key]==='boolean')out[key]=raw[key];
 return out;
}
export function loadFxSettings(storage){try{return validateFxSettings(JSON.parse(storage?.getItem(FX_SETTINGS_KEY)||'null'));}catch{return {...DEFAULT_FX_SETTINGS};}}
export function saveFxSettings(storage,settings){try{storage?.setItem(FX_SETTINGS_KEY,JSON.stringify(validateFxSettings(settings)));return true;}catch{return false;}}
// Ghost timeline: t seconds since the kill. flash = white outline for `flash` seconds, then the mesh dissolves
// (opacity 1→0, scale 1→1.12, rises .35 m) until `dissolve` seconds. Returns null when finished.
export function killGhostFrame(t,rules=KILL_FX){
 if(!Number.isFinite(t)||t<0)t=0;
 if(t>=rules.dissolve)return null;
 if(t<rules.flash)return {phase:'flash',opacity:1,scale:1,rise:0,emissive:1};
 const u=(t-rules.flash)/(rules.dissolve-rules.flash);
 return {phase:'dissolve',opacity:1-u,scale:1+u*.12,rise:u*.35,emissive:1-u*.6};
}
// Slow-motion clock: elite/boss kills request `duration` seconds of real time at `scale`. Requests do not stack,
// the later one only extends the window. Disabled → scale stays 1 and `trigger` reports false.
export function createSlowmo({duration=KILL_FX.slowmoDuration,scale=KILL_FX.slowmoScale,enabled=()=>true}={}){
 let remaining=0;
 return {
  trigger(kind){if(!enabled()||!(kind==='elite'||kind==='boss'))return false;remaining=Math.max(remaining,duration);return true;},
  step(realDt){if(remaining<=0)return 1;remaining=Math.max(0,remaining-Math.max(0,realDt));if(remaining<1e-9)remaining=0;return scale;},
  reset(){remaining=0;},
  get active(){return remaining>0;},get remaining(){return remaining;}
 };
}
// Classify the kill for presentation. Boss wins over elite; ordinary kills never slow time.
export function killKind(enemy){if(!enemy)return 'normal';if(enemy.boss)return 'boss';if(enemy.elite||enemy.type==='harborElite')return 'elite';return 'normal';}
