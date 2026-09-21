// P01 visual-only viewmodel adapter. The articulated arms assembly is a decoration layer:
// weapon switching/firing/reload/melee semantics keep using the existing systems.
// Hands follow the pre-existing grip/support anchor objects inside each weapon model,
// so anchors stay the layout source of truth and the arms never alter weapon geometry.
import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {PLAYER_ARMS_ASSET,createPlayerArmsVisual,clonePlayerArmsVisual,bindPlayerArmsRig,disposePlayerArmsVisual,posePlayerArms} from './player-arms.js';

const SCALE=.65;
// Solved against the R07-family grip convention: fingers bind along +Y, palm toward +Z.
const GRIP_OFFSET={R:new T.Quaternion().setFromEuler(new T.Euler(-.55,0,0)),L:new T.Quaternion().setFromEuler(new T.Euler(-.55,0,0))};
const REST={R:new T.Vector3(0,-.10,.16),L:new T.Vector3(0,-.12,.10)};
let pending=null,template=null;
export function loadPlayerArmsAsset(){
  if(!pending)pending=new GLTFLoader().loadAsync(new URL('../models/'+PLAYER_ARMS_ASSET.file,import.meta.url).href).then(gltf=>{
    const root=gltf.scene.getObjectByName('P01_Visual');
    if(!root||root.userData.assetVersion!==PLAYER_ARMS_ASSET.version)throw Error('P01 asset version mismatch');
    bindPlayerArmsRig(root);template=root;return root;
  });
  return pending;
}
function relMatrix(node,stop,out){out.identity();const stack=[];for(let o=node;o&&o!==stop;o=o.parent)stack.push(o);for(let i=stack.length-1;i>=0;i--){stack[i].updateMatrix();out.multiply(stack[i].matrix);}return out;}
export function attachPlayerArmsViewModel(gun,{hands=[],supports=[],pumpSupport=null,loadAsset=typeof document!=='undefined'}={}){
  if(gun.userData.playerArmsState)return gun.userData.playerArmsState;
  const cached=loadAsset&&template;
  const visual=cached?clonePlayerArmsVisual(cached):createPlayerArmsVisual();
  const host=new T.Group();host.name='P01_ViewmodelHost';host.position.set(0,-1.09,.40);host.scale.setScalar(SCALE);host.add(visual.root);gun.add(host);
  const state={visual,host,source:cached?'glb':'procedural',time:0,
    anchors:{hands,supports,pumpSupport},
    _m:new T.Matrix4(),_p:new T.Vector3(),_q:new T.Quaternion(),_s:new T.Vector3()};
  gun.userData.playerArmsState=state;
  if(loadAsset&&!cached)loadPlayerArmsAsset().then(asset=>{
    if(!host.parent||gun.userData.playerArmsState!==state)return;
    const next=clonePlayerArmsVisual(asset),old=state.visual;host.remove(old.root);disposePlayerArmsVisual(old);
    state.visual=next;host.add(next.root);state.source='glb';
  }).catch(()=>{if(gun.userData.playerArmsState===state)state.source='procedural-fallback';});
  return state;
}
// Analytic two-bone reach; elbow hint keeps rigid armor plates outside the weapon receiver.
// Not gameplay IK: only the visual chain nodes move.
const _armWorld=new T.Matrix4(),_rootInv=new T.Matrix4();
const _S=new T.Vector3(),_T=new T.Vector3(),_D=new T.Vector3(),_E=new T.Vector3(),_h0=new T.Vector3(),_hint=new T.Vector3();
const _q1=new T.Quaternion(),_q2=new T.Quaternion(),_qTmp=new T.Quaternion(),_qInv=new T.Quaternion();
const _armAxis=new T.Vector3(),_foreAxis=new T.Vector3(),_dir=new T.Vector3(),_toE=new T.Vector3(),_toT=new T.Vector3();
function solveSide(root,host,nodes,side,targetPos,targetQuat,elbow){
  const q=side>0?'R':'L',arm=nodes['Arm_'+q],fore=nodes['Forearm_'+q],hand=nodes['Hand_'+q];
  relMatrix(arm,root,_armWorld);_S.setFromMatrixPosition(_armWorld);
  relMatrix(arm.parent,root,_armWorld);const qParent=new T.Quaternion().setFromRotationMatrix(_armWorld);
  _rootInv.copy(host.matrix).invert(); // targets arrive in gun space; solve in arms-root local space
  _T.copy(targetPos).applyMatrix4(_rootInv);
  _D.subVectors(_T,_S);const dRaw=_D.length();
  const A=fore.position.length(),B=hand.position.length();
  const d=Math.min(Math.max(dRaw,Math.abs(A-B)+.02),A+B-.02);
  const dErr=dRaw-d;_D.setLength(d);
  const dir0=_dir.copy(_D).normalize();
  _h0.set(side*.55,-.5,.30);_hint.copy(_h0).addScaledVector(dir0,-dir0.dot(_h0)).normalize();
  const a1=(A*A-B*B+d*d)/(2*d),h=Math.sqrt(Math.max(0,A*A-a1*a1));
  _E.copy(_S).addScaledVector(dir0,a1).addScaledVector(_hint,h*elbow);
  _armAxis.copy(fore.position).normalize();_toE.subVectors(_E,_S).normalize();
  _q1.setFromUnitVectors(_armAxis,_toE);
  arm.quaternion.copy(qParent.clone().invert().multiply(_q1));
  _foreAxis.copy(hand.position).normalize();_toT.subVectors(_T,_E).normalize();
  _q2.setFromUnitVectors(_foreAxis,_toT);
  fore.quaternion.copy(_qTmp.copy(_q1).invert().multiply(_q2));
  // fore world quat = Q1×inv(Q1)×Q2 = Q2; hand local expressed in that frame.
  const foreWorld=_q2.clone(),foreWorldInv=foreWorld.clone().invert();
  hand.quaternion.copy(foreWorldInv.clone().multiply(_qTmp.copy(targetQuat).multiply(GRIP_OFFSET[q])));
  hand.position.copy(_T).sub(_E).applyQuaternion(foreWorldInv);
  return dErr; // >0: anchor outside reach; caller can assert within budgets
}
export function updatePlayerArmsViewModel(gun,state,{selected=0,hands=[],supports=[],pumpSupport=null,time=0,recoil=0,reload=0,dt=1/60}={}){
  const visual=state.visual,nodes=visual.nodes,root=visual.root,host=state.host;
  state.time=(time>0&&time!==state.time)?time:state.time+Math.min(Math.max(dt,0),.05);
  posePlayerArms(visual,{time:state.time,mode:reload>0?'Reload':'Idle'});
  nodes.Shoulders.rotation.x+=recoil*.10; // kick before the solve so hands stay locked on anchors
  host.updateMatrix();
  const anchorR=hands[selected],anchorL=(selected===1&&pumpSupport)?pumpSupport:supports[selected];
  const mat=state._m,pos=state._p,quat=state._q,sca=state._s;
  if(anchorR){relMatrix(anchorR,gun,mat);mat.decompose(pos,quat,sca);solveSide(root,host,nodes,1,pos,quat,1);}
  else solveSide(root,host,nodes,1,REST.R,quat.identity(),.5);
  if(anchorL){relMatrix(anchorL,gun,mat);mat.decompose(pos,quat,sca);solveSide(root,host,nodes,-1,pos,quat,1);}
  else{const rq=state._q.setFromEuler(new T.Euler(0,.3,0));solveSide(root,host,nodes,-1,REST.L,rq,.5);}
}
export function disposePlayerArmsViewModel(gun){
  const state=gun.userData.playerArmsState;if(!state)return;
  state.host.removeFromParent();disposePlayerArmsVisual(state.visual);delete gun.userData.playerArmsState;
}
