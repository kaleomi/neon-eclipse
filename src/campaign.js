import {validTypedAmmoEnvelope} from './typed-ammo.js';
import {validWeaponModsEnvelope} from './weapon-mods-rules.js';
import {validTacticalEnvelope} from './tactical-rules.js';
import {validOrdnanceEnvelope} from './ordnance-rules.js';
import {validLoadoutEnvelope} from './loadout-rules.js';
import {validEmpState} from './emp-rules.js';
import {validTempestState,validHaloState,validRailspikeState,validVoltState} from '../weapons/runtime.js';
import {ORBITAL_ENTRIES} from './orbital-data.js';
import {POLAR_ENTRIES} from './polar-data.js';
import {DATACENTER_ENTRIES} from './datacenter-data.js';
import {HARBOR_ENTRIES} from './harbor-data.js';
import {TRAIN_ENTRIES} from './train-data.js';
import {TOWER_ENTRIES} from './tower-data.js';
import {ROOF_ENTRIES} from './roof-data.js';
import {IS_STATION,IS_ROOF,IS_TOWER,IS_TRAIN,IS_HARBOR,IS_ORBITAL,IS_DATACENTER,IS_POLAR} from './level.js';
import {STATION_ENTRIES} from './station-data.js';
import {STAGES,SUPPLIES} from './mission.js';
import {WEAPONS} from './combat.js';
export const SAVE_KEY=IS_POLAR?'neon-eclipse.polar.v1':IS_DATACENTER?'neon-eclipse.datacenter.v1':IS_ORBITAL?'neon-eclipse.orbital.v1':IS_HARBOR?'neon-eclipse.harbor.v1':IS_TRAIN?'neon-eclipse.train.v1':IS_TOWER?'neon-eclipse.tower.v1':IS_ROOF?'neon-eclipse.roof.v1':IS_STATION?'neon-eclipse.station.v1':'neon-eclipse.campaign.v1';
export const STAGE_ENTRIES=IS_POLAR?POLAR_ENTRIES:IS_DATACENTER?DATACENTER_ENTRIES:IS_ORBITAL?ORBITAL_ENTRIES:IS_HARBOR?HARBOR_ENTRIES:IS_TRAIN?TRAIN_ENTRIES:IS_TOWER?TOWER_ENTRIES:IS_ROOF?ROOF_ENTRIES:IS_STATION?STATION_ENTRIES:[{x:0,z:29},{x:-28,z:2.4},{x:28,z:2.4},{x:0,z:-8.6},{x:0,z:22}];
const number=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const integer=(v,min,max)=>Number.isInteger(v)&&number(v,min,max);
export function validCheckpoint(s,supplies=SUPPLIES){
 if(!s||typeof s!=='object'||!integer(s.stageIndex,0,4)||!number(s.health,1,100)||!integer(s.selected,0,3))return false;
 if(!number(s.x,-38,38)||!number(s.z,-38,38)||!number(s.yaw,-100000,100000)||!number(s.pitch,-1.45,1.45)||!number(s.time,0,86400)||!integer(s.kills,0,10000))return false;
 if(!validTypedAmmoEnvelope(s.typedAmmo)||!validWeaponModsEnvelope(s.weaponMods)||!validTacticalEnvelope(s.tactical)||!validOrdnanceEnvelope(s.ordnance)||!validEmpState(s.emp)||!validLoadoutEnvelope(s.loadout))return false;
 if(!validVoltState(s.volt)||s.volt?.equipped&&(s.selected!==0||s.tempest?.equipped||s.halo?.equipped||s.railspike?.equipped))return false;
 if(!validRailspikeState(s.railspike)||s.railspike?.equipped&&(s.selected!==0||s.tempest?.equipped||s.halo?.equipped))return false;
 if(!validHaloState(s.halo)||s.halo?.equipped&&(s.selected!==0||s.tempest?.equipped))return false;
 if(!validTempestState(s.tempest)||s.tempest?.equipped&&s.selected!==0)return false;
 if(s.trainTime!==undefined&&!number(s.trainTime,0,86400))return false;
 if(s.transportTrip!==undefined&&typeof s.transportTrip!=='boolean')return false;
 if(s.towerLiftTime!==undefined&&!number(s.towerLiftTime,0,86400))return false;
 if(s.waterTime!==undefined&&!number(s.waterTime,0,86400))return false;
 if(s.stormTime!==undefined&&!number(s.stormTime,0,86400))return false;
 if(s.warmth!==undefined&&!number(s.warmth,0,100))return false;
 if(s.transportTime!==undefined&&!number(s.transportTime,0,86400))return false;
 if(s.feetY!==undefined&&!number(s.feetY,0,12))return false;
 if(!Array.isArray(s.rounds)||s.rounds.length!==3||!Array.isArray(s.reserves)||s.reserves.length!==3)return false;
 for(let i=0;i<3;i++)if(!integer(s.rounds[i],0,WEAPONS[i].cap)||!integer(s.reserves[i],0,WEAPONS[i].reserve))return false;
 if(!Array.isArray(s.collected)||s.collected.length>supplies.length||new Set(s.collected).size!==s.collected.length||!s.collected.every(id=>supplies.some(p=>p.id===id)))return false;
 return true;
}
const fresh=()=>({version:1,unlocked:0,checkpoint:null,completed:false});
export function createCampaignStore(storage){
 let data=fresh(),persistent=true,target;
 try{
  target=storage===undefined?globalThis.localStorage:storage;
  if(!target)throw new Error('Storage unavailable');
  const text=target.getItem(SAVE_KEY);
  if(text&&text.length<16384){
   const parsed=JSON.parse(text);
   if(parsed.version===1&&integer(parsed.unlocked,0,4)&&(parsed.checkpoint===null||validCheckpoint(parsed.checkpoint))){
    data={version:1,unlocked:Math.max(parsed.unlocked,parsed.checkpoint?.stageIndex||0),checkpoint:parsed.checkpoint,completed:parsed.completed===true};
   }
  }
 }catch{persistent=false;}
 const copy=object=>JSON.parse(JSON.stringify(object));
 function write(){try{target.setItem(SAVE_KEY,JSON.stringify(data));persistent=true;return true;}catch{persistent=false;return false;}}
 function save(snapshot){if(!validCheckpoint(snapshot))return false;data.checkpoint=copy(snapshot);data.unlocked=Math.max(data.unlocked,snapshot.stageIndex);data.completed=false;return write();}
 function complete(){data.checkpoint=null;data.unlocked=STAGES.length-1;data.completed=true;return write();}
 return {save,complete,get checkpoint(){return data.checkpoint?copy(data.checkpoint):null;},get unlocked(){return data.unlocked;},get completed(){return data.completed;},get persistent(){return persistent;}};
}
