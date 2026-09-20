export const KIT_VERSION=1;
export const HEAVY_AMMO_CAP=2;
export const defaultKit=()=>({version:1,mode:'standard',slots:[0,2],mods:Array(8).fill(0),heavy:HEAVY_AMMO_CAP});
const firearm=i=>Number.isInteger(i)&&i>=0&&i<8&&i!==3;
export function validKit(s){return !!s&&s.version===1&&['standard','light'].includes(s.mode)&&Array.isArray(s.slots)&&s.slots.length===2&&s.slots.every(firearm)&&s.slots[0]!==s.slots[1]&&Array.isArray(s.mods)&&s.mods.length===8&&s.mods.every((v,i)=>Number.isInteger(v)&&v>=0&&v<=2&&(i!==3||v===0))&&Number.isInteger(s.heavy)&&s.heavy>=0&&s.heavy<=HEAVY_AMMO_CAP;}
export function restoreKit(value){if(value===undefined)return defaultKit();if(validKit(value))return {...value,slots:[...value.slots],mods:[...value.mods]};return {...defaultKit(),heavy:0};}
export const kitAllows=(kit,index)=>Number.isInteger(index)&&index>=0&&index<8&&(index===3||kit.mode==='standard'||kit.slots.includes(index));
export function kitProfile(base,kit,index){const p={...base},mod=kit.mods[index];if(index!==3){if(mod===1){p.spread*=.72;p.kick*=.8;p.reload*=1.12;}else if(mod===2){p.reload*=.8;p.spread*=1.18;}if(kit.mode==='light')p.reserve=Math.floor(p.reserve*.65);}return p;}
