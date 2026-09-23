import {segmentBox} from './collision.js';
export const BARREL=Object.freeze({hp:40,radius:5,damage:90,playerDamage:70});
export function blastDamage(from,to,maximum=BARREL.damage){
 if(!from||!to||![from.x,from.y,from.z,to.x,to.y,to.z,maximum].every(Number.isFinite)||maximum<=0)return 0;
 return maximum*Math.max(0,1-Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z)/BARREL.radius);
}
// One frozen obstacle snapshot per explosion; a surface destroyed by this blast
// still shields targets for this blast. Unlike rail, blast never penetrates foil.
export function blastVisible(from,to,obstacles,ignore=null){
 return !obstacles.some(o=>o.mesh!==ignore&&segmentBox(from,to,{x:o.x-o.w/2,y:o.bottom??0,z:o.z-o.d/2},{x:o.x+o.w/2,y:o.top??o.h,z:o.z+o.d/2})!==null);
}
