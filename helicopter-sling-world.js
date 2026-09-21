// Sling-load rendering: cargo crate, cable line from the belly hook, drop-zone rings. Reads rule state only.
import * as T from './node_modules/three/build/three.module.js';
import {SLING,SLING_ZONES} from './helicopter-sling.js';
import {HELICOPTER} from './helicopter-rules.js';
export function createSlingModel(scene,sling){
 const root=new T.Group();root.name='sling';scene.add(root);
 const crateMat=new T.MeshStandardMaterial({color:0xc98a3a,roughness:.7,metalness:.1}),brokenMat=new T.MeshStandardMaterial({color:0x5a4a3a,roughness:.9}),podMat=new T.MeshStandardMaterial({color:0xf2f4f6,roughness:.5,metalness:.2,emissive:0xd0202a,emissiveIntensity:.35});
 const crate=new T.Mesh(new T.BoxGeometry(2.2,SLING.cargoHeight,2.2),crateMat);crate.castShadow=true;root.add(crate);
 const strap=new T.Mesh(new T.BoxGeometry(2.4,.12,.3),new T.MeshStandardMaterial({color:0x2a2f33}));strap.position.y=SLING.cargoHeight/2;crate.add(strap);
 const cableGeo=new T.BufferGeometry();cableGeo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(6),3));
 const cable=new T.Line(cableGeo,new T.LineBasicMaterial({color:0xe8eef0}));cable.visible=false;root.add(cable);
 const ringMat=new T.MeshBasicMaterial({color:0x7fd3ff,transparent:true,opacity:.55,side:T.DoubleSide});const targetMat=new T.MeshBasicMaterial({color:0xffc857,transparent:true,opacity:.7,side:T.DoubleSide});
 const rings=SLING_ZONES.map(z=>{const g=new T.Group();g.position.set(z.x,0,z.z);const r=new T.Mesh(new T.RingGeometry(SLING.zoneRadius-.6,SLING.zoneRadius,40),ringMat);r.rotation.x=-Math.PI/2;r.position.y=.08;g.add(r);const h=new T.Mesh(new T.BoxGeometry(1.4,.1,1.4),ringMat);h.position.y=.1;g.add(h);root.add(g);return {g,ring:r,zone:z};});
 const ground=(x,z)=>0;
 return {root,crate,cable,rings,
  update(s,h,time,groundAt=ground,target=null){
   const c=s.cargo;crate.position.set(c.x,c.y+SLING.cargoHeight/2,c.z);crate.material=!c.intact?brokenMat:c.kind==='casualty'?podMat:crateMat;
   crate.rotation.y=s.hooked?Math.atan2(c.vx,c.vz)*.15:0;crate.rotation.z=s.hooked?-(c.vx||0)*.02:0;crate.rotation.x=s.hooked?(c.vz||0)*.02:0;
   cable.visible=s.hooked;
   if(s.hooked){const p=cable.geometry.attributes.position.array;p[0]=h.x;p[1]=h.y-HELICOPTER.height*.35;p[2]=h.z;p[3]=c.x;p[4]=c.y+SLING.cargoHeight;p[5]=c.z;cable.geometry.attributes.position.needsUpdate=true;}
   for(const r of rings){const y=groundAt(r.zone.x,r.zone.z);r.g.position.y=y;const active=!!target&&target.id===r.zone.id;r.ring.material=active?targetMat:ringMat;r.ring.material.opacity=active?.5+.3*Math.sin(time*4):.4+.2*Math.sin(time*2);r.g.visible=true;}
  }};
}
