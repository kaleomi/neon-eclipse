import assert from 'node:assert/strict';
import {STAR_KEY,STAR_MAPS,STAR_SITES,createStarStore,nearStar} from './collectibles.js';
const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
data.set('neon-eclipse.journey.v1','legacy');const s=createStarStore(storage);
for(const [i,map] of STAR_MAPS.entries()){const p=STAR_SITES[map];assert(!nearStar(map,{x:p.x,z:p.z,y:p.feetY+4.7}));assert(nearStar(map,{x:p.x,z:p.z,y:p.feetY+1.7}));let e=s.collect(map);assert(e.added);assert.equal(e.unlocked,i===STAR_MAPS.length-1);assert(!s.collect(map).added);assert.equal(createStarStore(storage).collected.length,i+1);}
assert(s.unlocked);assert.equal(data.get('neon-eclipse.journey.v1'),'legacy');s.collected.pop();assert.equal(s.collected.length,STAR_MAPS.length);assert.equal(STAR_MAPS.length,8);assert(!s.collect('fake').added);
const denied=createStarStore({getItem:()=>null,setItem:()=>{throw Error('quota')}});assert(denied.collect('roof').error);assert.equal(denied.collected.length,0);
for(const raw of ['{','null','{"version":6,"stars":["roof"]}','{"version":1,"stars":42}']){data.set(STAR_KEY,raw);assert.equal(createStarStore(storage).collected.length,0);}
data.set(STAR_KEY,'{"version":1,"stars":["roof","roof","fake"]}');assert.deepEqual(createStarStore(storage).collected,['roof']);
const a=createStarStore(storage),b=createStarStore(storage);a.collect('reactor');b.collect('station');assert.deepEqual(createStarStore(storage).collected,['reactor','station','roof']);
assert(!nearStar('roof',{x:32.5,z:17,y:1.7}));
console.log('PASS: seven unique stars, floor-aware pickup, durable replay-independent progress, unlock only at 7/7, malformed data, quota failure and sequential store merge');
