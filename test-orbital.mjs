import assert from 'node:assert/strict';
import {createPlayerMotion} from './player-motion.js';
import {ORBITAL_STAGES,ORBITAL_ENTRIES,ORBITAL_SUPPLIES,ORBITAL_STAR,ORBITAL_STAR_PLATFORMS,ORBITAL_BOUNDS,orbitalObstacles,orbitalGravity} from './orbital-data.js';
import {createTether,TETHER_STABILIZERS} from './tether-rules.js';
globalThis.location={search:'?map=orbital'};
const {createMission,chooseEncounterSpawns,STAGES,SUPPLIES}=await import('./mission.js');const {createOrbitalNavigation}=await import('./orbital-navigation.js');const {STAGE_ENTRIES,SAVE_KEY,validCheckpoint}=await import('./campaign.js');
assert.equal(STAGES,ORBITAL_STAGES);assert.equal(SUPPLIES,ORBITAL_SUPPLIES);assert.equal(STAGE_ENTRIES,ORBITAL_ENTRIES);assert.equal(SAVE_KEY,'neon-eclipse.orbital.v1');
assert.equal(ORBITAL_STAGES.length,5);assert.equal(ORBITAL_STAGES.filter(s=>s.defenseDuration).length,1);assert.equal(ORBITAL_STAGES[3].boss,true);assert.equal(ORBITAL_STAGES.at(-1).id,'extract');
const terminals=ORBITAL_STAGES.filter(s=>!s.boss&&s.id!=='extract').map(s=>({x:s.x,z:s.z,w:1.8,d:1,bottom:s.feetY,top:s.feetY+1.4,h:s.feetY+1.4}));
const obs=orbitalObstacles().concat(terminals,ORBITAL_STAR_PLATFORMS.map(o=>({...o})));
const motion=()=>createPlayerMotion(obs,[],ORBITAL_BOUNDS,{gravityAt:orbitalGravity});
// Entries, supplies, stabilizers and every spawn (including layered {x,z,feetY} entries) are standable.
for(const [i,e] of ORBITAL_ENTRIES.entries()){assert(motion().canOccupy(e.x,e.z,e.feetY),'entry '+i);const spots=chooseEncounterSpawns(ORBITAL_STAGES[i],{...e,y:e.feetY+1.7,feetY:e.feetY},obs);assert.equal(spots.length,ORBITAL_STAGES[i].count,'spawn count '+i);for(const p of spots)assert(motion().canOccupy(p.x,p.z,p.y),'spawn '+i+' '+JSON.stringify(p));}
for(const s of ORBITAL_SUPPLIES)assert(motion().canOccupy(s.x,s.z,s.feetY),'supply '+s.id);
for(const s of TETHER_STABILIZERS)assert(!obs.some(o=>Math.abs(s.x-o.x)<o.w/2+.9&&Math.abs(s.z-o.z)<o.d/2+.9&&s.feetY<o.top-1e-5&&s.feetY+2>o.bottom+1e-5),'stabilizer clear '+JSON.stringify(s));
const anchor=ORBITAL_STAGES[2];for(const sp of [...anchor.defenseSpawns,...anchor.defenseWaves.flatMap(w=>w.spawns)]){const p=Array.isArray(sp)?{x:sp[0],z:sp[1],feetY:0}:sp;assert(motion().canOccupy(p.x,p.z,p.feetY),'defense spawn '+JSON.stringify(sp));}
// Layered spawns are honoured: ring spawns land on 4 m, floor spawns on 0 m.
const gate=chooseEncounterSpawns(ORBITAL_STAGES[0],{x:0,z:32,y:1.7,feetY:0},obs);assert(gate.some(p=>p.y===4)&&gate.some(p=>p.y===0));
// Jump height per band: 1 g ~1.4 m, 0.65 g ~2.2 m, 0.4 g ~3.6 m.
function peak(y0,x,z){const m=motion(),p={x,z,y:y0+1.7};m.reset(p,y0);let best=0;for(let i=0;i<300;i++){m.step(.01,p,0,0,i===0);best=Math.max(best,m.state.y-y0);}return best;}
const j=[peak(0,-30,20),peak(4,-9,-5),peak(9,-9,-5)];assert(j[0]>1.3&&j[0]<1.6,'1g '+j[0]);assert(j[1]>2&&j[1]<2.4,'.65g '+j[1]);assert(j[2]>3.3&&j[2]<3.8,'.4g '+j[2]);
// Player route: flight 01 (west) to 4 m, along ring I south to flight 02 (east), up to 9 m, to the anchor terminal, then the star hop.
const m=motion(),p={x:-24,z:0,y:1.7};m.reset(p,0);
const walk=(tx,tz,max=5000)=>{for(let i=0;i<max;i++){const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz);if(d<.05)return;m.step(.01,p,dx/d*Math.min(.05,d),dz/d*Math.min(.05,d));}assert.fail('blocked '+JSON.stringify([p.x,p.z,m.state.y])+' -> '+tx+','+tz);};
walk(-11.5,0);assert.equal(m.state.y,4,'flight 01');walk(-9,6);walk(-9,11.5);walk(16.2,11.5);walk(16.2,9);assert.equal(m.state.y,4);walk(3.5,9);assert.equal(m.state.y,9,'flight 02');walk(-9,5);assert.equal(m.state.y,9);
walk(0,-9);walk(0,-12.5);assert.equal(m.state.y,9);
const hop=(tx,tz)=>{for(let t=0;t<220;t++){const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz);m.step(.01,p,d>.01?dx/d*Math.min(.05,d):0,d>.01?dz/d*Math.min(.05,d):0,t===0);}};
hop(0,-19);assert(Math.abs(m.state.y-10.2)<.001,'star platform A '+m.state.y);hop(0,-24);assert(Math.abs(m.state.y-11.4)<.001,'star platform B '+m.state.y);
assert(Math.abs(p.x-ORBITAL_STAR.x)<.3&&Math.abs(p.z-ORBITAL_STAR.z)<.3);
{const one=createPlayerMotion(obs,[],ORBITAL_BOUNDS),q={x:0,z:-12.5,y:10.7};one.reset(q,9);for(let t=0;t<220;t++){const dz=-19-q.z,d=Math.abs(dz);one.step(.01,q,0,d>.01?dz/d*Math.min(.05,d):0,t===0);}assert(one.state.y<10,'the star gap needs the 0.4 g band');}
// Falling off the star platform lands on the floor and the player can walk back to flight 01.
walk(-4,-27);for(let i=0;i<300;i++)m.step(.01,p,0,0);assert.equal(m.state.y,0,'floor after star drop');walk(-14,-27);walk(-26,-16);assert.equal(m.state.y,0);walk(-26,0);walk(-11.5,0);assert.equal(m.state.y,4,'return route');
// Enemy navigation: three radii climb to 9 m, descend to the floor, and reach ring I.
for(const r of [.5,.65,.85]){const nav=createOrbitalNavigation(obs),e={x:-14,y:0,z:-24};const go=(target,n)=>{for(let i=0;i<n;i++){const d=nav.route(e,target);const len=Math.hypot(d.x,d.z);if(len>.01)nav.move(e,d.x/len*.04,d.z/len*.04,r);}};
 go({x:-9,y:10.7,z:3},12000);assert(e.y===9&&Math.hypot(e.x+9,e.z-3)<3,'climb r='+r+' '+JSON.stringify(e));
 go({x:0,y:1.7,z:22},12000);assert(e.y===0&&Math.hypot(e.x,e.z-22)<3,'descend r='+r+' '+JSON.stringify(e));
 e.x=14;e.z=24;go({x:-9,y:5.7,z:-3},12000);assert(e.y===4&&Math.hypot(e.x+9,e.z+3)<3,'ring I r='+r+' '+JSON.stringify(e));}
