import {createNavigator} from './arena.js';
import {TRAIN_FLOORS,TRAIN_STAIRS,TRAIN_BRIDGES,TRAIN_STAIR_LINKS} from './train-data.js';
const surfaces=[...TRAIN_FLOORS,...TRAIN_STAIRS,...TRAIN_BRIDGES],upper=y=>y>=4.2;
export function createTrainNavigation(obstacles){
 const overlap=(p,o,r)=>Math.abs(p.x-o.x)<o.w/2+r-1e-5&&Math.abs(p.z-o.z)<o.d/2+r-1e-5;
 let navs=[];function invalidate(){navs=[1.5,4.5].map(y=>createNavigator(obstacles.filter(o=>y<(o.top??o.h)-1e-5&&y+2.1>(o.bottom??0)+1e-5)));}
 function move(p,dx,dz,r){const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.07));for(let i=0;i<n;i++)for(const [x,z] of [[dx/n,0],[0,dz/n]]){const q={x:p.x+x,z:p.z+z,y:p.y},choices=surfaces.filter(o=>o.top<=p.y+.301&&overlap(q,o,r));if(!choices.length)continue;q.y=Math.max(...choices.map(o=>o.top));if(Math.abs(q.y-p.y)>.301||obstacles.some(o=>overlap(q,o,r)&&q.y<(o.top??o.h)-1e-5&&q.y+2.1>(o.bottom??0)+1e-5))continue;p.x=q.x;p.z=q.z;p.y=q.y;}}
 function route(p,target){const to=upper(target.y-1.7),from=upper(p.y),nav=navs[Number(from)];let goal={x:target.x,z:target.z};
  const bottomExit=!to&&p.y<=1.75&&p.x<-1.4&&TRAIN_STAIR_LINKS.find(l=>p.z>l.base.z-1.4&&p.z<l.base.z+.3);if(bottomExit)return {x:-p.x,z:bottomExit.base.z-p.z};
  const onStair=TRAIN_STAIR_LINKS.find(l=>Math.abs(p.x-l.base.x)<1.1&&p.z>l.end.z+.2&&p.z<l.base.z+.2&&p.y>1.5&&p.y<4.5);
  if(onStair){goal=to?onStair.end:onStair.base;return {x:goal.x-p.x,z:goal.z-p.z};}
  if(to!==from){const link=TRAIN_STAIR_LINKS.slice().sort((a,b)=>(Math.abs(p.z-(from?a.end.z:a.base.z))+Math.abs(target.z-(from?a.base.z:a.end.z)))-(Math.abs(p.z-(from?b.end.z:b.base.z))+Math.abs(target.z-(from?b.base.z:b.end.z))))[0],entry=from?link.end:link.base,exit=from?link.base:link.end;
   if(!from&&Math.abs(p.x-entry.x)<.2&&p.z<=entry.z+.1&&p.z>=entry.z-1.5)return {x:exit.x-p.x,z:exit.z-p.z};
   if(from&&Math.abs(p.x-entry.x)<.15&&p.z>=entry.z&&p.z<=entry.z+4)return {x:exit.x-p.x,z:exit.z-p.z};
   if(Math.abs(p.z-(link.base.z-4.5))<6.4){if(Math.abs(p.z-entry.z)>.07)return {x:-p.x,z:entry.z-p.z};if(Math.abs(p.x-entry.x)>.12)return {x:entry.x-p.x,z:entry.z-p.z};return {x:exit.x-p.x,z:exit.z-p.z};}goal=entry;
  }
  const lane=from?3.6:0;
  for(const z of [21,7,-7,-21]){const dir=Math.sign(goal.z-z);if(!dir)continue;if(Math.abs(p.z-z)<2.35&&Math.abs(p.x-lane)<1.4){return {x:lane-p.x,z:z+dir*2.6-p.z};}}
  const crossings=[21,7,-7,-21].filter(z=>(p.z-z)*(goal.z-z)<0).sort((a,b)=>Math.abs(a-p.z)-Math.abs(b-p.z));
  if(crossings.length){const z=crossings[0];goal={x:lane,z:z+Math.sign(p.z-z)*2.2};}
  return {...nav.direction(p,goal),onDeck:to===from};
 }
 invalidate();return {invalidate,route,move};
}
