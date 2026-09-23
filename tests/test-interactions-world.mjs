import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import {createEnemyDirector} from '../src/enemy-ai.js';
import {createEnemyModel} from '../src/enemy-model.js';
import {ENEMY_TYPES} from '../src/enemy-rules.js';
import {createInteractionWorld} from '../src/interaction-world.js';
import {INTERACTION_LAYOUTS} from '../src/interaction-layouts.js';
import {VENT,LIGHTS} from '../src/interaction-rules.js';
const scene=new T.Scene(),obstacles=[];const hemi=new T.HemisphereLight(0xffffff,0x222222,2),sun=new T.DirectionalLight(0xffffff,2.6);
const events=[];const world=createInteractionWorld(scene,obstacles,{theme:'t / t',vent:{x:0,z:0,zone:{x:6,z:0}},light:{x:0,z:8}},{lights:[hemi,sun],onEvent:e=>events.push(e)});
assert.equal(obstacles.filter(o=>o.interaction).length,2,'two pedestals collide');
const nav={direction:(a,b)=>({x:b.x-a.x,z:b.z-a.z})},move=(pos,dx,dz)=>{pos.x+=dx;pos.z+=dz;};
function actor(type,x,z){const g=createEnemyModel(type);g.position.set(x,0,z);scene.add(g);const p=ENEMY_TYPES[type];return {group:g,type,hp:p.hp,maxHp:p.hp,boss:false,speed:p.speed,radius:p.radius,attack:0,charge:0,seed:0};}
// Vent live: guard inside the cloud moves at half speed and never queues a telegraph; guard outside behaves normally.
{const inside=actor('assault',6,0),outside=actor('assault',20,0);const queued=[];const player={position:new T.Vector3(6,1.7,-30)};
 const d=createEnemyDirector({enemies:[inside,outside],player,navigation:nav,move,obstacles:[],projectiles:{queue:(o,t,b,owner)=>{queued.push(owner);return true;},hasPending:()=>false,cancelOwner(){},attackers:0},onBossEvent(){},squadEnabled:false,environment:{vent:world.vent,lights:world.light}});
 const ctx={player:{x:1,z:0},feetY:0,held:true,busy:false};world.update(1.6,ctx);assert.equal(events[0]?.type,'vent');assert(world.vent.state.active>0);
 const z0=inside.group.position.z,z1=outside.group.position.z;for(let i=0;i<25;i++){d.update(.02,i*.02,0);}
 const dIn=Math.abs(inside.group.position.z-z0),dOut=Math.abs(outside.group.position.z-z1);assert(dIn>0&&dOut>0);assert(Math.abs(dIn/dOut-VENT.slow)<.08,'inside slowed to '+ (dIn/dOut).toFixed(2));
 // force both into firing posture: aligned + within range; only outside may telegraph
 inside.group.rotation.y=Math.atan2(player.position.x-6,player.position.z-0);outside.group.rotation.y=Math.atan2(player.position.x-20,player.position.z-0);player.position.set(6,1.7,-12);
 for(let i=0;i<60;i++)d.update(.02,1+i*.02,0);
 assert(queued.includes(outside.group),'outside guard fires');assert(!queued.includes(inside.group),'cloud suppresses telegraph');
 world.update(VENT.duration+1,{});assert.equal(world.vent.state.active,0);}
// Lights off: sniper range shrinks (no shot at 0.7*range distance), stalker faster; lights on restores; light intensities follow.
{world.reset();events.length=0;const sniper=actor('sniper',0,0),stalker=actor('stalker',30,0);const queued=[];const range=ENEMY_TYPES.sniper.range,dist=range*.8;const player={position:new T.Vector3(0,1.7,dist)};sniper.group.rotation.y=0;
 const d=createEnemyDirector({enemies:[sniper,stalker],player,navigation:nav,move,obstacles:[],projectiles:{queue:(o,t,b,owner)=>{queued.push(owner);return true;},hasPending:()=>false,cancelOwner(){},attackers:0},onBossEvent(){},squadEnabled:false,environment:{vent:world.vent,lights:world.light}});
 assert.equal(hemi.intensity,2);world.update(.7,{player:{x:0,z:8},feetY:0,held:true});assert.equal(events[0]?.type,'dark');assert(!world.light.lit);assert(hemi.intensity<1&&sun.intensity<1,'floodlights dimmed');
 const sz=stalker.group.position.x;for(let i=0;i<40;i++)d.update(.02,i*.02,0);const darkStep=Math.abs(stalker.group.position.x-sz);assert(!queued.includes(sniper.group),'sniper cannot reach 0.8 range in the dark');
 world.update(0,{player:{x:0,z:8},feetY:0,held:false});world.update(.7,{player:{x:0,z:8},feetY:0,held:true});assert(world.light.lit);assert.equal(hemi.intensity,2,'intensity restored exactly');
 sniper.attack=0;sniper.charge=0;const sx=stalker.group.position.x;for(let i=0;i<40;i++)d.update(.02,2+i*.02,0);const litStep=Math.abs(stalker.group.position.x-sx);assert(litStep>0&&Math.abs(darkStep/litStep-LIGHTS.darkSpeedScale)<.08,'stalker dark speed ratio '+(darkStep/litStep).toFixed(2));
 assert(queued.includes(sniper.group),'sniper fires again with lights on');}
// Every chapter layout builds and disposes cleanly with colliders removed.
for(const [map,layout] of Object.entries(INTERACTION_LAYOUTS)){const s=new T.Scene(),o=[];const w=createInteractionWorld(s,o,layout,{});assert.equal(o.length,2,map);assert(w.prompt({x:layout.vent.x+.5,z:layout.vent.z},layout.vent.y||0).includes('E'));assert.equal(w.prompt({x:layout.vent.x+50,z:layout.vent.z},0),'');w.dispose();assert.equal(o.length,0,map+' disposed');}
console.log('PASS live vent slows and silences guards inside the cloud only, light switch dims real lights and shrinks sniper reach / speeds stalkers reversibly, nine layouts build and dispose');
