import * as T from './node_modules/three/build/three.module.js';
import {SEA_GUN} from './sea-combat.js';
function turret(color){
 const root=new T.Group(),material=new T.MeshStandardMaterial({color,roughness:.48,metalness:.5});
 const base=new T.Mesh(new T.CylinderGeometry(.65,.85,.35,12),material);root.add(base);
 const housing=new T.Mesh(new T.BoxGeometry(1.1,.7,1.5),material);housing.position.y=.35;root.add(housing);
 const barrel=new T.Mesh(new T.CylinderGeometry(.12,.18,2.7,10),material);barrel.rotation.x=Math.PI/2;barrel.position.set(0,.45,-1.65);root.add(barrel);
 const flash=new T.Mesh(new T.SphereGeometry(.5,8,6),new T.MeshBasicMaterial({color:0xffd795}));flash.position.set(0,.45,-3);root.add(flash);return {root,flash};
}
export function buildSeaCombatWorld(scene,{showPlayerGun=true}={}){
 const root=new T.Group();scene.add(root);const playerGun=turret(0xc1d1cb),enemyGun=turret(0x694139);root.add(playerGun.root,enemyGun.root);
 const linePositions=new Float32Array(6),lineGeo=new T.BufferGeometry();lineGeo.setAttribute('position',new T.BufferAttribute(linePositions,3));const line=new T.Line(lineGeo,new T.LineBasicMaterial({color:0xff7954,transparent:true,opacity:.8}));line.frustumCulled=false;root.add(line);
 const aim=new T.Mesh(new T.TorusGeometry(5,.35,6,32),new T.MeshBasicMaterial({color:0xffb15c,transparent:true,opacity:.85}));aim.rotation.x=Math.PI/2;root.add(aim);
 const sphereGeo=new T.SphereGeometry(.48,8,6),trailGeo=new T.BoxGeometry(.2,.2,2.8),cyan=new T.MeshBasicMaterial({color:0xaafff3}),orange=new T.MeshBasicMaterial({color:0xff794d});
 const rounds=Array.from({length:SEA_GUN.maxProjectiles},()=>{const group=new T.Group(),head=new T.Mesh(sphereGeo,cyan),trail=new T.Mesh(trailGeo,cyan);trail.position.z=1.5;group.add(head,trail);root.add(group);return {group,head,trail};});
 const rings=Array.from({length:16},()=>{const ring=new T.Mesh(new T.TorusGeometry(1,.1,5,20),new T.MeshBasicMaterial({color:0xbfe6df,transparent:true,opacity:.8}));ring.rotation.x=Math.PI/2;root.add(ring);return ring;});
 const smoke=new T.Group();for(let i=0;i<5;i++){const cloud=new T.Mesh(new T.SphereGeometry(1.5,8,6),new T.MeshBasicMaterial({color:0x444951,transparent:true,opacity:.5,depthWrite:false}));cloud.position.set(Math.sin(i)*1.5,i*1.4,Math.cos(i)*1.5);smoke.add(cloud);}root.add(smoke);
 function place(gun,ship,target,flash){gun.root.position.set(ship.x,2.9,ship.z);gun.root.rotation.y=-Math.atan2(target.x-ship.x,-(target.z-ship.z));gun.flash.visible=flash>0;}
 return {update(task,player,time,aimTarget=null,flashOverride=null){
  const s=task.combat;root.visible=task.status!=='idle'&&s?.enabled;if(!root.visible)return;
  place(playerGun,player,aimTarget||task.enemy,flashOverride??s.playerFlash);playerGun.root.visible=showPlayerGun;place(enemyGun,task.enemy,s.warning?.target||player,s.enemyFlash);enemyGun.root.visible=!s.enemySunk;
  line.visible=aim.visible=!!s.warning;
  if(s.warning){const t=s.warning.target;linePositions.set([task.enemy.x,3.2,task.enemy.z,t.x,1,t.z]);lineGeo.attributes.position.needsUpdate=true;aim.position.set(t.x,.55,t.z);aim.scale.setScalar(1+Math.sin(time*12)*.08);}
  rounds.forEach((round,index)=>{const p=s.projectiles[index];round.group.visible=!!p;if(!p)return;round.group.position.set(p.x,2.8,p.z);round.group.rotation.y=-Math.atan2(p.vx,-p.vz);round.head.material=round.trail.material=p.owner==='player'?cyan:orange;});
  rings.forEach((ring,index)=>{const effect=s.effects[index];ring.visible=!!effect;if(!effect)return;ring.position.set(effect.x,.3,effect.z);ring.scale.setScalar((1-effect.life/.45)*(effect.kind==='sunk'?18:5)+.5);ring.material.opacity=effect.life/.45;ring.material.color.setHex(effect.kind==='water'?0xbde9e4:0xffc581);});
  smoke.visible=s.enemySunk&&s.sunkTime<3;smoke.position.set(task.enemy.x,3+s.sunkTime*1.3,task.enemy.z);smoke.scale.setScalar(1+s.sunkTime*.5);smoke.children.forEach(cloud=>cloud.material.opacity=Math.max(0,.5-s.sunkTime/6));
 }};
}
