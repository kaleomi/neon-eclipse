// Recoverable equipment changes the carry slot only, never the persistent ammunition inventory.
import {terminalInReach} from './loadout-rules.js';
const WEAPON_BY_ROLE=Object.freeze({assault:0,ranged:6,heavy:1,harborElite:7,engineer:4,commander:5});
export const DROP_CAPACITY=4;
export const DROP_CHANCE=.25;
export function droppedPrimary(enemy){return enemy&&!enemy.boss&&Number.isFinite(enemy.hp)&&enemy.hp<=0&&Object.hasOwn(WEAPON_BY_ROLE,enemy.type)?WEAPON_BY_ROLE[enemy.type]:null;}
export function nearestWeaponDrop(drops,camera,primary,visible){
 let result=null,best=Infinity;
 for(const d of drops){if(!d.active||d.primary===primary||!terminalInReach(camera,{x:d.x,z:d.z,feetY:d.y},{range:2.4}))continue;const distance=Math.hypot(d.x-camera.x,d.z-camera.z);if(distance<best&&visible(d)){best=distance;result=d;}}
 return result;
}

export function shouldDropWeapon(enemy,roll){return droppedPrimary(enemy)!==null&&Number.isFinite(roll)&&roll>=0&&roll<1&&roll<DROP_CHANCE;}
