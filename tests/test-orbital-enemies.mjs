import assert from 'node:assert/strict';
import {ENEMY_TYPES,movementIntent,enemyBehavior,roleForStage} from '../src/enemy-rules.js';
import {ORBITAL_STAGES} from '../src/orbital-data.js';
for(const type of ['drone','sniper']){const p=ENEMY_TYPES[type];assert.ok(p,type);for(const f of ['hp','speed','turn','radius','near','far','range','cooldown'])assert.ok(Number.isFinite(p[f])&&p[f]>0,type+'.'+f);assert.ok(p.attack&&p.attack.damage>0&&Array.isArray(p.attack.angles)&&p.hint,type+' attack');}
assert.equal(enemyBehavior('drone'),'assault');assert.equal(enemyBehavior('sniper'),'ranged');assert.equal(enemyBehavior('assault'),'assault');assert.equal(enemyBehavior('heavy'),'heavy');assert.equal(enemyBehavior('warden'),'warden');
// Existing roles keep their exact movement decisions.
assert.equal(movementIntent('assault',20,false),'approach');assert.equal(movementIntent('assault',7,true),'approach');assert.equal(movementIntent('assault',3,true),'hold');
assert.equal(movementIntent('ranged',10,true),'retreat');assert.equal(movementIntent('ranged',20,true),'strafe');assert.equal(movementIntent('ranged',30,true),'approach');assert.equal(movementIntent('heavy',12,true),'hold');
// Drone behaves like assault (closes in until near), sniper like ranged (holds 22-34 m, retreats inside 22 m).
assert.equal(movementIntent('drone',6,true),'approach');assert.equal(movementIntent('drone',3,true),'hold');assert.equal(movementIntent('drone',12,true),'approach');
assert.equal(movementIntent('sniper',15,true),'retreat');assert.equal(movementIntent('sniper',28,true),'strafe');assert.equal(movementIntent('sniper',40,true),'approach');assert.equal(movementIntent('sniper',28,false),'approach');
// Tuning intent: drones are fast, fragile, low damage; snipers slow, long telegraph, long range.
const d=ENEMY_TYPES.drone,s=ENEMY_TYPES.sniper,a=ENEMY_TYPES.assault,r=ENEMY_TYPES.ranged;
assert(d.hp<a.hp&&d.speed>a.speed&&d.attack.damage<a.attack.damage&&d.radius<a.radius);
assert(s.range>r.range&&s.attack.charge>r.attack.charge&&s.attack.damage>r.attack.damage&&s.speed<r.speed&&s.attack.showAim===true);
assert.equal(s.attack.color,'purple');assert.equal(d.attack.color,'orange');
// Every orbital role resolves to a known type, and the chapter uses both new silhouettes.
const roles=new Set();for(const stage of ORBITAL_STAGES){for(let i=0;i<stage.count;i++){const t=roleForStage(stage,i);assert.ok(ENEMY_TYPES[t],stage.id+' '+t);roles.add(t);}for(const t of [...(stage.defenseRoles||[]),...(stage.defenseWaves||[]).flatMap(w=>w.roles)])assert.ok(ENEMY_TYPES[t]);}
assert(roles.has('drone')&&roles.has('sniper'));
console.log('PASS: drone/sniper profiles, behavior aliasing keeps legacy intents, new movement intents, tuning invariants, orbital role sets resolve');
