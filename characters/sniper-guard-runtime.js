// S09 visual-only adapter. The original root meshes remain authoritative hit proxies.
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {SNIPER_ASSET,createSniperVisual,cloneSniperVisual,bindSniperRig,
  poseSniper,disposeSniperVisual} from './sniper-guard.js';
let pending=null,template=null;
export function loadSniperAsset() {
  if(!pending)pending=new GLTFLoader().loadAsync(new URL('../models/'+SNIPER_ASSET.file,import.meta.url).href).then(gltf=>{
    const root=gltf.scene.getObjectByName('S09_Visual');
    if(!root||root.userData.assetVersion!==SNIPER_ASSET.version)throw Error('S09 asset version mismatch');
    bindSniperRig(root);template=root;return root;
  });
  return pending;
}
export function attachSniperGuard(group,{loadAsset=typeof document!=='undefined'}={}) {
  const p=group.userData.parts;if(!p||p.sniperModel)return;
  const cached=loadAsset&&template;
  const visual=cached?cloneSniperVisual(cached,p.accent):createSniperVisual({accentMaterial:p.accent});
  const proxies=group.children.filter(o=>o.isMesh),proxyMaterials=new Map();
  // Reflected projectiles intentionally filter Mesh.visible. Keep the logical meshes
  // visible; only suppress their draw materials, without mutating shared steel/dark.
  for(const o of proxies){const hide=m=>{if(!proxyMaterials.has(m)){const copy=m.clone();copy.visible=false;proxyMaterials.set(m,copy);}return proxyMaterials.get(m);};
    o.material=Array.isArray(o.material)?o.material.map(hide):hide(o.material);o.userData.sniperProxy=true;}
  group.userData.ownedMaterials.push(...proxyMaterials.values());
  const state={visual,proxies,lastHp:null,hitAt:-Infinity,pose:{time:0,mode:'Idle'}};
  p.sniperModel=state;group.userData.sniperModelId='S09';group.userData.sniperModelSource=cached?'glb':'procedural';
  group.userData.ownedMaterials.push(...visual.materials);group.add(visual.root);
  if(loadAsset&&!cached)loadSniperAsset().then(asset=>{
    if(!group.parent||group.userData.parts?.sniperModel!==state)return;
    const next=cloneSniperVisual(asset,p.accent),old=state.visual;group.remove(old.root);disposeSniperVisual(old);
    const oldMats=new Set(old.materials);group.userData.ownedMaterials=group.userData.ownedMaterials.filter(m=>!oldMats.has(m));
    group.userData.ownedMaterials.push(...next.materials);state.visual=next;group.add(next.root);poseSniper(next.rig,state.pose);
    group.userData.sniperModelSource='glb';
  }).catch(()=>{if(group.parent&&group.userData.parts?.sniperModel===state)group.userData.sniperModelSource='procedural-fallback';});
}
export function animateSniperGuard(enemy,time,walking) {
  const state=enemy.group.userData.parts?.sniperModel;if(!state)return;
  if(state.lastHp!==null&&enemy.hp<state.lastHp)state.hitAt=time;state.lastHp=enemy.hp;
  const age=Math.max(0,time-state.hitAt);
  state.pose={time,phase:Number.isFinite(enemy.seed)?enemy.seed:0,
    mode:enemy.charge>0?'Aim':walking?'Patrol':'Idle',
    hit:age<.5?Math.sin(age/.5*Math.PI)*Math.exp(-age*4):0};
  poseSniper(state.visual.rig,state.pose);
}
