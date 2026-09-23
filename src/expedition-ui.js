import {createExpeditionStore} from './expedition-store.js';
import {createExpeditionBackup} from './expedition-backup.js';
import {bindExpeditionBackup} from './expedition-backup-ui.js';
import {createExpeditionSession} from './expedition-session.js';
import {EXPEDITION_MISSIONS,EXPEDITION_TOTAL,EXPEDITION_FINAL,EXPEDITION_TITLE,EXPEDITION_DIFFICULTIES,nextExpeditionMission,summarizeExpedition,expeditionCheckpointLabel,expeditionTitleEarned} from './expedition-model.js';

const ERRORS={unavailable:'此环境无法使用 IndexedDB',denied:'浏览器拒绝本地存储',blocked:'数据库被旧页面占用',
  corrupt:'档案损坏或版本不兼容，原数据保留',conflict:'另一页面已更新档案，拒绝覆盖',quota:'本地空间不足',failed:'存储读写失败'};
export function bindExpeditionUI({root,launch,onLeave,store=createExpeditionStore()}){
  const panel=document.createElement('section');panel.id='expedition-panel';panel.className='expedition-panel';panel.setAttribute('aria-label','先遣队战役');
  panel.innerHTML=`<small>EXPEDITION / ${EXPEDITION_TOTAL} OF ${EXPEDITION_FINAL}</small><h3>先遣队 · 全 ${EXPEDITION_TOTAL} 关</h3>
    <p>${EXPEDITION_MISSIONS.map(m=>m.title).join(' → ')}。保存关间进度及本战役第 2/4/5/6/7/8 关安全节点，不保存实时位置。护送与侦察仍从关首重试。</p>
    <p id="expedition-status"></p><progress id="expedition-progress" max="${EXPEDITION_TOTAL}" value="0" aria-label="先遣队已完成关卡"></progress>
    <ol class="expedition-steps"></ol><p id="expedition-checkpoint-info"></p>
    <label>新战役可选关难度 <select id="expedition-difficulty" aria-label="先遣队可选关难度"><option value="easy">简单</option><option value="normal" selected>普通</option><option value="hard">困难</option></select></label>
    <p>第一、二、五至八关锁定所选难度；第三、四关沿用固定规则，不虚标难度。同一战役完成全部 ${EXPEDITION_FINAL} 关授予“${EXPEDITION_TITLE}”称号（仅本页记录）。</p><p id="expedition-title" hidden></p>
    <div class="expedition-actions"><button type="button" id="expedition-new">新建先遣队战役</button><button type="button" id="expedition-continue">从当前关开始</button><button type="button" id="expedition-checkpoint">从先遣队安全节点继续</button><button type="button" id="expedition-leave" hidden>退出本关，保留关间进度</button><button type="button" id="expedition-retry-save" hidden>重试未保存结果</button><button type="button" id="expedition-refresh">读取最新档案</button></div>
    <p id="expedition-feedback" role="status" aria-live="polite"></p>
    <details><summary>本地通关记录（完整一命 / 检查点继续分开）</summary><div id="expedition-records"></div></details>
    <p>成绩仅写入先遣队独立档案，不合并旧飞行成绩或 FPS 存档。原单项检查点、单项任务、失败和中止不推进先遣队；本面板恢复的先遣队节点可推进，但不进入完整一命最好用时。跨关可刷新，不提供全战役一命排行。待保存结果在强制关闭后可能丢失。</p>`;
  root.insertBefore(panel,root.querySelector('.drive-features'));
  const $=s=>panel.querySelector(s),hud=document.querySelector('.drive-objective>small'),originalHud=hud?.textContent;
  let armed=null,session,backupControls=null;
  const steps=EXPEDITION_MISSIONS.map((m,i)=>{const li=document.createElement('li'),label=document.createElement('span'),state=document.createElement('b');label.textContent=String(i+1).padStart(2,'0')+' '+m.title;li.append(label,state);$('.expedition-steps').append(li);return {li,state};});
  const recordNodes=new Map();
  function render(s){
    const a=s.archive,c=a?.campaign,count=c?.completed.length||0,next=nextExpeditionMission(a),blocked=s.busy||s.pending||!!s.error;
    panel.dataset.state=s.busy?(a?'saving':'loading'):s.pending?'pending':s.error?'error':s.active?'playing':'ready';
    panel.dataset.completed=String(count);panel.dataset.mission=s.active?.mission||'none';
    $('#expedition-status').textContent=!a?'先遣队档案尚未就绪。':!c?'尚未开始先遣队战役，旧单项记录不会自动导入。':count===EXPEDITION_TOTAL?
      '全部 '+EXPEDITION_TOTAL+' 关已完成 · 本战役结束，可新建战役再战。':'已保存 '+count+'/'+EXPEDITION_TOTAL+' 关 · 当前 '+next.title+' · 可选关难度 '+EXPEDITION_DIFFICULTIES[c.difficulty]+'（第 3/4 关固定规则）';
    const titled=!!a&&expeditionTitleEarned(a);$('#expedition-title').hidden=!titled;$('#expedition-title').textContent=titled?'称号已获得：'+EXPEDITION_TITLE+' · 同一战役八关全部完成':'';panel.dataset.title=String(titled);
    $('#expedition-progress').value=count;
    $('#expedition-checkpoint-info').textContent=a?.checkpoint?'本战役安全节点：'+expeditionCheckpointLabel(a.checkpoint)+'。失败或退出本关后，可从节点继续；恢复通关单独标记。':'本战役当前关没有已保存的安全节点。原单项节点不在这里恢复。';
    steps.forEach(({li,state},i)=>{li.dataset.status=i<count?'complete':c&&i===count?'current':'locked';state.textContent=i<count?'已完成':c&&i===count?'当前关':'未解锁';});
    $('#expedition-feedback').textContent=s.message+(s.error?' '+(ERRORS[s.error]||ERRORS.failed)+'。':'');
    $('#expedition-new').disabled=blocked||!!s.active||!a;
    $('#expedition-continue').disabled=blocked||!!s.active||!next;
    $('#expedition-checkpoint').disabled=blocked||!!s.active||!a?.checkpoint;
    $('#expedition-checkpoint').textContent=armed==='checkpoint'?'确认从节点继续 · 不计完整一命最好用时':'从先遣队安全节点继续';
    $('#expedition-new').textContent=armed==='new'?'确认新建 · 替换关间进度，保留历史成绩':'新建先遣队战役';
    $('#expedition-continue').textContent=armed==='continue'?'确认从关首开始 · 重置载具与路线':next?'开始 / 重试第 '+(count+1)+' 关 · '+next.title:'从当前关开始';
    $('#expedition-leave').hidden=!s.active;$('#expedition-leave').disabled=s.busy;
    $('#expedition-retry-save').hidden=!s.pending;$('#expedition-retry-save').disabled=s.busy;
    $('#expedition-refresh').disabled=s.busy;
    $('#expedition-difficulty').disabled=s.busy||s.pending||!!s.active;
    if(hud)hud.textContent=s.active?'先遣队 / '+String(count+1).padStart(2,'0')+' · '+EXPEDITION_DIFFICULTIES[s.active.difficulty]+(s.active.resumed?' · 检查点继续':' · 从头开始'):originalHud;
    Object.assign(document.body.dataset,{expeditionState:panel.dataset.state,expeditionMission:s.active?.mission||'none',expeditionCompleted:String(count),expeditionRecords:String(a?.records.length||0),expeditionResumed:String(!!s.active?.resumed),expeditionTitle:String(titled)});
    for(const row of a?summarizeExpedition(a):[]){
      const key=row.mission+':'+row.difficulty;let elements=recordNodes.get(key);
      if(!elements){const node=document.createElement('div'),name=document.createElement('span'),value=document.createElement('b');node.className='expedition-record-row';node.dataset.mission=row.mission;node.dataset.difficulty=row.difficulty;node.append(name,value);$('#expedition-records').append(node);elements={node,name,value};recordNodes.set(key,elements);}
      elements.node.dataset.count=String(row.count);elements.node.dataset.resumedCount=String(row.resumedCount);elements.name.textContent=row.title+' · '+EXPEDITION_DIFFICULTIES[row.difficulty];
      elements.value.textContent=(row.count?row.count+' 次完整一命 · 最好 '+(row.bestMs/1000).toFixed(2)+' s':'尚无完整一命成绩')+'；检查点继续 '+row.resumedCount+' 次';
    }
    backupControls?.sync();
  }
  session=createExpeditionSession({store,onChange:render});
  const arm=(id,run)=>{
    const button=$('#expedition-'+id);
    button.addEventListener('click',async()=>{
      if(armed!==id){armed=id;render(session.snapshot());return;}
      armed=null;render(session.snapshot());await run();
    });
    button.addEventListener('blur',()=>{if(armed===id){armed=null;render(session.snapshot());}});
  };
  arm('new',async()=>{if(await session.newCampaign($('#expedition-difficulty').value))await session.launch(launch);});
  arm('continue',()=>session.launch(launch));
  arm('checkpoint',()=>session.launch(launch,{resume:true}));
  $('#expedition-difficulty').addEventListener('change',()=>{armed=null;render(session.snapshot());});
  $('#expedition-leave').addEventListener('click',()=>{if(confirm('退出先遣队本关并回收载具？已保存的关间进度和历史成绩保留。'))onLeave();});
  $('#expedition-retry-save').addEventListener('click',()=>session.retry());
  $('#expedition-refresh').addEventListener('click',async()=>{
    const s=session.snapshot();if((s.active||s.pending)&&!confirm('读取最新档案将退出当前先遣队本关，并放弃本页未保存结果。不会覆盖已有存档。继续？'))return;
    if(s.active)onLeave();await session.load({discard:true});
  });
  window.addEventListener('beforeunload',e=>{const s=session.snapshot();if(s.pending){e.preventDefault();e.returnValue='';}});
  backupControls=bindExpeditionBackup(panel,{manager:createExpeditionBackup({store}),isLocked:()=>{const s=session.snapshot();return !s.archive||s.busy||s.pending||!!s.active;},mutate:work=>session.maintain(work)});
  render(session.snapshot());session.load();
  return {finish:session.finish,detach:session.detach,saveCheckpoint:session.saveCheckpoint,snapshot:session.snapshot};
}
