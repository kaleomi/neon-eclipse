import assert from 'node:assert/strict';
import {createDurability,overlapsRestoredPlayer} from '../src/destructible-rules.js';
const d=createDurability();for(const n of [0,-1,NaN,Infinity,undefined,'20'])assert.equal(d.hit(n).changed,false);
assert.equal(d.hit(26).hp,34);assert.equal(d.hit(33.5).hp,.5);assert.deepEqual(d.hit(999),{hp:0,maxHp:60,ratio:0,broken:true,damage:.5,changed:true,newlyBroken:true});assert.equal(d.hit(10).newlyBroken,false);assert.equal(d.reset().hp,60);assert.throws(()=>createDurability(NaN));
const o={x:5,z:24,w:2.4,d:.12,h:1.8};assert(overlapsRestoredPlayer(o,{x:5,y:1.7,z:24}));assert(overlapsRestoredPlayer(o,{x:5,y:1.7,z:24.5}));assert(!overlapsRestoredPlayer(o,{x:0,y:1.7,z:29}));assert(!overlapsRestoredPlayer(o,{x:5,y:5,z:24}));
console.log('PASS destructible durability, invalid damage, single break, reset, restore overlap');
