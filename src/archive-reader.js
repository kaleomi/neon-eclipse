// Never calls createTelemetryStore(): its first read may create an empty database.
import {TELEMETRY_DB,TELEMETRY_STORE} from './telemetry.js';
import {ARCHIVE_LIMIT} from './archive-summary.js';
export function readArchive({factory,timeout=5000}={}){
 return new Promise(resolve=>{
  let settled=false,db,tx,request,absent=false;
  const finish=result=>{if(settled)return;settled=true;clearTimeout(timer);try{db?.close();}catch{}resolve(result);};
  const timer=setTimeout(()=>{try{tx?.abort();}catch{}finish({ok:false,code:'timeout'});},timeout);
  try{
   const idb=factory===undefined?globalThis.indexedDB:factory;
   if(!idb){finish({ok:false,code:'unavailable'});return;}
   request=idb.open(TELEMETRY_DB);
   request.onupgradeneeded=()=>{absent=true;try{request.transaction.abort();}catch{}finish({ok:true,records:[],code:'empty'});};
   request.onblocked=()=>finish({ok:false,code:'blocked'});
   request.onerror=()=>finish(absent?{ok:true,records:[],code:'empty'}:{ok:false,code:request.error?.name==='SecurityError'?'denied':'failed'});
   request.onsuccess=()=>{
    db=request.result;if(settled){db.close();return;}
    if(db.version!==1||!db.objectStoreNames.contains(TELEMETRY_STORE)){finish({ok:false,code:'unsupported'});return;}
    try{
     tx=db.transaction(TELEMETRY_STORE,'readonly');let rows=[];
     db.onversionchange=()=>{try{tx.abort();}catch{}finish({ok:false,code:'changed'});};
     const q=tx.objectStore(TELEMETRY_STORE).getAll(undefined,ARCHIVE_LIMIT+1);q.onsuccess=()=>{rows=q.result;};
     tx.oncomplete=()=>finish({ok:true,records:rows,code:rows.length?'ready':'empty'});
     tx.onabort=()=>finish({ok:false,code:'failed'});tx.onerror=()=>{};
    }catch{finish({ok:false,code:'failed'});}
   };
  }catch{finish({ok:false,code:'denied'});}
 });
}
