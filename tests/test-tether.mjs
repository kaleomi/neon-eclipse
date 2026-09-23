import assert from 'node:assert/strict';
import {createTether,TETHER_MAX_HP,TETHER_STABILIZER_HP,TETHER_STABILIZERS,TETHER_EXPOSURE,tetherHint} from '../src/tether-rules.js';
import {gravityBand,orbitalGravity,orbitalRecoilScale,GRAVITY_BANDS,padPhase,padHit,ORBITAL_PADS,PAD_WARNING,PAD_LIVE,PAD_PERIOD} from '../src/orbital-data.js';
// Gravity bands: exact thresholds, monotone, recoil grows with height.
assert.deepEqual([0,3.49,3.5,7.49,7.5,11.4].map(gravityBand),[0,0,1,1,2,2]);
assert.deepEqual([0,4,9].map(orbitalGravity),[20,13,8]);assert.deepEqual([0,4,9].map(orbitalRecoilScale),[1,1.25,1.5]);
assert.equal(gravityBand(NaN),0);assert.equal(gravityBand(-2),0);assert.equal(GRAVITY_BANDS.length,3);
// Stabilizers sit one per band so each must be reached on its own layer.
assert.deepEqual(TETHER_STABILIZERS.map(s=>gravityBand(s.feetY)),[0,1,2]);
const ground={feetY:0,grounded:true};
const t=createTether();assert.equal(t.blocking,false);assert.equal(t.tick(5,ground),0);assert.equal(t.damage(0,50),0);
t.reset(true);assert.equal(t.blocking,true);assert.equal(t.state.hp,TETHER_MAX_HP);assert.deepEqual(t.state.stabilizers,[90,90,90]);
// Core is shielded until all three stabilizers fall; overkill clamps; a dead stabilizer takes no more damage.
assert.equal(t.damage('core',100),0);assert.equal(t.state.hp,TETHER_MAX_HP);
assert.equal(t.damage(0,50),50);assert.equal(t.damage(0,500),40);assert.equal(t.damage(0,10),0);assert.equal(t.damage(7,10),0);assert.equal(t.damage(-1,10),0);assert.equal(t.damage(1,NaN),0);
assert.equal(t.state.phase,'shield');t.damage(1,90);assert.equal(t.state.phase,'shield');t.damage(2,90);assert.equal(t.state.phase,'exposed');assert.equal(t.state.timer,TETHER_EXPOSURE);
// Exposure window: no pulses, core takes damage, then stabilizers regrow.
assert.equal(t.damage('core',700),700);assert.equal(t.state.tier,1);assert.equal(t.damage('core',100),100);assert.equal(t.state.tier,2);assert.equal(t.state.hp,800);
for(let i=0;i<79;i++)assert.equal(t.tick(.1,ground),0);assert.equal(t.state.phase,'exposed');assert.equal(t.tick(.2,ground),0);assert.equal(t.state.phase,'shield');assert.deepEqual(t.state.stabilizers,[90,90,90]);assert.equal(t.state.hp,800);
// Pulse cycle tier 2: rest 1.4 -> warning 1.6 -> live .5; band captured at warning; grounded player in band takes 22 once.
t.tick(1.41,{feetY:4,grounded:true});assert.equal(t.state.attack,'warning');assert.deepEqual(t.state.bands,[1,2]);
assert.equal(t.tick(1.5,{feetY:4,grounded:true}),0,'no damage during warning');
assert.equal(t.tick(.15,{feetY:4,grounded:true}),22);assert.equal(t.tick(.1,{feetY:4,grounded:true}),0,'single hit per pulse');
t.tick(.4,ground);assert.equal(t.state.attack,'rest');assert.deepEqual(t.state.bands,[]);
// Tier 1 pulse: 2.0 rest, one band, 18 damage; airborne or other-band player is safe.
const u=createTether();u.reset(true);u.tick(2.01,ground);assert.equal(u.state.attack,'warning');assert.deepEqual(u.state.bands,[0]);
assert.equal(u.tick(1.65,{feetY:.9,grounded:false}),0,'airborne dodge');assert.equal(u.state.attack,'live');assert.equal(u.tick(.05,{feetY:4,grounded:true}),0,'other band safe');assert.equal(u.tick(.05,ground),18);
// Tier 2 band pair at top band wraps downward (2 -> [2,1]).
const w=createTether();w.reset(true);w.state.tier=2;w.tick(2.01,{feetY:9,grounded:true});assert.deepEqual(w.state.bands,[2,1]);
// Kill, inactive afterwards; dt<=0 never advances; reset restores everything.
const k=createTether();k.reset(true);[0,1,2].forEach(i=>k.damage(i,90));assert.equal(k.damage('core',TETHER_MAX_HP+50),TETHER_MAX_HP);assert.equal(k.blocking,false);assert.equal(k.state.phase,'dead');assert.equal(k.tick(3,ground),0);
k.reset(true);assert.equal(k.state.hp,TETHER_MAX_HP);assert.equal(k.state.tier,1);assert.equal(k.state.attack,'rest');assert.equal(k.tick(0,ground),0);assert.equal(k.tick(-1,ground),0);assert.equal(k.state.attackTime,2);
// Hints mention the state a player needs.
assert.match(tetherHint(k.state),/剩余 3\/3/);k.damage(0,90);assert.match(tetherHint(k.state),/剩余 2\/3/);k.tick(2.01,ground);assert.match(tetherHint(k.state),/预警/);
// Counterweight pads: staggered phases, live window follows the warning, floor only.
assert.equal(padPhase(0,0),'warning');assert.equal(padPhase(PAD_WARNING+.1,0),'live');assert.equal(padPhase(PAD_WARNING+PAD_LIVE+.1,0),'rest');assert.equal(padPhase(PAD_PERIOD+.1,0),'warning');
const live=PAD_WARNING+.1,p0=ORBITAL_PADS[0];assert.deepEqual(padHit(live,{x:p0.x,z:p0.z},0),{index:0,x:p0.x,z:p0.z});assert.equal(padHit(live,{x:p0.x,z:p0.z},1.2),null,'airborne above pad');assert.equal(padHit(live,{x:p0.x+5,z:p0.z},0),null);assert.equal(padHit(.5,{x:p0.x,z:p0.z},0),null,'warning does not hurt');
assert.equal(new Set(ORBITAL_PADS.map((_,i)=>padPhase(live,i))).size>1,true,'pads are staggered');
console.log('PASS: gravity bands, TETHER shield/stabilizers/exposure/regrow, tier-2 threshold, band-locked pulses with airborne dodge, kill/reset/pause, hints, counterweight pads');
