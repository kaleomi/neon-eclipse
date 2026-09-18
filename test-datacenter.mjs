// Chapter 08 rules: data wiring, geometry (plinths / racks / star hops), tide clock, water rules, enemy navigation.
import assert from 'node:assert/strict';
import {createPlayerMotion} from './player-motion.js';
import {DATACENTER_STAGES,DATACENTER_ENTRIES,DATACENTER_SUPPLIES,DATACENTER_STAR,DATACENTER_BOUNDS,datacenterObstacles,waterLevel,waterPhase,waterPeriod,submerged,waterMoveScale,weaponShorted,STALKER_POOLS,PLINTH_CENTERS,WATER_HIGH,WATER_HIGH_PHASE,ENERGY_WEAPONS} from './datacenter-data.js';
globalThis.location={search:'?map=datacenter'};
const {chooseEncounterSpawns,STAGES,SUPPLIES}=await import('./mission.js');const {createDatacenterNavigation}=await import('./datacenter-navigation.js');const {STAGE_ENTRIES,SAVE_KEY,validCheckpoint}=await import('./campaign.js');
assert.equal(STAGES,DATACENTER_STAGES);assert.equal(SUPPLIES,DATACENTER_SUPPLIES);assert.equal(STAGE_ENTRIES,DATACENTER_ENTRIES);assert.equal(SAVE_KEY,'neon-eclipse.datacenter.v1');
assert.equal(DATACENTER_STAGES.length,5);assert.equal(DATACENTER_STAGES.filter(s=>s.defenseDuration).length,1);assert.equal(DATACENTER_STAGES[3].boss,true);assert.equal(DATACENTER_STAGES.at(-1).id,'extract');
assert(DATACENTER_STAGES.every(s=>s.roles.includes('stalker')||s.roles.includes('shield')),'every stage fields a new enemy');
const terminals=DATACENTER_STAGES.filter(s=>!s.boss&&s.id!=='extract').map(s=>({x:s.x,z:s.z,w:1.8,d:1,bottom:s.feetY,top:s.feetY+1.4,h:s.feetY+1.4}));
const obs=datacenterObstacles().concat(terminals);
const motion=()=>createPlayerMotion(obs,[],DATACENTER_BOUNDS);
// Entries, supplies, pools and every spawn (including plinth-top {x,z,feetY}) are standable and match encounter counts.
for(const [i,e] of DATACENTER_ENTRIES.entries()){assert(motion().canOccupy(e.x,e.z,e.feetY),'entry '+i);const spots=chooseEncounterSpawns(DATACENTER_STAGES[i],{...e,y:e.feetY+1.7,feetY:e.feetY},obs);assert.equal(spots.length,DATACENTER_STAGES[i].count,'spawn count '+i);for(const p of spots)assert(motion().canOccupy(p.x,p.z,p.y??0),'spawn '+i+' '+JSON.stringify(p));}
for(const s of DATACENTER_SUPPLIES)assert(motion().canOccupy(s.x,s.z,s.feetY),'supply '+s.id);
for(const p of STALKER_POOLS)assert(motion().canOccupy(p.x,p.z,0),'pool '+JSON.stringify(p));
const pump2=DATACENTER_STAGES[2];for(const sp of [...pump2.defenseSpawns,...pump2.defenseWaves.flatMap(w=>w.spawns)]){const p=Array.isArray(sp)?{x:sp[0],z:sp[1],feetY:0}:sp;assert(motion().canOccupy(p.x,p.z,p.feetY??0),'defense spawn '+JSON.stringify(sp));}
// Pump terminals and both plinth supplies sit above HIGH water: the plinth tops are the dry islands.
assert(DATACENTER_STAGES[1].feetY>WATER_HIGH&&DATACENTER_STAGES[2].feetY>WATER_HIGH);assert(DATACENTER_SUPPLIES.some(s=>s.feetY>WATER_HIGH));
// Plinth steps are walkable from every side without jumping.
const m=motion(),p={x:-20,z:-30,y:1.7};m.reset(p,0);
const walk=(tx,tz,max=5000)=>{for(let i=0;i<max;i++){const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz);if(d<.05)return;m.step(.01,p,dx/d*Math.min(.05,d),dz/d*Math.min(.05,d));}assert.fail('blocked '+JSON.stringify([p.x,p.z,m.state.y])+' -> '+tx+','+tz);};
walk(-20,-21.2);assert.equal(m.state.y,1.5,'south side');walk(-12,-20);assert.equal(m.state.y,0);walk(-20,-18.8);assert.equal(m.state.y,1.5,'north side');
// Hidden star: plinth top -> rack A (2.4 m) -> rack B -> star. Needs two jumps, no jump reaches a rack from the floor.
walk(-21.5,-20);const hop=(tx,tz,n=160)=>{for(let t=0;t<n;t++){const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz);m.step(.01,p,d>.01?dx/d*Math.min(.05,d):0,d>.01?dz/d*Math.min(.05,d):0,t===0);}};
hop(-24.6,-20);assert.equal(m.state.y,2.4,'rack A '+m.state.y);walk(-24.6,-17.5);hop(-29,-15.5);assert.equal(m.state.y,2.4,'rack B '+m.state.y);walk(DATACENTER_STAR.x,DATACENTER_STAR.z);
assert(Math.abs(p.x-DATACENTER_STAR.x)<.3&&Math.abs(p.z-DATACENTER_STAR.z)<.3&&m.state.y===DATACENTER_STAR.feetY);
{const one=motion(),q={x:-26.5,z:-20,y:1.7};one.reset(q,0);for(let t=0;t<160;t++){const dx=-24.6-q.x,d=Math.abs(dx);one.step(.01,q,d>.01?dx/d*Math.min(.05,d):0,0,t===0);}assert(one.state.y<2.4,'rack tops are out of reach from the floor');}
// Enemy navigation reaches every plinth top and the mainframe front from the intake side, for all radii.
for(const r of [.5,.65,.85])for(const c of [...PLINTH_CENTERS,{x:0,z:-7}]){const nav=createDatacenterNavigation(obs),e={x:0,y:0,z:30};let ok=false;for(let i=0;i<9000;i++){const d=nav.route(e,{x:c.x,y:c.z===-7?1.7:3.2,z:c.z});const len=Math.hypot(d.x,d.z);if(len>.01)nav.move(e,d.x/len*.04,d.z/len*.04,r);if(Math.hypot(e.x-c.x,e.z-c.z)<1.6){ok=true;break;}}assert(ok,'nav r='+r+' to '+JSON.stringify(c)+' stuck at '+JSON.stringify(e));if(c.z!==-7)assert(Math.abs(e.y-1.5)<.01,'nav climbs the plinth '+e.y);}
// Tide clock: low 14 s, rise 6 s, high 14/10/7 s by pumps, drain 6 s; level clamps to [0, HIGH].
assert.deepEqual(WATER_HIGH_PHASE,[14,10,7]);assert.deepEqual([0,13.9,17,20,33.9,37,40].map(t=>waterLevel(t)),[0,0,.6,1.2,1.2,.6,0]);
assert.equal(waterPeriod(0),40);assert.equal(waterPeriod(1),36);assert.equal(waterPeriod(2),33);
assert.deepEqual([5,15,25,36].map(t=>waterPhase(t,0)),['low','rising','high','draining']);assert.equal(waterPhase(26,2),'high');assert.equal(waterPhase(28,2),'draining');assert.equal(waterPhase(40.5,0),'low','periodic');
for(let t=0;t<200;t+=.37)for(const pumps of [0,1,2]){const l=waterLevel(t,pumps);assert(l>=0&&l<=WATER_HIGH+1e-9);}
// Water rules: slow only when submerged, energy weapons short only when the muzzle (feet + 1.1) is under water, plinth tops are never wet.
assert.equal(waterMoveScale(0,1.2),.55);assert.equal(waterMoveScale(1.5,1.2),1);assert.equal(waterMoveScale(0,0),1);assert(!submerged(0,.04));
assert.deepEqual(ENERGY_WEAPONS,[5,6,7]);assert(weaponShorted(5,0,1.2));assert(!weaponShorted(5,0,1));assert(!weaponShorted(0,0,1.2));assert(!weaponShorted(6,1.5,1.2));assert(!weaponShorted(7,0,0));
// Checkpoints carry the tide clock (waterTime) and plinth-top feetY; garbage clocks are rejected.
const cp={stageIndex:1,health:85,rounds:[20,4,10],reserves:[60,16,30],selected:0,x:-20,z:-20,yaw:0,pitch:0,time:20,kills:4,collected:[],feetY:1.5};
assert(validCheckpoint(cp));assert(validCheckpoint({...cp,waterTime:37.5}));assert(!validCheckpoint({...cp,waterTime:-1}));assert(!validCheckpoint({...cp,waterTime:'x'}));
console.log('PASS: datacenter data wiring, standable entries/supplies/spawns/pools, plinth steps, rack star hops, enemy nav to plinth tops, tide clock/period/phases, water slow + weapon short rules, checkpoint waterTime');
