import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import {createGlacierWorld} from '../src/glacier-world.js';
globalThis.document={createElement:()=>({style:{},dataset:{},append(){},remove(){}}),body:{append(){}}};
const w=createGlacierWorld(new T.Scene(),[],{thermal:false});w.setStage(3);
let core=w.targets.find(m=>m.userData.overseer==='core');const armor=w.hit(core,100);assert.equal(armor.damage,15);assert.equal(armor.weak,false);
w.clear();w.setStage(3);w.place(0,-6);w.advance(3);assert.equal(w.state.phase,'sunk');core=w.targets.find(m=>m.userData.overseer==='core');
const hit=w.hit(core,10000);assert.equal(hit.damage,1800);assert.equal(hit.killed,true);assert.equal(hit.weak,true,'lethal exposed hit is still weak-point damage');assert.equal(w.battle.summary.coreDamage,1800);assert.equal(w.battle.summary.nodeDamage,0);assert.equal(w.hit(core,10000).killed,false);assert.equal(w.battle.summary.coreDamage,1800,'no double count');
console.log('PASS GLACIER armor unchanged, lethal exposed core hit classified correctly, exact 1800 core damage without duplicate kill');
