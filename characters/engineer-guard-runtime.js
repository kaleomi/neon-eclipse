import {hideProxyDraw} from './hit-proxies.js';
// E02 visual-only adapter. The original root meshes remain authoritative hit proxies.
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {ENGINEER_ASSET,createEngineerVisual,cloneEngineerVisual,bindEngineerRig,
  poseEngineer,disposeEngineerVisual} from './engineer-guard.js';
let pending=null,template=null;
export function loadEngineerAsset() {
  if(!pending)pending=new GLTFLoader().loadAsync(new URL('../models/'+ENGINEER_ASSET.file,import.meta.url).href).then(gltf=>{
    const root=gltf.scene.getObjectByName('E02_Visual');
    if(!root||root.userData.assetVersion!==ENGINEER_ASSET.version)throw Error('E02 asset version mismatch');
    bindEngineerRig(root);template=root;return root;
  });
  return pending;
}
export function attachEngineerGuard(group,{loadAsset=typeof document!=='undefined'}={}) {
  const p=group.userData.parts;if(!p||p.engineerModel)return;
  const cached=loadAsset&&template;
  const visual=cached?cloneEngineerVisual(cached,p.accent):createEngineerVisual({accentMaterial:p.accent});
  const proxies=group.children.filter(o=>o.isMesh);
  hideProxyDraw(group,proxies,'engineerProxy');
  const state={visual,proxies,lastHp:null,hitAt:-Infinity,pose:{time:0,mode:'Idle'}};
  p.engineerModel=state;group.userData.engineerModelId='E02';group.userData.engineerModelSource=cached?'glb':'procedural';
  group.userData.ownedMaterials.push(...visual.materials);group.add(visual.root);
  if(loadAsset&&!cached)loadEngineerAsset().then(asset=>{
    if(!group.parent||group.userData.parts?.engineerModel!==state)return;
    const next=cloneEngineerVisual(asset,p.accent),old=state.visual;group.remove(old.root);disposeEngineerVisual(old);
    const oldMats=new Set(old.materials);group.userData.ownedMaterials=group.userData.ownedMaterials.filter(m=>!oldMats.has(m));
    group.userData.ownedMaterials.push(...next.materials);state.visual=next;group.add(next.root);poseEngineer(next.rig,state.pose);
    group.userData.engineerModelSource='glb';
  }).catch(()=>{if(group.parent&&group.userData.parts?.engineerModel===state)group.userData.engineerModelSource='procedural-fallback';});
}
export function animateEngineerGuard(enemy,time,walking) {
  const state=enemy.group.userData.parts?.engineerModel;if(!state)return;
  if(state.lastHp!==null&&enemy.hp<state.lastHp)state.hitAt=time;state.lastHp=enemy.hp;
  const age=Math.max(0,time-state.hitAt);
  state.pose={time,phase:Number.isFinite(enemy.seed)?enemy.seed:0,
    mode:enemy.engineerRepairing?'Repair':enemy.engineerBuilding?'Deploy':enemy.charge>0?'Aim':walking?'Patrol':'Idle',
    hit:age<.5?Math.sin(age/.5*Math.PI)*Math.exp(-age*4):0};
  poseEngineer(state.visual.rig,state.pose);
}
