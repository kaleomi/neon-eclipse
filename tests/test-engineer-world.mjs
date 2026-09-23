import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import {createEngineerDirector} from '../src/engineer-director.js';
import {createEnemyModel} from '../src/enemy-model.js';
const scene=new T.Scene(),player={position:new T.Vector3(0,1.7,10)},obstacles=[],enemies=[],events=[];let deployed=0,allow=true,pending=false,success=true;
function actor(){const group=createEnemyModel('engineer');scene.add(group);const e={group,type:'engineer',hp:90,attack:0,charge:0,radius:.65};enemies.push(e);return e;}
let e=actor();const d=createEngineerDirector({scene,enemies,player,obstacles,projectiles:{hasPending:()=>pending},canStart:()=>allow,deploy:()=>{if(!success)return false;deployed++;return true;},onEvent:(event)=>events.push(event)});
assert.equal(e.group.name,'FIELD_ENGINEER');const ray=new T.Raycaster(new T.Vector3(0,1.94,5),new T.Vector3(0,0,-1));scene.updateMatrixWorld(true);assert.equal(ray.intersectObjects(e.group.children,false)[0].object.userData.hitZone,'head');
allow=false;d.update(2);assert.equal(d.pending,0);allow=true;pending=true;d.update(.1);assert.equal(d.pending,0);pending=false;d.update(.1);assert.equal(d.pending,1);assert.equal(e.engineerRemaining,2.5);const marker=scene.children.find(o=>o.name==='ENGINEER_DEPLOYMENT');assert(marker);ray.set(new T.Vector3(0,5,2.5),new T.Vector3(0,-1,0));scene.updateMatrixWorld(true);assert.equal(ray.intersectObjects(marker.children,false).length,0);
d.update(0);assert.equal(e.engineerRemaining,2.5);d.update(2.49);assert.equal(deployed,0);e.hp-=1;d.update(.01);assert.equal(d.pending,0);assert.equal(deployed,0);assert.equal(e.engineerCooldown,3);assert(!scene.children.includes(marker));d.update(2.99);assert.equal(d.pending,0);d.update(.011);assert.equal(d.pending,1);d.update(2.49);assert.equal(deployed,0);d.update(.011);assert.equal(deployed,1);assert(e.engineerSpent);assert(d.used);actor();d.update(20);assert.equal(d.pending,0);assert.equal(deployed,1,'no rebuilding even after deployed turret destruction');
function reset(){d.clear();for(const a of enemies)scene.remove(a.group);enemies.length=0;e=actor();deployed=0;success=true;obstacles.length=0;d.update(2);assert.equal(d.pending,1);}
reset();const site=scene.children.find(o=>o.name==='ENGINEER_DEPLOYMENT').position;player.position.set(site.x,1.7,site.z);d.update(2.5);assert.equal(deployed,0);assert.equal(d.pending,0);player.position.set(0,1.7,10);
reset();const wall=new T.Mesh(new T.BoxGeometry(8,3,.1),new T.MeshBasicMaterial());wall.position.set(0,1.5,1.25);scene.add(wall);obstacles.push({x:0,z:1.25,w:8,d:.1,h:3,mesh:wall});d.update(2.5);assert.equal(deployed,0);assert.equal(d.pending,0,'new LOS obstruction cancels construction');scene.remove(wall);
reset();success=false;d.update(2.5);assert.equal(deployed,0);assert(!d.used);assert(!e.engineerSpent);assert.equal(e.engineerCooldown,3);
reset();enemies.push({type:'sentry',hp:150});d.update(2.5);assert.equal(deployed,0);assert.equal(d.pending,0,'existing sentry prevents completion');enemies.pop();
reset();e.hp=0;d.update(3);assert.equal(deployed,0);assert.equal(d.pending,0);assert(!scene.children.some(o=>o.name==='ENGINEER_DEPLOYMENT'));
reset();enemies.splice(0,1);d.update(3);assert.equal(deployed,0);assert.equal(d.pending,0);
reset();d.clear();assert.equal(d.pending,0);assert(!e.engineerBuilding);assert(!scene.children.some(o=>o.name==='ENGINEER_DEPLOYMENT'));assert(events.includes('interrupted')&&events.includes('deployed'));
console.log('PASS: distinct hittable engineer, full 2.5s non-hittable construction marker, attack gate/pending checks, hit interrupt at deadline, retry delay, one lifetime deployment across multiple engineers, last-moment occupancy/LOS/cap revalidation, failed spawn, death/removal/reset cleanup');
