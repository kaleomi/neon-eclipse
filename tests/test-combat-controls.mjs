import assert from 'node:assert/strict';
import {EQUIPPED_SLOTS,equippedWeaponForKey,equippedWeaponIndices} from '../src/weapon-selection.js';
import {createBindings,validateRebind,readGamepad,BINDINGS_KEY} from '../src/input-bindings.js';
import {AMMO_RESUPPLY_FRACTION,ammoResupplyAmount,resupplyLegacyReserves} from '../src/ammo-resupply-rules.js';
import {createTypedAmmo,emptyTypedAmmo,AMMO_CAP} from '../src/typed-ammo.js';
import {createOrdnanceState} from '../src/ordnance-rules.js';
import {HEAVY_AMMO_CAP,defaultKit} from '../src/field-kit-rules.js';
import {createRuntimeWeapons} from '../weapons/runtime.js';

let groups=0;const pass=message=>{groups++;console.log('PASS '+message);};
const bindings=createBindings();
for(const [index,slot]of EQUIPPED_SLOTS.entries()){
 assert(bindings.is('Digit'+(index+1),slot.action));
 assert.equal(bindings.rebind(slot.action,'KeyP').reason,'locked');
 assert.equal(validateRebind({},'reload',slot.code).reason,'reserved');
}
for(const primary of [0,1,4,5,6,7,8,9,10])for(const melee of [3,11]){
 const loadout={primary,secondary:2,melee},before=JSON.stringify(loadout);
 assert.deepEqual(['Digit1','Digit2','Digit3'].map(code=>equippedWeaponForKey(code,loadout)),[primary,2,melee]);
 assert.deepEqual(equippedWeaponIndices(loadout),[primary,2,melee]);assert.equal(JSON.stringify(loadout),before);
}
for(const code of ['Digit4','Digit8','Digit0','KeyB',null])assert.equal(equippedWeaponForKey(code,{primary:7,secondary:2,melee:11}),null);
assert.equal(equippedWeaponForKey('Digit1',{primary:99}),null);assert.equal(equippedWeaponForKey('Digit3',null),null);
pass('fixed 1/2/3 select all regular and special carried IDs without altering loadouts');

const old=JSON.stringify({version:1,overrides:{reload:['KeyL'],forward:['KeyZ'],ammoType:['KeyJ']}});let stored=old,writes=0;
const custom=createBindings({storage:{getItem:key=>key===BINDINGS_KEY?stored:null,setItem:(_,v)=>{stored=v;writes++;},removeItem:()=>{stored=null;writes++;}}});
assert.deepEqual(custom.codesFor('reload'),['KeyL']);assert.deepEqual(custom.codesFor('forward'),['KeyZ']);assert.deepEqual(custom.codesFor('ammoType'),[]);assert.equal(stored,old);assert.equal(writes,0);
assert.equal(custom.actionFor('KeyB'),null);assert.equal(validateRebind({},'reload','KeyB').conflict,null);assert(!readGamepad({axes:[],buttons:Array.from({length:13},(_,i)=>({pressed:i===12,value:i===12?1:0}))}).held.has('ammoType'));
assert(!bindings.legend().some(action=>action.id==='ammoType'));pass('B/type-selection retires without overwriting saved custom controls or unrelated defaults');

assert.equal(AMMO_RESUPPLY_FRACTION,.25);assert.equal(HEAVY_AMMO_CAP,defaultKit().heavy);
for(const cap of [2,7,10,14,124,192,292,390,450,600]){
 for(const current of [0,1,Math.floor(cap/2),cap-1,cap,cap+4]){
  const n=ammoResupplyAmount(current,cap);assert(Number.isInteger(n));assert(n>=0);assert.equal(n,Math.min(Math.max(0,cap-current),Math.ceil(cap/4)));assert(current+n>=current);
  if(current<=cap)assert(current+n<=cap);
 }
}
for(const [current,cap]of [[0,0],[-1,10],[1.5,10],[0,Infinity],[Infinity,Infinity],[0,NaN],[0,undefined]])assert.equal(ammoResupplyAmount(current,cap),0);
pass('quarter capacity rounds up to whole units, clamps, never subtracts or fabricates infinite ammo');

