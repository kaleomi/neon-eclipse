import {ORDNANCE} from './ordnance-rules.js';
export const MOD_SLOTS=Object.freeze(['muzzle','magazine','sight']);
export const MOD_OPTIONS=Object.freeze({muzzle:['原装','制退器：后坐−20%/散布−10%，换弹+8%','精密枪口：散布−25%，后坐+12%'],magazine:['原装','快装匣：换弹−18%，后坐+12%','配重匣：后坐−12%，换弹+8%'],sight:['原装','反射瞄具：散布−8%/倍率24，后坐+6%','精确瞄具：倍率34，移动散布惩罚+20%']});
// Heavy rows are indexed by ORDNANCE slot: 9 = CINDER, 10 = LANCE. BREAKER (11) has no slots.
export const HEAVY_MOD_INDICES=Object.freeze([9,10]);
export const HEAVY_MOD_OPTIONS=Object.freeze({
 9:Object.freeze({muzzle:['原装发射管','长发射管：初速+15%，装填+10%','短发射管：初速−15%，装填−8%'],magazine:['原装引信','速燃引信：引信1.2→0.9s，半径4→3.4m','缓燃引信：引信1.2→1.6s，自伤+20%'],sight:['原装','广角瞄具：倍率16，开火冷却+8%','抛物瞄具：倍率28，装填+6%']}),
 10:Object.freeze({muzzle:['原装线圈','稳定线圈：开镜阈值0.9→0.75，第二目标衰减0.7→0.6','加速线圈：射程70→90m，换弹+18%'],magazine:['原装能室','快装能室：换弹−20%，冷却+15%','双能室：冷却0.65→0.5s，换弹+15%'],sight:['原装','广角镜：倍率26','长焦镜：倍率40，开镜阈值0.9→0.95']})
});
export const freshWeaponMods=()=>({version:1,weapons:Array.from({length:8},()=>[0,0,0]),heavy:[[0,0,0],[0,0,0]]});
const validRow=row=>Array.isArray(row)&&row.length===3&&row.every(n=>Number.isInteger(n)&&n>=0&&n<=2);
// `heavy` is optional so every checkpoint written before heavy mods existed stays valid and reads as stock.
export function validWeaponMods(v){return !!v&&!Array.isArray(v)&&v.version===1&&Array.isArray(v.weapons)&&v.weapons.length===8&&v.weapons.every((row,i)=>validRow(row)&&(i!==3||row.every(n=>n===0)))&&(v.heavy===undefined||Array.isArray(v.heavy)&&v.heavy.length===2&&v.heavy.every(validRow));}
export function validWeaponModsEnvelope(v){return v===undefined||validWeaponMods(v)||!!v&&!Array.isArray(v)&&Number.isSafeInteger(v.version)&&v.version>1;}
export function modUnlocked(slot,option,{stars=0,awards=0}={}){return option===0||Number.isInteger(option)&&option>=1&&option<=2&&(slot===0?stars>=1:slot===1?stars>=2:slot===2&&(stars>=3||awards>=1));}
export function heavyRow(value,index){const j=HEAVY_MOD_INDICES.indexOf(index);return j<0||!validWeaponMods(value)||!value.heavy?[0,0,0]:value.heavy[j];}
export function modsAllowed(value,unlocks){return validWeaponMods(value)&&value.weapons.every(row=>row.every((n,s)=>modUnlocked(s,n,unlocks)))&&(value.heavy??[]).every(row=>row.every((n,s)=>modUnlocked(s,n,unlocks)));}
export function moddedProfile(base,row){const p={...base};if(row[0]===1){p.kick*=.8;p.spread*=.9;p.reload*=1.08;}if(row[0]===2){p.spread*=.75;p.kick*=1.12;}if(row[1]===1){p.reload*=.82;p.kick*=1.12;}if(row[1]===2){p.kick*=.88;p.reload*=1.08;}if(row[2]===1){p.spread*=.92;p.kick*=1.06;p.zoom=24;}if(row[2]===2){p.zoom=34;p.movementPenalty=(base.movementPenalty??.55)+.2;}return p;}
// Effective heavy profile. Damage, magazine cap and reserve are never touched; every option is a tradeoff.
export function heavyProfile(index,row=[0,0,0]){
 const base=ORDNANCE[index];if(!base||!HEAVY_MOD_INDICES.includes(index))return null;
 const p={...base,index,zoom:22,launchSpeed:14,radius:4,selfDamage:35,adsThreshold:.9,secondTargetFactor:.7};
 if(index===9){
  if(row[0]===1){p.launchSpeed*=1.15;p.reload*=1.1;}if(row[0]===2){p.launchSpeed*=.85;p.reload*=.92;}
  if(row[1]===1){p.fuse=.9;p.radius=3.4;}if(row[1]===2){p.fuse=1.6;p.selfDamage*=1.2;}
  if(row[2]===1){p.zoom=16;p.delay*=1.08;}if(row[2]===2){p.zoom=28;p.reload*=1.06;}
 }else{
  if(row[0]===1){p.adsThreshold=.75;p.secondTargetFactor=.6;}if(row[0]===2){p.range=90;p.reload*=1.18;}
  if(row[1]===1){p.reload*=.8;p.delay*=1.15;}if(row[1]===2){p.delay=.5;p.reload*=1.15;}
  if(row[2]===1)p.zoom=26;if(row[2]===2){p.zoom=40;p.adsThreshold=Math.max(p.adsThreshold,.95);}
 }
 for(const k of ['reload','delay','launchSpeed','radius','selfDamage','fuse'])if(p[k]!==undefined)p[k]=Math.round(p[k]*1000)/1000;
 return Object.freeze(p);
}
