import assert from 'node:assert/strict';
import {createBossChargeInterrupt} from '../src/boss-charge-interrupt.js';
import {createOverseer} from '../src/overseer-rules.js';
import {createTether} from '../src/tether-rules.js';
import {createAbyss} from '../src/abyss-rules.js';
import {createGlacier} from '../src/glacier-rules.js';
import {createSwitchyard} from '../src/switchyard-rules.js';
import {createElevatorBoss} from '../src/elevator-rules.js';
import {createSiegeBoss} from '../src/siege-rules.js';
import {SKYHOOK,LEVIATHAN} from '../src/siege-data.js';
const cases=[[createOverseer(),'overseer'],[createTether(),'tether'],[createAbyss(),'abyss'],[createGlacier(),'glacier'],[createSwitchyard(),'blast'],[createElevatorBoss(),'beam'],[createSiegeBoss(SKYHOOK),'siege'],[createSiegeBoss(LEVIATHAN),'siege']];
for(const [rules,kind] of cases){
 const gate=createBossChargeInterrupt(rules,kind);assert(!gate.interrupt());if(rules.activate)rules.activate();else rules.reset(true);
 const s=rules.state,part=kind==='blast'?rules.blast:kind==='beam'?rules.beam:kind==='siege'?rules.attack:s,mode=kind==='glacier'?'shell':['blast','beam','siege'].includes(kind)?'mode':'attack';
 part[mode]='rest';assert(!gate.interrupt());part[mode]='live';assert(!gate.interrupt(),'already released damage is never erased');part[mode]='warning';const hp=s.hp,phase=s.phase,mechanic=rules.arena?{...rules.arena}:null,rail=rules.rail?{...rules.rail}:null;
 assert(gate.interrupt(),kind);assert.equal(part[mode],'rest');assert.equal(s.hp,hp);assert.equal(s.phase,phase);if(mechanic)assert.deepEqual(rules.arena,mechanic);if(rail)assert.deepEqual(rules.rail,rail);
 part[mode]='warning';assert(!gate.interrupt(),'one budget per phase, not per repeated shield window');if(rules.arena)rules.arena.index++;else s.tier++;assert(gate.interrupt());part[mode]='warning';assert(!gate.interrupt());gate.reset();assert(gate.interrupt(),'new encounter resets only temporary budget');s.active=false;part[mode]='warning';gate.reset();assert(!gate.interrupt());
}
console.log('PASS eight arena Boss interrupt adapters: warning-only, per-tier/unit quota, live attack preserved, health/windows/objective trains/lifts preserved, inactive and new encounter reset');
