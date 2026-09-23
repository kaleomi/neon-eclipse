import * as T from '../node_modules/three/build/three.module.js';
// All model geometry is owned by the passed arena root and disposed by its world adapter.
export function createSiegeModel(root,config,materials){
 const mat=(color,basic=false)=>{const m=basic?new T.MeshBasicMaterial({color}):new T.MeshStandardMaterial({color,roughness:.5,metalness:.6});materials.push(m);return m;};
 const steel=mat(0x41586c),dark=mat(0x182b3b),gold=mat(0xffbd6f,true),cyan=mat(0x82fff1,true);
 const box=(w,h,d,x,y,z,m=steel,parent=root)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;};
 const body=new T.Group(),air=new T.Group(),inside=new T.Group();root.add(body);body.add(air,inside);
 if(config.id==='skyhook'){
  box(2.3,1.2,3,0,1.25,0,dark,air);box(1.7,.55,.6,0,1.5,1.5,mat(0x306778,true),air);box(.45,.45,3.2,0,1,-2.8,steel,air);box(1.8,.15,.5,0,1,-4.1,steel,air);
  for(const x of [-1.2,1.2])box(.12,.15,3.7,x,.35,0,gold,air);
  const rotor=new T.Group();rotor.position.y=2.7;air.add(rotor);box(7,.07,.2,0,0,0,steel,rotor);box(.2,.07,7,0,0,0,steel,rotor);box(.18,1,.18,0,2.2,0,gold,air);air.userData.rotor=rotor;
  box(1.5,1.8,1.2,0,1.1,0,dark,inside);for(const x of [-.85,.85])box(.22,1.2,1.7,x,.65,0,steel,inside);
 }else{
  box(3.4,1.8,3,0,1.25,0,dark,air);box(.55,.55,3.2,0,2.15,2,steel,air);box(3.8,.2,3.5,0,.65,0,steel,air);
  for(const x of [-1.5,1.5])box(.18,1.5,.18,x,1.4,1.55,gold,air);
  // A docked armored flagship hull behind the playable maintenance deck.
  box(7,1.5,8,29,1.2,-16,dark);box(.4,11.5,.4,22,5.75,-27,steel);box(8,.35,.45,18,11.2,-23,gold);
 }
 const core=new T.Mesh(new T.IcosahedronGeometry(.48,1),cyan);core.position.set(0,config.core.height,config.core.front);core.userData.overseer='core';body.add(core);
 const cageMat=mat(0xffc575,true);cageMat.wireframe=true;const cage=new T.Mesh(new T.IcosahedronGeometry(.69,1),cageMat);cage.position.copy(core.position);cage.userData.overseer='core';body.add(cage);
 const armor=[];for(const [index,group] of [air,inside].entries())group.traverse(m=>{if(m.isMesh){m.userData.siegePhase=index;m.userData.overseer='armor';armor.push(m);}});
 const payload=box(2.5,1.3,2.4,18,10,-23,gold);payload.visible=false;
 const cable=box(.045,6,.045,18,8,-23,gold);cable.visible=false;
 const warnMat=mat(0xffc575,true);warnMat.transparent=true;warnMat.opacity=.5;
 const warning=new T.Mesh(new T.RingGeometry(1.5,1.7,32),warnMat);warning.rotation.x=-Math.PI/2;root.add(warning);
 const spotlight=new T.Mesh(new T.ConeGeometry(1.7,5,20,1,true),warnMat);root.add(spotlight);
 return {body,air,inside,core,cage,armor,payload,cable,warning,spotlight,box,steel,gold,cyan};
}
