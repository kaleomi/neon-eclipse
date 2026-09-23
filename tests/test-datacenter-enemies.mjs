// Chapter 08 enemies: stalker (stealth rusher) and shield (frontal-immune bruiser) profiles + damage rules.
import assert from 'node:assert/strict';
import {ENEMY_TYPES,resolveEnemyDamage,enemyBehavior,movementIntent} from '../src/enemy-rules.js';
import {DATACENTER_STAGES} from '../src/datacenter-data.js';
const stalker=ENEMY_TYPES.stalker,shield=ENEMY_TYPES.shield;assert(stalker&&shield);
assert.equal(stalker.hp,46);assert(stalker.attack.charge>=.45,'attack warning >= 0.45 s');assert.equal(stalker.attack.damage,6);assert(stalker.stealth&&stalker.stealth.far>stalker.stealth.near);
assert.equal(shield.hp,120);assert(shield.attack.charge>=.45);assert.equal(shield.attack.damage,8);assert.equal(shield.frontShield,true);
// Shield: frontal hits do nothing (armored feedback), flank/rear hits land, core hits double. Enemy faces +z (rotation 0).
const mk=type=>({type,hp:ENEMY_TYPES[type].hp,maxHp:ENEMY_TYPES[type].hp,group:{position:{x:0,z:0},rotation:{y:0}}});
const front=resolveEnemyDamage(mk('shield'),30,'body',{x:0,z:5});assert.equal(front.damage,0);assert(front.armored,'frontal hit reported as armored');
const side=resolveEnemyDamage(mk('shield'),30,'body',{x:5,z:1});assert.equal(side.damage,30,'flank lands');
const rear=resolveEnemyDamage(mk('shield'),30,'body',{x:0,z:-5});assert.equal(rear.damage,30);
const core=resolveEnemyDamage(mk('shield'),30,'core',{x:0,z:5});assert.equal(core.damage,60);assert(core.weak);
// Stalker takes full damage from any side; profile marks stealth + movement.
assert.equal(resolveEnemyDamage(mk('stalker'),30,'body',{x:0,z:5}).damage,30);
assert.equal(enemyBehavior('stalker'),'assault');assert.equal(enemyBehavior('shield'),'assault');assert.equal(movementIntent('stalker',12,true),'approach');
// Chapter role sets resolve and use both silhouettes.
const roles=new Set(DATACENTER_STAGES.flatMap(s=>[...s.roles,...(s.defenseWaves||[]).flatMap(w=>w.roles||[])]));for(const r of roles)assert(ENEMY_TYPES[r],'unknown role '+r);assert(roles.has('stalker')&&roles.has('shield'));
console.log('PASS: stalker/shield profiles, warning >= 0.45 s, shield frontal immunity + core x2, stalker full damage, datacenter roles resolve');
