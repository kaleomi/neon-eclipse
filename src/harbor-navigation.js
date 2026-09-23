import {createNavigator} from './arena.js';
import {HARBOR_DECKS,HARBOR_STAIRS,HARBOR_LINKS,harborWater} from './harbor-data.js';
const surfaces=[{x:0,z:0,w:76,d:76,top:0},...HARBOR_DECKS,...HARBOR_STAIRS],island=p=>p.x>16?1:0;
export function createHarborNavigation(obstacles){
 const escapes=new WeakMap();let navs=[];function invalidate(){navs=[0,3].map(y=>createNavigator(obstacles.filter(o=>y<(o.top??o.h)-1e-5&&y+2.4>(o.bottom??0)+1e-5)));}
 const overlap=(p,o,r)=>Math.abs(p.x-o.x)<o.w/2+r-1e-5&&Math.abs(p.z-o.z)<o.d/2+r-1e-5;
 function move(p,dx,dz,r){const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.07));for(let i=0;i<n;i++)for(const [x,z] of [[dx/n,0],[0,dz/n]]){const q={x:p.x+x,z:p.z+z,y:p.y};q.y=Math.max(0,...surfaces.filter(o=>o.top<=p.y+.301&&overlap(q,o,r)).map(o=>o.top));if(Math.abs(q.y-p.y)>.301||Math.abs(q.x)>37-r||Math.abs(q.z)>37-r||q.y===0&&harborWater(q))continue;if(!obstacles.some(o=>overlap(q,o,r)&&q.y<(o.top??o.h)-1e-5&&q.y+2.1>(o.bottom??0)+1e-5)){p.x=q.x;p.z=q.z;p.y=q.y;}}}
 function route(p,target){const targetHigh=target.y-1.7>1.5,targetIsland=island(target),fromHigh=p.y>=2.9,fromIsland=island(p);const pending=escapes.get(p);if(pending){while(pending.length&&Math.hypot(p.x-pending[0].x,p.z-pending[0].z)<.1)pending.shift();if(pending.length)return {x:pending[0].x-p.x,z:pending[0].z-p.z};escapes.delete(p);}
  for(const [i,l] of HARBOR_LINKS.entries()){
   // Commit from the full widened bottom landing: squad separation must not send
   // a guard back to the approach waypoint just before the first step.
   if(targetHigh&&targetIsland===i&&p.y===0&&p.x>=l.base.x-.5&&p.x<l.start+1&&Math.abs(p.z-l.base.z)<1.6)return {x:l.end.x-p.x,z:l.end.z-p.z};
   if(targetHigh&&targetIsland===i&&p.y===3&&Math.abs(p.z-l.base.z)<2.4&&p.x>=l.start&&p.x<l.end.x-.3)return {x:l.end.x-p.x,z:l.end.z-p.z};
   if(p.y<=.25&&p.x>l.base.x-.5&&p.x<l.start+1&&Math.abs(p.z-l.base.z)<2.1&&(!targetHigh||targetIsland!==i)){const goals=[{x:l.base.x,z:l.base.z+3},{x:i===0?l.end.x+2:l.base.x-4,z:l.base.z+3}];escapes.set(p,goals);return {x:goals[0].x-p.x,z:goals[0].z-p.z};}
   if(p.y>0&&p.y<3&&Math.abs(p.z-l.base.z)<2.4&&p.x>l.start-1&&p.x<l.start+7){const g=targetHigh&&targetIsland===i?l.end:l.base;return {x:g.x-p.x,z:g.z-p.z};}
  }
  if(targetHigh!==fromHigh||fromHigh&&targetIsland!==fromIsland){const up=!fromHigh,l=HARBOR_LINKS[up?targetIsland:fromIsland],entry=up?l.base:l.end,exit=up?l.end:l.base;
   if(fromHigh&&p.x<=entry.x+.25&&p.x>=entry.x-4&&Math.abs(p.z-entry.z)<3)return Math.abs(p.z-entry.z)>.1?{x:0,z:entry.z-p.z}:{x:exit.x-p.x,z:exit.z-p.z};
   if(Math.hypot(p.x-entry.x,p.z-entry.z)<1.1||Math.abs(p.z-entry.z)<.15&&(up?p.x>=entry.x-.1&&p.x<=entry.x+3:p.x<=entry.x+.1&&p.x>=entry.x-4))return {x:exit.x-p.x,z:exit.z-p.z};
   return navs[Number(fromHigh)].direction(p,entry);
  }
  return {...navs[Number(fromHigh)].direction(p,target),onDeck:true};
 }
 invalidate();return {invalidate,route,move};
}
