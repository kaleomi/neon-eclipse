import assert from 'node:assert/strict';
import {WEAPONS,createHandling,shotSpread,damageAtDistance} from './combat.js';
assert.equal(WEAPONS.length,4);assert.equal(WEAPONS.filter(w=>w.automatic).length,2);
for(const w of WEAPONS){
 assert.equal(damageAtDistance(w,0),w.damage);
 assert.equal(damageAtDistance(w,0,true),w.damage*w.headMultiplier);
 assert.equal(damageAtDistance(w,w.range+1),0);
 assert(damageAtDistance(w,w.range)<=w.damage);
 assert(shotSpread(w,1,0,false)<=shotSpread(w,0,0,false));
 assert(shotSpread(w,0,1,true)>=shotSpread(w,0,0,false));
}
const h=createHandling();h.shot(WEAPONS[0],.7);assert(h.state.pitch>0);assert(h.state.heat>0);
for(let i=0;i<120;i++)h.update(1/60,false);assert(h.state.pitch<1e-6);assert.equal(h.state.heat,0);
for(let i=0;i<60;i++)h.update(1/60,true);assert(h.state.ads>.99);
for(let i=0;i<100;i++)h.shot(WEAPONS[1],1);assert(h.state.pitch<=.12);assert(h.state.yaw<=.035);assert(h.state.heat<=1.5);
h.switchWeapon();assert.equal(h.state.switchRemaining,.22);h.update(.23,false);assert.equal(h.state.switchRemaining,0);
h.reset();assert.deepEqual(h.state,{ads:0,heat:0,pitch:0,yaw:0,switchRemaining:0});
const a=createHandling(),b=createHandling();a.shot(WEAPONS[0]);b.shot(WEAPONS[0]);for(let i=0;i<30;i++)a.update(1/30,true);for(let i=0;i<120;i++)b.update(1/120,true);assert(Math.abs(a.state.pitch-b.state.pitch)<1e-8);assert(Math.abs(a.state.ads-b.state.ads)<1e-8);
console.log('PASS: damage falloff, headshots, ADS spread, heat, recoil bounds/recovery, equip lock and frame-rate-independent damping');
