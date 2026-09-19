// Helicopter inside the sea/land/air vehicle field: site adapter (ground heights, water, buildings, lighthouse tower),
// spawn pads, boarding / exit gates and the key mapping used by vehicle-app.js. Pure rules; the flight model is helicopter-rules.js.
import {HELICOPTER,createHelicopter,helicopterSpeed} from './helicopter-rules.js';
import {FIELD,FIELD_BUILDINGS,LIGHTHOUSE_ISLAND,footHeight,isFootSurface} from './maritime-rules.js';
import {terrainHeight} from './vehicle-rules.js';
import {ISLAND_HELIPAD,SHORE_HELIPAD} from './lighthouse-mission.js';
export {ISLAND_HELIPAD,SHORE_HELIPAD};
const onIsland=(x,z)=>Math.hypot(x-LIGHTHOUSE_ISLAND.x,z-LIGHTHOUSE_ISLAND.z)<=LIGHTHOUSE_ISLAND.r*.78;
export const fieldGround=(x,z)=>onIsland(x,z)?LIGHTHOUSE_ISLAND.h:Math.max(0,terrainHeight(x,z),footHeight(x,z));
const towerBox=(()=>{const i=LIGHTHOUSE_ISLAND;return {id:'lighthouse',minX:i.x-3.4,maxX:i.x+3.4,minZ:i.z-3.4,maxZ:i.z+3.4,minY:0,maxY:i.h+19};})();
export const FIELD_HELI_SITE=Object.freeze({
 bounds:FIELD.bounds,ceiling:FIELD.ceiling,
 obstacles:Object.freeze([...FIELD_BUILDINGS.map((b,i)=>({id:'building-'+i,minX:b.minX,maxX:b.maxX,minZ:b.minZ,maxZ:b.maxZ,minY:0,maxY:b.h})),towerBox]),
 ground:fieldGround,
 // Touching down on open water is a loss of the airframe; land, docks, piers and the island are fine.
 forbidden:(x,z)=>x>FIELD.coast&&!isFootSurface(x,z,.5)&&!onIsland(x,z)?'落水：直升机只能在陆地、码头或灯塔岛着陆':null
});
export const HELI_PADS=Object.freeze({island:ISLAND_HELIPAD,shore:SHORE_HELIPAD});
export function createFieldHelicopter(pad=SHORE_HELIPAD,yaw=Math.PI){const s=createHelicopter({x:pad.x,y:pad.y,z:pad.z});s.yaw=yaw;s.speed=0;return s;}
export function parkHelicopter(s,pad=SHORE_HELIPAD,yaw=Math.PI){Object.assign(s,createFieldHelicopter(pad,yaw));return s;}
export const helicopterStopped=s=>s.grounded&&!s.powered&&s.rpm<=.08&&helicopterSpeed(s)<=.15&&Math.abs(s.pitch)<.04&&Math.abs(s.roll)<.04;
export const HELI_DOOR=Object.freeze({offset:3.3,reach:2.2});
export function helicopterDoorPoints(s){const c=Math.cos(s.yaw),n=Math.sin(s.yaw);return [1,-1].map(side=>({x:s.x+side*HELI_DOOR.offset*c,z:s.z+side*HELI_DOOR.offset*n}));}
// Board: standing next to either door of a stopped, unpowered craft. Boarding never starts the engine.
export function canBoardHelicopter(player,s,footWorld){
 if(!player||!s||s.status==='crashed'||!helicopterStopped(s))return false;
 return helicopterDoorPoints(s).some(d=>Math.hypot(player.x-d.x,player.z-d.z)<=HELI_DOOR.reach&&footWorld.free(d.x,d.z,.4));
}
export function helicopterExit(s,footWorld){
 if(s.status==='crashed')return {ok:false,reason:'机体损坏；请使用试验调度回收。'};
 if(!s.grounded)return {ok:false,reason:'空中不能离机，先在陆地平稳着陆。'};
 if(s.powered||s.rpm>.08)return {ok:false,reason:'先按 I 熄火并等待旋翼停转。'};
 const door=helicopterDoorPoints(s).find(d=>footWorld.free(d.x,d.z,.4));
 return door?{ok:true,x:door.x,z:door.z}:{ok:false,reason:'两侧舱门都没有可站立的地面。'};
}
// Parked airframe footprint for walkers and ground vehicles: fuselage (nose → cabin → tail boom) plus the two skids.
// Only a grounded craft blocks; in the air it is above everyone, and a crashed hulk keeps blocking where it lies.
export const HELI_BODY=Object.freeze({fuselage:Object.freeze([[0,4.2],[0,2.8],[0,1.4],[0,0],[0,-1.6],[0,-3.1],[0,-4.6],[0,-5.9],[0,-7.2]]),fuselageRadius:1.5,skidOffset:1.3,skidRadius:.7,reach:9});
export function helicopterBodyPoints(s){
 const c=Math.cos(s.yaw),n=Math.sin(s.yaw);const at=(a,b)=>({x:s.x+c*a+n*b,z:s.z+n*a-c*b});
 return [...HELI_BODY.fuselage.map(([a,b])=>({...at(a,b),r:HELI_BODY.fuselageRadius})),
  ...[-1,1].flatMap(side=>[2.2,-1.8].map(b=>({...at(side*HELI_BODY.skidOffset,b),r:HELI_BODY.skidRadius})))];
}
export function helicopterBlocks(s,x,z,r=.4){
 if(!s||!s.grounded||Math.hypot(x-s.x,z-s.z)>HELI_BODY.reach+r)return false;
 return helicopterBodyPoints(s).some(p=>Math.hypot(x-p.x,z-p.z)<p.r+r);
}
// Key mapping: W/S pitch, A/D yaw, arrows strafe, Shift/Ctrl collective, Space brake-hover. Mouse look only orbits the camera.
export function helicopterInput(held){
 return {forward:Number(held('KeyW'))-Number(held('KeyS')),right:Number(held('ArrowRight'))-Number(held('ArrowLeft')),
  yaw:Number(held('KeyD'))-Number(held('KeyA')),lift:Number(held('ShiftLeft','ShiftRight'))-Number(held('ControlLeft','ControlRight')),brake:held('Space')};
}
export const HELICOPTER_HINT='直升机：I 启动 / 熄火 · Shift 拉起 · Ctrl 下降 · W/S 前后倾 · A/D 偏航 · ←/→ 横移 · 空格悬停刹车 · 只能在陆地、码头、灯塔岛着陆';
export function helicopterStatusLabel(s){
 if(s.status==='crashed')return '损坏 · '+s.reason;
 if(!s.powered)return s.rpm>.08?'旋翼停转中 '+Math.round(s.rpm*100)+'%':'冷机 · I 启动';
 return (s.grounded?'地面 · 转速 ':'空中 · 高度 '+Math.max(0,s.y-fieldGround(s.x,s.z)).toFixed(1)+' m · 转速 ')+Math.round(s.rpm*100)+'%'+(s.vy>.2?' ↑':s.vy<-.2?' ↓':'');
}
export {HELICOPTER};
