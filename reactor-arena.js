import * as THREE from './node_modules/three/build/three.module.js';
import {createReactorEnvironment,refineReactorSurfaces,refineReactorCore} from './reactor-look.js';
import {GLTFLoader} from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {createArt} from './art.js';
import {ARENA} from './arena.js';
// Chapter 01 reactor arena geometry, moved out of app.js unchanged: floor + grid, perimeter walls, cyan walkways,
// covers, the reactor core with rings and lamp, corner pylons, and the single player ceiling over the core.
// Every solid pushes into the shared obstacles array; the returned reactor group is rotated by the frame loop.
const cyan = new THREE.MeshStandardMaterial({ color: 0x36dfe8, emissive: 0x16bccd, emissiveIntensity: 2 });
const orange = new THREE.MeshStandardMaterial({ color: 0xff7844, emissive: 0xff3a10, emissiveIntensity: 1.5 });
const steel = new THREE.MeshStandardMaterial({ color: 0x253944, roughness: .55, metalness: .65 });
const dark = new THREE.MeshStandardMaterial({ color: 0x0b1720, roughness: .6, metalness: .7 });
const pale = new THREE.MeshStandardMaterial({ color: 0x8da7aa, roughness: .5, metalness: .5 });
export const REACTOR_MATERIALS=Object.freeze({cyan,orange,steel,dark,pale});
export function buildReactorArena({scene,renderer,obstacles,playerCeilings}){
 function box(w,h,d,x,y,z,mat=steel,parent=scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); m.position.set(x,y,z); parent.add(m); return m;
 }
 function solid(w,h,d,x,z,mat=steel){const m=box(w,h,d,x,h/2,z,mat);obstacles.push({x,z,w,h,d,mesh:m});return m;}
 let reactor=null;
 const floor=box(ARENA.size,.3,ARENA.size,0,-.2,0,dark);floor.userData.floor=true;
 const grid = new THREE.GridHelper(ARENA.size,40,0x24545c,0x142c34);grid.position.y=.005;scene.add(grid);

 const edge=ARENA.half;
 solid(1,10,ARENA.size+1,-edge,0);solid(1,10,ARENA.size+1,edge,0);solid(ARENA.size,10,1,0,-edge);solid(ARENA.size,10,1,0,edge);
 const walkway=new THREE.MeshStandardMaterial({color:0x132830});
 for(let i=-36;i<=36;i+=12){
  for(const side of [-1,1]){box(.16,7,.18,side*(edge-.6),4,i,cyan);box(2,10,1.2,i,5,-edge+1,steel);}
  box(1.8,.08,ARENA.size-4,i,.025,0,walkway);box(.08,.03,ARENA.size-4,i,.07,0,cyan);box(ARENA.size-1,.2,.3,0,8,i,steel);
 }
 for(const [x,z] of ARENA.covers){
  solid(3,2.5,3,x,z);obstacles[obstacles.length-1].cover=true;
  box(3.05,.12,3.05,x,2.1,z,cyan);box(2.7,.1,2.7,x,2.56,z,dark);
 }
 reactor = new THREE.Group(); reactor.position.set(0,0,-16); scene.add(reactor);
 solid(5,3,5,0,-16,dark);
 const placeholderCore = new THREE.Group();
 const core = new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,6,12),cyan); core.position.y=4; placeholderCore.add(core);
 for(let y=1;y<8;y+=2) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5,.14,8,48),steel); ring.rotation.x=Math.PI/2; ring.position.y=y; placeholderCore.add(ring);
 }
 reactor.add(placeholderCore);
 let disposeEnvironment=()=>{};
 if(typeof window !== 'undefined'){
  disposeEnvironment=createReactorEnvironment(scene,renderer);
  const loader = new GLTFLoader();
  loader.load('./models/reactor-core.glb', gltf=>{
   refineReactorCore(gltf.scene);
   placeholderCore.visible = false;
   reactor.add(gltf.scene);
  }, undefined, ()=>{});
 }
 const lamp=new THREE.PointLight(0x16eaff,45,20); lamp.position.set(0,5,-16); scene.add(lamp);
 for(const x of [-37,37]) for(const z of [-34,34]) { box(1,6,1,x,3,z,dark); box(1.03,1,1.03,x,5,z,orange); }
 playerCeilings.push({x:0,z:-16,w:6.5,d:6.5,bottom:0,top:9});
 const art=createArt(scene,renderer,reactor,obstacles);
 refineReactorSurfaces({floor,walls:obstacles.slice(0,4),scene,lamp});
 return {art,reactor,disposeEnvironment};
}
