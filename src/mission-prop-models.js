// M01 / A01 / T01: original static hard-surface props. Visuals never own gameplay colliders.
import * as T from '../node_modules/three/build/three.module.js';
import {SUPPLY_SYMBOLS} from './supply-symbols.js';

export const MISSION_PROP_ASSETS=Object.freeze({
 health:Object.freeze({id:'M01',name:'医疗补给箱',file:'medical-case-m01.glb'}),
 ammo:Object.freeze({id:'A01',name:'弹药补给箱',file:'ammo-case-a01.glb'}),
 terminal:Object.freeze({id:'T01',name:'任务交互终端',file:'mission-terminal-t01.glb'})
});
const noRaycast=()=>{};
function chamferBox(w,h,d,c){
 const s=new T.Shape(),p=[[-w/2+c,-h/2],[w/2-c,-h/2],[w/2,-h/2+c],[w/2,h/2-c],[w/2-c,h/2],[-w/2+c,h/2],[-w/2,h/2-c],[-w/2,-h/2+c]];
 p.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
 return new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,steps:1,curveSegments:1}).translate(0,0,-d/2);
}
// Merge static surfaces by material: no per-bolt draw calls, no temporary geometry kept alive.
function mergeSurfaces(root){
 const batches=new Map();
 for(const o of [...root.children]){
  if(!o.isMesh||o.userData.keepNamed)continue;
  o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);
  if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(g);
  o.geometry.dispose();root.remove(o);
 }
 for(const [material,geometries] of batches){
  const merged=new T.BufferGeometry();
  for(const name of ['position','normal']){
   const count=geometries.reduce((n,g)=>n+g.getAttribute(name).array.length,0),data=new Float32Array(count);let offset=0;
   for(const g of geometries){const a=g.getAttribute(name).array;data.set(a,offset);offset+=a.length;}
   merged.setAttribute(name,new T.BufferAttribute(data,3));
  }
  geometries.forEach(g=>g.dispose());merged.computeBoundingBox();merged.computeBoundingSphere();
  const mesh=new T.Mesh(merged,material);mesh.name=material.name+'_Surface';root.add(mesh);
 }
}
export function createMissionPropVisual(type){
 const spec=MISSION_PROP_ASSETS[type];if(!spec)throw new RangeError('Unknown mission prop: '+type);
 const root=new T.Group();root.name=spec.id+'_Visual';root.userData={missionProp:type,assetId:spec.id,version:'props-v1'};
 const mat=(name,color,metalness=.5,roughness=.48,emissive=0)=>new T.MeshStandardMaterial({name:spec.id+'_'+name,color,metalness,roughness,emissive,emissiveIntensity:emissive?.35:1});
 const shell=mat('Shell',type==='health'?0xd3ddd9:type==='ammo'?0x455d53:0x334852,type==='health'?.22:.6);
 const frame=mat('Frame',0x8b9b9f,.82,.32),dark=mat('Gasket',0x14242b,.12,.8);
 const accent=mat('Signal',type==='health'?0xff4f60:type==='ammo'?0xffcd82:0x61d9d1,.25,.4,type==='terminal'?0x23998f:0);
 const metal=mat('Fastener',0x3c525b,.85,.36);
 function piece(geometry,material,x=0,y=0,z=0,rz=0){const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.rotation.z=rz;root.add(o);return o;}
 const box=(w,h,d,x,y,z,m=shell,bevel=0)=>piece(bevel?chamferBox(w,h,d,bevel):new T.BoxGeometry(w,h,d),m,x,y,z);
 function bolt(x,y,z,r=.018){const o=piece(new T.CylinderGeometry(r,r,.014,6),metal,x,y,z);o.rotation.x=Math.PI/2;}
 if(type!=='terminal'){
  // Preserve the old pickup envelope: .85 x .5 x .65, centred at its existing bobbing pivot.
  box(.79,.37,.60,0,-.025,0,shell,.065);
  box(.83,.045,.63,0,.155,0,dark,.018);
  box(.85,.07,.65,0,.215,0,shell,.025);
  box(.78,.045,.59,0,-.2275,0,dark,.018);
  for(const x of [-.345,.345]){
   box(.10,.13,.63,x,-.175,0,frame,.018);
   box(.07,.27,.025,x,-.015,.311,frame,.014);
   box(.07,.27,.025,x,-.015,-.311,frame,.014);
   for(const z of [-.329,.329]){box(.075,.105,.015,x,.119,z,accent,.009);bolt(x,.116,z>0?.339:-.339,.016);}
  }
  // Front identifier recess remains behind the original high-contrast vector symbol.
  box(.52,.255,.023,0,-.018,.312,dark,.028);
  box(.49,.23,.008,0,-.018,.327,shell,.025);
  // Recessed carrying handle and hinge hardware on the rear; no overlap with the front symbol.
  box(.34,.13,.018,0,.018,-.311,dark,.018);
  box(.28,.03,.025,0,.04,-.327,frame,.007);
  for(const x of [-.125,.125])box(.027,.06,.02,x,.01,-.326,frame);
  for(const x of [-.27,.27])box(.085,.05,.035,x,.19,-.31,metal,.007);
  if(type==='ammo'){
   // Ribbed magazine case sides; unlike the smooth sanitary medical housing.
   for(const x of [-.399,.399])for(const z of [-.19,-.065,.065,.19])box(.03,.24,.035,x,-.025,z,metal,.009);
   for(const x of [-.25,0,.25])box(.085,.012,.036,x,.252,-.26,accent);
  }else{
   for(const x of [-.403,.403])box(.022,.12,.34,x,-.025,0,accent,.008);
  }
  const symbol=SUPPLY_SYMBOLS[type];
  const shapes=symbol.contours.map(points=>{const s=new T.Shape();points.forEach(([x,y],i)=>{const px=(x-symbol.width/2)/symbol.width,py=(symbol.height/2-y)/symbol.width;i?s.lineTo(px,py):s.moveTo(px,py);});s.closePath();return s;});
  const sign=new T.MeshBasicMaterial({name:spec.id+'_Identifier',color:symbol.color,side:T.DoubleSide,depthTest:true,depthWrite:false,toneMapped:false});
  for(const [name,size] of [['top',.62],['front',.48]]){
   const g=new T.ShapeGeometry(shapes);g.deleteAttribute('uv');const o=new T.Mesh(g,sign);o.name='supply-mark-'+name;o.userData={keepNamed:true,supplySymbol:type};o.scale.setScalar(size);
   if(name==='top'){o.rotation.x=-Math.PI/2;o.position.y=.263;}else o.position.set(0,-.018,.346);
   root.add(o);
  }
 }else{
  // No geometry crosses the 1.8 x 1.4 x 1.0 legacy collider or the live screen at z=.51.
  box(1.70,1.25,.88,0,.705,0,shell,.09);
  box(1.80,.13,1,0,.065,0,dark,.025);
  box(1.76,.075,.96,0,1.3625,0,frame,.03);
  for(const x of [-.825,.825]){
   box(.13,1.21,.94,x,.725,0,frame,.025);
   box(.12,.12,.96,x,.18,0,accent,.018);
   for(const y of [.31,1.27])bolt(x,y,.48,.025);
  }
  // Screen opening matches the existing 1.5 x .75 canvas; all decoration is behind it.
  box(1.56,.80,.046,0,1,.472,dark,.025);
  box(1.49,.74,.006,0,1,.498,dark,.015);
  box(1.49,.14,.045,0,.52,.464,metal,.015);
  for(let i=0;i<8;i++)box(.07,.026,.008,-.57+i*.15,.52,.491,i===7?accent:frame,.006);
  box(.49,.205,.027,-.44,.31,.46,dark,.018);
  for(let i=0;i<4;i++)box(.40,.017,.024,-.44,.245+i*.042,.485,metal);
  box(.42,.12,.029,.42,.33,.46,dark,.018);
  box(.30,.017,.01,.42,.35,.481,accent);
  for(const x of [-.50,.50]){
   box(.43,.64,.025,x,.77,-.452,dark,.02);
   for(let i=0;i<7;i++)box(.35,.025,.027,x,.52+i*.082,-.479,metal);
  }
  for(const x of [-.80,.80])for(const z of [-.40,.40])box(.18,.055,.17,x,.0275,z,metal,.018);
 }
 mergeSurfaces(root);
 root.traverse(o=>{o.raycast=noRaycast;if(o.isMesh){o.castShadow=!o.userData.keepNamed;o.receiveShadow=true;o.userData.missionPropVisual=true;}});
 return root;
}
export function missionPropStats(root){
 let meshes=0,triangles=0;const materials=new Set();root.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;materials.add(o.material);});
 const bounds=new T.Box3().setFromObject(root);return {meshes,triangles,materials:materials.size,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
}
export function disposeMissionProp(root){
 const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
// A library owns its templates. Instances share immutable surfaces, but never transforms.
// Dispose only after every instance is detached. Collected/reset pickups must NOT dispose shared data.
export function createMissionPropLibrary(){
 const templates=new Map();let disposed=false;
 return {
  create(type){if(disposed)throw new Error('Mission prop library disposed');if(!templates.has(type))templates.set(type,createMissionPropVisual(type));const root=templates.get(type).clone(true);root.traverse(o=>{o.raycast=noRaycast;if(o.name==='supply-mark-top')o.rotation.x=-Math.PI/2;});return root;},
  stats:()=>({templates:templates.size}),
  dispose(){if(disposed)return;disposed=true;templates.forEach(disposeMissionProp);templates.clear();}
 };
}
