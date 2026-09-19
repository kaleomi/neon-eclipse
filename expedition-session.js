// Owned attempts + serialized CAS commits. No optimistic progress or automatic conflict overwrite.
import {emptyExpedition,validExpedition,canonicalExpedition,newExpeditionCampaign,newExpeditionId,
  nextExpeditionMission,expeditionDifficulty,expeditionRecordFromMission,advanceExpedition,EXPEDITION_RECORD_LIMIT,
  expeditionCheckpointFromMission,saveExpeditionCheckpoint,expeditionCheckpointRank,canonicalExpeditionCheckpoint,EXPEDITION_TOTAL,EXPEDITION_FINAL} from './expedition-model.js';

export function createExpeditionSession({store,onChange=()=>{}}){
  let archive=null,revision=null,busy=false,jobs=[],attempt=null,error=null,message='正在读取先遣队档案…',inFlight=Promise.resolve();
  const handled=new WeakMap(); // Duplicate completed callbacks must never fall through into solo flight scores.
  const snapshot=()=>({archive:archive?canonicalExpedition(archive):null,revision,busy,pending:jobs.length>0,error,message,
    active:attempt?{mission:attempt.mission,difficulty:attempt.difficulty,resumed:!attempt.fromStart}:null});
  const emit=()=>onChange(snapshot());
  const ready=()=>archive!==null&&revision!==null&&!busy&&!jobs.length&&!error;
  const failure=e=>({ok:false,code:e?.code||'failed'});
  async function read(){try{return await store.read();}catch(e){return failure(e);}}
  function adopt(r){
    const data=r.checkpoint??emptyExpedition();
    if(r.ok&&validExpedition(data)){archive=canonicalExpedition(data);revision=r.revision;error=null;return true;}
    error=r.ok?'corrupt':r.code;return false;
  }
  async function load({discard=false}={}){
    if(busy||(!discard&&(jobs.length||attempt)))return false;
    if(discard){jobs=[];attempt=null;}
    busy=true;emit();const ok=adopt(await read());
    message=ok?'先遣队档案已读取；可从关首开始，或恢复本战役的已保存安全节点。':'档案不可用，原数据未改写；单项任务仍可游玩。';
    busy=false;emit();return ok;
  }
  function pump(force=false){
    if(busy)return inFlight;
    if(!jobs.length||error&&!force)return Promise.resolve(false);
    busy=true;error=null;
    inFlight=(async()=>{
      while(jobs.length){
        const job=jobs[0];message=job.kind==='checkpoint'?'正在保存先遣队安全节点…':'正在原子保存先遣队进度与记录…';emit();
        // Freeze the first attempted payload for uncertain-ack/idempotent retries. Later jobs reduce only after commit.
        job.archive??=job.reduce(archive);
        let r;
        if(!job.archive)r={ok:false,code:'corrupt'};
        else try{r=await store.write({operationId:job.operationId,checkpoint:job.archive},revision);}catch(e){r=failure(e);}
        if(!r.ok){error=r.code;message='本页仍有未保存操作，进度没有提前推进；请重试保存。冲突时需读取最新档案，不会自动覆盖。';busy=false;emit();return false;}
        archive=canonicalExpedition(job.archive);revision=r.revision;jobs.shift();
        message=job.kind==='new'?'新战役已保存；可从第一关开始。':job.kind==='checkpoint'?'先遣队安全节点已保存；从节点继续将单独标记，不计完整一命最好用时。':
          archive.campaign.completed.length===EXPEDITION_TOTAL?'全部 '+EXPEDITION_TOTAL+' 关已完成并保存；本战役已获得“先遣队”称号。':'本关通关记录与进度已保存，可以继续下一关。';
        emit();
      }
      busy=false;emit();return true;
    })();return inFlight;
  }
  function queue(reduce,kind,id){jobs.push({reduce,kind,operationId:id});emit();return pump();}
  async function newCampaign(difficulty){
    if(!ready()||attempt)return false;
    const next=newExpeditionCampaign(archive,difficulty);
    if(!next){message='无法新建：档案已达容量上限或参数无效，旧记录保留。';emit();return false;}
    return queue(()=>next,'new',next.campaign.id+':new');
  }
  async function launch(start,{resume=false}={}){
    if(!ready()||attempt)return false;
    const spec=nextExpeditionMission(archive),checkpoint=resume?archive.checkpoint:null;
    if(!spec||archive.records.length>=EXPEDITION_RECORD_LIMIT||resume&&!checkpoint){message='当前无可开始关卡/安全节点，或通关档案已满（不自动删除旧记录）。';emit();return false;}
    const campaignId=archive.campaign.id,difficulty=expeditionDifficulty(spec,archive.campaign.difficulty);
    busy=true;message='正在'+(resume?'从先遣队安全节点继续 ':'从关首开始 ')+spec.title+'…';emit();
    let launched;
    try{launched=await start(spec,difficulty,checkpoint?canonicalExpeditionCheckpoint(checkpoint).node:null);}catch{launched=null;}
    if(launched?.source?.status==='active'&&launched.isCurrent?.()===true&&(launched.source.recovered===true)===resume){
      attempt={id:newExpeditionId(),campaignId,mission:spec.id,difficulty,fromStart:!resume,source:launched.source,
        resume:checkpoint?canonicalExpeditionCheckpoint(checkpoint):null,lastRank:checkpoint?expeditionCheckpointRank(checkpoint):-1};
      message=spec.title+(resume?' · 先遣队检查点继续；通关可推进，不计完整一命最好用时。':' · 先遣队从头开始；旧安全节点保留到到达新节点。');
    }else message='任务未启动，已保存的先遣队档案保持不变。';
    busy=false;emit();return !!attempt;
  }
  function detach(){
    if(attempt){attempt=null;message='已退出先遣队本关，已提交的安全节点和关间进度保留；原单项检查点不推进先遣队。';emit();}
  }
  function saveCheckpoint(mission,source){
    if(!attempt||attempt.mission!==mission||attempt.source!==source)return false;
    const point=expeditionCheckpointFromMission(attempt,source);
    if(!point||expeditionCheckpointRank(point)<=attempt.lastRank)return true;
    attempt.lastRank=expeditionCheckpointRank(point);
    queue(a=>saveExpeditionCheckpoint(a,point),'checkpoint',newExpeditionId()+':node');return true;
  }
  function finish(mission,source,extra){
    if(source&&handled.get(source)===mission)return true;
    if(!attempt||attempt.mission!==mission||attempt.source!==source||!['won','lost'].includes(source?.status))return false;
    const owned=attempt;attempt=null;handled.set(source,mission);
    if(source.status!=='won'){message='本关未通关，未保存成绩；可从关首重试或恢复本战役已保存的安全节点。';emit();return true;}
    const record=expeditionRecordFromMission(owned,source,extra);
    if(!record){message='结果未满足完整一命/检查点来源/任务证据要求，未计分、未推进；旧档案保留。';emit();return true;}
    queue(a=>advanceExpedition(a,record),'result',owned.id+':finish');return true;
  }
  // Backup preview is read-only. Actual replacement excludes live attempts/pending writes and reloads after either outcome.
  async function maintain(work){
    if(!ready()||attempt)return {ok:false,code:'busy'};
    busy=true;emit();let result;
    try{result=await work();}catch(e){result=failure(e);}
    const ok=adopt(await read());busy=false;
    message=ok?'档案维护后已重新读取当前先遣队档案；以备份面板的操作结果为准。':'无法确认档案状态；原数据保留，请重新读取。';emit();return result;
  }
  return {snapshot,load,newCampaign,launch,detach,saveCheckpoint,finish,maintain,retry:()=>pump(true),settled:()=>inFlight,close:()=>store.close()};
}
