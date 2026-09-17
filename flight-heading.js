// Absolute look heading: the mouse picks a bearing; aircraft yaw consumes the error.
export const wrapHeading=value=>Math.atan2(Math.sin(value),Math.cos(value));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function moveFlightHeading(target,yaw,delta){
 if(!Number.isFinite(yaw))return 0;
 if(!Number.isFinite(target))target=yaw;
 if(!Number.isFinite(delta))return target;
 return wrapHeading(yaw+clamp(wrapHeading(target-yaw)+delta,-1.35,1.35));
}
export function flightHeadingControls(plane,target){
 if(!Number.isFinite(target)||!Number.isFinite(plane.yaw))return {roll:0,rudder:0};
 const error=wrapHeading(target-plane.yaw);
 if(plane.onGround)return {roll:clamp(error*2.5,-1,1),rudder:0};
 // Counter the current bank's turn rate near the target instead of oscillating past it.
 const desiredRate=Math.abs(error)<.0015?0:clamp(error*1.35,-.48,.48);
 const bankRate=Math.tan(plane.roll)*9.81/Math.max(plane.speed,12);
 return {roll:clamp(error*1.15,-.65,.65)/.82,rudder:clamp((desiredRate-bankRate)/.2,-1,1)};
}
