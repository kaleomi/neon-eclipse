export const SENTRY=Object.freeze({range:22,minRange:1.6,halfAngle:.32,sweep:.9,period:12,warning:1.2,bursts:3,burstDelay:.18,speed:16,damage:7,cooldown:4.8,coreMultiplier:2,frontMultiplier:.35,muzzle:1.2});
export function sentryScanYaw(home,time){return home+Math.sin(time*Math.PI*2/SENTRY.period)*SENTRY.sweep;}
export function inSentrySector(origin,yaw,target){
 const dx=target.x-origin.x,dz=target.z-origin.z,distance=Math.hypot(dx,dz),angle=Math.atan2(dx,dz)-yaw;
 return Number.isFinite(distance)&&distance>=SENTRY.minRange&&Math.hypot(dx,(target.y??origin.y)-(origin.y??0),dz)<=SENTRY.range&&Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<=SENTRY.halfAngle+1e-8;
}
export function chooseSentrySite(stage,player,obstacles,enemies=[],supplies=[]){
 const candidates=[];
 for(let x=-34;x<=34;x+=2)for(let z=-34;z<=34;z+=2){
  const distance=Math.hypot(x-stage.x,z-stage.z);if(distance<6||distance>12||Math.hypot(x-player.x,z-player.z)<12)continue;
  if(obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.95&&Math.abs(z-o.z)<o.d/2+.95&&(o.bottom??0)<2&&(o.top??o.h??Infinity)>0))continue;
  if(enemies.some(e=>e.hp>0&&Math.hypot(x-e.group.position.x,z-e.group.position.z)<(e.radius||.65)+1.3))continue;
  if(supplies.some(p=>Math.hypot(x-p.x,z-p.z)<2))continue;
  candidates.push({x,y:0,z,score:Math.abs(distance-8)});
 }
 candidates.sort((a,b)=>a.score-b.score);return candidates.length?{x:candidates[0].x,y:0,z:candidates[0].z}:null;
}
