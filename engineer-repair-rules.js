export const REPAIR=Object.freeze({range:8,layer:1.2,warning:1.6,amount:24,cooldown:6,limit:2});
export function repairable(engineer,target){
 if(!engineer||engineer.type!=='engineer'||engineer.boss||!Number.isFinite(engineer.hp)||engineer.hp<=0||engineer.engineerBuilding||engineer.empBlocked||engineer.empRemaining>0||!target||target.boss||target.type!=='sentry'||target.empBlocked||target.empRemaining>0||!Number.isFinite(target.hp)||!Number.isFinite(target.maxHp)||target.hp<=0||target.hp>=target.maxHp)return false;
 const a=engineer.group?.position,b=target.group?.position;if(!a||!b||![a.x,a.y,a.z,b.x,b.y,b.z].every(Number.isFinite))return false;
 return Math.abs(a.y-b.y)<=REPAIR.layer&&Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<=REPAIR.range;
}
export function chooseRepairTarget(engineer,enemies,visible){let target=null,distance=Infinity;for(const e of enemies){if(!repairable(engineer,e)||!visible(engineer,e))continue;const a=engineer.group.position,b=e.group.position,d=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);if(d<distance){target=e;distance=d;}}return target;}
export const repairAmount=target=>Math.max(0,Math.min(REPAIR.amount,target.maxHp-target.hp));
