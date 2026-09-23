import {HELICOPTER_SITE} from './helicopter-rules.js';
import {HELICOPTER_TRANSFER} from './helicopter-transfer.js';

// An isolated rehearsal for mission integration, NOT expedition mission 5 or a campaign result.
const [a,b]=HELICOPTER_SITE.pads;
export const HELICOPTER_HANDOVER_RULE='helicopter-handover-v1';
export const HANDOVER_TERMINAL=Object.freeze({x:b.x+15,y:0,z:b.z+6,radius:2.2});
export const HANDOVER_STEPS=Object.freeze([
  Object.freeze({id:'land-b',title:'抵达 B 坪',hint:'从 A 坪起飞，飞往 B 坪；先制动停稳，再用 C 缓降着陆。',x:b.x,y:0,z:b.z,radius:7,seconds:1}),
  Object.freeze({id:'inspect',title:'下机清点',hint:'按 I 熄火，旋翼低于 8% 后按 F 下机。步行至 B 坪东侧标记，按 F 清点。',...HANDOVER_TERMINAL,seconds:0}),
  Object.freeze({id:'board',title:'返回驾驶位',hint:'走回机身侧面舱门标记，按 F 登机。登机不会自动点火；按 I 启动后起飞。',x:b.x,y:0,z:b.z,radius:3,seconds:0}),
  Object.freeze({id:'land-a',title:'返回 A 坪',hint:'按 I 启动，Shift 起飞；返回 A 坪并安全着陆。此训练不写入先遣队成绩。',x:a.x,y:0,z:a.z,radius:7,seconds:1})
]);
export function createHelicopterHandover(){return {status:'ready',stage:0,hold:0,elapsed:0,completed:[],departureLandings:0};}
export function startHelicopterHandover(t){if(t.status==='ready')t.status='running';}
export const helicopterHandoverGoal=t=>HANDOVER_STEPS[t.stage]||null;
export function helicopterHandoverReadiness(t,port){
  const goal=helicopterHandoverGoal(t),s=port.craft;
  if(!goal||port.version!==1)return {inside:false,height:false,stable:false,ready:false};
  if(t.stage===1){
    const inside=port.seat==='foot'&&Math.hypot(port.operator.x-goal.x,port.operator.z-goal.z)<=goal.radius;
    const height=s.grounded&&s.y===0,stable=!s.powered&&s.rpm<=HELICOPTER_TRANSFER.stoppedRPM;
    return {inside,height,stable,ready:inside&&height&&stable&&s.status==='running'};
  }
  if(t.stage===2){const ready=port.seat==='pilot'&&s.status==='running';return {inside:ready,height:s.grounded,stable:s.speed<.15,ready};}
  const inside=Math.hypot(s.x-goal.x,s.z-goal.z)<=goal.radius,height=s.grounded&&s.y===0;
  const stable=s.speed<.15&&Math.abs(s.verticalSpeed)<.1&&s.landings>(t.stage===3?t.departureLandings:0);
  return {inside,height,stable,ready:inside&&height&&stable&&s.status==='running'&&port.seat==='pilot'};
}
function advance(t){t.completed.push(HANDOVER_STEPS[t.stage].id);t.stage++;t.hold=0;if(t.stage===HANDOVER_STEPS.length)t.status='complete';}
export function inspectHelicopterHandover(t,port,{active=true}={}){
  if(!active||t.status!=='running'||t.stage!==1)return {ok:false,reason:'当前没有可清点的任务目标'};
  if(!helicopterHandoverReadiness(t,port).ready)return {ok:false,reason:'先熄火下机，步行进入清点标记，再按 F'};
  advance(t);return {ok:true,reason:'清点完成，请返回舱门登机'};
}
export function stepHelicopterHandover(t,port,dt){
  if(t.status!=='running'||port.version!==1||!Number.isFinite(dt)||dt<=0)return false;
  t.elapsed+=Math.min(dt,.1);
  if(port.craft.status==='crashed'){t.status='failed';t.hold=0;return false;}
  const ready=helicopterHandoverReadiness(t,port).ready;
  if(t.stage===1)return false; // Only an explicit interaction acknowledges inspection.
  if(t.stage===2){if(!ready)return false;t.departureLandings=port.craft.landings;advance(t);return true;}
  t.hold=ready?t.hold+Math.min(dt,.1):0;
  if(t.hold+1e-9<HANDOVER_STEPS[t.stage].seconds)return false;
  advance(t);return true;
}
export function helicopterHandoverResult(t){
  if(t.status!=='complete')return null;
  return Object.freeze({rule:HELICOPTER_HANDOVER_RULE,scope:'practice',eligibleForExpedition:false,timeMs:Math.round(t.elapsed*1000),completed:Object.freeze([...t.completed])});
}
