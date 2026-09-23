import assert from 'node:assert/strict';
import {ESCORT_PROFILES,normalizeEscort,TRUCK,HOUND,ESCORT_ROUTE,AMBUSHES,ESCORT_START,createEscort,stepEscort,escortGoal,aliveHounds,truckBlocks,escortFollowInput,houndWarnings,escortSummary} from '../src/escort-rules.js';
import {createRover,stepRover,CollisionGrid,ROVER,forward} from '../src/vehicle-rules.js';
import {collisionBoxes} from '../src/vehicle-world.js';
import {createDurability,limitInput,clampSpeed} from '../src/vehicle-durability.js';
import {createRange,hitscan,damageTarget,createWeaponState,enterGunner,aimTurret,stepRoofGun,roofMuzzle} from '../src/vehicle-weapons.js';
import {FIELD_BUILDINGS,FIELD,landSurface} from '../src/maritime-rules.js';
const grid=new CollisionGrid([...collisionBoxes(),...FIELD_BUILDINGS],24,FIELD.bounds),free=(x,z,r)=>landSurface(x,z,r)&&grid.free(x,z,r);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Layout sanity: route and spawns are drivable and outside obstacles; ambush triggers sit on the route.
{
 for(const g of ESCORT_ROUTE)assert(grid.free(g.x,g.z,TRUCK.radius+.5),g.name+' drivable');
 for(const a of AMBUSHES){for(const s of a.spawns)assert(grid.free(s.x,s.z,HOUND.radius+.3),a.id+' spawn clear');assert(ESCORT_ROUTE.some((g,i)=>i>0&&pointToSegment(a.trigger,ESCORT_ROUTE[i-1],g)<5),a.id+' trigger on route');}
 assert(grid.free(ESCORT_START.truck.x,ESCORT_START.truck.z,TRUCK.radius));assert(grid.free(ESCORT_START.rover.x,ESCORT_START.rover.z,ROVER.radius));
 assert.equal(normalizeEscort('nope'),'normal');assert.equal(ESCORT_PROFILES.hard.waves.reduce((a,b)=>a+b),10);
}
function pointToSegment(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
// Idle mission does nothing; truck blocks nothing while idle.
{
 const m=createEscort('normal');const rover=createRover(),wear=createDurability('rover');const snap=JSON.stringify(m);
 assert.equal(stepEscort(m,{rover,wear},1/60),null);assert.equal(JSON.stringify(m),snap);assert(!truckBlocks(m,m.truck.x,m.truck.z,1));
 const a=createEscort('normal',true);assert.equal(stepEscort(a,{rover,wear,paused:true},1/60),null);assert.equal(stepEscort(a,{rover,wear},NaN),null);
 assert(truckBlocks(a,a.truck.x,a.truck.z,1));assert(!truckBlocks(a,a.truck.x+8,a.truck.z,1));
}
// Truck waits when the escort falls behind, resumes when it catches up.
{
 const m=createEscort('normal',true),wear=createDurability('rover');const rover=createRover({x:m.truck.x+3,z:m.truck.z+200,yaw:0});
 for(let i=0;i<600;i++)stepEscort(m,{rover,wear,free},1/60);
 assert(m.truck.waiting,'truck waits for a distant escort');assert(m.truck.speed<.5);assert(m.truck.distance<TRUCK.waitDistance+20,'stopped shortly after passing wait distance');
 Object.assign(rover,{x:m.truck.x,z:m.truck.z+8});for(let i=0;i<120;i++)stepEscort(m,{rover,wear,free},1/60);assert(!m.truck.waiting);assert(m.truck.speed>5);
}
// Hound behaviour: approach -> telegraph with a locked line -> lunge -> hit -> recover; lock never moves during telegraph.
{
 const m=createEscort('normal',true),wear=createDurability('rover');const rover=createRover({x:0,z:0,yaw:0});rover.speed=0;
 Object.assign(m.truck,{x:0,z:-400,index:4});// truck far away so the hound picks the rover
 m.hounds.push({id:1,type:'hound',x:0,y:1,z:40,yaw:0,r:HOUND.radius,hp:30,maxHp:30,alive:true,flash:0,respawn:Infinity,respawnIn:Infinity,mode:'approach',timer:0,lock:null,target:null,speed:0,hit:false});
 const h=m.hounds[0];let t=0;while(h.mode==='approach'&&t<10){stepEscort(m,{rover,wear},1/60);t+=1/60;}
 assert.equal(h.mode,'telegraph');assert.equal(h.target,'rover');const lock={...h.lock};assert.deepEqual(lock,{x:0,z:0},'stationary target: lock on its position');assert.equal(houndWarnings(m).length,1);
 const hullBefore=wear.hull;while(h.mode==='telegraph'){stepEscort(m,{rover,wear},1/60);if(h.mode==='telegraph')assert.deepEqual(h.lock,lock,'lock frozen');}
 assert.equal(wear.hull,hullBefore,'telegraph deals no damage');assert.equal(h.mode,'lunge');
 while(h.mode==='lunge')stepEscort(m,{rover,wear},1/60);
 assert.equal(m.roverHits,1);assert.equal(wear.hull,hullBefore-m.profile.roverDamage,'exactly one hit per lunge');assert.equal(h.mode,'recover');
 while(h.mode==='recover')stepEscort(m,{rover,wear},1/60);assert.equal(h.mode,'approach');assert.equal(m.roverHits,1);
}
// Sidestep: a rover that moves off the locked line during the telegraph is not hit.
{
 const m=createEscort('normal',true),wear=createDurability('rover');const rover=createRover({x:0,z:0,yaw:0});Object.assign(m.truck,{x:0,z:-400,index:4});
 m.hounds.push({id:1,type:'hound',x:0,y:1,z:HOUND.engageRange-1,yaw:0,r:HOUND.radius,hp:30,maxHp:30,alive:true,flash:0,respawn:Infinity,respawnIn:Infinity,mode:'approach',timer:0,lock:null,target:null,speed:0,hit:false});
 const h=m.hounds[0];stepEscort(m,{rover,wear},1/60);assert.equal(h.mode,'telegraph');
 rover.x=9;// dodge sideways well outside hit radius
 for(let i=0;i<300&&h.mode!=='recover';i++)stepEscort(m,{rover,wear},1/60);
 assert.equal(m.roverHits,0,'dodged lunge misses');assert.equal(wear.hull,100);
}
// Truck damage and loss; rover write-off loss.
{
 const m=createEscort('hard',true),wear=createDurability('rover');const rover=createRover({x:500,z:500,yaw:0});
 for(let n=0;n<8;n++)m.hounds.push({id:n+1,type:'hound',x:m.truck.x,y:1,z:m.truck.z-10-n,yaw:0,r:HOUND.radius,hp:36,maxHp:36,alive:true,flash:0,respawn:Infinity,respawnIn:Infinity,mode:'approach',timer:0,lock:null,target:null,speed:0,hit:false});
 let steps=0;while(m.status==='active'&&steps<60*60){stepEscort(m,{rover,wear},1/60);steps++;}
 assert.equal(m.status,'lost');assert.equal(m.reason,'运输卡车被摧毁');assert.equal(m.truck.hull,0);assert(m.truckHits>=Math.ceil(100/m.profile.truckDamage));
 const w2=createEscort('normal',true),wear2=createDurability('rover');wear2.hull=1;const rover2=createRover();applyOneRoverHit(w2,rover2,wear2);assert.equal(w2.status,'lost');assert(w2.reason.includes('报废'));
}
function applyOneRoverHit(m,rover,wear){Object.assign(m.truck,{x:0,z:-400,index:4});Object.assign(rover,{x:0,z:0,yaw:0,speed:0});m.hounds.push({id:9,type:'hound',x:0,y:1,z:HOUND.engageRange-1,yaw:0,r:HOUND.radius,hp:30,maxHp:30,alive:true,flash:0,respawn:Infinity,respawnIn:Infinity,mode:'approach',timer:0,lock:null,target:null,speed:0,hit:false});for(let i=0;i<600&&m.status==='active';i++)stepEscort(m,{rover,wear},1/60);}
// Hounds are targets for the roof gun via the shared hitscan; killing all and arriving wins. Full mission run with follow autopilot at several frame rates.
{
 for(const hz of [30,60,120]){
  const m=createEscort('easy',true),wear=createDurability('rover'),rover=createRover(ESCORT_START.rover),gun=createWeaponState('roof'),range=createRange();enterGunner(gun,rover);
  const boxes=[];let steps=0,kills=0;
  while(m.status==='active'&&steps<hz*400){
   const dt=1/hz;const input=escortFollowInput(m,rover);stepRover(rover,limitInput(wear,input),dt,{free:(x,z,r)=>free(x,z,r)&&!truckBlocks(m,x,z,r)});clampSpeed(wear,rover,ROVER.maxSpeed,ROVER.reverseSpeed);
   stepEscort(m,{rover,wear,free},dt);
   // Perfect gunner: aim at nearest live hound and fire. Uses the same hitscan path as the app with hounds injected as targets.
   const live=aliveHounds(m).sort((a,b)=>dist(a,rover)-dist(b,rover))[0];
   if(live){const mz=roofMuzzle(gun,rover);const yaw=Math.atan2(live.x-mz.x,-(live.z-mz.z)),pitch=Math.atan2(live.y-mz.y,Math.hypot(live.x-mz.x,live.z-mz.z));aimTurret(gun,yaw-gun.aimYaw,pitch-gun.aimPitch);
    const combined={targets:[...range.targets,...m.hounds],shots:0,hits:0,kills:0};const shot=stepRoofGun(gun,rover,{fire:true},dt,combined,boxes,{random:()=>.5});if(shot?.target&&!shot.target.alive)kills++;}
   else stepRoofGun(gun,rover,{fire:false},dt,range,boxes);
   steps++;
  }
  assert.equal(m.status,'won','mission completes at '+hz+'Hz: '+m.reason+' truck='+m.truck.hull+' waves='+m.waves+' alive='+aliveHounds(m).length+' idx='+m.truck.index);
  assert.equal(m.killed,m.profile.waves.reduce((a,b)=>a+b));assert(m.waves.every(Boolean));assert(m.truck.hull>0);assert(rover.impacts<=3,'follow autopilot does not grind into the truck: '+rover.impacts);
  assert(m.hounds.every(h=>!h.alive&&h.respawnIn===Infinity),'hounds never respawn');
 }
}
// Summary and goal
{
 const m=createEscort('normal',true);const s=escortSummary(m);assert.equal(s.legs,5);assert.equal(s.total,8);assert.equal(s.legName,'离开车库');assert.equal(escortGoal(m),ESCORT_ROUTE[0]);m.truck.arrived=true;assert.equal(escortGoal(m),ESCORT_ROUTE.at(-1));
}
console.log('PASS: escort layout drivable, idle/paused guards, truck wait/resume, hound approach->frozen telegraph->single-hit lunge->recover, sidestep dodge, truck loss and rover write-off, full easy mission won with autopilot + roof gun at 30/60/120Hz, no respawn, summary');
