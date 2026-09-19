import {createBossAdapter} from './boss-adapter.js';
import * as T from './node_modules/three/build/three.module.js';
import {createBossBattleRecord} from './boss-battle-record.js';
import {registerHaloWeakHit,stepHaloMark,haloDamageMultiplier,haloMarkText} from './weapons/halo-rules.js';
import {ELEVATOR,ELEVATOR_LEVELS,ELEVATOR_LIFT,ELEVATOR_CORE,ELEVATOR_PAD,ELEVATOR_CALLS,ELEVATOR_SOLIDS} from './elevator-data.js';
import {createElevatorBoss,elevatorReady} from './elevator-rules.js';
import {createElevatorLift} from './elevator-lift.js';
import {createElevatorUI} from './elevator-ui.js';
export function createElevatorWorld(scene,obstacles,{onEvent=()=>{},getPlayerFeet=null}={}){
 const root=new T.Group();root.name='ELEVATOR_ARENA';scene.add(root);
 const battle=createBossBattleRecord(),haloTarget={},ui=createElevatorUI(),materials=[],owned=[];
 const mat=(color,basic=false)=>{const m=basic?new T.MeshBasicMaterial({color}):new T.MeshStandardMaterial({color,metalness:.55,roughness:.5});materials.push(m);return m;};
 const dark=mat(0x20283f),steel=mat(0x61728a),gold=mat(0xffc575,true),cyan=mat(0x82fff1,true),purple=mat(0xc2a1ff,true);
 function box(w,h,d,x,y,z,material=dark,parent=root){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m;}
 function solid(def,material){const mesh=box(def.w,def.top-def.bottom,def.d,def.x,(def.bottom+def.top)/2,def.z,material);const o={...def,h:def.top,mesh,elevator:true};obstacles.push(o);owned.push(o);return o;}
 ELEVATOR_SOLIDS.forEach((o,i)=>solid(o,i<4?steel:dark));
 const volume=solid({...ELEVATOR_LIFT,bottom:-.25,top:0,dynamic:true},steel),lift=createElevatorLift(volume);
 const liftEdge=box(4.8,.04,4.8,0,.145,0,cyan,volume.mesh);liftEdge.material=mat(0x82fff1,true);liftEdge.material.wireframe=true;
 const pads=ELEVATOR_LEVELS.map(y=>{const m=box(ELEVATOR_PAD.w,.035,ELEVATOR_PAD.d,ELEVATOR_PAD.x,y+.025,ELEVATOR_PAD.z,mat(0x485367,true));
  // Jump edge and landing are visibly separated by 1.4 metres.
  box(5,.045,.08,23.5,y+.04,2.07,gold);return m;});
 for(const x of [20.85,26.15]){box(.16,9,.16,x,4.5,-.65,dark);for(const y of [0,3,6])box(.22,.14,2.85,x,y+2.2,.8,purple);}
 const callLamps=ELEVATOR_CALLS.map(p=>{const lamp=new T.Mesh(new T.SphereGeometry(.13,8,6),cyan);lamp.position.set(p.x,p.feetY+1.05,p.z);root.add(lamp);return lamp;});
 const body=new T.Group();body.name='ELEVATOR_GUARD';root.add(body);
 const torso=box(1.6,1.35,.65,0,1.25,0,dark,body);torso.userData.overseer='armor';
 const head=box(.85,.38,.55,0,2.05,0,steel,body);head.userData.overseer='armor';
 for(const x of [-1,1]){box(.3,1.3,.4,x,1.2,0,steel,body);box(.25,.5,.5,x*.5,.5,0,dark,body);box(.22,.12,.06,x*.65,1.6,.36,purple,body);}
 const coreMaterial=mat(0x82fff1,true);coreMaterial.transparent=true;
 const core=new T.Mesh(new T.IcosahedronGeometry(.46,1),coreMaterial);core.position.set(0,ELEVATOR_CORE.height,.4);core.userData.overseer='core';body.add(core);
 const shieldMaterial=mat(0xc2a1ff,true);shieldMaterial.wireframe=true;
 const cage=new T.Mesh(new T.IcosahedronGeometry(.67,1),shieldMaterial);cage.position.copy(core.position);cage.userData.overseer='core';body.add(cage);
 const beamMesh=box(6.5,.035,1.2,23.75,.06,0,purple),beamLine=box(6.5,.045,.065,23.75,.07,0,gold);beamMesh.material=mat(0xc2a1ff,true);beamMesh.material.transparent=true;beamMesh.material.opacity=.22;
 const rules=createElevatorBoss({onEvent:e=>{if(e==='window.opened')battle.hit(0,true,true);onEvent(e);}});
 const ray=new T.Raycaster();let stage=-1,feet=0,feedback=0,interaction={},callHold=0,callId=-1,displayTime=0;
 function sync(playing){
  const s=rules.state,a=rules.arena;body.visible=s.active;body.position.set(ELEVATOR_CORE.x,rules.floor,ELEVATOR_CORE.z);
  cage.visible=s.phase==='shield';coreMaterial.opacity=s.phase==='defeated'?s.timer/ELEVATOR.defeat:1;core.rotation.y=displayTime;
  pads.forEach((p,i)=>p.material.color.setHex(s.active&&i===a.index?0x82fff1:i<a.index?0x8ea18c:0x485367));
  beamMesh.visible=beamLine.visible=s.active&&rules.beam.mode==='warning';
  if(rules.beam.targetZ!==null){beamMesh.position.set(23.75,rules.floor+.045,rules.beam.targetZ);beamLine.position.set(23.75,rules.floor+.06,rules.beam.targetZ);}
  volume.mesh.position.y=(volume.top+volume.bottom)/2;root.updateMatrixWorld(true);
  ui.update(rules,lift,playing,feedback,interaction,haloMarkText(haloTarget));
 }
 const boss=createBossAdapter(rules,'beam',{name:ELEVATOR.name,maxHp:ELEVATOR.hp}),breaker={interrupt:boss.interruptCharge,reset:boss.resetInterrupt};
 function interruptCharge(){const ok=breaker.interrupt();if(ok)sync(true);return ok;}
 function clear(){breaker.reset();rules.reset();battle.clear();lift.reset();delete haloTarget.haloMark;stage=-1;callHold=0;callId=-1;interaction={};feedback=0;displayTime=0;sync(false);}
 function setStage(index){if(stage===index)return;breaker.reset();stage=index;rules.reset();lift.reset(index>=4?6:0);delete haloTarget.haloMark;callHold=0;callId=-1;interaction={};feedback=0;sync(false);}
 function prepareMission(m,guardsClear){if(stage===3&&elevatorReady(m,guardsClear)&&rules.state.phase==='inactive'){battle.start(ELEVATOR.name,{damageLabel:'Boss 层面扫掠'});rules.activate();sync(true);return true;}return false;}
 function request(height){if(!rules.alive||!lift.request(height))return false;rules.travel();delete haloTarget.haloMark;return true;}
 function beforeMotion(dt,player,motion,enemies=[]){
  if(!rules.alive)return;
  if(!lift.moving&&Math.abs(lift.y-rules.floor)>.01&&lift.aboard(player,motion))request(rules.floor);
  const moving=lift.moving;lift.tick(dt,player,motion,enemies);
  if(moving&&!lift.moving)rules.arrive(lift.y);
  volume.mesh.position.y=(volume.top+volume.bottom)/2;volume.mesh.updateMatrixWorld(true);
 }
 function interact(dt,{camera,held=false,busy=false,feetY=0,grounded=true}={}){
  interaction={};if(!rules.alive){callHold=0;return;}
  const forward=new T.Vector3();camera.getWorldDirection(forward);let nearest=Infinity;
  ELEVATOR_CALLS.forEach((p,id)=>{
   const target=new T.Vector3(p.x,p.feetY+1.05,p.z),delta=target.clone().sub(camera.position),distance=delta.length();if(distance>=nearest)return;nearest=distance;
   ray.set(camera.position,delta.clone().normalize());ray.far=Math.max(0,distance-.15);
   // The call button is above its .8m cabinet. Geometry on other floors still blocks the ray.
   const visible=!ray.intersectObjects(obstacles.map(o=>o.mesh),false).length;
   interaction={id,floor:p.feetY,here:!lift.moving&&Math.abs(lift.y-p.feetY)<.02,near:distance<=2.2,allowed:distance<=2.2&&!busy&&grounded&&!lift.moving&&Math.abs(lift.y-p.feetY)>.02&&Math.abs(feetY-p.feetY)<.25&&delta.normalize().dot(forward)>.7&&visible,hold:0};
  });
  if(!interaction.allowed||!held||callId!==interaction.id||!Number.isFinite(dt)||dt<=0)callHold=0;
  callId=interaction.id;
  if(interaction.allowed&&held&&Number.isFinite(dt)&&dt>0){callHold+=dt;if(callHold+1e-8>=.6){request(interaction.floor);callHold=0;}}
  interaction.hold=callHold;
 }
 function update(dt,player,feetY,playing,grounded=true){
  feet=feetY;
  if(!playing){callHold=0;interaction={};rules.tick(0,{playing:false});sync(false);return 0;}
  if(!rules.blocking){sync(true);return 0;}
  stepHaloMark(haloTarget,dt);battle.tick(dt);displayTime+=Math.max(0,dt);feedback=Math.max(0,feedback-dt);
  const damage=rules.tick(dt,{player,feetY,grounded,visible:p=>{
   const origin=new T.Vector3(ELEVATOR_CORE.x,rules.floor+1.7,ELEVATOR_CORE.z+.8),delta=new T.Vector3(p.x,feetY+1,p.z).sub(origin);ray.set(origin,delta.clone().normalize());ray.far=delta.length();return !ray.intersectObjects(obstacles.map(o=>o.mesh),false).length;
  }});
  if(damage)callHold=0;if(rules.state.phase!=='exposed')delete haloTarget.haloMark;sync(true);return damage;
 }
 function hit(object,amount,{halo=false}={}){
  const isCore=object===core||object===cage;
  const result=isCore?rules.hit(amount*haloDamageMultiplier(haloTarget),getPlayerFeet?getPlayerFeet():feet):{damage:0,killed:false,unitBroken:false};
  const shielded=rules.alive&&result.damage===0;if(shielded)feedback=1.5;
  const marked=halo&&result.damage>0&&!result.unitBroken&&registerHaloWeakHit(haloTarget);
  if(result.unitBroken)delete haloTarget.haloMark;battle.hit(result.damage,true);sync(true);
  return {...result,marked,shielded,weak:result.damage>0,message:'动力锁 / 楼层保护！先到目标层踏上过载板，暴露后攻击同层青色胸核',killMessage:'ELEVATOR 三组动力锁已击破 // 守卫停机，返回大厅撤离'};
 }
 function updateMarkers(camera,playing){
  camera.updateMatrixWorld();ui.markers.forEach((el,i)=>{
   const call=ELEVATOR_CALLS[i],p=new T.Vector3(call.x,call.feetY+1.5,call.z),view=p.clone().applyMatrix4(camera.matrixWorldInverse);p.project(camera);
   el.hidden=!playing||!rules.alive||lift.moving||Math.abs(feet-call.feetY)>.5||Math.abs(lift.y-call.feetY)<.02||view.z>=0||Math.abs(p.x)>.93||Math.abs(p.y)>.85||p.z>1;
   if(!el.hidden){el.style.left=((p.x+1)*innerWidth/2)+'px';el.style.top=((1-p.y)*innerHeight/2)+'px';el.textContent=`E · 呼梯至 ${call.feetY}m`;}
  });
 }
 function dispose(){clear();scene.remove(root);for(const o of owned){const i=obstacles.indexOf(o);if(i>=0)obstacles.splice(i,1);}root.traverse(m=>m.geometry?.dispose());materials.forEach(m=>m.dispose());ui.panel.remove();ui.markers.forEach(m=>m.remove());}
 clear();return {interruptCharge,boss,clear,setStage,prepareMission,beforeMotion,interact,update,hit,updateMarkers,dispose,battle,
  canAdvance:m=>m.index!==3||!m.defending||(rules.state.phase==='defeated'&&!rules.blocking),
  get state(){return rules.state;},get arena(){return {...rules.arena};},get lift(){return {y:lift.y,target:lift.target,moving:lift.moving,blocked:lift.blocked};},
  get blocking(){return rules.blocking;},get origin(){return new T.Vector3(ELEVATOR_CORE.x,rules.floor,ELEVATOR_CORE.z);},
  get targets(){return rules.alive?[core,torso,head,...(cage.visible?[cage]:[])]:[];},
  get objective(){return rules.state.phase==='exposed'?core.getWorldPosition(new T.Vector3()):rules.arena.mode==='dock'?new T.Vector3(ELEVATOR_PAD.x,rules.floor+.15,ELEVATOR_PAD.z):new T.Vector3(ELEVATOR_LIFT.x,lift.y+.2,ELEVATOR_LIFT.z);},
  get objectiveLabel(){return rules.state.phase==='exposed'?`${rules.floor}m 青色胸核 · 窗口内攻击`:rules.arena.mode==='dock'?`${rules.floor}m 检修台 · 跳跃过载板`:`战斗升降台 → ${rules.floor}m`;}};
}
