import * as T from '../node_modules/three/build/three.module.js';
import {FLIGHT_MISSION} from './flight-mission.js';
export function buildFlightMissionWorld(scene){
 const group=new T.Group(),g=FLIGHT_MISSION.approach,r=FLIGHT_MISSION.runway;
 const material=new T.MeshBasicMaterial({color:0x7efce6,transparent:true,opacity:.85});
 const ring=new T.Mesh(new T.TorusGeometry(g.radius,.45,8,56),material);ring.position.set(g.x,g.y,g.z);group.add(ring);
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=96;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#082b35';ctx.fillRect(0,0,640,96);ctx.fillStyle='#a4ffea';ctx.textAlign='center';ctx.font='bold 30px "Microsoft YaHei",sans-serif';ctx.fillText('返航进场 · 对正北向 N',320,57);
 const texture=new T.CanvasTexture(canvas),label=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:true}));label.scale.set(44,6.6,1);label.position.set(g.x,g.y+25,g.z);group.add(label);
 const vertices=[r.minX,.13,r.minZ,r.maxX,.13,r.minZ,r.maxX,.13,r.maxZ,r.minX,.13,r.maxZ];
 const line=new T.LineLoop(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices,3)),new T.LineBasicMaterial({color:0x7efce6}));group.add(line);
 for(const z of [-200,-300]){const arrow=new T.Mesh(new T.ConeGeometry(3,10,3),material);arrow.rotation.x=-Math.PI/2;arrow.position.set(-300,.25,z);group.add(arrow);}
 scene.add(group);
 return {update(m,time){group.visible=m.status!=='idle'&&['approach','landing','stop','upload','complete'].includes(m.phase);ring.visible=label.visible=m.phase==='approach';material.opacity=.65+Math.sin(time*2)*.15;},dispose(){scene.remove(group);group.traverse(o=>o.geometry?.dispose());material.dispose();line.material.dispose();label.material.dispose();texture.dispose();}};
}
