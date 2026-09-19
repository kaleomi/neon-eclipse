// Dedicated finite ammunition; never aliases the eight legacy weapon arrays.
export const ORDNANCE=Object.freeze({
 9:Object.freeze({name:'CINDER',cap:1,reserve:7,damage:180,range:4,fuse:1.2,delay:1.25,reload:1.1,color:0xffa25a}),
 10:Object.freeze({name:'LANCE',cap:2,reserve:10,damage:240,range:70,delay:.65,reload:2.2,color:0x99eaff}),
 11:Object.freeze({name:'BREAKER',cap:1,reserve:5,damage:200,range:3.5,charge:.9,delay:1.1,reload:1.8,color:0xcbb0ff})
});
export const ORDNANCE_SLOTS=Object.freeze([9,10,11]);
export const freshOrdnance=()=>({version:1,owned:[],rounds:[0,0,0],reserve:[0,0,0]});
export function validOrdnance(v){return !!v&&!Array.isArray(v)&&v.version===1&&Array.isArray(v.owned)&&new Set(v.owned).size===v.owned.length&&v.owned.every(i=>ORDNANCE_SLOTS.includes(i))&&['rounds','reserve'].every(k=>Array.isArray(v[k])&&v[k].length===3&&v[k].every((n,j)=>Number.isInteger(n)&&n>=0&&n<=(v.owned.includes(j+9)?ORDNANCE[j+9][k==='rounds'?'cap':'reserve']:0)));}
export function validOrdnanceEnvelope(v){return v===undefined||validOrdnance(v)||!!v&&!Array.isArray(v)&&Number.isSafeInteger(v.version)&&v.version>1;}
const copy=v=>JSON.parse(JSON.stringify(v));
export function createOrdnanceState(reserveSource=null){
 let data=freshOrdnance(),opaque;
 function view(){const v=copy(data);if(reserveSource?.enabled)for(const i of [9,10])v.reserve[i-9]=v.owned.includes(i)?Math.min(ORDNANCE[i].reserve,reserveSource.available(i)):0;return v;}
 return {reset(v){opaque=v!==undefined&&!validOrdnance(v)?copy(v):undefined;data=validOrdnance(v)?copy(v):freshOrdnance();},owns:i=>opaque===undefined&&data.owned.includes(i),claim(i){if(opaque!==undefined||!ORDNANCE[i]||data.owned.includes(i))return false;data.owned.push(i);data.rounds[i-9]=i===11?0:ORDNANCE[i].cap;data.reserve[i-9]=i===11?0:ORDNANCE[i].reserve;if(i!==11&&reserveSource?.enabled)reserveSource.grant(i,ORDNANCE[i].reserve);return true;},fire(i){if(i===11)return opaque===undefined&&data.owned.includes(11);if(opaque!==undefined||!data.owned.includes(i)||data.rounds[i-9]<=0)return false;data.rounds[i-9]--;return true;},reload(i){if(i===11)return 0;if(opaque!==undefined||!data.owned.includes(i))return 0;const n=Math.min(ORDNANCE[i].cap-data.rounds[i-9],reserveSource?.enabled?reserveSource.available(i):data.reserve[i-9]);data.rounds[i-9]+=n;if(reserveSource?.enabled)reserveSource.take(i,n);else data.reserve[i-9]-=n;return n;},get state(){return view();},get unsupported(){return opaque!==undefined;},checkpoint:()=>({ordnance:copy(opaque===undefined?view():opaque)})};
}
export function cinderDamage(distance,max=180){return Number.isFinite(distance)&&distance>=0&&distance<4?max*(1-distance/4):0;}
// Pending shared-channel Boss attacks only. Phase key is local to each live boss.
export function interruptBreakerBoss(enemy,projectiles){if(!enemy?.boss||enemy.hp<=0||!enemy.bossState||!projectiles.hasPending(enemy.group))return false;const phase=enemy.bossState.phase;if(enemy.breakerInterruptedPhase===phase)return false;enemy.breakerInterruptedPhase=phase;projectiles.cancelOwner(enemy.group);enemy.charge=0;enemy.attack=Math.max(enemy.attack||0,1);return true;}
