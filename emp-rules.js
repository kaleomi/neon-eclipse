export const EMP=Object.freeze({capacity:2,radius:6,duration:3,fuse:1.2,speed:14,lift:3,gravity:12,bodyRadius:.12,recovery:1,shieldDuration:6});
export const EMP_TYPES=Object.freeze(['sentry','swarmDrone','drone','hound','rusher','artilleryMech']);
export function empEligible(enemy){return !!enemy&&enemy.hp>0&&!enemy.boss&&EMP_TYPES.includes(enemy.type);}
export function validEmpState(value){return value===undefined||!!value&&!Array.isArray(value)&&typeof value==='object'&&Number.isInteger(value.charges)&&value.charges>=0&&value.charges<=EMP.capacity;}
export function restoreEmpCharges(value){return value===undefined?EMP.capacity:validEmpState(value)?value.charges:0;}
export function empWithin(origin,target){return [origin.x,origin.y,origin.z,target.x,target.y,target.z].every(Number.isFinite)&&Math.hypot(origin.x-target.x,origin.y-target.y,origin.z-target.z)<=EMP.radius+1e-8;}
