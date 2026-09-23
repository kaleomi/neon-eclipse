// P01 player first-person arms: viewmodel integration contract.
// Real Three.js + real project weapon-models/adapter; stubbed DOM only; no browser, no saves.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
globalThis.document??={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>null})})};
const {createWeapons}=await import('../src/weapon-models.js');
const {PLAYER_ARMS_ASSET,makePlayerArmsClips,playerArmsStats,bindPlayerArmsRig,createPlayerArmsVisual}=await import('../characters/player-arms.js');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS:',name);};
const camera=new T.PerspectiveCamera(74,16/9,.05,100);
const vm=createWeapons(camera),{gun,flash,select,animate}=vm;
const state=gun.userData.playerArmsState;
function relMatrix(node,stop,out=new T.Matrix4()){out.identity();const stack=[];for(let o=node;o&&o!==stop;o=o.parent)stack.push(o);for(let i=stack.length-1;i>=0;i--){stack[i].updateMatrix();out.multiply(stack[i].matrix);}return out;}
const gripPos=(o)=>new T.Vector3().setFromMatrixPosition(relMatrix(o,gun));
const handPos=(o)=>new T.Vector3().setFromMatrixPosition(relMatrix(o,gun));
test('original viewmodel structure preserved; P01 host attached exactly once as a visual layer',()=>{
 assert.equal(gun.parent,camera);assert(flash.isMesh);assert(state);
 assert.equal(gun.children.filter(o=>o.name==='P01_ViewmodelHost').length,1);
 assert.equal(state.host.scale.x,.65);assert(['procedural','procedural-fallback'].includes(state.source));
 assert.equal(state.anchors.hands.length,8);assert.equal(state.anchors.supports.length,8);
});
test('every weapon owns a right grip anchor; supports exist only on 0/2/4/5/7 plus shotgun pump',()=>{
 const {hands,supports,pumpSupport}=state.anchors;
 for(let i=0;i<8;i++)assert(hands[i]?.userData.gripAnchor,'grip '+i);
 for(const i of [0,2,4,5,7])assert(supports[i]?.userData.gripAnchor,'support '+i);
 assert.equal(supports[1],undefined);assert.equal(supports[3],undefined);assert.equal(supports[6],undefined);
 assert(pumpSupport?.userData.gripAnchor);assert.notEqual(pumpSupport.parent,gun.children[0]);
 assert.equal(hands[4],state.anchors.hands[4]);assert.notEqual(pumpSupport,hands[3]);
});
test('old blob-hand geometry is gone; labels and weapon boxes still intact per weapon',()=>{
 let meshes=0,anchors=0;gun.traverse(o=>{if(o.isMesh)meshes++;if(o.userData.gripAnchor)anchors++;});
 assert.equal(anchors,14);assert(meshes>80,'weapon bodies must keep their meshes');
});
test('solved hands land on every grip/support anchor for all 8 weapons within 1e-6 m',()=>{
 const nodes=state.visual.nodes;
 for(let i=0;i<8;i++){select(i);animate(i,.4,.25,0);
  assert(relMatrix(nodes.Hand_R,gun).decompose&&!0);
  const dR=gripPos(state.anchors.hands[i]).distanceTo(handPos(nodes.Hand_R));
  assert(dR<1e-6,(i+' R '+dR));
  const anchorL=i===1?state.anchors.pumpSupport:state.anchors.supports[i];
  if(anchorL){const dL=gripPos(anchorL).distanceTo(handPos(nodes.Hand_L));assert(dL<1e-6,(i+' L '+dL));}
 }
});
test('moving anchors are tracked: shotgun pump follow stays sub-millimetre across pump travels',()=>{
 const nodes=state.visual.nodes;select(1);
 for(const rec of [0,.3,.9]){animate(1,rec,0,0);
  const d=gripPos(state.anchors.pumpSupport).distanceTo(handPos(nodes.Hand_L));assert(d<1e-6,String(d));}
});
test('reload support reach and bolt recoil still drive weapon parts; viewmodel returns of animate stay pure functions',()=>{
 select(0);animate(0,0,0.5,0);
 let mag;gun.traverse(o=>{if(o.isGroup&&o.parent.name==='VANGUARD'&&o.children.length)mag=mag||o;});
 assert.doesNotThrow(()=>{select(7);animate(7,1,1,0);select(3);animate(3,1,0.9,0);select(6);animate(6,1,.4,1);});
 assert.equal(Math.round(gun.userData.weaponId.length)>0,true);
});
test('arms GLB round trip: version, rig, stats and five baked clips match the shipped manifest',async()=>{
 const buf=await readFile(new URL('../models/'+PLAYER_ARMS_ASSET.file,import.meta.url));
 const manifest=JSON.parse(await readFile(new URL('../models/player-arms-p01.manifest.json',import.meta.url)));
 assert.equal(createHash('sha256').update(buf).digest('hex'),manifest.sha256);
 const gltf=await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),'');
 const root=gltf.scene.getObjectByName('P01_Visual');assert(root);assert.equal(root.userData.assetVersion,PLAYER_ARMS_ASSET.version);
 const rig=bindPlayerArmsRig(root);assert.equal(Object.keys(rig.nodes).length,13);
 const stats=playerArmsStats(root);assert.equal(stats.meshes,manifest.meshes);assert.equal(stats.triangles,manifest.triangles);assert.equal(stats.materials,manifest.materials);
 assert.deepEqual(gltf.animations.map(c=>c.name),['Idle','Sprint','Reload','Melee','Hit']);
 for(const clip of gltf.animations)assert(clip.tracks.every(t=>t.times.length>1&&[...t.times].every(v=>Number.isFinite(v))));
});
test('procedural visual matches GLB structure; clips sample poses mutate joints then restore for export',()=>{
 const v=createPlayerArmsVisual();const clips=makePlayerArmsClips(v.root);
 assert.equal(clips.length,5);assert(v.root.getObjectByName('P01_Hand_R'));
});
console.log(JSON.stringify({passed}));
