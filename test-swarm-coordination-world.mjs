import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {createEnemyModel} from './enemy-model.js';
import {createEnemyDirector} from './enemy-ai.js';
import {createEnemyProjectiles} from './projectiles.js';
const scene=new T.Scene(),player=new T.PerspectiveCamera();player.position.set(0,1.7,0);
const make=(type,x,z)=>{const group=createEnemyModel(type);group.position.set(x,type==='swarmDrone'?1.9:0,z);scene.add(group);return {group,type,hp:100,maxHp:100,speed:0,radius:.5,seed:0,attack:type==='ranged'?999:0,charge:0,boss:false};};
const source=make('swarmDrone',0,-9),a=make('ranged',4,-9),b=make('ranged',6,-9),enemies=[source,a,b];source.swarm={center:{x:0,y:1.9,z:-9}};source.swarmSlot=1;
const wall=new T.Mesh(new T.BoxGeometry(4,4,.2),new T.MeshBasicMaterial());wall.position.set(3,2,-7);scene.add(wall);const obstacles=[{x:3,z:-7,w:4,d:.2,h:4,mesh:wall}],goals=[],queued=[];
const projectiles=createEnemyProjectiles(scene,obstacles,()=>{},()=>{},{onQueue:(o,attack,boss,owner)=>queued.push({owner,attack})});
const director=createEnemyDirector({enemies,player,obstacles,projectiles,navigation:{direction:(p,t)=>{if(p===a.group.position)goals.push({...t});return {x:t.x-p.x,z:t.z-p.z};}},move:()=>{},onBossEvent:()=>{}});
scene.updateMatrixWorld(true);let gate=director.update(.01,.01,0);projectiles.update(.01,player.position);assert.equal(queued.length,1);assert.equal(queued[0].attack.color,'blue');assert.equal(director.coordination.receivers,2);assert.equal(goals.at(-1).x,0);
player.position.x=-2;director.update(.1,.11,Math.max(0,gate-.1));assert.equal(goals.at(-1).x,0,'hidden recipient navigates frozen observation rather than live player');assert(!director.coordination.lit);assert.equal(queued.length,1,'shared memory is not permission to shoot through wall');
// Actual visibility overrides stale shared memory; current obstacle list is consulted.
projectiles.clear();obstacles.length=0;scene.remove(wall);source.attack=999;source.charge=0;for(const e of [a,b]){e.attack=0;e.charge=0;e.group.rotation.y=Math.atan2(player.position.x-e.group.position.x,player.position.z-e.group.position.z);}scene.updateMatrixWorld(true);
gate=director.update(.01,.12,0);assert.equal(queued.length,2);assert(queued[1].owner===a.group||queued[1].owner===b.group);assert.equal(projectiles.charging,1);assert(gate>=1);assert.equal(a.lastVisualPoint.x,-2);director.update(.5,.62,0);assert.equal(projectiles.charging,1,'cannot start a second coordinated telegraph even when caller gate is zero');
projectiles.clear();const pattern={charge:.01,angles:[0],bursts:1,speed:13,damage:3,color:'purple'};for(const e of [a,b])projectiles.queue(e.group.position,player.position,false,e.group,pattern);projectiles.update(.01,player.position);assert.equal(projectiles.countThreatTag('swarmCoordinated'),2);source.attack=0;source.charge=0;a.attack=b.attack=0;a.charge=b.charge=0;director.update(.01,.63,0);assert.equal(projectiles.charging,0,'two active squad threats block new blue/receiver queues');
source.hp=0;director.update(0,.63,0);assert.equal(director.coordination,null);assert(!a.swarmIntel&&!b.swarmIntel);director.clear();assert(!a.group.userData.swarmCoordinated);projectiles.clear();assert.equal(projectiles.countThreatTag('swarmCoordinated'),0);
console.log('PASS: real blue queue publishes intel, hidden ranged searches old coordinates/no wall shots, visible reacquisition, single coordinated telegraph and combined two-threat budget, source death and reset cleanup');
