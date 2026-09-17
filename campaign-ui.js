import {MAP_TITLE} from './level.js';
import {STAGES} from './mission.js';
const RADIO={
 coolant:['中继员 / LINK-7','先恢复西侧冷却。冷却回路未闭合时，中央控制台不会接受访问凭证。'],
 access:['中继员 / LINK-7','清理东侧守卫并启动权限上传。上传会触发增援；保持在终端 12 米内，边移动边防守。'],
 reactor:['中继员 / LINK-7','权限已到账。返回中央控制台解除封锁，提前检查备用弹药，Warden 就在核心附近。'],
 warden:['中继员 / LINK-7','守住侧翼，观察它的蓄能动作。过载时集中射击青色胸口核心。'],
 extract:['中继员 / LINK-7','反应堆已接管。返回南部信标，清理追兵后呼叫撤离；不要在这里停留。']
};
export function createCampaignUI(store,actions){
 const menu=document.createElement('section');menu.className='campaign-menu';
 menu.innerHTML='<div class="campaign-actions"><button id="continue-checkpoint" type="button">继续检查点</button><button id="retry-checkpoint" type="button">重试本阶段</button></div><p class="checkpoint-note"></p><details><summary>阶段训练</summary><div class="stage-choices"></div></details>';
 document.querySelector('.mission-card').append(menu);
 const resume=menu.querySelector('#continue-checkpoint'),retry=menu.querySelector('#retry-checkpoint'),list=menu.querySelector('.stage-choices');
 resume.addEventListener('click',actions.continue);retry.addEventListener('click',actions.retry);
 STAGES.forEach((stage,i)=>{const button=document.createElement('button');button.type='button';button.dataset.stage=String(i);button.textContent=String(i+1).padStart(2,'0')+' / '+stage.title;button.addEventListener('click',()=>actions.replay(i));list.append(button);});
 const radio=document.createElement('aside');radio.className='radio-message';radio.hidden=true;radio.innerHTML='<b></b><p></p>';document.body.append(radio);
 const modeTag=document.createElement('div');modeTag.className='run-mode';modeTag.hidden=true;modeTag.textContent='阶段训练 / 不影响主行动检查点';document.body.append(modeTag);
 let radioTime=0;
 function announce(stage,training=false){
  const text=stage.radio?['中继员 / LINK-7',stage.radio]:RADIO[stage.id];radio.querySelector('b').textContent=(training?'训练频道 / ':'')+text[0];radio.querySelector('p').textContent=text[1];radioTime=7;
 }
 function refresh(state,mode){
  menu.hidden=mode==='journey';const checkpoint=store.checkpoint;
  resume.hidden=(!checkpoint&&!(state==='paused'&&mode==='replay'))||((state==='paused'||state==='lost')&&mode!=='replay');retry.hidden=!(state==='paused'||state==='lost')||(!checkpoint&&mode!=='replay');
  resume.textContent=checkpoint?(mode==='replay'?'返回主行动 / ':'继续检查点 / ')+STAGES[checkpoint.stageIndex].short:'退出训练 / 开始新行动';
  retry.textContent=state==='paused'?'重置本阶段 / 回到检查点':'重试本阶段 / 回到检查点';
  menu.querySelector('.checkpoint-note').textContent=!store.persistent?'浏览器存储不可用：本次可重试，关闭页面后无法恢复。':checkpoint?'已保存阶段入口。战斗中刷新会回到检查点；“新行动”会替换当前检查点。':store.completed?'行动已完成，可重玩已解锁阶段。':'阶段入口自动保存；支持刷新后继续。';
  menu.querySelector('summary').textContent='阶段训练 / 已解锁 '+(store.unlocked+1)+' / '+STAGES.length;
  [...list.children].forEach((button,i)=>{button.disabled=i>store.unlocked;button.title=i>store.unlocked?'完成主行动前置阶段后解锁':'独立训练，不覆盖主行动检查点';});
 }
 function update(dt,playing,mode){radioTime=Math.max(0,radioTime-dt);radio.hidden=!playing||radioTime<=0;modeTag.hidden=!playing||!['replay','journey'].includes(mode);modeTag.textContent=mode==='journey'?'连续战役 / '+MAP_TITLE:'阶段训练 / 不影响主行动检查点';}
 return {announce,refresh,update};
}
