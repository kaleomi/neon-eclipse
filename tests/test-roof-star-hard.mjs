import assert from 'node:assert/strict';
import {createPlayerMotion} from '../src/player-motion.js';
import {ROOF_STAR_PLATFORMS,ROOF_STAR_START} from '../src/hidden-data.js';
import {SERVICE_STAIRS,SERVICE_DECKS} from '../src/transport-rules.js';
import {roofObstacles} from '../src/roof-data.js';
import {nearStar,STAR_SITES} from '../src/collectibles.js';
const obs=[...roofObstacles(2),...SERVICE_STAIRS,...SERVICE_DECKS,...ROOF_STAR_PLATFORMS];
const p={x:ROOF_STAR_START.x,z:ROOF_STAR_START.z,y:4.7},motion=createPlayerMotion(obs,[],{x:37.1,z:37.1});motion.reset(p,3);
assert(!nearStar('roof',p),'old dock no longer grants star');
for(const [i,plat] of ROOF_STAR_PLATFORMS.entries()){
 for(let t=0;t<100;t++){const dx=plat.x-p.x,dz=plat.z-p.z,d=Math.hypot(dx,dz);motion.step(.01,p,d>.01?dx/d*Math.min(.05,d):0,d>.01?dz/d*Math.min(.05,d):0,t===0);}
 assert(Math.abs(motion.state.y-plat.top)<.001,'roof jump '+(i+1)+' got '+motion.state.y);assert(motion.state.grounded);
}
assert(nearStar('roof',p));assert(!nearStar('roof',{x:32,z:29.6,y:1.7}));
for(let i=0;i<70;i++)motion.step(.01,p,-.05,0);for(let i=0;i<150;i++)motion.step(.01,p,0,0);assert.equal(motion.state.y,0,'safe fall to ordinary floor');
// Second platform is higher than the 3m divider plus the jump apex; the divider is not a bypass.
assert(ROOF_STAR_PLATFORMS[1].top-3>7.6**2/40);
console.log('PASS: roof dock no pickup, five alternating narrow-platform jumps to 7.25m, floor rejection, safe fall, divider cannot bypass first jump');
