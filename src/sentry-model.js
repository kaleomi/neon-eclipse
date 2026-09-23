import {animateRosterUnit} from '../characters/roster-runtime.js';
import * as T from '../node_modules/three/build/three.module.js';
import {SENTRY} from './sentry-rules.js';
export function createSentryModel(){
 const g=new T.Group();g.name='SENTRY';g.userData.sentry=true;g.userData.combatAnchorY=1.25;
 const steel=new T.MeshStandardMaterial({color:0x60736f,metalness:.7,roughness:.4}),dark=new T.MeshStandardMaterial({color:0x203231,metalness:.45,roughness:.6}),green=new T.MeshStandardMaterial({color:0x6affb6,emissive:0x27b477,emissiveIntensity:1.1}),fanMat=new T.MeshBasicMaterial({color:0x42efa0,transparent:true,opacity:.12,side:T.DoubleSide,depthWrite:false});g.userData.ownedMaterials=[steel,dark,green,fanMat];
 const box=(w,h,d,x,y,z,mat,zone='body')=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.userData.hitZone=zone;g.add(m);return m;};
 const base=new T.Mesh(new T.CylinderGeometry(.6,.6,.45,16),dark);base.position.y=.225;base.userData.hitZone='body';g.add(base);box(.5,.65,.5,0,.77,0,steel);box(.94,.5,1.02,0,1.35,0,dark);box(.95,.52,.1,0,1.36,.54,steel,'armor');box(.82,.04,.12,0,1.66,.54,green,'armor');
 for(const x of [-.18,.18]){const m=new T.Mesh(new T.CylinderGeometry(.085,.085,.72,12),steel);m.rotation.x=Math.PI/2;m.position.set(x,1.42,.85);m.userData.hitZone='body';g.add(m);box(.13,.04,.35,x,1.54,.87,dark);}
 box(.2,.16,.18,0,1.74,.12,green);
 const core=new T.Mesh(new T.IcosahedronGeometry(.19,1),green);core.position.set(0,1.35,-.66);core.userData.hitZone='core';g.add(core);
 const fan=new T.Mesh(new T.BufferGeometry(),fanMat);fan.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(18*18),3));fan.position.y=.11;fan.raycast=()=>{};fan.userData.combatDecoration=true;fan.name='SENTRY_SECTOR';g.add(fan);
 const edgeMat=new T.LineBasicMaterial({color:0x42efa0,transparent:true,opacity:.55,depthWrite:false}),edge=new T.LineSegments(new T.BufferGeometry(),edgeMat);edge.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(228),3));edge.position.y=.115;edge.raycast=()=>{};edge.userData.combatDecoration=true;g.add(edge);g.userData.ownedMaterials.push(edgeMat);
 g.userData.parts={sentry:true,base,core,green,fan,edge};return g;
}
export function updateSentryFan(enemy,obstacles){
 const g=enemy.group,fan=g.userData.parts.fan,vertices=fan.geometry.getAttribute('position'),origin=g.position.clone().add(new T.Vector3(0,1.42,0)),ray=new T.Raycaster(),radii=[];
 const meshes=obstacles.filter(o=>o.owner!==g).map(o=>o.mesh);for(const mesh of meshes)mesh.updateWorldMatrix(true,false);
 for(let i=0;i<=18;i++){const angle=-SENTRY.halfAngle+SENTRY.halfAngle*2*i/18,yaw=g.rotation.y+angle;ray.set(origin,new T.Vector3(Math.sin(yaw),0,Math.cos(yaw)));ray.far=SENTRY.range;const hit=ray.intersectObjects(meshes,false)[0];radii.push(hit?Math.max(0,hit.distance-.05):SENTRY.range);}
 for(let i=0;i<18;i++){const a=-SENTRY.halfAngle+SENTRY.halfAngle*2*i/18,b=-SENTRY.halfAngle+SENTRY.halfAngle*2*(i+1)/18;const lo=SENTRY.minRange,ra=Math.max(lo,radii[i]),rb=Math.max(lo,radii[i+1]),points=[[a,lo],[a,ra],[b,rb],[a,lo],[b,rb],[b,lo]];points.forEach(([angle,r],j)=>vertices.setXYZ(i*6+j,Math.sin(angle)*r,0,Math.cos(angle)*r));}vertices.needsUpdate=true;fan.geometry.computeBoundingSphere();
 const edge=g.userData.parts.edge,points=edge.geometry.getAttribute('position');let k=0;const copy=i=>points.setXYZ(k++,vertices.getX(i),0,vertices.getZ(i));for(let i=0;i<18;i++){copy(i*6);copy(i*6+5);copy(i*6+1);copy(i*6+2);}copy(0);copy(1);copy(107);copy(104);points.needsUpdate=true;edge.geometry.computeBoundingSphere();
 animateRosterUnit(enemy,enemy.sentryScan||0,false);
}
