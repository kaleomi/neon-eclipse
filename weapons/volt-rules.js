import volt from './volt.js';
const validPoint=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
// Sources map: actor -> sum of weapon damage from pellets that actually damaged it,
// after distance/head/difficulty but before that actor's armor/mark. No recursive calls.
// A pellet-hit actor cannot also receive chain damage during the same discharge.
export function chooseVoltChain(sources,enemies,{position,visible}){
 const direct=new Set(sources.keys());
 for(const [source,weaponDamage] of [...sources].filter(([,d])=>Number.isFinite(d)&&d>0).sort((a,b)=>b[1]-a[1])){
  const from=position(source);if(!validPoint(from))continue;
  const candidates=[];
  for(const target of enemies){if(direct.has(target)||!Number.isFinite(target.hp)||target.hp<=0)continue;
   const to=position(target);if(!validPoint(to))continue;
   const distance=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z);
   if(distance<=volt.combat.chainRadius+1e-8)candidates.push({target,to,distance});
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  for(const {target,to,distance} of candidates)if(visible(from,to,source,target))return {source,target,from,to,distance,damage:weaponDamage*volt.combat.chainMultiplier};
 }
 return null;
}
