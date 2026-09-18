import volt from './volt.js';
import railspike from './railspike.js';
import halo from './halo.js';
import {WEAPONS,LEGACY_WEAPON_IDS,createWeaponProfile} from './registry.js';
import tempest from './tempest.js';
export const TEMPEST_INDEX=4;
export const RUNTIME_WEAPON_IDS=Object.freeze([...LEGACY_WEAPON_IDS,'tempest','halo','railspike','volt']);
export function createRuntimeWeapons(){return RUNTIME_WEAPON_IDS.map(createWeaponProfile);}
export function canSprintWithWeapon(weapon,{moving,aiming,firing,reload}){return !!moving&&!aiming&&!firing&&(reload<=0||weapon.sprintReload===true);}
export function validTempestState(value){
 if(value===undefined)return true;
 return !!value&&!Array.isArray(value)&&typeof value==='object'&&Number.isInteger(value.rounds)&&value.rounds>=0&&value.rounds<=tempest.combat.cap&&Number.isInteger(value.reserve)&&value.reserve>=0&&value.reserve<=tempest.combat.reserve&&typeof value.equipped==='boolean';
}
export function tempestCheckpoint(rounds,reserves,selected){return {tempest:{rounds:rounds[TEMPEST_INDEX],reserve:reserves[TEMPEST_INDEX],equipped:selected===TEMPEST_INDEX}};}
export function restoreRuntimeAmmo(snapshot){
 const extra=validTempestState(snapshot.tempest)?snapshot.tempest:undefined;const h=validHaloState(snapshot.halo)?snapshot.halo:undefined;const r=validRailspikeState(snapshot.railspike)?snapshot.railspike:undefined;const v=validVoltState(snapshot.volt)?snapshot.volt:undefined;
 return {rounds:[...snapshot.rounds,Infinity,extra?.rounds??tempest.combat.cap,h?.rounds??halo.combat.cap,r?.rounds??railspike.combat.cap,v?.rounds??volt.combat.cap],reserves:[...snapshot.reserves,Infinity,extra?.reserve??tempest.combat.reserve,h?.reserve??halo.combat.reserve,r?.reserve??railspike.combat.reserve,v?.reserve??volt.combat.reserve],selected:v?.equipped?7:r?.equipped?6:h?.equipped?5:extra?.equipped?TEMPEST_INDEX:snapshot.selected};
}
export function supplementTempestSupply(type,supply,previous){
 if(type!=='ammo')return supply;
 const reserves=[...supply.reserves];reserves[TEMPEST_INDEX]=Math.min(tempest.combat.reserve,reserves[TEMPEST_INDEX]+72);
 return {...supply,reserves,changed:supply.changed||reserves[TEMPEST_INDEX]!==previous[TEMPEST_INDEX]};
}
// Kept explicit so future runtime additions cannot silently alter old checkpoint arrays.
export function legacySelected(index){return index===TEMPEST_INDEX||index===5||index===6||index===7?0:index;}
export const LEGACY_AMMO_SLOTS=WEAPONS.length-1;

export function validHaloState(value){if(value===undefined)return true;return !!value&&!Array.isArray(value)&&typeof value==='object'&&Number.isInteger(value.rounds)&&value.rounds>=0&&value.rounds<=halo.combat.cap&&Number.isInteger(value.reserve)&&value.reserve>=0&&value.reserve<=halo.combat.reserve&&typeof value.equipped==='boolean';}
export function haloCheckpoint(rounds,reserves,selected){return {halo:{rounds:rounds[5],reserve:reserves[5],equipped:selected===5}};}
export function supplementHaloSupply(type,supply,previous){if(type!=='ammo')return supply;const reserves=[...supply.reserves];reserves[5]=Math.min(halo.combat.reserve,reserves[5]+48);return {...supply,reserves,changed:supply.changed||reserves[5]!==previous[5]};}

export function validRailspikeState(value){if(value===undefined)return true;return !!value&&!Array.isArray(value)&&typeof value==='object'&&Number.isInteger(value.rounds)&&value.rounds>=0&&value.rounds<=railspike.combat.cap&&Number.isInteger(value.reserve)&&value.reserve>=0&&value.reserve<=railspike.combat.reserve&&typeof value.equipped==='boolean';}
export function railspikeCheckpoint(rounds,reserves,selected){return {railspike:{rounds:rounds[6],reserve:reserves[6],equipped:selected===6}};}
export function supplementRailspikeSupply(type,supply,previous){if(type!=='ammo')return supply;const reserves=[...supply.reserves];reserves[6]=Math.min(railspike.combat.reserve,reserves[6]+6);return {...supply,reserves,changed:supply.changed||reserves[6]!==previous[6]};}

export function validVoltState(value){if(value===undefined)return true;return !!value&&!Array.isArray(value)&&typeof value==='object'&&Number.isInteger(value.rounds)&&value.rounds>=0&&value.rounds<=volt.combat.cap&&Number.isInteger(value.reserve)&&value.reserve>=0&&value.reserve<=volt.combat.reserve&&typeof value.equipped==='boolean';}
export function voltCheckpoint(rounds,reserves,selected){return {volt:{rounds:rounds[7],reserve:reserves[7],equipped:selected===7}};}
export function supplementVoltSupply(type,supply,previous){if(type!=='ammo')return supply;const reserves=[...supply.reserves];reserves[7]=Math.min(volt.combat.reserve,reserves[7]+12);return {...supply,reserves,changed:supply.changed||reserves[7]!==previous[7]};}
