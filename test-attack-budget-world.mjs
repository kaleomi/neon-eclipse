import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {createEnemyProjectiles} from './projectiles.js';
import {createEnemyDirector} from './enemy-ai.js';
import {createEnemyModel} from './enemy-model.js';
import {ENEMY_TYPES} from './enemy-rules.js';
import {createAttackBudget} from './attack-budget.js';
import {createOverseer} from './overseer-rules.js';
import {createBossAdapter} from './boss-adapter.js';
const scene=new T.Scene();
// Real projectile system honours external budget consumers.
{const budget=createAttackBudget({max:3});let bossWarning=0;const projectiles=createEnemyProjectiles(scene,[],()=>{},()=>{},{maxAttackers:3,budget});budget.register('projectiles',()=>projectiles.attackers);budget.register('boss',()=>bossWarning);
 const target=new T.Vector3(0,1.7,0),owners=[1,2,3,4].map(()=>new T.Group());
 assert(projectiles.queue(new T.Vector3(0,1,10),target,false,owners[0]));assert(projectiles.queue(new T.Vector3(2,1,10),target,false,owners[1]));assert(projectiles.queue(new T.Vector3(4,1,10),target,false,owners[2]));assert(!projectiles.queue(new T.Vector3(6,1,10),target,false,owners[3]),'fourth attacker denied without boss');
 assert.equal(budget.total(),3);projectiles.clear();assert.equal(projectiles.attackers,0);
 bossWarning=1;assert(projectiles.queue(new T.Vector3(0,1,10),target,false,owners[0]));assert(projectiles.queue(new T.Vector3(2,1,10),target,false,owners[1]));assert(!projectiles.queue(new T.Vector3(4,1,10),target,false,owners[2]),'boss warning reserves one of three slots');
 assert(projectiles.queue(new T.Vector3(0,1,10),target,false,owners[0]),'existing attacker may re-queue its own slot');bossWarning=0;assert(projectiles.queue(new T.Vector3(4,1,10),target,false,owners[2]),'slot returns when boss telegraph ends');projectiles.clear();}
// Real boss adapter as the budget's boss source.
{const rules=createOverseer();rules.reset(true);const boss=createBossAdapter(rules,'overseer');const budget=createAttackBudget();budget.register('boss',()=>boss.threatening?1:0);
 assert.equal(budget.total(),0);rules.state.attack='warning';assert.equal(budget.total(),1);assert(boss.interruptCharge());assert.equal(budget.total(),0);}
// Artillery director defers its mortar while the budget is full, then fires when a slot frees; mortar itself occupies a slot.
{const budget=createAttackBudget({max:3});let external=3;budget.register('projectiles',()=>external);
 const group=createEnemyModel('artilleryMech');group.position.set(0,0,18);scene.add(group);const p=ENEMY_TYPES.artilleryMech;const enemies=[{group,type:'artilleryMech',hp:p.hp,maxHp:p.hp,boss:false,speed:p.speed,radius:p.radius,attack:0,charge:0,seed:0}];
 const events=[];const player={position:new T.Vector3(0,1.7,0)};
 const d=createEnemyDirector({enemies,player,navigation:{direction:(a,b)=>({x:b.x-a.x,z:b.z-a.z})},move:(pos,dx,dz)=>{pos.x+=dx;pos.z+=dz;},obstacles:[],projectiles:{queue:()=>true,hasPending:()=>false,cancelOwner(){},attackers:0},onBossEvent(){},onMortar:e=>events.push(e),attackBudget:budget});
 for(let i=0;i<150;i++)d.update(.02,i*.02,0);assert.equal(events.length,0,'no mortar while three attackers hold the budget');
 external=2;for(let i=0;i<150&&!events.length;i++)d.update(.02,3+i*.02,0);assert.equal(events[0]?.type,'telegraph');assert.equal(budget.count('mortars'),1);assert(!budget.allow('projectiles'),'mortar in flight closes the last slot');
 for(let i=0;i<120&&events.length<2;i++)d.update(.02,6+i*.02,0);assert.equal(events[1]?.type,'land');assert.equal(budget.count('mortars'),0);}
console.log('PASS shared attack budget on the real projectile system, real overseer adapter as boss source, artillery director deferring/holding mortar slots');
