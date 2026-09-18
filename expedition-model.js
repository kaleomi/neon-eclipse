// Local progress / score rules, not a server-verified leaderboard.
import {flightRecordFromResult} from './flight-records-model.js';
import {JOINT_STAGES} from './joint-mission.js';
import {validCheckpoint,canonicalCheckpoint,checkpointFromMission,CHECKPOINT_STAGES} from './joint-checkpoint-model.js';
import {validNavalCheckpoint,canonicalNavalCheckpoint,navalCheckpointFromMission,NAVAL_CHECKPOINT_STAGES,navalCheckpointLabel} from './naval-checkpoint-model.js';

export const EXPEDITION_RULE='front4-v1';
export const EXPEDITION_SCHEMA=2;
export const EXPEDITION_RECORD_LIMIT=1000;
export const EXPEDITION_MISSIONS=Object.freeze([
  {id:'escort',title:'荒原车队护送',rule:'escort-v1',selectable:true},
  {id:'naval',title:'南湾突围',rule:'naval-v1',selectable:true},
  {id:'recon',title:'回声航线',rule:'recon-v1',selectable:false},
  {id:'joint',title:'海空接力',rule:'joint-v1',selectable:false}
].map(Object.freeze));
export const EXPEDITION_DIFFICULTIES=Object.freeze({easy:'简单',normal:'普通',hard:'困难',fixed:'固定规则'});
const choices=['easy','normal','hard'];
const idOK=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{16,96}$/.test(id);
const timeOK=n=>Number.isSafeInteger(n)&&n>=0&&n<=8640000000000000;
const clone=value=>JSON.parse(JSON.stringify(value));
const missionById=id=>EXPEDITION_MISSIONS.find(m=>m.id===id);
const nodeStages=id=>id==='naval'?NAVAL_CHECKPOINT_STAGES:id==='joint'?CHECKPOINT_STAGES:null;
export const expeditionDifficulty=(mission,difficulty)=>mission.selectable?difficulty:'fixed';
let serial=0;
export const newExpeditionId=()=>globalThis.crypto?.randomUUID?.()||`exp-${Date.now()}-${++serial}-${Math.random().toString(36).slice(2).padEnd(12,'0')}`;
export const emptyExpedition=()=>({schema:EXPEDITION_SCHEMA,rule:EXPEDITION_RULE,campaign:null,records:[],checkpoint:null,undo:null});
export const nextExpeditionMission=a=>a?.campaign?EXPEDITION_MISSIONS[a.campaign.completed.length]||null:null;

