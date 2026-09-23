import assert from 'node:assert/strict';
import {createPlayerMotion} from '../src/player-motion.js';
import {PARKOUR_START,PARKOUR_PLATFORMS,SECRET_ROOM,SECRET_ROUTE,TOWER_MAZE,HIDDEN_STARS} from '../src/hidden-data.js';
import {TOWER_FLOORS,towerObstacles} from '../src/tower-data.js';
import {stationObstacles} from '../src/station-data.js';
import {STAR_SITES,nearStar} from '../src/collectibles.js';
function walk(m,p,target,max=3000){for(let i=0;i<max;i++){const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);if(d<.025)return;m.step(.01,p,dx/d*Math.min(.05,d),dz/d*Math.min(.05,d));}assert.fail('route blocked at '+JSON.stringify(p)+' target '+JSON.stringify(target));}
const p={...PARKOUR_START,y:1.7},m=createPlayerMotion(PARKOUR_PLATFORMS);m.reset(p);
for(const [i,plat] of PARKOUR_PLATFORMS.entries()){
 for(let t=0;t<100;t++){const dx=plat.x-p.x,dz=plat.z-p.z,d=Math.hypot(dx,dz);m.step(.01,p,d>.01?dx/d*Math.min(.05,d):0,d>.01?dz/d*Math.min(.05,d):0,t===0);}
 assert(Math.abs(m.state.y-plat.top)<.001,'jump '+(i+1)+' lands: '+m.state.y);assert(m.state.grounded);
}
assert(nearStar('reactor',p));walk(m,p,{x:-33,z:p.z});for(let i=0;i<120;i++)m.step(.01,p,0,0);assert.equal(m.state.y,0,'fall returns to floor without trap');
const station=stationObstacles(4).concat(SECRET_ROOM),q={x:30,z:-4,y:1.7},sm=createPlayerMotion(station);sm.reset(q);for(const target of SECRET_ROUTE)walk(sm,q,target);assert(nearStar('station',q));for(const target of SECRET_ROUTE.slice().reverse())walk(sm,q,target);
assert(!nearStar('station',{x:23.39,z:.5,y:1.7}),'not collected through false wall');
const maze=TOWER_MAZE,obs=towerObstacles(4).concat(maze.walls),r={x:-11,z:7.2,y:1.7},tm=createPlayerMotion(obs);tm.reset(r);
assert.equal(new Set(maze.links.flat()).size,25);assert(maze.links.filter(a=>a.length===1).length>=4);assert(maze.path.length>=15,'long hidden route');
for(const target of maze.route)walk(tm,r,target);assert(nearStar('tower',r));for(const target of maze.route.slice().reverse())walk(tm,r,target);
// Maze ceilings and walls prevent jumping over partitions; the upper floors remain usable.
const cell=maze.center(maze.entry);r.x=cell.x;r.z=cell.z;tm.reset(r);let peak=0;for(let i=0;i<100;i++){tm.step(.01,r,0,0,i===0);peak=Math.max(peak,tm.state.y);}assert(peak<1.0);assert(!nearStar('tower',{...STAR_SITES.tower,y:4.7}));
assert.equal(STAR_SITES.roof.x,32);assert.equal(STAR_SITES.roof.feetY,7.25);
console.log('PASS: nine physical precision jumps and safe fall, concealed wall corridor roundtrip, '+maze.path.length+'-cell tower maze route and return, '+maze.links.filter(a=>a.length===1).length+' dead ends, ceiling anti-shortcut, floor-aware stars and revised optional roof star');
