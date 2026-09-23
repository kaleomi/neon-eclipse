import {SERVICE_STAIRS,SERVICE_DECKS} from './transport-rules.js';
const surfaces=[...SERVICE_STAIRS,SERVICE_DECKS[0]];
const bottom={x:18.5,z:5},landing={x:27,z:5};
export function createRoofEnemyNavigation(obstacles,navigation){
 const overlap=(p,o,r)=>Math.abs(p.x-o.x)<o.w/2+r-1e-5&&Math.abs(p.z-o.z)<o.d/2+r-1e-5;
 function floor(p,r){return surfaces.reduce((h,o)=>overlap(p,o,r)?Math.max(h,o.top):h,0);}
 function clear(p,r,height){return Math.abs(p.x)<37.1-r&&Math.abs(p.z)<37.1-r&&!obstacles.some(o=>overlap(p,o,r)&&p.y<(o.top??o.h)-1e-5&&p.y+height>(o.bottom??0)+1e-5);}
 function move(p,dx,dz,r,height=2.1){
  const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.08));
  for(let i=0;i<n;i++)for(const [x,z] of [[dx/n,0],[0,dz/n]]){
   const q={x:p.x+x,z:p.z+z,y:p.y};const y=floor(q,r);
   if(Math.abs(y-p.y)>.301)continue;
   q.y=y;if(clear(q,r,height)){p.x=q.x;p.z=q.z;p.y=q.y;}
  }
 }
 function route(p,target,r=.85){
  const high=target.y-1.7>.5&&target.x>=19&&target.x<=37&&target.z>=0&&target.z<=18;
  const elevated=p.y>.01;
  if(!high&&!elevated)return null;
  let goal;
  if(elevated){
   if(high){goal=p.y<2.99?landing:{x:Math.max(26+r,Math.min(34-r,target.x)),z:Math.max(1+r,Math.min(9-r,target.z))};}
   else goal=p.y>=2.99&&(p.x>27.1||Math.abs(p.z-5)>.15)?landing:bottom;
  }else{
   if(p.x>=18.3&&p.x<=20&&Math.abs(p.z-5)<.15)goal=landing;
   else if(Math.hypot(p.x-bottom.x,p.z-bottom.z)<2)goal=bottom;
   else return navigation.direction(p,bottom);
  }
  return {x:goal.x-p.x,z:goal.z-p.z,onDeck:high&&p.y>=2.99};
 }
 return {route,move,floor};
}
export function sameEnemyLayer(a,b){return Math.abs(a.y-b.y)<.6;}
export function enemyMuzzleHeight(enemy){return enemy.group.position.y+(enemy.boss?2.6:enemy.type==='heavy'?1.65:1.6);}
