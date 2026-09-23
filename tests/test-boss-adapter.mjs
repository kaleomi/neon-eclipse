import assert from 'node:assert/strict';
import {createBossAdapter,BOSS_KINDS} from '../src/boss-adapter.js';
import {createAttackBudget,ATTACK_BUDGET} from '../src/attack-budget.js';
import {createOverseer} from '../src/overseer-rules.js';
import {createTether} from '../src/tether-rules.js';
import {createAbyss} from '../src/abyss-rules.js';
import {createGlacier} from '../src/glacier-rules.js';
import {createSwitchyard} from '../src/switchyard-rules.js';
import {createElevatorBoss} from '../src/elevator-rules.js';
import {createSiegeBoss} from '../src/siege-rules.js';
import {SKYHOOK,LEVIATHAN} from '../src/siege-data.js';
assert.throws(()=>createBossAdapter(null,'overseer'));assert.throws(()=>createBossAdapter(createOverseer(),'nope'));assert.equal(BOSS_KINDS.length,7);
const cases=[[createOverseer(),'overseer',1920],[createTether(),'tether',1600],[createAbyss(),'abyss',1500],[createGlacier(),'glacier',1800],[createSwitchyard(),'blast',null],[createElevatorBoss(),'beam',null],[createSiegeBoss(SKYHOOK),'siege',null],[createSiegeBoss(LEVIATHAN),'siege',null]];
for(const [rules,kind,hp] of cases){
 const b=createBossAdapter(rules,kind,{name:'X',maxHp:hp??undefined});
 assert.equal(b.status,'inactive',kind);assert(!b.alive);assert(!b.threatening);assert.equal(b.telegraph,'rest');assert(!b.interruptCharge(),'inactive boss cannot be interrupted');
 if(rules.activate)rules.activate();else rules.reset(true);
 assert.equal(b.status,'shield',kind);assert(b.alive);assert(b.blocking);const snap=b.snapshot();assert.equal(snap.hp,rules.state.hp);assert(snap.maxHp>0,kind+' maxHp');assert.equal(snap.name,'X');assert.equal(snap.kind,kind);
 const s=rules.state,part=kind==='blast'?rules.blast:kind==='beam'?rules.beam:kind==='siege'?rules.attack:s,mode=kind==='glacier'?'shell':['blast','beam','siege'].includes(kind)?'mode':'attack';
 part[mode]='warning';assert.equal(b.telegraph,'warning');assert(b.threatening,kind+' warning occupies the budget');
 const hpBefore=s.hp,phaseBefore=s.phase;assert(b.interruptCharge(),kind);assert.equal(part[mode],'rest');assert(!b.threatening);assert.equal(s.hp,hpBefore);assert.equal(s.phase,phaseBefore);
 part[mode]='warning';assert(!b.interruptCharge(),'one per structural phase');b.resetInterrupt();assert(b.interruptCharge());
 if(mode==='attack'){part[mode]='live';assert(b.threatening,'live legacy attack still occupies');assert(!b.interruptCharge());part[mode]='rest';}
 // Exposure mapping across the three shapes.
 if(kind==='glacier'){s.phase='sunk';assert.equal(b.status,'exposed');assert(b.exposed);s.phase='climbing';assert.equal(b.status,'exposed');s.phase='armored';assert.equal(b.status,'shield');s.phase='dead';assert.equal(b.status,'defeated');}
 else if(['blast','beam','siege'].includes(kind)){rules.tick?.(0,{});s.phase='exposed';assert.equal(b.status,'exposed');s.phase='defeated';assert.equal(b.status,'defeated');assert(!b.alive||s.hp>0);}
 else{s.phase='exposed';assert.equal(b.status,'exposed');s.phase='dead';assert.equal(b.status,'defeated');}
 assert(Object.isFrozen(BOSS_KINDS));
}
// Attack budget: registration, external counting, allow semantics, boss slot reservation.
assert.throws(()=>createAttackBudget({max:0}));assert.equal(ATTACK_BUDGET.max,3);
const budget=createAttackBudget();let proj=0,mortars=0,boss=0;
budget.register('projectiles',()=>proj);const off=budget.register('mortars',()=>mortars);budget.register('boss',()=>boss);
assert.throws(()=>budget.register('',()=>0));assert.throws(()=>budget.register('x',1));
assert.equal(budget.total(),0);assert(budget.allow('projectiles'));
proj=2;assert(budget.allow('projectiles'),'third projectile attacker allowed');proj=3;assert(!budget.allow('projectiles'));assert(!budget.allow('mortars'),'mortar denied while three projectile attackers are live');
proj=1;boss=1;assert.equal(budget.external('projectiles'),1);assert(budget.allow('projectiles'));proj=2;assert(!budget.allow('projectiles'),'boss warning takes one of the three slots');assert(!budget.allow('mortars'));
boss=0;mortars=1;assert(!budget.allow('projectiles'),'two attackers + one mortar fill the budget');proj=1;assert(budget.allow('projectiles'));assert.equal(budget.external('mortars'),1);assert(budget.allow('mortars'));proj=2;assert(!budget.allow('mortars'),'artillery cannot double up beyond the budget');
off();assert.equal(budget.total(),2);assert.deepEqual(budget.sources,['projectiles','boss']);
mortars=NaN;budget.register('mortars',()=>mortars);assert.equal(budget.count('mortars'),0,'non-finite counters read as zero');
console.log('PASS boss adapter over eight arena Bosses (status/telegraph/exposure/interrupt quota, no hp or phase mutation) and shared attack budget semantics with Boss slot reservation');
