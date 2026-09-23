const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export function reloadPose(progress,perShell=false){
 const p=clamp(progress);
 if(p<=0||p>=1)return {mag:0,hand:0,bolt:0,tilt:0};
 const reach=smooth(p/.25),returning=1-smooth((p-.72)/.28);
 return {mag:perShell?0:reach*(1-smooth((p-.48)/.24)),hand:reach*returning,bolt:perShell?0:Math.sin(clamp((p-.76)/.22)*Math.PI),tilt:Math.sin(p*Math.PI)};
}
export function sprintPose(time,blend,grounded=true){
 const b=clamp(blend),step=grounded?Math.sin(time*12):0,bounce=grounded?Math.cos(time*24):0;
 return {x:-.16*b+step*.018*b,y:.07*b+bounce*.018*b,z:.12*b,pitch:-.22*b+step*.025*b,yaw:.55*b,roll:-.4*b+step*.025*b};
}
export const MELEE_CONTACT=.19;
export function crossedMeleeContact(before,after){return before>.42-MELEE_CONTACT&&after<=.42-MELEE_CONTACT;}
