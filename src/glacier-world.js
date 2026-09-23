import {attachArenaBossVisual} from '../characters/arena-boss-runtime.js';
import {createBossAdapter} from './boss-adapter.js';
import {registerHaloWeakHit,stepHaloMark,haloDamageMultiplier,haloMarkText} from '../weapons/halo-rules.js';
import {createBossBattleRecord} from './boss-battle-record.js';
import * as T from '../node_modules/three/build/three.module.js';
import {GLACIER_MAX_HP,createGlacier,GLACIER_SHELL_RADIUS,glacierHint} from './glacier-rules.js';
import {THIN_ICE} from './polar-data.js';
export const GLACIER_NAME='GLACIER 重炮机甲';
// Same handle shape as overseer-world / tether-world / abyss-world. `weather` is the polar world (thermal getter).
export function createGlacierWorld(scene,obstacles,weather){
 const battle=createBossBattleRecord(),haloTarget={};
 const rules=createGlacier(),root=new T.Group();scene.add(root);let stage=-1;
 const hullMat=new T.MeshStandardMaterial({color:0x5a6d80,metalness:.75,roughness:.35}),plateMat=new T.MeshStandardMaterial({color:0xc8d6e2,emissive:0x2c4a63,emissiveIntensity:.6,metalness:.6,roughness:.4}),coreMat=new T.MeshBasicMaterial({color:0xff7a3a});
 const mech=new T.Group();root.add(mech);
 const body=new T.Mesh(new T.BoxGeometry(4.2,2.6,3.4),hullMat);body.position.y=3.4;body.userData.overseer='hull';mech.add(body);
 const cannon=new T.Mesh(new T.CylinderGeometry(.35,.45,4.6,10),hullMat);cannon.rotation.x=Math.PI/2;cannon.position.set(0,4,2.8);cannon.userData.overseer='hull';mech.add(cannon);
 const plate=new T.Mesh(new T.BoxGeometry(3.2,1.8,.3),plateMat);plate.position.set(0,3.2,1.75);plate.userData.overseer='hull';mech.add(plate);
 const core=new T.Mesh(new T.IcosahedronGeometry(.6,1),coreMat);core.position.set(0,3.2,1.85);core.userData.overseer='core';mech.add(core);
 const legs=[];for(const [x,z] of [[-1.8,-1.2],[1.8,-1.2],[-1.8,1.2],[1.8,1.2]]){const l=new T.Mesh(new T.BoxGeometry(.7,2.2,.7),hullMat);l.position.set(x,1.1,z);l.userData.overseer='hull';mech.add(l);legs.push(l);}
 const eye=new T.Mesh(new T.SphereGeometry(.25,8,8),new T.MeshBasicMaterial({color:0xff4568}));eye.position.set(0,4.4,1.7);mech.add(eye);
 const shellRing=new T.Mesh(new T.RingGeometry(GLACIER_SHELL_RADIUS-.3,GLACIER_SHELL_RADIUS,48),new T.MeshBasicMaterial({color:0xff4568,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false}));shellRing.rotation.x=-Math.PI/2;shellRing.position.y=.05;shellRing.visible=false;root.add(shellRing);
 const crack=new T.Mesh(new T.RingGeometry(THIN_ICE.radius-.6,THIN_ICE.radius,48),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));crack.rotation.x=-Math.PI/2;crack.position.set(THIN_ICE.x,.03,THIN_ICE.z);crack.visible=false;root.add(crack);
 const visual=attachArenaBossVisual('glacier',{parent:mech,core,hide:mech.children.filter(o=>o.isMesh&&o!==core),shellMaterial:plateMat,mounts:legs.map((parent,i)=>({key:'Leg'+i,parent,position:[0,1.1,0]}))});
 const panel=document.createElement('div');panel.className='boss-mechanic';panel.style.cssText='position:fixed;top:124px;right:auto;left:50%;transform:translateX(-50%);width:440px;max-width:calc(100vw - 48px);pointer-events:none;z-index:12;padding:12px;background:#0c1a26e8;border:1px solid #9fd2ff;color:#eaf6ff;font:13px sans-serif;white-space:pre-line';document.body.append(panel);
 const title=document.createElement('div'),healthTrack=document.createElement('div'),healthFill=document.createElement('div');
 healthTrack.style.cssText='height:12px;background:#152638;border:1px solid #9cb2bd;margin:8px 0;position:relative';healthFill.style.cssText='height:100%;width:100%;background:linear-gradient(90deg,#9fd2ff,#ff7a3a);transition:width .12s linear';
 healthTrack.append(healthFill);panel.append(title,healthTrack);const hint=document.createElement('div');panel.append(hint);
 let armorFeedback=0;
 function sync(playing=true){
  const s=rules.state;root.visible=s.active;panel.hidden=!playing||!s.active;
  mech.position.set(s.x,s.phase==='sunk'?-1.6:s.phase==='climbing'?-.6:0,s.z);
  const exposed=rules.exposed;plateMat.emissiveIntensity=exposed?0:.6;plateMat.color.setHex(exposed?0x5a6d80:0xc8d6e2);coreMat.color.setHex(exposed?0xff7a3a:0x7a3a1a);core.scale.setScalar(exposed?1.3:1);
  visual.sync({exposed,aim:s.shell==='warning'});
  shellRing.visible=s.shell==='warning'&&!!s.target;if(s.target)shellRing.position.set(s.target.x,.05,s.target.z);
  crack.visible=s.phase!=='armored'||s.press>0;crack.material.opacity=s.phase!=='armored'?.9:.2+s.press/2.5*.6;
  title.textContent=GLACIER_NAME+' · 阶段 '+s.tier+' / '+(s.tier===2?'急速炮击':'重炮')+' · '+Math.ceil(s.hp)+' / '+GLACIER_MAX_HP+' · 陷冰 '+s.sinks+' 次';
  healthFill.style.width=(Math.max(0,s.hp)/GLACIER_MAX_HP*100)+'%';
  hint.textContent=glacierHint(s)+'\n'+(armorFeedback>0?'装甲弹开：伤害 ×0.15！把它引到薄冰上。 ':'')+(weather?.thermal?'暴风雪：机甲不受影响，注意体温。':'');
  const mark=haloMarkText(haloTarget);if(mark)hint.textContent+=' · '+mark;
  panel.style.borderColor=exposed?'#ff7a3a':'#9fd2ff';panel.dataset.exposed=String(exposed);
 }
 function setStage(index){if(stage===index)return;breaker.reset();delete haloTarget.haloMark;stage=index;rules.reset(index===3);if(index===3)battle.start(GLACIER_NAME);sync();}
 const boss=createBossAdapter(rules,'glacier',{name:GLACIER_NAME,maxHp:GLACIER_MAX_HP}),breaker={interrupt:boss.interruptCharge,reset:boss.resetInterrupt};
 function interruptCharge(){const ok=breaker.interrupt();if(ok)sync(true);return ok;}
 function clear(){breaker.reset();delete haloTarget.haloMark;battle.clear();stage=-1;armorFeedback=0;rules.reset();sync(false);}
 function update(dt,player,feetY,playing,grounded=true){
  if(!rules.blocking||!playing){sync(playing);return 0;}
  visual.tick(dt);stepHaloMark(haloTarget,dt);battle.tick(dt);armorFeedback=Math.max(0,armorFeedback-dt);
  const was=rules.exposed,damage=rules.tick(dt,{player:{x:player.x,z:player.z},feetY});
  if(rules.state.phase==='armored'){mech.rotation.y=Math.atan2(player.x-rules.state.x,player.z-rules.state.z);const t=performance.now()*.004;legs.forEach((l,i)=>l.rotation.x=Math.sin(t+i*1.6)*.25);}
  if(!rules.exposed)delete haloTarget.haloMark;sync(playing);void was;return damage;
 }
 function hit(object,amount,{halo=false}={}){const part=object.userData.overseer,shielded=rules.blocking&&!rules.exposed;if(shielded)armorFeedback=1.5;const was=rules.blocking,wasExposed=rules.exposed,dealt=rules.damage(part,amount*(part==='core'?haloDamageMultiplier(haloTarget):1));const marked=halo&&dealt>0&&part==='core'&&rules.exposed&&registerHaloWeakHit(haloTarget);battle.hit(dealt,part==='core'&&wasExposed,false);sync();return {shielded,marked,damage:dealt,killed:was&&!rules.blocking,weak:dealt>0&&wasExposed&&part==='core',message:'装甲弹开！把 GLACIER 引到中央薄冰上，压碎冰面后攻击核心',killMessage:'GLACIER 沉入冰湖 // 返回西侧暖房撤离'};}
 function updateMarkers(){}
 // Test-only helpers (chapter 09 browser test): teleport the mech / fast-forward its rule clock without rendering.
 function place(x,z){rules.state.x=x;rules.state.z=z;}
 function advance(seconds,player={x:0,z:0},feetY=0){for(let left=seconds;left>0;left-=.05)rules.tick(Math.min(.05,left),{player,feetY});sync();}
 clear();return {interruptCharge,boss,setStage,clear,update,hit,updateMarkers,battle,place,advance,get origin(){return new T.Vector3(rules.state.x,0,rules.state.z);},get blocking(){return rules.blocking;},get targets(){return rules.blocking?mech.children.filter(m=>m.userData.overseer!==undefined):[];},get position(){return {x:rules.state.x,z:rules.state.z};},get state(){return rules.state;}};
}
