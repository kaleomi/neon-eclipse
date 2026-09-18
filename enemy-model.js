import {createSentryModel} from './sentry-model.js';
import {createSwarmModel,animateSwarm} from './swarm-model.js';
import * as THREE from './node_modules/three/build/three.module.js';
import {ENEMY_TYPES} from './enemy-rules.js';
const steel=new THREE.MeshStandardMaterial({color:0x66808c,roughness:.5,metalness:.3});
const dark=new THREE.MeshStandardMaterial({color:0x22313e,roughness:.65,metalness:.2});
function box(g,w,h,d,x,y,z,material,zone='body'){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.userData.hitZone=zone;g.add(m);return m;
}
export function createEnemyModel(type){
 if(type==='sentry')return createSentryModel();
 if(type==='swarmDrone')return createSwarmModel();
 const profile=ENEMY_TYPES[type],g=new THREE.Group(),heavy=type==='heavy'||type==='harborElite'||type==='shield',boss=type==='warden';
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
 if(type==='engineer'){g.name='FIELD_ENGINEER';box(g,1.05,.85,.42,0,1.38,-.58,steel);for(const side of [-1,1]){box(g,.15,.72,.46,side*.4,1.4,-.62,accent);box(g,.16,.42,.16,side*.42,2.08,-.58,dark);}box(g,.85,.12,.78,0,2.2,0,accent,'head');box(g,.22,.22,.85,.65,.92,.45,steel);}
 let core=null;
 if(heavy){
  coreMaterial.color.setHex(0x85ffe0);coreMaterial.emissive.setHex(0x26dcae);coreMaterial.emissiveIntensity=1.6;
  box(g,1.03,.96,.18,0,1.21,.47,steel,'armor');
  box(g,.86,.07,.2,0,1.58,.49,accent,'armor');
  box(g,.13,.65,.2,-.42,1.16,.49,dark,'armor');box(g,.13,.65,.2,.42,1.16,.49,dark,'armor');
  core=new THREE.Mesh(new THREE.IcosahedronGeometry(.21,1),coreMaterial);core.position.set(0,1.28,-.6);core.userData.hitZone='core';g.add(core);
 }
 if(type==='shield'){
  // Tower shield: a wide translucent plate in front, rear core exposed. Frontal hits read as 'armor'.
  const plate=box(g,1.5,2.1,.12,0,1.15,.72,new THREE.MeshStandardMaterial({color:0x9fc4ff,emissive:0x2d5fa8,emissiveIntensity:.9,transparent:true,opacity:.75}),'armor');g.userData.ownedMaterials.push(plate.material);
  box(g,1.55,.08,.16,0,2.22,.72,accent,'armor');
 }
 if(type==='hound'){
  // Hound: low quadruped frame, red eye lamp. The humanoid frame is dropped entirely so hits and the silhouette match.
  for(const m of g.children.slice())g.remove(m);legs.length=0;arms.length=0;
  box(g,.9,.5,1.3,0,.75,0,dark);box(g,.4,.3,.5,0,.9,.75,steel,'head');box(g,.16,.08,.05,0,.95,1.01,accent,'head');
  for(const [x,z] of [[-.35,.45],[.35,.45],[-.35,-.45],[.35,-.45]]){const l=box(g,.16,.5,.16,x,.25,z,steel);legs.push(l);}
  box(g,.1,.4,.1,0,1.2,-.3,dark);box(g,.12,.12,.12,0,1.42,-.3,accent);
 }
 if(type==='stalker'){
  // Stalker: slim frame, fins, no bright plates. Materials go transparent with distance in animateEnemy.
  box(g,.1,.7,.5,0,2.1,-.1,dark);box(g,.08,.1,.3,0,2.5,-.05,accent);
  for(const mat of [steel,dark])void mat;
  g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;g.userData.ownedMaterials.push(o.material);}});
 }
 if(type==='harborElite'){core.position.z=.63;box(g,.24,.18,.24,0,2.32,0,accent,'head');box(g,.25,.22,.9,.66,1.25,.36,dark);box(g,.25,.22,.9,-.66,1.25,.36,dark);}
 if(type==='ranged'){
  box(g,.12,.62,.12,-.4,2.08,0,dark);box(g,.15,.13,.15,-.4,2.39,0,accent);
  box(g,.2,.18,.92,.68,1.25,.34,dark);box(g,.21,.05,.35,.68,1.37,.38,accent);
 }else if(type==='assault'){
  box(g,.17,.16,.5,.65,1.15,.32,dark);box(g,.06,.2,.05,0,1.2,.35,accent);
 }else if(type==='drone'){
  // Swarm drone: stubby body, four accent rotor pods, no head plate.
  for(const [x,z] of [[-.55,-.35],[.55,-.35],[-.55,.35],[.55,.35]]){box(g,.28,.06,.28,x,2.05,z,accent);box(g,.08,.3,.08,x,1.9,z,dark);}
  box(g,.5,.12,.5,0,2.02,0,steel);box(g,.14,.14,.4,0,1.2,.4,accent);
 }else if(type==='sniper'){
  // Sniper: long barrel with a purple lens, kneeling stance is implied by the low arm.
  box(g,.14,.14,1.5,.62,1.28,.55,dark);box(g,.16,.08,.3,.62,1.4,.05,accent);box(g,.1,.1,.1,.62,1.28,1.32,accent);box(g,.2,.34,.2,0,2.28,0,dark);box(g,.12,.06,.12,0,2.47,0,accent);
 }
 if(boss){
  for(const side of [-1,1]){box(g,.24,.75,.34,side*.8,2.03,0,dark);box(g,.29,.09,.38,side*.8,2.29,0,accent);}
  core=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,0),coreMaterial);core.position.set(0,1.32,.54);core.userData.hitZone='core';g.add(core);
  const coreFrame=new THREE.Mesh(new THREE.TorusGeometry(.31,.045,6,24),steel);coreFrame.position.set(0,1.32,.49);g.add(coreFrame);
  const crown=new THREE.Mesh(new THREE.TorusGeometry(.44,.045,6,28),accent);crown.position.set(0,2.18,0);crown.rotation.x=Math.PI/2;g.add(crown);
 }
 g.userData.parts={legs,arms,accent,coreMaterial,core,fade:type==='stalker'?g.children.map(o=>o.material):null};return g;
}
export function stalkerOpacity(distance,stealth){if(!stealth)return 1;if(distance<=stealth.near)return 1;if(distance>=stealth.far)return .08;return 1-(distance-stealth.near)/(stealth.far-stealth.near)*.92;}
export function animateEnemy(enemy,time,walking,playerDistance=0){
 const p=enemy.group.userData.parts;if(!p||p.sentry)return;if(p.swarm){animateSwarm(enemy,time);return;}
 if(p.fade){const o=enemy.charge>0?1:stalkerOpacity(playerDistance,ENEMY_TYPES.stalker.stealth);for(const m of p.fade)m.opacity=o;}
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
