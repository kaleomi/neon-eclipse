import {createChapterAttempt} from './chapter-achievements.js';
import {deriveChallengeProgress} from './challenge-progress.js';
import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {ORDNANCE,ORDNANCE_SLOTS,createOrdnanceState,validOrdnance,validOrdnanceEnvelope,cinderDamage,interruptBreakerBoss} from './ordnance-rules.js';
import {launchCinder,advanceCinder} from './cinder-world.js';
import {createLoadoutState,DEFAULT_LOADOUT} from './loadout-rules.js';
import {validCheckpoint} from './campaign.js';
const s=createOrdnanceState(),load=createLoadoutState({canEquipHeavy:s.owns});
for(const i of [9,10]){assert(!load.equip(i));assert(s.claim(i));assert(!s.claim(i));assert(load.equip(i));assert(load.allows(i));assert(!load.allows(0));assert(load.allows(2)&&load.allows(3));assert.equal(load.first(),2);assert(s.fire(i));assert.equal(s.state.rounds[i-9],ORDNANCE[i].cap-1);}
assert(s.claim(11));assert(!load.equip(11));assert(load.equipMelee(11));assert.equal(load.state.primary,10);assert(load.allows(3));assert.equal(load.state.melee,11);const hammerAmmo=s.state;for(let i=0;i<30;i++)assert(s.fire(11));assert.deepEqual(s.state,hammerAmmo);assert.equal(s.reload(11),0);assert(load.equipMelee(3));
let checkpoint=s.checkpoint();s.reset(checkpoint.ordnance);assert.deepEqual(s.checkpoint(),checkpoint);s.state.rounds[0]=999;assert.equal(s.state.rounds[0],0);
for(const i of [9,10]){let n=0;while(s.fire(i)||s.reload(i)>0){assert(n++<40);}assert.equal(s.state.rounds[i-9],0);assert.equal(s.state.reserve[i-9],0);assert(!s.claim(i));}
checkpoint=s.checkpoint();s.reset(checkpoint.ordnance);assert.deepEqual(s.state.rounds,[0,0,0]);assert.deepEqual(s.state.reserve,[0,0,0]);assert(validOrdnance(checkpoint.ordnance));
for(const v of [null,[],{}, {...s.state,owned:[9,9]}, {...s.state,rounds:[2,0,0]}, {...s.state,reserve:[-1,0,0]}, {...s.state,owned:[],rounds:[1,0,0]}])assert(!validOrdnanceEnvelope(v));
const future={version:2,alien:{ammo:[900]}};s.reset(future);future.alien.ammo[0]=0;assert(s.unsupported);assert(!s.claim(9));assert(!s.fire(9));assert.equal(s.reload(9),0);assert.equal(s.checkpoint().ordnance.alien.ammo[0],900);assert(validOrdnanceEnvelope(s.checkpoint().ordnance));
load.reset({...DEFAULT_LOADOUT,primary:9});assert(load.unsupported);assert.equal(load.checkpoint().loadout.primary,9);s.reset();assert.deepEqual(s.state.owned,[]);assert(s.claim(9));load.reset({...DEFAULT_LOADOUT,primary:9});assert(!load.unsupported);
const cp={stageIndex:0,health:73,rounds:[18,4,10],reserves:[97,30,60],selected:2,x:0,z:29,yaw:0,pitch:0,time:20,kills:0,collected:[],...s.checkpoint(),...load.checkpoint()};assert(validCheckpoint(cp));assert(!validCheckpoint({...cp,ordnance:{version:1}}));assert(validCheckpoint({...cp,ordnance:{version:3,future:true}}));
assert.equal(cinderDamage(0),180);assert.equal(cinderDamage(2),90);assert.equal(cinderDamage(4),0);assert.equal(cinderDamage(NaN),0);
const origin=new T.Vector3(0,1.7,0),direction=new T.Vector3(0,0,-1),a=launchCinder(origin,direction),b=launchCinder(origin,direction);advanceCinder(a,0,[]);assert.equal(a.remaining,1.2);advanceCinder(a,1.19,[]);assert(a.remaining>0);advanceCinder(a,.011,[]);assert.equal(a.remaining,0);for(let i=0;i<120;i++)advanceCinder(b,.01,[]);assert(a.position.distanceTo(b.position)<.07);assert(a.bounces>0);assert(a.position.y>=.08);
const wall=new T.Mesh(new T.BoxGeometry(8,6,.03),new T.MeshBasicMaterial());wall.position.set(0,2,-2);wall.updateMatrixWorld(true);const c=launchCinder(origin,direction);advanceCinder(c,.4,[{mesh:wall}]);assert(c.bounces>0);assert(c.position.z> -2);assert(c.velocity.z>0);assert(c.remaining>.79);const c0=c.position.clone();advanceCinder(c,0,[{mesh:wall}]);assert.deepEqual(c.position,c0);
let pending=true,cancelled=0;const boss={boss:true,hp:800,bossState:{phase:0},group:{},attack:0,charge:1},shots={hasPending:()=>pending,cancelOwner:()=>{pending=false;cancelled++;}};assert(interruptBreakerBoss(boss,shots));pending=true;assert(!interruptBreakerBoss(boss,shots));boss.bossState.phase=1;assert(interruptBreakerBoss(boss,shots));assert.equal(cancelled,2);assert(!interruptBreakerBoss({...boss,boss:false},shots));
console.log('PASS ordnance ownership/finite ammo/two-round magazine, carry exclusivity, zero and legacy/future save isolation, 1.2s fuse/substep bounce/thin wall/pause, bounded Boss phase interrupt');

const attempt=createChapterAttempt();attempt.begin({map:'reactor'});attempt.hit(3,1);attempt.nonBlade();assert.equal(attempt.state.shots,0);assert.equal(deriveChallengeProgress(attempt.state,'reactor').find(x=>x.id==='blade').status,'failed');const awards=attempt.finish(true);assert(!awards.includes('blade'));assert(awards.includes('survivor')&&awards.includes('untouched'));

const fresh=createOrdnanceState(),draft=createLoadoutState({canEquipHeavy:fresh.owns});fresh.claim(9);fresh.claim(11);draft.equip(9,{deployment:true});draft.equipMelee(11,{deployment:true});fresh.reset();draft.reset();assert.equal(draft.state.primary,0);assert.equal(draft.state.melee,3);assert(!draft.unsupported);fresh.claim(11);draft.reset({...DEFAULT_LOADOUT,primary:11});assert.equal(draft.state.primary,0);assert.equal(draft.state.melee,11,'old intermediate primary11 migrates into the melee slot');
