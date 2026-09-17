import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {createEnemyDirector} from './enemy-ai.js';
import {createRoofEnemyNavigation} from './roof-enemy-navigation.js';
import {createNavigator} from './arena.js';
import {roofObstacles} from './roof-data.js';
import {SERVICE_STAIRS,SERVICE_DECKS} from './transport-rules.js';
const obstacles=roofObstacles(1).concat([...SERVICE_STAIRS,...SERVICE_DECKS].map(o=>({...o,h:o.top}))),scene=new T.Scene();
for(const o of obstacles){o.mesh=new T.Mesh(new T.BoxGeometry(o.w,(o.top??o.h)-(o.bottom??0),o.d),new T.MeshBasicMaterial());o.mesh.position.set(o.x,((o.top??o.h)+(o.bottom??0))/2,o.z);scene.add(o.mesh);}scene.updateMatrixWorld(true);
for(const type of ['assault','ranged','heavy']){
 const nav=createNavigator(obstacles),vertical=createRoofEnemyNavigation(obstacles,nav),group=new T.Group();group.position.set(18,0,6);
 const e={group,type,boss:false,radius:type==='heavy'?.85:.65,speed:3,attack:0,charge:0,seed:0,hp:100};
 const shots=[],player={position:new T.Vector3(32,4.7,7)};
 const director=createEnemyDirector({enemies:[e],player,navigation:nav,vertical,move:()=>{},obstacles,projectiles:{queue:(origin)=>{shots.push(origin.clone());return true},hasPending:()=>false,cancelOwner(){}},onBossEvent(){}});
 let gate=0,maxHeight=0;for(let i=0;i<3500;i++){gate=director.update(.02,i*.02,Math.max(0,gate-.02));maxHeight=Math.max(maxHeight,group.position.y);}
 assert(maxHeight>=3,'actual director climbs '+type);assert(shots.some(o=>o.y>=4.5),'shoots from elevated muzzle '+type);
 player.position.set(16,1.7,12);let reachedGround=false;for(let i=0;i<3500;i++){gate=director.update(.02,i*.02,Math.max(0,gate-.02));if(group.position.y===0&&group.position.x<20-e.radius)reachedGround=true;}assert(reachedGround,'actual director descends past stair exit '+type);
}
console.log('PASS: actual Three.js enemy director: assault, ranged, heavy ascend, retain role tactics, fire above deck and descend');

const {createTransportWorld}=await import('./transport-world.js');
const {createPlayerMotion}=await import('./player-motion.js');
globalThis.document={createElement:()=>({style:{}}),body:{append(){}}};
const gatesScene=new T.Scene(),volumes=[],solids=[],world=createTransportWorld(gatesScene,volumes,solids);
const rider={x:33,y:4.7,z:5},motion=createPlayerMotion(solids,volumes);motion.reset(rider,3);
world.reset(0);world.tick(.01,rider,motion);
for(let i=0;i<30;i++)motion.step(.02,rider,.1,0);assert(rider.x<33.7,'absent carrier closes real collision gate');
world.reset(8);world.tick(.01,rider,motion);for(let i=0;i<15;i++)motion.step(.02,rider,.1,0);assert(rider.x>34.5,'docked carrier opens collision gate');
rider.x=34.05;rider.z=5;motion.reset(rider,3);world.reset(11);world.tick(.01,rider,motion);assert(!volumes.some(o=>o.dock==='upper'),'occupied doorway prevents gate closing');
const stamp=world.time;world.tick(0,rider,motion);assert.equal(world.time,stamp);
console.log('PASS: real boarding gate collision, dock opening, occupied doorway and paused transport');
