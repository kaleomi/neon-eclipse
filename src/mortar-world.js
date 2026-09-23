import * as THREE from '../node_modules/three/build/three.module.js';
// Red ground circles for artillery mortar telegraphs. Purely visual; timing lives in enemy-ai.js.
export function createMortarMarkers(scene){
 const rings=new Map();
 const geometry=new THREE.RingGeometry(2.85,3,48),material=new THREE.MeshBasicMaterial({color:0xff3a2a,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false});
 const fill=new THREE.CircleGeometry(3,48),fillMaterial=new THREE.MeshBasicMaterial({color:0xff3a2a,transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false});
 function telegraph({x,z,radius=3,seconds=2,owner,y=0}){
  const g=new THREE.Group();g.name='MORTAR_TELEGRAPH';const ring=new THREE.Mesh(geometry,material.clone()),disc=new THREE.Mesh(fill,fillMaterial.clone());for(const m of [ring,disc]){m.rotation.x=-Math.PI/2;m.raycast=()=>{};m.scale.setScalar(radius/3);}
  g.add(disc,ring);g.position.set(x,y+.04,z);scene.add(g);rings.set(g,{remaining:seconds,total:seconds,ring,disc,owner});return g;
 }
 function update(dt){for(const [g,s] of rings){s.remaining-=dt;const t=1-Math.max(0,s.remaining)/s.total;s.ring.scale.setScalar(1-.6*t);s.ring.material.opacity=.4+.5*t;s.disc.material.opacity=.1+.35*t*t;if(s.remaining<=-.15){scene.remove(g);s.ring.material.dispose();s.disc.material.dispose();rings.delete(g);}}}
 function clear(){for(const [g,s] of rings){scene.remove(g);s.ring.material.dispose();s.disc.material.dispose();}rings.clear();}
 return {telegraph,update,clear,get count(){return rings.size;}};
}
