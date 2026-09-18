import rail from './railspike.js';
export const RAIL_RULES=Object.freeze({charge:.8,targets:3,retention:.75,thinRetention:.85,maxThinPanels:2,maxThinThickness:.25});
// One discharge per physical hold. Early release cancels, and readiness loss never banks charge.
export function createRailCharge(){
 let elapsed=0,latched=false;
 function cancel(){elapsed=0;latched=false;}
 return {cancel,get progress(){return elapsed/rail.combat.chargeDuration;},get active(){return elapsed>0;},get latched(){return latched;},tick(dt,held,ready,emit){
  if(!Number.isFinite(dt)||dt<0)return false;
  if(!held){cancel();return false;}if(latched)return false;
  if(!ready){elapsed=0;return false;}
  elapsed=Math.min(rail.combat.chargeDuration,elapsed+dt);
  if(elapsed+1e-8<rail.combat.chargeDuration)return false;
  latched=true;elapsed=0;return emit()===true;
 }};
}
// Ray intersections are not targets: several triangles/limbs of the same actor count only once.
// Unknown geometry fails closed. Only explicitly authored thin panels permit penetration.
export function selectRailImpacts(intersections,targetOf){
 const hits=[],seen=new Set(),panels=new Set();let factor=1,count=0,stop=null;
 for(const impact of [...intersections].filter(i=>Number.isFinite(i.distance)&&i.distance>=0&&i.distance<=rail.combat.range).sort((a,b)=>a.distance-b.distance)){
  const object=impact.object,target=targetOf(object);
  if(target){if(seen.has(target))continue;seen.add(target);hits.push({...impact,railFactor:factor});count++;
   if(count>=RAIL_RULES.targets||object.userData?.overseer!==undefined){stop=impact;break;}factor*=RAIL_RULES.retention;continue;}
  if(panels.has(object))continue;
  const thin=object.userData?.railThin,thickness=object.userData?.railThickness;
  hits.push({...impact,railFactor:factor});
  if(thin===true&&Number.isFinite(thickness)&&thickness>0&&thickness<=RAIL_RULES.maxThinThickness&&panels.size<RAIL_RULES.maxThinPanels){panels.add(object);factor*=RAIL_RULES.thinRetention;continue;}
  stop=impact;break;
 }
 return {hits,stop,count,panels:panels.size};
}
