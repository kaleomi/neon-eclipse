import assert from 'node:assert/strict';
import {BARREL,blastDamage,blastVisible} from './barrel-rules.js';
import {createChapterAttempt} from './chapter-achievements.js';
import {deriveChallengeProgress} from './challenge-progress.js';
const a={x:0,y:1,z:0};assert.equal(blastDamage(a,a),90);assert.equal(blastDamage(a,{x:2.5,y:1,z:0}),45);assert.equal(blastDamage(a,{x:5,y:1,z:0}),0);assert.equal(blastDamage(a,{x:0,y:6,z:0}),0);assert.equal(blastDamage(a,{x:NaN,y:1,z:0}),0);
const wall={mesh:{},x:1,z:0,w:.1,d:3,h:3};assert(!blastVisible(a,{x:2,y:1,z:0},[wall]));assert(blastVisible(a,{x:2,y:1,z:0},[wall],wall.mesh));
const attempt=createChapterAttempt();attempt.begin({map:'reactor'});attempt.hit(3,1);attempt.environmentHit(20);assert.equal(attempt.state.shots,0);assert.equal(attempt.state.kills[3],1);assert.equal(deriveChallengeProgress(attempt.state,'reactor').find(s=>s.id==='blade').status,'failed');assert(!attempt.finish(true).includes('blade'));assert(attempt.state.eligible);
attempt.begin({map:'reactor'});attempt.hit(3,1);attempt.environmentHit(0);assert(attempt.finish(true).includes('blade'));assert.equal(BARREL.playerDamage,70);
console.log('PASS blast 3D falloff/boundary/cover, separate environment attribution, strict blade eligibility without fake gunfire');
