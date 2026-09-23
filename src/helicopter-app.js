import * as T from 'three';
import {HELICOPTER,HELICOPTER_SITE,createHelicopter,startHelicopter,stepHelicopter,helicopterSpeed} from './helicopter-rules.js';
import {createHelicopterTrial,startHelicopterTrial,stepHelicopterTrial,helicopterLesson,helicopterReadiness,HELICOPTER_LESSONS} from './helicopter-trial.js';
import {createHelicopterModel,createHelicopterSite,makeHelicopterLabel} from './helicopter-world.js';
import {createHelicopterAudio} from './helicopter-audio.js';
import {createHelicopterTransfer,setHelicopterEngine,exitHelicopter,boardHelicopter,stepHelicopterWalking,helicopterDoors,helicopterTaskSnapshot} from './helicopter-transfer.js';
import {HANDOVER_STEPS,createHelicopterHandover,startHelicopterHandover,helicopterHandoverGoal,helicopterHandoverReadiness,inspectHelicopterHandover,stepHelicopterHandover} from './helicopter-handover.js';
import {createHelicopterTransferWorld} from './helicopter-transfer-world.js';
const handoverMode=new URLSearchParams(location.search).get('task')==='handover';

const $=s=>document.querySelector(s),overlay=$('#heli-overlay'),keys=new Set(),audio=createHelicopterAudio();
let craft=createHelicopter(),trial=createHelicopterTrial(),mode='ready',cameraMode='follow',resetArmed=false,dirty=true,last=performance.now(),lastDraw=-Infinity,noticeUntil=0;
let transfer=createHelicopterTransfer(craft),handover=createHelicopterHandover();
const activeTask=()=>handoverMode?handover:trial;
function currentGoal(){
  const goal=handoverMode?helicopterHandoverGoal(handover):helicopterLesson(trial);
  if(handoverMode&&handover.stage===2){const door=helicopterDoors(craft).sort((a,b)=>Math.hypot(a.x-transfer.walker.x,a.z-transfer.walker.z)-Math.hypot(b.x-transfer.walker.x,b.z-transfer.walker.z))[0];return {...goal,...door,radius:1.8};}
  return goal;
}
let renderer;
try{renderer=new T.WebGLRenderer({antialias:false,powerPreference:'low-power'});}
catch(error){document.body.dataset.heliMode='error';$('#heli-overlay-title').textContent='无法创建 3D 画面';$('#heli-overlay-copy').textContent='此原型需要 WebGL 2。请检查浏览器硬件加速；没有读取或修改任何存档。';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.23;
const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','H-01 直升机试飞画面；Shift 上升，C 或 Ctrl 下降，WASD 姿态，Q E 偏航');$('#heli-scene').append(canvas);
const scene=new T.Scene();scene.background=new T.Color(0x829f97);scene.fog=new T.Fog(0x829f97,120,330);
scene.add(new T.HemisphereLight(0xe4f1df,0x314541,2.8));const sun=new T.DirectionalLight(0xffe2b6,3.3);sun.position.set(-45,70,30);scene.add(sun);
const camera=new T.PerspectiveCamera(52,innerWidth/innerHeight,.1,500);
const model=createHelicopterModel(),site=createHelicopterSite({makeLabel:makeHelicopterLabel});scene.add(model.root,site.root);
const transferWorld=handoverMode?createHelicopterTransferWorld():null;if(transferWorld)scene.add(transferWorld.root);
const cameraTarget=new T.Vector3(),cameraPosition=new T.Vector3();
const map=$('#heli-map'),ctx=map.getContext('2d');
const directions=['N','NE','E','SE','S','SW','W','NW'];
const held=(...codes)=>codes.some(c=>keys.has(c));
const controls=()=>({forward:Number(held('KeyW','ArrowUp'))-Number(held('KeyS','ArrowDown')),right:Number(held('KeyD','ArrowRight'))-Number(held('KeyA','ArrowLeft')),
  lift:Number(held('ShiftLeft','ShiftRight'))-Number(held('ControlLeft','ControlRight','KeyC')),yaw:Number(held('KeyE'))-Number(held('KeyQ')),brake:held('Space')});
function clearInput(){keys.clear();}
function notify(text){$('#heli-notice').textContent=text;noticeUntil=performance.now()+4500;$('#heli-notice').classList.add('visible');}
function publish(){
  const d=document.body.dataset;d.heliMode=mode;d.heliStatus=craft.status;d.heliTrial=activeTask().status;d.heliStage=String(activeTask().stage);d.heliGrounded=String(craft.grounded);d.heliLandings=String(craft.landings);
  for(const f of ['x','y','z','vx','vy','vz','yaw','pitch','roll','rpm','elapsed'])d['heli'+f[0].toUpperCase()+f.slice(1)]=craft[f].toFixed(5);
  d.heliTask=handoverMode?'handover':'flight';d.heliSeat=transfer.seat;d.heliPowered=String(craft.powered);d.heliWalkerX=transfer.walker.x.toFixed(5);d.heliWalkerZ=transfer.walker.z.toFixed(5);d.heliEvent=transfer.lastEvent?.type||'none';
  d.heliHold=activeTask().hold.toFixed(4);d.heliCamera=cameraMode;d.heliAudio=audio.snapshot().state;
}
function syncButtons(){
  const active=mode==='active';$('#heli-pause').disabled=!active;$('#heli-camera').disabled=!active;$('#heli-reset').disabled=!active;$('#heli-sound').disabled=!active;
  for(const id of ['heli-engine','heli-seat'])$('#'+id).disabled=!active;
  $('#heli-resume').disabled=mode==='error';$('#heli-overlay-reset').hidden=mode==='ready'||mode==='error'||mode==='crashed';
  $('#heli-sound').setAttribute('aria-pressed',String(audio.snapshot().enabled));$('#heli-sound').textContent='旋翼音：'+(audio.snapshot().enabled?'开':'关');
}
function showPause(title,copy){
  overlay.hidden=false;$('#heli-overlay-title').textContent=title;$('#heli-overlay-copy').textContent=copy;
  $('#heli-resume').innerHTML=(mode==='crashed'?'重新试飞':'继续试飞')+' <span>↗</span>';
  $('#heli-overlay-reset').textContent='回到 A 坪，重新练习';syncButtons();$('#heli-resume').focus();dirty=true;
}
function pause(reason='已暂停，飞行状态保持不变。'){
  if(mode!=='active')return;mode='paused';clearInput();audio.pause();resetArmed=false;
  showPause('试飞已暂停',reason+' 继续后不会补算离开页面期间的时间。');publish();
}
function reset(){
  clearInput();audio.pause();craft=createHelicopter();trial=createHelicopterTrial();transfer=createHelicopterTransfer(craft);handover=createHelicopterHandover();cameraMode='follow';mode='ready';resetArmed=false;last=performance.now();
  $('#heli-overlay-title').innerHTML=handoverMode?'落地，再出发<span>H-02 换乘训练</span>':'旋翼之上<span>H-01 试飞计划</span>';$('#heli-overlay-copy').textContent='已回到 A 起降坪。此次练习仅存在本页内存，不影响任何原游戏进度。';
  $('#heli-resume').innerHTML='开始试飞 <span>↗</span>';overlay.hidden=false;syncButtons();publish();updateHUD();dirty=true;$('#heli-resume').focus();
}
function resume(){
  if(mode==='error')return;
  if(mode==='crashed')reset();
  resetArmed=false;if(craft.status==='ready'&&!startHelicopter(craft))return;if(craft.status!=='running')return;
  if(handoverMode)startHelicopterHandover(handover);else startHelicopterTrial(trial);mode='active';clearInput();overlay.hidden=true;last=performance.now();
  audio.resume();syncButtons();canvas.focus();publish();dirty=true;
}
function requestReset(){
  if(resetArmed){reset();return;}
  if(mode==='active')pause();if(mode==='ready'){reset();return;}
  resetArmed=true;showPause('确认回到 A 坪？','将放弃本局练习，重置直升机的位置、旋翼和步骤。没有存档或成绩会被覆盖。');
  $('#heli-overlay-reset').hidden=false;$('#heli-overlay-reset').textContent='确认回到 A 坪';$('#heli-overlay-reset').focus();
}
function crash(){
  mode='crashed';trial.status='failed';if(handover.status!=='complete')handover.status='failed';clearInput();audio.pause();showPause('试飞中止',craft.reason+'。建议先升至安全高度再平移；落地前松开姿态键，用空格降低速度。');publish();
}
function updateCamera(dt=1){
  const yaw=craft.yaw,c=Math.cos(yaw),n=Math.sin(yaw),s=mode==='ready'?1:Math.min(1,1-Math.exp(-5*dt));
  if(handoverMode&&transfer.seat==='foot'){
    const p=transfer.walker,c=Math.cos(p.yaw),n=Math.sin(p.yaw);
    if(cameraMode==='top')cameraPosition.set(p.x,25,p.z+2);
    else cameraPosition.set(p.x-8*n,5.4,p.z+8*c);
    cameraTarget.set(p.x,.95,p.z);camera.position.lerp(cameraPosition,s||1);camera.lookAt(cameraTarget);return;
  }
  if(cameraMode==='top'){
    cameraPosition.set(craft.x,craft.y+46,craft.z+8);cameraTarget.set(craft.x,craft.y,craft.z);
  }else{
    cameraPosition.set(craft.x+18*c-25*n,craft.y+15,craft.z+18*n+25*c);
    const offset=mode==='ready'&&innerWidth>760?6:0;
    cameraTarget.set(craft.x-offset*.82,craft.y+1.5,craft.z+offset*.58-3);
  }
  camera.position.lerp(cameraPosition,s||1);camera.lookAt(cameraTarget);
}
function updateMap(goal){
  if(!ctx)return;const size=180,pad=13,scale=(size-pad*2)/(HELICOPTER_SITE.bounds*2);
  const p=(x,z)=>[size/2+x*scale,size/2+z*scale];ctx.clearRect(0,0,size,size);ctx.strokeStyle='#6e998b40';ctx.lineWidth=1;
  for(let i=1;i<6;i++){const a=pad+i*(size-2*pad)/6;ctx.beginPath();ctx.moveTo(a,pad);ctx.lineTo(a,size-pad);ctx.moveTo(pad,a);ctx.lineTo(size-pad,a);ctx.stroke();}
  ctx.strokeRect(pad,pad,size-pad*2,size-pad*2);
  for(const b of HELICOPTER_SITE.obstacles){const [x,z]=p(b.minX,b.minZ);ctx.fillStyle='#b4906e8a';ctx.fillRect(x,z,(b.maxX-b.minX)*scale,(b.maxZ-b.minZ)*scale);}
  const [a,b]=HELICOPTER_SITE.pads;ctx.setLineDash([3,4]);ctx.strokeStyle='#c5d7b94a';ctx.beginPath();ctx.moveTo(...p(a.x,a.z));ctx.lineTo(...p(b.x,b.z));ctx.stroke();ctx.setLineDash([]);
  for(const site of HELICOPTER_SITE.pads){const [x,z]=p(site.x,site.z);ctx.strokeStyle='#ebc489';ctx.beginPath();ctx.arc(x,z,site.radius*scale,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#d6dfc9';ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText(site.id,x,z+3);}
  if(goal){const [x,z]=p(goal.x,goal.z);ctx.strokeStyle='#91e1ca';ctx.beginPath();ctx.arc(x,z,goal.radius*scale+3,0,Math.PI*2);ctx.stroke();}
  const [x,z]=p(craft.x,craft.z);ctx.save();ctx.translate(x,z);ctx.rotate(craft.yaw);ctx.fillStyle='#abf6d6';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,5);ctx.lineTo(0,3);ctx.lineTo(-4,5);ctx.closePath();ctx.fill();ctx.restore();
  if(handoverMode&&transfer.seat==='foot'){ctx.fillStyle='#f9cd84';ctx.beginPath();ctx.arc(...p(transfer.walker.x,transfer.walker.z),3,0,Math.PI*2);ctx.fill();}
  ctx.textAlign='left';ctx.font='8px monospace';ctx.fillStyle='#a6c8b4';ctx.fillText('N ↑',14,9);
}
function updateHUD(){
  const trial=activeTask(),goal=currentGoal(),ready=handoverMode?helicopterHandoverReadiness(handover,helicopterTaskSnapshot(transfer,craft)):helicopterReadiness(trial,craft),speed=helicopterSpeed(craft),angle=((handoverMode&&transfer.seat==='foot'?transfer.walker.yaw:craft.yaw)*180/Math.PI+360)%360;
  $('#heli-step').textContent=trial.status==='complete'?'04 / 04':String(Math.min(4,trial.stage+1)).padStart(2,'0')+' / 04';
  $('#heli-lesson-title').textContent=trial.status==='complete'?'试飞完成':goal?.title||'自由试飞';
  $('#heli-lesson-hint').textContent=trial.status==='complete'?'四项练习完成。可继续自由试飞，或回 A 坪再练；本局结果不写入任何成绩。':goal?.hint||'';
  document.querySelectorAll('[data-lesson]').forEach((el,i)=>{el.classList.toggle('current',i===trial.stage);el.classList.toggle('done',i<trial.stage);});
  const fraction=goal?(goal.seconds>0?Math.min(1,trial.hold/goal.seconds):0):1;$('#heli-hold-fill').style.width=(fraction*100)+'%';$('.hold-track').setAttribute('aria-valuenow',String(Math.round(fraction*100)));
  $('#heli-hold-label').textContent=trial.status==='complete'?'本局完成 · 没有写入成绩':mode==='ready'?'等待旋翼建立转速':ready.ready?(goal.seconds>0?`保持稳定 ${trial.hold.toFixed(1)} / ${goal.seconds.toFixed(1)} 秒`:'按 F 确认清点'):'进入目标范围、高度并保持稳定';
  for(const [id,value,title] of [['heli-in-range',ready.inside,'范围'],['heli-at-height',ready.height,'高度'],['heli-stable',ready.stable,'稳定']]){const el=$('#'+id);el.textContent=title+(value?' ✓':' ○');el.classList.toggle('ready',value);}
  $('#heli-altitude').textContent=craft.y.toFixed(1);$('#heli-vspeed').textContent=(craft.vy>0?'+':'')+craft.vy.toFixed(1);$('#heli-speed').textContent=speed.toFixed(1);
  $('#heli-rpm').textContent=Math.round(craft.rpm*100)+'%';$('#heli-rpm-meter').value=craft.rpm*100;
  $('#heli-bearing').innerHTML=String(Math.round(angle)%360).padStart(3,'0')+'° <span>'+directions[Math.round(angle/45)%8]+'</span>';
  $('#heli-camera-label').textContent=cameraMode==='top'?'俯视视角 · V 返回跟随':'跟随视角 · V 切换俯视';
  $('#heli-time').textContent=String(Math.floor(trial.elapsed/60)).padStart(2,'0')+':'+String(Math.floor(trial.elapsed%60)).padStart(2,'0');
  $('#heli-flight-state').textContent=mode==='crashed'?'试飞中止':mode==='paused'?'已暂停':mode==='ready'?'等待试飞':craft.rpm<.85?'旋翼建立转速':craft.grounded?'起降坪待命':'飞行中 · 自稳开启';
  const warning=$('#heli-warning');let text='垂直速度自稳 · 近地缓降辅助',danger=false;
  if(craft.y>53){text='接近 65 m 空域上限（含旋翼包络）';danger=true;}
  else if(craft.y<5&&!craft.grounded&&(speed>2.2||Math.abs(craft.roll)>.2||Math.abs(craft.pitch)>.2||craft.vy< -1.6)){text='着陆风险：松开姿态键，用空格稳定';danger=true;}
  else if(craft.y<4&&!craft.grounded)text='近地缓降辅助 · 保持水平再着陆';
  if(mode==='crashed'){text=craft.reason;danger=true;}warning.textContent=text;warning.classList.toggle('danger',danger);
  if(handoverMode){
    $('#heli-engine').textContent=(craft.powered?'熄火':'启动')+' · I';$('#heli-seat').textContent=(transfer.seat==='foot'?'互动 / 登机':'下机')+' · F';
    const nearDoor=Math.min(...helicopterDoors(craft).map(p=>Math.hypot(p.x-transfer.walker.x,p.z-transfer.walker.z)));
    const hint=transfer.seat==='foot'?`步行：WASD 移动，Q / E 转向；距舱门 ${nearDoor.toFixed(1)} m。F 清点或登机。`:
      !craft.grounded?'飞行中不能下机或熄火；先制动、缓降着陆。':craft.powered?'已落地：按 I 熄火，再等待旋翼低于 8% 后按 F 下机。':craft.rpm>.08?'旋翼正在降速，请稍候。':'可按 F 下机；或按 I 启动后 Shift 起飞。';
    if($('#heli-transfer-hint').textContent!==hint)$('#heli-transfer-hint').textContent=hint;
    if(transfer.seat==='foot')$('#heli-flight-state').textContent=mode==='paused'?'步行已暂停':'步行中 · 载具留在原地';
    if(trial.status==='complete'){$('#heli-lesson-title').textContent='换乘训练完成';$('#heli-lesson-hint').textContent='B 坪清点与 A 坪返航完成。仅本页训练，不是先遣队第 5 关通关；可回 A 坪重新练习。';}
  }
  updateMap(goal);
}
audio.subscribe(()=>publish());
$('#heli-resume').addEventListener('click',resume);$('#heli-pause').addEventListener('click',()=>pause());
$('#heli-reset').addEventListener('click',requestReset);$('#heli-overlay-reset').addEventListener('click',requestReset);
function cameraToggle(){if(mode!=='active')return;cameraMode=cameraMode==='follow'?'top':'follow';dirty=true;publish();canvas.focus();}
$('#heli-camera').addEventListener('click',cameraToggle);
async function soundToggle(){
  if(mode!=='active')return;const desired=!audio.snapshot().enabled;const ok=await audio.setEnabled(desired);syncButtons();publish();if(mode==='active')canvas.focus();if(desired&&!ok&&mode==='active')notify('浏览器音频暂不可用；不影响试飞。');
}
$('#heli-sound').addEventListener('click',soundToggle);
function transferAction(kind){
  if(!handoverMode||mode!=='active')return;
  let result;
  if(kind==='engine')result=setHelicopterEngine(transfer,craft,!craft.powered);
  else if(transfer.seat==='pilot')result=exitHelicopter(transfer,craft);
  else if(handover.stage===1&&helicopterHandoverReadiness(handover,helicopterTaskSnapshot(transfer,craft)).ready)result=inspectHelicopterHandover(handover,helicopterTaskSnapshot(transfer,craft));
  else result=boardHelicopter(transfer,craft);
  if(result.ok){clearInput();cameraMode='follow';notify(result.reason||({exited:'已下机 · WASD 步行，Q / E 转向',boarded:'已登机 · 按 I 启动；登机不会自动点火','engine-started':'发动机启动 · 等待转速后起飞','engine-stopped':'已熄火 · 等待旋翼低于 8% 后下机'}[result.event?.type]));}
  else notify(result.reason);
  publish();updateHUD();dirty=true;canvas.focus();
}
$('#heli-engine').addEventListener('click',()=>transferAction('engine'));$('#heli-seat').addEventListener('click',()=>transferAction('seat'));
const flightKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','ControlLeft','ControlRight','KeyC','KeyQ','KeyE','Space']);
window.addEventListener('keydown',e=>{
  if(e.isComposing||e.altKey||e.metaKey)return;
  if(e.code==='Escape'){e.preventDefault();if(e.repeat)return;if(mode==='active')pause();else if(mode==='paused')resume();return;}
  if(mode!=='active')return;
  if(e.code==='Space'&&e.target instanceof HTMLElement&&e.target.closest('button'))return;
  if(flightKeys.has(e.code)||['KeyR','KeyV','KeyM'].includes(e.code)||(handoverMode&&['KeyI','KeyF'].includes(e.code)))e.preventDefault();if(e.repeat)return;
  if(handoverMode&&e.code==='KeyI'){transferAction('engine');return;}if(handoverMode&&e.code==='KeyF'){transferAction('seat');return;}
  if(e.code==='KeyR'){requestReset();return;}if(e.code==='KeyV'){cameraToggle();return;}if(e.code==='KeyM'){soundToggle();return;}
  if(flightKeys.has(e.code))keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>pause('失去焦点，已自动暂停。'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('离开页面，已自动暂停。');});
window.addEventListener('pagehide',()=>{pause('离开页面，已自动暂停。');audio.pause();});
overlay.addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;const all=[...overlay.querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden),first=all[0],end=all.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();end?.focus();}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first?.focus();}
});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause('图形上下文丢失，请刷新此独立页面。');mode='error';clearInput();audio.pause();syncButtons();publish();$('#heli-resume').textContent='请刷新此独立页面';notify('图形上下文已丢失。此页没有存档需要恢复。');});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);dirty=true;});
function frame(now){
  requestAnimationFrame(frame);const dt=Math.max(0,Math.min(HELICOPTER.maxFrame,(now-last)/1000));last=now;
  if(mode==='active'){
    const before=activeTask().stage,input=controls();
    stepHelicopter(craft,transfer.seat==='pilot'?input:{},dt,HELICOPTER_SITE,(s,h)=>{
      if(handoverMode){stepHelicopterWalking(transfer,s,input,h);stepHelicopterHandover(handover,helicopterTaskSnapshot(transfer,s),h);}
      else stepHelicopterTrial(trial,s,h);
    });audio.update(craft);
    if(craft.status==='crashed')crash();else if(activeTask().stage!==before)notify(activeTask().status==='complete'?'练习完成。此结果只在本页显示，不写战役成绩。':'下一步 · '+currentGoal().title);
    publish();
  }
  if(noticeUntil&&now>noticeUntil){noticeUntil=0;$('#heli-notice').classList.remove('visible');}
  if(!dirty&&(mode!=='active'||now-lastDraw<1000/30))return;
  lastDraw=now;model.update(craft);transferWorld?.update(transfer,craft,handover);site.update(craft,currentGoal());updateCamera(dt||1);updateHUD();renderer.render(scene,camera);dirty=false;
}
if(handoverMode){
  document.title='H-02 换乘训练 · NEON ECLIPSE';$('#heli-transfer-controls').hidden=false;
  $('.header-status').innerHTML='<i></i> H-02 <span>换乘训练 · 不写存档</span>';
  $('#heli-overlay-title').innerHTML='落地，再出发<span>H-02 换乘训练</span>';
  $('#heli-overlay-copy').textContent='A 坪起飞 → B 坪落地 → 熄火下机 → 步行清点 → 登机返航。第 5 关任务接口的独立练习，不推进先遣队。';
  $('.briefing-tag').textContent='SAFE TRANSFER / 安全上下机';
  $('.briefing-controls').innerHTML='<p><b>飞行保持原操作</b><span>Shift 升，C 降；WASD 姿态，Q / E 偏航，空格制动。</span></p><p><b>安全下机</b><span>落地停稳后 I 熄火，转速低于 8% 才能 F 下机；空中禁止换乘。</span></p><p><b>步行与登机</b><span>WASD 步行，Q / E 转向。F 清点 / 登机；登机后须 I 点火。</span></p>';
  document.querySelectorAll('[data-lesson]').forEach((el,i)=>el.textContent=['01 抵达','02 清点','03 登机','04 返航'][i]);
  $('#heli-mode-link').href='helicopter.html';$('#heli-mode-link').textContent='返回 H-01 基础飞行练习';
  canvas.setAttribute('aria-label','H-02 换乘训练；I 启停发动机，F 下机、清点或登机；WASD 移动，Q E 转向');
}
$('#heli-resume').innerHTML='开始试飞 <span>↗</span>';syncButtons();publish();model.update(craft);transferWorld?.update(transfer,craft,handover);site.update(craft,currentGoal());updateCamera(1);updateHUD();$('#heli-resume').focus();requestAnimationFrame(frame);
