import * as T from '../node_modules/three/build/three.module.js';
import {KILL_FX,killGhostFrame} from './kill-fx-rules.js';
// Visual half of kill presentation: snapshots an enemy group into a white "ghost" before the real group is
// disposed, then plays flash → dissolve on the ghost. Ghosts are pure visuals: no colliders, no raycast targets.
export function createKillFxWorld(scene,{enabled=()=>true,rules=KILL_FX,maxGhosts=12}={}){
 const ghosts=[];
 function spawn(group,kind='normal'){
  if(!enabled()||!group)return null;
  group.updateMatrixWorld(true);
  const ghost=new T.Group();ghost.userData.killGhost=true;const material=new T.MeshBasicMaterial({color:kind==='boss'?0xfff1c9:kind==='elite'?0xd8f7ff:0xffffff,transparent:true,opacity:1,depthWrite:false});
  let meshes=0;
  group.traverse(o=>{if(!o.isMesh||!o.geometry||meshes>=24)return;const m=new T.Mesh(o.geometry.clone(),material);o.matrixWorld.decompose(m.position,m.quaternion,m.scale);m.raycast=()=>{};ghost.add(m);meshes++;});
  if(!meshes){material.dispose();return null;}
  const box=new T.Box3().setFromObject(ghost),center=box.getCenter(new T.Vector3());
  ghost.children.forEach(m=>m.position.sub(center));ghost.position.copy(center);
  scene.add(ghost);ghosts.push({ghost,material,t:0,kind});
  while(ghosts.length>maxGhosts)dispose(ghosts.shift());
  return ghost;
 }
 function dispose(entry){scene.remove(entry.ghost);entry.ghost.children.forEach(m=>m.geometry.dispose());entry.material.dispose();}
 function update(dt){
  for(let i=ghosts.length-1;i>=0;i--){
   const g=ghosts[i];g.t+=Math.max(0,dt);const frame=killGhostFrame(g.t,rules);
   if(!frame){dispose(g);ghosts.splice(i,1);continue;}
   g.material.opacity=frame.opacity;g.ghost.scale.setScalar(frame.scale);g.ghost.position.y+=0;g.ghost.userData.rise=frame.rise;g.ghost.children.forEach(m=>{m.position.y=m.userData.baseY??(m.userData.baseY=m.position.y);m.position.y+=frame.rise;});
  }
 }
 function clear(){ghosts.forEach(dispose);ghosts.length=0;}
 return {spawn,update,clear,get count(){return ghosts.length;},get ghosts(){return ghosts;}};
}
