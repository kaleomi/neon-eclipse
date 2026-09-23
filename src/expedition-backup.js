// Dedicated expedition bundle: never consumes FPS/legacy-checkpoint keys or imports nested undo history.
import {createExpeditionStore} from './expedition-store.js';
import {emptyExpedition,validExpedition,canonicalExpedition,expeditionSnapshot,newExpeditionId,
  nextExpeditionMission,expeditionCheckpointLabel,EXPEDITION_DIFFICULTIES,EXPEDITION_TOTAL} from './expedition-model.js';
export const EXPEDITION_BACKUP_LIMIT=4*1024*1024;
const fail=e=>({ok:false,code:e?.code||'failed'});
export function expeditionArchiveSummary(a){
  return {completed:a.campaign?.completed.length||0,total:EXPEDITION_TOTAL,records:a.records.length,qualified:a.records.filter(r=>!r.resumed).length,
    resumed:a.records.filter(r=>r.resumed).length,difficulty:a.campaign?EXPEDITION_DIFFICULTIES[a.campaign.difficulty]:'未开始',
    next:nextExpeditionMission(a)?.title||(a.campaign?'前 '+EXPEDITION_TOTAL+' 关完成':'尚未开始'),
    checkpoint:a.checkpoint?expeditionCheckpointLabel(a.checkpoint):'无安全节点'};
}
export function makeExpeditionBundle(archive,now=Date.now()){
  if(!validExpedition(archive))throw Error('Invalid expedition archive');
  return {app:'neon-eclipse',kind:'expedition',schema:1,exportedAt:new Date(now).toISOString(),archive:expeditionSnapshot(archive)};
}
export function parseExpeditionBundle(input){
  let text,bundle;
  try{text=typeof input==='string'?input:JSON.stringify(input);if(typeof text!=='string')return {ok:false,code:'invalid'};
    if(new TextEncoder().encode(text).length>EXPEDITION_BACKUP_LIMIT)return {ok:false,code:'too-large'};bundle=JSON.parse(text);
  }catch{return {ok:false,code:'invalid'};}
  if(bundle?.app!=='neon-eclipse'||bundle.kind!=='expedition'||bundle.schema!==1||
    typeof bundle.exportedAt!=='string'||!Number.isFinite(Date.parse(bundle.exportedAt))||!validExpedition(bundle.archive))return {ok:false,code:'invalid'};
  return {ok:true,bundle:{...bundle,archive:expeditionSnapshot(bundle.archive)}};
}
export function createExpeditionBackup({store=createExpeditionStore(),now=()=>Date.now()}={}){
  const plans=new WeakMap();
  async function read(){
    try{const r=await store.read(),archive=r.checkpoint??emptyExpedition();
      return r.ok&&validExpedition(archive)?{ok:true,archive:canonicalExpedition(archive),revision:r.revision}:r.ok?{ok:false,code:'corrupt'}:r;
    }catch(e){return fail(e);}
  }
  async function exportBundle(){const r=await read();return r.ok?{ok:true,bundle:makeExpeditionBundle(r.archive,now())}:r;}
  function plan(current,incoming,reason){
    const archive=expeditionSnapshot(incoming),unchanged=JSON.stringify(archive)===JSON.stringify(expeditionSnapshot(current.archive));
    archive.undo={savedAt:now(),reason,archive:expeditionSnapshot(current.archive)};
    if(!validExpedition(archive))return {ok:false,code:'invalid'};
    const view=Object.freeze({ok:true,reason,unchanged,before:expeditionArchiveSummary(current.archive),after:expeditionArchiveSummary(archive),
      undoAt:current.archive.undo?.savedAt??null});
    plans.set(view,{revision:current.revision,unchanged,job:{operationId:newExpeditionId()+':'+reason,checkpoint:archive}});return view;
  }
  async function previewImport(input){
    const parsed=parseExpeditionBundle(input);if(!parsed.ok)return parsed;
    const r=await read();return r.ok?plan(r,parsed.bundle.archive,'import'):r;
  }
  async function previewRestore(){
    const r=await read();if(!r.ok)return r;
    return r.archive.undo?plan(r,r.archive.undo.archive,'restore'):{ok:false,code:'no-backup'};
  }
  async function apply(view){
    const p=plans.get(view);if(!p)return {ok:false,code:'invalid'};
    if(p.unchanged){const r=await read();return !r.ok?r:r.revision===p.revision?{ok:true,unchanged:true,revision:r.revision}:{ok:false,code:'conflict'};}
    // One CAS transaction writes replacement AND its predecessor. Same plan retries with the same operation ID/payload.
    try{return await store.write(p.job,p.revision);}catch(e){return fail(e);}
  }
  return {read,exportBundle,previewImport,previewRestore,apply,close:()=>store.close()};
}
