// Rendering for the target range, roof turret, tracers, rockets and blasts. Reads rule state only.
// Pooled meshes; no per-frame allocation beyond matrix updates. Materials are shared and never
// mutated per object except through instance colours and pooled opacity.
import * as T from './node_modules/three/build/three.module.js';
import {ROOF_GUN} from './vehicle-weapons.js';
import {terrainHeight} from './vehicle-rules.js';
const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.7,...extra});
export function buildTargetRange(scene,range){
 const group=new T.Group();scene.add(group);
 const plateMat=mat(0xe9d38a,{emissive:0x3a2c08}),balloonMat=mat(0xf07a5c,{emissive:0x5a1d10,roughness:.4}),droneMat=mat(0x8fd7ff,{emissive:0x1d4d66,metalness:.3}),deadMat=mat(0x2d3a3f,{transparent:true,opacity:.28}),hitMat=mat(0xffffff,{emissive:0xffffff,emissiveIntensity:1.3});
 const plateGeo=new T.CylinderGeometry(1.5,1.5,.25,20),postGeo=new T.BoxGeometry(.2,1.5,.2),balloonGeo=new T.SphereGeometry(5,20,14),droneGeo=new T.OctahedronGeometry(1.6,0),ringGeo=new T.TorusGeometry(2.1,.12,6,18);
 const entries=range.targets.map(t=>{
  const holder=new T.Group();group.add(holder);let mesh;
  if(t.type==='plate'){mesh=new T.Mesh(plateGeo,plateMat);mesh.rotation.x=Math.PI/2;mesh.position.y=t.y;const post=new T.Mesh(postGeo,mat(0x22343a));post.position.y=.75;holder.add(post);}
  else if(t.type==='balloon'){mesh=new T.Mesh(balloonGeo,balloonMat);const tether=new T.Mesh(new T.CylinderGeometry(.05,.05,t.y,4),mat(0x223034));tether.position.y=-t.y/2;mesh.add(tether);}
  else{mesh=new T.Mesh(droneGeo,droneMat);mesh.scale.setScalar(t.r/1.6);const ring=new T.Mesh(ringGeo,droneMat);ring.rotation.x=Math.PI/2;mesh.add(ring);}
  mesh.castShadow=t.type!=='balloon';holder.add(mesh);return {t,holder,mesh,base:mesh.material};
 });
 return {group,update(time){for(const e of entries){const {t,holder,mesh}=e;holder.position.set(t.x,t.type==='plate'?terrainHeight(t.x,t.z):t.y,t.z);if(t.type!=='plate')mesh.position.y=0;
  holder.visible=true;mesh.material=!t.alive?deadMat:t.flash>0?hitMat:e.base;
  if(t.type==='drone'){mesh.rotation.y=time*2.4;mesh.rotation.x=Math.sin(time*3+t.angle)*.2;}
  if(t.type==='balloon')mesh.position.y=Math.sin(time*.7+t.x)*1.2;
  if(!t.alive&&t.type==='balloon')holder.position.y=Math.max(8,t.y-(t.respawn-t.respawnIn)*6);
 }}};
}
export function createTurretModel(body){
 const pivot=new T.Group();pivot.position.set(0,ROOF_GUN.mountHeight-.35,.2);body.add(pivot);
 const dark=mat(0x1a2a30,{metalness:.5,roughness:.45}),brass=mat(0xd8b56a,{metalness:.7,roughness:.3});
 const ring=new T.Mesh(new T.CylinderGeometry(.55,.6,.14,18),dark);ring.position.y=.02;pivot.add(ring);
 const yawGroup=new T.Group();pivot.add(yawGroup);const cradle=new T.Mesh(new T.BoxGeometry(.5,.32,.6),dark);cradle.position.y=.25;yawGroup.add(cradle);
 const pitchGroup=new T.Group();pitchGroup.position.y=.32;yawGroup.add(pitchGroup);
 const barrel=new T.Mesh(new T.CylinderGeometry(.06,.07,1.3,10),dark);barrel.rotation.x=Math.PI/2;barrel.position.z=-.75;pitchGroup.add(barrel);
 const muzzle=new T.Mesh(new T.CylinderGeometry(.09,.09,.22,10),brass);muzzle.rotation.x=Math.PI/2;muzzle.position.z=-1.42;pitchGroup.add(muzzle);
 const box=new T.Mesh(new T.BoxGeometry(.34,.22,.36),brass);box.position.set(.3,.05,-.05);pitchGroup.add(box);
 const flash=new T.Mesh(new T.SphereGeometry(.22,8,6),new T.MeshBasicMaterial({color:0xfff1b5,transparent:true,opacity:.9}));flash.position.z=-1.6;flash.visible=false;pitchGroup.add(flash);
 // The barrel points along local -Z: positive X rotation raises its muzzle, matching aimDirection.
 return {pivot,update(weapon,roverYaw){yawGroup.rotation.y=-(weapon.aimYaw-roverYaw);pitchGroup.rotation.x=weapon.aimPitch;flash.visible=weapon.flash>0;flash.scale.setScalar(.8+weapon.flash*6);}};
}
export function createFireEffects(scene,{tracers=32,blasts=8,rockets=4}={}){
 const tracerMat=new T.LineBasicMaterial({color:0xfff0a8,transparent:true,opacity:.95}),hitTracerMat=new T.LineBasicMaterial({color:0xff8b5c,transparent:true,opacity:1});
 const lines=Array.from({length:tracers},()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(6),3));const l=new T.Line(g,tracerMat);l.visible=false;l.frustumCulled=false;scene.add(l);return l;});
 const blastMat=new T.MeshBasicMaterial({color:0xffb26a,transparent:true,opacity:.7,depthWrite:false});
 const blastMeshes=Array.from({length:blasts},()=>{const m=new T.Mesh(new T.SphereGeometry(1,12,8),blastMat.clone());m.visible=false;scene.add(m);return m;});
 const rocketMat=mat(0xe6e6d6,{emissive:0xff6a2a,emissiveIntensity:.8});const rocketGeo=new T.CylinderGeometry(.12,.18,1.4,8);rocketGeo.rotateX(Math.PI/2);
 const rocketMeshes=Array.from({length:rockets},()=>{const m=new T.Mesh(rocketGeo,rocketMat);m.visible=false;scene.add(m);return m;});
 const dir=new T.Vector3();
 return {update(weapons){
  let li=0,bi=0,ri=0;
  for(const w of weapons){
   for(const e of w.effects){
    if(e.kind==='tracer'&&li<lines.length){const l=lines[li++],a=l.geometry.attributes.position;a.setXYZ(0,e.from.x,e.from.y,e.from.z);a.setXYZ(1,e.to.x,e.to.y,e.to.z);a.needsUpdate=true;l.material=e.hit?hitTracerMat:tracerMat;l.visible=true;}
    else if(e.kind==='blast'&&bi<blastMeshes.length){const m=blastMeshes[bi++];m.visible=true;m.position.set(e.at.x,e.at.y,e.at.z);const k=1-e.life/.5;m.scale.setScalar(2+k*12);m.material.opacity=.75*(1-k);}
   }
   for(const p of w.projectiles){if(ri>=rocketMeshes.length)break;const m=rocketMeshes[ri++];m.visible=true;m.position.set(p.x,p.y,p.z);dir.set(p.vx,p.vy,p.vz);if(dir.lengthSq()>1e-6){dir.normalize();m.lookAt(m.position.x+dir.x,m.position.y+dir.y,m.position.z+dir.z);}}
  }
  for(;li<lines.length;li++)lines[li].visible=false;for(;bi<blastMeshes.length;bi++)blastMeshes[bi].visible=false;for(;ri<rocketMeshes.length;ri++)rocketMeshes[ri].visible=false;
 }};
}
export function createDamageSmoke(scene,count=3){
 const smokeMat=new T.MeshBasicMaterial({color:0x3a3f42,transparent:true,opacity:.35,depthWrite:false});
 const emitters=Array.from({length:count},()=>{const g=new T.Group();g.visible=false;scene.add(g);const puffs=Array.from({length:6},(_,i)=>{const m=new T.Mesh(new T.SphereGeometry(.5,7,5),smokeMat.clone());m.userData.phase=i/6;g.add(m);return m;});return {g,puffs};});
 return {update(items,time){
  items.forEach((item,i)=>{const e=emitters[i];if(!e)return;const tier=item.tier;e.g.visible=tier!=='normal';if(!e.g.visible)return;e.g.position.set(item.x,item.y,item.z);
   for(const m of e.puffs){const k=((time*(tier==='disabled'?.9:.55))+m.userData.phase)%1;m.position.set(Math.sin(k*9+m.userData.phase*6)*.4,k*(tier==='disabled'?4:2.6),Math.cos(k*7)*.4);m.scale.setScalar(.4+k*(tier==='disabled'?2.2:1.4));m.material.opacity=(tier==='disabled'?.55:.32)*(1-k);m.material.color.setHex(tier==='disabled'?0x1e2224:0x4a5054);}
  });
  for(let i=items.length;i<emitters.length;i++)emitters[i].g.visible=false;
 }};
}
export function drawRangeOnRadar(ctx,co,range){
 for(const t of range.targets){if(!t.alive)continue;ctx.fillStyle=t.type==='plate'?'#e9d38a':t.type==='balloon'?'#f07a5c':'#8fd7ff';ctx.beginPath();ctx.arc(co(t.x),co(t.z),t.type==='balloon'?3:2,0,Math.PI*2);ctx.fill();}
}
