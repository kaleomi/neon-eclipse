import {attachArenaBossVisual} from './characters/arena-boss-runtime.js';
import {refineDispatchMaterials,STATION_CONTROL_IDLE} from './station-look.js';
import {createBossAdapter} from './boss-adapter.js';
import * as T from './node_modules/three/build/three.module.js';
import {createBossBattleRecord} from './boss-battle-record.js';
import {registerHaloWeakHit,stepHaloMark,haloDamageMultiplier,haloMarkText} from './weapons/halo-rules.js';
import {SWITCHYARD,SWITCHYARD_CORE,SWITCHYARD_LANES,SWITCHYARD_SWITCHES,SWITCHYARD_SOLIDS,createSwitchyard,switchyardReady,trainPoint} from './switchyard-rules.js';
import {createSwitchyardUI} from './switchyard-ui.js';

// Adapts the new framework to the existing boss handle. Other bosses are not migrated in this batch.
export function createSwitchyardWorld(scene,obstacles,{onEvent=()=>{}}={}){
 const battle=createBossBattleRecord(),haloTarget={},ui=createSwitchyardUI();
 const rules=createSwitchyard({onEvent:event=>{if(event==='window.opened')battle.hit(0,true,true);onEvent(event);}});
 const root=new T.Group();root.name='SWITCHYARD';scene.add(root);
 const owned=[];const materials=[];
 const mat=(color,basic=false)=>{const m=basic?new T.MeshBasicMaterial({color}):new T.MeshStandardMaterial({color,metalness:.5,roughness:.5});materials.push(m);return m;};
 const steel=mat(0x183541),bronze=mat(0x997143),railMat=mat(0x587887),cyan=mat(0x75fff1,true),amber=mat(0xffc36d,true),red=mat(0xff5366,true);
 refineDispatchMaterials({steel,bronze,railMat});
 function box(w,h,d,x,y,z,m=steel,parent=root){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 SWITCHYARD_SOLIDS.forEach((o,i)=>{const mesh=box(o.w,o.h,o.d,o.x,o.h/2,o.z,i===0?steel:bronze);const solid={...o,bottom:0,top:o.h,mesh,switchyard:true};obstacles.push(solid);owned.push(solid);});
 const artFrameStart=root.children.length;
 // Industrial control tower: dark frame around the low, melee-reachable core.
 for(const dx of [-.85,.85])for(const dz of [-.85,.85])box(.14,2.1,.14,22+dx,2,-25+dz,steel);
 box(2.1,.16,2.1,22,3.1,-25,steel);box(1.8,.06,1.8,22,3.21,-25,amber);
 const artHull=root.children.slice(artFrameStart);
 const coreMat=mat(0x75fff1,true);coreMat.transparent=true;
 const core=new T.Mesh(new T.IcosahedronGeometry(.95,1),coreMat);core.position.set(SWITCHYARD_CORE.x,SWITCHYARD_CORE.y,SWITCHYARD_CORE.z);core.userData.overseer='core';root.add(core);
 const shieldMat=mat(0xffc36d,true);shieldMat.wireframe=true;
 const cage=new T.Mesh(new T.IcosahedronGeometry(1.35,1),shieldMat);cage.position.copy(core.position);cage.userData.overseer='core';root.add(cage);
 const ring=new T.Mesh(new T.TorusGeometry(1.3,.07,6,32),cyan);ring.rotation.x=Math.PI/2;ring.position.set(22,.12,-25);root.add(ring);
 const visual=attachArenaBossVisual('switchyard',{parent:root,core,hide:artHull,materials});
 // Permanent numbered controls; all geometry stays inside its matching solid (apart from non-solid lamps).
 const lamps=SWITCHYARD_SWITCHES.map((p,i)=>{
  const group=new T.Group();group.position.set(p.x,1.25,p.z);root.add(group);
  const m=mat(STATION_CONTROL_IDLE,true);
  // Numerals face west, toward the dispatch arena. Seven segment digits, no font dependency.
  const segments=[[0,.22,.32,.045],[.16,.11,.045,.22],[.16,-.11,.045,.22],[0,-.22,.32,.045],[-.16,-.11,.045,.22],[-.16,.11,.045,.22],[0,0,.32,.045]];
  const digits=[[1,2],[0,1,6,4,3],[0,1,6,2,3]];
  for(const n of digits[i]){const [x,y,w,h]=segments[n];box(.025,h,w,-.38,y,x,m,group);}
  const beacon=new T.Mesh(new T.SphereGeometry(.12,8,6),m);beacon.position.y=.5;group.add(beacon);return m;
 });
 for(const z of SWITCHYARD_LANES){
  for(const dz of [-.5,.5])box(19,.05,.065,19,.045,z+dz,railMat);
  for(let x=10;x<=28;x+=1.5)box(.12,.035,1.25,x,.025,z,steel);
 }
 function line(a,b,color,width=.15){const d=Math.hypot(b.x-a.x,b.z-a.z);const mesh=box(d,.025,width,(a.x+b.x)/2,.07,(a.z+b.z)/2,color);mesh.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);return mesh;}
 const routes=SWITCHYARD_LANES.map((z,i)=>{const g=new T.Group();root.add(g);const m=mat(0xffc36d,true);m.transparent=true;m.opacity=.6;
  for(const [a,b] of [[{x:10,z},{x:28.4,z}],[{x:18,z},SWITCHYARD_CORE]]){const mesh=line(a,b,m,.18);g.add(mesh);}
  g.visible=false;return {group:g,material:m};
 });
 const cart=new T.Group();cart.name='switchyard-maintenance-train';root.add(cart);
 box(1.25,.9,1,0,.65,0,bronze,cart);box(.9,.12,.8,0,1.16,0,amber,cart);
 for(const x of [-.4,.4])for(const z of [-.5,.5])box(.22,.25,.16,x,.2,z,steel,cart);
 const blastRing=new T.Mesh(new T.RingGeometry(SWITCHYARD.blastRadius-.12,SWITCHYARD.blastRadius,40),amber);blastRing.rotation.x=-Math.PI/2;root.add(blastRing);
 const blastDot=new T.Mesh(new T.CircleGeometry(.16,12),red);blastDot.rotation.x=-Math.PI/2;root.add(blastDot);
 const ray=new T.Raycaster(),direction=new T.Vector3(),origin=new T.Vector3();
 let stage=-1,feedback=0,interaction={},displayTime=0;
 function sync(playing){
  const s=rules.state,r=rules.rail;core.visible=s.active;cage.visible=s.active&&s.phase==='shield';ring.visible=s.active;
  coreMat.opacity=s.phase==='defeated'?s.timer/SWITCHYARD.defeat:1;
  ring.scale.setScalar(s.phase==='defeated'?1+(1-s.timer/SWITCHYARD.defeat)*1.5:1);
  core.rotation.y=displayTime*.5;cage.rotation.y=-displayTime*.2;
  lamps.forEach((m,i)=>m.color.setHex(rules.alive&&s.phase==='shield'&&r.lane===i?(r.armed?0x75fff1:0xffc36d):STATION_CONTROL_IDLE));
  routes.forEach((rte,i)=>{rte.group.visible=s.active&&s.phase==='shield'&&i===r.lane;rte.material.color.setHex(r.mode==='moving'?0xff5366:r.armed?0x75fff1:0xffc36d);});
  cart.visible=rules.alive&&s.phase==='shield'&&r.mode==='moving';
  if(cart.visible){const t=1-r.timer/SWITCHYARD.travel,p=trainPoint(r.lane,t,r.armed),next=trainPoint(r.lane,Math.min(1,t+.01),r.armed);cart.position.set(p.x,0,p.z);cart.rotation.y=-Math.atan2(next.z-p.z,next.x-p.x);}
  blastRing.visible=blastDot.visible=rules.alive&&rules.blast.mode==='warning';
  if(rules.blast.target){const p=rules.blast.target;blastRing.position.set(p.x,.075,p.z);blastDot.position.set(p.x,.08,p.z);}
  visual.sync({exposed:s.phase==='exposed',aim:rules.blast.mode!=='rest'});ui.update(rules,playing,interaction,feedback,haloMarkText(haloTarget));root.updateMatrixWorld(true);
 }
 function setStage(index){
  if(stage===index)return;breaker.reset();stage=index;rules.reset();delete haloTarget.haloMark;interaction={};feedback=0;displayTime=0;sync(false);
 }
 function prepareMission(mission,guardsClear){
  if(stage===3&&switchyardReady(mission,guardsClear)&&rules.state.phase==='inactive'){
   battle.start(SWITCHYARD.name,{damageLabel:'Boss 列车 / 地面放电'});rules.activate();sync(true);return true;
  }return false;
 }
 const boss=createBossAdapter(rules,'blast',{name:SWITCHYARD.name,maxHp:SWITCHYARD.hp}),breaker={interrupt:boss.interruptCharge,reset:boss.resetInterrupt};
 function interruptCharge(){const ok=breaker.interrupt();if(ok)sync(true);return ok;}
 function clear(){breaker.reset();stage=-1;rules.reset();battle.clear();delete haloTarget.haloMark;interaction={};feedback=0;displayTime=0;ui.hide();sync(false);}
 function interact(dt,{camera,held,busy=false,feetY=0,grounded=true}={}){
  interaction={};
  if(!rules.alive||rules.state.phase!=='shield'){rules.cancelInteraction();return;}
  camera.getWorldDirection(direction);let nearest=Infinity;
  SWITCHYARD_SWITCHES.forEach((p,id)=>{
   const delta=new T.Vector3(p.x,p.y,p.z).sub(camera.position),distance=delta.length();
   if(distance>=nearest)return;nearest=distance;
   ray.set(camera.position,delta.clone().normalize());ray.far=Math.max(0,distance-.15);
   const visible=ray.intersectObjects(obstacles.filter(o=>o!==owned[id+1]).map(o=>o.mesh),false).length===0;
   interaction={id,near:distance<=SWITCHYARD.range,allowed:distance<=SWITCHYARD.range&&!busy&&grounded&&Math.abs(feetY)<.35&&delta.normalize().dot(direction)>.7&&visible};
  });
  rules.interact(dt,{...interaction,held});
 }
 function update(dt,player,feetY,playing){
  if(!playing){rules.cancelInteraction();interaction={};sync(false);return 0;}
  if(!rules.blocking){sync(playing);return 0;}
  visual.tick(dt);stepHaloMark(haloTarget,dt);battle.tick(dt);displayTime+=Math.max(0,dt);feedback=Math.max(0,feedback-dt);
  const damage=rules.tick(dt,{player,feetY,blastVisible:(_,p)=>{
   origin.set(SWITCHYARD_CORE.x,SWITCHYARD_CORE.y,SWITCHYARD_CORE.z);direction.set(p.x,feetY+1,p.z).sub(origin);ray.set(origin,direction.clone().normalize());ray.far=direction.length();return !ray.intersectObjects(obstacles.map(o=>o.mesh),false).length;
  }});
  if(damage)rules.cancelInteraction();if(rules.state.phase!=='exposed')delete haloTarget.haloMark;sync(playing);return damage;
 }
 function hit(object,amount,{halo=false}={}){
  if(object!==core&&object!==cage)return {damage:0,killed:false};
  const shielded=rules.alive&&rules.state.phase==='shield';if(shielded)feedback=1.5;
  const result=rules.hit(amount*haloDamageMultiplier(haloTarget)),marked=halo&&result.damage>0&&!result.killed&&registerHaloWeakHit(haloTarget);
  battle.hit(result.damage,true);sync(true);
  return {...result,marked,shielded,weak:result.damage>0,message:'护盾抵挡！操作亮起编号的道岔，让维护列车破盾，再攻击青色核心',killMessage:'SWITCHYARD 调度核心已停机 // 末班列车通道即将解锁'};
 }
 function updateMarkers(camera,playing){
  camera.updateMatrixWorld();ui.markers.forEach((el,i)=>{
   const sw=SWITCHYARD_SWITCHES[i],p=new T.Vector3(sw.x,2,sw.z),view=p.clone().applyMatrix4(camera.matrixWorldInverse);p.project(camera);
   el.hidden=!playing||!rules.alive||rules.state.phase!=='shield'||rules.rail.armed||rules.rail.mode!=='warning'||view.z>=0||Math.abs(p.x)>.93||Math.abs(p.y)>.85||p.z>1;
   if(!el.hidden){el.style.left=((p.x+1)*innerWidth/2)+'px';el.style.top=((1-p.y)*innerHeight/2)+'px';el.textContent=`${i+1} 号道岔${i===rules.rail.lane?' · 当前来车':''}`;el.style.borderColor=i===rules.rail.lane?'#ffcb7c':'#617b85';}
  });
 }
 function dispose(){clear();visual.dispose();scene.remove(root);for(const o of owned){const i=obstacles.indexOf(o);if(i>=0)obstacles.splice(i,1);}root.traverse(m=>m.geometry?.dispose());materials.forEach(m=>m.dispose());ui.panel.remove();ui.markers.forEach(m=>m.remove());}
 clear();return {interruptCharge,boss,setStage,prepareMission,canAdvance:m=>m.index!==3||!m.defending||(rules.state.phase==='defeated'&&!rules.blocking),clear,interact,update,hit,updateMarkers,dispose,battle,
  origin:new T.Vector3(SWITCHYARD_CORE.x,0,SWITCHYARD_CORE.z),
  get state(){return rules.state;},get rail(){return {...rules.rail};},get blocking(){return rules.blocking;},
  get targets(){return rules.alive?[core,...(cage.visible?[cage]:[])]:[];},
  get objective(){const p=rules.state.phase==='shield'&&!rules.rail.armed?SWITCHYARD_SWITCHES[rules.rail.lane]:SWITCHYARD_CORE;return new T.Vector3(p.x,p.y,p.z);},
  get objectiveLabel(){return rules.state.phase==='shield'&&rules.rail.armed?'侧面接近核心 · 等待列车破盾':rules.state.phase==='shield'?`${rules.rail.lane+1} 号道岔 · 列车破盾`:'SWITCHYARD 青色核心';}};
}
