import {TOWER_FLOORS,TOWER_STAIRS} from './tower-data.js';
import {createNavigator} from './arena.js';
const surfaces=[...TOWER_FLOORS,...TOWER_STAIRS];
const layer=y=>y>=4.5?2:y>=1.5?1:0;
const links=[{base:{x:-20.6,z:0},end:{x:-10,z:0}},{base:{x:-8,z:0},end:{x:2,z:0}}];
export function createTowerNavigation(obstacles){
 const overlap=(p,o,r)=>Math.abs(p.x-o.x)<o.w/2+r-1e-5&&Math.abs(p.z-o.z)<o.d/2+r-1e-5;
 let navs=[];
 function invalidate(){navs=[0,3,6].map(y=>createNavigator(obstacles.filter(o=>!o.dynamic&&y<(o.top??o.h)-1e-5&&y+2.4>(o.bottom??0)+1e-5)));}
 function clear(p,r){return Math.abs(p.x)<29-r&&Math.abs(p.z)<23-r&&!obstacles.some(o=>overlap(p,o,r)&&p.y<(o.top??o.h)-1e-5&&p.y+2.1>(o.bottom??0)+1e-5);}
 function move(p,dx,dz,r){
  const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.08));
  for(let i=0;i<n;i++)for(const [x,z] of [[dx/n,0],[0,dz/n]]){const q={x:p.x+x,z:p.z+z,y:p.y};const choices=surfaces.filter(o=>o.top<=p.y+.301&&overlap(q,o,r));q.y=Math.max(0,...choices.map(o=>o.top));if(Math.abs(q.y-p.y)<=.301&&clear(q,r)){p.x=q.x;p.z=q.z;p.y=q.y;}}
 }
 function route(p,target){
  const to=layer(target.y-1.7),from=layer(p.y);let goal;
  if(p.y>0&&p.y<=3&&p.x<-10.8&&Math.abs(p.z)<2.5)goal=to===0?links[0].base:links[0].end;
  else if(p.y>3&&p.y<=6&&p.x<1.2&&Math.abs(p.z)<2.5)goal=to<2?links[1].base:links[1].end;
  else if(to!==from){
   const up=to>from,link=links[up?from:from-1],entry=up?link.base:link.end,exit=up?link.end:link.base;
   if(Math.hypot(p.x-entry.x,p.z-entry.z)<1.1||(up&&Math.abs(p.z)<.15&&p.x>=entry.x-.1&&p.x<=(from===0?-18:-6)))goal=exit;
   else return navs[from].direction(p,entry);
  }else return {...navs[from].direction(p,target),onDeck:true};
  return {x:goal.x-p.x,z:goal.z-p.z};
 }
 invalidate();return {invalidate,route,move};
}
