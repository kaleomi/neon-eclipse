// Local records, not a server-verified leaderboard. Bump a task rule version when its scoring rules change.
export const FLIGHT_RECORD_RULES=Object.freeze({return:'return-v1',recon:'recon-v1'});
export const FLIGHT_RECORD_LIMIT=5000;
const types=['return','recon'],ids=['north-relay','sea-beacon','airfield-terminal'];
let serial=0;
export function createFlightAttempt(type){
 const id=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+(++serial).toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);
 return Object.freeze({id,type,ruleVersion:FLIGHT_RECORD_RULES[type]});
}
export function validFlightRecord(r){
 return !!r&&r.schema===1&&typeof r.id==='string'&&/^[a-zA-Z0-9-]{16,96}$/.test(r.id)&&types.includes(r.type)&&typeof r.ruleVersion==='string'&&new RegExp('^'+r.type+'-v[1-9][0-9]{0,3}$').test(r.ruleVersion)&&Number.isSafeInteger(r.elapsedMs)&&r.elapsedMs>0&&r.elapsedMs<=300000&&Number.isSafeInteger(r.completedAt)&&r.completedAt>=0&&r.completedAt<=8640000000000000;
}
export function flightRecordFromResult(result){
 const a=result?.attempt;
 if(!a||!types.includes(a.type)||a.ruleVersion!==FLIGHT_RECORD_RULES[a.type]||result.status!=='won'||!Number.isFinite(result.elapsed)||result.elapsed<=0||result.elapsed>=300||result.tookOff!==true||result.approached!==true||result.landedSafely!==true||result.routeComplete!==true||result.gates!==(a.type==='return'?5:3)||!Number.isFinite(result.stopTime)||result.stopTime<2-1e-8)return null;
 if(a.type==='recon'&&(result.uploaded!==true||!Number.isFinite(result.uploadTime)||result.uploadTime<2-1e-8||!Array.isArray(result.records)||result.records.length!==3||!ids.every((id,i)=>result.records[i]?.id===id)))return null;
 if(a.type==='return'&&result.uploaded!==false)return null;
 const r={schema:1,id:a.id,type:a.type,ruleVersion:a.ruleVersion,elapsedMs:Math.round(result.elapsed*1000),completedAt:result.completedAt};
 return validFlightRecord(r)?Object.freeze(r):null;
}
export function sameFlightRecord(a,b){return ['schema','id','type','ruleVersion','elapsedMs','completedAt'].every(k=>a[k]===b[k]);}
export function summarizeFlightRecords(records){
 if(!Array.isArray(records)||records.length>FLIGHT_RECORD_LIMIT||!records.every(validFlightRecord)||new Set(records.map(r=>r.id)).size!==records.length)throw Error('Invalid flight record archive');
 const groups=[];
 for(const type of types){
  const versions=new Set([FLIGHT_RECORD_RULES[type],...records.filter(r=>r.type===type).map(r=>r.ruleVersion)]);
  for(const ruleVersion of versions){const rows=records.filter(r=>r.type===type&&r.ruleVersion===ruleVersion).sort((a,b)=>b.completedAt-a.completedAt||a.id.localeCompare(b.id));groups.push({type,ruleVersion,current:ruleVersion===FLIGHT_RECORD_RULES[type],count:rows.length,bestMs:rows.length?Math.min(...rows.map(r=>r.elapsedMs)):null,recent:rows.slice(0,5)});}
 }
 return groups;
}
