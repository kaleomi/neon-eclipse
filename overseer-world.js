import {createBossAdapter} from './boss-adapter.js';
import {registerHaloWeakHit,stepHaloMark,haloDamageMultiplier,haloMarkText} from './weapons/halo-rules.js';
import {createBossBattleRecord} from './boss-battle-record.js';
import * as T from './node_modules/three/build/three.module.js';
import {OVERSEER_MAX_HP,createOverseer,overseerAngles,OVERSEER_POSITION,OVERSEER_NODES} from './overseer-rules.js';
export function createOverseerWorld(scene,obstacles){
 const battle=createBossBattleRecord(),haloTarget={};
 const rules=createOverseer(),root=new T.Group();scene.add(root);let stage=-1;
 const metal=new T.MeshStandardMaterial({color:0x34465b,metalness:.7,roughness:.35});
 const shield=new T.MeshBasicMaterial({color:0xffbd64,wireframe:true});
 const coreMat=new T.MeshBasicMaterial({color:0x71ffff});
 const core=new T.Mesh(new T.IcosahedronGeometry(1.05,1),coreMat);core.position.set(0,1.8,-21);core.userData.overseer='core';root.add(core);
 const cage=new T.Mesh(new T.IcosahedronGeometry(1.4,1),shield);cage.position.copy(core.position);cage.userData.overseer='core';root.add(cage);
 const nodes=OVERSEER_NODES.map((p,i)=>{const m=new T.Mesh(new T.CylinderGeometry(.65,.9,2.4,8),new T.MeshStandardMaterial({color:0xffbd64,emissive:0x9c4200,emissiveIntensity:1}));m.position.set(p.x,1.2,p.z);m.userData.overseer=i;root.add(m);return m;});
 for(const x of [-1.8,1.8]){const wing=new T.Mesh(new T.BoxGeometry(.5,1.3,2.6),metal);wing.position.set(x,1.8,-21);root.add(wing);}
 const lane=new T.Mesh(new T.PlaneGeometry(2.8,34),new T.MeshBasicMaterial({color:0xffc16c,transparent:true,opacity:.45,side:T.DoubleSide,depthWrite:false}));lane.rotation.x=-Math.PI/2;root.add(lane);
 const lanes=[lane,...Array.from({length:3},()=>{const m=lane.clone();m.material=lane.material.clone();root.add(m);return m;})];
 const panel=document.createElement('div');panel.className='boss-mechanic';panel.style.cssText='position:fixed;top:124px;right:auto;left:50%;transform:translateX(-50%);width:440px;max-width:calc(100vw - 48px);pointer-events:none;z-index:12;padding:12px;background:#081d2ee8;border:1px solid #66dce8;color:#e0fbff;font:13px sans-serif';document.body.append(panel);
 const title=document.createElement('div'),healthTrack=document.createElement('div'),healthFill=document.createElement('div');
 healthTrack.style.cssText='height:12px;background:#152638;border:1px solid #9cb2bd;margin:8px 0;position:relative';
 healthFill.style.cssText='height:100%;width:100%;background:linear-gradient(90deg,#ffa54f,#ff5b79);transition:width .12s linear';
 healthTrack.append(healthFill);panel.append(title,healthTrack);
 const hint=document.createElement('div');panel.append(hint);
 const markers=nodes.map((node,i)=>{const el=document.createElement('div');el.style.cssText='position:fixed;pointer-events:none;z-index:13;transform:translate(-50%,-100%);padding:6px 9px;background:#201400e8;border:2px solid #ffc85a;color:#ffe5a0;font:bold 13px sans-serif';el.hidden=true;document.body.append(el);return el;});
 let shieldFeedback=0;
 const ray=new T.Raycaster();
 function sync(playing=true){
  const s=rules.state;root.visible=s.active;panel.hidden=!playing||!s.active;
  cage.visible=s.phase!=='exposed';nodes.forEach((m,i)=>{m.visible=s.nodes[i]>0;});
  const angles=overseerAngles(s);
  lanes.forEach((m,i)=>{const angle=angles[i]??0;m.visible=i<angles.length&&s.attack!=='rest'&&s.phase==='shield';m.position.set(Math.sin(angle)*17,.1,-21+Math.cos(angle)*17);m.rotation.z=angle;m.material.color.setHex(s.attack==='live'?0xff4568:0xffc16c);});
  title.textContent='枢纽监察者 · 阶段 '+s.tier+' / '+(s.tier===2?'交叉电弧':'定向电弧')+' · '+Math.ceil(s.hp)+' / '+OVERSEER_MAX_HP;
  healthFill.style.width=(Math.max(0,s.hp)/OVERSEER_MAX_HP*100)+'%';
  hint.textContent=(s.phase==='exposed'?'核心暴露 '+s.timer.toFixed(1)+'s · 立即攻击青色核心':'核心无敌！先打金色供电节点（剩余 '+s.nodes.filter(h=>h>0).length+'/2）')+'\n'+(shieldFeedback>0?'护盾抵挡：射击无效！请转火金色节点。 ': '')+(s.attack==='warning'?(s.tier===2?'交叉电弧预警！移向黄带之间的空隙或跳跃':'电弧预警！横移出黄带或跳跃'):s.attack==='live'?'电弧释放！离开红带':s.tier===2?'半血过载：四向交叉电弧 · 暴露时停止攻击':'击破两个节点 → 核心暴露 8 秒');
  const mark=haloMarkText(haloTarget);if(mark)hint.textContent+=' · '+mark;
  panel.style.whiteSpace='pre-line';panel.style.borderColor=s.phase==='exposed'?'#71ffff':'#ffc85a';
  panel.dataset.exposed=String(s.phase==='exposed');
 }
 function setStage(index){if(stage===index)return;breaker.reset();delete haloTarget.haloMark;stage=index;rules.reset(index===3);if(index===3)battle.start();sync();}
 const boss=createBossAdapter(rules,'overseer',{name:'OVERSEER 监察者',maxHp:OVERSEER_MAX_HP}),breaker={interrupt:boss.interruptCharge,reset:boss.resetInterrupt};
 function interruptCharge(){const ok=breaker.interrupt();if(ok)sync(true);return ok;}
 function clear(){breaker.reset();delete haloTarget.haloMark;battle.clear();stage=-1;shieldFeedback=0;rules.reset();markers.forEach(el=>el.hidden=true);sync(false);}
 function update(dt,player,feetY,playing){
  if(!rules.blocking||!playing){sync(playing);return 0;}
  stepHaloMark(haloTarget,dt);battle.tick(dt);
  const origin=new T.Vector3(OVERSEER_POSITION.x,.45,OVERSEER_POSITION.z),target=new T.Vector3(player.x,.45,player.z),delta=target.sub(origin);ray.set(origin,delta.clone().normalize());ray.far=delta.length();
  const blocked=ray.intersectObjects(obstacles.map(o=>o.mesh),false).length>0;
  shieldFeedback=Math.max(0,shieldFeedback-dt);
  const damage=rules.tick(playing?dt:0,{x:player.x,z:player.z,feetY,blocked});if(rules.state.phase!=='exposed')delete haloTarget.haloMark;sync(playing);return damage;
 }
 function hit(object,amount,{halo=false}={}){const shielded=rules.blocking&&rules.state.phase==='shield'&&object.userData.overseer==='core';if(shielded)shieldFeedback=1.5;const was=rules.blocking,previous=rules.state.phase,dealt=rules.damage(object.userData.overseer,amount*(object.userData.overseer==='core'?haloDamageMultiplier(haloTarget):1));const marked=halo&&dealt>0&&object.userData.overseer==='core'&&registerHaloWeakHit(haloTarget);battle.hit(dealt,object.userData.overseer==='core',previous!=='exposed'&&rules.state.phase==='exposed');sync();return {shielded,marked,damage:dealt,killed:was&&!rules.blocking,weak:dealt>0&&object.userData.overseer==='core'};}
 function updateMarkers(camera,playing){
  camera.updateMatrixWorld();
  markers.forEach((el,i)=>{
   const p=nodes[i].position.clone().add(new T.Vector3(0,2,0));const view=p.clone().applyMatrix4(camera.matrixWorldInverse);p.project(camera);
   el.hidden=!playing||!rules.blocking||rules.state.nodes[i]<=0||view.z>=0||Math.abs(p.x)>.95||Math.abs(p.y)>.9||p.z>1;
   if(!el.hidden){el.style.left=((p.x+1)*innerWidth/2)+'px';el.style.top=((1-p.y)*innerHeight/2)+'px';el.textContent='▼ 射击金色节点 '+(i+1)+' · '+Math.ceil(rules.state.nodes[i])+' HP';}
  });
 }
 clear();return {interruptCharge,boss,setStage,clear,update,hit,updateMarkers,battle,get blocking(){return rules.blocking;},get targets(){return rules.blocking?[core,...(cage.visible?[cage]:[]),...nodes.filter(n=>n.visible)]:[];}};
}
