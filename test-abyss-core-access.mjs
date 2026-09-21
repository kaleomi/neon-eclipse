import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {ABYSS_POSITION,createAbyss} from './abyss-rules.js';
import {DATACENTER_MAINFRAME as box} from './datacenter-data.js';
const cabinet=new T.Mesh(new T.BoxGeometry(box.w,box.top-box.bottom,box.d),new T.MeshBasicMaterial());cabinet.position.set(box.x,(box.top+box.bottom)/2,box.z);
const core=new T.Mesh(new T.IcosahedronGeometry(1,1),new T.MeshBasicMaterial());core.position.set(ABYSS_POSITION.x,ABYSS_POSITION.y,ABYSS_POSITION.z);
cabinet.updateMatrixWorld(true);core.updateMatrixWorld(true);
for(const p of [new T.Vector3(0,1.7,-6),new T.Vector3(-5,1.7,-6),new T.Vector3(5,1.7,-6)]){const ray=new T.Raycaster(p,core.position.clone().sub(p).normalize(),0,60);assert.equal(ray.intersectObjects([cabinet,core],false)[0]?.object,core,'exposed core must precede the solid cabinet');}
const p=new T.Vector3(0,1.7,-6),ray=new T.Raycaster(p,core.position.clone().sub(p).normalize(),0,3.5);assert.equal(ray.intersectObjects([cabinet,core],false)[0]?.object,core,'outside-cabinet melee reach');
const rules=createAbyss();rules.reset(true);rules.tick(.1,{level:1.2,feetY:0,alive:0});assert.equal(rules.damage('core',100),0,'position fix does not bypass water shield');rules.tick(.1,{level:0,feetY:0,alive:0});assert.equal(rules.damage('core',100),100);assert.equal(rules.state.hp,1400);
console.log('PASS ABYSS front/side real geometry rays and external melee reach; high-water shield still rejects damage');
