import * as T from './node_modules/three/build/three.module.js';
import {reconVolume} from './vehicle-guidance.js';
import {RECON,RECON_TARGETS} from './recon-rules.js';
// Non-solid holographic survey markers; no new obstacles or flight-physics changes.
export function buildReconWorld(scene){
 const group=new T.Group(),owned=[];
 const markers=RECON_TARGETS.map((target,i)=>{
  const marker=new T.Group();marker.position.set(target.x,0,target.z);group.add(marker);
  const material=new T.MeshBasicMaterial({color:0x7deee4,transparent:true,opacity:.75,side:T.DoubleSide});owned.push(material);
  const pad=new T.Mesh(new T.RingGeometry(7,9,40),material);pad.rotation.x=-Math.PI/2;pad.position.y=.5;marker.add(pad);
  const perimeter=new T.Mesh(new T.RingGeometry(RECON.radius-.6,RECON.radius,96),material);perimeter.rotation.x=-Math.PI/2;perimeter.position.y=.45;marker.add(perimeter);
  const volume=reconVolume(target),zone=new T.Group();marker.add(zone);
  const shellMaterial=new T.MeshBasicMaterial({color:0xffd778,transparent:true,opacity:.09,side:T.DoubleSide,depthWrite:false,fog:false});owned.push(shellMaterial);
  const shell=new T.Mesh(new T.CylinderGeometry(volume.radius,volume.radius,volume.height,64,1,true),shellMaterial);shell.position.y=(volume.bottom+volume.top)/2;zone.add(shell);
  const edgeMaterial=new T.MeshBasicMaterial({color:0xffdf86,transparent:true,opacity:.9,depthWrite:false,fog:false});owned.push(edgeMaterial);
  for(const height of [volume.bottom,volume.top]){const ring=new T.Mesh(new T.TorusGeometry(volume.radius,.45,5,96),edgeMaterial);ring.rotation.x=Math.PI/2;ring.position.y=height;zone.add(ring);}
  const vertices=[];for(let j=0;j<16;j++){const a=j*Math.PI/8,x=Math.cos(a)*volume.radius,z=Math.sin(a)*volume.radius;vertices.push(x,volume.bottom,z,x,volume.top,z);}
  const lineMaterial=new T.LineBasicMaterial({color:0xffdf86,transparent:true,opacity:.6,depthWrite:false,fog:false});owned.push(lineMaterial);zone.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices,3)),lineMaterial));
  const course=new T.Group();course.name='recon-course-arrow';course.rotation.y=-target.yaw;course.position.y=(volume.bottom+volume.top)/2;zone.add(course);
  const courseMaterial=new T.MeshBasicMaterial({color:0xffdf86,transparent:true,opacity:.6,depthWrite:false,fog:false});owned.push(courseMaterial);
  for(const z of [-38,0,38]){const shaft=new T.Mesh(new T.CylinderGeometry(.65,.65,14,6),courseMaterial);shaft.rotation.x=-Math.PI/2;shaft.position.z=z+3;course.add(shaft);const head=new T.Mesh(new T.ConeGeometry(3.5,9,4),courseMaterial);head.rotation.x=-Math.PI/2;head.position.z=z-8;course.add(head);}
  const hc=document.createElement('canvas');hc.width=768;hc.height=192;const hctx=hc.getContext('2d');hctx.fillStyle='#0b2638ed';hctx.fillRect(0,0,768,192);hctx.textAlign='center';hctx.fillStyle='#ffe0a0';hctx.font='bold 44px sans-serif';hctx.fillText((i+1)+' · '+target.name,384,64);hctx.font='bold 38px sans-serif';hctx.fillText('侦察高度 '+target.minHeight+'–'+target.maxHeight+' m',384,120);hctx.font='26px sans-serif';hctx.fillText('圆柱内稳定飞行 · 按住 F 扫描',384,165);
  const ht=new T.CanvasTexture(hc);ht.colorSpace=T.SRGBColorSpace;const hm=new T.SpriteMaterial({map:ht,depthTest:false,depthWrite:false,fog:false});owned.push(ht,hm);const heightLabel=new T.Sprite(hm);heightLabel.scale.set(94,23.5,1);heightLabel.position.y=volume.top+16;zone.add(heightLabel);
  const diamond=new T.Mesh(new T.OctahedronGeometry(3),material);diamond.position.y=6;marker.add(diamond);
  const arrow=new T.Mesh(new T.ConeGeometry(3,12,3),material);arrow.rotation.x=-Math.PI/2;const direction=new T.Group();direction.rotation.y=-target.yaw;direction.position.set(0,.6,-18);direction.add(arrow);marker.add(direction);
  const c=document.createElement('canvas');c.width=640;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#092d3be6';ctx.fillRect(0,0,640,96);ctx.fillStyle='#b9fff0';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('SCAN '+(i+1)+' · '+target.name,320,58);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const sm=new T.SpriteMaterial({map:texture,depthTest:true});owned.push(texture,sm);const label=new T.Sprite(sm);label.scale.set(48,7.2,1);label.position.y=19;marker.add(label);
  return {marker,perimeter,material,diamond,label,heightLabel,zone,shellMaterial,edgeMaterial,lineMaterial,courseMaterial};
 });scene.add(group);
 return {update(m,time,camera){group.visible=m.type==='recon'&&m.status!=='idle';markers.forEach((x,i)=>{const active=['takeoff','route'].includes(m.phase)&&m.route.index===i;x.zone.visible=active;const ready=active&&m.phase==='route'&&['hold','ready'].includes(m.recon.reason),color=ready?0x73ffe0:0xffdf86;x.edgeMaterial.color.setHex(color);x.lineMaterial.color.setHex(color);x.shellMaterial.color.setHex(color);x.courseMaterial.color.setHex(color);x.shellMaterial.opacity=ready?.13:.09;x.label.visible=!active;if(camera){const d=Math.hypot(camera.position.x-RECON_TARGETS[i].x,camera.position.y-RECON_TARGETS[i].maxHeight-17.3,camera.position.z-RECON_TARGETS[i].z),scale=Math.min(1,d/250);x.heightLabel.scale.set(94*scale,23.5*scale,1);}x.perimeter.visible=active;x.material.color.setHex(i<m.route.index?0x66a892:active?0x8cfff0:0x557890);x.material.opacity=active?.7+Math.sin(time*3)*.15:.4;x.diamond.rotation.y=time*.4;});},dispose(){scene.remove(group);group.traverse(o=>o.geometry?.dispose());for(const o of owned)o.dispose();}};
}
