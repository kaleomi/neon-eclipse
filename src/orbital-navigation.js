import {ORBITAL_FLOORS,ORBITAL_RINGS,ORBITAL_LANDING,ORBITAL_STAIRS,ORBITAL_BOUNDS} from './orbital-data.js';
import {createNavigator} from './arena.js';
// Three walkable layers (0 / 4 / 9 m) linked by two stair flights. Same shape as tower-navigation.
const surfaces=[...ORBITAL_FLOORS,...ORBITAL_RINGS,ORBITAL_LANDING,...ORBITAL_STAIRS];
const LAYERS=[0,4,9];
const layer=y=>y>=6.5?2:y>=2?1:0;
// links[i] climbs from layer i to layer i+1: base is the foot of the flight, end the landing.
const links=[{base:{x:-22,z:0},end:{x:-11.5,z:0}},{base:{x:16.2,z:9},end:{x:3.5,z:9}}];
export function createOrbitalNavigation(obstacles){
 const overlap=(p,o,r)=>Math.abs(p.x-o.x)<o.w/2+r-1e-5&&Math.abs(p.z-o.z)<o.d/2+r-1e-5;
 let navs=[];
 function invalidate(){navs=LAYERS.map(y=>createNavigator(obstacles.filter(o=>!o.dynamic&&y<(o.top??o.h)-1e-5&&y+2.4>(o.bottom??0)+1e-5)));}
 function clear(p,r){return Math.abs(p.x)<ORBITAL_BOUNDS.x-r&&Math.abs(p.z)<ORBITAL_BOUNDS.z-r&&!obstacles.some(o=>overlap(p,o,r)&&p.y<(o.top??o.h)-1e-5&&p.y+2.1>(o.bottom??0)+1e-5);}
 function move(p,dx,dz,r){
  const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.08));
  for(let i=0;i<n;i++)for(const [x,z] of [[dx/n,0],[0,dz/n]]){const q={x:p.x+x,z:p.z+z,y:p.y};const choices=surfaces.filter(o=>o.top<=p.y+.301&&overlap(q,o,r));q.y=Math.max(0,...choices.map(o=>o.top));if(Math.abs(q.y-p.y)<=.301&&clear(q,r)){p.x=q.x;p.z=q.z;p.y=q.y;}}
 }
 function route(p,target){
  const to=layer(target.y-1.7),from=layer(p.y);let goal;
  if(p.y>0&&p.y<=4&&p.x<-12.5&&Math.abs(p.z)<2.5)goal=to===0?links[0].base:links[0].end;
  else if(p.y>4&&p.y<=9&&p.x>4.5&&p.x<15.5&&Math.abs(p.z-9)<2.5)goal=to<2?links[1].base:links[1].end;
  else if(to!==from){
   const up=to>from,link=links[up?from:from-1],entry=up?link.base:link.end,exit=up?link.end:link.base;
   if(Math.hypot(p.x-entry.x,p.z-entry.z)<1.2)goal=exit;
   else return navs[from].direction(p,entry);
  }else return {...navs[from].direction(p,target),onDeck:true};
  return {x:goal.x-p.x,z:goal.z-p.z};
 }
 invalidate();return {invalidate,route,move};
}
