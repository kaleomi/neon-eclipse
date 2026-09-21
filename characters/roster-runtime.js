// Additive model adapter for remaining ENEMY_TYPES. Rules and authoritative meshes stay intact.
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {ROSTER_UNITS,createRosterUnit,poseRosterUnit} from './roster-units.js';
import {bindArt,cloneArt,disposeArt} from './art-kit.js';
import {hideProxyDraw} from './hit-proxies.js';
const cache=new Map();
export function loadRosterUnit(type){
 const spec=ROSTER_UNITS[type];if(!spec)return Promise.reject(Error('Unknown roster type'));
 if(!cache.has(type)){const entry={template:null,promise:null};cache.set(type,entry);
  entry.promise=new GLTFLoader().loadAsync(new URL('../models/'+spec.file,import.meta.url).href).then(g=>{const root=g.scene.getObjectByName(spec.id+'_Visual');if(!root||root.userData.assetVersion!==spec.version)throw Error('Roster asset mismatch');bindArt(root);entry.template=root;return root;});
 }return cache.get(type).promise;
}
function bindSource(v,bindings){const released=new Set();v.root.traverse(o=>{if(o.isMesh&&bindings[o.userData.artMaterial]){released.add(o.material);o.material=bindings[o.userData.artMaterial];}});for(const m of released)if(v.materials.includes(m))m.dispose();v.materials=v.materials.filter(m=>!released.has(m));v.rig=bindArt(v.root);return v;}
function reunite(state){const v=state.visual;if(state.hatch&&v.rig.nodes.Hatch)v.root.add(v.rig.nodes.Hatch);}
function mount(group,state,v){group.add(v.root);if(v.rig.nodes.Core)v.rig.nodes.Core.visible=false; // The exact native weakpoint remains visibly authoritative.
 if(state.hatch){state.hatch.add(v.rig.nodes.Hatch);v.rig.nodes.Hatch.position.set(0,0,0);v.rig.nodes.Hatch.rotation.set(0,0,0);v.rig.nodes.Hatch.scale.setScalar(1);}
}
function applyState(group,s){const v=s.visual,p=group.userData.parts;poseRosterUnit(v.rig,s.type,{...s.pose,runtime:true});
 if(v.rig.nodes.Core)v.rig.nodes.Core.visible=false;
 if(s.hatch){v.rig.nodes.Hatch.position.set(0,0,0);v.rig.nodes.Hatch.rotation.set(0,0,0);v.rig.nodes.Hatch.scale.setScalar(1);}
 if(s.type==='stalker'){const opacity=p.fade?.[0]?.opacity??1;for(const m of new Set(Object.values(v.rig.materials))){m.transparent=true;m.depthWrite=false;m.opacity=opacity;}v.root.traverse(o=>{if(o.isMesh)o.castShadow=opacity>.8;});}
 if(s.type==='rusher'&&v.rig.materials.Signal){const m=group.userData.rusherDome?.material;v.rig.materials.Signal.emissiveIntensity=m?.emissiveIntensity??1;}
}
export function attachRosterUnit(group,type,{loadAsset=typeof document!=='undefined'}={}){
 const spec=ROSTER_UNITS[type],p=group.userData.parts;if(!spec||!p||p.rosterModel)return;
 const bindings={Signal:p.accent||p.green},cached=loadAsset&&cache.get(type)?.template;
 const v=cached?cloneArt(cached,bindings):bindSource(createRosterUnit(type),bindings);
 const proxies=group.children.filter(o=>o.isMesh&&!o.userData.combatDecoration&&o.userData.hitZone!=='core');hideProxyDraw(group,proxies,'rosterProxy');
 const s={type,visual:v,proxies,hatch:type==='artilleryMech'?group.userData.artilleryHatch:null,lastHp:null,hitAt:-Infinity,pose:{time:0,mode:spec.clips[0]}};
 p.rosterModel=s;group.userData.rosterAsset=spec.id;group.userData.rosterSource=cached?'glb':'procedural';group.userData.ownedMaterials.push(...v.materials);mount(group,s,v);applyState(group,s);
 if(loadAsset&&!cached)loadRosterUnit(type).then(template=>{if(!group.parent||group.userData.parts?.rosterModel!==s)return;
  const next=cloneArt(template,bindings),old=s.visual;reunite(s);group.remove(old.root);disposeArt(old);const gone=new Set(old.materials);group.userData.ownedMaterials=group.userData.ownedMaterials.filter(m=>!gone.has(m));
  group.userData.ownedMaterials.push(...next.materials);s.visual=next;mount(group,s,next);applyState(group,s);group.userData.rosterSource='glb';
 }).catch(()=>{if(group.parent&&group.userData.parts?.rosterModel===s)group.userData.rosterSource='procedural-fallback';});
}
export function animateRosterUnit(enemy,time=0,walking=false){const s=enemy.group.userData.parts?.rosterModel;if(!s)return;
 if(s.lastHp!==null&&enemy.hp<s.lastHp)s.hitAt=time;s.lastHp=enemy.hp;const age=Math.max(0,time-s.hitAt),type=s.type;
 let mode=ROSTER_UNITS[type].clips[0];
 if(type==='harborElite'&&enemy.eliteState?.ventRemaining>0||type==='artilleryMech'&&(enemy.artillery?.exposed||0)>0)mode='Vent';
 else if(type==='warden'&&(enemy.bossState?.openRemaining||0)>0)mode='Overload';
 else if(type==='rusher')mode=enemy.rusherBlink>0?'Armed':walking?'Sprint':'Idle';
 else if(enemy.charge>0)mode=type==='hound'?'Pounce':'Aim';
 else if(walking)mode=type==='hound'?'Run':type==='swarmDrone'?'Formation':type==='drone'?'Advance':'Patrol';
 s.pose={time,phase:Number.isFinite(enemy.seed)?enemy.seed:0,mode,hit:age<.5?Math.sin(age/.5*Math.PI)*Math.exp(-age*4):0};applyState(enemy.group,s);
}
