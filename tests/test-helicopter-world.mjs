import assert from 'node:assert/strict';
import * as T from 'three';
import {HELICOPTER,HELICOPTER_SITE,createHelicopter,helicopterSkidClearance} from '../src/helicopter-rules.js';
import {createHelicopterModel,createHelicopterSite,disposeHelicopterObject} from '../src/helicopter-world.js';
import {HELICOPTER_LESSONS} from '../src/helicopter-trial.js';
const model=createHelicopterModel(),site=createHelicopterSite(),scene=new T.Scene();scene.add(model.root,site.root);
const s=createHelicopter();s.x=s.y=s.z=0;
let vertices=0;
for(const pitch of [-HELICOPTER.tilt,0,HELICOPTER.tilt])for(const roll of [-HELICOPTER.tilt,0,HELICOPTER.tilt]){
 s.pitch=pitch;s.roll=roll;model.update(s);model.root.updateMatrixWorld(true);
 model.root.traverse(o=>{if(!o.isMesh)return;const pos=o.geometry.getAttribute('position');for(let i=0;i<pos.count;i++){
  const p=o.getVertexPosition(i,new T.Vector3()).applyMatrix4(o.matrixWorld);vertices++;assert(Number.isFinite(p.length()));
  assert(Math.hypot(p.x,p.z)<=HELICOPTER.radius+.03,'visible rotor/tail exceeds collision radius');
  assert(p.y<=HELICOPTER.height+.03,'visible rotor exceeds vertical envelope');
  assert(p.y>=-helicopterSkidClearance(s)-.035,'skid clearance underestimates visible low point');
 }});
}
assert.equal(site.pads.length,2);assert.deepEqual(site.pads.map(p=>p.userData.pad),['A','B']);
const obstacleNames=[];site.root.traverse(o=>{if(o.userData.obstacle)obstacleNames.push(o.userData.obstacle);});assert.deepEqual(obstacleNames,HELICOPTER_SITE.obstacles.map(o=>o.id));
s.rpm=1;s.rotorAngle=1.2;model.update(s);assert(model.disc.material.opacity>0);assert.equal(model.root.userData.rpm,1);
site.update(s,HELICOPTER_LESSONS[2]);assert.equal(site.guide.visible,true);assert.equal(site.guide.position.x,28);assert.equal(site.guide.position.z,-32);
site.update(s,null);assert.equal(site.guide.visible,false);
const resources=new Set();scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[]))resources.add(m);});
let disposed=0;for(const r of resources)r.addEventListener('dispose',()=>disposed++);disposeHelicopterObject(scene);assert.equal(disposed,resources.size);
console.log(`PASS helicopter real Three.js model/site: ${vertices} transformed vertices within rotor/skid envelope, pads/obstacles, guide, rotor blur and disposal`);
