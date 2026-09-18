// SaveHub: one place that knows every persistent slot NEON ECLIPSE writes.
// It does not change any slot format. Owner modules keep reading/writing their own keys;
// SaveHub only adds health inspection, export, import preview/apply and pre-import backup.
// Pure module: storage is injectable, no DOM, covered by test-save-hub.mjs.
export const SAVE_HUB_SCHEMA=1;
export const SAVE_HUB_APP='neon-eclipse';
export const BACKUP_KEY='neon-eclipse.save-hub.backup.v1';
export const BUNDLE_LIMIT=4*1024*1024;
const parse=text=>{try{return {ok:true,value:JSON.parse(text)};}catch{return {ok:false};}};
const versioned=(allowed,check=()=>true)=>text=>{const p=parse(text);if(!p.ok||!p.value||typeof p.value!=='object')return 'corrupt';return allowed.includes(p.value.version)&&check(p.value)?'ok':'unknown';};
const oneOf=values=>text=>values.includes(text)?'ok':'unknown';
const chapterSlot=(key,map,title)=>({key,group:'chapter',map,title,validate:versioned([1],v=>Number.isInteger(v.unlocked))});
// Slot order is also the order shown in the UI. Keys mirror the owner modules exactly.
export const SLOTS=Object.freeze([
 {key:'neon-eclipse.journey.v7',group:'journey',title:'连续战役（当前）',validate:versioned([7])},
 {key:'neon-eclipse.journey.v6',group:'journey',title:'连续战役（八章旧档）',legacy:true,validate:versioned([6])},
 {key:'neon-eclipse.journey.v5',group:'journey',title:'连续战役（七章旧档）',legacy:true,validate:versioned([5])},
 {key:'neon-eclipse.journey.v4',group:'journey',title:'连续战役（六章旧档）',legacy:true,validate:versioned([4])},
 {key:'neon-eclipse.journey.v3',group:'journey',title:'连续战役（五章旧档）',legacy:true,validate:versioned([3])},
 {key:'neon-eclipse.journey.v2',group:'journey',title:'连续战役（四章旧档）',legacy:true,validate:versioned([2])},
 {key:'neon-eclipse.journey.v1',group:'journey',title:'连续战役（三章旧档）',legacy:true,validate:versioned([1])},
 chapterSlot('neon-eclipse.campaign.v1','reactor','第 1 章 反应堆设施'),
 chapterSlot('neon-eclipse.station.v1','station','第 2 章 地下运输站'),
 chapterSlot('neon-eclipse.roof.v1','roof','第 3 章 天穹通讯枢纽'),
 chapterSlot('neon-eclipse.tower.v1','tower','第 4 章 多层中枢塔'),
 chapterSlot('neon-eclipse.train.v1','train','第 5 章 疾驰货运列车'),
 chapterSlot('neon-eclipse.harbor.v1','harbor','第 6 章 风暴港口'),
 chapterSlot('neon-eclipse.orbital.v1','orbital','第 7 章 轨道电梯基座'),
 chapterSlot('neon-eclipse.datacenter.v1','datacenter','第 8 章 沉没数据中心'),
 chapterSlot('neon-eclipse.polar.v1','polar','第 9 章 极地雷达阵列'),
 {key:'neon-eclipse.stars.v1',group:'collection',title:'隐藏星星',validate:versioned([1,2,3,4,5,6],v=>Array.isArray(v.stars))},
 {key:'neon-eclipse.chapter-achievements.v1',group:'collection',title:'单章成就',validate:versioned([1],v=>Array.isArray(v.awards))},
 {key:'neon-eclipse.achievement-notices.v1',group:'collection',title:'成就提示状态',validate:text=>parse(text).ok?'ok':'corrupt'},
 {key:'neon-eclipse.combat-difficulty.v1',group:'settings',title:'主线战斗难度',validate:oneOf(['easy','normal','hard'])},
 {key:'neon-eclipse.naval-difficulty.v1',group:'settings',title:'海上任务难度',validate:oneOf(['easy','normal','hard'])},
 {key:'neon-eclipse.presentation.v1',group:'settings',title:'画质与 HUD 偏好',validate:text=>{const p=parse(text);return p.ok&&p.value&&typeof p.value==='object'?'ok':'corrupt';}},
 {key:'neon-eclipse.controls.v1',group:'settings',title:'操作设置',validate:text=>{const p=parse(text);return p.ok&&p.value&&typeof p.value==='object'?'ok':'corrupt';}},
 {key:'neon-eclipse-flight-invert-ws',group:'settings',title:'飞机 W/S 反向',validate:oneOf(['true','false'])}
]);
export const SLOT_KEYS=Object.freeze(SLOTS.map(s=>s.key));
export const GROUP_TITLES=Object.freeze({journey:'连续战役',chapter:'单章检查点',collection:'收集与成就',settings:'偏好设置',records:'飞行成绩'});
const slotFor=key=>SLOTS.find(s=>s.key===key)||null;
// Read failure is not an empty slot: backups must fail closed rather than omit unreadable data.
function readRaw(storage,key){const v=storage.getItem(key);return typeof v==='string'?v:null;}
export function inspectSlot(storage,slot){
 let raw;try{raw=readRaw(storage,slot.key);}catch{return {key:slot.key,title:slot.title,group:slot.group,status:'unavailable',bytes:0,legacy:!!slot.legacy};}
 if(raw===null)return {key:slot.key,title:slot.title,group:slot.group,status:'empty',bytes:0,legacy:!!slot.legacy};
 let status;try{status=slot.validate(raw);}catch{status='corrupt';}
 return {key:slot.key,title:slot.title,group:slot.group,status,bytes:raw.length,legacy:!!slot.legacy};
}
export function validBundle(bundle){
 if(!bundle||typeof bundle!=='object'||bundle.app!==SAVE_HUB_APP||bundle.schema!==SAVE_HUB_SCHEMA)return false;
 if(!bundle.slots||typeof bundle.slots!=='object'||Array.isArray(bundle.slots))return false;
 if(!Object.values(bundle.slots).every(v=>typeof v==='string'))return false;
 if(bundle.flightRecords!==undefined&&!Array.isArray(bundle.flightRecords))return false;
 return true;
}
export function createSaveHub({storage,records=null,now=()=>Date.now()}={}){
 if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
 const available=!!storage;let mutating=false;
 function health(){return SLOTS.map(slot=>available?inspectSlot(storage,slot):{key:slot.key,title:slot.title,group:slot.group,status:'unavailable',bytes:0,legacy:!!slot.legacy});}
 function snapshot(){if(!available)throw Error('Storage unavailable');const slots={};for(const slot of SLOTS){const raw=readRaw(storage,slot.key);if(raw!==null)slots[slot.key]=raw;}return slots;}
 async function exportBundle(){
  const bundle={app:SAVE_HUB_APP,schema:SAVE_HUB_SCHEMA,exportedAt:new Date(now()).toISOString(),slots:snapshot()};
  if(records){try{const result=await records.read();if(result.ok)bundle.flightRecords=result.records;else bundle.flightRecordsError=result.code||'failed';}catch{bundle.flightRecordsError='failed';}}
  return bundle;
 }
 function previewImport(bundle){
  if(!validBundle(bundle))return {ok:false,code:'invalid',entries:[]};
  let currentSlots;try{currentSlots=snapshot();}catch{return {ok:false,code:'unavailable',entries:[]};}
  const entries=[];
  for(const [key,raw] of Object.entries(bundle.slots)){
   const slot=slotFor(key);
   if(!slot){entries.push({key,title:key,group:'unknown',action:'skip',reason:'unknown-key'});continue;}
   let status;try{status=slot.validate(raw);}catch{status='corrupt';}
   if(status==='corrupt'){entries.push({key,title:slot.title,group:slot.group,action:'skip',reason:'corrupt'});continue;}
   const current=currentSlots[key]??null;
   entries.push({key,title:slot.title,group:slot.group,action:current===null?'add':current===raw?'same':'overwrite',reason:status==='unknown'?'unknown-version':null,bytes:raw.length});
  }
  const missing=SLOTS.filter(s=>!(s.key in bundle.slots)&&Object.hasOwn(currentSlots,s.key)).map(s=>({key:s.key,title:s.title,group:s.group}));
  const flightRecords=Array.isArray(bundle.flightRecords)?bundle.flightRecords.length:0;
  return {ok:true,entries,missing,flightRecords,exportedAt:bundle.exportedAt||null};
 }
 function writeBackup(){
  if(!available)return false;
  try{storage.setItem(BACKUP_KEY,JSON.stringify({app:SAVE_HUB_APP,schema:SAVE_HUB_SCHEMA,createdAt:new Date(now()).toISOString(),slots:snapshot()}));return true;}catch{return false;}
 }
 function readBackupStrict(){
  const p=parse(readRaw(storage,BACKUP_KEY)||'null');
  return p.ok&&p.value&&validBundle({...p.value,exportedAt:p.value.createdAt})?p.value:null;
 }
 function readBackup(){if(!available)return null;try{return readBackupStrict();}catch{return null;}}
 function applySlots(slots,{replace=false,preserveRaw=false}={}){
  const written=[],removed=[],failed=[],skipped=[];
  for(const [key,raw] of Object.entries(slots)){
   const slot=slotFor(key);if(!slot){skipped.push({key,reason:'unknown-key'});continue;}
   // Internal undo restores the exact original bytes, even if the old slot was corrupt. User imports still validate.
   let status='ok';if(!preserveRaw)try{status=slot.validate(raw);}catch{status='corrupt';}
   if(status==='corrupt'){skipped.push({key,reason:'corrupt'});continue;}
   try{storage.setItem(key,raw);written.push(key);}catch{failed.push({key,reason:'write-failed'});}
  }
  if(replace)for(const slot of SLOTS){if(slot.key in slots)continue;try{if(readRaw(storage,slot.key)!==null){storage.removeItem(slot.key);removed.push(slot.key);}}catch{failed.push({key:slot.key,reason:'remove-failed'});}}
  return {written,removed,failed,skipped};
 }
 async function importBundle(bundle,{mode='merge'}={}){
  if(mutating)return {ok:false,code:'busy'};
  if(!available)return {ok:false,code:'unavailable'};
  if(!validBundle(bundle))return {ok:false,code:'invalid'};
  try{const text=JSON.stringify(bundle);if(new TextEncoder().encode(text).length>BUNDLE_LIMIT)return {ok:false,code:'too-large'};bundle=JSON.parse(text);}catch{return {ok:false,code:'invalid'};}
  mutating=true;
  try{
   if(!writeBackup())return {ok:false,code:'backup-failed'};
   const result=applySlots(bundle.slots,{replace:mode==='replace'});
   const flight={saved:0,duplicates:0,failed:0,skipped:0};
   if(records&&Array.isArray(bundle.flightRecords)){
    for(const record of bundle.flightRecords){
     try{const r=await records.save(record);if(r.ok)flight[r.duplicate?'duplicates':'saved']++;else if(r.code==='corrupt')flight.skipped++;else flight.failed++;}catch{flight.failed++;}
    }
   }else if(Array.isArray(bundle.flightRecords)&&bundle.flightRecords.length)flight.skipped=bundle.flightRecords.length;
   const ok=result.failed.length===0&&flight.failed===0;
   return {ok,code:ok?'done':'partial',mode,...result,flight,backup:BACKUP_KEY};
  }finally{mutating=false;}
 }
 function restoreBackup(){
  if(mutating)return {ok:false,code:'busy'};
  if(!available)return {ok:false,code:'unavailable'};
  let backup,current;
  try{backup=readBackupStrict();if(!backup)return {ok:false,code:'no-backup'};current=snapshot();}catch{return {ok:false,code:'unavailable'};}
  mutating=true;
  try{
   const result=applySlots(backup.slots,{replace:true,preserveRaw:true});
   // localStorage is not transactional. Keep the original restore target until every slot succeeds.
   if(result.failed.length===0){
    try{storage.setItem(BACKUP_KEY,JSON.stringify({app:SAVE_HUB_APP,schema:SAVE_HUB_SCHEMA,createdAt:new Date(now()).toISOString(),slots:current}));}
    catch{result.failed.push({key:BACKUP_KEY,reason:'backup-write-failed'});}
   }
   return {ok:result.failed.length===0,code:result.failed.length?'partial':'done',createdAt:backup.createdAt,...result};
  }finally{mutating=false;}
 }
 return {available,health,snapshot,exportBundle,previewImport,importBundle,restoreBackup,readBackup,writeBackup:()=>!mutating&&writeBackup()};
}
export function bundleFileName(bundle){return `neon-eclipse-save-${(bundle.exportedAt||new Date().toISOString()).slice(0,19).replace(/[:T]/g,'-')}.json`;}
