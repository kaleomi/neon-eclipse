import {hideProxyDraw} from './hit-proxies.js';
// C01 visual-only adapter. The original root meshes remain authoritative hit proxies.
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {COMMANDER_ASSET,createCommanderVisual,cloneCommanderVisual,bindCommanderRig,
  poseCommander,disposeCommanderVisual} from './commander-guard.js';
let pending=null,template=null;
export function loadCommanderAsset() {
  if(!pending)pending=new GLTFLoader().loadAsync(new URL('../models/'+COMMANDER_ASSET.file,import.meta.url).href).then(gltf=>{
    const root=gltf.scene.getObjectByName('C01_Visual');
    if(!root||root.userData.assetVersion!==COMMANDER_ASSET.version)throw Error('C01 asset version mismatch');
    bindCommanderRig(root);template=root;return root;
  });
  return pending;
}
export function attachCommanderGuard(group,{loadAsset=typeof document!=='undefined'}={}) {
  const p=group.userData.parts;if(!p||p.commanderModel)return;
  const cached=loadAsset&&template;
  const visual=cached?cloneCommanderVisual(cached,p.accent):createCommanderVisual({accentMaterial:p.accent});
  const proxies=group.children.filter(o=>o.isMesh);
  hideProxyDraw(group,proxies,'commanderProxy');
  const state={visual,proxies,lastHp:null,hitAt:-Infinity,pose:{time:0,mode:'Idle'}};
  p.commanderModel=state;group.userData.commanderModelId='C01';group.userData.commanderModelSource=cached?'glb':'procedural';
  group.userData.ownedMaterials.push(...visual.materials);group.add(visual.root);
  if(loadAsset&&!cached)loadCommanderAsset().then(asset=>{
    if(!group.parent||group.userData.parts?.commanderModel!==state)return;
    const next=cloneCommanderVisual(asset,p.accent),old=state.visual;group.remove(old.root);disposeCommanderVisual(old);
    const oldMats=new Set(old.materials);group.userData.ownedMaterials=group.userData.ownedMaterials.filter(m=>!oldMats.has(m));
    group.userData.ownedMaterials.push(...next.materials);state.visual=next;group.add(next.root);poseCommander(next.rig,state.pose);
    group.userData.commanderModelSource='glb';
  }).catch(()=>{if(group.parent&&group.userData.parts?.commanderModel===state)group.userData.commanderModelSource='procedural-fallback';});
}
export function animateCommanderGuard(enemy,time,walking) {
  const state=enemy.group.userData.parts?.commanderModel;if(!state)return;
  if(state.lastHp!==null&&enemy.hp<state.lastHp)state.hitAt=time;state.lastHp=enemy.hp;
  const age=Math.max(0,time-state.hitAt);
  state.pose={time,phase:Number.isFinite(enemy.seed)?enemy.seed:0,
    mode:enemy.charge>0?'Aim':walking?'Patrol':enemy.commanderRecipients>0?'Command':'Idle',
    broadcast:enemy.commanderRecipients>0,
    hit:age<.5?Math.sin(age/.5*Math.PI)*Math.exp(-age*4):0};
  poseCommander(state.visual.rig,state.pose);
}
