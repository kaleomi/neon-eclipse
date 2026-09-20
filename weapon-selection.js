// Fixed user-facing slots are deliberately separate from persistent weapon IDs.
export const EQUIPPED_SLOTS=Object.freeze([
 {slot:'primary',action:'weaponPrimary',code:'Digit1',key:'1',label:'主武器'},
 {slot:'secondary',action:'weaponSecondary',code:'Digit2',key:'2',label:'副武器'},
 {slot:'melee',action:'weaponMelee',code:'Digit3',key:'3',label:'近战武器'}
].map(Object.freeze));
export function equippedWeaponForKey(code,loadout){
 const slot=EQUIPPED_SLOTS.find(item=>item.code===code)?.slot,index=slot?loadout?.[slot]:null;
 return Number.isInteger(index)&&index>=0&&index<=11?index:null;
}
// A logical equipped slot may be a special weapon; it is not an index into the legacy ammo arrays.
export function equippedWeaponIndices(loadout){
 if(!loadout)return [];
 return [loadout.primary,loadout.secondary,loadout.melee].filter((n,i,all)=>Number.isInteger(n)&&n>=0&&n<=11&&all.indexOf(n)===i);
}
export function nextEquippedWeapon(current,slots,direction){
 const allowed=slots.filter((n,i)=>Number.isInteger(n)&&slots.indexOf(n)===i);
 if(!allowed.length||!Number.isFinite(direction)||direction===0)return current;
 const i=allowed.indexOf(current);
 return i<0?allowed[0]:allowed[(i+(direction>0?1:-1)+allowed.length)%allowed.length];
}
// Normalize mouse wheels and high-resolution trackpads; one gesture tick cannot skip multiple weapons.
export function createWeaponWheel({enabled,getSelected,getSlots,select,now=()=>performance.now(),threshold=40,cooldown=160}){
 let accumulated=0,last=-Infinity;
 function reset(){accumulated=0;last=-Infinity;}
 function handle(event){
  const target=event.target;
  if(!enabled()||event.ctrlKey||event.metaKey||target?.isContentEditable||target?.closest?.('input,select,textarea,button,[contenteditable="true"],dialog,[role="dialog"],.carry-panel,.field-kit-panel,.mission-card')){reset();return false;}
  if(!Number.isFinite(event.deltaY)||event.deltaY===0||Math.abs(event.deltaX||0)>Math.abs(event.deltaY))return false;
  event.preventDefault?.();
  const t=now();if(t-last<cooldown){accumulated=0;return false;}
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?400:1);
  if(accumulated&&Math.sign(delta)!==Math.sign(accumulated))accumulated=0;
  accumulated+=delta;if(Math.abs(accumulated)<threshold)return false;
  const next=nextEquippedWeapon(getSelected(),getSlots(),Math.sign(accumulated));accumulated=0;
  if(next===getSelected()||select(next)===false)return false;
  last=t;return true;
 }
 return {handle,reset};
}
