import assert from 'node:assert/strict';
import {DURABILITY,REPAIR_STATIONS,createDurability,durabilityTier,impactDamage,applyDamage,stepImpactDamage,limitInput,speedCap,clampSpeed,stepRepair,durabilitySummary,inStation} from './vehicle-durability.js';
import {CollisionGrid,ROVER,createRover,stepRover,TEST_SPAWN} from './vehicle-rules.js';
import {YACHT,YACHT_SPAWN,createYacht,stepYacht} from './maritime-rules.js';
// Tiers and damage curve
{
 const d=createDurability('rover');assert.equal(durabilityTier(d),'normal');assert.equal(d.hull,100);
 assert.equal(impactDamage('rover',0),DURABILITY.rover.min,'slow taps still cost the minimum');
 assert.equal(impactDamage('rover',ROVER.maxSpeed),Math.min(DURABILITY.rover.max,DURABILITY.rover.base+ROVER.maxSpeed*DURABILITY.rover.perSpeed));
 assert.equal(impactDamage('rover',1000),DURABILITY.rover.max,'capped');assert.equal(impactDamage('yacht',1000),DURABILITY.yacht.max);
 assert.equal(applyDamage(d,45),45);assert.equal(durabilityTier(d),'smoking');assert.equal(applyDamage(d,40),40);assert.equal(durabilityTier(d),'disabled');
 assert.equal(applyDamage(d,999),15,'never below zero, reports actual loss');assert.equal(d.hull,0);assert.equal(d.damageTaken,100);
 assert.equal(applyDamage(d,-5),0);assert.equal(applyDamage(d,NaN),0);
}
// Impact counter to damage: only new impacts count, once each, using the pre-impact speed.
{
 const d=createDurability('rover'),rover=createRover({x:0,z:0,yaw:0});
 assert.equal(stepImpactDamage(d,rover,20),0);rover.impacts=1;const loss=stepImpactDamage(d,rover,20);assert.equal(loss,impactDamage('rover',20));
 assert.equal(stepImpactDamage(d,rover,20),0,'same impact not charged twice');rover.impacts=3;assert(stepImpactDamage(d,rover,5)>0,'skipped counts still charge once');
 assert.equal(stepImpactDamage(d,null,5),0);assert.equal(stepImpactDamage(d,{},5),0);
}
// Real rover into a wall: durability degrades through the physics impact path.
{
 const wall=new CollisionGrid([{minX:-8,maxX:8,minZ:-15.1,maxZ:-15}]),d=createDurability('rover');
 const rover=createRover({x:0,z:0,yaw:0});rover.speed=29;
 for(let i=0;i<60;i++){const before=rover.speed;stepRover(rover,limitInput(d,{throttle:1}),1/60,wall);stepImpactDamage(d,rover,before);}
 assert(rover.impacts>=1);assert(d.hull<100);assert.equal(d.damageTaken,100-d.hull);
}
// Input and speed limits by tier
{
 const d=createDurability('rover');assert.deepEqual(limitInput(d,{throttle:1,steer:-1}),{throttle:1,steer:-1,tier:'normal'});assert.equal(speedCap(d,ROVER.maxSpeed),ROVER.maxSpeed);
 d.hull=50;const smoking=limitInput(d,{throttle:1,steer:-1,brake:true});assert.equal(smoking.tier,'smoking');assert.equal(smoking.throttle,DURABILITY.smokingSpeedFactor);assert.equal(smoking.steer,-DURABILITY.smokingSpeedFactor);assert.equal(smoking.brake,true);
 assert.equal(speedCap(d,ROVER.maxSpeed),ROVER.maxSpeed*DURABILITY.smokingSpeedFactor);
 d.hull=10;const limp=limitInput(d,{throttle:-1,steer:1});assert.equal(limp.tier,'disabled');assert.equal(limp.throttle,0,'disabled cannot reverse');assert.equal(limitInput(d,{throttle:1}).throttle,.5);assert.equal(speedCap(d,ROVER.maxSpeed),DURABILITY.limpSpeed);
 const rover=createRover({x:0,z:0,yaw:0});rover.speed=25;clampSpeed(d,rover,ROVER.maxSpeed,ROVER.reverseSpeed);assert.equal(rover.speed,DURABILITY.limpSpeed);rover.speed=-3;clampSpeed(d,rover,ROVER.maxSpeed,ROVER.reverseSpeed);assert.equal(rover.speed,0,'disabled reverse clamps to zero');
 d.hull=50;rover.speed=-9;clampSpeed(d,rover,ROVER.maxSpeed,ROVER.reverseSpeed);assert.equal(rover.speed,-Math.min(ROVER.reverseSpeed,ROVER.maxSpeed*DURABILITY.smokingSpeedFactor));
}
// Disabled rover really limps: full throttle across 10 s tops out at limp speed.
{
 const d=createDurability('rover');d.hull=5;const rover=createRover({x:0,z:0,yaw:0}),empty=new CollisionGrid([],24,10000);
 for(let i=0;i<600;i++){stepRover(rover,limitInput(d,{throttle:1}),1/60,empty);clampSpeed(d,rover,ROVER.maxSpeed,ROVER.reverseSpeed);}
 assert(rover.speed<=DURABILITY.limpSpeed+1e-9&&rover.speed>1,'limps forward but slowly');
 const yacht=createYacht(),yd=createDurability('yacht');yd.hull=5;
 for(let i=0;i<600;i++){stepYacht(yacht,limitInput(yd,{throttle:1}),1/60);clampSpeed(yd,yacht,YACHT.maxSpeed,YACHT.reverseSpeed);}
 assert(yacht.speed<=DURABILITY.limpSpeed+1e-9&&yacht.speed>1);
}
// Repair: parked in own berth for repairSeconds, moving resets, wrong berth ignored, no repair when full.
{
 const d=createDurability('rover');d.hull=30;const rover=createRover();assert(inStation(rover,REPAIR_STATIONS.rover),'spawn is inside the garage berth');
 for(let i=0;i<4*60;i++)assert.equal(stepRepair(d,rover,1/60),false);assert(d.repairing);assert(d.repair>3.9);
 rover.speed=3;stepRepair(d,rover,1/60);assert.equal(d.repair,0,'moving resets progress');rover.speed=0;
 let done=false;for(let i=0;i<6*60&&!done;i++)done=stepRepair(d,rover,1/60);assert(done);assert.equal(d.hull,100);assert.equal(d.repairs,1);assert.equal(d.repairing,false);
 assert.equal(stepRepair(d,rover,1),false,'full hull does not repair again');assert.equal(d.repairs,1);
 d.hull=30;const away={...rover,x:rover.x+40};for(let i=0;i<10*60;i++)stepRepair(d,away,1/60);assert.equal(d.hull,30,'outside the berth nothing happens');
 for(let i=0;i<10*60;i++)stepRepair(d,rover,1/60,REPAIR_STATIONS.yacht);assert.equal(d.hull,30,'another vehicle berth does not repair the rover');
 const snapshot=JSON.stringify(d);stepRepair(d,rover,1,undefined,{paused:true});stepRepair(d,rover,NaN);stepRepair(d,rover,-1);assert.equal(JSON.stringify(d),snapshot);
 const y=createDurability('yacht');y.hull=10;const yacht=createYacht();assert.deepEqual({x:yacht.x,z:yacht.z},{x:YACHT_SPAWN.x,z:YACHT_SPAWN.z});let yd=false;for(let i=0;i<6*30&&!yd;i++)yd=stepRepair(y,yacht,1/30);assert(yd);
 const p=createDurability('plane');p.hull=10;let pd=false;for(let i=0;i<6*144&&!pd;i++)pd=stepRepair(p,{x:-300,z:220,speed:0},1/144);assert(pd);
}
// Large step handling and frame-rate independence for repair timing
{
 for(const hz of [30,60,120,144]){const d=createDurability('rover');d.hull=1;const rover=createRover();let n=0;while(!stepRepair(d,rover,1/hz))n++;assert(Math.abs(n/hz-DURABILITY.repairSeconds)<1/hz+1e-6,'repair time consistent at '+hz+'Hz');}
 const d=createDurability('rover');d.hull=1;const rover=createRover();stepRepair(d,rover,5);assert.equal(d.hull,1,'a single huge step is capped at .25 s');
}
// Summary shape
{
 const d=createDurability('rover');d.hull=42.2;d.repair=2.5;d.repairing=true;const s=durabilitySummary(d);
 assert.equal(s.tier,'smoking');assert.equal(s.hull,43);assert.equal(s.repairPercent,50);assert.equal(s.station.id,'garage');assert(s.label.includes('冒烟'));
}
assert.equal(TEST_SPAWN.x,REPAIR_STATIONS.rover.x);
console.log('PASS: durability tiers, impact damage curve and single charging, real rover/yacht limp caps, smoking input scaling, disabled no-reverse, berth repair timing at 30/60/120/144Hz, moving/wrong-berth/full/paused/invalid guards, summary');
