import * as THREE from './node_modules/three/build/three.module.js';
import {RoomEnvironment} from './node_modules/three/examples/jsm/environments/RoomEnvironment.js';

// Bake once; release temporary room geometry and PMREM workspaces, not the live result.
// Existing scene environments belong to their caller and must never be disposed here.
export function createReactorEnvironment(scene,renderer,{PMREM=THREE.PMREMGenerator,Room=RoomEnvironment}={}){
 if(!renderer||scene.environment)return ()=>{};
 let generator,room,target;
 try{
  generator=new PMREM(renderer);room=new Room();
  target=generator.fromScene(room,.04);
  scene.environment=target.texture;
 }catch{
  target?.dispose();return ()=>{};
 }finally{
  room?.dispose();generator?.dispose();
 }
 let disposed=false;
 return ()=>{
  if(disposed)return;disposed=true;
  if(scene.environment===target.texture)scene.environment=null;
  target.dispose();
 };
}

// Only chapter-one-owned surfaces and its existing lamp; no extra lights/maps/meshes.
export function refineReactorSurfaces({floor,walls,scene,lamp}){
 if(floor?.material){Object.assign(floor.material,{roughness:.64,metalness:.48,envMapIntensity:.55});}
 const materials=new Set(walls.map(w=>w.mesh.material));
 for(const material of materials)Object.assign(material,{roughness:.66,metalness:.52,envMapIntensity:.7});
 scene.children.filter(o=>o.isHemisphereLight).forEach(o=>o.intensity=2.65);
 lamp.color.setHex(0x64e5e2);lamp.intensity=32;lamp.distance=22;
}

export function refineReactorCore(root){
 const materials=new Set();
 root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.isMeshStandardMaterial)materials.add(m);});
 for(const material of materials){
  material.roughness=Math.max(.28,material.roughness);
  material.envMapIntensity=.8;
  material.emissiveIntensity=Math.min(2,material.emissiveIntensity);
 }
}
