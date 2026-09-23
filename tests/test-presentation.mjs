import assert from 'node:assert/strict';
import {createHUDMotion} from '../src/hud-motion.js';
import {createFieldRecord} from '../src/field-record.js';
const m=createHUDMotion();m.step(.016,0,0);for(let i=1;i<80;i++){const p=m.step(.016,i*.05,i*.02);assert(Math.abs(p.x)<=5&&Math.abs(p.y)<=3);}assert.deepEqual(m.step(.016,4,1,false),{x:0,y:0});assert.deepEqual(m.step(.016,20,0),{x:0,y:0});m.step(.016,20.1,0);let p;for(let i=0;i<90;i++)p=m.step(.016,20.1,0);assert(Math.abs(p.x)<.001);assert.deepEqual(m.step(.016,NaN,0),{x:0,y:0});
const r=createFieldRecord();r.tick(2,0);r.shot();r.hurt(17);r.window();const e={};r.coreHit(e);r.coreHit(e);assert.equal(r.records[0].usedWindows,1);r.die({x:1.1,z:-5.6,y:4.7});assert.equal(r.records[0].death.feet,3);r.begin(0);assert.equal(r.records.length,2);r.tick(1,1);assert.equal(r.records.at(-1).stage,1);const a=r.records;a[0].death.x=999;assert.notEqual(r.records[0].death.x,999);for(let i=0;i<150;i++){r.begin(0);r.tick(.1,0);}assert.equal(r.records.length,100);
console.log('PASS: bounded HUD motion, recenter, pause/reduced-mode input reset, invalid angles; per-attempt/stage damage/ammo/window metrics, immutable death positions and bounded memory');
