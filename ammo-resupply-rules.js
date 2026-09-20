// Pickups refill a quarter of each effective reserve capacity, never loaded magazines.
// Ammo counts are integral: fractional rounds round UP, then clamp to the remaining room.
export const AMMO_RESUPPLY_FRACTION=.25;
export function ammoResupplyAmount(current,capacity){
 if(!Number.isInteger(current)||current<0||!Number.isInteger(capacity)||capacity<=0)return 0;
 return Math.min(Math.max(0,capacity-current),Math.ceil(capacity*AMMO_RESUPPLY_FRACTION));
}
// P4 keeps its independent legacy reserves, but uses the same pickup percentage.
export function resupplyLegacyReserves(reserves,weapons){
 return reserves.map((current,index)=>{const added=ammoResupplyAmount(current,weapons[index]?.reserve);return added?current+added:current;});
}
