import assert from 'node:assert/strict';
import {roofObstacles,ROOF_STAGES} from '../src/roof-data.js';
import {ROOF_STAR_PLATFORMS} from '../src/hidden-data.js';
import {SERVICE_STAIRS,SERVICE_DECKS} from '../src/transport-rules.js';
import {createPlayerMotion} from '../src/player-motion.js';
const terminals=ROOF_STAGES.filter(s=>s.id!=='extract').flatMap(s=>(s.points||[s]).map(p=>({x:p.x,z:p.z,w:1.8,d:1,h:1.4})));
function create(stage){const obs=roofObstacles(stage).concat(ROOF_STAR_PLATFORMS,SERVICE_STAIRS,SERVICE_DECKS,terminals);return createPlayerMotion(obs,[],{x:37.1,z:37.1});}
function walk(m,p,x,z){for(let i=0;i<5000;i++){const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.02)return;m.step(.01,p,dx/d*Math.min(.05,d),dz/d*Math.min(.05,d));}assert.fail('blocked '+JSON.stringify(p)+' -> '+x+','+z);}
const motion=create(2),p={x:32,z:29.6,y:8.95};motion.reset(p,7.25);for(let i=0;i<70;i++)motion.step(.01,p,-.05,0);for(let i=0;i<150;i++)motion.step(.01,p,0,0);assert.equal(motion.state.y,0);walk(motion,p,p.x,32);walk(motion,p,0,32);walk(motion,p,3,32);walk(motion,p,3,20);walk(motion,p,0,20);assert.equal(motion.state.y,0,'ordinary walking reaches main arena');
// Additional landing pockets: deep corner, north side and beside the new wall opening.
for(const start of [{x:36,z:36},{x:12,z:24},{x:10,z:36}]){const m=create(2),q={...start,y:1.7};m.reset(q);walk(m,q,18,q.z);walk(m,q,18,32);walk(m,q,0,32);assert.equal(m.state.y,0);}
// The new exit connects two southern pockets, not the locked northern play area.
const locked=create(0),q={x:18,z:32,y:1.7};locked.reset(q);walk(locked,q,3,32);for(let i=0;i<300;i++)locked.step(.01,q,0,-.05);assert(q.z>22,'stage 0 gate still blocks');
assert.equal(ROOF_STAR_PLATFORMS.at(-1).top,7.25);
console.log('PASS: real 7.25m star fall -> ground exit -> southern extraction -> main arena; three landing pockets escape; stage-zero gate and star difficulty unchanged');
