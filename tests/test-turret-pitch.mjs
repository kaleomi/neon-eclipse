// Headless Three.js matrix regression; no renderer, browser, native storage or gameplay loop.
import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import {createTurretModel} from '../src/vehicle-weapons-world.js';
import {ROOF_GUN,createWeaponState,enterGunner,aimTurret,aimDirection,roofMuzzle,stepRoofGun} from '../src/vehicle-weapons.js';
function fixture(roverYaw=0){
 // Production rover has a heading group and a separate body for terrain lean. Use a level body here.
 const root=new T.Group(),body=new T.Group();root.rotation.y=-roverYaw;root.add(body);
 const model=createTurretModel(body),weapon=createWeaponState('roof'),rover={x:0,z:0,speed:0,yaw:roverYaw};enterGunner(weapon,rover);
 let muzzle;model.pivot.traverse(o=>{if(o.geometry?.type==='CylinderGeometry'&&o.geometry.parameters.height===.22)muzzle=o;});assert.ok(muzzle,'identify actual rendered muzzle');
 return {root,model,weapon,rover,direction(){model.update(weapon,rover.yaw);root.updateMatrixWorld(true);const origin=muzzle.parent.getWorldPosition(new T.Vector3());return muzzle.getWorldPosition(new T.Vector3()).sub(origin).normalize();},
  dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
}
function assertAligned(f){const actual=f.direction(),expected=new T.Vector3().copy(aimDirection(f.weapon.aimYaw,f.weapon.aimPitch));assert.ok(actual.distanceTo(expected)<1e-10,`barrel ${actual.toArray()} differs from aim ${expected.toArray()}`);}
function shotAt(f,pitch){
 f.weapon.aimPitch=pitch;const origin=roofMuzzle(f.weapon,f.rover),d=aimDirection(f.weapon.aimYaw,pitch),distance=pitch<0?6:30;
 const target={x:origin.x+d.x*distance,y:origin.y+d.y*distance,z:origin.z+d.z*distance,r:.15,hp:100,alive:true,flash:0},range={shots:0,hits:0,kills:0,targets:[target]};
 f.weapon.cooldown=0;const shot=stepRoofGun(f.weapon,f.rover,{fire:true},1/120,range,[],{random:()=>.5});assert.equal(shot.target,target);assert.equal(target.hp,100-ROOF_GUN.damage);
 const tracer=f.weapon.effects.at(-1),actual=new T.Vector3().copy(tracer.to).sub(new T.Vector3().copy(tracer.from)).normalize();assert.ok(actual.distanceTo(new T.Vector3().copy(d))<1e-10);return actual;
}
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;console.log('PASS',name);}catch(e){failed++;console.error('FAIL',name,e.message);}}
test('existing shot direction correctly hits low and high targets',()=>{
 const f=fixture();try{for(const pitch of [ROOF_GUN.pitchMin,ROOF_GUN.pitchMax]){const d=shotAt(f,pitch);assert.equal(Math.sign(d.y),Math.sign(pitch));}}finally{f.dispose();}
});
test('aiming down lowers the visible barrel instead of raising it',()=>{
 const f=fixture();try{aimTurret(f.weapon,0,-.2);assert.ok(f.direction().y<0,'downward aim must lower the rendered muzzle');assertAligned(f);}finally{f.dispose();}
});
test('aiming up raises the visible barrel instead of lowering it',()=>{
 const f=fixture();try{aimTurret(f.weapon,0,.4);assert.ok(f.direction().y>0,'upward aim must raise the rendered muzzle');assertAligned(f);}finally{f.dispose();}
});
test('horizontal aim retains world heading as the rover turns',()=>{
 for(const roverYaw of [0,.7,-1.8,Math.PI]){const f=fixture(roverYaw);try{for(const aimYaw of [0,-.8,2.3]){f.weapon.aimYaw=aimYaw;f.weapon.aimPitch=0;assertAligned(f);}}finally{f.dispose();}}
});
test('barrel axis agrees with actual shots at both pitch limits and varied headings',()=>{
 for(const roverYaw of [0,.7,-1.8,Math.PI]){const f=fixture(roverYaw);try{for(const aimYaw of [0,-.8,2.3])for(const pitch of [ROOF_GUN.pitchMin,-.15,.25,ROOF_GUN.pitchMax]){
  f.weapon.aimYaw=aimYaw;const shot=shotAt(f,pitch);assertAligned(f);assert.ok(f.direction().distanceTo(shot)<1e-10);
 }}finally{f.dispose();}}
});
console.log(`turret pitch: ${passed}/${passed+failed} passed; headless transforms and deterministic shots only`);if(failed)process.exitCode=1;
