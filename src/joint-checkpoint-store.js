import {validCheckpoint,canonicalCheckpoint} from './joint-checkpoint-model.js';
export const JOINT_CHECKPOINT_DB='neon-eclipse.joint-checkpoint.v1';
export const CHECKPOINT_ERRORS=Object.freeze({unavailable:'此环境无法使用本地检查点',denied:'浏览器拒绝存储访问',blocked:'数据库被旧页面占用，请关闭旧页面后重试',corrupt:'检查点损坏或版本不兼容，原数据已保留',conflict:'其他页面已更新检查点。不会覆盖；可读取并恢复已保存节点，或从头开始新任务',quota:'本地空间不足，检查点尚未保存',failed:'检查点读写失败，请重试'});
const code=e=>e?.name==='QuotaExceededError'?'quota':['SecurityError','NotAllowedError'].includes(e?.name)?'denied':['VersionError','NotFoundError','DataError'].includes(e?.name)?'corrupt':e?.code||'failed';
// Generic single-row compare-and-swap store. Each mission line gets its own database name and validator;
// the joint mission keeps its original entry point below, the naval line passes its own model.
export function createCheckpointStore({dbName,valid,canonical},factory,useDefault=factory===undefined){
 const validJob=j=>!!j&&typeof j.operationId==='string'&&/^[a-zA-Z0-9:-]{16,128}$/.test(j.operationId)&&(j.checkpoint===null||valid(j.checkpoint));
 const validRow=r=>r?.id==='state'&&r.schema===1&&Number.isSafeInteger(r.revision)&&r.revision>0&&validJob(r);
 const equalJob=(a,b)=>a.operationId===b.operationId&&JSON.stringify(canonical(a.checkpoint))===JSON.stringify(canonical(b.checkpoint));
 let db=null,opening=null;
 function open(){if(db)return Promise.resolve(db);if(opening)return opening;opening=new Promise((resolve,reject)=>{let q,settled=false;try{if(useDefault)factory=globalThis.indexedDB;if(!factory){reject({code:'unavailable'});return;}q=factory.open(dbName,1);}catch(e){reject(e);return;}
 q.onupgradeneeded=e=>{if(settled){q.transaction.abort();return;}if(e.oldVersion===0)q.result.createObjectStore('checkpoint',{keyPath:'id'});};q.onblocked=()=>{settled=true;reject({code:'blocked'});};q.onerror=()=>reject(q.error);q.onsuccess=()=>{if(settled){q.result.close();return;}const c=q.result;db=c;c.onversionchange=()=>{c.close();if(db===c){db=null;opening=null;}};resolve(c);};}).catch(e=>{opening=null;throw e;});return opening;}
 async function transaction(job,expectedRevision){try{const c=await open();return await new Promise(resolve=>{let tx,answer={ok:false,code:'failed'};try{tx=c.transaction('checkpoint',job?'readwrite':'readonly');const s=tx.objectStore('checkpoint');if(s.keyPath!=='id'){tx.abort();resolve({ok:false,code:'corrupt'});return;}const q=s.getAll(undefined,2);q.onsuccess=()=>{const rows=q.result,r=rows[0];if(rows.length>1||(r&&!validRow(r))){answer={ok:false,code:'corrupt'};return;}const revision=r?.revision||0;if(!job){answer={ok:true,revision,checkpoint:r?.checkpoint||null};return;}
 if(r?.operationId===job.operationId){answer=equalJob(r,job)?{ok:true,revision,duplicate:true}:{ok:false,code:'conflict'};return;}if(revision!==expectedRevision){answer={ok:false,code:'conflict'};return;}if(revision>=Number.MAX_SAFE_INTEGER){answer={ok:false,code:'corrupt'};return;}
 try{const put=s.put({id:'state',schema:1,revision:revision+1,operationId:job.operationId,checkpoint:canonical(job.checkpoint)});put.onsuccess=()=>{answer={ok:true,revision:revision+1,duplicate:false};};put.onerror=()=>{answer={ok:false,code:code(put.error)};};}catch(e){answer={ok:false,code:code(e)};tx.abort();}
 };}catch(e){resolve({ok:false,code:code(e)});return;}tx.oncomplete=()=>resolve(answer);tx.onabort=()=>resolve(!answer.ok&&answer.code!=='failed'?answer:{ok:false,code:code(tx.error)});tx.onerror=()=>{};});}catch(e){return {ok:false,code:code(e)};}}
 return {read:()=>transaction(),write:(job,revision)=>validJob(job)&&Number.isSafeInteger(revision)&&revision>=0?transaction(job,revision):Promise.resolve({ok:false,code:'corrupt'}),close(){db?.close();db=null;opening=null;}};
}
export function createJointCheckpointStore(factory){return createCheckpointStore({dbName:JOINT_CHECKPOINT_DB,valid:validCheckpoint,canonical:canonicalCheckpoint},factory,arguments.length===0);}
