import * as THREE from './node_modules/three/build/three.module.js';
import {segmentBox} from './collision.js';

export const MELEE_SWEEP = Object.freeze({horizontalDegrees:35,verticalDegrees:15,horizontalSamples:5,verticalSamples:3,maxTargets:1});
const samples = [];
for (const yaw of [-35,-17.5,0,17.5,35]) for (const pitch of [-15,0,15]) {
  const y=yaw*Math.PI/180,p=pitch*Math.PI/180;
  samples.push({yaw,pitch,cost:yaw*yaw+pitch*pitch,direction:new THREE.Vector3(Math.sin(y)*Math.cos(p),Math.sin(p),-Math.cos(y)*Math.cos(p))});
}
samples.sort((a,b) => a.cost-b.cost || Math.abs(a.pitch)-Math.abs(b.pitch) || b.yaw-a.yaw);
function visible(mesh) {
  for (let node=mesh; node; node=node.parent) if (!node.visible) return false;
  return Boolean(mesh.geometry);
}
function solidBounds(obstacle) {
  const bottom=obstacle.bottom??0,top=obstacle.top??obstacle.h;
  if (![obstacle.x,obstacle.z,obstacle.w,obstacle.d,bottom,top].every(Number.isFinite) || obstacle.w<=0 || obstacle.d<=0 || top<bottom) return null;
  return {min:{x:obstacle.x-obstacle.w/2,y:bottom,z:obstacle.z-obstacle.d/2},max:{x:obstacle.x+obstacle.w/2,y:top,z:obstacle.z+obstacle.d/2}};
}

// One spatial contact per probe; melee-strike.js owns the active time window.
// Center hits retain priority. Candidate bounds never substitute for a real triangle or its hit zone.
export function createMeleeSweep() {
  const ray=new THREE.Raycaster(),origin=new THREE.Vector3(),direction=new THREE.Vector3(),orientation=new THREE.Quaternion();
  const sphere=new THREE.Sphere(),localOrigin=new THREE.Vector3(),inverse=new THREE.Matrix4();
  const point=new THREE.Vector3(),localDirection=new THREE.Vector3(),inverseOrientation=new THREE.Quaternion();
  const emptyGeometry=new THREE.BufferGeometry();
  const insideProxy=new THREE.Mesh(emptyGeometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  insideProxy.matrixAutoUpdate=false;
  function resolve(camera,meshes,isTarget,range,obstacles=[]) {
    if (!camera?.getWorldPosition || !Array.isArray(meshes) || typeof isTarget!=='function' || !Number.isFinite(range) || range<=0) return null;
    camera.getWorldPosition(origin);camera.getWorldQuaternion(orientation);
    const solids=obstacles.map(solidBounds).filter(Boolean);
    // Material back-face culling must not allow an origin clipped into a wall to hit through it.
    if (solids.some(({min,max}) => segmentBox(origin,origin,min,max)!==null)) return null;
    const active=meshes.filter(mesh => mesh && visible(mesh)),inside=[],probes=[...samples];
    inverseOrientation.copy(orientation).invert();
    // Fixed rays alone leave gaps between their angles. Nearby target bounds
    // propose up to two extra directions; only real first triangle hits count.
    // Bounds never grant a hit, extend the radius, or bypass a blocking mesh.
    function addProbe(worldPoint) {
      localDirection.copy(worldPoint).sub(origin).applyQuaternion(inverseOrientation);
      if(localDirection.z>=0||localDirection.lengthSq()>range*range)return;
      const yaw=Math.atan2(localDirection.x,-localDirection.z)*180/Math.PI;
      const pitch=Math.atan2(localDirection.y,Math.hypot(localDirection.x,localDirection.z))*180/Math.PI;
      if(Math.abs(yaw)>MELEE_SWEEP.horizontalDegrees||Math.abs(pitch)>MELEE_SWEEP.verticalDegrees)return;
      probes.push({cost:yaw*yaw+pitch*pitch,direction:localDirection.clone().normalize()});
    }
    for (const mesh of active) {
      if (!isTarget(mesh)) continue;
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      sphere.copy(mesh.geometry.boundingSphere).applyMatrix4(mesh.matrixWorld);
      if (sphere.distanceToPoint(origin)>range) continue;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      inverse.copy(mesh.matrixWorld).invert();localOrigin.copy(origin).applyMatrix4(inverse);
      mesh.geometry.boundingBox.clampPoint(localOrigin,point);addProbe(point.applyMatrix4(mesh.matrixWorld));
      mesh.geometry.boundingBox.getCenter(point);addProbe(point.applyMatrix4(mesh.matrixWorld));
      if (!sphere.containsPoint(origin)) continue;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      inverse.copy(mesh.matrixWorld).invert();localOrigin.copy(origin).applyMatrix4(inverse);
      if (mesh.geometry.boundingBox.containsPoint(localOrigin)) inside.push(mesh);
    }
    ray.near=0;ray.far=range;
    let best=null,bestCost=Infinity,centerFeedback=null;
    probes.sort((a,b)=>a.cost-b.cost);
    for (const sample of probes) {
      if (sample.cost>bestCost) break;
      direction.copy(sample.direction).applyQuaternion(orientation);
      ray.set(origin,direction);
      const intersections=ray.intersectObjects(active,false);
      // A two-sided, non-rendered proxy handles true close contact without mutating any live material.
      for (const mesh of inside) {
        insideProxy.geometry=mesh.geometry;insideProxy.matrixWorld.copy(mesh.matrixWorld);
        for (const hit of ray.intersectObject(insideProxy,false)) intersections.push({...hit,object:mesh});
      }
      insideProxy.geometry=emptyGeometry;
      intersections.sort((a,b) => a.distance-b.distance);
      const hit=intersections[0];
      if (!hit) continue;
      const target=isTarget(hit.object);
      if (sample.cost===0 && !target) centerFeedback=hit;
      if (!target) continue;
      if (solids.some(({min,max}) => {const t=segmentBox(origin,hit.point,min,max);return t!==null&&t<1-1e-6;})) continue;
      if (!best || hit.distance<best.distance) {best=hit;bestCost=sample.cost;}
    }
    return best || centerFeedback;
  }
  return {resolve,sampleCount:samples.length};
}
