// A03/H12 visual adapters. The pre-existing flat meshes remain exact combat proxies.
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {GUARD_VARIANTS,createGuardVariant,cloneGuardVariant,bindGuardVariant,poseGuardVariant,disposeGuardVariant} from './guard-variants.js';
const assets=new Map();
export function loadGuardVariantAsset(type){
  if(!GUARD_VARIANTS[type])return Promise.reject(Error('Unsupported guard asset'));
  if(!assets.has(type)){
    const state={template:null,promise:null};assets.set(type,state);
    state.promise=new GLTFLoader().loadAsync(new URL('../models/'+GUARD_VARIANTS[type].file,import.meta.url).href).then(gltf=>{
      const spec=GUARD_VARIANTS[type],root=gltf.scene.getObjectByName(spec.id+'_Visual');
      if(!root||root.userData.assetVersion!==spec.version)throw Error('Guard asset version mismatch');
      bindGuardVariant(root,type);state.template=root;return root;
    });
  }return assets.get(type).promise;
}
export function attachGuardVariant(group,type,{loadAsset=typeof document!=='undefined'}={}){
  const spec=GUARD_VARIANTS[type],parts=group.userData.parts;if(!spec||!parts||parts.variantModel)return;
  const bindings={accentMaterial:parts.accent,coreMaterial:type==='heavy'?parts.coreMaterial:null};
  const cached=loadAsset&&assets.get(type)?.template;
  const visual=cached?cloneGuardVariant(cached,type,bindings):createGuardVariant(type,bindings);
  const proxies=group.children.filter(o=>o.isMesh);
  for(const o of proxies){o.visible=false;o.userData.guardVariantProxy=true;}
  const state={type,visual,proxies,pose:{time:0,mode:'Idle'},lastHp:null,hitAt:-Infinity};
  parts.variantModel=state;group.name=spec.id+'_'+type.toUpperCase()+'_GUARD';
  group.userData.guardVariantSource=cached?'glb':'procedural';group.userData.ownedMaterials.push(...visual.materials);group.add(visual.root);
  if(loadAsset&&!cached)loadGuardVariantAsset(type).then(template=>{
    if(!group.parent||group.userData.parts?.variantModel!==state)return;
    const next=cloneGuardVariant(template,type,bindings),old=state.visual;
    group.remove(old.root);disposeGuardVariant(old);
    const released=new Set(old.materials);group.userData.ownedMaterials=group.userData.ownedMaterials.filter(m=>!released.has(m));
    group.userData.ownedMaterials.push(...next.materials);state.visual=next;group.add(next.root);poseGuardVariant(next.rig,state.pose);
    group.userData.guardVariantSource='glb';
  }).catch(()=>{if(group.userData.parts?.variantModel===state)group.userData.guardVariantSource='procedural-fallback';});
}
export function animateGuardVariant(enemy,time,walking){
  const state=enemy.group.userData.parts?.variantModel;if(!state)return;
  if(state.lastHp!==null&&enemy.hp<state.lastHp)state.hitAt=time;state.lastHp=enemy.hp;
  const age=Math.max(0,time-state.hitAt);
  state.pose={time,phase:Number.isFinite(enemy.seed)?enemy.seed:0,mode:enemy.charge>0?'Aim':walking?'Patrol':'Idle',
    hit:age<.5?Math.sin(age/.5*Math.PI)*Math.exp(-age*4):0};
  poseGuardVariant(state.visual.rig,state.pose);
}
