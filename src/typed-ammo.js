import {ammoResupplyAmount} from './ammo-resupply-rules.js';
// Authoritative reserve units. Loaded magazines and throwable-tool charges stay separate.
export const AMMO_TYPES=Object.freeze(['light','heavy','energy','grenade']);
export const AMMO_NAMES=Object.freeze({light:'轻弹',heavy:'重弹',energy:'能量',grenade:'榴弹'});
export const AMMO_CAP=Object.freeze({light:600,heavy:450,energy:192,grenade:14});
export const AMMO_SUPPLY=Object.freeze({light:90,heavy:90,energy:36,grenade:3});
export const AMMO_WEAPONS=Object.freeze({0:['heavy',1],1:['light',6],2:['light',1],4:['light',1],5:['heavy',2],6:['energy',3],7:['energy',1],9:['grenade',1],10:['energy',6]});
export const emptyTypedAmmo=()=>({version:1,pools:{light:0,heavy:0,energy:0,grenade:0}});
export function validTypedAmmo(v){return !!v&&!Array.isArray(v)&&v.version===1&&!!v.pools&&!Array.isArray(v.pools)&&AMMO_TYPES.every(k=>Number.isInteger(v.pools[k])&&v.pools[k]>=0&&v.pools[k]<=AMMO_CAP[k]);}
export function validTypedAmmoEnvelope(v){return v===undefined||validTypedAmmo(v)||!!v&&!Array.isArray(v)&&Number.isSafeInteger(v.version)&&v.version>1;}
const copy=v=>JSON.parse(JSON.stringify(v));
export function createTypedAmmo({enabled=true}={}){
 let data=emptyTypedAmmo(),opaque,mode='auto',scale=1;
 const available=i=>opaque!==undefined||!Number.isInteger(i)?0:AMMO_WEAPONS[i]?Math.floor(data.pools[AMMO_WEAPONS[i][0]]/AMMO_WEAPONS[i][1]):0;
 const capacity=type=>AMMO_TYPES.includes(type)?Math.floor(AMMO_CAP[type]*(type==='grenade'?1:scale)):0;
 function add(type,units){if(!enabled||opaque!==undefined||!AMMO_TYPES.includes(type)||!Number.isInteger(units)||units<0)return 0;const cap=capacity(type),n=Math.min(units,Math.max(0,cap-data.pools[type]));data.pools[type]+=n;return n;}
 // Targeted grants/legacy mode access remain API-compatible; player crates always use supplyAll.
 return {enabled,available,capacity,supplyAll(){return Object.fromEntries(AMMO_TYPES.map(type=>[type,add(type,ammoResupplyAmount(data.pools[type],capacity(type)))]));},reset(value,reserves=[],ordnance,light=false){data=emptyTypedAmmo();opaque=value!==undefined&&!validTypedAmmo(value)?copy(value):undefined;mode='auto';scale=light?.65:1;if(validTypedAmmo(value))data=copy(value);else if(value===undefined){for(const [id,[type,cost]] of Object.entries(AMMO_WEAPONS)){const i=+id,n=i<8?reserves[i]:ordnance?.version===1&&ordnance.owned?.includes(i)?ordnance.reserve[i-9]:0;if(Number.isInteger(n)&&n>0)data.pools[type]=Math.min(AMMO_CAP[type],data.pools[type]+n*cost);}}},
 take(i,n){if(!enabled||!Number.isInteger(n)||n<0||n>available(i)||!Number.isInteger(i)||!AMMO_WEAPONS[i])return 0;data.pools[AMMO_WEAPONS[i][0]]-=n*AMMO_WEAPONS[i][1];return n;},grant(i,n){const info=Number.isInteger(i)?AMMO_WEAPONS[i]:null;return info&&Number.isInteger(n)?add(info[0],n*info[1]):0;},supply(type){return add(type,AMMO_SUPPLY[type]);},
 mirror(reserves,weapons){if(!enabled)return reserves;return reserves.map((n,i)=>AMMO_WEAPONS[i]?Math.min(weapons[i].reserve,available(i)):n);},supplyType(i){return mode==='auto'?(AMMO_WEAPONS[i]?.[0]||'light'):mode;},cycleSupply(){const modes=['auto',...AMMO_TYPES];mode=modes[(modes.indexOf(mode)+1)%modes.length];return mode;},
 checkpoint:()=>enabled?{typedAmmo:copy(opaque===undefined?data:opaque)}:{},get state(){return copy(data);},get mode(){return mode;},get unsupported(){return opaque!==undefined;}};
}
