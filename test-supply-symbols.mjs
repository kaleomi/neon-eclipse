import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {SUPPLY_SYMBOLS,supplySymbolSVG} from './supply-symbols.js';
import {createSupplyMark,createSupplyBadge} from './supply-badge.js';
import {createMissionWorld} from './mission-world.js';
import {SUPPLIES,STAGES} from './mission.js';

assert.equal(SUPPLY_SYMBOLS.ammo.contours.length,6,'three cartridges, body and rim each');
const bodyContours=SUPPLY_SYMBOLS.ammo.contours.filter((_,index)=>index%2===0);
assert.deepEqual(bodyContours.map(points=>Math.min(...points.map(p=>p[1]))),[2,2,2],'cartridges align in one horizontal row');
assert.deepEqual(bodyContours.map(points=>Math.min(...points.map(p=>p[0]))),[3,27,51]);
assert.equal(SUPPLY_SYMBOLS.health.contours.length,1);assert.equal(SUPPLY_SYMBOLS.health.contours[0].length,12,'a full plus sign, not a single vertical bar');
assert.equal(SUPPLY_SYMBOLS.health.color,'#ff4f60');
assert.equal((supplySymbolSVG('ammo','ammo-symbol').match(/<polygon/g)||[]).length,6);
assert(supplySymbolSVG('health','health-symbol').includes('aria-hidden="true"'));
assert.throws(()=>supplySymbolSVG('unknown'));
assert(Object.isFrozen(SUPPLY_SYMBOLS.ammo.contours[0][0]));
for(const type of ['health','ammo']){
 const mark=createSupplyMark(type),second=createSupplyMark(type,.62),badge=createSupplyBadge(type);
 assert.equal(mark.geometry,second.geometry,'geometry reused');assert.equal(mark.material,second.material);
 assert.equal(mark.material.color.getHexString(),SUPPLY_SYMBOLS[type].color.slice(1));
 assert.equal(mark.material.depthTest,true);assert.equal(mark.material.depthWrite,false);assert.equal(mark.material.toneMapped,false);
 mark.geometry.computeBoundingBox();assert(mark.geometry.boundingBox.max.x<=.5&&mark.geometry.boundingBox.min.x>=-.5);
 assert.equal(badge.getObjectByName('supply-symbol-'+type).material.depthTest,true,'badge does not bypass scene occlusion');
}
const context={fillRect(){},strokeRect(){},fillText(){}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const scene=new T.Scene(),obstacles=[],world=createMissionWorld(scene,obstacles);
const expectedTerminals=STAGES.flatMap(stage=>stage.points||[stage]).length-STAGES.filter(stage=>stage.boss||stage.id==='extract').length;
assert.equal(obstacles.length,expectedTerminals,'supply artwork does not add collisions');
const roots=scene.children.filter(child=>child.userData.supplyType);
assert.equal(roots.length,SUPPLIES.length);
for(const def of SUPPLIES){
 const root=scene.getObjectByName('supply-'+def.id);assert(root);
 assert.equal(root.position.x,def.x);assert.equal(root.position.z,def.z);
 assert.equal(root.position.y,(def.feetY||0)+.55);
 const top=root.getObjectByName('supply-mark-top'),front=root.getObjectByName('supply-mark-front'),badge=root.getObjectByName('supply-badge-'+def.type);
 assert(top&&front&&badge);assert.equal(top.rotation.x,-Math.PI/2);assert(top.position.y>.25);assert(front.position.z>.335);assert(badge.position.y>.7);
 assert.equal(top.userData.supplySymbol,def.type);
}
const camera=new T.PerspectiveCamera();camera.rotation.set(.3,.8,0);camera.updateMatrixWorld(true);
world.update(1.2,0,false,0,camera);
const rotation=camera.getWorldQuaternion(new T.Quaternion());
for(const root of roots){const badge=root.children.find(child=>child.name.startsWith('supply-badge-'));assert(Math.abs(badge.quaternion.dot(rotation))>.999999);}
const def=SUPPLIES[0],player={x:def.x,z:def.z,y:(def.feetY||0)+1.7};let calls=0;
world.collect({...player,y:player.y+1},()=>{calls++;return true;});assert.equal(calls,0,'wrong-floor pickup still blocked');
world.collect(player,()=>false);assert.equal(world.collected.length,0,'full HP/ammo can still reject consumption');
world.collect(player,()=>true);assert(world.collected.includes(def.id));assert.equal(scene.getObjectByName('supply-'+def.id).visible,false,'collected badge is hidden with its crate');
world.reset();assert.equal(world.collected.length,0);world.restore([def.id]);assert.deepEqual(world.collected,[def.id]);assert.equal(world.available.length,SUPPLIES.length-1);
console.log('PASS: shared horizontal cartridge contours/red plus, solid visible 3D top/front/billboard marks with depth testing, unchanged pickup positions/heights/refusal/collect/reset/restore');
