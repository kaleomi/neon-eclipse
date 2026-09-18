// Weapon handling and damage rules are pure and covered by test-combat.mjs.
export {WEAPONS} from './weapons/registry.js';
export function damageAtDistance(weapon,distance,head=false){
 if(distance>weapon.range)return 0;
 const fraction=Math.max(0,Math.min(1,(distance-weapon.falloffStart)/Math.max(.001,weapon.range-weapon.falloffStart)));
 return weapon.damage*(1-fraction*(1-weapon.minimumDamage))*(head?weapon.headMultiplier:1);
}
export function shotSpread(weapon,ads,heat,moving){
 return weapon.spread*(1-.65*ads)*(1+heat*.7+(moving?(weapon.movementPenalty??.55):0));
}
export function createHandling(){
 const state={ads:0,heat:0,pitch:0,yaw:0,switchRemaining:0};
 function update(dt,aiming){
  const blend=1-Math.exp(-dt*13);state.ads+=(Number(aiming)-state.ads)*blend;
  state.heat=Math.max(0,state.heat-dt*1.5);state.pitch*=Math.exp(-dt*8);state.yaw*=Math.exp(-dt*11);
  state.switchRemaining=Math.max(0,state.switchRemaining-dt);
 }
 // `scale` multiplies the kick (chapter 07 low-gravity bands); default 1 keeps every other map identical.
 function shot(weapon,random=.5,scale=1){
  const multiplier=(1-state.ads*.4)*(Number.isFinite(scale)&&scale>0?scale:1);
  state.pitch=Math.min(.12,state.pitch+weapon.kick*multiplier);
  state.yaw=Math.max(-.035,Math.min(.035,state.yaw+(random-.5)*weapon.kick*.45));
  state.heat=Math.min(1.5,state.heat+.28);
 }
 function reset(){Object.assign(state,{ads:0,heat:0,pitch:0,yaw:0,switchRemaining:0});}
 function switchWeapon(){state.heat=0;state.pitch=0;state.yaw=0;state.switchRemaining=.22;}
 return {state,update,shot,reset,switchWeapon};
}
// Per-shell reload preserves completed shells when firing or switching interrupts it.
export function advanceReload(dt,remaining,rounds,reserve,weapon){
 if(remaining<=0)return {remaining:0,rounds,reserve,inserted:0};
 remaining-=dt;let inserted=0;
 while(remaining<=1e-8){
  const n=Math.min(weapon.perShell?1:weapon.cap-rounds,reserve,weapon.cap-rounds);
  rounds+=n;reserve-=n;inserted+=n;
  if(!weapon.perShell||rounds>=weapon.cap||reserve<=0||n<=0){remaining=0;break;}
  remaining+=weapon.reload;
 }
 return {remaining,rounds,reserve,inserted};
}
export function meleePose(remaining){
 const p=1-Math.max(0,Math.min(1,remaining/.42));
 if(remaining<=0)return {x:0,y:0,z:0,roll:.25,pitch:0,progress:0};
 const wind=Math.min(1,p/.28),strike=Math.max(0,Math.min(1,(p-.28)/.22)),recover=Math.max(0,Math.min(1,(p-.58)/.42));
 const hold=1-recover;
 return {x:(.14*wind-.6*strike)*hold,y:(.08*wind+.1*strike)*hold,z:(.08*wind-.25*strike)*hold,roll:.25+(-.55*wind+2*strike)*hold,pitch:(.15*wind-.5*strike)*hold,progress:p};
}
