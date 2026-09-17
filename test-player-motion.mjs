import assert from 'node:assert/strict';
import {createPlayerMotion,PLAYER} from './player-motion.js';
const p={x:0,y:1.7,z:0},m=createPlayerMotion([]);m.reset(p);assert(m.step(.01,p,0,0,true).jumped);let apex=0;for(let i=0;i<100;i++){m.step(.01,p,0,0,i===5);apex=Math.max(apex,m.state.y);}assert(apex>1.35&&apex<1.46);assert(m.state.grounded&&m.state.y===0);assert.equal(p.y,PLAYER.eye);
m.step(.1,p,0,0,true);const before={...m.state};m.step(0,p,0,0,true);assert.deepEqual(m.state,before,'pause freezes vertical motion');
const ceiling=createPlayerMotion([],[{x:0,z:0,w:4,d:4,bottom:2.2,top:2.4}]);ceiling.reset(p);let head=0;for(let i=0;i<100;i++){ceiling.step(.01,p,0,0,i===0);head=Math.max(head,ceiling.state.y+PLAYER.height);}assert(head<=2.20001);assert(ceiling.state.grounded);
const box={x:1.4,z:0,w:1,d:2,h:1};const v=createPlayerMotion([box]);p.x=0;v.reset(p);for(let i=0;i<8;i++)v.step(.05,p,.2,0,i===0);for(let i=0;i<30;i++)v.step(.02,p,0,0);assert(Math.abs(v.state.y-1)<1e-5,'lands on low cover');assert(v.state.grounded);v.step(1,p,3,0);assert.equal(v.state.y,0,'falls after leaving cover');
const gate=createPlayerMotion([{x:2,z:0,w:1,d:8,h:3.3}]);p.x=0;gate.reset(p);for(let i=0;i<30;i++)gate.step(.03,p,.2,0,i===0);assert(p.x<=1.10001,'cannot bypass closed gate');
const bounds=createPlayerMotion([],[],{x:3,z:3});p.x=0;bounds.reset(p,3);bounds.step(.3,p,10,10);assert(p.x<=3&&p.z<=3,'roof edge remains protected while airborne');
console.log('PASS: jump/gravity/apex/landing, no air jump, pause, low-cover support, ceiling collision, gate blocking and roof bounds');

const {createArcHazards}=await import('./roof-rules.js');const hz=createArcHazards([{x:0,z:0,w:4,d:4}]);assert.equal(hz.tick(4.51,{x:0,z:0,feetY:1},true),null);assert.equal(hz.phase,'live');assert.equal(hz.tick(.01,{x:0,z:0,feetY:0},true).damage,8);
