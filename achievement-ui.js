import {ACHIEVEMENTS,ACHIEVEMENT_KEY,CHALLENGE_MAPS,createAchievementStore,createChapterAttempt} from './chapter-achievements.js';
import {CHAPTER_NAMES, selectAchievementGallery, createAchievementNotices, createAchievementToast} from './achievement-gallery.js';
import {deriveChallengeProgress} from './challenge-progress.js';

function progressElement(model) {
  const root=document.createElement('div');root.className='challenge-attempt';root.dataset.status=model.status;
  const heading=document.createElement('div');heading.className='challenge-attempt-heading';
  const tag=document.createElement('span');tag.textContent='本轮';
  const status=document.createElement('b');status.textContent=model.label;
  heading.append(tag,status);root.append(heading);
  const detail=document.createElement('p');detail.textContent=model.detail;root.append(detail);
  if(model.max&&model.applicable){
    const meter=document.createElement('div');meter.className='challenge-meter';
    meter.setAttribute('role','progressbar');meter.setAttribute('aria-label',model.id==='arsenal'?'四武器击破进度':'港口暴露胸核击破进度');
    meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax',String(model.max));meter.setAttribute('aria-valuenow',String(model.value));
    meter.setAttribute('aria-valuetext',model.detail+'，'+model.label);
    const fill=document.createElement('i');fill.style.width=(model.value/model.max*100)+'%';meter.append(fill);root.append(meter);
  }
  if(model.weapons){
    const weapons=document.createElement('ul');weapons.className='challenge-weapon-progress';weapons.setAttribute('aria-label','各武器实际击破数');
    for(const weapon of model.weapons){
      const item=document.createElement('li');item.dataset.met=String(weapon.met);item.textContent=(weapon.met?'✓ ':'○ ')+weapon.name+' '+weapon.kills;weapons.append(item);
    }
    root.append(weapons);
  }
  return root;
}

