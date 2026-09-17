import * as THREE from './node_modules/three/build/three.module.js';
import {ENEMY_TYPES} from './enemy-rules.js';
const steel=new THREE.MeshStandardMaterial({color:0x66808c,roughness:.5,metalness:.3});
const dark=new THREE.MeshStandardMaterial({color:0x22313e,roughness:.65,metalness:.2});
function box(g,w,h,d,x,y,z,material,zone='body'){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.userData.hitZone=zone;g.add(m);return m;
}
export function createEnemyModel(type){
 const profile=ENEMY_TYPES[type],g=new THREE.Group(),heavy=type==='heavy'||type==='harborElite',boss=type==='warden';
 const accent=new THREE.MeshStandardMaterial({color:profile.color,emissive:profile.color,emissiveIntensity:1.1});
 const coreMaterial=accent.clone();g.userData.ownedMaterials=[accent,coreMaterial];
 const legs=[],arms=[];
 box(g,heavy||boss?1.08:.85,1.05,.65,0,1.16,0,dark);
 box(g,.66,.43,.62,0,1.94,0,steel,'head');box(g,.52,.1,.05,0,1.96,.335,accent,'head');
 for(const side of [-1,1]){
  const leg=box(g,.26,.7,.33,side*.27,.38,0,steel);legs.push(leg);
  box(g,.28,.25,.1,side*.27,.44,.22,dark);
  const arm=box(g,.24,.8,.32,side*.65,1.2,0,steel);arms.push(arm);
  box(g,heavy||boss?.5:.38,.29,.65,side*.64,1.68,0,steel);
  box(g,.34,.065,.68,side*.64,1.82,0,accent);
 }
 box(g,.55,.8,.25,0,1.2,-.38,dark);
 let core=null;
 if(heavy){
  coreMaterial.color.setHex(0x85ffe0);coreMaterial.emissive.setHex(0x26dcae);coreMaterial.emissiveIntensity=1.6;
  box(g,1.03,.96,.18,0,1.21,.47,steel,'armor');
  box(g,.86,.07,.2,0,1.58,.49,accent,'armor');
  box(g,.13,.65,.2,-.42,1.16,.49,dark,'armor');box(g,.13,.65,.2,.42,1.16,.49,dark,'armor');
  core=new THREE.Mesh(new THREE.IcosahedronGeometry(.21,1),coreMaterial);core.position.set(0,1.28,-.6);core.userData.hitZone='core';g.add(core);
 }
 if(type==='harborElite'){core.position.z=.63;box(g,.24,.18,.24,0,2.32,0,accent,'head');box(g,.25,.22,.9,.66,1.25,.36,dark);box(g,.25,.22,.9,-.66,1.25,.36,dark);}
 if(type==='ranged'){
  box(g,.12,.62,.12,-.4,2.08,0,dark);box(g,.15,.13,.15,-.4,2.39,0,accent);
  box(g,.2,.18,.92,.68,1.25,.34,dark);box(g,.21,.05,.35,.68,1.37,.38,accent);
 }else if(type==='assault'){
  box(g,.17,.16,.5,.65,1.15,.32,dark);box(g,.06,.2,.05,0,1.2,.35,accent);
 }
 if(boss){
  for(const side of [-1,1]){box(g,.24,.75,.34,side*.8,2.03,0,dark);box(g,.29,.09,.38,side*.8,2.29,0,accent);}
  core=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,0),coreMaterial);core.position.set(0,1.32,.54);core.userData.hitZone='core';g.add(core);
  const coreFrame=new THREE.Mesh(new THREE.TorusGeometry(.31,.045,6,24),steel);coreFrame.position.set(0,1.32,.49);g.add(coreFrame);
  const crown=new THREE.Mesh(new THREE.TorusGeometry(.44,.045,6,28),accent);crown.position.set(0,2.18,0);crown.rotation.x=Math.PI/2;g.add(crown);
 }
 g.userData.parts={legs,arms,accent,coreMaterial,core};return g;
}
export function animateEnemy(enemy,time,walking){
 const p=enemy.group.userData.parts;if(!p)return;
 const stride=walking?Math.sin(time*(enemy.type==='assault'?11:7)+enemy.seed)*.38:0;
 p.legs.forEach((leg,i)=>leg.rotation.x=stride*(i?1:-1));
 p.arms.forEach((arm,i)=>arm.rotation.x=enemy.charge>0?-.18:stride*(i?-.4:.4));
 p.accent.emissiveIntensity=enemy.charge>0?2.3+Math.sin(time*22)*.8:1;
 if(enemy.type==='harborElite'){const open=enemy.eliteState?.ventRemaining>0;p.coreMaterial.color.setHex(open?0x72ffe0:0xe4aa55);p.coreMaterial.emissive.setHex(open?0x32d6b0:0x986122);p.coreMaterial.emissiveIntensity=open?1.5:.5;p.core.scale.setScalar(open?1.35:1);p.core.rotation.y=time;}
 if(enemy.boss){
  const open=enemy.bossState.openRemaining>0;
  p.coreMaterial.color.setHex(open?0x35d5a8:0xff648c);p.coreMaterial.emissive.setHex(open?0x15966f:0xb71a4a);p.coreMaterial.emissiveIntensity=open?1.2:.5;
  p.core.scale.setScalar(open?1.2+Math.sin(time*9)*.08:1);p.core.rotation.y=time;
 }
}
