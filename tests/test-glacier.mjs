// Chapter 09 boss rules: GLACIER stalks the player, armor x0.15, thin ice breaks after 2.5 s of pressing, sunk window exposes the core, shells only hit inside the telegraphed circle.
import assert from 'node:assert/strict';
import {createGlacier,GLACIER_MAX_HP,GLACIER_SPAWN,GLACIER_ARMOR,GLACIER_CORE,GLACIER_PRESS,GLACIER_SUNK,GLACIER_CLIMB,GLACIER_RECOVER,GLACIER_SHELL_RADIUS,GLACIER_SHELL_DAMAGE,GLACIER_SHELL_WARN,GLACIER_STOP,glacierHint,glacierIceDistance} from '../src/glacier-rules.js';
import {THIN_ICE,onThinIce} from '../src/polar-data.js';
const g=createGlacier();assert(!g.blocking);assert.equal(g.damage('core',50),0,'inactive boss ignores damage');
g.reset(true);assert(g.blocking);assert.equal(g.state.phase,'armored');assert.deepEqual([g.state.x,g.state.z],[GLACIER_SPAWN.x,GLACIER_SPAWN.z]);assert(!onThinIce(g.state.x,g.state.z),'spawns off the ice');
// Armor: any part takes x0.15; NaN / negative ignored; tier 2 at half.
assert.equal(g.damage('hull',100),100*GLACIER_ARMOR);assert.equal(g.damage('core',100),100*GLACIER_ARMOR);assert.equal(g.damage('core',NaN),0);assert.equal(g.damage('core',-5),0);
assert.equal(g.state.tier,1);g.damage('core',(GLACIER_MAX_HP/2)/GLACIER_ARMOR);assert.equal(g.state.tier,2);
// Stalking: moves toward the player at 2.2 m/s and stops at 5 m; a player far from the ice never triggers a sink.
{const h=createGlacier();h.reset(true);for(let i=0;i<400;i++)h.tick(.05,{player:{x:30,z:-22},feetY:0});assert(Math.abs(Math.hypot(h.state.x-30,h.state.z+22)-GLACIER_STOP)<.2,'stops at 5 m: '+h.state.x);assert.equal(h.state.phase,'armored');assert.equal(h.state.sinks,0);}
// Press: player waits at the ice centre -> mech walks in, presses 2.5 s, sinks (8 s), climbs (1.5 s), resets to spawn with a recovery timer.
{const h=createGlacier();h.reset(true);let t=0,sunkAt=null,climbAt=null,backAt=null;
 for(let i=0;i<1200;i++){h.tick(.05,{player:{x:0,z:0},feetY:0});t+=.05;if(h.state.phase==='sunk'&&sunkAt===null)sunkAt=t;if(h.state.phase==='climbing'&&climbAt===null)climbAt=t;if(climbAt!==null&&h.state.phase==='armored'&&backAt===null){backAt=t;break;}}
 assert(sunkAt!==null&&sunkAt<12,'sinks within 12 s of walking onto the ice: '+sunkAt);assert(Math.abs(climbAt-sunkAt-GLACIER_SUNK)<.11,'sunk window 8 s');assert(Math.abs(backAt-climbAt-GLACIER_CLIMB)<.11,'climb 1.5 s');
 assert.deepEqual([h.state.x,h.state.z],[GLACIER_SPAWN.x,GLACIER_SPAWN.z],'resets to spawn');assert(h.state.recover>GLACIER_RECOVER-.2,'recovery timer armed');assert.equal(h.state.sinks,1);
 // During recovery the ice does not break even with the mech standing on it.
 h.state.x=0;h.state.z=-3;for(let i=0;i<Math.round(GLACIER_RECOVER/.05)-4;i++)h.tick(.05,{player:{x:0,z:0},feetY:0});assert.equal(h.state.phase,'armored','no sink during recovery');assert.equal(h.state.press,0);
 for(let i=0;i<200;i++)h.tick(.05,{player:{x:0,z:0},feetY:0});assert.equal(h.state.sinks,2,'sinks again after recovery');}
