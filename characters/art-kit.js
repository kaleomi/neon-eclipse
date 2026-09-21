// Shared DOM-free asset authoring utilities for the completed roster.
import {T,material,node,optimize,stats,noRaycast} from './guard-geometry.js';
export {T,stats};
export function artKit(spec){
 const root=new T.Group();root.name=spec.id+'_Visual';root.userData={assetVersion:spec.version,role:spec.type,assetId:spec.id,description:spec.description||spec.name};
 const colors=spec.colors||[0x516775,0xb4c3c4,0x93a9b2];
 const m={Armor:material(spec.id+'_Armor',colors[0],.62,.44),Shell:material(spec.id+'_Shell',colors[1],.35,.51),Metal:material(spec.id+'_Metal',colors[2],.84,.30),Dark:material(spec.id+'_Dark',0x17262e,.15,.81),Signal:material(spec.id+'_Signal',spec.color,.24,.3,{emissive:spec.color,emissiveIntensity:1}),Core:material(spec.id+'_Core',spec.coreColor||0x70ffdf,.25,.3,{emissive:spec.coreColor||0x40dbbd,emissiveIntensity:1.1})};
 const joints={};const joint=(key,parent=root,pos=[0,0,0])=>{const g=node(parent,spec.id+'_'+key,...pos);g.userData.artJoint=key;joints[key]=g;return g;};
 return {root,m,joints,joint,spec};
}
export function finishArt(a,pose){
 optimize(a.root);a.root.traverse(o=>{if(o.isMesh)o.userData.artMaterial=o.material.name.slice(a.spec.id.length+1);});
 a.root.userData.joints=Object.keys(a.joints);
 for(const n of Object.values(a.joints))n.userData.artRest={p:n.position.toArray(),q:n.quaternion.toArray(),s:n.scale.toArray()};
 const rig=bindArt(a.root);pose(rig,a.spec.type,{});return {root:a.root,rig,materials:Object.values(a.m)};
}
export function bindArt(root){
 const nodes={},materials={};root.traverse(o=>{if(o.userData.artJoint)nodes[o.userData.artJoint]=o;if(o.isMesh&&o.userData.artMaterial)materials[o.userData.artMaterial]=o.material;});
 for(const n of root.userData.joints||[])if(!nodes[n])throw Error('Incomplete asset joint '+n);
 return {root,nodes,materials};
}
export function resetArt(rig){for(const n of Object.values(rig.nodes)){const r=n.userData.artRest;if(r){n.position.fromArray(r.p);n.quaternion.fromArray(r.q);n.scale.fromArray(r.s);}}}
export function cloneArt(template,bindings={}){
 const root=template.clone(true),owned=new Map();root.traverse(o=>{if(!o.isMesh)return;o.geometry=o.geometry.clone();o.castShadow=true;o.receiveShadow=true;o.raycast=noRaycast;o.userData.combatDecoration=true;
  const key=o.userData.artMaterial;if(bindings[key])o.material=bindings[key];else{if(!owned.has(o.material))owned.set(o.material,o.material.clone());o.material=owned.get(o.material);}
 });return {root,rig:bindArt(root),materials:[...owned.values()]};
}
export function disposeArt(v){const gs=new Set();v.root.traverse(o=>{if(o.geometry)gs.add(o.geometry);});gs.forEach(g=>g.dispose());new Set(v.materials).forEach(m=>m.dispose());}
export function artClips(root,spec,pose){
 const rig=bindArt(root),clips=[];
 for(const mode of spec.clips){const duration=mode==='Hit'?.5:/Patrol|Run|Sprint|Advance|Formation/.test(mode)?1.2:2.4,count=Math.round(duration*24),times=Array.from({length:count+1},(_,i)=>duration*i/count),tracks=[];
  const samples=new Map(Object.values(rig.nodes).map(n=>[n,{p:[],q:[],s:[]} ]));
  for(const t of times){pose(rig,spec.type,{mode:mode==='Hit'?spec.clips[0]:mode,time:t===duration&&mode!=='Hit'?0:t,hit:mode==='Hit'?Math.sin(t/duration*Math.PI)*Math.exp(-t*4):0});
   for(const [n,a]of samples){a.p.push(...n.position.toArray());a.q.push(...n.quaternion.toArray());a.s.push(...n.scale.toArray());}}
  for(const [n,a]of samples){tracks.push(new T.VectorKeyframeTrack(n.name+'.position',times,a.p),new T.QuaternionKeyframeTrack(n.name+'.quaternion',times,a.q),new T.VectorKeyframeTrack(n.name+'.scale',times,a.s));}
  clips.push(new T.AnimationClip(mode,duration,tracks));
 }pose(rig,spec.type,{});return clips;
}
