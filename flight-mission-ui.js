import {bindFlightRecordsUI} from './flight-records-ui.js';
import {RECON,RECON_REASONS} from './recon-rules.js';
import {FLIGHT_MISSION,FLIGHT_PHASES,flightGoal,flightTitle,flightPhase,flightProgress,flightCourse} from './flight-mission.js';

export function bindFlightMissionUI({getMission,getPlane,start,exit}){
 const recordUI=bindFlightRecordsUI();
 const $=s=>document.querySelector(s);let startArmed=false,exitArmed=false,reconArmed=false;
 const startButton=$('#start-flight'),exitButton=$('#flight-free-drive');
 function reset(){recordUI.resetNotice();reconArmed=false;startArmed=false;exitArmed=false;$('#flight-result-actions').hidden=true;}
 startButton.addEventListener('click',()=>{if(!startArmed){startArmed=true;startButton.textContent='确认起飞任务 · 重置全部载具与路线';return;}start();});
 startButton.addEventListener('blur',()=>{startArmed=false;update();});
 exitButton.addEventListener('click',()=>{if(!exitArmed){exitArmed=true;exitButton.textContent='确认中止任务 · 返回机场自由试飞';return;}exit();});
 exitButton.addEventListener('blur',()=>{exitArmed=false;update();});
 $('#start-recon').addEventListener('click',()=>{if(!reconArmed){reconArmed=true;$('#start-recon').textContent='确认侦察 · 重置全部载具与路线';return;}start('recon');});
 $('#start-recon').addEventListener('blur',()=>{reconArmed=false;update();});
 $('#retry-flight').addEventListener('click',()=>start(getMission().type));
 $('#finish-flight-free').addEventListener('click',exit);
 function instruction(){
  const m=getMission(),p=getPlane(),g=flightGoal(m);
  if(m.status==='won'||m.status==='lost')return m.reason;
  if(m.phase==='upload')return '已返航 · 保持停稳，按住 F 上传记录 '+m.recon.uploadTime.toFixed(1)+' / 2.0 秒';
  if(m.type==='recon'&&(m.phase==='route'||m.phase==='takeoff'))return g.name+' · '+Math.round(Math.hypot(p.x-g.x,p.z-g.z))+' m / '+g.minHeight+'–'+g.maxHeight+' m / 航向 '+Math.round((g.yaw*180/Math.PI+360)%360)+'°';
  if(m.phase==='stop')return '油门降至 5% 以下，空格刹车 · 停稳 '+m.stopTime.toFixed(1)+' / 2.0 秒';
  return g.name+' · '+Math.round(Math.hypot(p.x-g.x,p.z-g.z))+' m'+(m.phase==='landing'?' · 北向保持对正，缓降至跑道':' / 高度 '+g.y+' m');
 }
 function update(){
  const m=getMission(),p=getPlane(),engaged=m.status!=='idle',seconds=Math.ceil(m.remaining);
  $('#flight-mission-readout').hidden=!engaged;exitButton.hidden=!engaged;
  if(!startArmed)startButton.textContent=engaged&&m.type==='return'?'重试飞行任务 · 归航试炼':'开始飞行任务 · 归航试炼';
  if(!reconArmed)$('#start-recon').textContent=engaged&&m.type==='recon'?'重试低空侦察 · 回声航线':'开始低空侦察 · 回声航线';
  $('#flight-mission-title').textContent=m.type==='recon'?'低空侦察':'归航试炼';
  if(!exitArmed)exitButton.textContent='结束任务，返回机场自由试飞';
  $('#flight-mission-phase').textContent=flightPhase(m);
  $('#flight-mission-time').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  if(engaged){
   $('.drive-objective h1').textContent=flightTitle(m);$('#drive-task').textContent=instruction();
   $('#route-label').textContent=flightProgress(m)+' · '+flightPhase(m);
   $('#route-fill').style.width=(m.status==='won'?100:(m.route.index+(m.approached?1:0))/(flightCourse(m).length+2)*100)+'%';
   $('#drive-time').textContent=m.elapsed.toFixed(1)+' s';
  }
  const recon=engaged&&m.type==='recon';$('#recon-scan-panel').hidden=!recon||!['route','takeoff','upload'].includes(m.phase);
  if(recon){const uploading=m.phase==='upload';$('#recon-scan-fill').style.width=(uploading?m.recon.uploadTime/RECON.uploadSeconds:m.recon.progress/RECON.holdSeconds)*100+'%';$('#recon-scan-status').textContent=uploading?'返航上传 · 按住 F（模拟通信）':RECON_REASONS[m.recon.reason];$('#recon-scan-count').textContent='记录 '+m.recon.records.length+'/3 · '+(uploading?m.recon.uploadTime:m.recon.progress).toFixed(1)+' / '+(uploading?2:1.5)+' s';$('#control-hints').textContent+=' · F 扫描 / 地面上传';if(!p.stall&&!p.crashed)$('#flight-warning').textContent='当前航向 '+Math.round((p.yaw*180/Math.PI+360)%360)+'° · 松开 F 或条件不符会清零当前进度。';}
  // Read-only telemetry for browser regression; no test-only control/mutation API.
  Object.assign(document.body.dataset,{flightMissionStatus:m.status,flightMissionType:m.type,reconProgress:m.recon.progress.toFixed(4),reconUpload:m.recon.uploadTime.toFixed(4),reconReason:m.recon.reason,reconRecords:JSON.stringify(m.recon.records),flightMissionPhase:m.phase,flightMissionGate:String(m.route.index),flightMissionRemaining:m.remaining.toFixed(4),flightMissionStop:m.stopTime.toFixed(4),flightPlane:JSON.stringify(Object.fromEntries(['x','y','z','yaw','pitch','roll','speed','throttle','landings','onGround','crashed'].map(k=>[k,typeof p[k]==='number'?+p[k].toFixed(5):p[k]])))});
 }
 function finish({record=true,expedition=false}={}){
  const m=getMission();if(record)recordUI.finish(m.result);$('#resume-drive').hidden=true;$('#flight-result-actions').hidden=expedition;
  const title=$('#drive-overlay-title');title.textContent=flightTitle(m)+' · '+(m.status==='won'?'返航成功':'任务失败');title.tabIndex=-1;
  $('#drive-overlay-copy').textContent=m.reason+'。用时 '+m.elapsed.toFixed(1)+' 秒 · '+flightProgress(m)+'。可重试或回到机场自由试飞；本轮结果不写入战役、星星或成就存档。';
  if(expedition)$('#drive-overlay-copy').textContent+=' 本轮属于先遣队，成绩和进度由上方先遣队面板保存；请在该面板继续或重试，不计入原单项飞行成绩。';
   title.focus({preventScroll:true});$('.drive-panel').scrollTop=0;
 }
 return {reset,update,finish,instruction};
}
