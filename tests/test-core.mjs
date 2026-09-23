import assert from 'node:assert/strict';
import {segmentBox,segmentSphere} from '../src/collision.js';
import {ARENA,createNavigator} from '../src/arena.js';
const a={x:0,y:1,z:0},b={x:0,y:1,z:10};
assert.equal(segmentBox(a,b,{x:-1,y:0,z:4},{x:1,y:2,z:5}),.4);
assert.equal(segmentBox(a,b,{x:1,y:0,z:4},{x:2,y:2,z:5}),null);
assert.equal(segmentBox(a,b,{x:-1,y:0,z:-1},{x:1,y:2,z:1}),0);
assert.equal(segmentSphere(a,b,{x:0,y:1,z:5},.5),.45);
assert.equal(segmentSphere(a,b,{x:2,y:1,z:5},.5),null);
assert.equal(segmentSphere(a,a,a,.5),0);
const obstacles=[{x:-40,z:0,w:1,d:81,h:10},{x:40,z:0,w:1,d:81,h:10},{x:0,z:-40,w:80,d:1,h:10},{x:0,z:40,w:80,d:1,h:10},...ARENA.covers.map(([x,z])=>({x,z,w:3,d:3,h:2.5})),{x:0,z:-16,w:5,d:5,h:3}];
const blocked=(x,z,r)=>obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);
assert.equal(ARENA.size,80);assert.equal(blocked(30,0,.4),false);assert.equal(blocked(40,0,.4),true);
const nav=createNavigator(obstacles);let routes=0;
for(const target of [ARENA.start,{x:-34,z:0},{x:34,z:0},{x:0,z:-33}]){
 nav.rebuild(target.x,target.z);
 for(const [x,z] of ARENA.spawns){
  assert(!blocked(x,z,1.25),'spawn is blocked');assert(nav.isReachable(x,z),'unreachable spawn');
  const pos={x,z};
  for(let i=0;i<5000&&Math.hypot(pos.x-target.x,pos.z-target.z)>2.2;i++){
   const dir=nav.direction(pos,target),len=Math.hypot(dir.x,dir.z)||1,dx=dir.x/len*.1,dz=dir.z/len*.1;
   if(!blocked(pos.x+dx,pos.z,1.25))pos.x+=dx;
   if(!blocked(pos.x,pos.z+dz,1.25))pos.z+=dz;
  }
  assert(Math.hypot(pos.x-target.x,pos.z-target.z)<=2.2,`route stuck ${x},${z} to ${target.x},${target.z}: ${pos.x},${pos.z}`);routes++;
 }
}
console.log(`PASS: segment collision, 80x80 bounds, ${routes} large-enemy navigation routes`);
