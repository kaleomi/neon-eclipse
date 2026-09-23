import {createFlightAttempt} from './flight-records-model.js';
import {RECON,RECON_TARGETS,createRecon,stepRecon} from './recon-rules.js';
import {AIRCRAFT,FLIGHT_GATES} from './flight-rules.js';
import {FIELD,routeStep} from './maritime-rules.js';
import {createDriveTrial} from './vehicle-rules.js';

export const FLIGHT_MISSION=Object.freeze({limit:300,stopSeconds:2,stopSpeed:1,gateRadius:23,
 approach:Object.freeze({x:-300,y:25,z:-100,name:'返航进场门 · 对正北向',radius:18}),
 runway:Object.freeze({minX:-314,maxX:-286,minZ:-430,maxZ:240}),
 touchdown:Object.freeze({x:-300,y:1.3,z:-350,name:'北向跑道 · 收油下降，落地后空格刹车'})});
export const FLIGHT_PHASES=Object.freeze({takeoff:'滑跑起飞',route:'五门导航',approach:'返航对正',landing:'跑道着陆',stop:'收油停稳',upload:'返航上传',complete:'任务完成',failed:'任务失败'});
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const onRunway=p=>p.x>=FLIGHT_MISSION.runway.minX&&p.x<=FLIGHT_MISSION.runway.maxX&&p.z>=FLIGHT_MISSION.runway.minZ&&p.z<=FLIGHT_MISSION.runway.maxZ;
export function createFlightMission(plane,type='return'){
 return {attempt:plane?createFlightAttempt(type==='recon'?'recon':'return'):null,landedSafely:false,type:type==='recon'?'recon':'return',recon:createRecon(),status:plane?'active':'idle',phase:'takeoff',route:createDriveTrial(),elapsed:0,remaining:FLIGHT_MISSION.limit,
  tookOff:false,approached:false,stopTime:0,initialLandings:plane?.landings||0,reason:'',result:null};
}
export const flightCourse=m=>m.type==='recon'?RECON_TARGETS:FLIGHT_GATES;
export const flightTitle=m=>m.type==='recon'?'低空侦察 · 回声航线':'归航试炼';
export const flightPhase=m=>m.type==='recon'&&m.phase==='route'?'地标扫描':FLIGHT_PHASES[m.phase];
export const flightProgress=m=>(m.type==='recon'?'扫描 ':'导航 ')+m.route.index+' / '+flightCourse(m).length;
export function flightGoal(m){
 return m.phase==='takeoff'||m.phase==='route'?flightCourse(m)[m.route.index]:m.phase==='approach'?FLIGHT_MISSION.approach:FLIGHT_MISSION.touchdown;
}
function finish(m,won,reason){
 m.status=won?'won':'lost';m.phase=won?'complete':'failed';m.reason=reason;
 m.result=Object.freeze({attempt:m.attempt,completedAt:Date.now(),tookOff:m.tookOff,approached:m.approached,landedSafely:m.landedSafely,routeComplete:m.route.complete,uploadTime:m.recon.uploadTime,status:m.status,reason,elapsed:m.elapsed,gates:m.route.index,stopTime:m.stopTime,records:Object.freeze([...m.recon.records]),uploaded:m.type==='recon'&&won});
}
export function stepFlightMission(m,p,from,dt,{paused=false,scan=false,boxes=[]}={}){
 if(m.status!=='active'||paused||!Number.isFinite(dt)||dt<=0)return;
 const h=Math.min(dt,.25);
 if(!p||!from||!['x','y','z','yaw','speed','throttle','landings'].every(k=>Number.isFinite(p[k]))||!['x','y','z'].every(k=>Number.isFinite(from[k]))){finish(m,false,'飞行状态无效，请重试任务');return;}
 m.elapsed+=h;m.remaining=Math.max(0,FLIGHT_MISSION.limit-m.elapsed);
 if(p.crashed){finish(m,false,'飞机受损：请检查姿态、速度、障碍与试验区边界');return;}
 if(Math.abs(p.x)>FIELD.bounds||Math.abs(p.z)>FIELD.bounds||p.y>FIELD.ceiling+.1||p.y<0){finish(m,false,'已离开飞行试验边界');return;}
 // Mission checkpoints cannot be awarded by dispatch/teleportation between updates.
 if(Math.hypot(p.x-from.x,p.y-from.y,p.z-from.z)>AIRCRAFT.maxSpeed*h+1){finish(m,false,'任务位置发生跳变，请从机场重新开始');return;}
 if(m.remaining<=0){finish(m,false,'五分钟任务窗口已结束');return;}
 if(!p.onGround){m.tookOff=true;if(m.phase==='takeoff')m.phase='route';}
 const touchdown=!from.onGround&&p.onGround;
 if(touchdown&&m.tookOff){
  if(m.phase!=='landing'||!m.approached||!m.route.complete||p.landings<=m.initialLandings){finish(m,false,m.type==='recon'?'提前着陆：需要扫描全部地标及通过返航进场门':'提前着陆：需要完成五个导航门及返航进场门');return;}
  if(!onRunway(p)||Math.abs(wrap(p.yaw))>.35){finish(m,false,'未在指定跑道北向对正着陆');return;}
  m.landedSafely=true;m.phase='stop';
 }
 if(m.phase==='stop'||m.phase==='upload'){
  if(!p.onGround||!onRunway(p)){finish(m,false,'着陆后请留在指定跑道，收油并停稳');return;}
  const parked=Math.abs(p.speed)<=FLIGHT_MISSION.stopSpeed&&p.throttle<=.05&&Math.abs(wrap(p.yaw))<=.35;
  if(m.phase==='upload'){if(!m.approached||!m.route.complete||m.recon.records.length!==RECON_TARGETS.length||!RECON_TARGETS.every((g,i)=>m.recon.records[i]?.id===g.id)){finish(m,false,'侦察记录不完整，无法上传');return;}m.recon.uploadTime=parked&&scan?m.recon.uploadTime+h:0;if(m.recon.uploadTime+1e-8>=RECON.uploadSeconds){m.recon.uploadTime=RECON.uploadSeconds;finish(m,true,'三处地标扫描完成，已安全返航并上传记录');}return;}
  if(Math.abs(p.speed)<=FLIGHT_MISSION.stopSpeed&&p.throttle<=.05&&Math.abs(wrap(p.yaw))<=.35)m.stopTime+=h;else m.stopTime=0;
  if(m.stopTime+1e-8>=FLIGHT_MISSION.stopSeconds){m.stopTime=FLIGHT_MISSION.stopSeconds;if(m.type==='recon')m.phase='upload';else finish(m,true,'五门导航、北向返航与安全停稳全部完成');}
  return;
 }
 if(m.phase==='route'&&!p.onGround){
  if(m.type==='recon'){if(stepRecon(m.recon,RECON_TARGETS[m.route.index],p,from,h,{scan,boxes})){m.route.index++;m.route.started=true;m.route.complete=m.route.index===RECON_TARGETS.length;}}
  else routeStep(m.route,FLIGHT_GATES,from,p,h,true,FLIGHT_MISSION.gateRadius,true);
  if(m.route.complete)m.phase='approach';
  return;
 }
 if(m.phase==='approach'&&!p.onGround&&p.y>=8&&p.z<from.z&&Math.abs(wrap(p.yaw))<=.5){
  const gate=createDriveTrial();
  if(routeStep(gate,[FLIGHT_MISSION.approach],from,p,h,true,FLIGHT_MISSION.approach.radius,true)){m.approached=true;m.phase='landing';}
 }
}
