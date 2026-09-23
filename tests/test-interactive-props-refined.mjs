import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import { createBarrels } from '../src/barrel-world.js';
import { BARREL } from '../src/barrel-rules.js';
import { createEmpSystem } from '../src/emp-system.js';
import { EMP } from '../src/emp-rules.js';
import { empLaunch } from '../src/emp-world.js';
import { FIELD_LAYOUTS } from '../src/field-layouts.js';
import { createInteractivePropLibrary, setInteractivePropState } from '../src/interactive-prop-models.js';
let groups=0; const pass=message=>{groups++;console.log('PASS '+message);};
for(const [map,layout] of Object.entries(FIELD_LAYOUTS)) {
  const scene=new T.Scene(),obstacles=[];
  const barrels=createBarrels(scene,obstacles,{positions:layout.barrels,idPrefix:map});
  assert.equal(obstacles.length,layout.barrels.length);
  scene.updateMatrixWorld(true);
  for(const [index,position] of layout.barrels.entries()) {
    const proxy=obstacles[index],floor=position[2]||0;
    assert.deepEqual([proxy.x,proxy.z,proxy.w,proxy.d,proxy.h,proxy.bottom,proxy.top],[position[0],position[1],1.1,1.1,1.8,floor,floor+1.8]);
    const old=new T.Mesh(new T.CylinderGeometry(.55,.55,1.8,16),new T.MeshBasicMaterial());
    old.position.copy(proxy.mesh.position);old.updateMatrixWorld(true);
    const visual=proxy.mesh.getObjectByName('B01_Visual');assert(visual);assert.equal(visual.userData.version,'props-v3');
    for(let i=0;i<8;i++) {
      const angle=i*Math.PI/4,centre=proxy.mesh.position.clone();
      const origin=centre.clone().add(new T.Vector3(Math.sin(angle)*3,0,Math.cos(angle)*3));
      const ray=new T.Raycaster(origin,centre.clone().sub(origin).normalize());
      assert(Math.abs(ray.intersectObject(old,false)[0].distance-ray.intersectObject(proxy.mesh,false)[0].distance)<1e-9);
      assert.equal(ray.intersectObject(visual,true).length,0);
    }
    old.geometry.dispose();old.material.dispose();
  }
  const core=obstacles[0].mesh,visual=core.getObjectByName('B01_Visual');
  const pressure=visual.children.find(o=>o.material?.userData.interactiveMutable).material;
  assert.equal(pressure.emissiveIntensity,.08);
  barrels.hit(core,BARREL.hp-19);assert.equal(pressure.emissiveIntensity,.55);
  barrels.reset();assert.equal(pressure.emissiveIntensity,.08);
  const count=scene.children.length,geometry=visual.children[0].geometry;
  for(let i=0;i<40;i++){barrels.hit(core,BARREL.hp);barrels.flush();barrels.reset();}
  assert.equal(scene.children.length,count);assert.equal(visual.children[0].geometry,geometry);
  assert.equal(barrels.snapshot()[0].hp,BARREL.hp);
}
pass('B01 nine-map proxy rays, original blast/reset lifecycle and restored low-health warning');
{
  const lib=createInteractivePropLibrary(),a=lib.create('barrel'),b=lib.create('barrel');
  const material=root=>root.children.find(o=>o.material?.userData.interactiveMutable).material;
  assert.equal(a.children[0].geometry,b.children[0].geometry);
  assert.notEqual(material(a),material(b));setInteractivePropState(a,'danger');
  assert.equal(material(a).emissiveIntensity,.55);assert.equal(material(b).emissiveIntensity,.08);
  lib.dispose();lib.dispose();
}
pass('B01 shared geometry with isolated per-instance pressure warning');
{
  const scene=new T.Scene(),camera=new T.PerspectiveCamera();camera.position.set(0,1.7,0);
  const events=[];const emp=createEmpSystem({scene,camera,enemies:[],obstacles:[],projectiles:{cancelOwner(){}},onEvent:name=>events.push(name)});
  for(let i=0;i<40;i++) {
    emp.reset();assert.equal(emp.charges,EMP.capacity);assert(emp.begin());assert(emp.release());assert.equal(emp.charges,EMP.capacity-1);
    const projectile=scene.getObjectByName('EMP_GRENADE'),visual=projectile.getObjectByName('E01_Visual');
    assert.equal(visual.userData.version,'props-v3');
    visual.traverse(o=>{if(!o.isMesh)return;const positions=o.geometry.attributes.position;for(let j=0;j<positions.count;j++)assert(Math.hypot(positions.getX(j),positions.getY(j),positions.getZ(j))<=EMP.bodyRadius+1e-6);});
    const direction=camera.getWorldDirection(new T.Vector3());
    const expected=empLaunch(camera.position,direction,[]);
    assert(projectile.position.distanceTo(expected.position)<1e-9);
    const geometries=new Set(),materials=new Set();
    visual.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
    let releasedGeometry=0,releasedMaterial=0;
    geometries.forEach(g=>g.addEventListener('dispose',()=>releasedGeometry++));
    materials.forEach(m=>m.addEventListener('dispose',()=>releasedMaterial++));
    emp.update(EMP.fuse+.1);assert(!emp.active);
    assert.equal(releasedGeometry,geometries.size);assert.equal(releasedMaterial,materials.size);
    emp.update(1);assert.equal(scene.children.length,0);
  }
  assert.equal(events.filter(name=>name==='throw').length,40);assert.equal(events.filter(name=>name==='burst').length,40);
  emp.clear();
}
pass('E01 original launch/sweep/charge lifecycle and 40 disposal-complete detonation cycles');
console.log('PASS refined interactive props: '+groups+' groups');