export function createAchievementUI(map,start){
  const attempt=createChapterAttempt(),store=createAchievementStore(),panel=document.createElement('details');
  panel.className='achievement-panel';
  panel.innerHTML='<summary>荣誉殿堂 / 单章挑战</summary><div class="achievement-notice" role="status"></div><p class="challenge-eligibility"></p><p class="challenge-progress-note">本轮进度与历史荣誉分别记录。满足数值条件后，仍需一命完成整章；本轮达成不等于已经保存成功。</p><div class="achievement-list"></div><p class="achievement-rules">各章分别记录。从本章起点连续完成，一命挑战；开枪、挥击重锤、投出脉冲手雷或主动引发爆炸伤敌会失去纯刀资格；环境击杀不算武器击杀。死亡后重试不能恢复本轮资格。读档、刷新后继续、阶段训练均不计。切换或装填枪械不等于开枪。暂停不影响资格。原有星星成就不变。</p><button type="button" class="challenge-start">从头挑战本章 ↗</button><button type="button" class="achievement-retry" hidden>重试保存成就</button>';
  document.querySelector('.mission-card').append(panel);
  const preferences=createAchievementNotices(),toast=createAchievementToast(preferences);
  const filters=document.createElement('div');filters.className='achievement-filters';
  filters.innerHTML='<label>章节<select class="achievement-chapter"><option value="all">全部章节</option><option value="current">当前章节</option></select></label><label>历史状态<select class="achievement-status"><option value="all">全部荣誉</option><option value="unlocked">已解锁</option><option value="locked">未解锁</option></select></label><label class="achievement-notice-toggle"><input type="checkbox">显示短解锁提示</label><small class="achievement-preference-status" role="status"></small>';
  const chapter=filters.querySelector('.achievement-chapter'),status=filters.querySelector('.achievement-status'),toggle=filters.querySelector('input');
  CHALLENGE_MAPS.forEach((id,i)=>{const option=document.createElement('option');option.value=id;option.textContent=`${i+1} · ${CHAPTER_NAMES[i]}`;chapter.append(option);});
  toggle.checked=preferences.enabled;
  const summary=document.createElement('p');summary.className='achievement-gallery-summary';summary.setAttribute('role','status');
  panel.querySelector('.achievement-list').before(filters,summary);
  chapter.addEventListener('change',()=>{cancelRestart();refresh();});
  status.addEventListener('change',()=>{cancelRestart();refresh();});
  toggle.addEventListener('change',()=>{
    const saved=preferences.setEnabled(toggle.checked);if(!toggle.checked)toast.hide();
    filters.querySelector('.achievement-preference-status').textContent=saved?'提示偏好已保存':'偏好无法保存，仅本页生效；荣誉记录未修改。';
  });
  let previous='',pending=[],message='',armed=false,previousSnapshot='',wasVisible=false;
  const retry=panel.querySelector('.achievement-retry'),fresh=panel.querySelector('.challenge-start');
  function cancelRestart(){armed=false;fresh.textContent='从头挑战本章 ↗';}
  fresh.addEventListener('click',()=>{
    if(!armed){armed=true;fresh.textContent='确认重开本章 / 重置本章检查点';return;}
    cancelRestart();start();
  });
  // Leaving the action or page cancels its temporary two-step confirmation.
  fresh.addEventListener('blur',cancelRestart);
  function save(){
    const result=store.unlock(pending,map);
    if(result.error){message='成就保存失败，本页保留待保存结果，请重试。';retry.hidden=false;}
    else{message=result.added.length?'荣誉解锁 · '+result.added.map(a=>ACHIEVEMENTS.find(d=>d.id===a.id).name).join(' / '):'本章挑战已完成，既有荣誉保留。';pending=[];retry.hidden=true;toast.show(result.added);}
    refresh();
  }
  retry.addEventListener('click',save);
  function refresh(){
    const data=store.read(),state=attempt.state,list=panel.querySelector('.achievement-list');
    const models=deriveChallengeProgress(state,map);list.replaceChildren();
    const rows=selectAchievementGallery(data.awards,{chapter:chapter.value,status:status.value,currentMap:map});
    summary.textContent=data.error?'历史记录不可读取，暂不判断解锁状态。':`显示 ${rows.length} 类荣誉 · 已解锁按所选章节判断；全部章节表示任一章已获。徽章称号仅展示，无属性加成。`;
    for(const achievement of data.error?[]:rows){
      const {maps,unlocked,selected}=achievement,row=document.createElement('article');
      row.dataset.unlocked=String(unlocked);row.dataset.achievement=achievement.id;
      const badge=document.createElement('div');badge.className='achievement-badge';badge.setAttribute('aria-hidden','true');badge.textContent=achievement.mark;
      const title=document.createElement('strong'),rule=document.createElement('span'),history=document.createElement('small'),honor=document.createElement('small');
      title.textContent=(unlocked?'◆ ':'◇ ')+achievement.name;rule.textContent=achievement.rule;
      honor.className='achievement-honor';honor.textContent=(unlocked?'荣誉称号 · ':'待解锁称号 · ')+achievement.title;
      history.className='achievement-history';history.textContent=maps.length?'历史已获章节：'+maps.map(chapter=>CHAPTER_NAMES[CHALLENGE_MAPS.indexOf(chapter)]).join('、'):'历史荣誉：尚未获得';
      row.append(badge,title,honor,rule,history);
      if(!selected||selected===map)row.append(progressElement(models.find(model=>model.id===achievement.id)));
      else{const note=document.createElement('p');note.className='challenge-progress-note';note.textContent='正在浏览其他章节的历史荣誉；不会切换关卡，也不代表该章有进行中的挑战。';row.append(note);}
      list.append(row);
    }
    if(!rows.length&&!data.error){const empty=document.createElement('p');empty.className='achievement-empty';empty.textContent='此筛选下暂无荣誉。可切换章节或选择全部荣誉；破核猎手仅适用于风暴港口。';list.append(empty);}
    panel.querySelector('.challenge-eligibility').textContent=state?(state.reason+' · 已开枪 '+(Number.isFinite(state.shots)?state.shots:'—')+' 发 · 承伤 '+(Number.isFinite(state.damage)?Math.round(state.damage):'—')+(state.shots||state.bladeDisqualified?' · 纯刀资格已失效':'')):'从头开始本章即可挑战。';
    panel.querySelector('.achievement-notice').textContent=message||(data.error?'成就存储不可用或记录损坏；原存档未被覆盖。':'');
    previousSnapshot=JSON.stringify(state);
  }
  globalThis.addEventListener?.('storage',event=>{if(event.key===ACHIEVEMENT_KEY||event.key===null)refresh();});
  refresh();
  return {attempt,store,refresh,
    begin(options){cancelRestart();attempt.begin(options);if(!pending.length)message='';refresh();},
    finish(complete){const earned=attempt.finish(complete);if(earned.length){pending=[...new Set([...pending,...earned])];panel.open=true;save();}else refresh();},
    update(state){
      const visible=panel.open&&!panel.closest('[hidden]');
      if(state!==previous||(visible&&(!wasVisible||JSON.stringify(attempt.state)!==previousSnapshot)))refresh();
      if(!visible&&armed)cancelRestart();
      previous=state;wasVisible=visible;
    }
  };
}