export function validExpeditionRecord(r){
  const mission=missionById(r?.mission);
  if(!mission||!idOK(r.id)||!idOK(r.campaignId)||r.rule!==mission.rule||
    !(mission.selectable?choices.includes(r.difficulty):r.difficulty==='fixed')||
    !Number.isSafeInteger(r.elapsedMs)||r.elapsedMs<=0||r.elapsedMs>86400000||
    (r.mission==='recon'&&r.elapsedMs>300000)||!timeOK(r.completedAt))return false;
  if(r.schema===1&&r.resumed===false)return true; // Existing qualified records keep their format/IDs.
  const stages=nodeStages(r.mission),resume=r.resume;
  return r.schema===2&&r.resumed===true&&!!stages&&!!resume&&typeof resume.stage==='string'&&Object.hasOwn(stages,resume.stage)&&
    Number.isSafeInteger(resume.elapsedMs)&&resume.elapsedMs>=0&&resume.elapsedMs<=r.elapsedMs;
}
export function validExpeditionCheckpoint(c){
  if(!c||!idOK(c.campaignId)||!idOK(c.attemptId)||!nodeStages(c.mission)||typeof c.node?.stage!=='string')return false;
  return (c.mission==='naval'?validNavalCheckpoint(c.node):validCheckpoint(c.node))&&c.node.elapsedMs<86400000;
}
export function canonicalExpeditionCheckpoint(c){
  return c===null?null:{campaignId:c.campaignId,attemptId:c.attemptId,mission:c.mission,
    node:c.mission==='naval'?canonicalNavalCheckpoint(c.node):canonicalCheckpoint(c.node)};
}
export const expeditionCheckpointRank=c=>Object.keys(nodeStages(c.mission)||{}).indexOf(c.node.stage);
export const expeditionCheckpointLabel=c=>c.mission==='naval'?navalCheckpointLabel(c.node):CHECKPOINT_STAGES[c.node.stage];
function matchesCheckpoint(c,campaign,next){
  return validExpeditionCheckpoint(c)&&!!campaign&&c.campaignId===campaign.id&&c.mission===next?.id&&
    (c.mission!=='naval'||c.node.difficulty===campaign.difficulty);
}
export function validExpedition(a,allowUndo=true){
  if(!a||![1,EXPEDITION_SCHEMA].includes(a.schema)||a.rule!==EXPEDITION_RULE||!Array.isArray(a.records)||
    a.records.length>EXPEDITION_RECORD_LIMIT||!a.records.every(validExpeditionRecord)||
    (a.schema===1&&a.records.some(r=>r.schema!==1||r.resumed)))return false;
  const seen=new Set(),groups=new Map(),byId=new Map();
  for(const r of a.records){
    if(seen.has(r.id))return false;seen.add(r.id);byId.set(r.id,r);
    const group=groups.get(r.campaignId)||[];
    if(group.length>=4||r.mission!==EXPEDITION_MISSIONS[group.length].id||
      (group.length===1&&r.difficulty!==group[0].difficulty))return false;
    group.push(r);groups.set(r.campaignId,group);
  }
  const c=a.campaign;
  if(c===null){if(a.records.length!==0)return false;}
  else if(!c||!idOK(c.id)||!choices.includes(c.difficulty)||!Array.isArray(c.completed)||c.completed.length>4||
    new Set(c.completed).size!==c.completed.length||(groups.get(c.id)?.length||0)!==c.completed.length||
    !c.completed.every((id,i)=>{const r=byId.get(id),m=EXPEDITION_MISSIONS[i];return r?.campaignId===c.id&&r.mission===m.id&&r.difficulty===expeditionDifficulty(m,c.difficulty);}))return false;
  if(a.schema===1)return true; // Read-only adoption; the first deliberate write stores schema 2.
  if(a.checkpoint!==null&&!matchesCheckpoint(a.checkpoint,c,nextExpeditionMission(a)))return false;
  if(a.undo!==null){
    const u=a.undo;
    if(!allowUndo||!u||!timeOK(u.savedAt)||!['import','restore'].includes(u.reason)||
      !u.archive||u.archive.schema!==EXPEDITION_SCHEMA||u.archive.undo!==null||!validExpedition(u.archive,false))return false;
  }
  return true;
}
export function canonicalExpedition(a){
  if(a===null)return null;
  return {schema:EXPEDITION_SCHEMA,rule:a.rule,campaign:a.campaign===null?null:{id:a.campaign.id,difficulty:a.campaign.difficulty,completed:[...a.campaign.completed]},
    records:a.records.map(r=>({schema:r.schema,id:r.id,campaignId:r.campaignId,mission:r.mission,rule:r.rule,difficulty:r.difficulty,resumed:r.resumed,elapsedMs:r.elapsedMs,completedAt:r.completedAt,
      ...(r.resumed?{resume:{stage:r.resume.stage,elapsedMs:r.resume.elapsedMs}}:{})})),
    checkpoint:a.schema===1?null:canonicalExpeditionCheckpoint(a.checkpoint),
    undo:a.schema===1||a.undo===null?null:{savedAt:a.undo.savedAt,reason:a.undo.reason,archive:canonicalExpedition(a.undo.archive)}};
}
export function expeditionSnapshot(a){const value=canonicalExpedition(a);value.undo=null;return value;}
export function newExpeditionCampaign(a,difficulty,id=newExpeditionId()){
  if(!validExpedition(a)||!choices.includes(difficulty)||!idOK(id)||a.records.length>=EXPEDITION_RECORD_LIMIT||
    a.campaign?.id===id||a.records.some(r=>r.campaignId===id))return null;
  return {...canonicalExpedition(a),campaign:{id,difficulty,completed:[]},checkpoint:null};
}
export function expeditionCheckpointFromMission(attempt,m,now=Date.now()){
  if(!attempt||typeof attempt.fromStart!=='boolean'||!nodeStages(attempt.mission)||m?.status!=='active'||(m.recovered===true)!==!attempt.fromStart)return null;
  if(!attempt.fromStart&&(!validExpeditionCheckpoint(attempt.resume)||attempt.resume.campaignId!==attempt.campaignId||attempt.resume.mission!==attempt.mission))return null;
  const node=attempt.mission==='naval'?navalCheckpointFromMission(m,now):checkpointFromMission(m,now);
  const c={campaignId:attempt.campaignId,attemptId:attempt.id,mission:attempt.mission,node};
  return validExpeditionCheckpoint(c)&&(c.mission!=='naval'||node.difficulty===attempt.difficulty)?canonicalExpeditionCheckpoint(c):null;
}
export function saveExpeditionCheckpoint(a,c){
  if(!validExpedition(a)||!matchesCheckpoint(c,a.campaign,nextExpeditionMission(a)))return null;
  return {...canonicalExpedition(a),checkpoint:canonicalExpeditionCheckpoint(c)};
}

