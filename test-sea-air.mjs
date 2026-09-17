import assert from 'node:assert/strict';
import {CollisionGrid,createDriveTrial} from './vehicle-rules.js';
import {YACHT,createYacht,stepYacht,yachtFree,yachtExit,canBoardYacht,waterFree,landSurface,isFootSurface,FIELD_BUILDINGS,routeStep,WATER_GATES} from './maritime-rules.js';
import {createPlane,stepPlane,planeClear,planeExit,canBoardPlane,FLIGHT_GATES} from './flight-rules.js';
const grid=new CollisionGrid(FIELD_BUILDINGS,24,600),foot={geometry:grid,free:(x,z,r)=>isFootSurface(x,z,r)&&grid.free(x,z,r)};
assert(isFootSurface(100,0));assert(!isFootSurface(230,0));assert(isFootSurface(260,180));assert(!waterFree(260,180));assert(!landSurface(230,0));assert(waterFree(300,0));
const boat=createYacht();assert(yachtFree(boat));assert(canBoardYacht({x:272,z:180},boat,foot));assert(yachtExit(boat,foot).ok);boat.speed=3;assert(!yachtExit(boat,foot).ok);boat.speed=0;
const oldBoat=JSON.stringify(boat);stepYacht(boat,{paused:true,throttle:1},.1);assert.equal(JSON.stringify(boat),oldBoat);
const sea=createYacht();Object.assign(sea,{x:350,z:300});for(let i=0;i<600;i++)stepYacht(sea,{throttle:1},1/60);assert(sea.speed>25&&sea.speed<=YACHT.maxSpeed);assert(!yachtExit(sea,foot).ok,'cannot step onto water');for(let i=0;i<300;i++)stepYacht(sea,{brake:true},1/60);assert.equal(sea.speed,0);for(let i=0;i<120;i++)stepYacht(sea,{throttle:-1},1/60);assert(sea.speed<0&&sea.speed>=-YACHT.reverseSpeed);
const shore={...createYacht(),x:245,z:30,yaw:-Math.PI/2,speed:13};for(let i=0;i<10;i++)stepYacht(shore,{throttle:1},.25);assert(yachtFree(shore));assert(shore.impacts>0);assert(shore.x>220);
const yaw=boat.yaw;for(let i=0;i<100;i++)stepYacht(boat,{steer:1},1/60);assert.equal(boat.yaw,yaw,'boat cannot pivot without water flow');
const plane=createPlane();assert(planeClear(plane,FIELD_BUILDINGS));assert(canBoardPlane({x:-308.5,z:220},plane,foot));assert(planeExit(plane,foot).ok);
const saved=JSON.stringify(plane);stepPlane(plane,{paused:true,throttle:1},.1);stepPlane(plane,{},NaN);assert.equal(JSON.stringify(plane),saved);
for(let i=0;i<7*120;i++)stepPlane(plane,{throttle:1,elevator:.35},1/120,FIELD_BUILDINGS);
assert(!plane.onGround&&!plane.crashed&&plane.y>10,'takeoff uses acceleration and elevator');assert(!planeExit(plane,foot).ok,'no airborne exit');
const beforeYaw=plane.yaw;for(let i=0;i<120;i++)stepPlane(plane,{roll:1},1/120,FIELD_BUILDINGS);assert(plane.yaw>beforeYaw);assert(plane.roll>.4);
const landing={...createPlane(),x:-300,z:100,y:8,onGround:false,speed:32,pitch:-.12,throttle:.1};for(let i=0;i<5*120&&!landing.onGround&&!landing.crashed;i++)stepPlane(landing,{elevator:-.08},1/120,FIELD_BUILDINGS);assert(landing.onGround&&!landing.crashed);assert.equal(landing.landings,1);for(let i=0;i<240;i++)stepPlane(landing,{brake:true,throttle:-1},1/120,FIELD_BUILDINGS);assert.equal(landing.speed,0);assert(planeExit(landing,foot).ok);
for(const scenario of [{x:300,y:2,pitch:-.12,speed:32},{x:-300,y:2,pitch:-.45,speed:45}]){const p={...createPlane(),...scenario,onGround:false};for(let i=0;i<120&&!p.crashed;i++)stepPlane(p,{},1/120);assert(p.crashed,'water landing and hard landing reject safely');assert(!planeExit(p,foot).ok);}
const stall={...createPlane(),x:0,z:0,y:100,onGround:false,speed:8};stepPlane(stall,{},.25);assert(stall.stall&&stall.verticalSpeed<0&&stall.y<100);
const wall={...createPlane(),x:0,z:0,speed:60};stepPlane(wall,{},.25,[{minX:-20,maxX:20,minZ:-8.02,maxZ:-8,h:20}]);assert(wall.crashed&&wall.z>-8,'thin obstacle sweep cannot be crossed');
const limit={...createPlane(),x:598,z:0,y:50,onGround:false,speed:40};stepPlane(limit,{},.1);assert(limit.crashed,'out-of-range wingtip stops test');
const ceiling={...createPlane(),y:300,onGround:false,pitch:.5,speed:50};stepPlane(ceiling,{},.1);assert(ceiling.y<=300.01);
const air=createDriveTrial(),g=FLIGHT_GATES[0];routeStep(air,FLIGHT_GATES,{x:g.x,y:0,z:g.z},{x:g.x,y:0,z:g.z},.1,true,23,true);assert.equal(air.index,0,'ground position does not count as airborne ring');routeStep(air,FLIGHT_GATES,{...g,z:g.z+30},{...g,z:g.z-30},.1,true,23,true);assert.equal(air.index,1);
const sail=createYacht(),route=createDriveTrial();for(let i=0;i<120*240&&!route.complete;i++){
 const g=WATER_GATES[route.index],wanted=Math.atan2(g.x-sail.x,-(g.z-sail.z)),delta=Math.atan2(Math.sin(wanted-sail.yaw),Math.cos(wanted-sail.yaw)),target=Math.abs(delta)>.4?6:11;
 const from={...sail};stepYacht(sail,{steer:Math.max(-1,Math.min(1,delta*2)),throttle:sail.speed<target?1:0,brake:sail.speed>target+1},1/120);assert(yachtFree(sail));routeStep(route,WATER_GATES,from,sail,1/120,true,15);
}assert(route.complete,'entire sea route reachable with real controller');assert.equal(sail.impacts,0);
console.log('PASS: shared coast/dock boundaries, yacht acceleration/reverse/brake/shore collision/safe mooring, full sea route; fixed-wing takeoff/banking/landing/stall/ceiling/crash/bounds, no airborne exit, altitude-aware navigation and pause');
// Full airborne course: controller inputs only, no position injection or collision bypass.
const flyer=createPlane(),flightRoute=createDriveTrial();
for(let i=0;i<120*180&&!flightRoute.complete&&!flyer.crashed;i++){
 const g=FLIGHT_GATES[flightRoute.index],wanted=Math.atan2(g.x-flyer.x,-(g.z-flyer.z)),angle=Math.atan2(Math.sin(wanted-flyer.yaw),Math.cos(wanted-flyer.yaw));
 const throttle=flyer.onGround?1:.24,pitch=Math.max(-.16,Math.min(.18,(g.y-flyer.y)*.015)),before={...flyer};
 stepPlane(flyer,{throttle:Math.max(-1,Math.min(1,(throttle-flyer.throttle)*4)),elevator:flyer.onGround?.5:Math.max(-1,Math.min(1,(pitch-flyer.pitch)*4+.64*flyer.pitch)),roll:Math.max(-1,Math.min(1,angle*2))},1/120,FIELD_BUILDINGS);
 routeStep(flightRoute,FLIGHT_GATES,before,flyer,1/120,!flyer.onGround,23,true);
}assert(flightRoute.complete&&!flyer.crashed,'full airborne course reachable with the actual controller');assert.equal(flyer.impacts,0);
console.log('PASS: full fixed-wing takeoff and all five altitude-aware flight gates, no teleportation/collision bypass');
