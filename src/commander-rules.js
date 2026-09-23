export const COMMANDER=Object.freeze({radius:12,layer:1.2,cooldownRate:1.25});
const allies=new Set(['assault','ranged','heavy','shield','sniper','stalker','engineer']);
const live=e=>!!e&&e.hp>0&&!e.boss&&!e.empBlocked&&!(e.empRemaining>0);
export function commanderCanSupport(source,target){
 if(!live(source)||source.type!=='commander'||!live(target)||!allies.has(target.type)||target.engineerBuilding||target.engineerRepairing)return false;
 const a=source.group?.position,b=target.group?.position;if(!a||!b||![a.x,a.y,a.z,b.x,b.y,b.z].every(Number.isFinite))return false;
 return Math.abs(a.y-b.y)<=COMMANDER.layer&&Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<=COMMANDER.radius;
}
export function refreshCommanderSupport(enemies,visible){
 const leaders=enemies.filter(e=>live(e)&&e.type==='commander');
 for(const e of enemies){e.commanderSource=null;e.commanderRecipients=0;}
 for(const target of enemies){let best=null,distance=Infinity;for(const source of leaders){if(!commanderCanSupport(source,target))continue;const a=source.group.position,b=target.group.position,d=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);if(d<distance&&visible(source,target)){best=source;distance=d;}}if(best){target.commanderSource=best;best.commanderRecipients++;}}
}
export const commandedCooldownRate=e=>e.commanderSource?COMMANDER.cooldownRate:1;
export function clearCommanderSupport(enemies){for(const e of enemies){e.commanderSource=null;e.commanderRecipients=0;}}
