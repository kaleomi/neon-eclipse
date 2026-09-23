import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import {createEnemyDirector} from '../src/enemy-ai.js';
import {createEnemyModel,animateEnemy} from '../src/enemy-model.js';
import {ENEMY_TYPES} from '../src/enemy-rules.js';
import {createMortarMarkers} from '../src/mortar-world.js';
import {ARTILLERY,RUSHER} from '../src/squad.js';
const scene=new T.Scene();const nav={direction:(from,to)=>({x:to.x-from.x,z:to.z-from.z})};const move=(pos,dx,dz)=>{pos.x+=dx;pos.z+=dz;};
function actor(type,x,z,seed=0){const group=createEnemyModel(type);group.position.set(x,0,z);scene.add(group);const p=ENEMY_TYPES[type];return {group,type,hp:p.hp,maxHp:p.hp,boss:false,speed:p.speed,radius:p.radius,attack:0,charge:0,seed};}
// Rusher: real model, closes on the player, arms, detonates via callback, hp goes to 0; no projectile queued.
{const enemies=[actor('rusher',0,14)],blasts=[],queued=[];const player={position:new T.Vector3(0,1.7,0)};
 const d=createEnemyDirector({enemies,player,navigation:nav,move,obstacles:[],projectiles:{queue:()=>{queued.push(1);return true;},hasPending:()=>false,cancelOwner(){},attackers:0},onBossEvent(){},onRusherBlast:b=>blasts.push(b)});
 let t=0;for(let i=0;i<400&&!blasts.length;i++){d.update(.02,t,0);t+=.02;}
 assert.equal(blasts.length,1,'detonated');assert.equal(queued.length,0);assert.equal(enemies[0].hp,0);assert(Math.hypot(blasts[0].x,blasts[0].z)<=RUSHER.armRange+.3,'blast near player: '+JSON.stringify(blasts[0]));assert(t>1,'took at least the 1 s fuse');assert(t<4,'sprinter arrives fast: '+t);
 assert(enemies[0].group.userData.rusherDome,'model has payload dome');animateEnemy(enemies[0],1,true,3);assert(enemies[0].group.userData.rusherDome.material.emissiveIntensity>0);}
// Rusher frozen by EMP does not advance or detonate.
{const enemies=[actor('rusher',0,10)],blasts=[];enemies[0].empRemaining=5;const player={position:new T.Vector3(0,1.7,0)};
 const d=createEnemyDirector({enemies,player,navigation:nav,move,obstacles:[],projectiles:{queue:()=>true,hasPending:()=>false,cancelOwner(){},attackers:0},onBossEvent(){},onRusherBlast:b=>blasts.push(b)});
 for(let i=0;i<200;i++)d.update(.02,i*.02,0);assert.equal(blasts.length,0);assert.equal(enemies[0].group.position.z,10);}
// Artillery mech: telegraph event at the player's position, landing event exactly ARTILLERY.telegraph later at the same point even after the player moved; markers created and expire.
{const enemies=[actor('artilleryMech',0,18)],events=[];const player={position:new T.Vector3(0,1.7,0)};enemies[0].group.rotation.y=Math.atan2(0,-18);
 const d=createEnemyDirector({enemies,player,navigation:nav,move,obstacles:[],projectiles:{queue:()=>{throw new Error('artillery must not queue bolts');},hasPending:()=>false,cancelOwner(){},attackers:0},onBossEvent(){},onMortar:e=>events.push({...e,at:events.length})});
 const markers=createMortarMarkers(scene);let t=0;for(let i=0;i<600&&events.length<2;i++){d.update(.02,t,0);for(const e of events)if(e.type==='telegraph'&&!e.drawn){e.drawn=true;markers.telegraph(e);}markers.update(.02);t+=.02;if(events.length===1&&!player.moved){player.position.x=6;player.moved=true;}}
 assert.equal(events[0]?.type,'telegraph');assert.equal(events[1]?.type,'land');assert.equal(events[1].x,events[0].x);assert.equal(events[1].z,events[0].z);assert.equal(events[0].x,0,'telegraph sampled the original player position');
 assert.equal(events[1].radius,ARTILLERY.radius);assert.equal(events[1].damage,ARTILLERY.damage);assert.equal(markers.count,1);for(let i=0;i<20;i++)markers.update(.1);assert.equal(markers.count,0,'marker expires after landing');
 assert(d.mortars.length===0);const parts=enemies[0].group.children;assert(parts.some(m=>m.userData.hitZone==='leg'));assert(parts.some(m=>m.userData.hitZone==='core'));assert(enemies[0].group.userData.artilleryHatch.visible);
 enemies[0].artillery={legHits:0,exposed:2};animateEnemy(enemies[0],0,false,10);assert(!enemies[0].group.userData.artilleryHatch.visible,'hatch opens while exposed');d.clear();}
// Artillery holds fire inside minimum range (no telegraph when the player is close).
{const enemies=[actor('artilleryMech',0,4)],events=[];const player={position:new T.Vector3(0,1.7,0)};
 const d=createEnemyDirector({enemies,player,navigation:nav,move,obstacles:[],projectiles:{queue:()=>true,hasPending:()=>false,cancelOwner(){},attackers:0},onBossEvent(){},onMortar:e=>events.push(e)});
 for(let i=0;i<150;i++)d.update(.02,i*.02,0);assert.equal(events.length,0);}
// Squad: with a fresh sighting, one member is a flanker whose path diverges from the direct line; cover holds at range; roles visible in state.
{const enemies=[actor('assault',0,16,0),actor('assault',1,17,1),actor('assault',-1,18,0),actor('ranged',0,22,0)];const player={position:new T.Vector3(0,1.7,0)};const startX=enemies.map(e=>e.group.position.x);
 const d=createEnemyDirector({enemies,player,navigation:nav,move,obstacles:[],projectiles:{queue:()=>true,hasPending:()=>false,cancelOwner(){},attackers:0,aimTarget:()=>null},onBossEvent(){}});
 for(let i=0;i<60;i++)d.update(.02,i*.02,0);const roles=Object.values(d.squad.roles);assert(roles.includes('press')&&roles.includes('flank')&&roles.includes('cover'),JSON.stringify(d.squad));
 const flanker=enemies.find((e,i)=>d.squad.roles[i+':'+e.type]==='flank');assert(flanker);const fi=enemies.indexOf(flanker),presser=enemies.find((e,i)=>d.squad.roles[i+':'+e.type]==='press');assert(Math.abs(flanker.group.position.x-startX[fi])>.6,'flanker moved sideways: '+(flanker.group.position.x-startX[fi]));assert(Math.abs(presser.group.position.x-startX[enemies.indexOf(presser)])<.3,'presser goes straight');
 const ranged=enemies[3];assert(ranged.group.position.z>ENEMY_TYPES.ranged.near,'cover keeps distance');d.clear();assert.deepEqual(d.squad.roles,{});}
console.log('PASS real-director rusher arm/detonate/EMP freeze, artillery telegraph→landing fidelity with marker lifecycle and minimum range, squad press/flank/cover on live actors');
