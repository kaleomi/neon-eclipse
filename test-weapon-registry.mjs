import assert from 'node:assert/strict';
import {WEAPONS as compatible} from './combat.js';
import {WEAPONS,WEAPON_DEFINITIONS,LEGACY_WEAPON_IDS,getWeaponDefinition,getWeaponId,getWeaponIndex,createWeaponProfile} from './weapons/registry.js';
import {validateWeaponDefinitions} from './weapons/schema.js';
const expected=[
 {name:'VANGUARD',cap:30,reserve:150,delay:.11,damage:26,pellets:1,spread:.009,range:70,reload:1.4,automatic:true,kick:.016,headMultiplier:1.75,falloffStart:35,minimumDamage:.8},
 {name:'BREACHER',cap:8,reserve:48,delay:.32,damage:19,pellets:8,spread:.09,range:28,reload:.55,perShell:true,automatic:true,kick:.055,headMultiplier:1.25,falloffStart:7,minimumDamage:.35},
 {name:'GHOST',cap:15,reserve:90,delay:.24,damage:43,pellets:1,spread:.005,range:65,reload:1.05,automatic:false,kick:.028,headMultiplier:2,falloffStart:30,minimumDamage:.75},
 {name:'ARC BLADE',cap:Infinity,reserve:Infinity,delay:.45,damage:95,pellets:1,spread:0,range:3.5,reload:0,automatic:false,kick:0,headMultiplier:1,falloffStart:3.5,minimumDamage:1}
];
assert.equal(compatible,WEAPONS,'existing import stays the same registry instance');
assert.deepEqual(WEAPONS,expected,'every legacy field/value including Infinity and absent perShell is unchanged');
assert.deepEqual(LEGACY_WEAPON_IDS,['vanguard','breacher','ghost','arc-blade']);
for(const [index,id] of LEGACY_WEAPON_IDS.entries()){
 assert.equal(getWeaponId(index),id);assert.equal(getWeaponIndex(id),index);
 const definition=getWeaponDefinition(id);assert.equal(definition.legacyIndex,index);assert(Object.isFrozen(definition));assert(Object.isFrozen(definition.combat));
 const a=createWeaponProfile(id),b=createWeaponProfile(id);a.damage=1;assert.notEqual(a.damage,b.damage);assert.equal(b.damage,expected[index].damage);assert.equal(WEAPONS[index].damage,b.damage);
}
for(const value of [-1,4,1.5,NaN,Infinity,'0',null])assert.equal(getWeaponId(value),null);
for(const value of ['unknown','__proto__','constructor',null,{}]){assert.equal(getWeaponDefinition(value),null);assert.equal(createWeaponProfile(value),null);assert.equal(getWeaponIndex(value),-1);}
const copy=()=>WEAPON_DEFINITIONS.map(d=>({...d,combat:{...d.combat}}));
assert.equal(validateWeaponDefinitions(copy()),true);
for(const mutate of [
 d=>d[1].id=d[0].id,d=>d[0].id='../bad',d=>d[0].category='bad',d=>d[1].legacyIndex=0,
 d=>d[0].legacyIndex=-1,d=>d[0].combat.damage=NaN,d=>d[0].combat.delay=0,
 d=>d[0].combat.range=Infinity,d=>d[0].combat.cap=Infinity,d=>d[0].combat.cap=1.5,
 d=>d[0].combat.reserve=-1,d=>d[0].combat.reload=0,d=>d[1].combat.perShell='yes',
 d=>d[0].combat.pellets=0,d=>d[0].combat.spread=-1,d=>d[0].combat.minimumDamage=1.1,
 d=>d[0].combat.falloffStart=71,d=>d[0].combat.automatic=1,d=>d[3].combat.cap=10,
 d=>d[3].combat.reload=1,d=>d[0].combat=null
]){const definitions=copy();mutate(definitions);assert.throws(()=>validateWeaponDefinitions(definitions),TypeError);}
for(const value of [null,{},[],[null]])assert.throws(()=>validateWeaponDefinitions(value),TypeError);
console.log('PASS: per-weapon configs, immutable defaults, mutable isolated profiles, exact legacy combat shape/values/order, stable ID round trips, unknown IDs and malformed definitions');
