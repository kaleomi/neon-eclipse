// Optional P4 geometry. All resources are owned here; base chapter/Boss assets are untouched.
import * as T from './node_modules/three/build/three.module.js';
import {seeded} from './p4-catalog.js';
export function createP4World({scene,camera,obstacles,enemies=[],invalidate,canOccupy}){
 const root=new T.Group();root.name='p4-world';scene.add(root);const ownBoxes=[];let targets=[];
 const material=new T.MeshStandardMaterial({color:0x132b36,metalness:.7,roughness:.3,emissive:0x10444e,emissiveIntensity:.4});
 const ghost=new T.Group(),gm=new T.MeshBasicMaterial({color:0x68f8e4,transparent:true,opacity:.28,depthWrite:false});
 const body=new T.Mesh(new T.CylinderGeometry(.24,.3,1.1,8),gm),head=new T.Mesh(new T.SphereGeometry(.2,10,8),gm);body.position.y=-.75;head.position.y=-.1;const flash=new T.Mesh(new T.ConeGeometry(.12,.6,6),new T.MeshBasicMaterial({color:0xf9e4a4,transparent:true,opacity:.5}));flash.rotation.x=-Math.PI/2;flash.position.set(.3,-.7,-.6);ghost.add(body,head,flash);ghost.visible=false;root.add(ghost);
 const arc=new T.Mesh(new T.RingGeometry(1.5,1.55,36,1,-Math.PI*.3,Math.PI*.6),new T.MeshBasicMaterial({color:0xffd282,transparent:true,opacity:.55,side:T.DoubleSide,depthWrite:false}));arc.rotation.x=-Math.PI/2;arc.visible=false;root.add(arc);
 function clearLayout(){for(const box of ownBoxes){const i=obstacles.indexOf(box);if(i>=0)obstacles.splice(i,1);root.remove(box.mesh);box.mesh.geometry.dispose();}ownBoxes.length=0;invalidate();}
 return {
  ghost(p){ghost.visible=!!p&&!p.finished;if(p){ghost.position.set(p.x,p.y,p.z);ghost.rotation.y=p.yaw;flash.visible=!!(p.input&256);body.rotation.z=(p.input&4?-.08:0)+(p.input&8?.08:0);}},
  melee(enabled,yaw,range){arc.visible=enabled;if(enabled){arc.scale.setScalar(range/1.55);arc.position.set(camera.position.x,camera.position.y-1.65,camera.position.z);arc.rotation.z=Math.PI/2+yaw; }},
  layout(seed,origin){clearLayout();const r=seeded(seed),pattern=Math.floor(r()*3);for(let i=0;i<6;i++){
   const angle=(i/6*Math.PI*2)+(pattern*Math.PI/6),radius=7+pattern*2,x=origin.x+Math.sin(angle)*radius,z=origin.z+Math.cos(angle)*radius,w=pattern===1?1.4:2.5,d=pattern===2?3:1.4,h=1.1;
   if(Math.hypot(x,z)>37||!canOccupy(x,z,origin.feetY||0)||Math.hypot(x-camera.position.x,z-camera.position.z)<5)continue;
   if(enemies.some(e=>Math.abs(e.group.position.y-(origin.feetY||0))<1.5&&Math.abs(e.group.position.x-x)<w/2+(e.radius||.7)+.5&&Math.abs(e.group.position.z-z)<d/2+(e.radius||.7)+.5))continue;const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.name='p4-cover';mesh.position.set(x,(origin.feetY||0)+h/2,z);root.add(mesh);const box={x,z,w,d,h:(origin.feetY||0)+h,bottom:origin.feetY||0,top:(origin.feetY||0)+h,mesh};ownBoxes.push(box);obstacles.push(box);
  }invalidate();return {pattern,count:ownBoxes.length};},
  targets(enemies){for(const m of targets){m.parent?.remove(m);m.geometry.dispose();m.material.dispose();}targets=[];for(const enemy of enemies){const m=new T.Mesh(new T.TorusGeometry(.3,.025,6,24),new T.MeshBasicMaterial({color:0xffd482,transparent:true,opacity:.8,depthWrite:false}));m.position.y=1.94;m.raycast=()=>{};m.userData.combatDecoration=true;enemy.group.add(m);targets.push(m);}},
  clearLayout,
  dispose(){clearLayout();root.traverse(o=>{o.geometry?.dispose();});material.dispose();gm.dispose();arc.material.dispose();for(const m of targets){m.parent?.remove(m);m.geometry.dispose();m.material.dispose();}scene.remove(root);}
 };
}
