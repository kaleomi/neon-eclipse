import * as T from 'three';
import {helicopterDoors} from './helicopter-transfer.js';
import {HANDOVER_TERMINAL} from './helicopter-handover.js';

export function createHelicopterTransferWorld(){
  const root=new T.Group();root.name='H02Transfer';const pilot=new T.Group();root.add(pilot);
  const suit=new T.MeshStandardMaterial({color:0xf0bc70,roughness:.8}),dark=new T.MeshStandardMaterial({color:0x223c40}),glass=new T.MeshStandardMaterial({color:0x90d9d2});
  function body(geometry,material,x,y,z){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);pilot.add(m);return m;}
  body(new T.CylinderGeometry(.23,.28,.76,8),suit,0,.82,0);
  body(new T.SphereGeometry(.23,10,8),dark,0,1.35,0);
  body(new T.BoxGeometry(.33,.16,.12),glass,0,1.38,-.2);
  for(const x of [-.14,.14])body(new T.BoxGeometry(.19,.54,.22),dark,x,.28,0);
  const markerMaterial=new T.MeshBasicMaterial({color:0x9ce6d6,transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false});
  const doors=[0,1].map(()=>{const m=new T.Mesh(new T.RingGeometry(.5,.62,24),markerMaterial);m.rotation.x=-Math.PI/2;m.position.y=.16;root.add(m);return m;});
  const terminal=new T.Group();terminal.position.set(HANDOVER_TERMINAL.x,.17,HANDOVER_TERMINAL.z);root.add(terminal);
  const ring=new T.Mesh(new T.RingGeometry(1.8,2.2,32),markerMaterial);ring.rotation.x=-Math.PI/2;terminal.add(ring);
  // Holographic checkpoint, not an invisible solid obstacle.
  const beacon=new T.Mesh(new T.OctahedronGeometry(.5),new T.MeshBasicMaterial({color:0xf0bc70,wireframe:true}));beacon.position.y=1.8;terminal.add(beacon);
  return {root,pilot,doors,terminal,update(transfer,craft,task){
    pilot.visible=transfer.seat==='foot';pilot.position.set(transfer.walker.x,.14,transfer.walker.z);pilot.rotation.y=-transfer.walker.yaw;
    helicopterDoors(craft).forEach((p,i)=>{doors[i].position.set(p.x,.16,p.z);doors[i].visible=craft.grounded;});
    terminal.visible=task.stage===1;beacon.rotation.y=task.elapsed*.5;
  }};
}
