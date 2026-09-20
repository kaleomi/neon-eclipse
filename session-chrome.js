import {briefFor,stampFor} from './session-brief.js';
// Session chrome: the mission overlay / card, art stamp, compass, toast, damage flash, hitmarker, streak banner and the
// quality button. Owns the four transient timers that used to be top-level lets in app.js (toastTime / damageTime /
// hitTime / streakTime); app.js calls notify / flashDamage / flashHit / showStreak and ticks update(dt) once per frame.
// Markup, class names and timings are byte-for-byte what app.js used to inline.
export const NOTICE_SECONDS=3,DAMAGE_SECONDS=.3,STREAK_SECONDS=1.6;
export const HEADINGS=['N','NE','E','SE','S','SW','W','NW'];
export function streakLabel(step){return step>=10?'连续击破 ×10 // 清场':step>=5?'连续击破 ×5 // 压制':'连续击破 ×3';}
export function headingLabel(yaw){const heading=((Math.round(-yaw*180/Math.PI)%360)+360)%360;return String(heading).padStart(3,'0')+'° / '+HEADINGS[Math.round(heading/45)%8];}
export function createSessionChrome({mapId,document:doc=globalThis.document}){
 const $=s=>doc.querySelector(s);
 const overlay=doc.createElement('section');
 overlay.className='mission-overlay';
 overlay.dataset.map=mapId;
 overlay.innerHTML=`<div class="mission-card"><span id="session-eyebrow" class="eyebrow">NEON ECLIPSE / SECTOR K-19</span><h2 id="session-title">突破<span>暗影封锁</span></h2><p id="brief">启动西侧冷却装置，取得东侧权限，解除反应堆封锁。击败 Warden 后返回南部撤离。橙色突击、紫色远程、金色重装：识别敌人，选择打法。</p><div class="controls"><span><b>W A S D</b>移动</span><span><b>鼠标</b>瞄准 / 左键射击</span><span><b>1 / 2 / 3 · 滚轮</b>主武器 / 副武器 / 近战</span><span><b>R / SHIFT</b>换弹 / 冲刺</span><span><b>SPACE / ESC</b>跳跃 / 暂停</span><span><b>右键 / E</b>瞄准 / 按住交互</span></div><button id="deploy">开始行动 ↗</button><small id="lock-note">G 按住预览 / 松开投掷无伤害 EMP · SPACE 跳跃 · 步枪连射 / 近战连击均可按住左键 · E 交互 · 红色加号补给恢复生命，子弹标识补给补充弹药</small></div>`;
 doc.body.append(overlay);
 const stamp=doc.createElement('div'),compass=doc.createElement('div'),toast=doc.createElement('div'),damageScreen=doc.createElement('div'),hit=doc.createElement('div'),streakBanner=doc.createElement('div');
 let toastTime=0,damageTime=0,hitTime=0,streakTime=0;
 // Called right after createLevelMenu(), before the campaign / achievement UIs read the card (same order as before).
 function applyBrief(){
  const brief=briefFor(mapId);
  if(brief.topstat!==null){$('#session-title').innerHTML=brief.title;$('#brief').textContent=brief.brief;$('#session-eyebrow').textContent=brief.eyebrow;$('.topstat').textContent=brief.topstat;}
  overlay.dataset.map=mapId;
 }
 // Appends stamp / compass / toast / damage / hitmarker after the campaign & achievement UIs, in the same DOM order
 // app.js used, so stacking between fixed elements is unchanged.
 function mount(){
  const s=stampFor(mapId);stamp.className='art-stamp';stamp.innerHTML=s.html;if(s.className)stamp.classList.add(s.className);doc.body.append(stamp);
  compass.className='compass';compass.innerHTML='<b>000° / N</b>';doc.body.append(compass);
  toast.className='toast';doc.body.append(toast);
  damageScreen.className='damage-screen';doc.body.append(damageScreen);
  hit.className='hitmarker';hit.textContent='×';doc.body.append(hit);
 }
 // Appended later than the rest (after the loadout / drops UIs) exactly where app.js used to create it.
 function mountStreakBanner(){streakBanner.className='streak-banner';doc.body.append(streakBanner);}
 function createQualityButton(){
  const qualityButton=doc.createElement('button');qualityButton.id='quality';qualityButton.type='button';qualityButton.textContent='画质：精细 / 按 Q 切换';qualityButton.setAttribute('aria-pressed','false');$('.mission-card').append(qualityButton);
  return qualityButton;
 }
 return {
  overlay,stamp,compass,toast,damageScreen,hit,streakBanner,$,applyBrief,mount,mountStreakBanner,createQualityButton,
  notify(text,seconds=NOTICE_SECONDS){toast.textContent=text;toastTime=seconds;},
  noticeVisible:()=>toastTime>0,
  flashDamage(){damageTime=DAMAGE_SECONDS;},
  flashHit(seconds){hitTime=seconds;},
  showStreak(step){if(!step)return;streakBanner.textContent=streakLabel(step);streakBanner.dataset.step=String(step);streakBanner.dataset.show='true';streakTime=STREAK_SECONDS;},
  setHeading(yaw){compass.firstChild.textContent=headingLabel(yaw);},
  timers:()=>({toastTime,damageTime,hitTime,streakTime}),
  update(dt){
   toastTime=Math.max(0,toastTime-dt);toast.style.opacity=toastTime>0?'1':'0';damageTime=Math.max(0,damageTime-dt);damageScreen.style.opacity=damageTime*2;hitTime=Math.max(0,hitTime-dt);hit.style.opacity=hitTime>0?'1':'0';
   if(streakTime>0){streakTime-=dt;if(streakTime<=0)streakBanner.dataset.show='false';}
  }
 };
}
