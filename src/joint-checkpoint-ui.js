import {createJointCheckpointStore,CHECKPOINT_ERRORS} from './joint-checkpoint-store.js';
import {checkpointFromMission,CHECKPOINT_STAGES} from './joint-checkpoint-model.js';
// Generic checkpoint panel controller shared by the joint and naval mission lines. `prefix` selects the DOM ids
// (#<prefix>-checkpoint-panel, #<prefix>-checkpoint-info, #<prefix>-checkpoint-feedback, #resume-<prefix>-checkpoint,
// #retry-<prefix>-checkpoint, #refresh-<prefix>-checkpoint, #start-<prefix>); `fromMission` / `label` come from the model.
export function bindCheckpointUI({store,prefix,fromMission,label,channelName,startSelector='#start-'+prefix,onRestore,onNotice=()=>{}}){
 const $=s=>document.querySelector(s),panel=$('#'+prefix+'-checkpoint-panel'),info=$('#'+prefix+'-checkpoint-info'),feedback=$('#'+prefix+'-checkpoint-feedback'),resume=$('#resume-'+prefix+'-checkpoint'),retry=$('#retry-'+prefix+'-checkpoint'),start=$(startSelector);
 let cached=null,readError=null,expectedRevision=null,pending=null,writing=false,transition=false,finishing=false,owned=false,currentRun=null,message='',sequence=0,inFlight=Promise.resolve();let channel=null;
 try{channel=new BroadcastChannel(channelName);channel.onmessage=()=>refresh();}catch{}
 function render(){panel.dataset.state=writing?'saving':pending?'pending':readError?'error':cached?'ready':'loading';panel.dataset.stage=cached?.checkpoint?.stage||'';panel.dataset.pending=String(!!pending);info.textContent=readError?'已保存节点状态未知 · '+(CHECKPOINT_ERRORS[readError]||CHECKPOINT_ERRORS.failed):cached?.checkpoint?label(cached.checkpoint)+' · '+new Date(cached.checkpoint.savedAt).toLocaleString()+' · 节点计时 '+(cached.checkpoint.elapsedMs/1000).toFixed(1)+' 秒':cached?'尚无可恢复的安全节点。':'正在读取检查点…';feedback.textContent=writing?'正在提交检查点，请稍候…':message;resume.disabled=writing||transition||finishing||!cached?.checkpoint||!!readError;retry.hidden=!pending||writing;retry.disabled=transition||finishing;start.disabled=writing||transition||finishing;}
 async function refresh(adopt=false){const seq=++sequence,r=await store.read();if(seq!==sequence)return r;if(r.ok){cached=r;readError=null;if(adopt)expectedRevision=r.revision;}else{readError=r.code;if(adopt)expectedRevision=null;}render();return r;}
 async function pump(){if(writing||!pending)return inFlight;const job=pending;writing=true;render();inFlight=(async()=>{let r;if(expectedRevision===null){const read=await refresh(true);if(!read.ok)r=read;else expectedRevision=read.revision;}if(!r)r=await store.write(job,expectedRevision);
 if(r.ok){sequence++;expectedRevision=r.revision;cached={ok:true,revision:r.revision,checkpoint:job.checkpoint};readError=null;if(job.runId===currentRun)owned=job.checkpoint!==null;if(pending===job)pending=null;message=job.checkpoint?'安全检查点已保存 · '+label(job.checkpoint):'本轮已完成，旧检查点已关闭。';try{channel?.postMessage('changed');}catch{}onNotice(message);}else{message=(job.checkpoint===null?'本轮完成，但旧检查点尚未关闭。':'')+(CHECKPOINT_ERRORS[r.code]||CHECKPOINT_ERRORS.failed);onNotice('检查点操作未完成：'+message);}
 writing=false;render();return r;})();const r=await inFlight;if(r.ok&&pending)pump();return r;}
 // A stale launch may refresh the panel, but must not adopt a revision, discard a retry, or steal run ownership.
 async function begin(runId,isCurrent=()=>true){
  if(transition||finishing||!isCurrent())return false;transition=true;render();
  try{
   await inFlight;if(!isCurrent())return false;
   if(pending&&!confirm('有检查点操作尚未保存。放弃本页待保存操作并从头开始？已保存节点暂时保留，到达新安全节点后才替换。'))return false;
   const initial=await refresh();if(!isCurrent())return false;
   pending=null;expectedRevision=initial.ok?initial.revision:null;owned=false;currentRun=runId;message='新任务已开始；到达安全节点时自动保存。';return true;
  }finally{transition=false;render();}
 }
 function save(m){if(m.runId!==currentRun)return;const c=fromMission(m);if(!c)return;pending={operationId:c.runId+':'+c.stage,checkpoint:c,runId:m.runId};pump();}
 async function complete(m){if(m.runId!==currentRun)return;const run=m.runId;finishing=true;render();try{await inFlight;if(run!==currentRun)return;if(owned){pending={operationId:run+':complete',checkpoint:null,runId:run};await pump();}else{pending=null;message='本轮完成；没有本轮已保存节点需要关闭，其他旧节点保持不变。';}}finally{finishing=false;render();}}
 resume.addEventListener('click',async()=>{if(writing||transition||finishing)return;transition=true;render();try{if(pending&&!confirm('本页仍有未保存操作。放弃它并读取已保存的检查点？'))return;const r=await refresh();if(!r.ok||!r.checkpoint)return;if(!confirm('恢复“'+label(r.checkpoint)+'”？玩家和全部载具将重置到预设安全位置，本次标记为检查点恢复，不是完整一命用时。'))return;pending=null;expectedRevision=r.revision;owned=true;currentRun=onRestore(r.checkpoint);message='已从安全节点恢复 · 后续计时从节点继续，不计为完整一命成绩。';}finally{transition=false;render();}});
 retry.addEventListener('click',()=>pump());$('#refresh-'+prefix+'-checkpoint').addEventListener('click',()=>refresh());window.addEventListener('focus',()=>refresh());document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('beforeunload',e=>{if(pending||writing||finishing){e.preventDefault();e.returnValue='';}});
 render();refresh();return {begin,save,complete};
}
export function bindJointCheckpointUI({onRestore,onNotice}){return bindCheckpointUI({store:createJointCheckpointStore(),prefix:'joint',fromMission:checkpointFromMission,label:c=>CHECKPOINT_STAGES[c.stage],channelName:'neon-eclipse.joint-checkpoint.events',onRestore,onNotice});}
