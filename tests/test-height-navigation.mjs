import assert from 'node:assert/strict';
import {createRoofEnemyNavigation,sameEnemyLayer,enemyMuzzleHeight} from '../src/roof-enemy-navigation.js';
import {SERVICE_STAIRS,SERVICE_DECKS} from '../src/transport-rules.js';
import {roofObstacles} from '../src/roof-data.js';
import {createNavigator} from '../src/arena.js';
import {boardingStatus,mayCloseBoardingGate} from '../src/boarding-rules.js';
const obstacles=roofObstacles(1).concat([...SERVICE_STAIRS,...SERVICE_DECKS].map(o=>({...o,h:o.top}))),nav=createNavigator(obstacles),v=createRoofEnemyNavigation(obstacles,nav);
function walk(p,target,r,seconds=100){for(let i=0;i<seconds*50;i++){const d=v.route(p,target,r)||nav.direction(p,target),len=Math.hypot(d.x,d.z);if(len>.01)v.move(p,d.x/len*.04,d.z/len*.04,r);}}
for(const r of [.65,.85])for(const [x,z] of [[18,6],[32,-4],[-10,0],[20,16]]){
 const p={x,y:0,z};walk(p,{x:30,y:4.7,z:5},r);assert(p.y>2.99&&p.x>28,JSON.stringify({p,r,from:[x,z]}));
 walk(p,{x:16,y:1.7,z:12},r);assert.equal(p.y,0,'walk down instead of cliff drop');assert(p.x<19);
}
const edge={x:32,y:3,z:7};v.move(edge,0,10,.85);assert(edge.y===3&&edge.z<10,'no cliff walking');
assert(!sameEnemyLayer({y:0},{y:3}));assert(sameEnemyLayer({y:1},{y:1.25}));assert.equal(enemyMuzzleHeight({type:'ranged',group:{position:{y:3}}}),4.6);
assert.equal(boardingStatus(8).dock,'upper');assert.equal(boardingStatus(19).dock,'far');assert.equal(boardingStatus(12).dock,null);
const g={x:34.05,z:5,w:.12,d:3,bottom:3,top:4.15};assert(!mayCloseBoardingGate({x:34,z:5},3,g));assert(mayCloseBoardingGate({x:34,z:5},0,g));assert(mayCloseBoardingGate({x:30,z:5},3,g));
console.log('PASS: assault/ranged/heavy routes from four approach directions, stair ascent/descent, cliff protection, layer separation, elevated muzzle, dock countdown and gate occupancy');
