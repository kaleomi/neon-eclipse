import * as T from './node_modules/three/build/three.module.js';
import {HELI_PADS} from './helicopter-field.js';
// Two helipads (island shoulder, north shore) with an "H" marking; the active evacuation target pulses while mission 5 is in its helicopter stages.
export function buildHelipads(scene){
 const group=new T.Group(),nodes={};
 for(const [key,pad] of Object.entries(HELI_PADS)){
  const node=new T.Group();node.position.set(pad.x,pad.y+.03,pad.z);
  const disc=new T.Mesh(new T.CircleGeometry(pad.r,32),new T.MeshStandardMaterial({color:0x2e3a3c,roughness:.9}));disc.rotation.x=-Math.PI/2;disc.receiveShadow=true;node.add(disc);
  const ring=new T.Mesh(new T.RingGeometry(pad.r-.6,pad.r,32),new T.MeshBasicMaterial({color:0xf4c8ff}));ring.rotation.x=-Math.PI/2;ring.position.y=.02;node.add(ring);
  const bar=new T.MeshBasicMaterial({color:0xf4c8ff});
  for(const x of [-1.6,1.6]){const leg=new T.Mesh(new T.PlaneGeometry(.7,4.4),bar);leg.rotation.x=-Math.PI/2;leg.position.set(x,.03,0);node.add(leg);}
  const mid=new T.Mesh(new T.PlaneGeometry(3.2,.7),bar);mid.rotation.x=-Math.PI/2;mid.position.y=.03;node.add(mid);
  const beacon=new T.Mesh(new T.OctahedronGeometry(1.1),new T.MeshBasicMaterial({color:0xf4c8ff,transparent:true,opacity:.75,depthWrite:false}));beacon.position.y=6;beacon.visible=false;node.add(beacon);
  group.add(node);nodes[key]={node,beacon};
 }
 scene.add(group);
 return {update(m,time){const target=m.status==='active'?(m.stage==='heli'||m.stage==='lift'?'island':m.stage==='evac'||m.stage==='touchdown'?'shore':null):null;for(const [key,n] of Object.entries(nodes)){n.beacon.visible=key===target;n.beacon.rotation.y=time*.8;n.beacon.position.y=6+Math.sin(time*2)*.4;}},
  dispose(){scene.remove(group);group.traverse(o=>{o.geometry?.dispose();if(o.material&&!Array.isArray(o.material))o.material.dispose();});}};
}
