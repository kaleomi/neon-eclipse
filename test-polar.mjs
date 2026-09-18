// Chapter 09 rules: data wiring, geometry (tower steps / hut openings / star hops), blizzard clock, warmth, thin ice, enemy navigation.
import assert from 'node:assert/strict';
import {createPlayerMotion} from './player-motion.js';
import {POLAR_STAGES,POLAR_ENTRIES,POLAR_SUPPLIES,POLAR_STAR,POLAR_BOUNDS,polarObstacles,stormPhase,stormIntensity,stormVisibility,thermalActive,secondsToWhiteout,warmthRate,stepWarmth,insideHut,onTowerDeck,onThinIce,STORM_PERIOD,STORM_CLEAR,STORM_CLOSE,STORM_WHITEOUT,TOWERS,WARM_HUTS,HOUND_DENS,WARMTH_MAX,WARMTH_HUT,WARMTH_DECK,WARMTH_DRAIN_CLEAR,WARMTH_DRAIN_STORM,TOWER_DECK,THIN_ICE} from './polar-data.js';
globalThis.location={search:'?map=polar'};
const {chooseEncounterSpawns,STAGES,SUPPLIES}=await import('./mission.js');const {createPolarNavigation}=await import('./polar-navigation.js');const {STAGE_ENTRIES,SAVE_KEY,validCheckpoint}=await import('./campaign.js');
assert.equal(STAGES,POLAR_STAGES);assert.equal(SUPPLIES,POLAR_SUPPLIES);assert.equal(STAGE_ENTRIES,POLAR_ENTRIES);assert.equal(SAVE_KEY,'neon-eclipse.polar.v1');
assert.equal(POLAR_STAGES.length,5);assert.equal(POLAR_STAGES.filter(s=>s.defenseDuration).length,1);assert.equal(POLAR_STAGES[3].boss,true);assert.equal(POLAR_STAGES.at(-1).id,'extract');
assert(POLAR_STAGES.every(s=>s.roles.includes('hound')),'every stage fields the new enemy');
const terminals=POLAR_STAGES.filter(s=>!s.boss&&s.id!=='extract').map(s=>({x:s.x,z:s.z,w:1.8,d:1,bottom:s.feetY,top:s.feetY+1.4,h:s.feetY+1.4}));
const obs=polarObstacles().concat(terminals);
const motion=()=>createPlayerMotion(obs,[],POLAR_BOUNDS);
// Entries, supplies, dens and every spawn (including deck {x,z,feetY}) are standable and match encounter counts.
for(const [i,e] of POLAR_ENTRIES.entries()){assert(motion().canOccupy(e.x,e.z,e.feetY),'entry '+i);const spots=chooseEncounterSpawns(POLAR_STAGES[i],{...e,y:e.feetY+1.7,feetY:e.feetY},obs);assert.equal(spots.length,POLAR_STAGES[i].count,'spawn count '+i);for(const p of spots)assert(motion().canOccupy(p.x,p.z,p.y??0),'spawn '+i+' '+JSON.stringify(p));}
for(const s of POLAR_SUPPLIES)assert(motion().canOccupy(s.x,s.z,s.feetY),'supply '+s.id);
for(const p of HOUND_DENS)assert(motion().canOccupy(p.x,p.z,0),'den '+JSON.stringify(p));
const north=POLAR_STAGES[2];for(const sp of [...north.defenseSpawns,...north.defenseWaves.flatMap(w=>w.spawns)]){const p=Array.isArray(sp)?{x:sp[0],z:sp[1],feetY:0}:sp;assert(motion().canOccupy(p.x,p.z,p.feetY??0),'defense spawn '+JSON.stringify(sp));}
// Tower terminals sit on the heated deck; the extraction terminal sits inside the west hut.
for(const i of [0,1,2])assert(onTowerDeck(POLAR_STAGES[i].x,POLAR_STAGES[i].z,POLAR_STAGES[i].feetY),'stage '+i+' on deck');
assert(insideHut(POLAR_STAGES[4].x,POLAR_STAGES[4].z),'extract inside hut');assert(insideHut(POLAR_ENTRIES[0].x,POLAR_ENTRIES[0].z),'start inside hut');
// Tower steps are walkable from every side without jumping; the hut is enterable through the south opening only.
const m=motion(),p={x:-24,z:-30,y:1.7};m.reset(p,0);
const walk=(tx,tz,max=6000)=>{for(let i=0;i<max;i++){const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz);if(d<.05)return true;const before=[p.x,p.z];m.step(.01,p,dx/d*Math.min(.05,d),dz/d*Math.min(.05,d));if(Math.abs(before[0]-p.x)<1e-9&&Math.abs(before[1]-p.z)<1e-9&&i>50)return false;}return false;};
assert(walk(-24,-21.5));assert.equal(m.state.y,TOWER_DECK,'south side '+m.state.y);assert(walk(-14,-18));assert.equal(m.state.y,0);assert(walk(-24,-14.5));assert.equal(m.state.y,TOWER_DECK,'north side');
m.reset(Object.assign(p,{x:-28,z:28,y:1.7}),0);assert(walk(-28,22),'enter hut from the south');assert(insideHut(p.x,p.z));
m.reset(Object.assign(p,{x:-28,z:16,y:1.7}),0);assert(!walk(-28,22,400),'north wall blocks');
// Hidden star: bank A (1.2) -> bank B (2.4) -> ledge -> star. Ground jump cannot reach the 2.4 m bank directly.
m.reset(Object.assign(p,{x:24,z:-36,y:1.7}),0);const hop=(tx,tz,n=160)=>{for(let t=0;t<n;t++){const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz);m.step(.01,p,d>.01?dx/d*Math.min(.05,d):0,d>.01?dz/d*Math.min(.05,d):0,t===0);}};
hop(24,-32);assert.equal(m.state.y,1.2,'bank A '+m.state.y);hop(28,-32);assert.equal(m.state.y,2.4,'bank B '+m.state.y);hop(31,-30.5);assert.equal(m.state.y,2.4,'ledge '+m.state.y);assert(walk(POLAR_STAR.x,POLAR_STAR.z));
assert(Math.abs(p.x-POLAR_STAR.x)<.3&&Math.abs(p.z-POLAR_STAR.z)<.3&&m.state.y===POLAR_STAR.feetY);
{const one=motion(),q={x:28,z:-36,y:1.7};one.reset(q,0);for(let t=0;t<160;t++){const dz=-32-q.z,d=Math.abs(dz);one.step(.01,q,0,d>.01?dz/d*Math.min(.05,d):0,t===0);}assert(one.state.y<2.4,'2.4 m bank is out of reach from the ground');}
// Enemy navigation reaches every tower deck and the ice centre from the west hut, for all radii.
for(const r of [.5,.65,.85])for(const c of [...TOWERS,{x:0,z:0}]){const nav=createPolarNavigation(obs),e={x:-28,y:0,z:28};let ok=false;for(let i=0;i<12000;i++){const d=nav.route(e,{x:c.x,y:c.z===0?1.7:4,z:c.z});const len=Math.hypot(d.x,d.z);if(len>.01)nav.move(e,d.x/len*.04,d.z/len*.04,r);if(Math.hypot(e.x-c.x,e.z-c.z)<(c.z===0?1.6:3.5)){ok=true;break;}}assert(ok,'nav r='+r+' to '+JSON.stringify(c)+' stuck at '+JSON.stringify(e));if(c.z!==0)assert(Math.abs(e.y-TOWER_DECK)<.01,'nav climbs the deck '+e.y);}
// Blizzard clock: clear 18 s, closing 5 s, whiteout 12 s, clearing 5 s; intensity clamps to [0,1]; thermal at >= .6.
assert.equal(STORM_PERIOD,40);assert.deepEqual([0,17.9,20.5,23,34.9,37.5,40].map(t=>+stormIntensity(t).toFixed(2)),[0,0,.5,1,1,.5,0]);
assert.deepEqual([5,20,30,37].map(stormPhase),['clear','closing','whiteout','clearing']);assert.equal(stormPhase(40.5),'clear','periodic');
assert(!thermalActive(19));assert(thermalActive(STORM_CLEAR+STORM_CLOSE*.6+1e-6));assert(thermalActive(30));assert(!thermalActive(39));
assert.equal(Math.round(stormVisibility(0)),60);assert.equal(Math.round(stormVisibility(30)),10);
assert.equal(secondsToWhiteout(0),STORM_CLEAR+STORM_CLOSE);assert.equal(secondsToWhiteout(30),0);assert.equal(secondsToWhiteout(STORM_CLEAR+STORM_CLOSE+STORM_WHITEOUT),STORM_PERIOD-STORM_WHITEOUT);
for(let t=0;t<200;t+=.37){const i=stormIntensity(t);assert(i>=0&&i<=1);}
// Warmth: hut > deck > outdoors; outdoors drains harder in the storm; clamps 0..100.
assert.equal(warmthRate(WARM_HUTS[0].x,WARM_HUTS[0].z,0,1),WARMTH_HUT);assert.equal(warmthRate(TOWERS[0].x,TOWERS[0].z,TOWER_DECK,1),WARMTH_DECK);
assert.equal(warmthRate(0,0,0,0),-WARMTH_DRAIN_CLEAR);assert.equal(warmthRate(0,0,0,1),-WARMTH_DRAIN_STORM);assert(warmthRate(0,0,0,.5)<-WARMTH_DRAIN_CLEAR&&warmthRate(0,0,0,.5)>-WARMTH_DRAIN_STORM);
assert.equal(warmthRate(TOWERS[0].x,TOWERS[0].z,0,0),-WARMTH_DRAIN_CLEAR,'standing beside the base is not heated');
assert.equal(stepWarmth(100,WARMTH_HUT,5),WARMTH_MAX);assert.equal(stepWarmth(3,-WARMTH_DRAIN_STORM,5),0);assert.equal(stepWarmth(50,-2,5),40);
{let w=WARMTH_MAX,frost=0;for(let t=0;t<STORM_PERIOD*2;t+=.1){w=stepWarmth(w,warmthRate(10,10,0,stormIntensity(t)),.1);if(w<=0)frost+=.1;}assert(w===0&&frost>0,'staying outdoors for two cycles freezes');}
{let w=WARMTH_MAX;for(let t=0;t<STORM_PERIOD;t+=.1)w=stepWarmth(w,warmthRate(10,10,0,stormIntensity(t)),.1);assert(w>0,'one full cycle outdoors does not freeze: '+w.toFixed(1));}
// Thin ice: circle at the centre; huts and towers stay off it.
assert(onThinIce(0,0));assert(onThinIce(THIN_ICE.radius-.1,0));assert(!onThinIce(THIN_ICE.radius+.1,0));for(const t of [...TOWERS,...WARM_HUTS])assert(!onThinIce(t.x,t.z));
// Checkpoints carry the storm clock and warmth plus deck feetY; garbage values are rejected.
const cp={stageIndex:1,health:85,rounds:[20,4,10],reserves:[60,16,30],selected:0,x:-24,z:-16,yaw:0,pitch:0,time:20,kills:4,collected:[],feetY:2.4};
assert(validCheckpoint(cp));assert(validCheckpoint({...cp,stormTime:37.5,warmth:42}));assert(!validCheckpoint({...cp,stormTime:-1}));assert(!validCheckpoint({...cp,warmth:101}));assert(!validCheckpoint({...cp,warmth:'x'}));
console.log('PASS: polar data wiring, standable entries/supplies/spawns/dens, tower steps, hut opening, bank/ledge star hops, enemy nav to decks and ice, blizzard clock/phases/thermal, warmth rates + freeze timing, thin ice, checkpoint stormTime/warmth');
