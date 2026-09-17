import {flightRecordFromResult} from './flight-records-model.js';
export const JOINT_POINTS=Object.freeze({pickup:Object.freeze({x:-112,z:112,y:2,name:'领取设备 · 步行靠近，按住 F'}),drive:Object.freeze({x:207,z:195,y:2,name:'码头停车位 · 越野车停稳 2 秒'}),deliver:Object.freeze({x:420,z:360,y:3,name:'海上交付浮标 · 停船并按住 F 2 秒'}),return:Object.freeze({x:278,z:180,y:2,name:'返港泊位 · 停稳后按 E 下船'}),airfield:Object.freeze({x:-310,z:245,y:2,name:'机场停车位 · 越野车停稳 2 秒'}),handoff:Object.freeze({x:-316,z:-275,y:2,name:'返航交接终端 · 下机后步行按住 F'})});
export const JOINT_STAGES=Object.freeze(['pickup','drive','board','deliver','return','airfield','board-plane','recon','handoff']);
export const JOINT_LABELS=Object.freeze({pickup:'领取设备',drive:'陆路前往码头',board:'安全换乘游艇',deliver:'海上设备交付',return:'返港下船',airfield:'陆路转运机场','board-plane':'安全换乘飞机',recon:'空中侦察与返航',handoff:'下机交接',complete:'联合任务完成'});
export function createJointMission(active=false){return {status:active?'active':'idle',stage:'pickup',elapsed:0,hold:0,flightId:null,reason:'',completed:[]};}
const near=(p,g,r)=>p&&Math.hypot(p.x-g.x,p.z-g.z)<=r;
const stopped=p=>p&&Number.isFinite(p.speed)&&Math.abs(p.speed)<=.6;
export function jointGoal(m,{rover,yacht,plane,player,kind}){if(['drive','airfield'].includes(m.stage)&&kind!=='rover'){if(player?.x>219)return {x:218,z:180,y:2,name:'沿栈桥回到岸边，再换乘越野车'};return {...rover,y:2,name:'越野车 · 靠近按 E 上车'};}if(m.stage==='board'){if(player&&player.x<216)return {x:218,z:180,y:2,name:'下车后前往栈桥入口，再按 E 登船'};return {...yacht,y:2,name:'游艇 · 沿栈桥靠近按 E 上船'};}if(m.stage==='board-plane'){if(!kind&&player&&player.x<rover.x+4&&player.z>rover.z-3)return {x:rover.x+7,z:rover.z+4,y:2,name:'绕过越野车，再接近飞机按 E'};return {...plane,name:'固定翼飞机 · 靠近按 E 上机'};}return JOINT_POINTS[m.stage]||JOINT_POINTS.handoff;}
function advance(m){m.completed.push(m.stage);m.hold=0;const i=JOINT_STAGES.indexOf(m.stage);m.stage=JOINT_STAGES[i+1]||'complete';if(m.stage==='complete'){m.status='won';m.reason='设备交付、返港换乘、侦察返航与最终交接全部完成';}return true;}
export function stepJointMission(m,s,dt){
 if(m.status!=='active'||!Number.isFinite(dt)||dt<=0||s.paused)return false;m.elapsed+=Math.min(dt,.25);
 const {kind,player,rover,yacht,plane,action=false}=s;let ready=false,seconds=2;
 switch(m.stage){
  case 'pickup':ready=!kind&&near(player,JOINT_POINTS.pickup,5)&&action;seconds=1;break;
  case 'drive':ready=kind==='rover'&&near(rover,JOINT_POINTS.drive,12)&&stopped(rover);break;
  case 'board':ready=kind==='yacht';seconds=0;break;
  case 'deliver':ready=kind==='yacht'&&near(yacht,JOINT_POINTS.deliver,18)&&stopped(yacht)&&action;break;
  case 'return':ready=!kind&&near(player,{x:272,z:180},8)&&near(yacht,JOINT_POINTS.return,8)&&stopped(yacht);seconds=0;break;
  case 'airfield':ready=kind==='rover'&&near(rover,JOINT_POINTS.airfield,12)&&stopped(rover);break;
  case 'board-plane':ready=kind==='plane'&&plane.onGround&&!plane.crashed&&stopped(plane)&&near(plane,{x:-300,z:220},12);seconds=0;break;
  case 'handoff':ready=!kind&&plane.onGround&&!plane.crashed&&stopped(plane)&&near(player,JOINT_POINTS.handoff,5)&&action;break;
 }
 m.hold=ready?m.hold+Math.min(dt,.25):0;return ready&&m.hold+1e-8>=seconds?advance(m):false;
}
export function finishJointFlight(m,result){
 if(m.status!=='active'||m.stage!=='recon')return false;
 const record=flightRecordFromResult(result);
 if(!record||record.type!=='recon'||record.id!==m.flightId){m.status='lost';m.reason=result?.reason||'联合侦察未完整有效完成';m.hold=0;return false;}
 return advance(m);
}
export function jointBoardAllowed(m,kind){if(m.status!=='active')return true;return kind==='rover'?['drive','airfield'].includes(m.stage):kind==='yacht'?['board','deliver','return'].includes(m.stage):kind==='plane'?['board-plane','recon','handoff'].includes(m.stage):false;}
