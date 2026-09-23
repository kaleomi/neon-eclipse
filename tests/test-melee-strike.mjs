import assert from 'node:assert/strict';
import {createMeleeStrike,overlapsMeleeStrike,MELEE_STRIKE} from '../src/melee-strike.js';
const strike=createMeleeStrike(),object={parent:{}},hit={object,distance:2};
let calls=0;const probe=()=>{calls++;return hit;};
assert.deepEqual(MELEE_STRIKE,{duration:.42,start:.28,end:.58,maxTargets:1});
assert.equal(strike.step(.42,.30,probe),null,'idle');strike.begin();
assert.equal(strike.step(.42,.32,probe),null,'windup');assert.equal(calls,0);
assert.equal(strike.step(.32,.30,probe).impact,hit,'window begins at 28%');
assert.equal(strike.step(.30,.20,probe),null);assert.equal(calls,1,'same and other body parts cannot damage again');
strike.begin();assert.equal(strike.step(.42,.30,()=>null),null,'an early miss does not consume the swing');
assert.equal(strike.step(.30,.18,probe).impact,hit,'late target entering within window is hittable');
strike.begin();assert.equal(strike.step(.42,.30,()=>null),null);
assert.equal(strike.step(.30,.175,()=>null).miss,true);assert.equal(strike.step(.175,0,probe),null,'recovery never hits');
strike.begin();const count=calls;assert.equal(strike.step(.42,0,probe,{playing:false}),null);assert.equal(calls,count);assert(strike.active,'pause retains action');
assert.equal(strike.step(.42,.30,probe).impact,hit,'resume');
strike.begin();strike.cancel();assert.equal(strike.step(.42,0,probe),null,'switch/reset cancellation');
strike.begin();assert.equal(strike.step(.42,.30,probe).impact,hit);strike.begin();assert.equal(strike.step(.42,.30,probe).impact,hit,'new swing clears identity set');
for(const sequence of [[.12,.12,.12,.12],[.016,.016,.016,.016,.016,.016,.016,.016,.12,.12],[.8,.2],[.1176,.126,.2]]) {
 strike.begin();let remaining=.42,contacts=0;
 for(const dt of sequence){const before=remaining;remaining=Math.max(0,remaining-dt);if(strike.step(before,remaining,probe)?.impact)contacts++;}
 assert.equal(contacts,1,`exactly once with frame sequence ${sequence}`);
}
for(const [before,after] of [[NaN,0],[.42,NaN],[Infinity,0],[.42,-1],[.3,.31],[.2,.2]])assert.equal(overlapsMeleeStrike(before,after),false);
assert.equal(overlapsMeleeStrike(.42,.31),false);assert.equal(overlapsMeleeStrike(.17,0),false);
console.log('PASS: 28–58% strike window, late entry, one contact per swing, new swing, 120ms/oversized frames, windup/recovery/pause/switch/reset and invalid times');
