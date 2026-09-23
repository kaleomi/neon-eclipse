import {segmentBox} from './collision.js';
export const SWARM=Object.freeze({size:6,altitude:1.9,bob:.12,radius:.55,speed:2,standOff:8,range:18,warning:1,damage:3});
export const SWARM_OFFSETS=Object.freeze(Array.from({length:6},(_,i)=>Object.freeze({x:(i%3-1)*1.25,z:(i<3?-.65:.65)})));
export function swarmClear(from,to,obstacles,r=SWARM.radius){
 if(![from.x,from.y,from.z,to.x,to.y,to.z].every(Number.isFinite)||Math.abs(to.x)>37||Math.abs(to.z)>37||to.y<r||to.y>6)return false;
 return !obstacles.some(o=>segmentBox(from,to,{x:o.x-o.w/2-r,y:(o.bottom??0)-r,z:o.z-o.d/2-r},{x:o.x+o.w/2+r,y:(o.top??o.h??Infinity)+r,z:o.z+o.d/2+r})!==null);
}
export function swarmFormation(center){return SWARM_OFFSETS.map(p=>({x:center.x+p.x,y:center.y,z:center.z+p.z}));}
export function chooseSwarmSite(stage,player,obstacles,occupants=[]){
 const sites=[];
 for(let x=-30;x<=30;x+=4)for(let z=-30;z<=30;z+=4){const c={x,y:SWARM.altitude,z};
  if(Math.hypot(x-player.x,z-player.z)<12)continue;
  if(swarmFormation(c).some(p=>occupants.some(e=>e.hp>0&&Math.hypot(p.x-e.group.position.x,p.z-e.group.position.z)<SWARM.radius+(e.radius||.65)+.2)))continue;
  if(swarmFormation(c).every(p=>swarmClear({...p,y:p.y-SWARM.bob},{...p,y:p.y+SWARM.bob},obstacles)))sites.push(c);
 }
 sites.sort((a,b)=>Math.hypot(a.x-stage.x,a.z-stage.z)-Math.hypot(b.x-stage.x,b.z-stage.z));return sites[0]||null;
}