// Mission chain: gate -> ring -> anchor (defense 18 s with a wave at 9 s) -> boss -> extract.
const mission=createMission();
const at=s=>({x:s.x,z:s.z,y:s.feetY+1.7,feetY:s.feetY});
assert.equal(mission.tick(2.1,{player:at(ORBITAL_STAGES[0]),held:true,clear:true}).type,'advance');
assert.equal(mission.tick(2.6,{player:at(ORBITAL_STAGES[1]),held:true,clear:true}).type,'advance');
assert.equal(mission.tick(1.9,{player:at(ORBITAL_STAGES[1]),held:true,clear:true}),null,'wrong level does not progress');
assert.equal(mission.tick(2.1,{player:at(ORBITAL_STAGES[2]),held:true,clear:true}).type,'defense');
assert.equal(mission.tick(8,{player:at(ORBITAL_STAGES[2]),held:false,clear:false}),null);
assert.equal(mission.tick(1.1,{player:at(ORBITAL_STAGES[2]),held:false,clear:false}).type,'reinforcement');
assert.equal(mission.tick(4,{player:{...at(ORBITAL_STAGES[2]),y:1.7,feetY:0},held:false,clear:true}),null,'jumping off the ring pauses the timer');
assert.equal(mission.state.progress.toFixed(2),'9.10');
assert.equal(mission.tick(9,{player:at(ORBITAL_STAGES[2]),held:false,clear:true}).type,'advance');
assert.equal(mission.tick(1,{player:at(ORBITAL_STAGES[3]),held:false,clear:false}),null);
const tether=createTether();tether.reset(true);assert.equal(mission.tick(1,{player:at(ORBITAL_STAGES[3]),held:false,clear:!tether.blocking}),null);
[0,1,2].forEach(i=>tether.damage(i,90));tether.damage('core',1600);assert.equal(mission.tick(1,{player:at(ORBITAL_STAGES[3]),held:false,clear:!tether.blocking}).type,'advance');
const done=mission.tick(3.1,{player:at(ORBITAL_STAGES[4]),held:true,clear:true});assert.equal(done.complete,true);
// Checkpoints on every layer validate (feetY up to the star platform height).
const cp={stageIndex:2,health:80,rounds:[20,4,10],reserves:[60,16,30],selected:0,x:-9,z:3,yaw:0,pitch:0,time:100,kills:10,collected:[],feetY:9};
assert(validCheckpoint(cp));assert(validCheckpoint({...cp,feetY:11.4}));assert(!validCheckpoint({...cp,feetY:13}));assert(!validCheckpoint({...cp,x:40}));
console.log('PASS: orbital data wiring, layered spawns, entries/supplies/stabilizers standable, per-band jump heights, stair routes, star hop needs 0.4 g, return route, 3-layer enemy navigation, mission chain with layered defense pause and boss gating, checkpoint bounds');
