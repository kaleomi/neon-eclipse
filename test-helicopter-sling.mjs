import assert from 'node:assert/strict';
import {createSling,stepSling,toggleHook,hookBlocked,zoneAt,slingSummary,slingHint,SLING,SLING_CARGO,SLING_ZONES,SLING_RUN,createSlingRun,stepSlingRun,slingRunTarget,slingRunHint,slingRunSummary,claimSlingReward} from './helicopter-sling.js';
import {createHelicopter,startHelicopter,HELICOPTER} from './helicopter-rules.js';
import {fieldGround,HELI_PADS} from './helicopter-field.js';
import {isFootSurface,PLATFORM} from './maritime-rules.js';
const hover=(x,z,y)=>{const h=createHelicopter({x,y,z});startHelicopter(h);h.grounded=false;h.rpm=1;h.vx=h.vz=h.vy=0;return h;};
const hookY=c=>c.y+SLING.cargoHeight+HELICOPTER.height*.35+SLING.cable+2;// belly hook inside the band and above cable length so the load actually lifts
// Rule sanity: the hook band must allow a hover above cable length, otherwise the crate can never leave the ground.
assert.ok(SLING.cable+2<=SLING.hookMaxHeight&&SLING.hookMinHeight<SLING.cable);
// Layout: cargo and land zone sit on walkable ground near the shore pad; island zone is on the island plateau.
{
 assert.ok(isFootSurface(SLING_CARGO.x,SLING_CARGO.z),'cargo on foot surface');assert.ok(Math.hypot(SLING_CARGO.x-HELI_PADS.shore.x,SLING_CARGO.z-HELI_PADS.shore.z)<40,'cargo within a short hop of the shore pad');
 assert.ok(fieldGround(SLING_ZONES[1].x,SLING_ZONES[1].z)>5,'island zone sits on the plateau');assert.ok(fieldGround(SLING_ZONES[0].x,SLING_ZONES[0].z)>=0);
 assert.equal(new Set(SLING_ZONES.map(z=>z.id)).size,SLING_ZONES.length);
}
// Hook gate: grounded / far / too low / too high / moving are refused with reasons; a good hover hooks; F again releases.
{
 const s=createSling();const c=s.cargo;
 const g=createHelicopter({x:c.x,y:0,z:c.z});assert.match(hookBlocked(s,g),/悬停/);
 const far=hover(c.x+9,c.z,hookY(c));assert.match(hookBlocked(s,far),/横向/);
 const low=hover(c.x,c.z,c.y+SLING.cargoHeight+HELICOPTER.height*.35+2);assert.match(hookBlocked(s,low),/太低/);
 const high=hover(c.x,c.z,c.y+SLING.cargoHeight+HELICOPTER.height*.35+SLING.hookMaxHeight+3);assert.match(hookBlocked(s,high),/太高/);
 const fast=hover(c.x,c.z,hookY(c));fast.vx=3;assert.match(hookBlocked(s,fast),/速度/);
 const ok=hover(c.x,c.z,hookY(c));assert.equal(hookBlocked(s,ok),null);assert.match(slingHint(s,ok),/按 F 挂钩/);
 const r=toggleHook(s,ok);assert.ok(r.ok&&s.hooked&&s.cable===SLING.cable&&!c.resting);assert.match(slingHint(s,ok),/吊挂中/);
 assert.deepEqual(toggleHook(s,ok),{ok:true,event:'release'});assert.equal(s.hooked,false);
}
// Carry: cargo hangs `cable` below the hook, follows horizontally with lag, then lands intact in a zone when lowered gently → delivery counted.
{
 const s=createSling();const c=s.cargo;const h=hover(c.x,c.z,hookY(c));toggleHook(s,h);
 for(let i=0;i<40;i++)stepSling(s,h,.05);
 assert.ok(Math.abs(c.y-(h.y-HELICOPTER.height*.35-SLING.cable-SLING.cargoHeight))<1e-6,'hangs at cable length');
 h.x+=6;stepSling(s,h,.05);assert.ok(c.x<h.x-2,'cargo lags behind a sudden move');const sw=slingSummary(s,h).swing;assert.ok(sw>2);
 for(let i=0;i<200;i++)stepSling(s,h,.05);assert.ok(Math.abs(c.x-h.x)<.2,'settles under the hook');
 // Fly to the garage zone and lower until the crate touches down.
 const z=SLING_ZONES[0];h.x=z.x;h.z=z.z;for(let i=0;i<200;i++)stepSling(s,h,.05);
 let ev=null;while(ev!=='touchdown'){h.y-=.02;ev=stepSling(s,h,.05,()=>0);assert.ok(h.y>0,'never reaches ground without touchdown');}
 assert.ok(c.resting&&s.hooked,'cable slack, still hooked');
 toggleHook(s,h);const done=stepSling(s,h,.05,()=>0);
 assert.equal(done,null,'already resting: no fall event');assert.ok(zoneAt(s,c.x,c.z)?.id==='garage');
 // Delivery is credited on a free-fall settle; simulate a release from just above the pad.
 const s2=createSling();const c2=s2.cargo;const h2=hover(c2.x,c2.z,hookY(c2));toggleHook(s2,h2);for(let i=0;i<40;i++)stepSling(s2,h2,.05);
 h2.x=z.x;h2.z=z.z;for(let i=0;i<300;i++)stepSling(s2,h2,.05);
 h2.y=HELICOPTER.height*.35+SLING.cable+SLING.cargoHeight+.4;for(let i=0;i<60;i++)stepSling(s2,h2,.05);// crate 0.4 m up
 toggleHook(s2,h2);let e2=null;for(let i=0;i<40&&!e2;i++)e2=stepSling(s2,h2,.05,()=>0);
 assert.equal(e2,'delivered');assert.equal(s2.deliveries,1);assert.ok(c2.intact);
}
// Drop from height smashes the crate; drop outside any zone counts as `dropped`; crash releases the hook.
{
 const s=createSling();const c=s.cargo;const h=hover(c.x,c.z,hookY(c));toggleHook(s,h);for(let i=0;i<40;i++)stepSling(s,h,.05);
 h.y+=20;for(let i=0;i<40;i++)stepSling(s,h,.05);toggleHook(s,h);let ev=null;for(let i=0;i<200&&!ev;i++)ev=stepSling(s,h,.05,()=>0);
 assert.equal(ev,'damaged');assert.equal(s.damaged,1);assert.equal(c.intact,false);
 const s3=createSling();const h3=hover(s3.cargo.x,s3.cargo.z,hookY(s3.cargo));toggleHook(s3,h3);for(let i=0;i<40;i++)stepSling(s3,h3,.05);
 h3.x+=60;for(let i=0;i<300;i++)stepSling(s3,h3,.05);h3.y=HELICOPTER.height*.35+SLING.cable+SLING.cargoHeight+.3;for(let i=0;i<60;i++)stepSling(s3,h3,.05);
 toggleHook(s3,h3);let e3=null;for(let i=0;i<40&&!e3;i++)e3=stepSling(s3,h3,.05,()=>0);assert.equal(e3,'dropped');assert.equal(s3.drops,1);
 const s4=createSling();const h4=hover(s4.cargo.x,s4.cargo.z,hookY(s4.cargo));toggleHook(s4,h4);h4.status='crashed';assert.equal(stepSling(s4,h4,.05),'release');assert.equal(s4.hooked,false);
}
// Inert on bad dt; createSling copies zones (no shared mutation).
{const s=createSling();assert.equal(stepSling(s,createHelicopter(),0),null);assert.equal(stepSling(s,createHelicopter(),NaN),null);s.zones[0].delivered=5;assert.equal(createSling().zones[0].delivered,undefined);}
// Supply run (plan A): ordered legs garage → island → platform, respawn after delivery/loss, one-shot reward.
{
 const s=createSling();const run=createSlingRun();
 assert.equal(slingRunTarget(run,s).id,'garage');assert.match(slingRunHint(run,s),/1\/3 → 车库/);
 assert.equal(stepSlingRun(run,s,null,.05),null,'no event: nothing');assert.equal(stepSlingRun(run,s,'delivered',0),null,'bad dt inert');
 // Deliver in the wrong zone (platform first): penalised respawn, index unchanged.
 s.cargo.x=SLING_ZONES[2].x;s.cargo.z=SLING_ZONES[2].z;s.cargo.y=fieldGround(s.cargo.x,s.cargo.z);
 assert.equal(stepSlingRun(run,s,'delivered',.05),'wrongZone');assert.equal(run.index,0);assert.equal(run.respawn,SLING_RUN.respawnAfterLoss);
 assert.match(slingRunHint(run,s),/投错区域/);
 let ev=null;for(let i=0;i<200&&ev!=='respawn';i++)ev=stepSlingRun(run,s,null,.05);
 assert.equal(ev,'respawn');assert.equal(s.cargo.x,SLING_CARGO.x);assert.ok(s.cargo.resting&&s.cargo.intact&&!s.hooked);
 // Correct legs in order.
 const deliverAt=z=>{s.cargo.x=z.x;s.cargo.z=z.z;return stepSlingRun(run,s,'delivered',.05);};
 assert.equal(deliverAt(SLING_ZONES[0]),'leg');assert.equal(run.index,1);assert.equal(run.respawn,SLING_RUN.respawnAfterDelivery);
 assert.equal(deliverAt(SLING_ZONES[1]),null,'events ignored while respawning');
 for(let i=0;i<100;i++)stepSlingRun(run,s,null,.05);assert.equal(run.respawn,0);
 assert.equal(deliverAt(SLING_ZONES[1]),'leg');for(let i=0;i<100;i++)stepSlingRun(run,s,null,.05);
 // Loss on the last leg: damaged crate respawns, run still active.
 assert.equal(stepSlingRun(run,s,'damaged',.05),'lost');assert.match(slingRunHint(run,s),/吊箱损失/);for(let i=0;i<200;i++)stepSlingRun(run,s,null,.05);
 assert.equal(slingRunTarget(run,s).id,'platform');
 assert.equal(deliverAt(SLING_ZONES[2]),'complete');assert.equal(run.status,'done');assert.deepEqual(run.legs,['garage','island','platform']);
 assert.equal(slingRunTarget(run,s),null);assert.match(slingRunHint(run,s),/补给链完成/);
 assert.deepEqual(claimSlingReward(run),{rockets:SLING_RUN.rewardRockets,refillBelt:true});assert.equal(claimSlingReward(run),null,'reward is one-shot');
 assert.equal(stepSlingRun(run,s,'delivered',.05),null,'done run ignores events');
 const sum=slingRunSummary(run,s);assert.equal(sum.leg,3);assert.equal(sum.legs,3);assert.ok(sum.rewardClaimed);
 // Fresh run has no reward to claim; dropped outside a zone is a loss.
 const r2=createSlingRun();assert.equal(claimSlingReward(r2),null);assert.equal(stepSlingRun(r2,createSling(),'dropped',.05),'lost');
 // Layout: every ordered zone exists and the new platform zone sits on the platform deck.
 for(const id of SLING_RUN.order)assert.ok(SLING_ZONES.some(z=>z.id===id),id);
 assert.equal(fieldGround(SLING_ZONES[2].x,SLING_ZONES[2].z),PLATFORM.h);
}
console.log('PASS: helicopter sling load — layout on walkable ground, hook gate reasons, cable hang + spring lag + settle, touchdown/slack, delivery in zone, damage on hard drop, dropped outside zone, crash release, inert dt; supply run legs/wrong zone/loss/respawn/reward');
