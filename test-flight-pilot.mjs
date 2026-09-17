// Test-only controller. Production input/physics are not changed or bypassed.
import {flightGoal} from './flight-mission.js';
export const clamp=(v,a=-1,b=1)=>Math.max(a,Math.min(b,v));
export function flightPilot(p,m){
 const g=flightGoal(m),wanted=Math.atan2(g.x-p.x,-(g.z-p.z));
 const angle=Math.atan2(Math.sin(wanted-p.yaw),Math.cos(wanted-p.yaw));
 const stop=m.phase==='stop'||m.phase==='upload',landing=m.phase==='landing';
 const targetThrottle=stop?0:p.onGround?1:landing?.12:.24;
 const targetPitch=landing?-.12:clamp((g.y-p.y)*.015,-.16,.18);
 return {throttle:clamp((targetThrottle-p.throttle)*4),elevator:stop?0:p.onGround?.5:clamp((targetPitch-p.pitch)*4+.64*p.pitch),roll:stop?0:clamp(angle*2),brake:stop};
}
export function flightPilotKeys(p,m,inverted=false){
 const input=flightPilot(p,m),keys=[];
 if(input.throttle>.055)keys.push('Shift');if(input.throttle<-.055)keys.push('Control');
 if(input.elevator>.08)keys.push(inverted?'KeyW':'KeyS');if(input.elevator<-.08)keys.push(inverted?'KeyS':'KeyW');
 if(input.roll>.09)keys.push('ArrowRight');if(input.roll<-.09)keys.push('ArrowLeft');
 if(input.brake)keys.push('Space');return keys;
}