// Status='won' alone is insufficient. Resumed results require a campaign-bound safe-node receipt too.
export function expeditionRecordFromMission(attempt,m,extra={},now=Date.now()){
  const spec=missionById(attempt?.mission);
  if(!spec||m?.status!=='won'||!idOK(attempt.id)||!idOK(attempt.campaignId))return null;
  const resumed=attempt.fromStart===false,c=attempt.resume;
  if(resumed){
    if(!validExpeditionCheckpoint(c)||c.campaignId!==attempt.campaignId||c.mission!==spec.id||m.recovered!==true||
      (spec.id==='naval'&&c.node.difficulty!==attempt.difficulty)||m.elapsed*1000<c.node.elapsedMs)return null;
  }else if(attempt.fromStart!==true||m.recovered===true)return null;
  if(spec.id==='escort'){
    if(m.profile?.id!==attempt.difficulty||m.truck?.arrived!==true||!(m.truck.hull>0)||!(extra.roverHull>0)||
      !Array.isArray(m.waves)||m.waves.length!==3||!m.waves.every(x=>x===true)||m.waveIndex!==3||
      !Array.isArray(m.hounds)||m.hounds.length===0||m.hounds.some(h=>h.alive!==false)||
      m.spawned!==m.hounds.length||m.killed!==m.hounds.length)return null;
  }else if(spec.id==='naval'){
    if(m.naval?.profile?.id!==attempt.difficulty||m.complete!==true||m.index!==3||m.escaped!==true||
      !(m.hull>0)||!(m.remaining>0)||!(m.elapsed<m.naval.profile.timeLimit)||
      !Array.isArray(m.naval.members)||m.naval.members.length===0||
      !m.naval.members.every(s=>s.combat?.enemySunk===true||s.escaped===true))return null;
  }else if(spec.id==='recon'){
    const r=flightRecordFromResult(m.result);
    if(m.type!=='recon'||r?.type!=='recon'||r.id!==m.attempt?.id||m.elapsed!==m.result.elapsed)return null;
  }else if(m.stage!=='complete'||!idOK(m.flightId)||!Array.isArray(m.completed)||
    m.completed.length!==JOINT_STAGES.length||!JOINT_STAGES.every((s,i)=>m.completed[i]===s))return null;
  const record={schema:resumed?2:1,id:attempt.id,campaignId:attempt.campaignId,mission:spec.id,rule:spec.rule,
    difficulty:attempt.difficulty,resumed,elapsedMs:Math.round(m.elapsed*1000),completedAt:now,
    ...(resumed?{resume:{stage:c.node.stage,elapsedMs:c.node.elapsedMs}}:{})};
  return validExpeditionRecord(record)?Object.freeze(record):null;
}
export function advanceExpedition(a,record){
  if(!validExpedition(a)||!validExpeditionRecord(record)||!a.campaign||a.records.length>=EXPEDITION_RECORD_LIMIT)return null;
  const next=nextExpeditionMission(a);
  if(!next||record.campaignId!==a.campaign.id||record.mission!==next.id||
    record.difficulty!==expeditionDifficulty(next,a.campaign.difficulty)||a.records.some(r=>r.id===record.id))return null;
  const result=canonicalExpedition(a);result.records.push(clone(record));result.campaign.completed.push(record.id);result.checkpoint=null;
  return validExpedition(result)?result:null;
}
export function summarizeExpedition(a){
  if(!validExpedition(a))throw Error('Invalid expedition archive');
  return EXPEDITION_MISSIONS.flatMap(m=>(m.selectable?choices:['fixed']).map(difficulty=>{
    const all=a.records.filter(r=>r.mission===m.id&&r.difficulty===difficulty&&r.rule===m.rule),records=all.filter(r=>!r.resumed);
    return {mission:m.id,title:m.title,difficulty,count:records.length,resumedCount:all.length-records.length,bestMs:records.length?Math.min(...records.map(r=>r.elapsedMs)):null};
  }));
}
