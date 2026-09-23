// Neutral environment durability: never awards actor damage, kills, loot or mission progress.
export const PANEL_HP=60;
export function createDurability(maxHp=PANEL_HP){
 if(!Number.isFinite(maxHp)||maxHp<=0)throw new TypeError('Invalid destructible durability');
 let hp=maxHp;
 const snapshot=()=>({hp,maxHp,broken:hp===0,ratio:hp/maxHp});
 return {snapshot,reset(){hp=maxHp;return snapshot();},hit(amount){
  const damage=Number.isFinite(amount)&&amount>0?Math.min(hp,amount):0;
  hp-=damage;return {...snapshot(),damage,changed:damage>0,newlyBroken:damage>0&&hp===0};
 }};
}
// Restore the saved position, not a solid inside it. A small horizontal margin also
// protects players standing against a formerly absent sheet. No save schema change.
export function overlapsRestoredPlayer(o,p,{radius=.4,height=1.8,eye=1.7}={}){
 if(!p)return false;
 const feet=p.y-eye;
 return Math.abs(p.x-o.x)<o.w/2+radius+.08&&Math.abs(p.z-o.z)<o.d/2+radius+.08&&feet<(o.top??o.h)+.02&&feet+height>(o.bottom??0)-.02;
}
