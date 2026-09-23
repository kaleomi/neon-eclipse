// TETHER anchor core: pure rules for chapter 07. Time only advances through tick(dt>0).
import {gravityBand,GRAVITY_BANDS} from './orbital-data.js';
export const TETHER_MAX_HP=1600;
export const TETHER_STABILIZER_HP=90;
export const TETHER_POSITION={x:0,z:0,y:11.5};
export const TETHER_STABILIZERS=[{x:0,z:-16,feetY:0,band:0},{x:-9,z:3,feetY:4,band:1},{x:9,z:-3,feetY:9,band:2}];
export const TETHER_EXPOSURE=8;
export function createTether(){
 const fresh=()=>({active:false,hp:TETHER_MAX_HP,stabilizers:TETHER_STABILIZERS.map(()=>TETHER_STABILIZER_HP),phase:'shield',tier:1,timer:0,attack:'rest',attackTime:2,bands:[],hit:false});
 const state=fresh();
 function reset(active=false){Object.assign(state,fresh(),{active});}
 function damage(part,amount){
  if(!state.active||state.hp<=0||!Number.isFinite(amount)||amount<=0)return 0;
  if(part==='core'){
   if(state.phase!=='exposed')return 0;
   const dealt=Math.min(state.hp,amount);state.hp-=dealt;if(state.hp>0&&state.hp<=TETHER_MAX_HP/2)state.tier=2;
   if(state.hp===0){state.phase='dead';state.attack='rest';state.bands=[];state.active=false;}return dealt;
  }
  if(!Number.isInteger(part)||part<0||part>=TETHER_STABILIZERS.length||state.stabilizers[part]<=0)return 0;
  const dealt=Math.min(state.stabilizers[part],amount);state.stabilizers[part]-=dealt;
  if(state.stabilizers.every(h=>h===0)){state.phase='exposed';state.timer=TETHER_EXPOSURE;state.attack='rest';state.attackTime=2;state.bands=[];}
  return dealt;
 }
 // player: {feetY, grounded}. Returns damage dealt this tick.
 function tick(dt,player){
  if(!state.active||!Number.isFinite(dt)||dt<=0)return 0;
  if(state.phase==='exposed'){
   state.timer=Math.max(0,state.timer-dt);
   if(state.timer===0){state.phase='shield';state.stabilizers=TETHER_STABILIZERS.map(()=>TETHER_STABILIZER_HP);state.attack='rest';state.attackTime=state.tier===2?1.4:2;}
   return 0;
  }
  state.attackTime-=dt;
  if(state.attackTime<=0){
   if(state.attack==='rest'){
    const band=gravityBand(player.feetY);state.bands=state.tier===2?[band,band===2?1:band+1]:[band];
    state.attack='warning';state.attackTime=1.6;state.hit=false;
   }else if(state.attack==='warning'){state.attack='live';state.attackTime=.5;}
   else{state.attack='rest';state.attackTime=state.tier===2?1.4:2;state.bands=[];}
  }
  const band=gravityBand(player.feetY);
  if(state.attack==='live'&&!state.hit&&state.bands.includes(band)&&player.grounded!==false){state.hit=true;return state.tier===2?22:18;}
  return 0;
 }
 return {state,reset,damage,tick,get blocking(){return state.active&&state.hp>0;}};
}
export const bandName=band=>GRAVITY_BANDS[band]?.name||'';
export function tetherHint(state){
 if(state.phase==='exposed')return '核心暴露 '+state.timer.toFixed(1)+'s · 立即攻击青色核心';
 const left=state.stabilizers.filter(h=>h>0).length;
 const bands=state.bands.map(b=>bandName(b).split(' / ')[0]).join('、');
 if(state.attack==='warning')return '重力脉冲预警 → '+bands+' · 起跳滞空躲避';
 if(state.attack==='live')return '脉冲释放 → '+bands+' · 保持滞空';
 return '核心护盾 · 先击破三段稳定器（剩余 '+left+'/3）'+(state.tier===2?' · 半血过载：脉冲同时打击相邻两段':'');
}
