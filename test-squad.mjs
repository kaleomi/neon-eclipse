import assert from 'node:assert/strict';
import {SUCCESS,FAILURE,RUNNING,condition,action,selector,sequence,inverter,assignSquadRoles,createSquadCoordinator,SQUAD_RULES,rusherIntent,rusherBlastDamage,RUSHER,artilleryDamage,stepArtillery,mortarStrike,ARTILLERY} from './squad.js';
import {ENEMY_TYPES,resolveEnemyDamage,movementIntent,roleForStage} from './enemy-rules.js';
import {EMP_TYPES} from './emp-rules.js';
import {TOWER_STAGES} from './tower-data.js';
import {HARBOR_STAGES} from './harbor-data.js';
import {DATACENTER_STAGES} from './datacenter-data.js';
// Behavior tree primitives.
const log=[];const t=selector(sequence(condition(c=>c.near),action(()=>{log.push('melee');})),sequence(condition(c=>c.sees),action(()=>{log.push('shoot');return RUNNING;})),action(()=>{log.push('search');}));
assert.equal(t({near:true,sees:true}),SUCCESS);assert.equal(t({near:false,sees:true}),RUNNING);assert.equal(t({near:false,sees:false}),SUCCESS);assert.deepEqual(log,['melee','shoot','search']);assert.equal(inverter(condition(()=>true))({}),FAILURE);assert.equal(inverter(action(()=>RUNNING))({}),RUNNING);
// Squad assignment: bounded press/flank, ranged cover, bosses/sentries/rushers excluded, deterministic by distance.
const mk=(type,x,z,seed=0)=>({type,group:{position:{x,z}},hp:100,seed,boss:type==='warden'});
const squad=[mk('assault',0,4),mk('assault',0,6),mk('assault',0,8),mk('assault',0,10),mk('assault',0,12),mk('ranged',0,14),mk('sniper',0,16),mk('warden',0,2),mk('sentry',0,3),mk('rusher',0,3.5),mk('swarmDrone',0,3.7)];
const roles=assignSquadRoles(squad,ENEMY_TYPES,{x:0,z:0});
assert.equal([...roles.values()].filter(r=>r==='press').length,SQUAD_RULES.maxPress+1,'two pressers plus overflow');assert.equal([...roles.values()].filter(r=>r==='flank').length,SQUAD_RULES.maxFlank);assert.equal(roles.get(squad[5]),'cover');assert.equal(roles.get(squad[6]),'cover');
for(const excluded of [squad[7],squad[8],squad[9],squad[10]])assert(!roles.has(excluded),excluded.type+' never joins a squad');
assert.equal(roles.get(squad[0]),'press');assert.equal(roles.get(squad[2]),'flank');
// Coordinator: memory and flank offset perpendicular to the approach line; forgetting after memorySeconds.
const c=createSquadCoordinator({types:ENEMY_TYPES});const members=[mk('assault',0,10,0),mk('assault',0,12,1),mk('assault',0,14,0),mk('ranged',0,20,0)];const player={x:0,z:0};
c.update(0,members,player,true);const flanker=members.find(e=>c.role(e)==='flank');assert(flanker);const tgt=c.target(flanker,player);assert.equal(tgt.role,'flank');assert(Math.abs(Math.abs(tgt.x)-SQUAD_RULES.flankOffset)<1e-9&&Math.abs(tgt.z)<1e-9,'flank point is offset sideways from the player: '+JSON.stringify(tgt));assert(!tgt.search);
c.update(SQUAD_RULES.memorySeconds+.1,members,{x:50,z:50},false);const lost=c.target(flanker,{x:50,z:50});assert(lost.search);assert.equal(lost.x,0);assert.equal(lost.z,0,'searches last known point, not the live player');
c.clear();assert.equal(c.role(flanker),null);
// Rusher: stalk -> arm inside 2.2 m -> detonate after 1 s; blink rises with proximity; blast falloff.
const r={hp:44};let s=rusherIntent(r,10,.1);assert.equal(s.state,'stalk');assert(s.blink>0&&s.blink<1);s=rusherIntent(r,2,.1);assert.equal(s.state,'armed');assert(r.rusherArmed);s=rusherIntent(r,12,.5);assert.equal(s.state,'armed','armed rusher stays armed even if the player runs');s=rusherIntent(r,12,.6);assert.equal(s.state,'detonate');
assert.equal(rusherBlastDamage(0),RUSHER.damage);assert.equal(rusherBlastDamage(RUSHER.radius),0);assert(rusherBlastDamage(1.75)>0&&rusherBlastDamage(1.75)<RUSHER.damage);assert.equal(rusherBlastDamage(NaN),0);
assert.equal(movementIntent('rusher',30,false),'approach');assert.equal(movementIntent('rusher',1,true),'approach');assert.equal(ENEMY_TYPES.rusher.attack.bursts,0,'rusher never queues bolts');assert(ENEMY_TYPES.rusher.noSquad);
// Artillery: armor 0.2 until two knee hits, then core x2.5 for 5 s; hatch closes again; mortar telegraph/landing math.
const m={type:'artilleryMech',hp:320,maxHp:320,group:{position:{x:0,z:0},rotation:{y:0}}};
let d=resolveEnemyDamage(m,100,'body',{x:0,z:5});assert.equal(d.damage,20);assert(d.armored);d=resolveEnemyDamage(m,100,'core',{x:0,z:5});assert.equal(d.damage,20,'core is behind the hatch until exposed');
d=resolveEnemyDamage(m,100,'leg',{x:0,z:5});assert.equal(d.damage,160);assert(d.weak);assert.equal(m.artillery.exposed,0);d=resolveEnemyDamage(m,100,'leg',{x:0,z:5});assert.equal(m.artillery.exposed,ARTILLERY.exposeSeconds);
d=resolveEnemyDamage(m,100,'core',{x:0,z:5});assert.equal(d.damage,250);assert(d.weak);d=resolveEnemyDamage(m,100,'body',{x:0,z:5});assert.equal(d.damage,100,'exposed body takes full, not armored');
assert.equal(stepArtillery(m,4.9),false);assert.equal(stepArtillery(m,.2),true,'closing edge reported once');assert.equal(stepArtillery(m,1),false);d=resolveEnemyDamage(m,100,'core',{x:0,z:5});assert.equal(d.damage,20);
assert.equal(mortarStrike({x:0,z:0},{x:0,z:0}),ARTILLERY.damage);assert.equal(mortarStrike({x:0,z:0},{x:3,z:0}),0);assert(mortarStrike({x:0,z:0},{x:1.5,z:0})>ARTILLERY.damage*.7);
assert(ARTILLERY.telegraph>=2,'mortar telegraph readable');assert(ENEMY_TYPES.artilleryMech.mortar);
// Chapter wiring and EMP allowlist.
assert(TOWER_STAGES.some(s=>s.roles?.includes('rusher')));assert(HARBOR_STAGES.some(s=>s.roles?.includes('rusher')));assert(DATACENTER_STAGES.some(s=>s.defenseRoles?.includes('artilleryMech')));
for(const type of ['rusher','artilleryMech']){assert(EMP_TYPES.includes(type));assert(ENEMY_TYPES[type].mechanical);assert(ENEMY_TYPES[type].hint.length>8);}
for(const stage of [...TOWER_STAGES,...HARBOR_STAGES,...DATACENTER_STAGES])for(let i=0;i<(stage.count||0);i++)assert(ENEMY_TYPES[roleForStage(stage,i)]);
console.log('PASS behavior tree primitives, bounded squad roles with memory/flank offset, rusher arm/fuse/blast, artillery armor/knee/core window and mortar math, chapter wiring and EMP allowlist');
