// B04 visual-only adapter. Original shield meshes/EMP visibility and hit proxies stay authoritative.
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {SHIELD_ASSET,SHIELD_ANCHOR,createShieldVisual,cloneShieldVisual,bindShieldRig,
  poseShield,disposeShieldVisual} from './shield-guard.js';
let pending=null,template=null;
export function loadShieldAsset(){
  if(!pending)pending=new GLTFLoader().loadAsync(new URL('../models/'+SHIELD_ASSET.file,import.meta.url).href).then(gltf=>{
    const root=gltf.scene.getObjectByName('B04_Visual');if(!root||root.userData.assetVersion!==SHIELD_ASSET.version)throw Error('B04 asset version mismatch');
    bindShieldRig(root);template=root;return root;
  });return pending;
}
function mountProjection(group,state,visual){
  group.add(visual.root);
  // A child of the original plate inherits native empVisual() hide/recovery immediately.
  // No property interception, no change to parts.shield, no extra gameplay collision.
  state.plate.add(visual.rig.nodes.Shield);visual.rig.nodes.Shield.position.set(0,0,0);
  poseShield(visual.rig,state.pose);
}
function restoreProjection(visual){
  // Reunite the split hierarchy before disposing a replaced fallback; otherwise its shield leaks.
  visual.root.add(visual.rig.nodes.Shield);visual.rig.nodes.Shield.position.fromArray(SHIELD_ANCHOR);
}
export function attachShieldGuard(group,{loadAsset=typeof document!=='undefined'}={}){
  const p=group.userData.parts;if(!p?.shield?.[0]||!p.core||p.shieldModel)return;
  const bindings={accentMaterial:p.accent,coreMaterial:p.coreMaterial},cached=loadAsset&&template;
  const visual=cached?cloneShieldVisual(cached,bindings):createShieldVisual(bindings);
  const proxies=group.children.filter(o=>o.isMesh),proxyMaterials=new Map();
  // Keep logical visibility for reflected projectiles; do not mutate global steel/dark materials.
  for(const o of proxies){const hide=m=>{if(!proxyMaterials.has(m)){const c=m.clone();c.visible=false;proxyMaterials.set(m,c);}return proxyMaterials.get(m);};
    o.material=Array.isArray(o.material)?o.material.map(hide):hide(o.material);o.userData.shieldSampleProxy=true;}
  group.userData.ownedMaterials.push(...proxyMaterials.values(),...visual.materials);
  const state={visual,plate:p.shield[0],proxies,lastHp:null,hitAt:-Infinity,pose:{time:0,mode:'Idle',fieldEnabled:true}};
  p.shieldModel=state;group.userData.shieldModelId='B04';group.userData.shieldModelSource=cached?'glb':'procedural';mountProjection(group,state,visual);
  if(loadAsset&&!cached)loadShieldAsset().then(asset=>{
    if(!group.parent||group.userData.parts?.shieldModel!==state)return;
    const next=cloneShieldVisual(asset,bindings),old=state.visual;restoreProjection(old);group.remove(old.root);disposeShieldVisual(old);
    const oldMats=new Set(old.materials);group.userData.ownedMaterials=group.userData.ownedMaterials.filter(m=>!oldMats.has(m));group.userData.ownedMaterials.push(...next.materials);
    state.visual=next;mountProjection(group,state,next);group.userData.shieldModelSource='glb';
  }).catch(()=>{if(group.parent&&group.userData.parts?.shieldModel===state)group.userData.shieldModelSource='procedural-fallback';});
}
export function animateShieldGuard(enemy,time,walking){
  const s=enemy.group.userData.parts?.shieldModel;if(!s)return;
  if(s.lastHp!==null&&enemy.hp<s.lastHp)s.hitAt=time;s.lastHp=enemy.hp;const age=Math.max(0,time-s.hitAt),broken=enemy.shieldDownRemaining>0||!s.plate.visible;
  s.pose={time,phase:Number.isFinite(enemy.seed)?enemy.seed:0,mode:enemy.charge>0?'Aim':walking?'Patrol':broken?'Exposed':'Idle',shieldBroken:broken,fieldEnabled:true,
    hit:age<.5?Math.sin(age/.5*Math.PI)*Math.exp(-age*4):0};poseShield(s.visual.rig,s.pose);
}
