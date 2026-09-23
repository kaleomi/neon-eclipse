import {DATACENTER_FLOORS,DATACENTER_PLINTHS,DATACENTER_BOUNDS} from './datacenter-data.js';
import {createNavigator} from './arena.js';
// One walkable layer: stepped plinths are climbable from any side, so the flow field ignores them
// and `move` lifts enemies tier by tier (step limit .301, tiers are .25).
const surfaces=[...DATACENTER_FLOORS,...DATACENTER_PLINTHS];
export function createDatacenterNavigation(obstacles){
 const overlap=(p,o,r)=>Math.abs(p.x-o.x)<o.w/2+r-1e-5&&Math.abs(p.z-o.z)<o.d/2+r-1e-5;
 let nav=null;
 function invalidate(){nav=createNavigator(obstacles.filter(o=>!o.dynamic&&!o.plinth&&(o.top??o.h)>.35));}
 function clear(p,r){return Math.abs(p.x)<DATACENTER_BOUNDS.x-r&&Math.abs(p.z)<DATACENTER_BOUNDS.z-r&&!obstacles.some(o=>!o.plinth&&overlap(p,o,r)&&p.y<(o.top??o.h)-1e-5&&p.y+2.1>(o.bottom??0)+1e-5);}
 function move(p,dx,dz,r){
  const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.08));
  for(let i=0;i<n;i++)for(const [x,z] of [[dx/n,0],[0,dz/n]]){const q={x:p.x+x,z:p.z+z,y:p.y};const under=surfaces.filter(o=>overlap(q,o,0));q.y=Math.max(0,...under.map(o=>o.top));if(Math.abs(q.y-p.y)<=.301&&clear(q,r)){p.x=q.x;p.z=q.z;p.y=q.y;}}
 }
 function route(p,target){return {...nav.direction(p,target),onDeck:true};}
 invalidate();return {invalidate,route,move};
}
