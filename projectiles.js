import * as THREE from './node_modules/three/build/three.module.js';
import {segmentBox,segmentSphere} from './collision.js';

// `hooks` is optional: onQueue(origin,attack,boss,owner) fires when a telegraph ring appears,
// onEmit(origin,attack,boss) when its bolts are released. Optional parry hooks:
// tryParry(bolt,hitFraction,point), getReflectTargets(), onReflectHit(hit,bolt).
export function createEnemyProjectiles(scene,obstacles,onPlayerHit,onImpact,hooks={}){
 const active=[],pending=[];
 const maxAttackers=Number.isInteger(hooks.maxAttackers)&&hooks.maxAttackers>0?hooks.maxAttackers:Infinity;
 const attackSlots=()=>new Set([...pending.map(p=>p.slot),...active.filter(b=>!b.reflected).map(b=>b.slot)]);
 // Optional shared budget: external telegraphs (Boss, mortars) consume the same slots as projectile attackers.
 const externalAttackers=()=>{const n=hooks.budget?.external?.('projectiles');return Number.isFinite(n)&&n>0?Math.floor(n):0;};
 const coreGeometry=new THREE.SphereGeometry(.11,8,6),trailGeometry=new THREE.CylinderGeometry(.05,.015,1,6);
 const haloGeometry=new THREE.SphereGeometry(.22,8,6),ringGeometry=new THREE.TorusGeometry(.27,.035,6,24);
 const white=new THREE.MeshBasicMaterial({color:0xffecc6});
 const materials=Object.fromEntries(Object.entries({reflected:0x84fff4,green:0x6affb6,blue:0x63cfff,orange:0xff4824,pink:0xff36a8,purple:0xbc7cff,amber:0xffc34e}).map(([key,color])=>[key,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending})]));
 const up=new THREE.Vector3(0,1,0),zero=new THREE.Vector3();
 function removePending(index){const p=pending[index];scene.remove(p.ring);if(p.line){scene.remove(p.line);p.line.geometry.dispose();p.line.material.dispose();}pending.splice(index,1);}
 function queue(origin,target,boss=false,owner=null,pattern=null){
  const resolved=hooks.resolveTarget?.(origin,target,boss,owner);if(resolved===null)return false;if(resolved)target=resolved;
  const slot=owner||{},slots=attackSlots();if(!slots.has(slot)&&slots.size+externalAttackers()>=maxAttackers)return false;
  const attack={color:boss?'pink':'orange',charge:boss?.65:.45,speed:boss?15:18,damage:boss?10:6,angles:boss?[-.12,0,.12]:[0],bursts:1,burstDelay:.3,burstOffset:0,showAim:false,...pattern};
  const reserved=pending.reduce((n,p)=>n+(p.attack.bursts-p.emitted)*p.attack.angles.length,0);
  if(pending.length>=16||active.length+reserved+attack.bursts*attack.angles.length>96)return false;
  const material=materials[attack.color]||materials.orange;
  const ring=new THREE.Mesh(ringGeometry,material);ring.position.copy(origin);ring.lookAt(target);scene.add(ring);
  let line=null;
  if(attack.showAim){
   line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin,target]),new THREE.LineBasicMaterial({color:material.color,transparent:true,opacity:.48,depthWrite:false}));scene.add(line);
  }
  pending.push({slot,origin:origin.clone(),target:target.clone(),boss,owner,ring,line,attack,emitted:0,remaining:attack.charge,total:attack.charge});hooks.onQueue?.(origin,attack,boss,owner);return true;
 }
 function spawn(origin,direction,charge){
  if(active.length>=96)return;
  const attack=charge.attack,mesh=new THREE.Group(),material=materials[attack.color]||materials.orange;
  mesh.add(new THREE.Mesh(coreGeometry,white));mesh.add(new THREE.Mesh(haloGeometry,material));
  const tail=new THREE.Mesh(trailGeometry,material);mesh.add(tail);mesh.position.copy(origin);scene.add(mesh);
  active.push({slot:charge.slot,mesh,tail,source:origin.clone(),owner:charge.owner,velocity:direction.clone().normalize().multiplyScalar(attack.speed),life:4,damage:attack.damage,color:material.color.getHex(),colorKey:attack.color,boss:charge.boss,reflected:false});
 }
 function remove(i){scene.remove(active[i].mesh);active.splice(i,1);}
 // Reflections use real two-sided triangles without changing live materials.
 const reflectedRay=new THREE.Raycaster(),emptyGeometry=new THREE.BufferGeometry();
 const targetProxy=new THREE.Mesh(emptyGeometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));targetProxy.matrixAutoUpdate=false;
 function firstWall(a,b){
  let first=null;
  for(const o of obstacles){
   const t=segmentBox(a,b,{x:o.x-o.w/2-.09,y:(o.bottom??0)-.09,z:o.z-o.d/2-.09},{x:o.x+o.w/2+.09,y:(o.top??o.h)+.09,z:o.z+o.d/2+.09});
   if(t!==null&&(first===null||t<first.time))first={time:t,obstacle:o};
  }
  return first;
 }
 function targetVisible(mesh){
  if(!mesh?.geometry)return false;
  for(let node=mesh;node;node=node.parent){if(!node.visible)return false;if(node===scene)return true;}
  return false;
 }
 function advanceReflected(bolt,dt){
  const a=bolt.mesh.position.clone(),b=a.clone().addScaledVector(bolt.velocity,dt),length=a.distanceTo(b),wallContact=firstWall(a,b),wall=wallContact?.time??null;
  let hit=null;
  if(length>1e-9){
   reflectedRay.set(a,bolt.velocity.clone().normalize());reflectedRay.near=0;reflectedRay.far=length;
   const targets=hooks.getReflectTargets?.()||[];
   for(const mesh of targets){
    if(!targetVisible(mesh))continue;
    mesh.updateWorldMatrix(true,false);targetProxy.geometry=mesh.geometry;targetProxy.matrixWorld.copy(mesh.matrixWorld);
    const contact=reflectedRay.intersectObject(targetProxy,false)[0];
    if(contact&&(!hit||contact.distance<hit.distance))hit={...contact,object:mesh};
   }
   targetProxy.geometry=emptyGeometry;
  }
  if(hit&&(wall===null||hit.distance/length<wall)){
   hooks.onReflectHit?.(hit,bolt);onImpact(hit.point,bolt.color,10);return true;
  }
  if(wall!==null){hooks.onObstacleHit?.(wallContact.obstacle,bolt);onImpact(a.lerp(b,wall),bolt.color,12);return true;}
  bolt.mesh.position.copy(b);bolt.reflectedDistance+=length;return b.y<0||b.y>12;
 }
 function alignTail(bolt){
  const backward=bolt.velocity.clone().normalize().negate();
  if(bolt.reflected){
   // A fresh return has no trail behind the contact point: never draw it through the camera.
   const length=Math.min(.6,bolt.reflectedDistance);bolt.tail.visible=length>1e-6;
   bolt.tail.position.copy(backward).multiplyScalar(length/2);bolt.tail.scale.set(.65,Math.max(.001,length),.65);
  }else{bolt.tail.position.copy(backward).multiplyScalar(.9);bolt.tail.scale.y=1.8;}
  bolt.tail.quaternion.setFromUnitVectors(up,backward);
 }
 function update(dt,playerPosition,previousPlayer=playerPosition){
  if(!Number.isFinite(dt)||dt<0)return;
  // Existing bolts advance first; newly emitted bolts cannot deal damage on queue().
  for(let i=active.length-1;i>=0;i--){
   const bolt=active[i];
   if(bolt.reflected){
    const stopped=advanceReflected(bolt,Math.min(dt,Math.max(0,bolt.life)));bolt.life-=dt;
    if(stopped||bolt.life<=0)remove(i);else alignTail(bolt);continue;
   }
   const a=bolt.mesh.position.clone(),b=a.clone().addScaledVector(bolt.velocity,dt),wallContact=firstWall(a,b),wallTime=wallContact?.time??null;
   const oldCenter=previousPlayer.clone().add(new THREE.Vector3(0,-.35,0)),newCenter=playerPosition.clone().add(new THREE.Vector3(0,-.35,0));
   const playerTime=segmentSphere(a.clone().sub(oldCenter),b.clone().sub(newCenter),zero,.55);
   if(playerTime!==null&&(wallTime===null||playerTime<wallTime)){
    const point=a.clone().lerp(b,playerTime);
    const accepted=hooks.tryParry?.(bolt,playerTime,point)===true;
    if(accepted&&bolt.colorKey==='orange'&&!bolt.boss){
     bolt.reflected=true;bolt.reflectedDistance=0;bolt.owner=null;bolt.colorKey='reflected';bolt.color=materials.reflected.color.getHex();
     bolt.parryOrigin=previousPlayer.clone().lerp(playerPosition,playerTime);
     bolt.mesh.position.copy(point);bolt.velocity.negate();bolt.tail.material=materials.reflected;bolt.mesh.children[1].material=materials.reflected;
     // Keep the aim point clear: feedback is the guard HUD/clang, not opaque near-eye particles.
     bolt.mesh.children[0].scale.setScalar(.65);bolt.mesh.children[1].scale.setScalar(.65);bolt.life-=dt*playerTime;
     const rest=dt*(1-playerTime),stopped=advanceReflected(bolt,Math.min(rest,Math.max(0,bolt.life)));bolt.life-=rest;
     if(stopped||bolt.life<=0)remove(i);else alignTail(bolt);continue;
    }
    onPlayerHit(bolt.damage,bolt.source);onImpact(point,0xff5435,10);remove(i);continue;
   }
   if(wallTime!==null){hooks.onObstacleHit?.(wallContact.obstacle,bolt);onImpact(a.clone().lerp(b,wallTime),bolt.color,12);remove(i);continue;}
   bolt.mesh.position.copy(b);bolt.life-=dt;
   alignTail(bolt);
   if(bolt.life<=0||b.y<0||b.y>12)remove(i);
  }
  for(let i=pending.length-1;i>=0;i--){
   const charge=pending[i];if(hooks.allowPending?.(charge.origin,charge.target,charge.boss,charge.owner)===false){removePending(i);continue;}charge.remaining-=dt;
   if(charge.owner&&charge.owner.parent!==scene){removePending(i);continue;}
   charge.ring.scale.setScalar(1+(1-Math.max(0,charge.remaining)/charge.total)*1.2);charge.ring.rotateZ(dt*5);
   if(charge.remaining<=0){
    const direction=charge.target.clone().sub(charge.origin).normalize();
    for(const angle of charge.attack.angles)spawn(charge.origin,direction.clone().applyAxisAngle(up,angle+charge.emitted*charge.attack.burstOffset),charge);
    charge.emitted++;hooks.onEmit?.(charge.origin,charge.attack,charge.boss);
    if(charge.emitted>=charge.attack.bursts)removePending(i);
    else charge.remaining=charge.attack.burstDelay;
   }
  }
 }
 function cancelOwner(owner,includeActive=false){
  for(let i=pending.length-1;i>=0;i--)if(pending[i].owner===owner)removePending(i);
  if(includeActive)for(let i=active.length-1;i>=0;i--)if(active[i].owner===owner)remove(i);
 }
 function clear(){for(let i=active.length-1;i>=0;i--)remove(i);for(let i=pending.length-1;i>=0;i--)removePending(i);}
 return {queue,update,clear,cancelOwner,resolveTarget:(origin,target,boss,owner)=>hooks.resolveTarget?.(origin,target,boss,owner)??target,aimTarget:owner=>pending.find(p=>p.owner===owner)?.target.clone()||null,get attackers(){return attackSlots().size;},countThreatTag:tag=>pending.filter(p=>p.owner?.userData?.[tag]).length+active.filter(p=>p.owner?.userData?.[tag]).length,hasActive:owner=>active.some(p=>p.owner===owner),hasThreatTag:tag=>pending.some(p=>p.owner?.userData?.[tag])||active.some(p=>p.owner?.userData?.[tag]),hasPending:owner=>pending.some(p=>p.owner===owner),positions:()=>active.filter(b=>!b.reflected).map(b=>b.mesh.position),get reflectedCount(){return active.filter(b=>b.reflected).length;},get count(){return active.length;},get charging(){return pending.length;}};
}
