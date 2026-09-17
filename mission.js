import {HARBOR_STAGES,HARBOR_SUPPLIES} from './harbor-data.js';
import {TRAIN_STAGES,TRAIN_SUPPLIES} from './train-data.js';
import {TOWER_STAGES,TOWER_SUPPLIES} from './tower-data.js';
import {ROOF_STAGES,ROOF_SUPPLIES} from './roof-data.js';
import {IS_STATION,IS_ROOF,IS_TOWER,IS_TRAIN,IS_HARBOR} from './level.js';
import {STATION_STAGES,STATION_SUPPLIES} from './station-data.js';
export const STAGES=IS_HARBOR?HARBOR_STAGES:IS_TRAIN?TRAIN_STAGES:IS_TOWER?TOWER_STAGES:IS_ROOF?ROOF_STAGES:IS_STATION?STATION_STAGES:[
 {id:'coolant',title:'启动西侧冷却装置',short:'冷却装置',zone:'WEST COOLANT',x:-28,z:0,duration:2,count:5,level:1,action:'启动冷却',message:'冷却回路已恢复。前往东侧仓储区取得访问权限。'},
 {id:'access',title:'获取东侧访问权限',short:'访问权限',zone:'EAST STORAGE',x:28,z:0,duration:2.5,count:6,level:2,action:'启动权限上传',defenseDuration:25,defenseRadius:12,defenseCount:3,message:'访问权限已取得。前往中央控制台解除反应堆封锁。'},
 {id:'reactor',title:'解除反应堆封锁',short:'反应堆控制台',zone:'REACTOR CONTROL',x:0,z:-11,duration:3,count:7,level:3,action:'解除封锁',message:'反应堆已解锁。警告：THE WARDEN 正在激活！'},
 {id:'warden',title:'击败 Warden 与护卫',short:'THE WARDEN',zone:'REACTOR CORE',x:0,z:-20,duration:0,count:4,level:5,boss:true,message:'Warden 已被击破。返回南部部署区，清理追兵并撤离。'},
 {id:'extract',title:'返回部署区撤离',short:'撤离信标',zone:'SOUTH EXTRACTION',x:0,z:32,duration:3,count:4,level:3,action:'呼叫撤离',message:'撤离成功。反应堆已移交，行动结束。'}
];
export const REACTOR_SUPPLIES=[
 {id:'med-west',type:'health',x:-21,z:17},{id:'ammo-west',type:'ammo',x:-33,z:5},
 {id:'med-north',type:'health',x:-21,z:-20},{id:'ammo-east',type:'ammo',x:20,z:5},
 {id:'med-east',type:'health',x:33,z:-16},{id:'ammo-core',type:'ammo',x:6,z:-23},
 {id:'med-south',type:'health',x:-6,z:26},{id:'ammo-south',type:'ammo',x:6,z:26}
];
export const SUPPLIES=IS_HARBOR?HARBOR_SUPPLIES:IS_TRAIN?TRAIN_SUPPLIES:IS_TOWER?TOWER_SUPPLIES:IS_ROOF?ROOF_SUPPLIES:IS_STATION?STATION_SUPPLIES:REACTOR_SUPPLIES;
export function createMission(){
 const state={index:0,progress:0,time:0,complete:false,defending:false,node:0,wave:0};
 function reset(index=0){Object.assign(state,{index:Number.isInteger(index)&&index>=0&&index<STAGES.length?index:0,progress:0,time:0,complete:false,defending:false,node:0,wave:0});}
 function tick(dt,{player,held,clear,canInteract=true,transportReady=false}){
  if(state.complete)return null;state.time+=dt;
  const stage=current();
  if(state.defending){
   if(Math.hypot(stage.x-player.x,stage.z-player.z)<=stage.defenseRadius&&(stage.feetY===undefined||Math.abs((player.feetY??((player.y??1.7)-1.7))-stage.feetY)<.7))state.progress=Math.min(stage.defenseDuration,state.progress+dt);
   const wave=stage.defenseWaves?.[state.wave];if(wave&&state.progress+1e-8>=wave.at){state.wave++;return {type:'reinforcement',stage:{...stage,...wave},message:wave.message};}
   if(state.progress+1e-8<stage.defenseDuration||!clear)return null;
  } else if(stage.boss){if(!clear)return null;}
  else {
   const near=Math.hypot(stage.x-player.x,stage.z-player.z)<=2.8;
   const levelReady=stage.feetY===undefined||Math.abs((player.feetY??((player.y??1.7)-1.7))-stage.feetY)<.35;
   if(!held||!clear||!near||!canInteract||!levelReady||(stage.requiresTrip&&!transportReady)){state.progress=0;return null;}
   state.progress=Math.min(stage.duration,state.progress+dt);
   if(state.progress+1e-8<stage.duration)return null;
   if(stage.points&&state.node<stage.points.length-1){state.node++;state.progress=0;return {type:'node',next:current(),message:stage.nodeMessage||'中继 '+state.node+' / '+stage.points.length+' 已接通 // 前往下一座中继'};}
   if(stage.defenseDuration){state.defending=true;state.progress=0;return {type:'defense',stage};}
  }
  state.index++;state.node=0;state.wave=0;state.progress=0;state.defending=false;state.complete=state.index>=STAGES.length;
  return {type:'advance',finished:stage,next:state.complete?null:STAGES[state.index],complete:state.complete};
 }
 function current(){const s=STAGES[Math.min(state.index,STAGES.length-1)];return s.points?{...s,...s.points[state.node]}:s;}
 return {state,reset,tick,interrupt:()=>{if(!state.defending)state.progress=0;},get current(){return current();}};
}
export function applySupply(type,health,reserves,weapons){
 const next=[...reserves];let nextHealth=health;
 if(type==='health')nextHealth=Math.min(100,health+35);
 if(type==='ammo')for(let i=0;i<3;i++)next[i]=Math.min(weapons[i].reserve,reserves[i]+[60,16,30][i]);
 return {health:nextHealth,reserves:next,changed:nextHealth!==health||next.some((v,i)=>v!==reserves[i])};
}
// Rank nearby safe sites, exclude the player's immediate vicinity and avoid overlapping spawns.
export function chooseEncounterSpawns(stage,player,obstacles){
 const feetY=stage.spawnFeetY??stage.feetY??0;
 if(stage.spawns)return stage.spawns.map(([x,z])=>({x,z,y:feetY})).filter(p=>Math.hypot(p.x-player.x,p.z-player.z,feetY-(player.feetY??((player.y??1.7)-1.7)))>=6&&!obstacles.some(o=>Math.abs(p.x-o.x)<o.w/2+1.3&&Math.abs(p.z-o.z)<o.d/2+1.3&&feetY<(o.top??o.h)-1e-5&&feetY+2.4>(o.bottom??0)+1e-5)).slice(0,stage.count);
 const candidates=[];
 for(let x=-34;x<=34;x+=8)for(let z=-34;z<=34;z+=8){
  if(Math.hypot(x-player.x,z-player.z)<14)continue;
  if(obstacles.some(o=>Math.abs(x-o.x)<o.w/2+1.3&&Math.abs(z-o.z)<o.d/2+1.3))continue;
  candidates.push({x,z,score:Math.hypot(x-stage.x,z-stage.z)});
 }
 candidates.sort((a,b)=>a.score-b.score||a.x-b.x||a.z-b.z);
 return candidates.slice(0,stage.count);
}
