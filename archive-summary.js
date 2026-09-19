// Read-only archive projections. No score writes, invented accuracy or unlocks.
import {validTelemetryRecord} from './telemetry.js';
import {validFramePerf,summarizeFramePerf} from './frame-stats.js';
export {summarizeFramePerf};
export const ARCHIVE_LIMIT=2000;
export const WEAPON_LABELS=['VANGUARD','BREACHER','GHOST','ARC BLADE','TEMPEST','HALO','RAILSPIKE','VOLT'];
const finite=(v,max=1e7)=>Number.isFinite(v)&&v>=0&&v<=max;
export function archiveRecord(r){
 try{
  if(!validTelemetryRecord(r)||!r.id||r.map.length>80||r.finishedAt<r.startedAt)return null;
  if(!r.stages.every(s=>s&&Number.isInteger(s.stage)&&s.stage>=0&&s.stage<=50&&finite(s.seconds,604800)&&finite(s.damage)&&finite(s.shots)&&typeof s.died==='boolean'))return null;
  const shots=Array.isArray(r.weaponShots)&&r.weaponShots.length<=32&&r.weaponShots.every(n=>Number.isInteger(n)&&finite(n))?[...r.weaponShots]:null;
  return {schema:1,id:r.id,map:r.map,mode:r.mode,difficulty:r.difficulty,startStage:r.startStage,endStage:r.endStage,fromCheckpoint:r.fromCheckpoint,won:r.won,kills:r.kills,time:r.time,damage:r.damage,shots:r.shots,weaponShots:shots,startedAt:r.startedAt,finishedAt:r.finishedAt,perf:r.perf&&validFramePerf(r.perf)?{...r.perf}:null,death:r.death?{stage:Number.isInteger(r.death.stage)&&r.death.stage>=0&&r.death.stage<=50?r.death.stage:r.endStage,x:r.death.x,z:r.death.z}:null,stages:r.stages.map(s=>({stage:s.stage,seconds:s.seconds,damage:s.damage,shots:s.shots,died:s.died}))};
 }catch{return null;}
}
export function prepareArchive(raw){
 const input=Array.isArray(raw)?raw:[],records=[],seen=new Set();let rejected=0,duplicates=0;
 for(const item of input.slice(0,ARCHIVE_LIMIT)){const r=archiveRecord(item);if(!r){rejected++;continue;}if(seen.has(r.id)){duplicates++;continue;}seen.add(r.id);records.push(r);}
 records.sort((a,b)=>b.finishedAt-a.finishedAt||a.id.localeCompare(b.id));
 return {records,rejected,duplicates,truncated:input.length>ARCHIVE_LIMIT};
}
export function filterArchive(records,{map='all',difficulty='all',mode='all',origin='all',days='all'}={},now=Date.now()){
 const span=['7','30','90'].includes(String(days))?Number(days)*86400000:null;
 return records.filter(r=>(map==='all'||r.map===map)&&(difficulty==='all'||r.difficulty===difficulty)&&(mode==='all'||r.mode===mode)&&(origin==='all'||r.fromCheckpoint===(origin==='resumed'))&&(span===null||r.finishedAt>=now-span&&r.finishedAt<=now));
}
export function summarizeArchive(records){
 const maps=new Map(),weapons=Array(8).fill(0);let wins=0,seconds=0,kills=0,shots=0,damage=0,best=null,unclassified=0,missingWeaponRecords=0,stageSeconds=0;
 for(const r of records){
  if(!maps.has(r.map))maps.set(r.map,{map:r.map,attempts:0,wins:0,best:null,deaths:new Map()});
  const m=maps.get(r.map);m.attempts++;wins+=Number(r.won);m.wins+=Number(r.won);seconds+=r.time;kills+=r.kills;shots+=r.shots;damage+=r.damage;stageSeconds+=r.stages.reduce((n,s)=>n+s.seconds,0);
  // A genuine chapter-start, unresumed victory only. Never rank stage practice or a mid-chapter start.
  if(r.won&&!r.fromCheckpoint&&r.mode!=='replay'&&r.startStage===0){m.best=m.best===null?r.time:Math.min(m.best,r.time);best=best===null?r.time:Math.min(best,r.time);}
  if(!r.won){const stage=r.death?.stage??r.endStage;m.deaths.set(stage,(m.deaths.get(stage)||0)+1);}
  let classified=0;if(r.weaponShots){r.weaponShots.forEach((n,i)=>{if(i<8&&i!==3){weapons[i]+=n;classified+=n;}});}else missingWeaponRecords++;
  unclassified+=Math.max(0,r.shots-classified);
 }
 return {attempts:records.length,wins,losses:records.length-wins,winRate:records.length?wins/records.length:null,seconds,stageSeconds,kills,shots,damage,best,unclassified,missingWeaponRecords,weapons,maps:[...maps.values()].map(m=>({...m,deaths:[...m.deaths].sort((a,b)=>b[1]-a[1]||a[0]-b[0])})).sort((a,b)=>a.map.localeCompare(b.map))};
}
export function exportArchive(records,filters={},now=Date.now()){
 return JSON.stringify({app:'neon-eclipse',type:'read-only-operations-archive',schema:1,exportedAt:new Date(now).toISOString(),filters,notes:'Telemetry subset, NOT a game-save backup. Times and kills on resumed attempts may include checkpoint history. Weapon bars are recorded shots, not accuracy or kills. No positions are exported.',records:records.map(({death,...r})=>({...r,death:death?{stage:death.stage}:null}))},null,2);
}
export function duration(seconds){if(!finite(seconds,1e12))return '—';const n=Math.floor(seconds);return `${Math.floor(n/3600)}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
