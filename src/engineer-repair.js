import * as T from '../node_modules/three/build/three.module.js';
import {REPAIR,repairable,chooseRepairTarget,repairAmount} from './engineer-repair-rules.js';
import {voltClearPath} from './volt-world.js';
export function createEngineerRepair({scene,enemies,obstacles,projectiles,onEvent=()=>{}}){
 const channels=new Map(),tracked=new Set();
 function visible(source,target){const a=source.group.position.clone().add(new T.Vector3(0,1.2,0)),b=target.group.position.clone().add(new T.Vector3(0,1.2,0));const meshes=obstacles.filter(o=>o.owner!==source.group&&o.owner!==target.group).map(o=>o.mesh);for(const m of meshes)m.updateWorldMatrix(true,false);return voltClearPath(a,b,meshes);}
 function remove(source){const r=channels.get(source);if(r){scene.remove(r.line);r.line.geometry.dispose();r.line.material.dispose();channels.delete(source);}source.engineerRepairing=false;source.engineerRepairRemaining=0;}
 function cancel(source,reason){remove(source);source.engineerRepairCooldown=REPAIR.cooldown;source.engineerRepairStatus=reason;onEvent('repair-interrupted',source);}
 function update(dt){if(!Number.isFinite(dt)||dt<0)return;
  for(const source of tracked)if(source.hp<=0||!enemies.includes(source)){remove(source);tracked.delete(source);}
  for(const source of enemies){if(source.type!=='engineer'||source.hp<=0)continue;tracked.add(source);const damaged=source.engineerRepairLastHp!==undefined&&source.hp<source.engineerRepairLastHp;source.engineerRepairLastHp=source.hp;
   const r=channels.get(source);if(damaged){if(r)cancel(source,'维修受击打断');else source.engineerRepairCooldown=REPAIR.cooldown;continue;}
   if(r){if(!enemies.includes(r.target)||!repairable(source,r.target)||!visible(source,r.target)){cancel(source,'维修目标失效/遮挡/EMP');continue;}
    source.engineerRepairRemaining=Math.max(0,source.engineerRepairRemaining-dt);const a=source.group.position,b=r.target.group.position,positions=r.line.geometry.attributes.position;positions.setXYZ(0,a.x,a.y+1.2,a.z);positions.setXYZ(1,b.x,b.y+1.2,b.z);positions.needsUpdate=true;r.line.geometry.computeBoundingSphere();r.line.material.opacity=.35+.3*(1-source.engineerRepairRemaining/REPAIR.warning);
    if(source.engineerRepairRemaining===0){const amount=repairAmount(r.target);r.target.hp+=amount;source.engineerRepairUsed=(source.engineerRepairUsed||0)+1;source.engineerRepairCooldown=REPAIR.cooldown;source.engineerRepairStatus='维修完成 +'+amount;source.attack=Math.max(source.attack||0,.5);remove(source);onEvent('repaired',source,amount);}continue;
   }
   source.engineerRepairCooldown=Math.max(0,(source.engineerRepairCooldown||0)-dt);
   if(dt<=0||source.engineerBuilding||source.engineerRepairCooldown>0||(source.engineerRepairUsed||0)>=REPAIR.limit||source.charge>0||projectiles.hasPending(source.group))continue;
   const target=chooseRepairTarget(source,enemies,(a,b)=>![...channels.values()].some(r=>r.target===b)&&visible(a,b));if(!target)continue;
   const line=new T.Line(new T.BufferGeometry().setFromPoints([source.group.position.clone().add(new T.Vector3(0,1.2,0)),target.group.position.clone().add(new T.Vector3(0,1.2,0))]),new T.LineBasicMaterial({color:0xffce78,transparent:true,opacity:.35,depthWrite:false}));line.name='ENGINEER_REPAIR_LINK';line.raycast=()=>{};scene.add(line);channels.set(source,{target,line});source.engineerRepairing=true;source.engineerRepairRemaining=REPAIR.warning;source.engineerRepairStatus='维修中';onEvent('repair-started',source);
  }
 }
 function clear(){for(const source of tracked)remove(source);tracked.clear();}
 return {update,clear,get pending(){return channels.size;}};
}