// Press decays when the mech leaves the ice (player kites away before 2.5 s).
{const h=createGlacier();h.reset(true);h.state.x=0;h.state.z=-8;for(let i=0;i<30;i++)h.tick(.05,{player:{x:0,z:-4},feetY:0});assert(h.state.press>1&&h.state.press<GLACIER_PRESS);for(let i=0;i<200;i++)h.tick(.05,{player:{x:0,z:-40},feetY:0});assert.equal(h.state.press,0);assert.equal(h.state.phase,'armored');assert.equal(h.state.sinks,0);}
// Kiting the mech across the lake keeps it pressing: it sinks mid-way.
{const h=createGlacier();h.reset(true);h.state.x=0;h.state.z=-4;for(let i=0;i<30;i++)h.tick(.05,{player:{x:0,z:0},feetY:0});for(let i=0;i<200;i++)h.tick(.05,{player:{x:0,z:40},feetY:0});assert.equal(h.state.sinks,1,'crossing the lake sinks it');}
// Sunk: hull x1, core x2; shells stop; damage while climbing is x1 without the core bonus.
{const h=createGlacier();h.reset(true);h.state.x=0;h.state.z=-2;for(let i=0;i<60;i++)h.tick(.05,{player:{x:0,z:0},feetY:0});assert.equal(h.state.phase,'sunk');assert(h.exposed);
 assert.equal(h.damage('hull',100),100);assert.equal(h.damage('core',100),100*GLACIER_CORE);assert.equal(h.state.shell,'rest');
 let dmg=0;for(let i=0;i<Math.round(GLACIER_SUNK/.05)+1;i++)dmg+=h.tick(.05,{player:{x:0,z:0},feetY:0});assert.equal(dmg,0,'no shells while sunk');assert.equal(h.state.phase,'climbing');assert.equal(h.damage('core',100),100,'climbing: exposed but no core bonus');}
// Shells: warning 1.2 s with the circle on the player's position at telegraph time; impact once; stationary player is hit, a player who moves > 3 m is not.
{const h=createGlacier();h.reset(true);let dmg=0,warn=0;for(let i=0;i<600;i++){const d=h.tick(.05,{player:{x:0,z:-10},feetY:0});if(h.state.shell==='warning')warn+=.05;dmg+=d;}
 assert(h.state.shells>=5,'shells fired '+h.state.shells);assert.equal(dmg,h.state.shells*GLACIER_SHELL_DAMAGE[0],'each shell hits the stationary player exactly once');assert(warn/h.state.shells>=GLACIER_SHELL_WARN-.1,'telegraph >= 1.2 s');
 const k=createGlacier();k.reset(true);let d2=0;for(let i=0;i<600;i++){const dodge=k.state.shell==='warning'?GLACIER_SHELL_RADIUS+1:0;d2+=k.tick(.05,{player:{x:dodge,z:-10},feetY:0});}assert.equal(d2,0,'side-step out of the circle avoids every shell');assert(k.state.shells>=5);
 // Tier 2 fires faster and harder.
 const f=createGlacier();f.reset(true);f.damage('core',(GLACIER_MAX_HP/2+1)/GLACIER_ARMOR);assert.equal(f.state.tier,2);let d3=0;for(let i=0;i<600;i++)d3+=f.tick(.05,{player:{x:0,z:-10},feetY:0});assert(f.state.shells>h.state.shells,'tier 2 fires more often');assert.equal(d3,f.state.shells*GLACIER_SHELL_DAMAGE[1]);}
// Kill: exposed core takes the rest, boss stops blocking, later damage ignored, tick inert.
{const h=createGlacier();h.reset(true);h.state.x=0;h.state.z=-2;for(let i=0;i<60;i++)h.tick(.05,{player:{x:0,z:0},feetY:0});const hp=h.state.hp;assert.equal(h.damage('core',1e6),hp);assert(!h.blocking);assert.equal(h.state.phase,'dead');assert.equal(h.damage('core',5),0);assert.equal(h.tick(1,{player:{x:0,z:0},feetY:0}),0);}
// Hints cover every state; ice distance is zero on the lake.
assert.match(glacierHint({phase:'sunk',phaseTime:5}),/陷冰/);assert.match(glacierHint({phase:'climbing'}),/爬出/);assert.match(glacierHint({phase:'armored',x:0,z:-30,press:0,recover:0,shell:'warning',shellTime:1}),/预警/);assert.match(glacierHint({phase:'armored',x:0,z:-30,press:1,recover:0,shell:'rest',shellTime:2}),/压冰/);
assert.equal(glacierIceDistance({x:0,z:0}),0);assert.equal(glacierIceDistance({x:0,z:-THIN_ICE.radius-5}),5);
console.log('PASS: GLACIER armor x0.15 / tier 2, stalking + 5 m stop, thin-ice press 2.5 s -> sunk 8 s -> climb 1.5 s -> respawn + recovery, press decay, sunk core x2 + no shells, shell telegraph + single hit + side-step dodge, tier 2 cadence, kill/inert, hints');
