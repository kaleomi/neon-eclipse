// Chapter 08 boss rules: ABYSS is shielded unless drained, discharges hit only players in water, summons per HIGH phase with a cap.
import assert from 'node:assert/strict';
import {createAbyss,ABYSS_MAX_HP,ABYSS_EXPOSE_LEVEL,ABYSS_SUMMON,ABYSS_SUMMON_CAP,abyssHint} from '../src/abyss-rules.js';
import {WATER_HIGH,waterLevel,waterPhase} from '../src/datacenter-data.js';
const b=createAbyss();assert(!b.blocking);assert.equal(b.damage('core',50),0,'inactive boss ignores damage');
b.reset(true);assert(b.blocking);assert.equal(b.state.phase,'shield');
// Shield: damage is refused while water >= expose level; exposed below it; only the 'core' part counts.
b.tick(.1,{level:1,feetY:0,alive:0});assert.equal(b.state.phase,'shield');assert.equal(b.damage('core',100),0);
b.tick(.1,{level:ABYSS_EXPOSE_LEVEL-.01,feetY:0,alive:0});assert.equal(b.state.phase,'exposed');assert.equal(b.damage('arm',100),0);assert.equal(b.damage('core',100),100);assert.equal(b.state.hp,ABYSS_MAX_HP-100);
assert.equal(b.damage('core',NaN),0);assert.equal(b.damage('core',-5),0);
// Tier 2 at half HP.
b.damage('core',ABYSS_MAX_HP/2-100);assert.equal(b.state.tier,2);
// HIGH phase entry queues summons (tier 2: 3) once per high phase, capped by alive stalkers.
b.tick(.1,{level:WATER_HIGH,feetY:2,alive:0});assert.equal(b.takeSummons(),ABYSS_SUMMON+1);assert.equal(b.takeSummons(),0);
for(let i=0;i<50;i++)b.tick(.1,{level:WATER_HIGH,feetY:2,alive:3});assert.equal(b.takeSummons(),0,'no re-summon inside the same high phase');
b.tick(.1,{level:.5,feetY:2,alive:3});b.tick(.1,{level:WATER_HIGH,feetY:2,alive:3});assert.equal(b.takeSummons(),ABYSS_SUMMON_CAP-3,'cap respects alive stalkers');
// Discharge: warning (1.5 s) then live (.5 s); damage only once per discharge and only if the player's feet are under water.
const c=createAbyss();c.reset(true);let warn=0,dmgDry=0,dmgWet=0,warnTime=0;
for(let t=0;t<30;t+=.05){const wet=t>10;const d=c.tick(.05,{level:WATER_HIGH,feetY:wet?0:1.5,alive:0});if(c.state.attack==='warning')warnTime+=.05;if(c.state.attack==='warning'&&warn===0)warn=t;if(d){if(wet)dmgWet+=d;else dmgDry+=d;}}
assert.equal(dmgDry,0,'dry player never takes discharge');assert(dmgWet>0&&dmgWet%20===0,'wet player takes 20 per discharge, once each: '+dmgWet);assert(c.state.discharges>=2);
assert(warnTime>=1.45,'warning telegraph >= 1.5 s total per discharge');
// Discharge stops immediately when the water is not high.
c.tick(.05,{level:.6,feetY:0,alive:0});assert.equal(c.state.attack,'rest');assert.equal(c.tick(.05,{level:.6,feetY:0,alive:0}),0);
// Kill: exposed core takes the rest, boss stops blocking, later damage is ignored, tick is inert.
c.tick(.05,{level:0,feetY:0,alive:0});assert.equal(c.damage('core',1e6),ABYSS_MAX_HP);assert(!c.blocking);assert.equal(c.state.phase,'dead');assert.equal(c.damage('core',5),0);assert.equal(c.tick(1,{level:WATER_HIGH,feetY:0,alive:0}),0);
// Integration with the tide: over one full 0-pump cycle the core is exposed for the low phase plus rise/drain tails only.
const d=createAbyss();d.reset(true);let exposed=0,total=0;for(let t=0;t<40;t+=.1){d.tick(.1,{level:waterLevel(t,0),feetY:1.5,alive:0});total+=.1;if(d.state.phase==='exposed')exposed+=.1;}
assert(exposed>14&&exposed<20,'exposed window per cycle '+exposed.toFixed(1)+' s of '+total.toFixed(0));
// Hints cover every state.
assert.match(abyssHint({phase:'exposed',attack:'rest'},'low'),/核心露出/);assert.match(abyssHint({phase:'shield',attack:'warning'},'high'),/预警/);assert.match(abyssHint({phase:'shield',attack:'live'},'high'),/放电中/);assert.match(abyssHint({phase:'shield',attack:'rest'},waterPhase(25,0)),/涨水/);
console.log('PASS: ABYSS shield/expose gating, core-only damage, tier 2 at half, per-high-phase summons with cap, discharge telegraph + wet-only single hit, kill/inert, tide exposure window, hints');
