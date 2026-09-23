// Local-only battle telemetry. One record per finished attempt (won / lost), stored in IndexedDB
// `neon-eclipse.telemetry.v1`. Nothing is uploaded. The record is built from the same field
// records the pause/result screens already show, plus attempt metadata (map, mode, difficulty).
// Opt-out and "clear local statistics" live in Settings. Covered by test-telemetry.mjs.
import {validFramePerf} from './frame-stats.js';
export const TELEMETRY_DB='neon-eclipse.telemetry.v1';
export const TELEMETRY_STORE='attempts';
export const TELEMETRY_SETTING_KEY='neon-eclipse.telemetry-enabled.v1';
export const TELEMETRY_SCHEMA=1;
export const TELEMETRY_LIMIT=2000;
const int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const num=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export function readTelemetryEnabled(storage){
 try{const v=(storage??globalThis.localStorage)?.getItem(TELEMETRY_SETTING_KEY);return v!=='false';}catch{return true;}
}
export function writeTelemetryEnabled(value,storage){
 try{const t=storage??globalThis.localStorage;if(!t)return false;t.setItem(TELEMETRY_SETTING_KEY,String(value===true));return true;}catch{return false;}
}
export function createTelemetryAttempt({map,mode,difficulty,stage=0,snapshot=false,now=()=>Date.now(),random=Math.random}={}){
 const id=`${new Date(now()).toISOString()}-${Math.floor(random()*1e9).toString(36)}`;
 return {id,map,mode,difficulty,startStage:stage,fromCheckpoint:!!snapshot,startedAt:now()};
}
// Build the durable record from an attempt and the per-stage field records.
export function telemetryRecordFromResult({attempt,won,stages,kills,time,weaponShots=null,endStage,perf=null,now=()=>Date.now()}){
 const summary=stages.reduce((s,r)=>({seconds:s.seconds+r.seconds,damage:s.damage+r.damage,shots:s.shots+r.shots,coreHits:s.coreHits+r.coreHits,windows:s.windows+r.windows,usedWindows:s.usedWindows+r.usedWindows}),{seconds:0,damage:0,shots:0,coreHits:0,windows:0,usedWindows:0});
 const death=won?null:(stages.findLast?.(r=>r.death)||[...stages].reverse().find(r=>r.death))?.death||null;
 return {
  schema:TELEMETRY_SCHEMA,id:attempt.id,map:attempt.map,mode:attempt.mode,difficulty:attempt.difficulty,
  startStage:attempt.startStage,fromCheckpoint:attempt.fromCheckpoint,endStage,won:!!won,
  kills:Math.max(0,Math.floor(kills||0)),time:Math.max(0,Math.round((time||0)*10)/10),
  damage:Math.round(summary.damage),shots:summary.shots,coreHits:summary.coreHits,windows:summary.windows,usedWindows:summary.usedWindows,
  weaponShots:Array.isArray(weaponShots)?weaponShots.map(n=>Math.max(0,Math.floor(n||0))):null,
  death:death?{stage:stages.find(r=>r.death===death)?.stage??endStage,x:death.x,z:death.z,feet:death.feet}:null,
  stages:stages.map(r=>({stage:r.stage,seconds:Math.round(r.seconds*10)/10,damage:Math.round(r.damage),shots:r.shots,died:!!r.death})),
  startedAt:attempt.startedAt,finishedAt:now(),
  perf:validFramePerf(perf)&&perf?{frames:perf.frames,avgFps:perf.avgFps,p50Ms:perf.p50Ms,p95Ms:perf.p95Ms,maxMs:perf.maxMs,long:perf.long,quality:perf.quality}:null// Optional frame-timing summary; schema unchanged, older records simply lack it.
 };
}
export function validTelemetryRecord(r){
 if(!r||typeof r!=='object'||r.schema!==TELEMETRY_SCHEMA||typeof r.id!=='string'||r.id.length>80)return false;
 if(typeof r.map!=='string'||!['campaign','journey','replay'].includes(r.mode)||!['easy','normal','hard'].includes(r.difficulty))return false;
 if(!int(r.startStage,0,50)||!int(r.endStage,0,50)||typeof r.won!=='boolean'||typeof r.fromCheckpoint!=='boolean')return false;
 if(!int(r.kills,0,100000)||!num(r.time,0,86400*7)||!num(r.damage,0,1e7)||!int(r.shots,0,1e7))return false;
 if(!Array.isArray(r.stages)||r.stages.length>200)return false;
 if(r.death!==null&&(!r.death||!num(r.death.x,-1e5,1e5)||!num(r.death.z,-1e5,1e5)))return false;
 if(!num(r.startedAt,0,4e12)||!num(r.finishedAt,0,4e12))return false;
 if(r.perf!==undefined&&!validFramePerf(r.perf))return false;
 return true;
}
// Aggregate for the statistics page. Pure so it can be tested without IndexedDB.
export function summarizeTelemetry(records){
 const byMap={};
 for(const r of records){
  if(!validTelemetryRecord(r))continue;
  const m=byMap[r.map]||(byMap[r.map]={attempts:0,wins:0,losses:0,bestTime:null,deathsByStage:{},damagePerWin:[],shotsPerWin:[],byDifficulty:{}});
  m.attempts++;
  const d=m.byDifficulty[r.difficulty]||(m.byDifficulty[r.difficulty]={attempts:0,wins:0});
  d.attempts++;
  if(r.won){m.wins++;d.wins++;if(!r.fromCheckpoint&&r.mode!=='replay'&&(m.bestTime===null||r.time<m.bestTime))m.bestTime=r.time;m.damagePerWin.push(r.damage);m.shotsPerWin.push(r.shots);}
  else{m.losses++;const stage=r.death?.stage??r.endStage;m.deathsByStage[stage]=(m.deathsByStage[stage]||0)+1;}
 }
 const avg=a=>a.length?Math.round(a.reduce((s,v)=>s+v,0)/a.length):null;
 for(const m of Object.values(byMap)){
  m.averageDamagePerWin=avg(m.damagePerWin);m.averageShotsPerWin=avg(m.shotsPerWin);delete m.damagePerWin;delete m.shotsPerWin;
  const entries=Object.entries(m.deathsByStage);
  m.deadliestStage=entries.length?Number(entries.sort((a,b)=>b[1]-a[1]||Number(a[0])-Number(b[0]))[0][0]):null;
 }
 return {total:records.length,byMap};
}
const errorCode=e=>e?.name==='QuotaExceededError'?'quota':['SecurityError','NotAllowedError'].includes(e?.name)?'denied':['VersionError','NotFoundError','DataError'].includes(e?.name)?'corrupt':e?.code||'failed';
export function createTelemetryStore(factory){
 const useDefault=arguments.length===0;
 let db=null,opening=null;
 function open(){
  if(db)return Promise.resolve(db);if(opening)return opening;
  opening=new Promise((resolve,reject)=>{
   let request,settled=false;
   try{if(useDefault)factory=globalThis.indexedDB;if(!factory){reject({code:'unavailable'});return;}request=factory.open(TELEMETRY_DB,1);}catch(e){reject(e);return;}
   request.onupgradeneeded=event=>{if(settled){request.transaction.abort();return;}if(event.oldVersion===0)request.result.createObjectStore(TELEMETRY_STORE,{keyPath:'id'});};
   request.onblocked=()=>{settled=true;reject({code:'blocked'});};
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{if(settled){request.result.close();return;}const c=request.result;db=c;c.onversionchange=()=>{c.close();if(db===c){db=null;opening=null;}};resolve(c);};
  }).catch(e=>{opening=null;throw e;});
  return opening;
 }
 async function run(mode,work){
  try{
   const c=await open();
   return await new Promise(resolve=>{
    let tx,answer={ok:false,code:'failed'};
    try{tx=c.transaction(TELEMETRY_STORE,mode);const store=tx.objectStore(TELEMETRY_STORE);work(store,a=>{answer=a;},()=>tx.abort());}
    catch(e){resolve({ok:false,code:errorCode(e)});return;}
    tx.oncomplete=()=>resolve(answer);
    tx.onabort=()=>resolve(!answer.ok&&answer.code!=='failed'?answer:{ok:false,code:errorCode(tx.error)});
    tx.onerror=()=>{};
   });
  }catch(e){return {ok:false,code:errorCode(e)};}
 }
 return {
  read:()=>run('readonly',(store,set)=>{const req=store.getAll(undefined,TELEMETRY_LIMIT+1);req.onsuccess=()=>set({ok:true,records:req.result.filter(validTelemetryRecord)});req.onerror=()=>set({ok:false,code:errorCode(req.error)});}),
  save:record=>{
   if(!validTelemetryRecord(record))return Promise.resolve({ok:false,code:'corrupt'});
   return run('readwrite',(store,set,abort)=>{
    const count=store.count();
    count.onsuccess=()=>{
     if(count.result>=TELEMETRY_LIMIT){set({ok:false,code:'full'});abort();return;}
     const add=store.add({...record});add.onsuccess=()=>set({ok:true});add.onerror=()=>{set({ok:false,code:add.error?.name==='ConstraintError'?'duplicate':errorCode(add.error)});};
    };
    count.onerror=()=>set({ok:false,code:errorCode(count.error)});
   });
  },
  clear:()=>run('readwrite',(store,set)=>{const req=store.clear();req.onsuccess=()=>set({ok:true});req.onerror=()=>set({ok:false,code:errorCode(req.error)});}),
  close(){db?.close();db=null;opening=null;}
 };
}
// Runtime helper used by app.js: owns enabled flag + store; failures never affect gameplay.
export function createTelemetry({store=null,storage,onSaved=()=>{}}={}){
 let enabled=readTelemetryEnabled(storage);
 const target=store||(typeof indexedDB!=='undefined'?createTelemetryStore():null);
 return {
  get enabled(){return enabled;},
  setEnabled(v){enabled=v===true;writeTelemetryEnabled(enabled,storage);},
  async record(result){
   if(!enabled||!target)return {ok:false,code:'disabled'};
   const record=telemetryRecordFromResult(result);
   try{const r=await target.save(record);onSaved(r,record);return r;}catch(e){return {ok:false,code:errorCode(e)};}
  },
  read:()=>target?target.read():Promise.resolve({ok:false,code:'unavailable'}),
  clear:()=>target?target.clear():Promise.resolve({ok:false,code:'unavailable'})
 };
}
export function bindTelemetrySetting(container,telemetry){
 if(!container||!telemetry)return null;
 container.innerHTML='<label class="menu-telemetry"><input type="checkbox" data-telemetry-toggle><span>记录本地战斗统计<small>每次成功或失败后保存章节、阶段、难度、用时、承伤、耗弹与死亡位置，仅存于本浏览器，不会上传。</small></span></label><div class="menu-save-hub-actions"><button type="button" class="menu-text-button" data-telemetry-clear>清除本地统计</button><span class="menu-setting-hint" data-telemetry-status aria-live="polite"></span></div>';
 const toggle=container.querySelector('[data-telemetry-toggle]'),status=container.querySelector('[data-telemetry-status]');
 toggle.checked=telemetry.enabled;
 toggle.addEventListener('change',()=>{telemetry.setEnabled(toggle.checked);status.textContent=toggle.checked?'已开启。':'已关闭；已有统计保留，可手动清除。';});
 container.querySelector('[data-telemetry-clear]').addEventListener('click',async()=>{const r=await telemetry.clear();status.textContent=r.ok?'本地统计已清除。':'清除失败：'+(r.code||'未知错误');});
 telemetry.read().then(r=>{if(r.ok)status.textContent=`当前已保存 ${r.records.length} 条。`;});
 return {toggle};
}
