export const MOD_SLOTS=Object.freeze(['muzzle','magazine','sight']);
export const MOD_OPTIONS=Object.freeze({muzzle:['原装','制退器：后坐−20%/散布−10%，换弹+8%','精密枪口：散布−25%，后坐+12%'],magazine:['原装','快装匣：换弹−18%，后坐+12%','配重匣：后坐−12%，换弹+8%'],sight:['原装','反射瞄具：散布−8%/倍率24，后坐+6%','精确瞄具：倍率34，移动散布惩罚+20%']});
export const freshWeaponMods=()=>({version:1,weapons:Array.from({length:8},()=>[0,0,0])});
export function validWeaponMods(v){return !!v&&!Array.isArray(v)&&v.version===1&&Array.isArray(v.weapons)&&v.weapons.length===8&&v.weapons.every((row,i)=>Array.isArray(row)&&row.length===3&&row.every(n=>Number.isInteger(n)&&n>=0&&n<=2&&(i!==3||n===0)));}
export function validWeaponModsEnvelope(v){return v===undefined||validWeaponMods(v)||!!v&&!Array.isArray(v)&&Number.isSafeInteger(v.version)&&v.version>1;}
export function modUnlocked(slot,option,{stars=0,awards=0}={}){return option===0||Number.isInteger(option)&&option>=1&&option<=2&&(slot===0?stars>=1:slot===1?stars>=2:slot===2&&(stars>=3||awards>=1));}
export function modsAllowed(value,unlocks){return validWeaponMods(value)&&value.weapons.every(row=>row.every((n,s)=>modUnlocked(s,n,unlocks)));}
export function moddedProfile(base,row){const p={...base};if(row[0]===1){p.kick*=.8;p.spread*=.9;p.reload*=1.08;}if(row[0]===2){p.spread*=.75;p.kick*=1.12;}if(row[1]===1){p.reload*=.82;p.kick*=1.12;}if(row[1]===2){p.kick*=.88;p.reload*=1.08;}if(row[2]===1){p.spread*=.92;p.kick*=1.06;p.zoom=24;}if(row[2]===2){p.zoom=34;p.movementPenalty=(base.movementPenalty??.55)+.2;}return p;}
