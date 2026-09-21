import {attachArenaBossVisual} from './characters/arena-boss-runtime.js';
import {createBossAdapter} from './boss-adapter.js';
import {registerHaloWeakHit,stepHaloMark,haloDamageMultiplier,haloMarkText} from './weapons/halo-rules.js';
import {createBossBattleRecord} from './boss-battle-record.js';
import * as T from './node_modules/three/build/three.module.js';
import {TETHER_MAX_HP,createTether,TETHER_POSITION,TETHER_STABILIZERS,tetherHint} from './tether-rules.js';
import {GRAVITY_BANDS} from './orbital-data.js';
export const TETHER_NAME='TETHER 锚定核心';
const BAND_HEIGHTS=[.35,4.35,9.35];
// Same surface as overseer-world.js so app.js drives both bosses through one handle.
export function createTetherWorld(scene,obstacles){
 const battle=createBossBattleRecord(),haloTarget={};
 const rules=createTether(),root=new T.Group();scene.add(root);let stage=-1;
 const shield=new T.MeshBasicMaterial({color:0xffbd64,wireframe:true}),coreMat=new T.MeshBasicMaterial({color:0x71ffff});
 const core=new T.Mesh(new T.IcosahedronGeometry(1.1,1),coreMat);core.position.set(TETHER_POSITION.x,TETHER_POSITION.y,TETHER_POSITION.z);core.userData.overseer='core';root.add(core);
 const cage=new T.Mesh(new T.IcosahedronGeometry(1.5,1),shield);cage.position.copy(core.position);cage.userData.overseer='core';root.add(cage);
 const nodes=TETHER_STABILIZERS.map((p,i)=>{const m=new T.Mesh(new T.CylinderGeometry(.6,.85,2.2,8),new T.MeshStandardMaterial({color:0xffbd64,emissive:0x9c4200,emissiveIntensity:1}));m.position.set(p.x,p.feetY+1.1,p.z);m.userData.overseer=i;root.add(m);return m;});
 const bands=BAND_HEIGHTS.map(h=>{const m=new T.Mesh(new T.RingGeometry(3.2,36,64),new T.MeshBasicMaterial({color:0xffc16c,transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=h;m.visible=false;root.add(m);return m;});
 const visual=attachArenaBossVisual('tether',{parent:root,core});
 const panel=document.createElement('div');panel.className='boss-mechanic';panel.style.cssText='position:fixed;top:124px;right:auto;left:50%;transform:translateX(-50%);width:440px;max-width:calc(100vw - 48px);pointer-events:none;z-index:12;padding:12px;background:#081d2ee8;border:1px solid #66dce8;color:#e0fbff;font:13px sans-serif;white-space:pre-line';document.body.append(panel);
 const title=document.createElement('div'),healthTrack=document.createElement('div'),healthFill=document.createElement('div');
 healthTrack.style.cssText='height:12px;background:#152638;border:1px solid #9cb2bd;margin:8px 0;position:relative';
 healthFill.style.cssText='height:100%;width:100%;background:linear-gradient(90deg,#8fd8ff,#ff5b79);transition:width .12s linear';
 healthTrack.append(healthFill);panel.append(title,healthTrack);
 const hint=document.createElement('div');panel.append(hint);
 const markers=nodes.map(()=>{const el=document.createElement('div');el.style.cssText='position:fixed;pointer-events:none;z-index:13;transform:translate(-50%,-100%);padding:6px 9px;background:#201400e8;border:2px solid #ffc85a;color:#ffe5a0;font:bold 13px sans-serif';el.hidden=true;document.body.append(el);return el;});
 let shieldFeedback=0;
 function sync(playing=true){
  const s=rules.state;root.visible=s.active;panel.hidden=!playing||!s.active;
  visual.sync({exposed:s.phase==='exposed',aim:s.attack==='warning'||s.attack==='live'});
  cage.visible=s.phase!=='exposed';nodes.forEach((m,i)=>{m.visible=s.stabilizers[i]>0;});
  bands.forEach((m,i)=>{m.visible=s.phase==='shield'&&s.attack!=='rest'&&s.bands.includes(i);m.material.color.setHex(s.attack==='live'?0xff4568:0xffc16c);});
  title.textContent=TETHER_NAME+' · 阶段 '+s.tier+' / '+(s.tier===2?'双段脉冲':'单段脉冲')+' · '+Math.ceil(s.hp)+' / '+TETHER_MAX_HP;
  healthFill.style.width=(Math.max(0,s.hp)/TETHER_MAX_HP*100)+'%';
  hint.textContent=tetherHint(s)+'\n'+(shieldFeedback>0?'护盾抵挡：射击无效！转火金色稳定器。 ':'')+(s.phase==='exposed'?'核心在电缆上方，四米环与九米环视野最好':'稳定器分别在 '+TETHER_STABILIZERS.map((p,i)=>GRAVITY_BANDS[i].name.split(' / ')[0]+(s.stabilizers[i]>0?'':'✓')).join(' · '));
  const mark=haloMarkText(haloTarget);if(mark)hint.textContent+=' · '+mark;
  panel.style.borderColor=s.phase==='exposed'?'#71ffff':'#ffc85a';panel.dataset.exposed=String(s.phase==='exposed');
 }
 function setStage(index){if(stage===index)return;breaker.reset();delete haloTarget.haloMark;stage=index;rules.reset(index===3);if(index===3)battle.start(TETHER_NAME);sync();}
 const boss=createBossAdapter(rules,'tether',{name:TETHER_NAME,maxHp:TETHER_MAX_HP}),breaker={interrupt:boss.interruptCharge,reset:boss.resetInterrupt};
 function interruptCharge(){const ok=breaker.interrupt();if(ok)sync(true);return ok;}
 function clear(){breaker.reset();delete haloTarget.haloMark;battle.clear();stage=-1;shieldFeedback=0;rules.reset();markers.forEach(el=>el.hidden=true);sync(false);}
 function update(dt,player,feetY,playing,grounded=true){
  if(!rules.blocking||!playing){sync(playing);return 0;}
  visual.tick(dt);stepHaloMark(haloTarget,dt);battle.tick(dt);shieldFeedback=Math.max(0,shieldFeedback-dt);
  const damage=rules.tick(dt,{feetY,grounded});if(rules.state.phase!=='exposed')delete haloTarget.haloMark;sync(playing);return damage;
 }
 function hit(object,amount,{halo=false}={}){const part=object.userData.overseer,shielded=rules.blocking&&rules.state.phase==='shield'&&part==='core';if(shielded)shieldFeedback=1.5;const was=rules.blocking,previous=rules.state.phase,dealt=rules.damage(part,amount*(part==='core'?haloDamageMultiplier(haloTarget):1));const marked=halo&&dealt>0&&part==='core'&&registerHaloWeakHit(haloTarget);battle.hit(dealt,part==='core',previous!=='exposed'&&rules.state.phase==='exposed');sync();return {shielded,marked,damage:dealt,killed:was&&!rules.blocking,weak:dealt>0&&part==='core',message:'核心护盾！先击破三段金色稳定器，再攻击青色核心',killMessage:'TETHER 锚定核心已沉寂 // 重力场恢复稳定，返回升降平台'};}
 function updateMarkers(camera,playing){
  camera.updateMatrixWorld();
  markers.forEach((el,i)=>{
   const p=nodes[i].position.clone().add(new T.Vector3(0,1.8,0));const view=p.clone().applyMatrix4(camera.matrixWorldInverse);p.project(camera);
   el.hidden=!playing||!rules.blocking||rules.state.stabilizers[i]<=0||view.z>=0||Math.abs(p.x)>.95||Math.abs(p.y)>.9||p.z>1;
   if(!el.hidden){el.style.left=((p.x+1)*innerWidth/2)+'px';el.style.top=((1-p.y)*innerHeight/2)+'px';el.textContent='▼ 稳定器 '+(i+1)+' / '+GRAVITY_BANDS[i].name.split(' / ')[0]+' · '+Math.ceil(rules.state.stabilizers[i])+' HP';}
  });
 }
 clear();return {interruptCharge,boss,setStage,clear,update,hit,updateMarkers,battle,origin:new T.Vector3(TETHER_POSITION.x,0,TETHER_POSITION.z),get blocking(){return rules.blocking;},get state(){return rules.state;},get targets(){return rules.blocking?[core,...(cage.visible?[cage]:[]),...nodes.filter(n=>n.visible)]:[];}};
}
