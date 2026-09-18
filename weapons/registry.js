import railspike from './railspike.js';
import halo from './halo.js';
import tempest from './tempest.js';
import vanguard from './vanguard.js';
import breacher from './breacher.js';
import ghost from './ghost.js';
import arcBlade from './arc-blade.js';
import {validateWeaponDefinitions} from './schema.js';

export const WEAPON_DEFINITIONS=Object.freeze([vanguard,breacher,ghost,arcBlade,tempest,halo,railspike]);
validateWeaponDefinitions(WEAPON_DEFINITIONS);
const byId=new Map(WEAPON_DEFINITIONS.map(definition=>[definition.id,definition]));
// Explicit order is a compatibility contract, not the order of imported files.
export const LEGACY_WEAPON_IDS=Object.freeze(['vanguard','breacher','ghost','arc-blade']);
for(const [index,id] of LEGACY_WEAPON_IDS.entries()){
 if(byId.get(id)?.legacyIndex!==index)throw new TypeError(`Legacy weapon slot mismatch: ${id}`);
}
export function getWeaponDefinition(id){return byId.get(id)||null;}
export function getWeaponId(index){return Number.isInteger(index)?LEGACY_WEAPON_IDS[index]||null:null;}
export function getWeaponIndex(id){return LEGACY_WEAPON_IDS.indexOf(id);}
// A future attachment/loadout can modify its own copy without altering defaults.
// Unknown identifiers never silently turn into a different weapon.
export function createWeaponProfile(id){const definition=getWeaponDefinition(id);return definition?{...definition.combat}:null;}
// Keep the original mutable array/profile shape for all existing consumers.
// Do not add metadata to save snapshots, merge ammo pools, or change loadouts here.
export const WEAPONS=LEGACY_WEAPON_IDS.map(createWeaponProfile);
