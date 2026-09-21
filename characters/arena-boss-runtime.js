// Chapter-boss presentation only: old core/cage/controls/targets remain the live authority.
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {ARENA_BOSS_ASSETS,createArenaBossVisual,poseArenaBoss} from './arena-boss-models.js';
import {bindArt,cloneArt,disposeArt} from './art-kit.js';
import {hideProxyDraw} from './hit-proxies.js';
const assets=new Map();
export function loadArenaBossAsset(type){const spec=ARENA_BOSS_ASSETS[type];if(!assets.has(type)){const entry={template:null,promise:null};assets.set(type,entry);entry.promise=new GLTFLoader().loadAsync(new URL('../models/'+spec.file,import.meta.url).href).then(g=>{const root=g.scene.getObjectByName(spec.id+'_Visual');if(!root||root.userData.assetVersion!==spec.version)throw Error('Arena boss asset mismatch');bindArt(root);entry.template=root;return root;});}return assets.get(type).promise;}
export function attachArenaBossVisual(type,{parent,core,hide=[],materials=null,parts=null,mounts=[],shellMaterial=null,loadAsset=typeof window!=='undefined'&&typeof document!=='undefined'}={}){
 if(!parent||parent.userData.arenaArt)return parent?.userData.arenaArt;
 const alive=()=>{for(let o=parent;o;o=o.parent)if(o.isScene)return true;return false;};
 const spec=ARENA_BOSS_ASSETS[type],owned=materials||(parent.userData.ownedMaterials||=[]),cached=loadAsset&&assets.get(type)?.template;
 const mappings=[...(parts?[{key:'Flight',parent:parts.air,position:[0,0,0]},{key:'Inside',parent:parts.inside,position:[0,0,0]},{key:'Rotor',parent:parts.rotor,position:[0,0,0]}]:[]),...mounts];
 const state={type,visual:cached?cloneArt(cached):createArenaBossVisual(type),source:cached?'glb':'procedural',time:0,last:{},parts,disposed:false};
 parent.userData.arenaArt=state;parent.userData.arenaAsset=spec.id;hideProxyDraw(parent,hide,'arenaHullProxy',owned);owned.push(...state.visual.materials);
 function reunite(v){for(const {key} of mappings)if(v.rig.nodes[key])v.root.add(v.rig.nodes[key]);}
 function mount(v){parent.add(v.root);v.rig.nodes.Core.visible=false;
  for(const {key,parent:p,position}of mappings)if(p&&v.rig.nodes[key]){p.add(v.rig.nodes[key]);v.rig.nodes[key].position.fromArray(position);}
 }
 function sync(props=state.last){if(state.disposed)return;state.last={...props};const v=state.visual,mode=props.exposed?'Exposed':props.aim?'Aim':props.mode||spec.clips[0];poseArenaBoss(v.rig,type,{time:state.time,mode,runtime:true});
  v.rig.nodes.Core.visible=false;
  if(!parts){v.root.position.set(core.position.x-spec.core[0],core.position.y-spec.core[1],core.position.z-spec.core[2]);}
  for(const {key,position}of mappings){const n=v.rig.nodes[key];if(n){n.position.fromArray(position);n.rotation.set(0,0,0);n.scale.setScalar(1);}}
  if(shellMaterial&&v.rig.materials.Shell){v.rig.materials.Shell.color.copy(shellMaterial.color);v.rig.materials.Shell.emissive?.copy(shellMaterial.emissive);v.rig.materials.Shell.emissiveIntensity=shellMaterial.emissiveIntensity;}
  if(v.rig.materials.Signal)v.rig.materials.Signal.emissiveIntensity=props.aim?1.8:1;
 }
 state.sync=sync;state.tick=dt=>{if(Number.isFinite(dt)&&dt>0)state.time+=dt;};
 state.dispose=()=>{if(state.disposed)return;state.disposed=true;reunite(state.visual);state.visual.root.removeFromParent();disposeArt(state.visual);const gone=new Set(state.visual.materials);for(let i=owned.length-1;i>=0;i--)if(gone.has(owned[i]))owned.splice(i,1);};
 mount(state.visual);sync();
 if(loadAsset&&!cached)loadArenaBossAsset(type).then(t=>{if(state.disposed||!alive()||parent.userData.arenaArt!==state)return;
  const old=state.visual,next=cloneArt(t);reunite(old);old.root.removeFromParent();disposeArt(old);const released=new Set(old.materials);for(let i=owned.length-1;i>=0;i--)if(released.has(owned[i]))owned.splice(i,1);
  owned.push(...next.materials);state.visual=next;mount(next);sync();state.source='glb';
 }).catch(()=>{if(!state.disposed&&alive())state.source='procedural-fallback';});
 return state;
}
