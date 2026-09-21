import assert from 'node:assert/strict';
import {MEDEVAC,createMedevac,startMedevac,stepMedevac,medevacGrade,medevacZone,medevacSummary,medevacHint} from './helicopter-medevac.js';
import {createSling,toggleHook,stepSling,SLING,SLING_ZONES,zoneAt} from './helicopter-sling.js';
import {createHelicopter,startHelicopter,HELICOPTER} from './helicopter-rules.js';
import {fieldGround} from './helicopter-field.js';
import {isFootSurface,LIGHTHOUSE_ISLAND} from './maritime-rules.js';
const hover=(x,z,y)=>{const h=createHelicopter({x,y,z});startHelicopter(h);h.grounded=false;h.rpm=1;h.vx=h.vz=h.vy=0;return h;};
// Layout: casualty pod on the island plateau, clear of the island supply zone; medical zone on walkable shore ground.
{
 assert.equal(fieldGround(MEDEVAC.cargo.x,MEDEVAC.cargo.z),LIGHTHOUSE_ISLAND.h,'pod on plateau');
 const island=SLING_ZONES.find(z=>z.id==='island');assert.ok(Math.hypot(island.x-MEDEVAC.cargo.x,island.z-MEDEVAC.cargo.z)>SLING.zoneRadius+2,'pod outside island zone');
 const med=medevacZone(createSling());assert.ok(med&&isFootSurface(med.x,med.z)&&fieldGround(med.x,med.z)===0,'medical zone on shore ground');
}
// Locked until started; start places the pod on the island at ground height and arms the clock.
{
 const s=createSling(),m=createMedevac();assert.equal(m.status,'locked');assert.equal(medevacHint(m),'');
 assert.equal(stepMedevac(m,s,createHelicopter(),'delivered',.05),null,'locked ignores events');
 assert.equal(startMedevac(m,s,fieldGround),'start');assert.equal(m.status,'active');assert.equal(m.timer,MEDEVAC.timeLimit);
 assert.equal(s.cargo.x,MEDEVAC.cargo.x);assert.equal(s.cargo.y,LIGHTHOUSE_ISLAND.h);assert.equal(s.cargo.kind,'casualty');assert.ok(s.cargo.resting&&!s.hooked);
 assert.match(medevacHint(m),/剩余 90 s/);assert.equal(stepMedevac(m,s,createHelicopter(),null,0),null,'bad dt inert');
}
// Steady carry keeps health; a wide swing bleeds it; zero health fails with 'casualty' and retries after the wait.
{
 const s=createSling(),m=createMedevac();startMedevac(m,s,fieldGround);const c=s.cargo;
 const h=hover(c.x,c.z,c.y+SLING.cargoHeight+HELICOPTER.height*.35+SLING.cable+2);assert.ok(toggleHook(s,h,fieldGround).ok);
 for(let i=0;i<40;i++){stepSling(s,h,.05,fieldGround);stepMedevac(m,s,h,null,.05,fieldGround);}
 assert.equal(m.health,MEDEVAC.health,'no swing, no harm');assert.ok(m.timer<MEDEVAC.timeLimit);
 h.x+=8;stepSling(s,h,.05,fieldGround);const before=m.health;stepMedevac(m,s,h,null,.05,fieldGround);assert.ok(m.health<before,'swing hurts');
 const m2=createMedevac();startMedevac(m2,s,fieldGround);// start resets + unhooks the pod; re-hook, then a hard swing finishes a critical patient
 const h2=hover(s.cargo.x,s.cargo.z,s.cargo.y+SLING.cargoHeight+HELICOPTER.height*.35+SLING.cable+2);assert.ok(toggleHook(s,h2,fieldGround).ok);m2.health=.5;h2.x+=9;stepSling(s,h2,.05,fieldGround);
 assert.equal(stepMedevac(m2,s,h2,null,.05,fieldGround),'fail');assert.equal(m2.failReason,'casualty');assert.equal(m2.retry,MEDEVAC.retryAfter);assert.match(medevacHint(m2),/伤势恶化/);
 let ev=null;for(let i=0;i<400&&ev!=='retry';i++)ev=stepMedevac(m2,s,h2,null,.05,fieldGround);
 assert.equal(ev,'retry');assert.equal(m2.status,'active');assert.equal(m2.attempts,2);assert.equal(m2.health,MEDEVAC.health);assert.equal(s.cargo.x,MEDEVAC.cargo.x);
}
// Timeout, damaged, dropped and wrong-zone deliveries all fail with their reason.
{
 const mk=()=>{const s=createSling(),m=createMedevac();startMedevac(m,s,fieldGround);return [s,m];};
 let [s,m]=mk();m.timer=.01;assert.equal(stepMedevac(m,s,createHelicopter(),null,.05,fieldGround),'fail');assert.equal(m.failReason,'timeout');
 [s,m]=mk();assert.equal(stepMedevac(m,s,createHelicopter(),'damaged',.05,fieldGround),'fail');assert.equal(m.failReason,'damaged');
 [s,m]=mk();assert.equal(stepMedevac(m,s,createHelicopter(),'dropped',.05,fieldGround),'fail');assert.equal(m.failReason,'dropped');
 [s,m]=mk();const g=SLING_ZONES.find(z=>z.id==='garage');s.cargo.x=g.x;s.cargo.z=g.z;assert.equal(stepMedevac(m,s,createHelicopter(),'delivered',.05,fieldGround),'fail');assert.equal(m.failReason,'wrongZone');
}
// Delivery in the medical zone completes with a grade from time + health; grades are monotone; best is kept.
{
 const s=createSling(),m=createMedevac();startMedevac(m,s,fieldGround);const med=medevacZone(s);s.cargo.x=med.x;s.cargo.z=med.z;
 m.timer=MEDEVAC.timeLimit*.6;m.health=90;assert.equal(stepMedevac(m,s,createHelicopter(),'delivered',.05,fieldGround),'complete');
 assert.equal(m.status,'done');assert.equal(m.grade,'S');assert.equal(m.best,'S');assert.match(medevacHint(m),/评级 S/);
 assert.equal(stepMedevac(m,s,createHelicopter(),'delivered',.05,fieldGround),null,'done ignores events');
 assert.equal(medevacGrade({timer:MEDEVAC.timeLimit*.3,health:60}),'A');assert.equal(medevacGrade({timer:MEDEVAC.timeLimit*.6,health:40}),'B','health gate applies even when fast');assert.equal(medevacGrade({timer:1,health:100}),'B');
 const s2=createSling(),m2=createMedevac();m2.best='S';startMedevac(m2,s2,fieldGround);s2.cargo.x=med.x;s2.cargo.z=med.z;m2.timer=1;stepMedevac(m2,s2,createHelicopter(),'delivered',.05,fieldGround);
 assert.equal(m2.grade,'B');assert.equal(m2.best,'S','best not downgraded');assert.match(medevacHint(m2),/最佳 S/);
 const sum=medevacSummary(m2);assert.equal(sum.attempts,1);assert.equal(sum.grade,'B');
}
console.log('PASS: helicopter medevac — island pod/shore zone layout, locked→start, swing damage, casualty/timeout/damaged/dropped/wrong-zone failures with retry, graded completion and best grade');
