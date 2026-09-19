import * as T from './node_modules/three/build/three.module.js';
// Substepped sphere-radius ray sweep; impact reflects velocity, never detonates early.
export function launchCinder(position,direction,{speed=14,fuse=1.2}={}){return {position:position.clone(),velocity:direction.clone().normalize().multiplyScalar(speed).add(new T.Vector3(0,3,0)),remaining:fuse,bounces:0};}
export function advanceCinder(s,dt,obstacles){
 if(!Number.isFinite(dt)||dt<=0||s.remaining<=0)return;
 const meshes=obstacles.map(o=>o.mesh||o).filter(Boolean);meshes.forEach(m=>m.updateWorldMatrix(true,false));
 let time=Math.min(dt,s.remaining);const cast=new T.Raycaster(),radius=.08;
 while(time>1e-9){const h=Math.min(time,1/180);time-=h;s.remaining=Math.max(0,s.remaining-h);
  const delta=s.velocity.clone().multiplyScalar(h);delta.y-=6*h*h;s.velocity.y-=12*h;const length=delta.length();if(length<1e-9)continue;
  cast.set(s.position,delta.clone().normalize());cast.far=length+radius;const hit=cast.intersectObjects(meshes,false)[0];let distance=hit?Math.max(0,hit.distance-radius):Infinity,normal=hit?.face?.normal.clone().transformDirection(hit.object.matrixWorld);
  if(delta.y<0&&s.position.y+delta.y<=radius){const ground=Math.max(0,(s.position.y-radius)/-delta.y*length);if(ground<distance){distance=ground;normal=new T.Vector3(0,1,0);}}
  if(distance<=length&&normal){if(normal.dot(delta)>0)normal.negate();s.position.addScaledVector(delta,distance/length).addScaledVector(normal,.002);s.velocity.reflect(normal).multiplyScalar(.58);s.bounces++;}else s.position.add(delta);
 }
 if(s.remaining<1e-7)s.remaining=0;
}
