import * as T from '../node_modules/three/build/three.module.js';
import {createYachtModel} from './sea-air-world.js';
import {CHASE_GATES,CHASE_EVAC} from './chase-rules.js';
function label(text,color){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#112a32';ctx.fillRect(0,0,512,128);ctx.strokeStyle=color;ctx.lineWidth=8;ctx.strokeRect(4,4,504,120);ctx.fillStyle=color;ctx.textAlign='center';ctx.font='bold 48px sans-serif';ctx.fillText(text,256,83);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:true}));sprite.scale.set(20,5,1);return sprite;
}
export function buildChaseWorld(scene,{showMarkers=true,role='pursuer'}={}){
 const enemy=createYachtModel(scene,{hostile:true}),tag=label(role==='interceptor'?'拦截艇':'追击艇',role==='interceptor'?'#c5b5ff':'#ff9d80');tag.position.set(0,8,0);tag.scale.set(14,3.5,1);enemy.root.add(tag);
 if(role==='interceptor')enemy.root.traverse(mesh=>{if(mesh.isMesh&&mesh.material?.color){const color=mesh.material.color.getHex();if(color===0x38454b)mesh.material.color.setHex(0x393552);if(color===0xe77d5f)mesh.material.color.setHex(0x967cf1);}});
 const root=new T.Group();scene.add(root);
 const markers=(showMarkers?[...CHASE_GATES,CHASE_EVAC]:[]).map((gate,index)=>{
  const group=new T.Group(),material=new T.MeshBasicMaterial({color:0xf6c478,transparent:true,opacity:.75,depthWrite:false});
  const ring=new T.Mesh(new T.TorusGeometry(index===3?24:23,.45,6,64),material);ring.rotation.x=Math.PI/2;ring.position.y=.5;group.add(ring);
  const text=label(index===3?'撤离 / EXIT':'追逐 '+String(index+1).padStart(2,'0'),index===3?'#b6ffd7':'#ffd497');text.position.y=12;group.add(text);
  for(const x of [-23,23]){const buoy=new T.Mesh(new T.CylinderGeometry(.5,1.3,3,8),material);buoy.position.set(x,1,0);group.add(buoy);}
  group.position.set(gate.x,0,gate.z);root.add(group);return {group,material};
 });
 return {update(task,time){const visible=task.status!=='idle';root.visible=visible;enemy.root.visible=visible;enemy.wake.visible=visible;if(!visible)return;enemy.update(task.enemy,time);if(task.combat?.enemySunk){enemy.root.position.y-=Math.min(4,task.combat.sunkTime*1.3);enemy.root.rotation.z+=Math.min(.5,task.combat.sunkTime*.2);enemy.root.visible=task.combat.sunkTime<3;enemy.wake.visible=false;}markers.forEach((marker,index)=>{marker.group.position.y=Math.sin(time*1.3+index)*.12;marker.material.color.setHex(index<task.index?0x416d65:index===task.index?0xc9ffe2:0xe5b979);marker.material.opacity=index===task.index?.9:.3;});}};
}
