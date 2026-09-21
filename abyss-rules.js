// ABYSS water-cooled mainframe: pure rules for chapter 08. The world owns the tide; rules receive the water level.
import {WATER_HIGH} from './datacenter-data.js';
export const ABYSS_MAX_HP=1500;
// Keep the damageable core in front of the solid cabinet (front face z=-9), not buried inside it.
export const ABYSS_POSITION={x:0,z:-7.7,y:3.2};
export const ABYSS_EXPOSE_LEVEL=.3;     // core is reachable while the water is below this
export const ABYSS_SUMMON=2;            // stalkers called per HIGH phase (tier 2: 3)
export const ABYSS_SUMMON_CAP=4;
export function createAbyss(){
 const fresh=()=>({active:false,hp:ABYSS_MAX_HP,tier:1,phase:'shield',attack:'rest',attackTime:3,hit:false,discharges:0,summons:0,wasHigh:false,pendingSummons:0});
 const state=fresh();
 function reset(active=false){Object.assign(state,fresh(),{active});}
 function damage(part,amount){
  if(!state.active||state.hp<=0||part!=='core'||!Number.isFinite(amount)||amount<=0||state.phase!=='exposed')return 0;
  const dealt=Math.min(state.hp,amount);state.hp-=dealt;if(state.hp>0&&state.hp<=ABYSS_MAX_HP/2)state.tier=2;
  if(state.hp===0){state.phase='dead';state.attack='rest';state.active=false;}
  return dealt;
 }
 // env: {level, feetY, alive} — water level, player feet height, live summoned stalkers. Returns discharge damage this tick.
 function tick(dt,env){
  if(!state.active||!Number.isFinite(dt)||dt<=0)return 0;
  const level=env.level??0,high=level>=WATER_HIGH-.01;
  state.phase=level<ABYSS_EXPOSE_LEVEL?'exposed':'shield';
  if(high&&!state.wasHigh){const want=state.tier===2?ABYSS_SUMMON+1:ABYSS_SUMMON;state.pendingSummons=Math.max(0,Math.min(want,ABYSS_SUMMON_CAP-(env.alive??0)));state.summons+=state.pendingSummons;state.attack='rest';state.attackTime=state.tier===2?1.5:3;}
  state.wasHigh=high;
  if(!high){state.attack='rest';return 0;}
  state.attackTime-=dt;
  if(state.attackTime<=0){
   if(state.attack==='rest'){state.attack='warning';state.attackTime=1.5;state.hit=false;}
   else if(state.attack==='warning'){state.attack='live';state.attackTime=.5;state.discharges++;}
   else{state.attack='rest';state.attackTime=state.tier===2?2.5:6;}
  }
  if(state.attack==='live'&&!state.hit&&env.feetY<level-.05){state.hit=true;return state.tier===2?24:20;}
  return 0;
 }
 function takeSummons(){const n=state.pendingSummons;state.pendingSummons=0;return n;}
 return {state,reset,damage,tick,takeSummons,get blocking(){return state.active&&state.hp>0;}};
}
export function abyssHint(state,phase){
 if(state.phase==='exposed')return '核心露出 · 立即攻击青色核心'+(phase==='low'?'':' · 水位正在变化');
 if(state.attack==='warning')return '放电预警 → 离开水面，站上基座或机柜';
 if(state.attack==='live')return '放电中 → 水中受击';
 return phase==='high'?'涨水：核心被冷却液包裹 · 潜行者出水 · 等待排水':'水位变化中 · 排水后核心露出';
}
