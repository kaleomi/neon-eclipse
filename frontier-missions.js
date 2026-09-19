// Expedition missions 6–8: 风电场夺控 (windfarm), 离岸平台突击 (platform), 雷达站总攻 (radar).
// Pure rules, no rendering. Each mission is a stage list with one safe node; hostiles are plain target records
// so vehicle-weapons hitscan / damageTarget and the on-foot rifle share one damage path.
import {ISLAND_HELIPAD,SHORE_HELIPAD} from './lighthouse-mission.js';
import {TURBINES,WIND_GATES,CONTROL_TOWER,FARM_HELIPAD,AIRFIELD_HELIPAD,PLATFORM,PLATFORM_HELIPAD,PLATFORM_CORE,PLATFORM_MOORING,PLATFORM_TURRETS,RADAR_STATION,RADAR_DISHES,MECH_SPAWN,onControlTower} from './frontier-site.js';
import {rayBox} from './vehicle-weapons.js';
export {ISLAND_HELIPAD,SHORE_HELIPAD};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const near=(p,g,r)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&dist(p,g)<=r;
const stopped=p=>!!p&&Number.isFinite(p.speed)&&Math.abs(p.speed)<=.6;
const onPad=(p,pad)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&dist(p,pad)<=pad.r;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const FRONTIER_IDS=Object.freeze(['windfarm','platform','radar']);
export const FRONTIER_TITLES=Object.freeze({windfarm:'风电场夺控',platform:'离岸平台突击',radar:'雷达站总攻'});
export const FRONTIER_RULES=Object.freeze({windfarm:'windfarm-v1',platform:'platform-v1',radar:'radar-v1'});
export const FRONTIER_PROFILES=Object.freeze({
 windfarm:Object.freeze({
  easy:Object.freeze({id:'easy',label:'简单',timeLimit:600,drones:4,droneHp:40,description:'10 分钟：越野车穿过 3 座机组门，登上控制塔击落 4 架哨戒无人机，再乘直升机返回机场。'}),
  normal:Object.freeze({id:'normal',label:'普通',timeLimit:480,drones:5,droneHp:50,description:'8 分钟：5 架哨戒无人机，血量更高。'}),
  hard:Object.freeze({id:'hard',label:'困难',timeLimit:360,drones:6,droneHp:60,description:'6 分钟：6 架哨戒无人机，绕塔更快。'})}),
 platform:Object.freeze({
  easy:Object.freeze({id:'easy',label:'简单',timeLimit:540,turretHp:60,turretDamage:4,fuse:75,escape:110,description:'9 分钟：直升机降落平台，清除 3 座炮塔，安放炸药后乘快艇驶离 110 m。'}),
  normal:Object.freeze({id:'normal',label:'普通',timeLimit:420,turretHp:80,turretDamage:6,fuse:55,escape:130,description:'7 分钟：炮塔更硬，引信 55 秒。'}),
  hard:Object.freeze({id:'hard',label:'困难',timeLimit:330,turretHp:100,turretDamage:8,fuse:40,escape:150,description:'5 分半：炮塔火力更强，引信 40 秒，需要驶离 150 m。'})}),
 radar:Object.freeze({
  easy:Object.freeze({id:'easy',label:'简单',timeLimit:720,dishHp:80,mechHp:500,mechDamage:8,mechSpeed:3.2,description:'12 分钟：任意载具抵达雷达站大门，摧毁 3 座天线，击毁重炮机甲。'}),
  normal:Object.freeze({id:'normal',label:'普通',timeLimit:600,dishHp:100,mechHp:700,mechDamage:10,mechSpeed:3.8,description:'10 分钟：机甲 700 血。'}),
  hard:Object.freeze({id:'hard',label:'困难',timeLimit:480,dishHp:120,mechHp:900,mechDamage:14,mechSpeed:4.4,description:'8 分钟：机甲 900 血、火力更猛。'})})
});
export const normalizeFrontier=(id,value)=>Object.hasOwn(FRONTIER_PROFILES[id]||{},value)?value:'normal';
export const FRONTIER_STAGES=Object.freeze({
 windfarm:Object.freeze(['drive','park','climb','snipe','heli','lift','fly','touchdown']),
 platform:Object.freeze(['board','lift','fly','land','clear','plant','boat','escape']),
 radar:Object.freeze(['approach','dishes','boss'])
});
export const FRONTIER_LABELS=Object.freeze({
 windfarm:Object.freeze({drive:'穿越机组门',park:'停车控制塔',climb:'登上控制塔',snipe:'狙击哨戒机',heli:'登上直升机',lift:'起飞',fly:'飞回机场',touchdown:'机场着陆',complete:'风电场已夺控'}),
 platform:Object.freeze({board:'登上直升机',lift:'起飞',fly:'飞往平台',land:'平台着陆',clear:'清除炮塔',plant:'安放炸药',boat:'登上快艇',escape:'驶离平台',complete:'平台已摧毁'}),
 radar:Object.freeze({approach:'抵达大门',dishes:'摧毁天线',boss:'击毁重炮机甲',complete:'雷达站已攻克'})
});
export const FRONTIER_SAFE_STAGE=Object.freeze({windfarm:'heli',platform:'clear',radar:'boss'});
export const FRONTIER_CHECKPOINT_STAGES=Object.freeze({
 windfarm:Object.freeze({heli:'哨戒机已清除 · 从风电场停机坪继续'}),
 platform:Object.freeze({clear:'已降落平台 · 从平台甲板继续'}),
 radar:Object.freeze({boss:'天线已摧毁 · 从雷达站大门继续'})
});
const towerFoot={x:CONTROL_TOWER.ramp.minX+2,z:CONTROL_TOWER.ramp.maxZ+6};
export const FRONTIER_POINTS=Object.freeze({
 windfarm:Object.freeze({drive:{...WIND_GATES[0],y:2,name:'越野车 · 依次穿过 3 座机组门'},park:{...towerFoot,y:2,name:'控制塔坡道口 · 停稳越野车'},climb:{x:CONTROL_TOWER.x,z:CONTROL_TOWER.z,y:CONTROL_TOWER.h+1,name:'沿坡道步行登上控制塔'},snipe:{x:CONTROL_TOWER.x,z:CONTROL_TOWER.z,y:CONTROL_TOWER.h+1,name:'塔顶狙击 · 左键射击哨戒无人机'},heli:{x:FARM_HELIPAD.x,z:FARM_HELIPAD.z,y:1,name:'风电场停机坪 · 走到直升机侧门按 E'},lift:{x:FARM_HELIPAD.x,z:FARM_HELIPAD.z,y:10,name:'I 启动 · Shift 拉起离地 8 m'},fly:{x:AIRFIELD_HELIPAD.x,z:AIRFIELD_HELIPAD.z,y:8,name:'飞往机场停机坪（H 标记）'},touchdown:{x:AIRFIELD_HELIPAD.x,z:AIRFIELD_HELIPAD.z,y:1,name:'停机坪内平稳着陆 · I 熄火'}}),
 platform:Object.freeze({board:{x:SHORE_HELIPAD.x,z:SHORE_HELIPAD.z,y:1,name:'岸边停机坪 · 直升机侧门按 E 登机'},lift:{x:SHORE_HELIPAD.x,z:SHORE_HELIPAD.z,y:10,name:'I 启动 · Shift 拉起离地 8 m'},fly:{x:PLATFORM_HELIPAD.x,z:PLATFORM_HELIPAD.z,y:PLATFORM.h+6,name:'飞往东侧离岸平台停机坪'},land:{x:PLATFORM_HELIPAD.x,z:PLATFORM_HELIPAD.z,y:PLATFORM.h+1,name:'平台停机坪内着陆 · I 熄火'},clear:{x:PLATFORM_CORE.x,z:PLATFORM_CORE.z,y:PLATFORM.h+1,name:'甲板作战 · 左键射击清除 3 座炮塔'},plant:{x:PLATFORM_CORE.x,z:PLATFORM_CORE.z,y:PLATFORM.h+1,name:'平台核心 · 按住 F 安放炸药'},boat:{x:PLATFORM_MOORING.x,z:PLATFORM_MOORING.z,y:2,name:'西侧系泊快艇 · 按 E 登船'},escape:{x:PLATFORM_MOORING.x-160,z:PLATFORM_MOORING.z,y:2,name:'引信倒计时 · 全速驶离平台'}}),
 radar:Object.freeze({approach:{...RADAR_STATION.gate,y:2,name:'任意载具 · 抵达雷达站南门'},dishes:{x:RADAR_STATION.x,z:RADAR_STATION.z,y:8,name:'摧毁 3 座雷达天线（任意武器）'},boss:{...MECH_SPAWN,y:4,name:'击毁重炮机甲 · 利用掩体，注意生命值'}})
});
export const FRONTIER_SITES=Object.freeze({towerFoot,turbines:TURBINES,gates:WIND_GATES,tower:CONTROL_TOWER,farmPad:FARM_HELIPAD,airfieldPad:AIRFIELD_HELIPAD,platform:PLATFORM,platformPad:PLATFORM_HELIPAD,core:PLATFORM_CORE,mooring:PLATFORM_MOORING,turrets:PLATFORM_TURRETS,radar:RADAR_STATION,dishes:RADAR_DISHES,mechSpawn:MECH_SPAWN});
let runSerial=0;
const newRunId=()=>globalThis.crypto?.randomUUID?.()||`frontier-${Date.now()}-${++runSerial}-${Math.random().toString(36).slice(2).padEnd(10,'0')}`;
export function createFrontierMission(id='windfarm',difficulty='normal',active=false){
 if(!FRONTIER_IDS.includes(id))id='windfarm';
 const profile=FRONTIER_PROFILES[id][normalizeFrontier(id,difficulty)];
 return {id,runId:active?newRunId():null,recovered:false,status:active?'active':'idle',stage:FRONTIER_STAGES[id][0],profile,elapsed:0,hold:0,reason:'',completed:[],
  gate:0,health:100,hurtCooldown:0,fuse:null,hostiles:[],mech:null,kills:0,lastMessage:null};
}
// ---- Hostiles. Compatible with vehicle-weapons damageTarget: {alive,hp,maxHp,r,respawn}. respawn=Infinity keeps them dead.
function hostile(type,id,x,y,z,r,hp){return {id,type,x,y,z,r,hp,maxHp:hp,alive:true,respawn:Infinity,respawnIn:0,flash:0,orbit:null,angle:0};}
export function spawnDrones(m){
 const p=m.profile;m.hostiles=Array.from({length:p.drones},(_,i)=>{const h=hostile('drone','sentinel-'+i,0,0,0,2,p.droneHp);h.orbit={x:CONTROL_TOWER.x,z:CONTROL_TOWER.z,radius:55+(i%3)*18,height:CONTROL_TOWER.h+8+(i%2)*9,speed:9+(i%3)*2+(p.id==='hard'?3:0),phase:i*Math.PI*2/p.drones};h.angle=h.orbit.phase;placeOrbit(h,0);return h;});
}
function placeOrbit(h,dt){const o=h.orbit;h.angle+=o.speed/o.radius*dt;h.x=o.x+Math.cos(h.angle)*o.radius;h.z=o.z+Math.sin(h.angle)*o.radius;h.y=o.height+Math.sin(h.angle*3)*1.5;}
export function spawnTurrets(m){m.hostiles=PLATFORM_TURRETS.map((t,i)=>{const h=hostile('turret','turret-'+i,t.x,PLATFORM.h+1.6,t.z,1.7,m.profile.turretHp);h.cooldown=2+i*.7;return h;});}
export function spawnDishes(m){m.hostiles=RADAR_DISHES.map((d,i)=>hostile('dish','dish-'+i,d.x,d.h+2,d.z,d.r,m.profile.dishHp));}
export function spawnMech(m){const h=hostile('mech','mech',MECH_SPAWN.x,4,MECH_SPAWN.z,3.6,m.profile.mechHp);h.yaw=Math.PI;h.cooldown=3;h.flashTimer=0;m.mech=h;m.hostiles=[h];}
export const aliveHostiles=m=>m.hostiles.filter(h=>h.alive);
function hurt(m,amount,why){if(m.hurtCooldown>0)return false;m.health=Math.max(0,m.health-amount);m.hurtCooldown=.4;m.sinceHurt=0;m.lastHit=why;return true;}
function losOK(from,to,boxes){const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,l=Math.hypot(dx,dy,dz);if(l<1e-6)return true;const dir={x:dx/l,y:dy/l,z:dz/l};for(const b of boxes){const d=rayBox(from,dir,b);if(d!==null&&d<l)return false;}return true;}
// ---- Boarding rules per stage.
export function frontierBoardAllowed(m,kind){
 if(m.status!=='active')return true;
 if(m.id==='windfarm')return kind==='rover'?['drive','park'].includes(m.stage):kind==='helicopter'?['heli','lift'].includes(m.stage):false;
 if(m.id==='platform')return kind==='helicopter'?['board','lift'].includes(m.stage):kind==='yacht'?m.stage==='boat':false;
 return true;
}
export function frontierExitAllowed(m,kind){return m.status!=='active'||kind!=='helicopter'||m.stage!=='fly';}
export function frontierGoal(m,{player,rover,heli,yacht,kind}={}){
 const g=FRONTIER_POINTS[m.id][m.stage]||Object.values(FRONTIER_POINTS[m.id]).at(-1);
 if(m.id==='windfarm'){
  if(m.stage==='drive')return {...(WIND_GATES[m.gate]||WIND_GATES.at(-1)),y:2,name:g.name+' · '+(m.gate+1)+'/'+WIND_GATES.length+(kind==='rover'?'':'（先登上越野车）')};
  if(m.stage==='snipe'){const t=aliveHostiles(m)[0];if(t)return {x:t.x,z:t.z,y:t.y,name:g.name+' · 剩余 '+aliveHostiles(m).length};}
  if(m.stage==='heli'&&heli)return {x:heli.x,z:heli.z,y:1,name:g.name};
 }
 if(m.id==='platform'){
  if(m.stage==='board'&&heli)return {x:heli.x,z:heli.z,y:1,name:g.name};
  if(m.stage==='clear'){const t=aliveHostiles(m)[0];if(t)return {x:t.x,z:t.z,y:t.y,name:g.name+' · 剩余 '+aliveHostiles(m).length};}
  if(m.stage==='boat'&&yacht)return {x:yacht.x,z:yacht.z,y:2,name:g.name};
  if(m.stage==='escape')return {x:PLATFORM_CORE.x,z:PLATFORM_CORE.z,y:2,name:'驶离平台核心 '+m.profile.escape+' m · 引信 '+Math.ceil(m.fuse??0)+' s'};
 }
 if(m.id==='radar'){
  if(m.stage==='dishes'){const t=aliveHostiles(m)[0];if(t)return {x:t.x,z:t.z,y:t.y,name:g.name+' · 剩余 '+aliveHostiles(m).length};}
  if(m.stage==='boss'&&m.mech)return {x:m.mech.x,z:m.mech.z,y:4,name:g.name+' · 机甲 '+Math.ceil(m.mech.hp)+'/'+m.mech.maxHp};
 }
 return g;
}
function advance(m){
 m.completed.push(m.stage);m.hold=0;const stages=FRONTIER_STAGES[m.id],i=stages.indexOf(m.stage);m.stage=stages[i+1]||'complete';
 if(m.id==='windfarm'&&m.stage==='snipe')spawnDrones(m);
 if(m.id==='platform'&&m.stage==='clear')spawnTurrets(m);
 if(m.id==='platform'&&m.stage==='boat')m.fuse=m.profile.fuse;
 if(m.id==='radar'&&m.stage==='dishes')spawnDishes(m);
 if(m.id==='radar'&&m.stage==='boss')spawnMech(m);
 if(m.stage==='complete'){m.status='won';m.reason={windfarm:'风电场控制塔已清空，直升机返回机场',platform:'平台炸药引爆，快艇安全驶离',radar:'重炮机甲被击毁，雷达站已攻克'}[m.id];}
 return true;
}
function fail(m,reason){m.status='lost';m.reason=reason;m.hold=0;return true;}
// s = {kind,player,rover,yacht,plane,heli,action,boxes,ground(x,z)}; returns true when the stage/status changed.
export function stepFrontierMission(m,s,dt){
 if(m.status!=='active'||!Number.isFinite(dt)||dt<=0||s.paused)return false;
 const step=Math.min(dt,.25);m.elapsed+=step;m.hurtCooldown=Math.max(0,m.hurtCooldown-step);m.sinceHurt=(m.sinceHurt||0)+step;
 if(m.sinceHurt>4&&m.health<100)m.health=Math.min(100,m.health+4*step);
 if(m.elapsed>=m.profile.timeLimit)return fail(m,'超出 '+m.profile.label+' 时限 '+m.profile.timeLimit+' 秒');
 const {kind,player,rover,yacht,heli,action=false,boxes=[],ground=()=>0}=s;
 const actor=kind==='rover'?rover:kind==='yacht'?yacht:kind==='helicopter'?heli:kind==='plane'?s.plane:player;
 if(heli&&heli.status==='crashed'&&(m.id!=='radar'))return fail(m,'直升机损坏：'+(heli.reason||'坠毁'));
 if(m.id==='radar'&&heli&&heli.status==='crashed'&&kind==='helicopter')return fail(m,'直升机损坏：'+(heli.reason||'坠毁'));
 let ready=false,seconds=0;
 if(m.id==='windfarm'){
  switch(m.stage){
   case 'drive':if(kind==='rover'&&near(rover,WIND_GATES[m.gate],14)){m.gate++;if(m.gate>=WIND_GATES.length){return advance(m);}m.lastMessage='机组门 '+m.gate+'/'+WIND_GATES.length;return true;}break;
   case 'park':ready=kind==='rover'&&near(rover,towerFoot,14)&&stopped(rover);seconds=1;break;
   case 'climb':ready=!kind&&onControlTower(player?.x,player?.z);break;
   case 'snipe':for(const h of m.hostiles)if(h.alive)placeOrbit(h,step);ready=aliveHostiles(m).length===0;break;
   case 'heli':ready=kind==='helicopter';break;
   case 'lift':ready=kind==='helicopter'&&!!heli&&heli.status==='running'&&!heli.grounded&&heli.y-FARM_HELIPAD.y>=8;break;
   case 'fly':ready=kind==='helicopter'&&!!heli&&heli.status==='running'&&onPad(heli,AIRFIELD_HELIPAD)&&heli.y<=AIRFIELD_HELIPAD.y+14;break;
   case 'touchdown':ready=!!heli&&heli.status==='running'&&heli.grounded&&onPad(heli,AIRFIELD_HELIPAD)&&!heli.powered;seconds=1;break;
  }
 }else if(m.id==='platform'){
  switch(m.stage){
   case 'board':ready=kind==='helicopter';break;
   case 'lift':ready=kind==='helicopter'&&!!heli&&heli.status==='running'&&!heli.grounded&&heli.y-SHORE_HELIPAD.y>=8;break;
   case 'fly':ready=kind==='helicopter'&&!!heli&&heli.status==='running'&&onPad(heli,PLATFORM_HELIPAD)&&heli.y<=PLATFORM_HELIPAD.y+14;break;
   case 'land':ready=!!heli&&heli.status==='running'&&heli.grounded&&onPad(heli,PLATFORM_HELIPAD)&&!heli.powered;seconds=1;break;
   case 'clear':{
    for(const t of m.hostiles){if(!t.alive)continue;t.cooldown-=step;if(t.cooldown<=0){t.cooldown=3;if(!kind&&player&&dist(player,t)<=42&&losOK({x:t.x,y:t.y,z:t.z},{x:player.x,y:ground(player.x,player.z)+1.2,z:player.z},boxes)){hurt(m,m.profile.turretDamage,'炮塔');t.flash=.25;}}}
    if(m.health<=0)return fail(m,'在平台甲板被炮塔击倒');
    ready=aliveHostiles(m).length===0;break;}
   case 'plant':ready=!kind&&near(player,PLATFORM_CORE,3.5)&&action;seconds=3;break;
   case 'boat':m.fuse=Math.max(0,m.fuse-step);if(m.fuse<=0)return fail(m,'炸药引爆时仍在平台上');ready=kind==='yacht';break;
   case 'escape':m.fuse=Math.max(0,m.fuse-step);{const far=yacht?dist(yacht,PLATFORM_CORE):0;if(m.fuse<=0)return far>=m.profile.escape?advance(m):fail(m,'炸药引爆时快艇仍在 '+m.profile.escape+' m 危险区内');ready=kind==='yacht'&&far>=m.profile.escape;}break;
  }
 }else{
  switch(m.stage){
   case 'approach':ready=!!actor&&near(actor,RADAR_STATION.gate,18);break;
   case 'dishes':ready=aliveHostiles(m).length===0;break;
   case 'boss':{
    const b=m.mech;if(!b)break;b.flash=Math.max(0,b.flash-step);
    if(actor&&b.alive){const d=dist(b,actor);if(d>20){const dx=actor.x-b.x,dz=actor.z-b.z,l=Math.hypot(dx,dz)||1;const nx=b.x+dx/l*m.profile.mechSpeed*step,nz=b.z+dz/l*m.profile.mechSpeed*step;if(Math.abs(nx)<=580&&Math.abs(nz)<=580&&nx<=210){b.x=nx;b.z=nz;}b.yaw=Math.atan2(dx,-dz);}
     b.cooldown-=step;if(b.cooldown<=0){b.cooldown=2.5;if(d<=120&&losOK({x:b.x,y:6,z:b.z},{x:actor.x,y:(kind?(actor.y??ground(actor.x,actor.z)):ground(actor.x,actor.z))+1.2,z:actor.z},boxes)){hurt(m,m.profile.mechDamage*(kind&&kind!=='helicopter'?.6:1),'机甲重炮');b.flashTimer=.2;}}}
    if(m.health<=0)return fail(m,'被重炮机甲击倒');
    ready=!b.alive;break;}
  }
 }
 m.hold=ready?m.hold+step:0;
 return ready&&m.hold+1e-8>=seconds?advance(m):false;
}
// ---- Safe node (schema 1). Same shape as the lighthouse node; the archive stores it under the mission id.
export function frontierCheckpointFromMission(m,now=Date.now()){
 if(!m||m.status!=='active'||m.stage!==FRONTIER_SAFE_STAGE[m.id]||typeof m.runId!=='string')return null;
 return {schema:1,rule:FRONTIER_RULES[m.id],runId:m.runId,stage:m.stage,difficulty:m.profile.id,elapsedMs:Math.round(m.elapsed*1000),savedAt:now,recovered:m.recovered===true};
}
export function validFrontierCheckpoint(id,c){
 return FRONTIER_IDS.includes(id)&&!!c&&c.schema===1&&c.rule===FRONTIER_RULES[id]&&typeof c.runId==='string'&&/^[a-zA-Z0-9-]{16,96}$/.test(c.runId)&&Object.hasOwn(FRONTIER_CHECKPOINT_STAGES[id],c.stage)&&
  Object.hasOwn(FRONTIER_PROFILES[id],c.difficulty)&&Number.isSafeInteger(c.elapsedMs)&&c.elapsedMs>=0&&c.elapsedMs<FRONTIER_PROFILES[id][c.difficulty].timeLimit*1000&&Number.isSafeInteger(c.savedAt)&&typeof c.recovered==='boolean';
}
export function canonicalFrontierCheckpoint(c){return c===null?null:{schema:c.schema,rule:c.rule,runId:c.runId,stage:c.stage,difficulty:c.difficulty,elapsedMs:c.elapsedMs,savedAt:c.savedAt,recovered:c.recovered};}
export const frontierCheckpointLabel=(id,c)=>FRONTIER_CHECKPOINT_STAGES[id][c.stage]+' · '+FRONTIER_PROFILES[id][normalizeFrontier(id,c.difficulty)].label;
// Restore puts the operator on foot next to the node site with cold vehicles; hostiles of the node stage are respawned at full strength.
export function restoreFrontierCheckpoint(id,c){
 if(!validFrontierCheckpoint(id,c))throw Error('Invalid frontier checkpoint');
 const m=createFrontierMission(id,c.difficulty,true);m.stage=c.stage;m.elapsed=c.elapsedMs/1000;m.recovered=true;
 m.completed=FRONTIER_STAGES[id].slice(0,FRONTIER_STAGES[id].indexOf(c.stage));
 if(id==='windfarm'){m.gate=WIND_GATES.length;spawnDrones(m);for(const h of m.hostiles){h.alive=false;h.hp=0;}// the safe node is only reached once every sentinel is down
  return {mission:m,player:{x:FARM_HELIPAD.x-6,z:FARM_HELIPAD.z+6,yaw:Math.atan2(6,-6)},heliPad:FARM_HELIPAD,rover:{x:towerFoot.x+4,z:towerFoot.z,yaw:0}};}
 if(id==='platform'){spawnTurrets(m);return {mission:m,player:{x:PLATFORM_HELIPAD.x-6,z:PLATFORM_HELIPAD.z+3,yaw:-Math.PI/2},heliPad:PLATFORM_HELIPAD,yacht:PLATFORM_MOORING};}
 spawnMech(m);return {mission:m,player:{x:RADAR_STATION.gate.x-4,z:RADAR_STATION.gate.z+4,yaw:0},rover:{x:RADAR_STATION.gate.x+5,z:RADAR_STATION.gate.z+6,yaw:0}};
}
export function frontierSummary(m){
 const stages=FRONTIER_STAGES[m.id];
 return {id:m.id,title:FRONTIER_TITLES[m.id],label:m.profile.label,remaining:Math.max(0,m.profile.timeLimit-m.elapsed),stageIndex:m.completed.length,stages:stages.length,health:Math.ceil(m.health),hostiles:aliveHostiles(m).length,total:m.hostiles.length,fuse:m.fuse,mechHp:m.mech?Math.ceil(m.mech.hp):null,mechMax:m.mech?.maxHp||null};
}