const guns=createRuntimeWeapons(),before=JSON.stringify(guns),legacy=resupplyLegacyReserves([0,0,Infinity,999],[{reserve:150},{reserve:6},{reserve:Infinity},{reserve:100}]);
assert.deepEqual(legacy,[38,2,Infinity,999]);assert.equal(JSON.stringify(guns),before);assert.equal(guns[3].automatic,false,'repeat is input behavior, not a changed weapon stat');
pass('independent legacy reserves use the same percentage; melee infinity and profiles remain unchanged');

const ammo=createTypedAmmo();ammo.reset(emptyTypedAmmo());
assert.deepEqual(ammo.supplyAll(),{light:150,heavy:113,energy:48,grenade:4});assert.deepEqual(ammo.state.pools,{light:150,heavy:113,energy:48,grenade:4});
for(let i=0;i<4;i++)ammo.cycleSupply();
ammo.reset(emptyTypedAmmo());ammo.cycleSupply();assert.deepEqual(ammo.supplyAll(),{light:150,heavy:113,energy:48,grenade:4},'legacy selection API must not filter pickups');
for(let i=0;i<10;i++)ammo.supplyAll();assert.deepEqual(ammo.state.pools,AMMO_CAP);assert.deepEqual(ammo.supplyAll(),{light:0,heavy:0,energy:0,grenade:0});
pass('one bundle fills all four authoritative pools; selection, current weapon and full pools cannot filter it');

ammo.reset({version:1,pools:{light:599,heavy:450,energy:191,grenade:14}});assert.deepEqual(ammo.supplyAll(),{light:1,heavy:0,energy:1,grenade:0});assert.deepEqual(ammo.state.pools,AMMO_CAP);
ammo.reset(emptyTypedAmmo(),[],null,true);assert.deepEqual(ammo.supplyAll(),{light:98,heavy:73,energy:31,grenade:4});
for(let i=0;i<8;i++)ammo.supplyAll();assert.deepEqual(ammo.state.pools,{light:390,heavy:292,energy:124,grenade:14});
const excess={version:1,pools:{light:500,heavy:400,energy:170,grenade:14}};ammo.reset(excess,[],null,true);ammo.supplyAll();assert.deepEqual(ammo.state,excess,'reduced capacities must never remove existing reserve');
pass('near-full and light-load capacities clamp correctly without reducing previously held stock');

const future={version:99,opaque:{zero:0,array:[3,7]}};ammo.reset(future);const frozen=JSON.stringify(ammo.checkpoint());assert.deepEqual(ammo.supplyAll(),{light:0,heavy:0,energy:0,grenade:0});assert.equal(JSON.stringify(ammo.checkpoint()),frozen);
const off=createTypedAmmo({enabled:false});off.reset(emptyTypedAmmo());assert.deepEqual(off.supplyAll(),{light:0,heavy:0,energy:0,grenade:0});assert.deepEqual(off.checkpoint(),{});
pass('future payloads remain exact and disabled/P4 pool channels do not receive duplicate supply');

ammo.reset(emptyTypedAmmo());const shared=createOrdnanceState(ammo);assert(shared.claim(9));assert(shared.claim(10));assert(shared.claim(11));const sharedBefore=ammo.checkpoint(),loaded=shared.state.rounds;
assert.equal(shared.resupply(),0);assert.deepEqual(ammo.checkpoint(),sharedBefore);ammo.supplyAll();assert.deepEqual(shared.state.rounds,loaded);assert.deepEqual(shared.state.owned,[9,10,11]);
const dedicated=createOrdnanceState(off);dedicated.claim(9);dedicated.claim(10);dedicated.claim(11);dedicated.fire(9);dedicated.reload(9);dedicated.fire(10);dedicated.fire(10);dedicated.reload(10);const loadedBefore=dedicated.state.rounds;
assert.equal(dedicated.resupply(),3);assert.deepEqual(dedicated.state.reserve,[7,10,0]);assert.deepEqual(dedicated.state.rounds,loadedBefore);assert.equal(dedicated.resupply(),0);
dedicated.reset({version:99,keep:['ordnance']});const ordBefore=dedicated.checkpoint();assert.equal(dedicated.resupply(),0);assert.deepEqual(dedicated.checkpoint(),ordBefore);
pass('special reserves refill once in their owning channel; magazines, hammer and unknown ordnance remain untouched');
console.log('TOTAL '+groups+' groups');
