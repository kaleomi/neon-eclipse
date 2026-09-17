import {flightRecordFromResult,summarizeFlightRecords} from './flight-records-model.js';
import {FLIGHT_RECORD_DB,RECORD_ERRORS,createFlightRecordStore} from './flight-records-store.js';
const names={return:'归航试炼',recon:'低空侦察 · 回声航线'};
const time=ms=>(ms/1000).toFixed(3)+' 秒';
export function bindFlightRecordsUI(){
 const $=s=>document.querySelector(s),pending=new Map(),store=createFlightRecordStore();let lastMessage='',readSequence=0,channel=null;
 try{if(globalThis.BroadcastChannel)channel=new BroadcastChannel(FLIGHT_RECORD_DB);}catch{}
 function feedback(){
  const failed=[...pending.values()].filter(x=>x.state==='failed'),saving=pending.size-failed.length;
  $('#flight-score-feedback').hidden=!lastMessage&&!pending.size;
  $('#flight-score-status').textContent=(lastMessage?lastMessage+' ':'')+(saving?'有 '+saving+' 条成绩正在保存。':'')+(failed.length?'有 '+failed.length+' 条未保存：'+(RECORD_ERRORS[failed[0].code]||RECORD_ERRORS.failed)+'。本页仍保留，离开前请重试。':'');
  $('#retry-flight-score').hidden=!failed.length;
  document.body.dataset.flightScorePending=String(pending.size);
  document.body.dataset.flightScoreSave=failed.length?'failed':saving?'saving':lastMessage?'settled':'idle';
 }
 function element(tag,text,className){const e=document.createElement(tag);e.textContent=text;if(className)e.className=className;return e;}
 async function refresh(){
  const sequence=++readSequence;$('#flight-records-state').textContent='读取本地成绩…';
  const result=await store.read();if(sequence!==readSequence)return;
  const container=$('#flight-records-list');container.replaceChildren();
  if(!result.ok){$('#flight-records-panel').dataset.state='error';$('#flight-records-state').textContent=(RECORD_ERRORS[result.code]||RECORD_ERRORS.failed)+'。历史成绩未知，不按零次处理；请勿清理原数据。';return;}
  $('#flight-records-panel').dataset.state='ready';$('#flight-records-state').textContent='已保存 '+result.records.length+' 次有效完成 · 不同任务、规则版本分开统计';
  for(const group of summarizeFlightRecords(result.records)){
   const card=document.createElement('section');card.className='flight-record-card';card.dataset.task=group.type;card.dataset.rules=group.ruleVersion;card.dataset.count=String(group.count);
   card.append(element('h4',names[group.type]),element('p',(group.current?'当前规则 · ':'其他规则 · ')+group.ruleVersion,'record-rule'));
   const metrics=element('p','完成 '+group.count+' 次 · 最好 '+(group.bestMs===null?'—':time(group.bestMs)),'record-metrics');card.append(metrics);
   if(!group.recent.length)card.append(element('p','尚无有效成绩。失败、中止和自由试飞不计入。','record-empty'));
   else{const list=document.createElement('ol');for(const row of group.recent){const li=element('li',time(row.elapsedMs)+' · '+new Date(row.completedAt).toLocaleString('zh-CN'));list.append(li);}card.append(list);}
   container.append(card);
  }
 }
 async function save(item){
  if(item.state==='saving')return;item.state='saving';feedback();
  const result=await store.save(item.record);
  if(result.ok){pending.delete(item.record.id);lastMessage=result.duplicate?'该任务成绩已保存，未重复计数。':'成绩已保存到本机。';try{channel?.postMessage('changed');}catch{}await refresh();}
  else{item.state='failed';item.code=result.code;}
  feedback();
 }
 function finish(result){
  const record=flightRecordFromResult(result);
  if(!record){lastMessage=result?.status==='won'?'本轮未通过成绩完整性校验，不计入。':'本轮未完成，不计成绩。';feedback();return;}
  if(pending.has(record.id)){feedback();return;}
  const item={record,state:'new'};pending.set(record.id,item);lastMessage='';void save(item);
 }
 $('#retry-flight-score').addEventListener('click',()=>{for(const item of pending.values())if(item.state==='failed')void save(item);});
 $('#refresh-flight-records').addEventListener('click',()=>void refresh());
 $('#show-flight-records').addEventListener('click',()=>{const panel=$('#flight-records-panel');panel.open=true;panel.scrollIntoView({block:'start',behavior:'smooth'});void refresh();});
 $('#flight-records-panel').addEventListener('toggle',()=>{if($('#flight-records-panel').open)void refresh();});
 if(channel)channel.onmessage=()=>void refresh();
 window.addEventListener('focus',()=>void refresh());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
 window.addEventListener('beforeunload',event=>{if(pending.size){event.preventDefault();event.returnValue='';}});
 void refresh();feedback();
 return {finish,resetNotice(){lastMessage='';feedback();}};
}
