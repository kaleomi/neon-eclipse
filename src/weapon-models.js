// First-person adapter: geometry comes from the standalone weapon asset source.
// Preserve the existing .65 scale, P01 anchors, select/animate contracts and gameplay ownership.
import {reloadPose} from './action-poses.js';
import * as T from '../node_modules/three/build/three.module.js';
import {attachPlayerArmsViewModel,updatePlayerArmsViewModel,disposePlayerArmsViewModel} from '../characters/player-arms-viewmodel.js';
import {WEAPON_MODEL_VERSION,createWeaponVisual,getWeaponBindings,createLiveReloadShell,disposeWeaponVisual} from './weapon-asset-models.js';
export function createWeapons(camera){
 const gun=new T.Group();camera.add(gun);gun.userData.weaponModelsVersion=WEAPON_MODEL_VERSION;
 const models=[],pumps=[],hands=[],shells=[],magazines=[],supports=[],bolts=[];let pumpSupport=null;
 for(let i=0;i<8;i++){
  const g=createWeaponVisual(i),rig=getWeaponBindings(g);g.scale.setScalar(.65);gun.add(g);models.push(g);hands[i]=rig.right;
  if(rig.pump)pumps[i]=rig.pump;if(rig.support)supports[i]=rig.support;if(rig.magazine)magazines[i]=rig.magazine;if(rig.bolt)bolts[i]=rig.bolt;
  if(rig.pumpSupport)pumpSupport=rig.pumpSupport;
  if(i===1){shells[i]=createLiveReloadShell();g.add(shells[i]);}
  if(i===6)g.userData.railEnergy=rig.energy;if(i===7)g.userData.voltEnergy=rig.energy;
 }
 const grips=hands.slice();
  const arms=attachPlayerArmsViewModel(gun,{hands:grips,supports,pumpSupport});
  const flash=new T.Mesh(new T.IcosahedronGeometry(.09,0),new T.MeshBasicMaterial({color:0xffd79c,transparent:true,opacity:.9}));gun.add(flash);flash.visible=false;
 function select(index){gun.userData.weaponId=['vanguard','breacher','ghost','arc-blade','tempest','halo','railspike','volt'][index];models.forEach((m,i)=>m.visible=i===index);flash.position.set(0,.036,index===2?-.38:index===4?-.40:index===5?-.74:index===6?-.42:index===7?-.51:-.66);}
 function animate(index,recoil,reloadProgress,charge=0){
  models[6].userData.railEnergy.emissiveIntensity=.3+(index===6?charge*3:0);
  models[7].userData.voltEnergy.emissiveIntensity=.5+(index===7?recoil*2:0);
  const p=reloadPose(reloadProgress,index===1);
  if(pumps[1])pumps[1].position.z=-.39+(index===1?recoil*.1:0);
  if(shells[1]){shells[1].visible=index===1&&reloadProgress>0&&reloadProgress<.82;shells[1].position.set(-.16*(1-p.hand*.6),-.4+p.hand*.32,.18-p.hand*.14);shells[1].rotation.x=p.hand*.8;}
  if(pumpSupport){const feed=index===1?p.hand:0;pumpSupport.position.set(-.025-feed*.1,-.125-feed*.1,.06+feed*.35);pumpSupport.rotation.x=-feed*.7;}
  magazines.forEach((mag,i)=>{const n=i===index?p.mag:0;mag.position.set(-.1*n,-.38*n,.12*n);mag.rotation.z=-.25*n;});
  supports.forEach((h,i)=>{const n=i===index?p.hand:0;h.position.set((i===2?-.15:-.02)-.06*n,(i===2?-.18:-.115)-.3*n,(i===2?.22:-.28)+.22*n);h.rotation.x=-.8*n;});
  bolts.forEach((b,i)=>{b.position.z=-.01+(i===index?recoil*.035+p.bolt*.065:0);});
  updatePlayerArmsViewModel(gun,arms,{selected:index,hands:grips,supports,pumpSupport,recoil,reload:reloadProgress});
 }
 let disposed=false;
 function dispose(){if(disposed)return;disposed=true;disposePlayerArmsViewModel(gun);for(const model of models)disposeWeaponVisual(model);flash.geometry.dispose();flash.material.dispose();gun.removeFromParent();}
 select(0);return {gun,flash,select,animate,dispose};
}
