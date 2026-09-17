import * as THREE from './node_modules/three/build/three.module.js';
import {segmentBox,segmentSphere} from './collision.js';

export function createEnemyProjectiles(scene,obstacles,onPlayerHit,onImpact){
 const active=[],pending=[];
 const coreGeometry=new THREE.SphereGeometry(.11,8,6),trailGeometry=new THREE.CylinderGeometry(.05,.015,1,6);
 const haloGeometry=new THREE.SphereGeometry(.22,8,6),ringGeometry=new THREE.TorusGeometry(.27,.035,6,24);
 const white=new THREE.MeshBasicMaterial({color:0xffecc6});
 const materials=Object.fromEntries(Object.entries({orange:0xff4824,pink:0xff36a8,purple:0xbc7cff,amber:0xffc34e}).map(([key,color])=>[key,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending})]));
 const up=new THREE.Vector3(0,1,0),zero=new THREE.Vector3();
 function removePending(index){const p=pending[index];scene.remove(p.ring);if(p.line){scene.remove(p.line);p.line.geometry.dispose();p.line.material.dispose();}pending.splice(index,1);}
 function queue(origin,target,boss=false,owner=null,pattern=null){
  const attack={color:boss?'pink':'orange',charge:boss?.65:.45,speed:boss?15:18,damage:boss?10:6,angles:boss?[-.12,0,.12]:[0],bursts:1,burstDelay:.3,burstOffset:0,showAim:false,...pattern};
  const reserved=pending.reduce((n,p)=>n+(p.attack.bursts-p.emitted)*p.attack.angles.length,0);
  if(pending.length>=16||active.length+reserved+attack.bursts*attack.angles.length>96)return false;
  const material=materials[attack.color]||materials.orange;
  const ring=new THREE.Mesh(ringGeometry,material);ring.position.copy(origin);ring.lookAt(target);scene.add(ring);
  let line=null;
  if(attack.showAim){
   line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin,target]),new THREE.LineBasicMaterial({color:material.color,transparent:true,opacity:.48,depthWrite:false}));scene.add(line);
  }
  pending.push({origin:origin.clone(),target:target.clone(),boss,owner,ring,line,attack,emitted:0,remaining:attack.charge,total:attack.charge});return true;
 }
 function spawn(origin,direction,charge){
  if(active.length>=96)return;
  const attack=charge.attack,mesh=new THREE.Group(),material=materials[attack.color]||materials.orange;
  mesh.add(new THREE.Mesh(coreGeometry,white));mesh.add(new THREE.Mesh(haloGeometry,material));
  const tail=new THREE.Mesh(trailGeometry,material);mesh.add(tail);mesh.position.copy(origin);scene.add(mesh);
  active.push({mesh,tail,source:origin.clone(),owner:charge.owner,velocity:direction.clone().normalize().multiplyScalar(attack.speed),life:4,damage:attack.damage,color:material.color.getHex(),boss:charge.boss});
 }
 function remove(i){scene.remove(active[i].mesh);active.splice(i,1);}
 function update(dt,playerPosition,previousPlayer=playerPosition){
  // Existing bolts advance first; newly emitted bolts cannot deal damage on queue().
  for(let i=active.length-1;i>=0;i--){
   const bolt=active[i],a=bolt.mesh.position.clone(),b=a.clone().addScaledVector(bolt.velocity,dt);
   let wallTime=null;
   for(const o of obstacles){
    const t=segmentBox(a,b,{x:o.x-o.w/2-.09,y:(o.bottom??0)-.09,z:o.z-o.d/2-.09},{x:o.x+o.w/2+.09,y:(o.top??o.h)+.09,z:o.z+o.d/2+.09});
    if(t!==null&&(wallTime===null||t<wallTime))wallTime=t;
   }
   const oldCenter=previousPlayer.clone().add(new THREE.Vector3(0,-.35,0)),newCenter=playerPosition.clone().add(new THREE.Vector3(0,-.35,0));
   const playerTime=segmentSphere(a.clone().sub(oldCenter),b.clone().sub(newCenter),zero,.55);
   if(playerTime!==null&&(wallTime===null||playerTime<wallTime)){
    onPlayerHit(bolt.damage,bolt.source);onImpact(a.clone().lerp(b,playerTime),0xff5435,10);remove(i);continue;
   }
   if(wallTime!==null){onImpact(a.clone().lerp(b,wallTime),bolt.color,12);remove(i);continue;}
   bolt.mesh.position.copy(b);bolt.life-=dt;
   const backward=bolt.velocity.clone().normalize().negate();
   bolt.tail.position.copy(backward).multiplyScalar(.9);bolt.tail.scale.y=1.8;bolt.tail.quaternion.setFromUnitVectors(up,backward);
   if(bolt.life<=0||b.y<0||b.y>12)remove(i);
  }
  for(let i=pending.length-1;i>=0;i--){
   const charge=pending[i];charge.remaining-=dt;
   if(charge.owner&&charge.owner.parent!==scene){removePending(i);continue;}
   charge.ring.scale.setScalar(1+(1-Math.max(0,charge.remaining)/charge.total)*1.2);charge.ring.rotateZ(dt*5);
   if(charge.remaining<=0){
    const direction=charge.target.clone().sub(charge.origin).normalize();
    for(const angle of charge.attack.angles)spawn(charge.origin,direction.clone().applyAxisAngle(up,angle+charge.emitted*charge.attack.burstOffset),charge);
    charge.emitted++;
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
 return {queue,update,clear,cancelOwner,hasPending:owner=>pending.some(p=>p.owner===owner),positions:()=>active.map(b=>b.mesh.position),get count(){return active.length;},get charging(){return pending.length;}};
}
