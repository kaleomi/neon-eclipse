import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {createEnemyProjectiles} from './projectiles.js';
import {ENEMY_TYPES,BOSS_PHASES} from './enemy-rules.js';
for(const attack of [...Object.values(ENEMY_TYPES).map(p=>p.attack).filter(a=>a?.showAim),...BOSS_PHASES.map(p=>p.attack).filter(a=>a.showAim)]){
 const scene=new T.Scene(),owner=new T.Group();scene.add(owner);const source=new T.Vector3(2,1,0),target=new T.Vector3(0,1,-20),before=JSON.stringify(attack),fx=createEnemyProjectiles(scene,[],()=>{},()=>{});assert(fx.queue(source,target,false,owner,attack));
 const line=scene.children.find(o=>o.isLine);assert(line);assert.equal(line.material.opacity,.75);assert.equal(line.material.depthTest,true);assert.equal(line.material.depthWrite,false);assert.equal(line.material.fog,true);assert.deepEqual(Array.from(line.geometry.attributes.position.array),[2,1,0,0,1,-20]);
 let disposed=0;line.geometry.addEventListener('dispose',()=>disposed++);line.material.addEventListener('dispose',()=>disposed++);fx.update(attack.charge-.001,new T.Vector3(100,100,100));assert.equal(fx.count,0);assert.equal(fx.charging,1);fx.clear();assert.equal(disposed,2);assert.equal(fx.count,0);assert.equal(fx.charging,0);assert.equal(JSON.stringify(attack),before);
}
console.log('PASS all aimed enemy/Boss profiles: .75 alpha, original endpoints, depth test and fog retained, full charge, clear disposes line resources, immutable attack data');
