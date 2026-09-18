// Static authored configs only: no storage, DOM, eval or runtime dependencies.
export function validateWeaponDefinitions(definitions){
 if(!Array.isArray(definitions)||definitions.length===0)throw new TypeError('Weapon definitions must be a nonempty array');
 const ids=new Set(),slots=new Set();
 const fail=(id,field)=>{throw new TypeError(`Invalid weapon ${id||'<unknown>'}: ${field}`);};
 for(const definition of definitions){
  if(!definition||typeof definition!=='object')fail(null,'definition');
  const {id,category,legacyIndex,combat:w}=definition;
  if(typeof id!=='string'||!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)||ids.has(id))fail(id,'unique stable id');ids.add(id);
  if(!['primary','secondary','heavy','melee','throwable'].includes(category))fail(id,'category');
  if(legacyIndex!==undefined){if(!Number.isInteger(legacyIndex)||legacyIndex<0||slots.has(legacyIndex))fail(id,'unique legacyIndex');slots.add(legacyIndex);}
  if(!w||typeof w!=='object'||typeof w.name!=='string'||!w.name.trim())fail(id,'combat/name');
  for(const key of ['delay','damage','range','headMultiplier'])if(!Number.isFinite(w[key])||w[key]<=0)fail(id,key);
  for(const key of ['spread','reload','kick','falloffStart'])if(!Number.isFinite(w[key])||w[key]<0)fail(id,key);
  if(w.chainRadius!==undefined||w.chainMultiplier!==undefined){if(!Number.isFinite(w.chainRadius)||w.chainRadius<=0||w.chainRadius>5||!Number.isFinite(w.chainMultiplier)||w.chainMultiplier<=0||w.chainMultiplier>1||w.burstSize!==undefined||w.penetrationTargets!==undefined)fail(id,'chain radius/multiplier');}
  if(w.chargeDuration!==undefined||w.penetrationTargets!==undefined){if(!Number.isFinite(w.chargeDuration)||w.chargeDuration<=0||w.chargeDuration>5||!Number.isInteger(w.penetrationTargets)||w.penetrationTargets<1||w.penetrationTargets>8||w.automatic||w.pellets!==1||w.burstSize!==undefined)fail(id,'charge/penetration');}
  if(w.burstSize!==undefined||w.burstInterval!==undefined){if(!Number.isInteger(w.burstSize)||w.burstSize<2||w.burstSize>8||!Number.isFinite(w.burstInterval)||w.burstInterval<=0||w.burstInterval>1||w.automatic)fail(id,'burst timing');}
  if(w.movementPenalty!==undefined&&(!Number.isFinite(w.movementPenalty)||w.movementPenalty<0||w.movementPenalty>2))fail(id,'movementPenalty');
  if(w.sprintReload!==undefined&&typeof w.sprintReload!=='boolean')fail(id,'sprintReload');
  if(w.falloffStart>w.range)fail(id,'falloffStart');
  if(!Number.isFinite(w.minimumDamage)||w.minimumDamage<0||w.minimumDamage>1)fail(id,'minimumDamage');
  if(!Number.isInteger(w.pellets)||w.pellets<1)fail(id,'pellets');
  if(typeof w.automatic!=='boolean'||(w.perShell!==undefined&&typeof w.perShell!=='boolean'))fail(id,'fire/reload flags');
  if(category==='melee'){
   if(w.cap!==Infinity||w.reserve!==Infinity||w.reload!==0||w.perShell)fail(id,'melee ammo/reload');
  }else{
   if(!Number.isInteger(w.cap)||w.cap<1||!Number.isInteger(w.reserve)||w.reserve<0||w.reload<=0)fail(id,'finite ammo/reload');
  }
 }
 return true;
}
