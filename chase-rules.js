import {createSeaCombat,stepSeaCombat,clearSeaCombat} from './sea-combat.js';
import {createYacht,stepYacht,waterFree,yachtFree,ISLANDS,clamp,routeStep} from './maritime-rules.js';
import {forward} from './vehicle-rules.js';
export const CHASE=Object.freeze({timeLimit:180,enemySpeed:27,loseDistance:125,loseSeconds:4,reacquireDistance:85,evacRadius:24,evacSpeed:12,headStart:3});
export const CHASE_GATES=Object.freeze([{x:320,z:-65,name:'北上水道'},{x:525,z:-370,name:'绕过北岛'},{x:545,z:70,name:'外海折返'}].map(Object.freeze));
export const CHASE_EVAC=Object.freeze({x:315,z:420,name:'南湾撤离区'});
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function clearWaterLine(a,b,radius=10){
 const n=Math.max(1,Math.ceil(distance(a,b)/4));
 for(let i=0;i<=n;i++)if(!waterFree(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,radius))return false;
 return true;
}
// Small static visibility graph, shared by the single pursuit AI; no streamed map or teleport recovery.
const nodes=[{x:285,z:145},{x:285,z:215},{x:245,z:-550},{x:575,z:-550},{x:575,z:550},{x:245,z:550},...ISLANDS.flatMap(island=>Array.from({length:12},(_,i)=>({x:island.x+Math.sin(i*Math.PI/6)*(island.r+24),z:island.z+Math.cos(i*Math.PI/6)*(island.r+24)})))].filter(p=>waterFree(p.x,p.z,10));
let graph;
function staticGraph(){return graph??=nodes.map((a,i)=>nodes.flatMap((b,j)=>j!==i&&clearWaterLine(a,b)?[{index:j,cost:distance(a,b)}]:[]));}
function departureLine(a,b){
 const length=distance(a,b),n=Math.max(1,Math.ceil(length/3));
 for(let i=0;i<=n;i++){const t=i/n,r=Math.min(10,2.7+length*t*.7);if(!waterFree(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,r))return false;}
 return true;
}
export function seaPath(start,goal){
 let target={x:clamp(goal.x,235,585),z:clamp(goal.z,-585,585)};
 if(!waterFree(target.x,target.z,10))target=nodes.reduce((a,b)=>distance(b,goal)<distance(a,goal)?b:a);
 if(departureLine(start,target))return [{...target}];
 const all=[...nodes,start,target],n=all.length,edges=staticGraph().map(list=>list.map(e=>({...e})));edges.push([],[]);
 for(const i of [n-2,n-1])for(let j=0;j<i;j++)if((i===n-2?departureLine(all[i],all[j]):j===n-2?departureLine(all[j],all[i]):clearWaterLine(all[i],all[j]))){const cost=distance(all[i],all[j]);edges[i].push({index:j,cost});edges[j].push({index:i,cost});}
 const costs=Array(n).fill(Infinity),prev=Array(n).fill(-1),visited=new Set();costs[n-2]=0;
 for(let k=0;k<n;k++){
  let best=-1;for(let i=0;i<n;i++)if(!visited.has(i)&&(best<0||costs[i]<costs[best]))best=i;
  if(best<0||!Number.isFinite(costs[best])||best===n-1)break;visited.add(best);
  for(const e of edges[best])if(costs[best]+e.cost<costs[e.index]){costs[e.index]=costs[best]+e.cost;prev[e.index]=best;}
 }
 if(!Number.isFinite(costs[n-1]))return [];
 const path=[];for(let i=n-1;i!==n-2&&i>=0;i=prev[i])path.unshift({...all[i]});return path;
}
export function createSeaChase(player=null,{combat=false}={}){
 return {combat:createSeaCombat(combat),status:player?'active':'idle',elapsed:0,remaining:CHASE.timeLimit,hull:100,index:0,started:true,complete:false,escapeTime:0,escaped:false,reason:'',distance:0,contactCooldown:0,lastImpacts:player?.impacts||0,contacts:0,enemy:{...createYacht(),x:320,z:240,yaw:-.55},ai:{repath:0,path:[],lastKnown:player?{x:player.x,z:player.z}:{x:315,z:180},searchTime:0,stuck:0,reverse:0,mode:'pursuit'}};
}
export function pursuitInput(enemy,target,path,maxSpeed=CHASE.enemySpeed){
 const dx=target.x-enemy.x,dz=target.z-enemy.z,error=wrap(Math.atan2(dx,-dz)-enemy.yaw),near=distance(enemy,target);
 let desired=Math.abs(error)>.8?9:Math.abs(error)>.4?16:maxSpeed;
 if(path.length>1&&near<40){const next=path[1],turn=wrap(Math.atan2(next.x-target.x,-(next.z-target.z))-Math.atan2(dx,-dz));if(Math.abs(turn)>.35)desired=Math.min(desired,13);}
 if(path.length<=1&&near<15)desired=Math.min(desired,7);
 return {throttle:enemy.speed<desired-.4?1:.45,steer:clamp(error*1.8,-1,1),brake:enemy.speed>desired+1};
}
export function stepPursuer(task,player,dt){
 if(task.combat?.enemySunk){task.enemy.speed=0;return;}
 const enemy=task.enemy,ai=task.ai,f=forward(player.yaw),visible=clearWaterLine(enemy,player,1);
 task.distance=distance(enemy,player);
 if(!task.escaped&&visible&&task.distance<180){const lead=clamp(task.distance/Math.max(12,enemy.speed),0,ai.role==='interceptor'?6:3);ai.lastKnown={x:player.x+f.x*player.speed*lead,z:player.z+f.z*player.speed*lead};ai.searchTime=0;}
 else ai.searchTime+=dt;
 ai.mode=task.escaped?'search':'pursuit';
 if(task.elapsed<(ai.headStart??CHASE.headStart))return;
 ai.repath-=dt;
 if(ai.repath<=0){
  ai.repath=.75;
  let goal=task.escaped&&ai.searchTime>7?{x:ai.lastKnown.x+Math.sin(ai.searchTime*.17)*35,z:ai.lastKnown.z+Math.cos(ai.searchTime*.17)*35}:ai.lastKnown;
  if(task.combat.enabled&&!task.escaped&&visible&&task.distance<85){const range=Math.max(1,task.distance),dx=(enemy.x-player.x)/range,dz=(enemy.z-player.z)/range;goal={x:player.x+dx*65+dz*(ai.role==='interceptor'?-25:ai.role==='pursuer'?15:10),z:player.z+dz*65-dx*(ai.role==='interceptor'?-25:ai.role==='pursuer'?15:10)};ai.mode='standoff';}
  ai.path=seaPath(enemy,goal);
 }
 while(ai.path.length>1&&distance(enemy,ai.path[0])<13)ai.path.shift();
 const target=ai.path[0];let input=target?pursuitInput(enemy,target,ai.path,task.escaped?14:task.combat.enabled&&task.distance<85?18:(ai.maxSpeed??CHASE.enemySpeed)):{brake:true};
 if(ai.reverse>0){ai.reverse-=dt;input={throttle:-1,steer:.7};}
 const oldDistance=enemy.distance;stepYacht(enemy,input,dt);
 if(!target||input.throttle>0&&enemy.distance-oldDistance<dt*.3)ai.stuck+=dt;else ai.stuck=0;
 if(ai.stuck>1.5){ai.stuck=0;ai.reverse=1.4;ai.repath=0;}
}
export function boatsTouch(a,b){
 const fa=forward(a.yaw),fb=forward(b.yaw);
 return [-4,0,4].some(da=>[-4,0,4].some(db=>Math.hypot(a.x+fa.x*da-b.x-fb.x*db,a.z+fa.z*da-b.z-fb.z*db)<5.8));
}
export function stepSeaChase(task,player,from,dt,{paused=false,aboard=true,fire=false}={}){
 if(paused||task.status!=='active'||!Number.isFinite(dt)||dt<=0)return;
 const h=Math.min(dt,.25);task.elapsed+=h;task.remaining=Math.max(0,CHASE.timeLimit-task.elapsed);task.contactCooldown=Math.max(0,task.contactCooldown-h);
 if(!aboard){task.status='lost';task.reason='已离开任务游艇';clearSeaCombat(task.combat);return;}
 const enemyBefore={...task.enemy};stepPursuer(task,player,h);
 if(player.impacts>task.lastImpacts){task.hull=Math.max(0,task.hull-clamp(8+Math.abs(from.speed)*.8,10,34));task.lastImpacts=player.impacts;}
 if(!task.combat.enemySunk&&boatsTouch(player,task.enemy)){
  const impactSpeed=Math.abs(from.speed)+Math.abs(enemyBefore.speed);
  if(!task.contactCooldown){task.contacts++;task.hull=Math.max(0,task.hull-clamp(12+impactSpeed*.45,12,34));task.contactCooldown=1.5;}
  Object.assign(player,{x:from.x,z:from.z,yaw:from.yaw,distance:from.distance,speed:0});Object.assign(task.enemy,{x:enemyBefore.x,z:enemyBefore.z,yaw:enemyBefore.yaw,distance:enemyBefore.distance,speed:0});task.ai.reverse=1.3;task.ai.repath=0;
 }
 stepSeaCombat(task,player,from,enemyBefore,h,{fire});
 if(task.combat.provoked&&!task.combat.enemySunk){task.escaped=false;task.escapeTime=0;task.ai.lastKnown={x:player.x,z:player.z};task.ai.repath=0;}
 task.distance=distance(player,task.enemy);
 if(task.hull<=0){task.status='lost';task.reason='船体受损，无法继续航行';clearSeaCombat(task.combat);return;}
 if(task.remaining<=0){task.status='lost';task.reason='撤离窗口已关闭';clearSeaCombat(task.combat);return;}
 const visible=clearWaterLine(task.enemy,player,1);
 if(task.combat.enemySunk){task.escaped=true;task.escapeTime=CHASE.loseSeconds;task.ai.mode='disabled';}
 else if(task.escaped){if(task.distance<CHASE.reacquireDistance&&visible){task.escaped=false;task.escapeTime=0;task.ai.repath=0;}}
 else{task.escapeTime=task.distance>CHASE.loseDistance||!visible?Math.min(CHASE.loseSeconds,task.escapeTime+h):0;if(task.escapeTime>=CHASE.loseSeconds)task.escaped=true;}
 if(task.index<CHASE_GATES.length){routeStep(task,CHASE_GATES,from,player,0,true,23);task.complete=false;}
 if(task.index===CHASE_GATES.length&&task.escaped&&distance(player,CHASE_EVAC)<=CHASE.evacRadius&&Math.abs(player.speed)<=CHASE.evacSpeed){task.status='won';task.reason='已脱离追踪并抵达南湾撤离区';task.complete=true;clearSeaCombat(task.combat);}
}
