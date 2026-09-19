import * as T from './node_modules/three/build/three.module.js';
import {LIGHTHOUSE_ISLAND,ISLAND_PIER,footHeight} from './maritime-rules.js';
import {LIGHTHOUSE_POINTS} from './lighthouse-mission.js';
// Static lighthouse island dressing (always visible) plus stage markers (only while mission 5 is active).
export function buildLighthouseWorld(scene){
 const group=new T.Group(),island=LIGHTHOUSE_ISLAND,top=island.h;
 const std=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.7,...extra});
 const pierMat=std(0x6f6350),towerMat=std(0xe6e2d6),bandMat=std(0xb63a2f),lampMat=new T.MeshBasicMaterial({color:0xfff2b0});
 // Pier: a sloped plank from water level (north end) up to the island top (matches footHeight ramp along z).
 const length=ISLAND_PIER.maxZ-ISLAND_PIER.minZ,width=ISLAND_PIER.maxX-ISLAND_PIER.minX,rise=top-ISLAND_PIER.low;
 const pier=new T.Mesh(new T.BoxGeometry(width,.4,Math.hypot(length,rise)),pierMat);
 pier.position.set((ISLAND_PIER.minX+ISLAND_PIER.maxX)/2,ISLAND_PIER.low+rise/2-.2,(ISLAND_PIER.minZ+ISLAND_PIER.maxZ)/2);pier.rotation.x=-Math.atan2(rise,length);pier.receiveShadow=true;group.add(pier);
 for(let i=0;i<=4;i++){const z=ISLAND_PIER.minZ+length*i/4,h=footHeight((ISLAND_PIER.minX+ISLAND_PIER.maxX)/2,z);for(const x of [ISLAND_PIER.minX+.4,ISLAND_PIER.maxX-.4]){const post=new T.Mesh(new T.CylinderGeometry(.18,.18,h+1.2,6),pierMat);post.position.set(x,(h+1.2)/2-.6,z);group.add(post);}}
 // Lighthouse tower on the island centre.
 const tower=new T.Mesh(new T.CylinderGeometry(2.4,3.2,16,16),towerMat);tower.position.set(island.x,top+8,island.z);tower.castShadow=true;group.add(tower);
 for(const y of [4,10]){const band=new T.Mesh(new T.CylinderGeometry(2.75-y*.03,2.9-y*.03,1.4,16),bandMat);band.position.set(island.x,top+y,island.z);group.add(band);}
 const lamp=new T.Mesh(new T.CylinderGeometry(1.6,1.6,2.2,12),lampMat);lamp.position.set(island.x,top+17,island.z);group.add(lamp);
 const beam=new T.Mesh(new T.ConeGeometry(4,26,12,1,true),new T.MeshBasicMaterial({color:0xfff2b0,transparent:true,opacity:.14,depthWrite:false,side:T.DoubleSide}));beam.rotation.z=Math.PI/2;beam.position.set(island.x+13,top+17,island.z);const beamPivot=new T.Group();beamPivot.position.set(island.x,0,island.z);beam.position.set(13,top+17,0);beamPivot.add(beam);group.add(beamPivot);
 // Survey props: crate, signal lamp post, oil tank.
 const crate=new T.Mesh(new T.BoxGeometry(2.2,1.4,1.6),std(0x8a7a42));crate.position.set(LIGHTHOUSE_POINTS['survey-1'].x,top+.7,LIGHTHOUSE_POINTS['survey-1'].z);group.add(crate);
 const post=new T.Mesh(new T.CylinderGeometry(.16,.2,4,8),std(0x4a5257));post.position.set(LIGHTHOUSE_POINTS['survey-2'].x,top+2,LIGHTHOUSE_POINTS['survey-2'].z);group.add(post);
 const tank=new T.Mesh(new T.CylinderGeometry(1.5,1.5,2.4,14),std(0x5b6f5a));tank.position.set(LIGHTHOUSE_POINTS['survey-3'].x,top+1.2,LIGHTHOUSE_POINTS['survey-3'].z);group.add(tank);
 // Stage markers.
 const markerMat=new T.MeshBasicMaterial({color:0x9df5c6,transparent:true,opacity:.8,depthWrite:false}),markers=new T.Group(),nodes={};
 for(const [key,g] of Object.entries(LIGHTHOUSE_POINTS)){const node=new T.Group();node.position.set(g.x,g.y-1,g.z);const ring=new T.Mesh(new T.TorusGeometry(key==='sail'||key==='reboard'?12:4,.35,6,64),markerMat);ring.rotation.x=Math.PI/2;ring.position.y=.3;node.add(ring);const beacon=new T.Mesh(new T.OctahedronGeometry(1.3),markerMat);beacon.position.y=5;node.add(beacon);markers.add(node);nodes[key]=node;}
 group.add(markers);scene.add(group);
 return {update(m,time){beamPivot.rotation.y=time*.6;markers.visible=m.status==='active';for(const [key,node] of Object.entries(nodes)){node.visible=key===m.stage;node.children[1].rotation.y=time*.5;}},
  dispose(){scene.remove(group);group.traverse(o=>{o.geometry?.dispose();if(o.material&&!Array.isArray(o.material))o.material.dispose();});}};
}
