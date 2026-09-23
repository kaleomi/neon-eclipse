// GLACIER heavy artillery mech: pure rules for chapter 09. The rules own the mech position; the world renders it.
import {THIN_ICE,onThinIce} from './polar-data.js';
export const GLACIER_MAX_HP=1800;
export const GLACIER_SPAWN={x:0,z:-22};
export const GLACIER_SPEED=2.2;         // m/s while stalking the player
export const GLACIER_STOP=5;            // stops advancing inside this distance
export const GLACIER_ARMOR=.15;         // damage multiplier while armored
export const GLACIER_CORE=2;            // core multiplier while sunk
export const GLACIER_SHELL_CYCLE=[4,3]; // seconds between shells, tier 1 / tier 2
export const GLACIER_SHELL_WARN=1.2;    // ground circle telegraph
export const GLACIER_SHELL_RADIUS=3;
export const GLACIER_SHELL_DAMAGE=[22,26];
export const GLACIER_PRESS=2.5;         // seconds standing on thin ice before it breaks
export const GLACIER_SUNK=8;            // exposed window
export const GLACIER_CLIMB=1.5;         // climbing out, still exposed but no damage bonus
export const GLACIER_RECOVER=6;         // after climbing out the ice will not break again for this long
export function createGlacier(){
 const fresh=()=>({active:false,hp:GLACIER_MAX_HP,tier:1,phase:'armored',x:GLACIER_SPAWN.x,z:GLACIER_SPAWN.z,press:0,phaseTime:0,recover:0,shell:'rest',shellTime:GLACIER_SHELL_CYCLE[0],target:null,shells:0,sinks:0,hit:false});
 const state=fresh();
 function reset(active=false){Object.assign(state,fresh(),{active});}
 function damage(part,amount){
  if(!state.active||state.hp<=0||!Number.isFinite(amount)||amount<=0)return 0;
  const exposed=state.phase==='sunk'||state.phase==='climbing';
  const mult=!exposed?GLACIER_ARMOR:part==='core'&&state.phase==='sunk'?GLACIER_CORE:1;
  const dealt=Math.min(state.hp,amount*mult);state.hp-=dealt;if(state.hp>0&&state.hp<=GLACIER_MAX_HP/2)state.tier=2;
  if(state.hp===0){state.phase='dead';state.shell='rest';state.active=false;}
  return dealt;
 }
 // env: {player:{x,z}, feetY}. Returns shell damage this tick (0 unless a shell lands on the player).
 function tick(dt,env){
  if(!state.active||!Number.isFinite(dt)||dt<=0)return 0;
  const p=env.player||{x:0,z:0};
  if(state.phase==='armored'){
   const dx=p.x-state.x,dz=p.z-state.z,dist=Math.hypot(dx,dz);
   if(dist>GLACIER_STOP){const step=Math.min(dist-GLACIER_STOP,GLACIER_SPEED*dt);state.x+=dx/dist*step;state.z+=dz/dist*step;}
   state.recover=Math.max(0,state.recover-dt);
   if(state.recover===0&&onThinIce(state.x,state.z))state.press=Math.min(GLACIER_PRESS,state.press+dt);else state.press=Math.max(0,state.press-dt*2);
   if(state.press>=GLACIER_PRESS){state.phase='sunk';state.phaseTime=GLACIER_SUNK;state.press=0;state.sinks++;state.shell='rest';state.shellTime=GLACIER_SHELL_CYCLE[state.tier-1];state.target=null;return 0;}
  }else if(state.phase==='sunk'){
   state.phaseTime-=dt;if(state.phaseTime<=0){state.phase='climbing';state.phaseTime=GLACIER_CLIMB;}
   return 0;
  }else if(state.phase==='climbing'){
   state.phaseTime-=dt;if(state.phaseTime<=0){state.phase='armored';state.x=GLACIER_SPAWN.x;state.z=GLACIER_SPAWN.z;state.recover=GLACIER_RECOVER;state.press=0;}
   return 0;
  }else return 0;
  // Artillery (armored only): rest -> warning (ground circle on the player's position) -> impact once.
  state.shellTime-=dt;
  if(state.shellTime<=0){
   if(state.shell==='rest'){state.shell='warning';state.shellTime=GLACIER_SHELL_WARN;state.target={x:p.x,z:p.z};state.hit=false;}
   else{state.shell='rest';state.shellTime=GLACIER_SHELL_CYCLE[state.tier-1];state.shells++;const t=state.target;state.target=null;if(t&&!state.hit&&Math.hypot(p.x-t.x,p.z-t.z)<=GLACIER_SHELL_RADIUS){state.hit=true;return GLACIER_SHELL_DAMAGE[state.tier-1];}}
  }
  return 0;
 }
 return {state,reset,damage,tick,get blocking(){return state.active&&state.hp>0;},get exposed(){return state.phase==='sunk'||state.phase==='climbing';}};
}
export const glacierIceDistance=state=>Math.max(0,Math.hypot(state.x-THIN_ICE.x,state.z-THIN_ICE.z)-THIN_ICE.radius);
export function glacierHint(state){
 if(state.phase==='sunk')return '陷冰 · 装甲失效 '+Math.ceil(state.phaseTime)+' s → 攻击胸口核心';
 if(state.phase==='climbing')return '正在爬出冰面 · 仍可受伤';
 const ice=glacierIceDistance(state);
 const press=state.press>0?' · 压冰 '+state.press.toFixed(1)+' / '+GLACIER_PRESS+' s':'';
 const recover=state.recover>0?' · 冰面恢复中 '+Math.ceil(state.recover)+' s':'';
 const shell=state.shell==='warning'?' · 炮击预警：离开红圈':' · 下次炮击 '+Math.ceil(state.shellTime)+' s';
 return (ice<.5?'机甲已在薄冰上':'装甲状态 · 引它去中央薄冰湖（距 '+ice.toFixed(0)+' m）')+press+recover+shell;
}
