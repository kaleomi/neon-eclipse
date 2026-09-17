import * as T from './node_modules/three/build/three.module.js';
import {RECON,RECON_REASONS} from './recon-rules.js';
// Same plane-reference altitude as reconCondition; the 1.3 m offset is not terrain height.
export function reconVolume(g){return {radius:RECON.radius,bottom:g.minHeight+1.3,top:g.maxHeight+1.3,height:g.maxHeight-g.minHeight};}
export function reconHeightHint(p,g){const h=p.y-1.3;return {height:h,state:h<g.minHeight?'low':h>g.maxHeight?'high':'inside',text:h<g.minHeight?'过低 · 拉升进入圆柱':h>g.maxHeight?'过高 · 降低至圆柱内':'高度合格'};}
// Visual diagnostics only; mission state remains the sole authority for recording a scan.
export function reconReadiness(p,g){
 const delta=Math.atan2(Math.sin(g.yaw-p.yaw),Math.cos(g.yaw-p.yaw)),distance=Math.hypot(p.x-g.x,p.z-g.z),height=reconHeightHint(p,g);
 const heading=Math.abs(delta)<=RECON.headingTolerance,bank=Math.abs(p.roll)<=RECON.maxBank,vertical=Math.abs(p.verticalSpeed)<=RECON.maxVerticalSpeed;
 return [
  {id:'range',ok:distance<=RECON.radius&&!p.onGround&&!p.crashed,text:p.onGround?'先起飞':distance<=RECON.radius?'已进入扫描范围':'距区域 '+Math.ceil(Math.max(0,distance-RECON.radius))+' m'},
  {id:'height',ok:height.state==='inside',text:height.text},
  {id:'heading',ok:heading,text:heading?'航向已对准':(delta>0?'向右转 ':'向左转 ')+Math.round(Math.abs(delta)*180/Math.PI)+'°'},
  {id:'speed',ok:p.speed>=RECON.minSpeed&&p.speed<=RECON.maxSpeed,text:(p.speed*3.6).toFixed(1)+' km/h · '+(p.speed<RECON.minSpeed?'加速':p.speed>RECON.maxSpeed?'减速':'速度合格')},
  {id:'stable',ok:bank&&vertical,text:!bank?'放平机翼':!vertical?'减小升降率':'姿态稳定'}
 ];
}
export function bindVehicleGuidance(){
 const marker=document.querySelector('#world-goal'),brief=document.querySelector('#recon-height-guide'),point=new T.Vector3(),checks=document.querySelector('#recon-readiness'),scanMeter=document.querySelector('#goal-scan-progress');
 const write=(el,text)=>{if(el.textContent!==text)el.textContent=text;};
 const rows=new Map();for(const id of ['range','height','heading','speed','stable','scan']){const row=document.createElement('li');row.dataset.check=id;checks.append(row);rows.set(id,row);}
 return {update({camera,goal,position,visible,recon=false,mission}){
  marker.hidden=!visible||!goal;brief.hidden=!visible||!recon||!goal;
  scanMeter.hidden=!visible||!recon||!goal;
  if(!visible||!goal)return;
  camera.updateMatrixWorld();point.set(goal.x,recon?(goal.minHeight+goal.maxHeight)/2+1.3:goal.y??4,goal.z).applyMatrix4(camera.matrixWorldInverse);
  const behind=point.z>=0;if(Math.abs(point.z)<.001)point.z=behind?.001:-.001;point.applyMatrix4(camera.projectionMatrix);let x=point.x,y=-point.y;
  if(behind){x=-x;y=-y;if(Math.abs(x)<.05)x=1;}
  const outside=behind||Math.abs(x)>.75||Math.abs(y)>.6;
  if(outside){const scale=Math.max(Math.abs(x)/.75,Math.abs(y)/.6,1);x/=scale;y/=scale;}
  marker.style.left=Math.max(110,Math.min(innerWidth-110,(x+1)*innerWidth/2))+'px';marker.style.top=Math.max(recon&&innerWidth<=700?340:190,Math.min(innerHeight-210,(y+1)*innerHeight/2))+'px';
  marker.dataset.offscreen=String(outside);marker.querySelector('b').textContent=(outside?(Math.abs(y)>Math.abs(x)?(y<0?'▲ ':'▼ '):(x<0?'◀ ':'▶ ')):'◇ ')+(goal.name||'当前目标');
  marker.querySelector('span').textContent=Math.round(Math.hypot(position.x-goal.x,position.z-goal.z))+' m'+(outside?' · 转向此处':' · 当前目标');
  if(recon){const h=reconHeightHint(position,goal),condition=mission.phase==='takeoff'?'airborne':mission.recon.reason,reason=RECON_REASONS[condition];brief.dataset.height=h.state;
   brief.querySelector('strong').textContent='侦察高度 '+goal.minHeight+'–'+goal.maxHeight+' m';
   brief.querySelector('b').textContent='当前 '+Math.round(h.height)+' m · '+h.text;
   brief.querySelector('span').textContent=reason+' · 沿空中箭头飞向 '+Math.round((goal.yaw*180/Math.PI+360)%360)+'°';
   for(const check of [...reconReadiness(position,goal),{id:'scan',ok:condition==='hold'||condition==='ready',text:condition==='blocked'?'视线被遮挡':condition==='hold'||condition==='ready'?'视线清晰 · 可扫描':'先满足飞行条件'}]){const row=rows.get(check.id),ok=String(check.ok);if(row.dataset.ok!==ok)row.dataset.ok=ok;write(row,(check.ok?'✓ ':'△ ')+check.text);}
   const progress=Math.max(0,Math.min(1,mission.recon.progress/RECON.holdSeconds));scanMeter.querySelector('i').style.width=(progress*100)+'%';scanMeter.setAttribute('aria-valuenow',String(Math.round(progress*100)));
   write(scanMeter.querySelector('em'),(condition==='ready'?'扫描 ':condition==='hold'?'按住 F · ':'等待条件 · ')+mission.recon.progress.toFixed(1)+' / '+RECON.holdSeconds.toFixed(1)+' s');
   brief.dataset.ready=scanMeter.dataset.ready=String(condition==='hold'||condition==='ready');
  }
 }};
}
