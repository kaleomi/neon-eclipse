import {IS_STATION,IS_ROOF,IS_TOWER,IS_TRAIN,IS_HARBOR} from './level.js';
import * as THREE from './node_modules/three/build/three.module.js';
import {STAGES} from './mission.js';
export function createMissionUI(){
 const root=document.createElement('section');root.id='mission-hud';root.hidden=true;
 root.innerHTML='<aside class="mission-tracker"><span>OPERATION / SHADOW BREACH</span><h2>夺回反应堆</h2><ol></ol><div class="mission-timer"></div><small>绿箱：医疗 · 橙箱：弹药<br>靠近自动拾取，满状态不会消耗</small></aside><div class="objective-marker"><b>◇</b><span></span></div><div class="interact-prompt"><span></span><div role="progressbar" aria-label="任务交互进度" aria-valuemin="0" aria-valuemax="100"><i></i></div></div>';
 document.body.append(root);if(IS_STATION){root.querySelector('.mission-tracker>span').textContent='OPERATION / LAST SERVICE';root.querySelector('h2').textContent='末班列车';}
 if(IS_ROOF){root.querySelector('.mission-tracker>span').textContent='OPERATION / SKYLINK';root.querySelector('h2').textContent='天穹信号';}
 if(IS_TOWER){root.querySelector('.mission-tracker>span').textContent='OPERATION / CONTROL SPIRE';root.querySelector('h2').textContent='中枢隔离';}
 if(IS_TRAIN){root.querySelector('.mission-tracker>span').textContent='OPERATION / RUNAWAY FREIGHT';root.querySelector('h2').textContent='列车接管';}
 if(IS_HARBOR){root.querySelector('.mission-tracker>span').textContent='OPERATION / STORM HARBOR';root.querySelector('h2').textContent='港口撤离';}
 const list=root.querySelector('ol');
 for(const s of STAGES){const item=document.createElement('li');item.textContent=s.title;list.append(item);}
 const marker=root.querySelector('.objective-marker'),prompt=root.querySelector('.interact-prompt'),progress=prompt.querySelector('[role=progressbar]');
 const projected=new THREE.Vector3(),forward=new THREE.Vector3();let lastIndex=-1;
 function update({playing,mission,camera,yaw,target,remaining,canInteract,busy,blockedReason,markerLabel}){
  root.hidden=!playing;if(!playing)return;
  const stage=mission.current,index=mission.state.index;const wrongFloor=stage.feetY!==undefined&&Math.abs(camera.position.y-1.7-stage.feetY)>=.7;
  if(index!==lastIndex){lastIndex=index;[...list.children].forEach((li,i)=>{li.dataset.state=i<index?'done':i===index?'current':'locked';});}
  const time=Math.floor(mission.state.time);root.querySelector('.mission-timer').textContent=`${String(Math.floor(time/60)).padStart(2,'0')}:${String(time%60).padStart(2,'0')} / ${remaining} 个敌人`;
  const distance=Math.hypot(target.x-camera.position.x,target.z-camera.position.z);
  projected.copy(target).project(camera);camera.getWorldDirection(forward);
  const front=target.clone().sub(camera.position).dot(forward)>0;
  const angle=Math.atan2(target.x-camera.position.x,-(target.z-camera.position.z))+yaw;
  const relative=Math.atan2(Math.sin(angle),Math.cos(angle));
  const x=front?(projected.x*.5+.5)*innerWidth:relative>0?innerWidth-65:65;
  const y=front?(-projected.y*.5+.5)*innerHeight:innerHeight*.42;
  const onscreen=front&&x>=55&&x<=innerWidth-55&&y>=110&&y<=innerHeight-170;
  const screenX=Math.max(85,Math.min(innerWidth-85,x));let screenY=Math.max(110,Math.min(innerHeight-170,y-45));
  if(screenX<260)screenY=Math.max(screenY,innerWidth<700?180:Math.min(425,innerHeight*.54));
  if(innerWidth>=700&&screenX>innerWidth-240)screenY=Math.max(screenY,Math.min(455,innerHeight*.57));
  marker.style.left=screenX+'px';marker.style.top=screenY+'px';
  marker.querySelector('b').textContent=onscreen?'◇':relative>0?'→':'←';marker.querySelector('span').textContent=(markerLabel||stage.short)+' / '+Math.ceil(distance)+' m';
  marker.hidden=stage.boss&&remaining===0;
  const near=distance<=2.8;prompt.classList.toggle('upload-mode',mission.state.defending);prompt.hidden=mission.state.defending?false:stage.boss||!near;
  if(!prompt.hidden){
   prompt.querySelector('span').textContent=mission.state.defending?(mission.state.progress>=stage.defenseDuration?(stage.defenseLabel||'上传')+'完成 · 清除剩余 '+remaining+' 个敌人':wrongFloor?'链路暂停 · 返回终端所在楼层':distance>stage.defenseRadius?'链路暂停 · 返回终端 '+stage.defenseRadius+' 米内':(stage.defenseLabel||'上传防守')+' '+Math.floor(mission.state.progress)+' / '+stage.defenseDuration+' 秒 · 可移动射击，无需按 E'):remaining>0?'清除当前区域威胁 · 剩余 '+remaining+' 个敌人':blockedReason?blockedReason:busy?'站定、停止射击并完成换弹':!canInteract?'面向目标，保持视线畅通':'按住 E · '+stage.action+'（松开或受击会中断）';
   const duration=mission.state.defending?stage.defenseDuration:stage.duration;const value=duration?mission.state.progress/duration*100:0;progress.setAttribute('aria-valuenow',String(Math.round(value)));progress.querySelector('i').style.width=value+'%';
  }
 }
 return {update};
}
