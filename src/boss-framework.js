// Small reusable lifecycle only. Arena mechanics stay in each boss's rules module.
// No storage, input, rendering or global difficulty changes; paused callers do not tick.
export function createBossFramework({maxHp,windowSeconds=6,defeatSeconds=.8,tierThresholds=[.5]}={}){
 if(!Number.isFinite(maxHp)||maxHp<=0||!Number.isFinite(windowSeconds)||windowSeconds<=0||!Number.isFinite(defeatSeconds)||defeatSeconds<0||!Array.isArray(tierThresholds)||tierThresholds.some((v,i)=>!Number.isFinite(v)||v<=0||v>=1||(i>0&&v>=tierThresholds[i-1])))throw new TypeError('Invalid boss configuration');
 const state={};
 function reset(active=false){Object.assign(state,{active:Boolean(active),hp:maxHp,maxHp,phase:active?'shield':'inactive',tier:1,timer:0,windows:0});}
 function expose(){if(!state.active||state.hp<=0||state.phase!=='shield')return false;state.phase='exposed';state.timer=windowSeconds;state.windows++;return true;}
 function hit(amount){
  if(state.phase!=='exposed'||!state.active||!Number.isFinite(amount)||amount<=0)return {damage:0,killed:false};
  const damage=Math.min(state.hp,amount);state.hp-=damage;
  state.tier=1+tierThresholds.filter(t=>state.hp<=maxHp*t).length;
  const killed=state.hp===0;
  if(killed){state.phase='defeated';state.timer=defeatSeconds;if(!state.timer)state.active=false;}
  return {damage,killed};
 }
 function closeWindow(){if(state.phase!=='exposed'||!state.active)return false;state.phase='shield';state.timer=0;return true;}
 function tick(dt){
  if(!state.active||!Number.isFinite(dt)||dt<=0||!['exposed','defeated'].includes(state.phase))return null;
  state.timer=Math.max(0,state.timer-dt);
  if(state.timer>1e-8)return null;state.timer=0;
  if(state.phase==='exposed'){state.phase='shield';return 'closed';}
  state.active=false;return 'finished';
 }
 reset();return {state,reset,expose,closeWindow,hit,tick,get alive(){return state.active&&state.hp>0;},get blocking(){return state.active;}};
}
