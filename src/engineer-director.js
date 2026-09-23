import {createEngineerRepair} from './engineer-repair.js';
import * as T from '../node_modules/three/build/three.module.js';
import {ENGINEER,chooseEngineerSite,engineerSiteSafe} from './engineer-rules.js';
import {voltClearPath} from './volt-world.js';
export function createEngineerDirector({scene,enemies,player,obstacles,projectiles,protectedPoints=()=>[],deploy,canStart=()=>true,onEvent=()=>{}}){
 const repair=createEngineerRepair({scene,enemies,obstacles,projectiles,onEvent});
 const records=new Map();let used=false;
 function remove(e){const r=records.get(e);if(r){scene.remove(r.marker);r.marker.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});records.delete(e);}e.engineerBuilding=false;e.engineerRemaining=0;}
 function cancel(e,reason){remove(e);e.engineerCooldown=ENGINEER.retry;e.engineerStatus=reason;onEvent('interrupted',e);}
 function visible(e,site){const from=e.group.position.clone().add(new T.Vector3(0,1.2,0)),to=new T.Vector3(site.x,1.2,site.z),meshes=obstacles.map(o=>o.mesh);meshes.forEach(m=>m.updateWorldMatrix(true,false));return voltClearPath(from,to,meshes);}
 function capacity(){return !used&&!enemies.some(e=>e.hp>0&&e.type==='sentry');}
 function update(dt){
  if(!Number.isFinite(dt)||dt<0)return;
  repair.update(dt);
  for(const [e] of records)if(e.hp<=0||!enemies.includes(e)){remove(e);onEvent('cancelled',e);}
  for(const e of enemies){if(e.type!=='engineer'||e.hp<=0||e.engineerRepairing)continue;
   const damaged=e.engineerLastHp!==undefined&&e.hp<e.engineerLastHp;e.engineerLastHp=e.hp;
   const r=records.get(e);
   if(damaged){if(r)cancel(e,'受击打断');else e.engineerCooldown=ENGINEER.retry;continue;}
   if(r){
    if(!capacity()||!engineerSiteSafe(r.site,e,player.position,obstacles,enemies,protectedPoints())||!visible(e,r.site)){cancel(e,'部署位置失效');continue;}
    e.engineerRemaining=Math.max(0,e.engineerRemaining-dt);r.marker.children[0].rotation.z+=dt*2;r.marker.children[1].material.opacity=.15+.15*(1-e.engineerRemaining/ENGINEER.warning);
    if(e.engineerRemaining<=0){const ok=deploy({...r.site},e);remove(e);if(ok){used=true;e.engineerSpent=true;e.engineerStatus='部署已用尽';e.attack=Math.max(e.attack||0,1.5);onEvent('deployed',e);}else{e.engineerCooldown=ENGINEER.retry;e.engineerStatus='部署失败';onEvent('interrupted',e);}}
    continue;
   }
   e.engineerCooldown=Math.max(0,(e.engineerCooldown??ENGINEER.initial)-dt);
   if(dt<=0||e.engineerSpent||e.engineerCooldown>0||records.size||!capacity()||!canStart()||e.charge>0||projectiles.hasPending(e.group))continue;
   const site=chooseEngineerSite(e,player.position,obstacles,enemies,protectedPoints(),p=>visible(e,p));
   if(!site){e.engineerCooldown=1;continue;}
   const marker=new T.Group();marker.name='ENGINEER_DEPLOYMENT';marker.position.set(site.x,.12,site.z);
   const ring=new T.Mesh(new T.TorusGeometry(.8,.035,6,40),new T.MeshBasicMaterial({color:0xffc36a,transparent:true,opacity:.85,depthWrite:false}));ring.rotation.x=Math.PI/2;
   const ghost=new T.Mesh(new T.BoxGeometry(1.2,1.5,1.2),new T.MeshBasicMaterial({color:0xffc36a,wireframe:true,transparent:true,opacity:.15,depthWrite:false}));ghost.position.y=.75;
   for(const m of [ring,ghost]){m.raycast=()=>{};m.userData.combatDecoration=true;marker.add(m);}scene.add(marker);
   records.set(e,{site,marker});e.engineerBuilding=true;e.engineerRemaining=ENGINEER.warning;e.engineerStatus='部署中';onEvent('started',e);
  }
 }
 function clear(){repair.clear();for(const [e] of records)remove(e);used=false;}
 return {update,clear,get repairing(){return repair.pending;},get pending(){return records.size;},get used(){return used;}};
}
