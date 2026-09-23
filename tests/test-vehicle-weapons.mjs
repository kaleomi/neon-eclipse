import assert from 'node:assert/strict';
import {ROOF_GUN,PLANE_GUN,ROCKET,TARGETS,createRange,stepRange,aliveTargets,damageTarget,raySphere,rayBox,rayGround,hitscan,aimDirection,createWeaponState,enterGunner,leaveGunner,gunnerDriveInput,aimTurret,roofMuzzle,stepRoofGun,planeMuzzle,stepPlaneGun,stepRockets,stepRearm,weaponSummary,rangeSummary,nearestTarget} from '../src/vehicle-weapons.js';
import {createRover,stepRover,CollisionGrid,ROVER,DRIVE_GATES,TEST_SPAWN} from '../src/vehicle-rules.js';
import {collisionBoxes,TEST_OBSTACLES,TEST_POLES} from '../src/vehicle-world.js';
import {createPlane,FLIGHT_GATES} from '../src/flight-rules.js';
import {FIELD_BUILDINGS,DOCK,WATER_GATES,waterFree,landSurface} from '../src/maritime-rules.js';
import {REPAIR_STATIONS} from '../src/vehicle-durability.js';
import {JOINT_POINTS} from '../src/joint-mission.js';
import {CHASE_GATES,CHASE_EVAC} from '../src/chase-rules.js';
import {RECON,RECON_TARGETS} from '../src/recon-rules.js';
const fixed=()=>.5;// deterministic: no spread
const boxes=[...TEST_OBSTACLES.map(b=>({minX:b.x-b.w/2,maxX:b.x+b.w/2,minZ:b.z-b.d/2,maxZ:b.z+b.d/2,h:b.h})),...TEST_POLES.map(([x,z])=>({minX:x-.25,maxX:x+.25,minZ:z-.25,maxZ:z+.25,h:12})),...FIELD_BUILDINGS,{...DOCK,h:.85}];
// Ray primitives
{
 assert.equal(raySphere({x:0,y:0,z:0},{x:0,y:0,z:-1},{x:0,y:0,z:-10},2),8);assert.equal(raySphere({x:0,y:0,z:0},{x:0,y:0,z:1},{x:0,y:0,z:-10},2),null,'behind');assert.equal(raySphere({x:0,y:0,z:-10},{x:0,y:0,z:1},{x:0,y:0,z:-10},2),0,'inside');
 assert.equal(rayBox({x:0,y:1,z:0},{x:0,y:0,z:-1},{minX:-2,maxX:2,minZ:-12,maxZ:-8,h:5}),8);assert.equal(rayBox({x:0,y:6,z:0},{x:0,y:0,z:-1},{minX:-2,maxX:2,minZ:-12,maxZ:-8,h:5}),null,'over the roof');assert.equal(rayBox({x:5,y:1,z:0},{x:0,y:0,z:-1},{minX:-2,maxX:2,minZ:-12,maxZ:-8,h:5}),null,'beside');
 assert.equal(rayGround({x:0,y:2,z:0},{x:0,y:-1,z:0}),2);assert.equal(rayGround({x:0,y:2,z:0},{x:0,y:1,z:0}),null);
 const d=aimDirection(0,0);assert(Math.abs(d.z+1)<1e-9&&Math.abs(d.y)<1e-9);const up=aimDirection(0,Math.PI/2);assert(Math.abs(up.y-1)<1e-9);
}
// Target layout: never on any mission route or berth, never inside obstacles, plates on land, drones' orbits clear.
{
 const range=createRange();assert.equal(range.targets.length,TARGETS.length);assert(aliveTargets(range,'plate').length===6&&aliveTargets(range,'balloon').length===4&&aliveTargets(range,'drone').length===10);
 const grid=new CollisionGrid(collisionBoxes(),24,600);
 const keepOut=[...DRIVE_GATES,...FLIGHT_GATES,...WATER_GATES,...CHASE_GATES,CHASE_EVAC,...Object.values(JOINT_POINTS),...Object.values(REPAIR_STATIONS),TEST_SPAWN,{x:-300,z:220},{x:278,z:180}];
 for(const t of range.targets){
  if(t.orbit)continue;
  for(const k of keepOut)assert(Math.hypot(t.x-k.x,t.z-k.z)>20,t.id+' clear of route point');
  if(t.type==='plate'){assert(landSurface(t.x,t.z,2),t.id+' on land');assert(grid.free(t.x,t.z,t.r+.5),t.id+' not in an obstacle');}
 }
 for(let i=0;i<600;i++)stepRange(range,1/60);
 for(const t of range.targets.filter(t=>t.orbit)){assert(t.y>t.r+2,t.id+' airborne');}
 // Air targets never enter a recon scan cylinder or hover over the runway strip (x -322..-278, z -480..280).
 for(const t of range.targets.filter(t=>t.type!=='plate')){const reach=t.orbit?t.orbit.radius+t.r:t.r,cx=t.orbit?t.orbit.x:t.x,cz=t.orbit?t.orbit.z:t.z;for(const g of RECON_TARGETS)assert(Math.hypot(cx-g.x,cz-g.z)-reach>RECON.radius,t.id+' outside recon cylinder '+g.id);assert(cx+reach<-322-15||cx-reach>-278+15||cz-reach>280||cz+reach<-480,t.id+' clear of runway');}
 const ids=new Set(range.targets.map(t=>t.id));assert.equal(ids.size,range.targets.length,'unique ids');
}
// Range: damage, kill, respawn, orbit movement, flash decay, paused/invalid dt.
{
 const range=createRange(),plate=range.targets.find(t=>t.id==='plate-n1');
 assert.equal(damageTarget(range,plate,10),false);assert.equal(plate.hp,14);assert.equal(range.hits,1);assert.equal(damageTarget(range,plate,14),true);assert.equal(range.kills,1);assert.equal(plate.alive,false);
 assert.equal(damageTarget(range,plate,99),false,'dead target ignores damage');assert.equal(range.hits,2);
 for(let i=0;i<plate.respawn*60-1;i++)stepRange(range,1/60);assert.equal(plate.alive,false);stepRange(range,1/60);stepRange(range,1/60);assert(plate.alive);assert.equal(plate.hp,plate.maxHp);
 const drone=range.targets.find(t=>t.id==='drone-low-0'),start={x:drone.x,z:drone.z};for(let i=0;i<60;i++)stepRange(range,1/60);assert(Math.hypot(drone.x-start.x,drone.z-start.z)>5,'drone orbits');assert(Math.abs(Math.hypot(drone.x,drone.z)-70)<1e-6,'stays on its circle');
 const snap=JSON.stringify(range);stepRange(range,NaN);stepRange(range,0);stepRange(range,-1);assert.equal(JSON.stringify(range),snap);
}
// Hitscan picks the closest live target, respects range, obstacle occlusion and ground.
{
 const range=createRange();const plate=range.targets.find(t=>t.id==='plate-n1');
 const origin={x:plate.x,y:1.5,z:plate.z+30};const shot=hitscan(origin,{x:0,y:0,z:-1},150,range,boxes);assert.equal(shot.target,plate);assert(Math.abs(shot.distance-(30-plate.r))<1e-9);
 assert.equal(hitscan(origin,{x:0,y:0,z:-1},20,range,boxes).target,null,'out of range');
 const wallShot=hitscan(origin,{x:0,y:0,z:-1},150,range,[{minX:plate.x-3,maxX:plate.x+3,minZ:plate.z+10,maxZ:plate.z+11,h:4}]);assert.equal(wallShot.target,null);assert(wallShot.blocked);assert(Math.abs(wallShot.distance-19)<1e-9);
 const overWall=hitscan(origin,{x:0,y:0,z:-1},150,range,[{minX:plate.x-3,maxX:plate.x+3,minZ:plate.z+10,maxZ:plate.z+11,h:1}]);assert.equal(overWall.target,plate,'low wall does not block a 1.5 m shot');
 const dirt=hitscan({x:0,y:2,z:0},{x:0,y:-.7071,z:-.7071},150,range,[]);assert(dirt.blocked);assert(Math.abs(dirt.point.y)<1e-9,'ground stops the ray');
 // A real building between rover and plate on the proving ground: TEST_OBSTACLES[0] at (-141,108) 25x34x8
 const behind=hitscan({x:-141,y:2,z:150},{x:0,y:0,z:-1},150,range,boxes);assert(behind.blocked);assert(behind.distance<30);
}
// Roof gun: gunner seat gating, belt, interval, reload, tracer effects, kills and stats; deterministic aim.
{
 const range=createRange(),w=createWeaponState('roof'),rover=createRover({x:-120,z:10,yaw:0});
 assert.equal(stepRoofGun(w,rover,{fire:true},1/120,range,boxes,{random:fixed}),null,'driver seat cannot fire');
 enterGunner(w,rover);assert(w.gunner);assert.equal(w.aimYaw,rover.yaw);
 const plate=range.targets.find(t=>t.id==='plate-n1');const m=roofMuzzle(w,rover);assert.equal(m.y,ROOF_GUN.mountHeight);
 const yaw=Math.atan2(plate.x-m.x,-(plate.z-m.z)),pitch=Math.atan2(plate.y-m.y,Math.hypot(plate.x-m.x,plate.z-m.z));aimTurret(w,yaw-w.aimYaw,pitch);
 const first=stepRoofGun(w,rover,{fire:true},1/120,range,boxes,{random:fixed});assert.equal(first.target,plate);assert.equal(w.ammo,ROOF_GUN.belt-1);assert.equal(w.effects.at(-1).kind,'tracer');assert(w.effects.at(-1).hit);
 assert.equal(stepRoofGun(w,rover,{fire:true},1/120,range,boxes,{random:fixed}),null,'cooldown between rounds');
 let shots=1;for(let i=0;i<120*3;i++){if(stepRoofGun(w,rover,{fire:true},1/120,range,boxes,{random:fixed}))shots++;}
 assert(shots>=4,'sustained fire at interval');assert.equal(w.shots,shots);assert(w.kills>=1,'plate destroyed');assert(w.hits>=4);assert.equal(range.shots,w.shots);
 const emptyW=createWeaponState('roof');enterGunner(emptyW,rover);emptyW.ammo=1;stepRoofGun(emptyW,rover,{fire:true},1/120,range,boxes,{random:fixed});assert.equal(emptyW.ammo,0);
 stepRoofGun(emptyW,rover,{fire:true},1/120,range,boxes,{random:fixed});assert.equal(emptyW.reload,ROOF_GUN.reload,'empty belt starts reload');assert(weaponSummary(emptyW).reloading);
 for(let i=0;i<ROOF_GUN.reload*120+2;i++)stepRoofGun(emptyW,rover,{fire:false},1/120,range,boxes);assert.equal(emptyW.ammo,ROOF_GUN.belt);assert.equal(emptyW.reload,0);
 const snap=JSON.stringify(w);stepRoofGun(w,rover,{fire:true},1/120,range,boxes,{paused:true});stepRoofGun(w,rover,{fire:true},NaN,range,boxes);assert.equal(JSON.stringify(w),snap);
 assert(aimTurret(w,0,10)===undefined&&w.aimPitch===ROOF_GUN.pitchMax);aimTurret(w,0,-10);assert.equal(w.aimPitch,ROOF_GUN.pitchMin);
 leaveGunner(w);assert(!w.gunner);assert.equal(stepRoofGun(w,rover,{fire:true},1/120,range,boxes,{random:fixed}),null);
}
// Gunner cruise: rover holds speed for 3 s then coasts; gunner input is never steering.
{
 const w=createWeaponState('roof'),rover=createRover({x:0,z:0,yaw:0}),empty=new CollisionGrid([],24,10000);
 for(let i=0;i<360;i++)stepRover(rover,{throttle:1},1/60,empty);const cruising=rover.speed;assert(cruising>20);
 enterGunner(w,rover);assert.equal(w.cruiseSpeed,cruising);
 for(let i=0;i<180;i++){const input=gunnerDriveInput(w,rover,1/60);assert.equal(input.steer,0);stepRover(rover,input,1/60,empty);}
 assert(Math.abs(rover.speed-cruising)<1.5,'held speed during cruise window');assert.equal(w.cruise,0);
 for(let i=0;i<300;i++)stepRover(rover,gunnerDriveInput(w,rover,1/60),1/60,empty);assert(rover.speed<cruising*.5,'coasts down after the window');
 assert(Math.abs(rover.x)<1e-6,'no steering drift');
 const stopped=createWeaponState('roof'),parked=createRover({x:0,z:0,yaw:0});enterGunner(stopped,parked);assert.deepEqual(gunnerDriveInput(stopped,parked,1/60),{throttle:0,steer:0,brake:false},'stopped rover stays stopped');
 leaveGunner(w);assert.equal(gunnerDriveInput(w,rover,1/60),null);
}
// Plane gun and rockets: only airborne/uncrashed plane fires; rockets fly, drop, splash, and rearm at hangar.
{
 const range=createRange(),w=createWeaponState('plane'),plane=createPlane();assert.equal(w.rockets,ROCKET.count);
 const balloon=range.targets.find(t=>t.id==='balloon-1');
 Object.assign(plane,{x:balloon.x,z:balloon.z+120,y:balloon.y,yaw:0,pitch:0,onGround:false,speed:40});
 const shot=stepPlaneGun(w,plane,{fire:true},1/120,range,boxes,{random:fixed});assert.equal(shot.target,balloon);assert.equal(w.ammo,PLANE_GUN.belt-1);
 const m=planeMuzzle(plane);assert(m.z<plane.z&&m.y<plane.y,'muzzle ahead and slightly below');
 assert.equal(stepPlaneGun(w,plane,{rocket:true},1/120,range,boxes,{random:fixed}),null);assert.equal(w.rockets,1);assert.equal(w.projectiles.length,1);assert.equal(w.rocketShots,1);
 stepPlaneGun(w,plane,{rocket:true},1/120,range,boxes,{random:fixed});assert.equal(w.rockets,1,'rocket interval');
 let exploded=false;for(let i=0;i<120*3&&!exploded;i++){stepPlaneGun(w,plane,{},1/120,range,boxes,{random:fixed});exploded=w.projectiles.length===0;}
 assert(exploded);assert(w.effects.some(e=>e.kind==='blast'));assert.equal(balloon.alive,false,'rocket splash finishes the balloon');assert(w.kills>=1);
 for(let i=0;i<ROCKET.interval*120+2;i++)stepPlaneGun(w,plane,{},1/120,range,boxes);stepPlaneGun(w,plane,{rocket:true},1/120,range,boxes);assert.equal(w.rockets,0);stepPlaneGun(w,plane,{rocket:true},1/120,range,boxes);assert.equal(w.rockets,0,'no rockets left');
 plane.crashed=true;assert.equal(stepPlaneGun(w,plane,{fire:true},1/120,range,boxes,{random:fixed}),null,'crashed plane cannot fire');plane.crashed=false;
 // Rearm at hangar berth only when parked; refills belt and rockets after rearmSeconds.
 w.ammo=3;Object.assign(plane,{x:-300,z:220,y:1.3,onGround:true,speed:0});
 let done=false;for(let i=0;i<ROCKET.rearmSeconds*120+3&&!done;i++)done=stepRearm(w,plane,1/120,REPAIR_STATIONS.plane);assert(done);assert.equal(w.rockets,ROCKET.count);assert.equal(w.ammo,PLANE_GUN.belt);
 assert.equal(stepRearm(w,plane,1,REPAIR_STATIONS.plane),false,'already full');plane.speed=5;w.ammo=1;for(let i=0;i<1200;i++)stepRearm(w,plane,1/120,REPAIR_STATIONS.plane);assert.equal(w.ammo,1,'moving plane never rearms');
 const roof=createWeaponState('roof');roof.ammo=0;roof.reload=1;const rover=createRover();let r=false;for(let i=0;i<ROCKET.rearmSeconds*60+3&&!r;i++)r=stepRearm(roof,rover,1/60,REPAIR_STATIONS.rover);assert(r);assert.equal(roof.ammo,ROOF_GUN.belt);assert.equal(roof.reload,0,'rearm cancels pending reload');
}
// Rocket flight is frame-rate consistent and hits the ground or drops with gravity.
{
 for(const hz of [30,60,120,144]){
  const range=createRange(),w=createWeaponState('plane'),plane=createPlane();Object.assign(plane,{x:0,z:0,y:60,yaw:0,pitch:-.2,onGround:false,speed:40});
  stepPlaneGun(w,plane,{rocket:true},1/hz,range,[],{random:fixed});let steps=0;while(w.projectiles.length&&steps<hz*4){stepPlaneGun(w,plane,{},1/hz,range,[],{random:fixed});steps++;}
  const blast=w.effects.find(e=>e.kind==='blast');assert(blast,'rocket hits ground at '+hz+'Hz');assert(Math.abs(blast.at.y)<1e-6);assert(blast.at.z<-320&&blast.at.z>-345,'impact distance in a consistent band at '+hz+'Hz: '+blast.at.z);
 }
}
// Summaries and nearest target
{
 const range=createRange(),w=createWeaponState('roof');const s=weaponSummary(w);assert.deepEqual([s.ammo,s.belt,s.reloading,s.rockets,s.accuracy,s.gunner],[ROOF_GUN.belt,ROOF_GUN.belt,false,0,0,false]);
 const rs=rangeSummary(range);assert.equal(rs.alive,rs.total);assert.equal(rs.kills,0);
 const near=nearestTarget(range,{x:-120,y:1.5,z:-40},50);assert.equal(near.target.id,'plate-n1');assert.equal(nearestTarget(range,{x:-120,y:1.5,z:-40},50,'balloon'),null);
}
console.log('PASS: ray primitives, target layout clear of routes/berths/obstacles, range damage/kill/respawn/orbit, occlusion by walls and ground, roof gun gunner gating/belt/reload/interval/tracers, gunner cruise then coast, plane cannon and rockets with splash/gravity/rearm at hangar, rocket frame-rate band, summaries');
