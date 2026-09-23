import assert from 'node:assert/strict';
import {switchyardCue,switchyardHoldCue,wardenCue,interactionKey} from '../src/combat-cue-model.js';
const rules={state:{phase:'shield',active:true,timer:6,hp:1200,maxHp:1200,tier:1},rail:{lane:0,mode:'warning',armed:false,timer:4,hold:.3}},before=JSON.stringify(rules);
assert.equal(switchyardCue(rules).kind,'shield');assert.match(switchyardCue(rules,{},0,'','J').detail,/按住 J 0.6s/);
assert.match(switchyardCue(rules,{near:true,id:1}).detail,/这不是当前编号/);
assert.match(switchyardCue(rules,{near:true,id:0,allowed:true}).detail,/50%/);
assert.match(switchyardCue(rules,{near:true,id:0,allowed:false}).detail,/停止射击/);
assert.match(switchyardCue(rules,{},1).detail,/护盾抵挡/);
assert.match(switchyardCue({...rules,rail:{...rules.rail,armed:true}}).detail,/侧面接近/);
assert.equal(switchyardCue({...rules,rail:{...rules.rail,mode:'moving',armed:true}}).kind,'warning');
assert.equal(switchyardCue({...rules,state:{...rules.state,phase:'exposed'}},{},0,'标记').kind,'exposed');
assert.match(switchyardCue({...rules,state:{...rules.state,phase:'exposed'}},{},0,'标记').detail,/标记/);
assert.equal(switchyardCue({...rules,state:{...rules.state,phase:'defeated'}}).kind,'complete');
assert.equal(wardenCue({openRemaining:1}).kind,'exposed');assert.equal(wardenCue({transitionRemaining:1}).kind,'warning');assert.equal(wardenCue({openRemaining:0,transitionRemaining:0}).kind,'shield');
assert.equal(interactionKey({codesFor:()=>['KeyJ']}),'J');assert.equal(JSON.stringify(rules),before);
console.log('PASS 16 cue assertions: shield/moving/exposed/defeated, wrong/busy/held controls, actual binding, mark and immutable rules');

const near={near:true,id:0,allowed:true};
assert.equal(switchyardHoldCue(rules,near).percent,50);assert.equal(switchyardHoldCue(rules,near).kind,'holding');
assert.match(switchyardHoldCue(rules,near,'J').description,/按住 J 0.6s/);
assert.equal(switchyardHoldCue({...rules,rail:{...rules.rail,hold:0}},near).kind,'ready');
assert.equal(switchyardHoldCue({...rules,rail:{...rules.rail,hold:99}},near).percent,99,'100% is reserved for an actually armed switch');
assert.equal(switchyardHoldCue({...rules,rail:{...rules.rail,armed:true,hold:0}},{}).percent,100);
assert.equal(switchyardHoldCue({...rules,rail:{...rules.rail,mode:'moving',armed:true}},{}).kind,'armed');
assert.equal(switchyardHoldCue({...rules,rail:{...rules.rail,mode:'moving'}},near).percent,0);
assert.equal(switchyardHoldCue(rules,{near:true,id:1,allowed:true}).kind,'wrong');
assert.equal(switchyardHoldCue(rules,{}).visible,false);
for(const phase of ['inactive','exposed','defeated'])assert.equal(switchyardHoldCue({...rules,state:{...rules.state,phase}},near).visible,false);
for(const [reason,phrase]of [['facing','准星'],['occluded','遮挡'],['airborne','落地'],['floor','地面'],['busy','停止射击']]){
 const interaction={...near,allowed:false,reason},cue=switchyardHoldCue(rules,interaction);assert.equal(cue.percent,0);assert.equal(cue.kind,'blocked');assert(cue.description.includes(phrase));assert(switchyardCue(rules,interaction).detail.includes(phrase));
}
assert.equal(JSON.stringify(rules),before);console.log('PASS hold-bar projection: ready/50%/armed 100%, release, wrong control, blockers, moving/exposed/hidden, actual binding, read-only rules');
