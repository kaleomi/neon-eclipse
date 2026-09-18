// Sea combat remains planar. Mouse yaw is world-space (independent of the helm);
// vertical mouse motion moves the sea-plane reticle nearer/farther, never auto-locking an enemy.
import {SEA_GUN} from './sea-combat.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createNavalAim(yaw=0){return {yaw:Number.isFinite(yaw)?yaw:0,pitch:0};}
export function turnNavalAim(aim,mx,my){
 if(!Number.isFinite(mx)||!Number.isFinite(my))return;
 aim.yaw=Math.atan2(Math.sin(aim.yaw+mx*.003),Math.cos(aim.yaw+mx*.003));
 aim.pitch=clamp(aim.pitch-my*.003,-.48,.55);
}
export function navalAimPoint(aim,ship){
 const distance=clamp(90+aim.pitch*160,12,SEA_GUN.playerRange);
 return {x:ship.x+Math.sin(aim.yaw)*distance,y:2.8,z:ship.z-Math.cos(aim.yaw)*distance};
}
export function navalCameraPose(aim,ship,mode='chase'){
 const hood=mode==='hood',back=hood?2:18;
 return {eye:{x:ship.x-Math.sin(aim.yaw)*back,y:hood?3.9:8,z:ship.z+Math.cos(aim.yaw)*back},target:navalAimPoint(aim,ship)};
}
