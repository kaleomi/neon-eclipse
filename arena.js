import {HARBOR_ARENA} from './harbor-data.js';
import {TRAIN_ARENA} from './train-data.js';
import {TOWER_ARENA} from './tower-data.js';
import {ROOF_ARENA} from './roof-data.js';
import {IS_STATION,IS_ROOF,IS_TOWER,IS_TRAIN,IS_HARBOR} from './level.js';
import {STATION_ARENA} from './station-data.js';
// Shared dimensions keep gameplay bounds, visuals, spawns and navigation in sync.
export const ARENA = IS_HARBOR?HARBOR_ARENA:IS_TRAIN?TRAIN_ARENA:IS_TOWER?TOWER_ARENA:IS_ROOF?ROOF_ARENA:IS_STATION?STATION_ARENA:{
 size:80, half:40, start:{x:0,z:29}, reactor:{x:0,z:-16},
 covers:[[-9,-7],[9,-7],[-9,7],[9,7],[-16,0],[16,0],
  [-28,-24],[28,-24],[-28,-8],[28,-8],[-28,12],[28,12],
  [-13,25],[13,25],[-13,-30],[13,-30],[-28,28],[28,28]],
 spawns:[[-34,-32],[34,-32],[-34,22],[34,22],[-20,-34],[20,-34],[-34,0],[34,0],[0,-33],[0,36]],
 zones:[{name:'WEST COOLANT',sub:'01 / FLANK ROUTE',x:-28,z:0},
  {name:'EAST STORAGE',sub:'02 / SUPPLY SECTOR',x:28,z:0},
  {name:'DEPLOYMENT',sub:'03 / SOUTH ACCESS',x:0,z:32}]
};

// A shared BFS flow field avoids every enemy repeatedly searching the enlarged map.
// Clearance fits the largest enemy; direct collision is still checked each frame.
export function createNavigator(obstacles){
 const step=2,n=39,min=-38,clearance=1.3;
 const occupied=new Uint8Array(n*n),distance=new Int16Array(n*n);
 const index=(x,z)=>Math.max(0,Math.min(n-1,Math.round((z-min)/step)))*n+Math.max(0,Math.min(n-1,Math.round((x-min)/step)));
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const x=min+i*step,z=min+j*step;
  occupied[j*n+i]=Number(obstacles.some(o=>Math.abs(x-o.x)<o.w/2+clearance&&Math.abs(z-o.z)<o.d/2+clearance));
 }
 let anchor=-1;
 function rebuild(x,z){
  const cell=index(x,z);if(cell===anchor)return;anchor=cell;distance.fill(-1);
  // Near-cover player positions may be inaccessible to a large enemy: route to the nearest free node.
  let goal=cell;
  if(occupied[goal]){
   let best=Infinity;
   for(let k=0;k<n*n;k++)if(!occupied[k]){const d=(min+k%n*step-x)**2+(min+Math.floor(k/n)*step-z)**2;if(d<best){best=d;goal=k;}}
  }
  const queue=[goal];distance[goal]=0;
  for(let head=0;head<queue.length;head++){
   const k=queue[head],i=k%n,j=Math.floor(k/n);
   for(const [a,b] of [[i-1,j],[i+1,j],[i,j-1],[i,j+1]])if(a>=0&&a<n&&b>=0&&b<n){const q=b*n+a;if(!occupied[q]&&distance[q]<0){distance[q]=distance[k]+1;queue.push(q);}}
  }
 }
 function direction(position,target){
  rebuild(target.x,target.z);const cell=index(position.x,position.z),i=cell%n,j=Math.floor(cell/n);
  let best=distance[cell]<0?Infinity:distance[cell],next=cell;
  for(const [a,b] of [[i-1,j],[i+1,j],[i,j-1],[i,j+1]])if(a>=0&&a<n&&b>=0&&b<n){const q=b*n+a;if(distance[q]>=0&&distance[q]<best){best=distance[q];next=q;}}
  if(next===cell)return {x:target.x-position.x,z:target.z-position.z};
  return {x:min+(next%n)*step-position.x,z:min+Math.floor(next/n)*step-position.z};
 }
 function invalidate(){
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=min+i*step,z=min+j*step;occupied[j*n+i]=Number(obstacles.some(o=>Math.abs(x-o.x)<o.w/2+clearance&&Math.abs(z-o.z)<o.d/2+clearance));}
  anchor=-1;
 }
 return {direction,rebuild,invalidate,isReachable:(x,z)=>distance[index(x,z)]>=0};
}
