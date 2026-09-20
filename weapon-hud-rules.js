import {AMMO_CAP,AMMO_WEAPONS,AMMO_NAMES} from './typed-ammo.js';
import {ORDNANCE} from './ordnance-rules.js';
const finite=n=>Number.isFinite(n)?Math.max(0,n):0;
// Total usable shots = loaded magazine + shots available from reserve. Reloading only transfers shots,
// so it must not make this gauge jump up. Shared ammo is measured in this weapon's per-shot units.
export function weaponAmmoGauge(index,{weapons,rounds=[],reserves=[],typedAmmo=null,ordnance=null,fieldKit=null,readOnly=false}={}){
 if(index===3||index===11)return {melee:true,percent:null,loaded:0,reserve:0,total:0,capacity:0,detail:'近战 · 不消耗弹药',label:'不消耗弹药'};
 const typed=Boolean(typedAmmo?.enabled&&AMMO_WEAPONS[index]);
 if(readOnly||typed&&typedAmmo.unsupported||index>=9&&ordnance?.unsupported)return {unavailable:true,percent:null,loaded:0,reserve:0,total:0,capacity:0,detail:'未来版本存档 · 只读保护',label:'余量未知'};
 if(index===8){const loaded=finite(fieldKit?.heavy);return {percent:Math.round(Math.min(1,loaded/2)*100),loaded,reserve:0,total:loaded,capacity:2,detail:'脉冲炮 · 剩余 '+loaded+' / 2',label:'总弹药'};}
 const profile=index>=9?ORDNANCE[index]:weapons?.[index];
 if(!profile)return {unavailable:true,percent:null,loaded:0,reserve:0,total:0,capacity:0,detail:'未识别的弹药规格',label:'余量未知'};
 const loaded=finite(index>=9?ordnance?.rounds?.[index-9]:rounds[index]);
 const reserve=finite(typed?typedAmmo.available(index):index>=9?ordnance?.reserve?.[index-9]:reserves[index]);
 let reserveCap=finite(profile.reserve),shared='';
 if(typed){const [type,cost]=AMMO_WEAPONS[index],scale=fieldKit?.mode==='light'&&type!=='grenade'?.65:1;reserveCap=Math.floor(Math.floor(AMMO_CAP[type]*scale)/cost);shared=' · 共享'+AMMO_NAMES[type];}
 const capacity=finite(profile.cap)+reserveCap,total=loaded+reserve;
 return {percent:capacity>0?Math.round(Math.max(0,Math.min(1,total/capacity))*100):0,loaded,reserve,total,capacity,
  detail:'弹匣 '+loaded+' / '+finite(profile.cap)+' · 备用 '+reserve+shared,label:'总弹药'};
}
