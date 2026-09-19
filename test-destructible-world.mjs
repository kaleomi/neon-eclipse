import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {createRailPanels} from './rail-panels.js';
import {createDestructibles} from './destructibles.js';
import {createNavigator} from './arena.js';
import {createPlayerMotion} from './player-motion.js';
import {createEnemyProjectiles} from './projectiles.js';
import {selectRailImpacts} from './weapons/railspike-rules.js';
const scene=new T.Scene(),foreign={x:20,z:20,w:1,d:1,h:3,mesh:new T.Mesh(new T.BoxGeometry(1,3,1))},obstacles=[foreign];scene.add(foreign.mesh);
const panels=createRailPanels(scene,obstacles),original=obstacles.slice(),reference=obstacles;let changes=0,breaks=0;const nav=createNavigator(obstacles);nav.rebuild(0,29);assert(!nav.isReachable(6,24));
const world=createDestructibles(scene,obstacles,panels,{onTopologyChange:()=>{changes++;nav.invalidate();},onBreak:()=>breaks++}),motion=createPlayerMotion(obstacles),ray=new T.Raycaster(new T.Vector3(5,1,27),new T.Vector3(0,0,-1),0,10);
scene.updateMatrixWorld(true);assert.equal(ray.intersectObjects(obstacles.map(o=>o.mesh),false)[0].object,panels[1]);assert(!motion.canOccupy(5,24,0));
assert.equal(world.hit(panels[1],26).hp,34);assert.equal(changes,0);assert(world.isTarget(panels[1]));
world.hit(panels[1],100);assert.equal(changes,1);assert.equal(breaks,1);assert(!world.isTarget(panels[1]));assert(!panels[1].visible);assert(motion.canOccupy(5,24,0));nav.rebuild(0,29);assert(nav.isReachable(6,24));assert.equal(ray.intersectObjects(obstacles.map(o=>o.mesh),false).length,0);world.hit(panels[1],100);assert.equal(breaks,1);
assert.equal(obstacles,reference);assert(obstacles.includes(foreign));world.reset();assert.deepEqual(new Set(obstacles),new Set(original));assert.equal(world.snapshot()[1].hp,60);nav.rebuild(0,29);assert(!nav.isReachable(6,24));
const resources=scene.children.length,children=panels.map(p=>p.children.length);for(let i=0;i<40;i++){world.hit(panels[0],60);world.reset();}assert.equal(scene.children.length,resources);assert.deepEqual(panels.map(p=>p.children.length),children);assert.equal(obstacles.length,3);
world.reset(new T.Vector3(5,1.7,24));assert(!world.snapshot()[1].enabled);assert(motion.canOccupy(5,24,0));assert(world.snapshot()[0].enabled);assert.equal(world.hit(panels[1],100),null);world.reset();
// The same discharge retains its authored thin-sheet factor even when that sheet breaks.
const target=new T.Mesh(new T.BoxGeometry(1,2,1));target.position.set(5,1,22);scene.add(target);scene.updateMatrixWorld(true);
const impacts=selectRailImpacts(ray.intersectObjects([panels[1],target],false),m=>m===target?'actor':null);assert.equal(impacts.count,1);assert.equal(impacts.hits[1].railFactor,.85);world.hit(impacts.hits[0].object,200);assert.equal(impacts.hits[1].railFactor,.85);
// Enemy impact is consumed at the panel; a later bolt can use the new opening.
world.reset();let hurt=0,hooks=0;const player=new T.Vector3(5,1.7,27);
const bolts=createEnemyProjectiles(scene,obstacles,d=>hurt+=d,()=>{},{onObstacleHit:(o,b)=>{hooks++;world.hit(o.mesh,b.damage);}});
function emit(damage){bolts.queue(new T.Vector3(5,1.35,22),new T.Vector3(5,1.35,28),false,null,{color:'orange',charge:0,speed:20,damage,angles:[0]});bolts.update(0,player);bolts.update(.3,player);}
emit(60);assert.equal(hooks,1);assert.equal(hurt,0);assert.equal(bolts.count,0);assert(world.snapshot()[1].broken);emit(10);assert.equal(hurt,10);
// Reflected bolts use the same obstacle identity callback, but cannot tunnel on break.
bolts.clear();world.reset();let reflected=false;
const returned=createEnemyProjectiles(scene,obstacles,()=>assert.fail('parry missed'),()=>{},{tryParry:()=>true,onObstacleHit:(o,b)=>{reflected=b.reflected;world.hit(o.mesh,b.damage);}});
returned.queue(new T.Vector3(5,1.35,25.8),new T.Vector3(5,1.35,27),false,null,{color:'orange',charge:0,speed:20,damage:60,angles:[0]});returned.update(0,player);returned.update(.2,player);assert(reflected);assert(world.snapshot()[1].broken);assert.equal(returned.count,0);
world.reset();assert.equal(world.snapshot().filter(s=>s.colliding).length,2);assert(obstacles.includes(foreign));
// Optional third layout value elevates the panel (train deck) with a matching collider band.
const hiScene=new T.Scene(),hiObstacles=[];const hiPanels=createRailPanels(hiScene,hiObstacles,[[0,0,1.5]]);
assert.equal(hiObstacles.length,1);assert.equal(hiObstacles[0].bottom,1.5);assert.equal(hiObstacles[0].top,3.3);assert.equal(hiPanels[0].position.y,2.4);
const hiWorld=createDestructibles(hiScene,hiObstacles,hiPanels);assert.equal(hiWorld.snapshot()[0].enabled,true);hiWorld.hit(hiPanels[0],60);assert(hiWorld.snapshot()[0].broken);assert.equal(hiObstacles.length,0);
console.log('PASS real rail meshes, movement/raycast/navigation removal, 40 resource-stable resets, safe restore, retained rail factor, enemy and reflected impacts, elevated panel colliders');
