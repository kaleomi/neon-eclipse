import * as T from './node_modules/three/build/three.module.js';
// Small authored foil screens, not a blanket permission to shoot through structural walls.
export function createRailPanels(scene,obstacles,positions=[[-5,24],[5,24]]){
 const panels=[];
 for(const p of positions){const [x,z]=p,y=p[2]||0;
  const mesh=new T.Mesh(new T.BoxGeometry(2.4,1.8,.12),new T.MeshStandardMaterial({color:0x86573c,metalness:.65,roughness:.48}));mesh.position.set(x,.9+y,z);mesh.userData.railThin=true;mesh.userData.railThickness=.12;scene.add(mesh);
  const edge=new T.LineSegments(new T.EdgesGeometry(mesh.geometry),new T.LineBasicMaterial({color:0xffc18b}));mesh.add(edge);
  for(const y of [-.6,0,.6]){const stripe=new T.Mesh(new T.BoxGeometry(2.1,.035,.135),new T.MeshBasicMaterial({color:0xffc18b}));stripe.position.y=y;mesh.add(stripe);}
  obstacles.push({x,z,w:2.4,h:1.8,d:.12,bottom:y,top:y+1.8,mesh,cover:true});panels.push(mesh);
 }
 return panels;
}
