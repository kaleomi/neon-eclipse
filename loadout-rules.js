import {THROWABLES} from './tactical-rules.js';
import {ORDNANCE_SLOTS} from './ordnance-rules.js';
// Carrying is mandatory; inventory/ammunition/unlocks are deliberately not stored here.
export const PRIMARY_SLOTS=Object.freeze([0,1,4,5,6,7,8]);
export const DEFAULT_LOADOUT=Object.freeze({version:1,primary:0,secondary:2,melee:3,throwable:'emp'});
const copy=s=>JSON.parse(JSON.stringify(s));
export function validLoadout(s){return !!s&&!Array.isArray(s)&&s.version===1&&[...PRIMARY_SLOTS,...ORDNANCE_SLOTS].includes(s.primary)&&s.secondary===2&&[3,11].includes(s.melee)&&THROWABLES.includes(s.throwable);}
export function validLoadoutEnvelope(s){return s===undefined||validLoadout(s)||!!s&&!Array.isArray(s)&&typeof s==='object'&&Number.isSafeInteger(s.version)&&s.version>1;}
export function loadoutAllows(s,index){return Number.isInteger(index)&&index>=0&&index<=11&&(index===s.primary||index===s.secondary||index===s.melee||index===3&&s.melee===11);}
export function createLoadoutState({heavySupported=false,canEquipHeavy=()=>false}={}){
 let current={...DEFAULT_LOADOUT},draft={...DEFAULT_LOADOUT},opaque;
 function reset(value){opaque=undefined;if(value===undefined){current={...draft};if(current.primary>=9&&!canEquipHeavy(current.primary))current.primary=0;if(current.melee===11&&!canEquipHeavy(11))current.melee=3;}else if(validLoadout(value)&&(value.primary!==8||heavySupported)&&(value.primary<9||canEquipHeavy(value.primary))&&(value.melee!==11||canEquipHeavy(11)))current=value.primary===11?{...value,primary:0,melee:11}:{...value};else{current={...DEFAULT_LOADOUT};opaque=copy(value);}return {...current};}
 function equip(primary,{deployment=false}={}){if(opaque!==undefined||![...PRIMARY_SLOTS,...ORDNANCE_SLOTS].includes(primary)||primary===11||primary===8&&!heavySupported||primary>=9&&!canEquipHeavy(primary))return false;current={...current,primary};if(deployment)draft={...current};return true;}
 function equipMelee(melee,{deployment=false}={}){if(opaque!==undefined||![3,11].includes(melee)||melee===11&&!canEquipHeavy(11))return false;current={...current,melee};if(deployment)draft={...current};return true;}
 function equipThrowable(throwable,{deployment=false}={}){if(opaque!==undefined||!THROWABLES.includes(throwable))return false;current={...current,throwable};if(deployment)draft={...current};return true;}
 return {reset,equip,equipMelee,equipThrowable,allows:i=>loadoutAllows(current,i),first:()=>current.primary>=8?2:current.primary,checkpoint:()=>({loadout:copy(opaque===undefined?current:opaque)}),get state(){return {...current};},get unsupported(){return opaque!==undefined;}};
}
export function terminalInReach(camera,entry,{range=3.2,eyeHeight=1.7}={}){
 if(!camera||!entry)return false;
 const y=entry.feetY??0;
 return [camera.x,camera.y,camera.z,entry.x,entry.z,y].every(Number.isFinite)&&Math.abs(camera.y-eyeHeight-y)<=.7&&Math.hypot(camera.x-entry.x,camera.z-entry.z)<=range;
}
