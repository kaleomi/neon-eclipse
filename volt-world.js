import * as T from './node_modules/three/build/three.module.js';
export function voltAnchor(enemy){const p=enemy.group.getWorldPosition(new T.Vector3()),scale=enemy.group.getWorldScale(new T.Vector3());p.y+=(enemy.group.userData.combatAnchorY??1.15)*scale.y;return p;}
// Both directions also block a segment whose endpoint is inside a single-sided solid.
export function voltClearPath(from,to,meshes){
 const delta=new T.Vector3().subVectors(to,from),length=delta.length();if(length<1e-6)return true;
 const direction=delta.multiplyScalar(1/length),ray=new T.Raycaster(new T.Vector3().copy(from),direction.clone(),0,Math.max(0,length-1e-5));
 if(ray.intersectObjects(meshes,false).length)return false;
 ray.set(to,direction.negate());return ray.intersectObjects(meshes,false).length===0;
}
export function createVoltArc(from,to){
 const points=[];
 for(let i=0;i<=8;i++){const t=i/8,p=new T.Vector3().lerpVectors(from,to,t),wave=Math.sin(t*Math.PI)*.07;p.x+=(i%2?1:-1)*wave;p.y+=(i%3-1)*wave;points.push(p);}
 const mesh=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x70f2ff,transparent:true,opacity:1}));mesh.name='VOLT_CHAIN';return mesh;
}
