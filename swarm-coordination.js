export const SWARM_INTEL=Object.freeze({duration:3,illumination:1,radius:18,receivers:2,escapeRadius:1.25});
const finite=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
// Only a successfully queued, visible blue telegraph publishes a frozen observation.
export function createSwarmCoordination({position,visible}){
 let record=null;const owned=new Set();
 function forget(){if(record)for(const e of record.receivers)delete e.swarmIntel;record=null;}
 function publish(source,point,enemies){
  if(source?.type!=='swarmDrone'||source.hp<=0||source.empRemaining>0||source.empBlocked||!enemies.includes(source)||!finite(point))return false;
  const from=position(source);if(!finite(from))return false;forget();
  const receivers=enemies.filter(e=>e.type==='ranged'&&e.hp>0&&finite(position(e))&&distance(from,position(e))<=SWARM_INTEL.radius).sort((a,b)=>distance(from,position(a))-distance(from,position(b))).slice(0,SWARM_INTEL.receivers);
  if(!receivers.length)return false;
  record={source,point:{x:point.x,y:point.y,z:point.z},remaining:SWARM_INTEL.duration,light:SWARM_INTEL.illumination,lit:true,receivers};
  for(const e of receivers){owned.add(e);e.group.userData.swarmCoordinated=true;e.swarmIntel={point:{...record.point},remaining:record.remaining,lit:true};}return true;
 }
 function update(dt,enemies,player){
  if(!record||!Number.isFinite(dt)||dt<0)return;
  if(!enemies.includes(record.source)||record.source.hp<=0||record.source.empRemaining>0||record.source.empBlocked){forget();return;}
  record.remaining=Math.max(0,record.remaining-dt);record.light=Math.max(0,record.light-dt);
  if(!record.remaining){forget();return;}
  const from=position(record.source);
  // Breaking the light ends illumination, not the already observed static memory.
  record.lit=record.lit&&record.light>0&&finite(player)&&distance(player,record.point)<=SWARM_INTEL.escapeRadius&&visible(from,player);
  record.receivers=record.receivers.filter(e=>{const keep=enemies.includes(e)&&e.hp>0&&distance(from,position(e))<=SWARM_INTEL.radius;if(!keep)delete e.swarmIntel;return keep;});
  for(const e of record.receivers)e.swarmIntel={point:{...record.point},remaining:record.remaining,lit:record.lit};
  if(!record.receivers.length)forget();
 }
 return {publish,update,clear(){forget();for(const e of owned){delete e.swarmIntel;delete e.lastVisualPoint;delete e.group.userData.swarmCoordinated;}owned.clear();},get state(){return record?{point:{...record.point},remaining:record.remaining,lit:record.lit,receivers:record.receivers.length}:null;}};
}
