import {HELICOPTER_SITE,helicopterSpeed} from './helicopter-rules.js';
// Local practice only. No best-time records, difficulty groups, checkpoints or expedition ownership.
const [a,b]=HELICOPTER_SITE.pads;
export const HELICOPTER_LESSONS=Object.freeze([
  Object.freeze({id:'lift',title:'垂直起飞',hint:'按住 Shift，升至 8 m；旋翼需要约 2 秒建立升力。',x:a.x,z:a.z,y:8,radius:9,seconds:.5}),
  Object.freeze({id:'hover',title:'自稳悬停',hint:'在 A 坪上方 8–12 m 松开升降与姿态键，稳定悬停 3 秒。',x:a.x,z:a.z,y:10,radius:6,seconds:3}),
  Object.freeze({id:'translate',title:'平移转场',hint:'WASD 移向 B 坪上方；目标高度 11–17 m，松手或按空格制动。',x:b.x,z:b.z,y:14,radius:7,seconds:2}),
  Object.freeze({id:'land',title:'精确降落',hint:'保持水平，按 Ctrl 缓降至 B 坪；近地自动限制下降速度。',x:b.x,z:b.z,y:0,radius:7,seconds:1})
]);
export function createHelicopterTrial(){return {status:'ready',stage:0,hold:0,elapsed:0,completed:[]};}
export function startHelicopterTrial(t){if(t.status==='ready')t.status='running';}
export function helicopterLesson(t){return HELICOPTER_LESSONS[t.stage]||null;}
export function helicopterReadiness(t,s){
  const goal=helicopterLesson(t);if(!goal)return {inside:true,height:true,stable:true,ready:false};
  const inside=Math.hypot(s.x-goal.x,s.z-goal.z)<=goal.radius;
  let height,stable;
  if(t.stage===0){height=s.y>=8;stable=!s.grounded&&s.rpm>.85;}
  else if(t.stage===1){height=s.y>=8&&s.y<=12;stable=helicopterSpeed(s)<1.25&&Math.abs(s.vy)<.55&&!s.grounded;}
  else if(t.stage===2){height=s.y>=11&&s.y<=17;stable=helicopterSpeed(s)<1.8&&Math.abs(s.vy)<.65&&!s.grounded;}
  else{height=s.grounded&&s.y===0;stable=helicopterSpeed(s)<.15&&s.landings>0;}
  return {inside,height,stable,ready:inside&&height&&stable&&s.status==='running'};
}
export function stepHelicopterTrial(t,s,dt){
  if(t.status!=='running'||!Number.isFinite(dt)||dt<=0)return false;
  dt=Math.min(dt,.1);t.elapsed+=dt;
  if(s.status==='crashed'){t.status='failed';t.hold=0;return false;}
  const goal=helicopterLesson(t),ready=helicopterReadiness(t,s).ready;
  t.hold=ready?t.hold+dt:0;
  if(!ready||t.hold+1e-9<goal.seconds)return false;
  t.completed.push(goal.id);t.hold=0;t.stage++;
  if(t.stage===HELICOPTER_LESSONS.length)t.status='complete';
  return true;
}
