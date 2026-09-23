// Optional discovery spaces. All dimensions are shared by rendering and physics.
const volume=(x,z,w,d,top,bottom=0,kind='wall')=>({x,z,w,d,top,bottom,h:top,kind,hiddenArea:true});
export const PARKOUR_PLATFORMS=Array.from({length:9},(_,i)=>volume(i===0?-36.8:i%2?-36.3:-37.3,10-i*3.3,1.25,1.25,.8+i*.7,0,'platform'));
export const PARKOUR_START={x:-36.8,z:13,feetY:0};
export const SECRET_ROOM=[volume(24,5,.4,14,5.9),volume(28,12,8,.4,5.9),volume(26.65,-2,5.3,.4,5.9),volume(31.35,-2,1.3,.4,5.9),volume(27,3,.4,10,5.9)];
export const SECRET_ROUTE=[{x:30,z:-4},{x:30,z:0},{x:30,z:10},{x:25.5,z:10},{x:25.5,z:.5}];
// Fixed seeded perfect maze: every cell connected, multiple dead ends, one external entrance.
export function buildTowerMaze(){
 const n=5,cell=3.6,min=-9,entry=20;let seed=1;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const links=Array.from({length:n*n},()=>[]),seen=new Set([entry]),stack=[entry];
 while(stack.length){const a=stack.at(-1),x=a%n,z=Math.floor(a/n),choices=[[x-1,z],[x+1,z],[x,z-1],[x,z+1]].filter(([u,v])=>u>=0&&u<n&&v>=0&&v<n&&!seen.has(v*n+u));if(!choices.length){stack.pop();continue;}const [u,v]=choices[Math.floor(rand()*choices.length)],b=v*n+u;links[a].push(b);links[b].push(a);seen.add(b);stack.push(b);}
 const parent=Array(n*n).fill(-1),dist=Array(n*n).fill(-1),queue=[entry];dist[entry]=0;for(const a of queue)for(const b of links[a])if(dist[b]<0){parent[b]=a;dist[b]=dist[a]+1;queue.push(b);}
 const goal=dist.indexOf(Math.max(...dist)),path=[];for(let a=goal;a>=0;a=parent[a])path.unshift(a);
 const center=a=>({x:min+(a%n+.5)*cell,z:min+(Math.floor(a/n)+.5)*cell});
 const walls=[],add=(x,z,w,d)=>walls.push(volume(x,z,w,d,2.75));
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*n+x,p=center(a);if(x<n-1&&!links[a].includes(a+1))add(p.x+cell/2,p.z,.24,cell+.24);if(z<n-1&&!links[a].includes(a+n))add(p.x,p.z+cell/2,cell+.24,.24);}
 add(0,-9,18.24,.24);add(0,9,18.24,.24);add(9,0,.24,18.24);
 // West service slit at z=7.2 is only 1.3m wide, not a main corridor.
 add(-9,-1.225,.24,15.55);add(-9,8.425,.24,1.15);
 return {walls,links,path,goal,entry,center,route:[{x:-11,z:7.2},...path.map(center)],star:{...center(goal),feetY:0}};
}
export const TOWER_MAZE=buildTowerMaze();
export const ROOF_STAR_START={x:32.5,z:17.2,feetY:3};
export const ROOF_STAR_PLATFORMS=[[32,20.6,3.85,1.2],[35.3,22.2,4.7,1.05],[32.2,24.4,5.55,1],[35.2,27.2,6.4,1],[32,29.6,7.25,1]].map(([x,z,y,size])=>volume(x,z,size,size,y,0,'platform'));
export const HIDDEN_VOLUMES={reactor:PARKOUR_PLATFORMS,station:SECRET_ROOM,tower:TOWER_MAZE.walls,roof:ROOF_STAR_PLATFORMS};
const last=PARKOUR_PLATFORMS.at(-1);
export const HIDDEN_STARS={reactor:{x:last.x,z:last.z,feetY:last.top},station:{x:25.5,z:.5,feetY:0},tower:TOWER_MAZE.star,roof:{x:32,z:29.6,feetY:7.25}};
