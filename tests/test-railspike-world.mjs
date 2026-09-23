import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import {selectRailImpacts} from '../weapons/railspike-rules.js';
import {createRailPanels} from '../src/rail-panels.js';
import {resolveEnemyDamage} from '../src/enemy-rules.js';
import {registerHaloWeakHit} from '../weapons/halo-rules.js';
const scene=new T.Scene(),targets=[],owners=new Map();
for(let i=0;i<4;i++){const group=new T.Group();group.position.z=-3-i*3;scene.add(group);for(let j=0;j<2;j++){const m=new T.Mesh(new T.BoxGeometry(1,2,.7),new T.MeshBasicMaterial());m.position.set(0,1,-j*.1);group.add(m);targets.push(m);owners.set(m,group);}}
const ray=new T.Raycaster(new T.Vector3(0,1,0),new T.Vector3(0,0,-1),0,90),shoot=()=>{scene.updateMatrixWorld(true);return selectRailImpacts(ray.intersectObjects(targets,false),m=>owners.get(m));};
let r=shoot();assert.equal(r.count,3);assert.equal(new Set(r.hits.map(i=>owners.get(i.object))).size,3);
const wall=new T.Mesh(new T.BoxGeometry(3,3,.2),new T.MeshBasicMaterial({side:T.DoubleSide}));wall.position.set(0,1,-4.5);scene.add(wall);targets.push(wall);r=shoot();assert.equal(r.count,1);assert.equal(r.stop.object,wall);wall.userData={railThin:true,railThickness:.2};r=shoot();assert.equal(r.count,3);assert.equal(r.panels,1);assert(Math.abs(r.hits.find(i=>owners.get(i.object)===scene.children[1]).railFactor-.75*.85)<1e-8);
wall.userData.overseer='core';owners.set(wall,'overseer');r=shoot();assert.equal(r.count,2);assert.equal(r.stop.object,wall,'Boss terminal even with accidentally inherited thin metadata');
const props=[],panels=createRailPanels(new T.Scene(),props);assert.equal(panels.length,2);assert.equal(props.length,2);assert(panels.every(m=>m.userData.railThin===true&&m.geometry.parameters.depth===.12));assert(props.every(o=>o.top===1.8&&o.cover));
const heavy={type:'heavy',group:new T.Group()};assert.equal(resolveEnemyDamage(heavy,90,'body',{x:0,z:2}).damage,27);for(let i=0;i<3;i++)registerHaloWeakHit(heavy);assert.equal(resolveEnemyDamage(heavy,90,'body',{x:0,z:2}).damage,32.4);assert.equal(resolveEnemyDamage(heavy,90*.75,'core',{x:0,z:-2}).damage,162);
console.log('PASS: actual Three.js ray intersections, repeated meshes count once, solid wall stop, thin-panel penetration, Boss terminal priority; authored collidable panels, armor and HALO retain their modifiers');
