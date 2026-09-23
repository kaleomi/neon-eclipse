import {FLIGHT_RECORD_LIMIT,validFlightRecord,sameFlightRecord,summarizeFlightRecords} from './flight-records-model.js';
export const FLIGHT_RECORD_DB='neon-eclipse.flight-records.v1';
export const RECORD_ERRORS=Object.freeze({unavailable:'浏览器不支持成绩存储',blocked:'其他页面正在占用旧数据库，请关闭旧页面后重试',corrupt:'成绩数据损坏或格式不兼容，未覆盖原数据',full:'成绩已达到 5000 条上限，原记录已保留',conflict:'同一任务编号的成绩冲突，未覆盖原记录',quota:'存储空间不足，本轮成绩暂未保存',denied:'浏览器拒绝存储访问',failed:'成绩读写失败，请重试'});
const errorCode=e=>e?.name==='QuotaExceededError'?'quota':['SecurityError','NotAllowedError'].includes(e?.name)?'denied':['VersionError','NotFoundError','DataError'].includes(e?.name)?'corrupt':e?.code||'failed';
export function createFlightRecordStore(factory){
 const useDefault=arguments.length===0;
 let db=null,opening=null;
 function open(){
  if(db)return Promise.resolve(db);if(opening)return opening;
  opening=new Promise((resolve,reject)=>{
   let request,settled=false;
   try{if(useDefault)factory=globalThis.indexedDB;if(!factory){reject({code:'unavailable'});return;}request=factory.open(FLIGHT_RECORD_DB,1);}catch(e){reject(e);return;}
   request.onupgradeneeded=event=>{if(settled){request.transaction.abort();return;}if(event.oldVersion===0)request.result.createObjectStore('attempts',{keyPath:'id'});};
   request.onblocked=()=>{settled=true;reject({code:'blocked'});};
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{if(settled){request.result.close();return;}const connection=request.result;db=connection;connection.onversionchange=()=>{connection.close();if(db===connection){db=null;opening=null;}};resolve(connection);};
  }).catch(e=>{opening=null;throw e;});
  return opening;
 }
 async function transaction(record){
  try{
   const connection=await open();
   return await new Promise(resolve=>{
    let tx,answer={ok:false,code:'failed'};
    try{tx=connection.transaction('attempts',record?'readwrite':'readonly');const store=tx.objectStore('attempts');if(store.keyPath!=='id'){answer={ok:false,code:'corrupt'};tx.abort();resolve(answer);return;}
     const request=store.getAll(undefined,FLIGHT_RECORD_LIMIT+1);
     request.onsuccess=()=>{
      const rows=request.result;
      try{summarizeFlightRecords(rows);}catch{answer={ok:false,code:'corrupt'};return;}
      if(!record){answer={ok:true,records:rows};return;}
      const existing=rows.find(r=>r.id===record.id);
      if(existing){answer=sameFlightRecord(existing,record)?{ok:true,duplicate:true}:{ok:false,code:'conflict'};return;}
      if(rows.length>=FLIGHT_RECORD_LIMIT){answer={ok:false,code:'full'};return;}
      // No awaits inside this transaction. IndexedDB serializes writers across tabs.
      try{const add=store.add({...record});add.onsuccess=()=>{answer={ok:true,duplicate:false};};add.onerror=()=>{answer={ok:false,code:errorCode(add.error)};};}catch(e){answer={ok:false,code:errorCode(e)};tx.abort();}
     };
    }catch(e){resolve({ok:false,code:errorCode(e)});return;}
    tx.oncomplete=()=>resolve(answer); // Success only after commit, not after the add request.
    tx.onabort=()=>resolve(!answer.ok&&answer.code!=='failed'?answer:{ok:false,code:errorCode(tx.error)});
    tx.onerror=()=>{};
   });
  }catch(e){return {ok:false,code:errorCode(e)};}
 }
 return {read:()=>transaction(),save:record=>validFlightRecord(record)?transaction(record):Promise.resolve({ok:false,code:'corrupt'}),close(){db?.close();db=null;opening=null;}};
}
