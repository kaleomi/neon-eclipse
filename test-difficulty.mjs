import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DIFFICULTIES,DIFFICULTY_KEY,normalizeDifficulty,readDifficulty,writeDifficulty,incomingDamage,outgoingDamage,attackCooldown,spawnScale} from './combat-difficulty.js';
for(const value of [undefined,null,'bad','toString','__proto__'])assert.equal(normalizeDifficulty(value),'normal');
const data=new Map([['campaign-sentinel','preserved']]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
assert.equal(readDifficulty(storage),'normal');
for(const id of ['easy','normal','hard','nightmare']){
 assert(writeDifficulty(id,storage));assert.equal(readDifficulty(storage),id);
 assert.equal(incomingDamage(20,id),20*DIFFICULTIES[id].incoming);
 assert.equal(outgoingDamage(40,id),40*DIFFICULTIES[id].outgoing);
 assert.equal(attackCooldown(2,id),2*DIFFICULTIES[id].cooldown);
 assert.equal(incomingDamage(0,id),0);assert.equal(outgoingDamage(0,id),0);
}
assert.equal(data.get('campaign-sentinel'),'preserved');assert.equal(data.size,2);
assert.equal(incomingDamage(20,'normal'),20);assert.equal(outgoingDamage(40,'normal'),40);assert.equal(attackCooldown(2,'normal'),2);
assert(incomingDamage(20,'easy')<incomingDamage(20,'normal'));assert(incomingDamage(20,'hard')>incomingDamage(20,'normal'));
assert.equal(incomingDamage(20,'nightmare'),40);assert.equal(outgoingDamage(40,'nightmare'),20);assert.equal(attackCooldown(2,'nightmare'),1);
assert.equal(spawnScale('nightmare'),2);for(const id of ['easy','normal','hard'])assert.equal(spawnScale(id),1);
assert.equal(spawnScale(),1,'module default stays normal scale');assert.equal(spawnScale(readDifficulty(storage)),2,'storage-selected nightmare doubles spawns');
assert(outgoingDamage(40,'easy')>outgoingDamage(40,'hard'));assert(attackCooldown(2,'easy')>attackCooldown(2,'hard'));
const denied={getItem(){throw Error('denied')},setItem(){throw Error('quota')}};assert.equal(readDifficulty(denied),'normal');assert.equal(writeDifficulty('hard',denied),false);
data.set(DIFFICULTY_KEY,'corrupt');assert.equal(readDifficulty(storage),'normal');
// Integration guards: do not leave scaling as an unused settings-only helper.
const app=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8'),ai=fs.readFileSync(new URL('./enemy-ai.js',import.meta.url),'utf8');
assert(app.includes('damage=p4Incoming(damage);'));
assert(app.includes('const p4Incoming=n=>incomingDamage(n,p4?.difficulty)'));
assert(app.includes('const p4Outgoing=(n,zone)=>p4Damage(outgoingDamage(n,p4?.difficulty)'));
assert(app.includes('const p4Cooldown=n=>attackCooldown(n,p4?.difficulty)'));
const {p4Damage}=await import('./p4-runtime.js');
for(const id of ['easy','normal','hard']){const p4={difficulty:id,params:{incoming:1,health:1,enemyCooldown:1}};for(const [name,expected] of [['p4Incoming',incomingDamage(20,id)],['p4Outgoing',outgoingDamage(20,id)],['p4Cooldown',attackCooldown(20,id)]]){const expression=app.match(new RegExp('const '+name+'=([^;]+);'))?.[1];assert(expression,name+' connected wrapper');const fn=Function('p4','incomingDamage','outgoingDamage','attackCooldown','p4Damage','return ('+expression+')')(p4,incomingDamage,outgoingDamage,attackCooldown,p4Damage);assert.equal(fn(20),expected);}}
assert(app.includes('const bossDamage=p4Incoming(overseer?.update('));
assert(app.includes('overseer.hit(impact.object,p4Outgoing(damageAtDistance('));
assert(app.includes('const baseDamage=p4Outgoing(damageAtDistance('));
assert(app.includes('scaleCooldown:p4Cooldown'));
assert(app.includes('const scale=spawnScale();'),'nightmare spawn scaling wired into spawnEncounter');
assert(app.includes("const bossStage=Array.from({length:stage.count},(_,i)=>roleForStage(stage,i)).includes('warden');"),'boss stages never doubled');
assert(app.includes('const count=Math.min(want,spots.length);'),'graceful when spawn sites run out');
const missionSrc=fs.readFileSync(new URL('./mission.js',import.meta.url),'utf8');
assert(missionSrc.includes('chooseEncounterSpawns(stage,player,obstacles,count=stage.count)'),'spawn site pool honors requested count');assert(ai.includes('enemy.attack=scaleCooldown('));
assert(!app.includes('incomingDamage(hazard.damage)'),'environment damage deliberately unchanged');
console.log('PASS: four difficulty profiles, normal identity, damage/cooldown ordering, zero shield damage, persistence/fallback/save isolation, ordinary and special boss integration');
const {chooseEncounterSpawns}=await import('./mission.js');
const fakeStage={count:4,x:0,z:0};
const baseSpots=chooseEncounterSpawns(fakeStage,{x:0,z:0},[]);
assert.equal(baseSpots.length,4,'default count unchanged');
const doubleSpots=chooseEncounterSpawns(fakeStage,{x:0,z:0},[],8);
assert.equal(doubleSpots.length,8,'nightmare can draw double spawn sites');
console.log('PASS: encounter spawn pool scales with requested nightmare count');
const T=await import('./node_modules/three/build/three.module.js');
const {createEnemyDirector}=await import('./enemy-ai.js');
const {createEnemyModel}=await import('./enemy-model.js');
const {ENEMY_TYPES,createBossState}=await import('./enemy-rules.js');
const random=Math.random;Math.random=()=>.5;
try{
 for(const type of ['assault','ranged','heavy','warden']){
  const values={};
  for(const id of ['easy','normal','hard']){
   const group=createEnemyModel(type),player={position:new T.Vector3(0,1.7,10)},boss=type==='warden';
   const enemy={group,type,boss,bossState:boss?createBossState():null,speed:0,attack:0,charge:0,radius:.65,seed:0,hp:ENEMY_TYPES[type].hp,maxHp:ENEMY_TYPES[type].hp};
   let queued;const director=createEnemyDirector({enemies:[enemy],player,navigation:{direction:()=>({x:0,z:0})},move:()=>{},obstacles:[],projectiles:{queue:(origin,target,isBoss,owner,attack)=>{queued=attack;return true},hasPending:()=>false,cancelOwner:()=>{}},onBossEvent:()=>{},scaleCooldown:t=>attackCooldown(t,id)});
   for(let i=0;i<150&&!queued;i++)director.update(.01,i*.01,0);assert(queued,type+' actual director queues an attack');values[id]=enemy.attack;
   assert(queued.charge>=.45,'telegraph remains readable');
   assert.equal(enemy.charge,queued.charge+(queued.bursts-1)*(queued.burstDelay||.3)+.05);
  }
  assert(values.easy>values.normal&&values.normal>values.hard,type+' cooldown ordering');
 }
}finally{Math.random=random;}
console.log('PASS: actual Three.js enemy director queues assault/ranged/heavy/warden attacks with ordered cooldowns and unchanged telegraphs');
