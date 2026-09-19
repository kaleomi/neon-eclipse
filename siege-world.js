import {createBossAdapter} from './boss-adapter.js';
import * as T from './node_modules/three/build/three.module.js';
import {createBossBattleRecord} from './boss-battle-record.js';
import {registerHaloWeakHit,stepHaloMark,haloDamageMultiplier,haloMarkText} from './weapons/halo-rules.js';
import {siegeSolids} from './siege-data.js';
import {createSiegeBoss,siegeReady} from './siege-rules.js';
import {createSiegeUI} from './siege-ui.js';
import {createSiegeModel} from './siege-models.js';
export function createSiegeWorld(scene,obstacles,config,{onEvent=()=>{},getPlayerFeet=null}={}){
 const root=new T.Group();root.name=config.id.toUpperCase()+'_ARENA';scene.add(root);
 const materials=[],owned=[],bases=[],battle=createBossBattleRecord(),haloTarget={},ui=createSiegeUI(config),model=createSiegeModel(root,config,materials);
 let stage=-1,feet=0,feedback=0,interaction={},clock=0,summonPending=false,summoned=false;
 const rules=createSiegeBoss(config,{onEvent:e=>{if(e==='window.opened'){battle.hit(0,true,true);if(config.id==='skyhook'&&rules.arena.index===0&&!summoned)summonPending=true;}onEvent(e);}});
 function solid(o,dynamic=false){const mesh=model.box(o.w,o.top-o.bottom,o.d,o.x,(o.bottom+o.top)/2,o.z,model.steel),entry={...o,mesh};owned.push(entry);if(dynamic){bases.push(entry);mesh.visible=false;}else obstacles.push(entry);return entry;}
 siegeSolids(config).forEach(o=>solid(o));config.bases.forEach(o=>solid(o,true));
 const lamps=config.controls.map(p=>model.box(.35,.08,.35,p.x,p.feetY+.86,p.z,model.cyan));
 for(const d of config.decks)model.box(d.w,.035,.055,d.x,d.top+.03,d.z+d.d/2-.04,model.gold);
 const ray=new T.Raycaster();
 function sync(playing){const s=rules.state,a=rules.arena,sky=config.id==='skyhook';
  model.body.visible=s.active;model.body.position.set(config.core.x,rules.floor+(sky&&a.index===0&&s.phase==='shield'?(a.mode==='operation'?2.3*a.timer/config.operation:2.3):0),config.core.z);model.cage.visible=s.phase!=='exposed';
  model.air.visible=!sky||a.index===0;model.inside.visible=sky&&a.index===1;model.core.rotation.y=clock;
  if(sky)model.air.userData.rotor.rotation.y=clock*18;
  model.payload.visible=model.cable.visible=!sky&&s.active&&a.mode==='operation';model.payload.position.y=10-(1-a.timer/config.operation)*4.2;
  model.warning.visible=s.active&&rules.attack.mode==='warning';model.spotlight.visible=model.warning.visible&&sky&&a.index===0;
  if(rules.attack.target){const p=rules.attack.target;model.warning.position.set(p.x,rules.floor+.04,p.z);model.spotlight.position.set(p.x,rules.floor+2.5,p.z);}
  lamps.forEach((m,i)=>{m.visible=s.active&&i===a.index;});
  for(const b of bases){const active=s.active&&(!sky||Math.abs(b.bottom-rules.floor)<.1),index=obstacles.indexOf(b);b.mesh.visible=active;if(active&&index<0)obstacles.push(b);if(!active&&index>=0)obstacles.splice(index,1);}
  root.updateMatrixWorld(true);ui.update(rules,playing,interaction,feedback,haloMarkText(haloTarget),feet);
 }
 const boss=createBossAdapter(rules,'siege',{name:config.name,maxHp:config.hp}),breaker={interrupt:boss.interruptCharge,reset:boss.resetInterrupt};
 function interruptCharge(){const ok=breaker.interrupt();if(ok)sync(true);return ok;}
 function clear(){breaker.reset();stage=-1;rules.reset();battle.clear();delete haloTarget.haloMark;interaction={};feedback=0;clock=0;summonPending=summoned=false;sync(false);ui.markers.forEach(m=>m.hidden=true);}
 function setStage(index){if(stage===index)return;breaker.reset();stage=index;rules.reset();delete haloTarget.haloMark;interaction={};feedback=0;summonPending=summoned=false;sync(false);}
 function prepareMission(m,clear){if(stage!==3||!siegeReady(config,m,clear)||!rules.activate())return false;battle.start(config.name,{damageLabel:config.damageLabel});sync(true);return true;}
 function interact(dt,{camera,held=false,busy=false,feetY=0,grounded=true}={}){
  interaction={};if(!rules.alive){rules.cancel();return;}
  const forward=new T.Vector3();camera.getWorldDirection(forward);let nearest=Infinity;
  config.controls.forEach((p,id)=>{const target=new T.Vector3(p.x,p.feetY+1.06,p.z),delta=target.clone().sub(camera.position),distance=delta.length();if(distance>=nearest)return;nearest=distance;
   ray.set(camera.position,delta.clone().normalize());ray.far=Math.max(0,distance-.15);const visible=!ray.intersectObjects(obstacles.map(o=>o.mesh),false).length;
   interaction={id,near:distance<=2.4,allowed:id===rules.arena.index&&rules.state.phase==='shield'&&rules.arena.mode==='ready'&&distance<=2.4&&!busy&&grounded&&Math.abs(feetY-p.feetY)<.25&&delta.normalize().dot(forward)>.7&&visible};
  });rules.interact(dt,{...interaction,held});
 }
 function update(dt,player,feetY,playing){feet=feetY;if(!playing){rules.cancel();interaction={};sync(false);return 0;}if(!rules.blocking){sync(true);return 0;}
  stepHaloMark(haloTarget,dt);battle.tick(dt);clock+=Math.max(0,dt);feedback=Math.max(0,feedback-dt);
  const damage=rules.tick(dt,{player,feetY,visible:p=>{const origin=new T.Vector3(config.core.x,rules.floor+2.5,config.core.z+config.core.front+1),delta=new T.Vector3(p.x,feetY+1,p.z).sub(origin);ray.set(origin,delta.clone().normalize());ray.far=delta.length();return !ray.intersectObjects(obstacles.map(o=>o.mesh),false).length;}});
  if(damage)rules.cancel();if(rules.state.phase!=='exposed')delete haloTarget.haloMark;sync(true);return damage;
 }
 function hit(object,amount,{halo=false}={}){const isCore=object===model.core||object===model.cage;
  const result=isCore?rules.hit(amount*haloDamageMultiplier(haloTarget),getPlayerFeet?getPlayerFeet():feet):{damage:0,killed:false,unitBroken:false};
  const shielded=rules.alive&&!result.damage;if(shielded)feedback=1.5;
  const marked=halo&&result.damage>0&&!result.unitBroken&&registerHaloWeakHit(haloTarget);if(result.unitBroken)delete haloTarget.haloMark;battle.hit(result.damage,true);sync(true);
  return {...result,shielded,marked,weak:result.damage>0,message:'装甲抵挡！先操作当前编号的同层机关，暴露后攻击青色核心',killMessage:config.name+' 已击破 // 清理残余守卫后撤离'};
 }
 function updateMarkers(camera,playing){camera.updateMatrixWorld();ui.markers.forEach((m,i)=>{const c=config.controls[i],p=new T.Vector3(c.x,c.feetY+1.45,c.z),view=p.clone().applyMatrix4(camera.matrixWorldInverse);p.project(camera);
  m.hidden=!playing||!rules.alive||rules.state.phase!=='shield'||rules.arena.mode!=='ready'||i!==rules.arena.index||view.z>=0||Math.abs(p.x)>.93||Math.abs(p.y)>.85||p.z>1;
  if(!m.hidden){m.style.left=((p.x+1)*innerWidth/2)+'px';m.style.top=((1-p.y)*innerHeight/2)+'px';m.textContent=`E · ${c.label} / ${c.feetY}m`;}
 });}
 function takeSummons(player){if(!summonPending||!rules.alive||rules.arena.index!==0)return [];summonPending=false;summoned=true;
  return [{x:2,z:2,y:4.5},{x:0,z:-2,y:4.5}].filter(p=>Math.hypot(p.x-player.x,p.z-player.z)>=6);
 }
 function dispose(){clear();scene.remove(root);for(const o of owned){const i=obstacles.indexOf(o);if(i>=0)obstacles.splice(i,1);}root.traverse(m=>m.geometry?.dispose());materials.forEach(m=>m.dispose());ui.dispose();}
 clear();return {interruptCharge,boss,setStage,prepareMission,clear,interact,update,hit,updateMarkers,dispose,battle,takeSummons,summonRole:'hound',summonMessage:'SKYHOOK 投放猎犬机 // 最多两台，落点在信号车顶',
  canAdvance:m=>m.index!==3||!m.defending||(rules.state.phase==='defeated'&&!rules.blocking),get state(){return rules.state;},get arena(){return {...rules.arena};},get blocking(){return rules.blocking;},get floor(){return rules.floor;},
  get origin(){return new T.Vector3(config.core.x,rules.floor,config.core.z);},get targets(){return rules.alive?[model.core,...(model.cage.visible?[model.cage]:[]),...model.armor.filter(m=>config.id!=='skyhook'||m.userData.siegePhase===rules.arena.index)]:[];},
  get objective(){const p=(rules.state.phase==='exposed'||rules.arena.mode==='operation')?{...config.core,feetY:rules.floor}:config.controls[rules.arena.index];return new T.Vector3(p.x,p.feetY+1,p.z);},
  get objectiveLabel(){return rules.arena.mode==='operation'?'前往青色核心 · 解锁后攻击':rules.state.phase==='exposed'?config.name+' · 青色核心':config.objective[rules.arena.index];}};
}
