import * as THREE from './node_modules/three/build/three.module.js';
import {STAGES,SUPPLIES} from './mission.js';
import {createSupplyBadge,createSupplyMark} from './supply-badge.js';

export function createMissionWorld(scene,obstacles){
 const dark=new THREE.MeshStandardMaterial({color:0x29434f,roughness:.5,metalness:.3});
 const green=new THREE.MeshBasicMaterial({color:0x6bffd1}),amber=new THREE.MeshBasicMaterial({color:0xffb465});
 const baseGeometry=new THREE.BoxGeometry(1.8,1.4,1),boxGeometry=new THREE.BoxGeometry(.85,.5,.65);
 const orbGeometry=new THREE.IcosahedronGeometry(.18,0),ringGeometry=new THREE.TorusGeometry(.85,.035,6,40);
 const terminals=[],supplies=[],badgeRotation=new THREE.Quaternion();
 const medicalCase=new THREE.MeshStandardMaterial({color:0xd8e5e0,roughness:.65,metalness:.15});
 const medicalAccent=new THREE.MeshBasicMaterial({color:0xff4f60});
 const sites=STAGES.flatMap((stage,index)=>(stage.points||[stage]).map((point,node)=>({stage:{...stage,...point},index,node})));
 for(const {index,stage,node} of sites){
  if(stage.boss||stage.id==='extract')continue;
  const root=new THREE.Group();root.position.set(stage.x,stage.feetY||0,stage.z);root.rotation.y=stage.facing??(stage.feetY?Math.PI:0);scene.add(root);
  const base=new THREE.Mesh(baseGeometry,dark);base.position.y=.7;root.add(base);
  obstacles.push({x:stage.x,z:stage.z,w:1.8,d:1,h:(stage.feetY||0)+1.4,bottom:stage.feetY||0,top:(stage.feetY||0)+1.4,mesh:base,terminal:true});
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#061b24';ctx.fillRect(0,0,512,256);ctx.strokeStyle='#6debe1';ctx.lineWidth=8;ctx.strokeRect(8,8,496,240);
  ctx.fillStyle='#93fff0';ctx.font='bold 74px monospace';ctx.fillText('0'+(index+1),28,96);ctx.font='28px sans-serif';ctx.fillText(stage.short,28,156);ctx.fillStyle='#8baab4';ctx.font='20px monospace';ctx.fillText('HOLD E / INTERACT',28,208);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.75),new THREE.MeshBasicMaterial({map}));screen.position.set(0,1,.51);root.add(screen);
  const lamp=new THREE.Mesh(orbGeometry,new THREE.MeshBasicMaterial({color:0x537079}));lamp.position.y=1.75;root.add(lamp);
  terminals.push({stage,index,node,root,lamp,ctx,map,label:'HOLD E / INTERACT'});
 }
 const defenseStage=STAGES.find(s=>s.defenseDuration),radius=defenseStage.defenseRadius;
 const defenseRing=new THREE.Mesh(new THREE.RingGeometry(radius-.15,radius,96),new THREE.MeshBasicMaterial({color:0xffc176,side:THREE.DoubleSide,transparent:true,opacity:.45,depthWrite:false}));
 defenseRing.rotation.x=-Math.PI/2;defenseRing.position.set(defenseStage.x,(defenseStage.feetY||0)+.07,defenseStage.z);defenseRing.visible=false;scene.add(defenseRing);
 const extraction=STAGES.at(-1);
 const extractRing=new THREE.Mesh(new THREE.RingGeometry(2.1,2.35,64),new THREE.MeshBasicMaterial({color:0x335b61,side:THREE.DoubleSide,transparent:true,opacity:.7}));
 extractRing.rotation.x=-Math.PI/2;extractRing.position.set(extraction.x,(extraction.feetY||0)+.075,extraction.z);scene.add(extractRing);
 for(const def of SUPPLIES){
  const root=new THREE.Group();root.name='supply-'+def.id;root.userData.supplyType=def.type;root.position.set(def.x,(def.feetY||0)+.55,def.z);scene.add(root);
  const crate=new THREE.Mesh(boxGeometry,def.type==='health'?medicalCase:dark);crate.name='supply-crate';root.add(crate);
  const material=def.type==='health'?green:amber;
  const strip=new THREE.Mesh(new THREE.BoxGeometry(.65,.025,.67),def.type==='health'?medicalAccent:amber);strip.position.y=-.22;root.add(strip);
  const topMark=createSupplyMark(def.type,.62);topMark.name='supply-mark-top';topMark.rotation.x=-Math.PI/2;topMark.position.y=.257;root.add(topMark);
  const frontMark=createSupplyMark(def.type,.48);frontMark.name='supply-mark-front';frontMark.position.set(0,0,.346);root.add(frontMark);
  const badge=createSupplyBadge(def.type);badge.position.y=.88;root.add(badge);
  const ring=new THREE.Mesh(ringGeometry,material);ring.rotation.x=-Math.PI/2;ring.position.y=-.45;root.add(ring);
  supplies.push({...def,root,badge,collected:false});
 }
 function update(time,index,defending=false,nodeIndex=0,camera=null){
  if(camera)camera.getWorldQuaternion(badgeRotation);
  for(const t of terminals){const done=t.index<index||(t.index===index&&t.node<nodeIndex),locked=t.index>index||(t.index===index&&t.node>nodeIndex);t.lamp.material.color.setHex(done?0x74ffac:!locked?(defending?0xffc176:0x7ffff1):0x3b5461);t.lamp.rotation.y=time;
   const label=done?'LINK COMPLETE':locked?'SYSTEM LOCKED':defending?'DEFEND / '+radius+'M':'HOLD E / INTERACT';
   if(label!==t.label){t.label=label;t.ctx.fillStyle='#061b24';t.ctx.fillRect(20,175,475,52);t.ctx.fillStyle=defending&&t.index===index?'#ffd394':'#8baab4';t.ctx.font='20px monospace';t.ctx.fillText(label,28,208);t.map.needsUpdate=true;}
  }
  defenseRing.visible=Boolean(STAGES[index]?.defenseDuration)&&defending;
  for(const s of supplies)if(!s.collected){s.root.position.y=(s.feetY||0)+.55+Math.sin(time*2+s.x)*.08;if(camera)s.badge.quaternion.copy(badgeRotation);}
  extractRing.material.color.setHex(index>=4?0x77ffe3:0x335b61);
 }
 function reset(){for(const s of supplies){s.collected=false;s.root.visible=true;}}
 function collect(player,consume){
  for(const s of supplies)if(!s.collected&&Math.abs((player.y-1.7)-(s.feetY||0))<.7&&Math.hypot(player.x-s.x,player.z-s.z)<1.65){
   if(consume(s.type)){s.collected=true;s.root.visible=false;}
  }
 }
 function target(stage){return new THREE.Vector3(stage.x,(stage.feetY||0)+(stage.id==='extract'?.3:1.75),stage.z);}
 return {update,reset,collect,target,restore:ids=>{for(const s of supplies){s.collected=ids.includes(s.id);s.root.visible=!s.collected;}},get collected(){return supplies.filter(s=>s.collected).map(s=>s.id);},get available(){return supplies.filter(s=>!s.collected).map(({id,type,x,z})=>({id,type,x,z}));}};
}
