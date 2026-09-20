import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {PICKUP_WEAPONS,createWeaponPickupModels} from './weapon-pickup-models.js';
import {weaponDisplay} from './weapon-display.js';
const factory=createWeaponPickupModels(),shapes=new Set();
for(const index of PICKUP_WEAPONS){
 const g=factory.create(index);g.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(g),size=bounds.getSize(new T.Vector3());
 assert.equal(g.userData.weaponId,weaponDisplay(index).id);assert.equal(g.userData.weaponIndex,index);
 assert(size.x>.55&&size.x<1.9,'readable, bounded world scale '+index);assert(size.y>.15&&size.y<.8);assert(bounds.min.y>=.015,'not embedded below feet plane '+index);
 const parts=[];g.traverse(o=>{if(o.isMesh){assert(o.geometry&&o.material);parts.push([o.geometry.type,o.geometry.parameters,o.position.toArray(),o.rotation.toArray()]);}});
 assert(parts.length>=7&&parts.length<=24);shapes.add(JSON.stringify(parts));
 const ray=new T.Raycaster(new T.Vector3(0,4,0),new T.Vector3(0,-1,0));assert.equal(ray.intersectObject(g,true).length,0,'decorative pickup must not block aiming');
}
assert.equal(shapes.size,PICKUP_WEAPONS.length,'silhouettes differ in geometry, not just tint or a text label');
const before=factory.stats();for(let n=0;n<300;n++)for(const id of PICKUP_WEAPONS)factory.create(id);
assert.deepEqual(factory.stats(),before,'pooled clones do not allocate new geometry/materials per death');
assert.equal(before.templates,9);assert(before.geometries<130&&before.materials<=13);
assert.throws(()=>factory.create(2),RangeError);
factory.dispose();assert.equal(factory.stats().geometries,0);
console.log('PASS nine distinct silhouettes including fixed heavy caches, readable size, no below-ground/raycast obstruction, 2700 pooled clones with bounded resources');
