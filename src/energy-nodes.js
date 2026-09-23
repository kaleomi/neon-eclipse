import * as T from '../node_modules/three/build/three.module.js';
import {createDurability,overlapsRestoredPlayer} from './destructible-rules.js';
import {EMP} from './emp-rules.js';
import {applyEmp,empVisual} from './emp-world.js';
import {createEnvironmentPropLibrary,setEnvironmentPropState} from './environment-prop-models.js';
// One discharge per attempt, no health damage/ammo grant/chain reaction. Only
// the authored core is a target. The node's own solid is removed before EMP LOS.
export function createEnergyNodes(scene,obstacles,positions,{enemies,projectiles,onTopologyChange=()=>{},onPulse=()=>{}}){
 const records=[],lookup=new Map(),pending=[],propLibrary=createEnvironmentPropLibrary();
 for(const [i,[x,z]] of positions.entries()){
  const mesh=new T.Mesh(new T.BoxGeometry(.7,.7,.7),new T.MeshStandardMaterial({color:0x284b6d,emissive:0x4a81cb,emissiveIntensity:.45,metalness:.4,roughness:.38}));mesh.position.set(x,1.5,z);mesh.userData.energyNode=i;scene.add(mesh);
  // The original .7m cube remains the sole core target; authored detail never raycasts.
  mesh.material.visible=false;
  const base=new T.Mesh(new T.CylinderGeometry(.55,.7,.6,12),new T.MeshStandardMaterial({color:0x364f5f,metalness:.6,roughness:.35,emissive:0x112c37,emissiveIntensity:.25}));base.position.set(x,.3,z);scene.add(base);
  base.material.visible=false;const visual=propLibrary.create('node');visual.position.set(x,0,z);scene.add(visual);
  const halo=new T.Mesh(new T.TorusGeometry(.7,.025,6,32),new T.MeshBasicMaterial({color:0x8aadff}));halo.position.copy(mesh.position);scene.add(halo);
  const pulse=new T.Mesh(new T.SphereGeometry(EMP.radius,16,8),new T.MeshBasicMaterial({color:0x9eb4ff,wireframe:true,transparent:true,opacity:0,depthWrite:false}));pulse.position.copy(mesh.position);pulse.visible=false;scene.add(pulse);
  let label=null;if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const texture=new T.CanvasTexture(canvas);texture.minFilter=T.LinearFilter;texture.generateMipmaps=false;const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthWrite:false}));sprite.position.set(x,2.65,z);sprite.scale.set(3,.75,1);scene.add(sprite);label={ctx:canvas.getContext('2d'),texture,sprite};}
  const r={mesh,base,halo,pulse,label,visual,life:0,enabled:false,durability:createDurability(30),colliders:[{mesh,x,z,w:.7,d:.7,bottom:1.15,top:1.85,h:1.85},{mesh:base,x,z,w:1.4,d:1.4,bottom:0,top:.6,h:.6}]};records.push(r);lookup.set(mesh,r);paint(r);
 }
 function paint(r){const s=r.durability.snapshot();r.mesh.visible=r.enabled&&!s.broken;r.mesh.material.emissive.setHex(s.ratio<=1/3?0xd68c42:0x4a81cb);r.base.material.emissiveIntensity=s.broken?.04:.25;r.visual.visible=r.enabled;setEnvironmentPropState(r.visual,s.broken?'spent':s.ratio<=1/3?'low':'ready');r.halo.visible=r.enabled;r.halo.material.color.setHex(s.broken?0x354754:0x8aadff);if(!r.label)return;const c=r.label.ctx;c.clearRect(0,0,512,128);const g=c.createLinearGradient(0,0,0,128);g.addColorStop(0,'#35476c');g.addColorStop(.4,'#132638');g.addColorStop(1,'#07131e');c.beginPath();c.moveTo(20,3);c.lineTo(491,3);c.lineTo(509,21);c.lineTo(509,110);c.lineTo(493,125);c.lineTo(3,125);c.lineTo(3,18);c.closePath();c.fillStyle=g;c.fill();c.strokeStyle='#9fbfff';c.lineWidth=3;c.stroke();c.lineWidth=1;c.strokeStyle='#587b9c';c.strokeRect(12,12,488,104);c.fillStyle='#dcf0ff';c.textAlign='center';c.font='bold 32px sans-serif';c.fillText(s.broken?'EMP节点 · 已耗尽':`EMP节点 · ${Math.ceil(s.hp)} / 30`,256,48);c.font='24px sans-serif';c.fillText(s.broken?'重试复原 · 无补给掉落':'击破核心 · 6m机械瘫痪3秒',256,98);r.label.texture.needsUpdate=true;}
 function remove(r,all=false){let changed=false;for(const o of all?r.colliders:[r.colliders[0]]){const i=obstacles.indexOf(o);if(i>=0){obstacles.splice(i,1);changed=true;}}return changed;}
 function suspend(){pending.length=0;let changed=false;for(const r of records){changed=remove(r,true)||changed;r.enabled=false;r.mesh.visible=r.base.visible=r.halo.visible=r.pulse.visible=r.visual.visible=false;r.life=0;if(r.label)r.label.sprite.visible=false;}if(changed)onTopologyChange();}
 function reset(player=null){suspend();let changed=false;for(const r of records){r.durability.reset();r.enabled=!r.colliders.some(o=>overlapsRestoredPlayer(o,player)||obstacles.some(b=>Math.abs(o.x-b.x)<(o.w+b.w)/2&&Math.abs(o.z-b.z)<(o.d+b.d)/2&&(o.bottom??0)<(b.top??b.h)&&(o.top??o.h)>(b.bottom??0)));r.base.visible=r.enabled;if(r.enabled){obstacles.push(...r.colliders);changed=true;}paint(r);}if(changed)onTopologyChange();}
 function hit(mesh,damage){const r=lookup.get(mesh);if(!r?.enabled)return null;const s=r.durability.hit(damage);if(!s.changed)return s;if(s.newlyBroken){if(remove(r))onTopologyChange();pending.push(r);}paint(r);return s;}
 function flush(){while(pending.length){const r=pending.shift();const affected=applyEmp(r.mesh.position,enemies,obstacles,projectiles);affected.forEach(e=>empVisual(e,true));r.life=.55;r.pulse.visible=true;onPulse(affected.length);}}
 function step(dt,camera,playing){for(const r of records){if(playing){r.life=Math.max(0,r.life-Math.max(0,dt));r.pulse.visible=r.life>0;r.pulse.material.opacity=.24*r.life/.55;r.halo.rotation.y+=dt*.5;}if(r.label)r.label.sprite.visible=playing&&r.enabled&&r.mesh.position.distanceTo(camera.position)<14;}}
 reset();return {hit,flush,step,reset,suspend,isTarget:m=>{const r=lookup.get(m);return !!r?.enabled&&!r.durability.snapshot().broken;},snapshot:()=>records.map(r=>({...r.durability.snapshot(),enabled:r.enabled,colliders:r.colliders.filter(o=>obstacles.includes(o)).length}))};
}
