import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {createReactorEnvironment,refineReactorSurfaces,refineReactorCore} from './reactor-look.js';
let roomDisposed=0,generatorDisposed=0,targetDisposed=0,fail=false;
const texture={};
class Room{dispose(){roomDisposed++;}}
class PMREM{fromScene(){if(fail)throw Error('no GPU');return {texture,dispose(){targetDisposed++;}};}dispose(){generatorDisposed++;}}
const scene={environment:null},release=createReactorEnvironment(scene,{}, {Room,PMREM});
assert.equal(scene.environment,texture);assert.equal(roomDisposed,1);assert.equal(generatorDisposed,1);assert.equal(targetDisposed,0);
release();release();assert.equal(targetDisposed,1);assert.equal(scene.environment,null);
const external={};scene.environment=external;createReactorEnvironment(scene,{}, {Room,PMREM})();assert.equal(scene.environment,external);assert.equal(targetDisposed,1);
scene.environment=null;fail=true;createReactorEnvironment(scene,{}, {Room,PMREM})();assert.equal(roomDisposed,2);assert.equal(generatorDisposed,2);assert.equal(scene.environment,null);
fail=false;const release2=createReactorEnvironment(scene,{}, {Room,PMREM});scene.environment=external;release2();assert.equal(scene.environment,external);assert.equal(targetDisposed,2);
console.log('PASS PMREM temporary disposal, live target ownership, failure fallback, idempotent cleanup and external environment preservation');
const s=new T.Scene(),hemi=new T.HemisphereLight(),lamp=new T.PointLight();s.add(hemi,lamp);
const floor=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),wall=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());s.add(floor,wall);
const walls=[{x:4,z:2,w:3,h:2,d:1,mesh:wall}],before=JSON.stringify(walls.map(({mesh,...v})=>v)),children=[...s.children],floorGeometry=floor.geometry;
refineReactorSurfaces({floor,walls,scene:s,lamp});assert.deepEqual(s.children,children);assert.equal(floor.geometry,floorGeometry);assert.equal(JSON.stringify(walls.map(({mesh,...v})=>v)),before);assert.equal(floor.material.roughness,.64);assert.equal(hemi.intensity,2.65);assert.equal(lamp.intensity,32);
const core=new T.Group(),m=new T.MeshStandardMaterial({roughness:.22,metalness:.9,emissiveIntensity:2.8});core.add(new T.Mesh(new T.BoxGeometry(),m),new T.Mesh(new T.BoxGeometry(),m));refineReactorCore(core);assert.equal(m.roughness,.28);assert.equal(m.emissiveIntensity,2);assert.equal(m.metalness,.9);assert.equal(core.children.length,2);
console.log('PASS surface/core tuning preserves geometry, obstacle values and light count');
