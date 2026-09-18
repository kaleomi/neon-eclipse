import {registerHaloWeakHit,stepHaloMark,haloDamageMultiplier,haloMarkText} from './weapons/halo-rules.js';
import {createBossBattleRecord} from './boss-battle-record.js';
import * as T from './node_modules/three/build/three.module.js';
import {ABYSS_MAX_HP,createAbyss,ABYSS_POSITION,abyssHint} from './abyss-rules.js';
import {STALKER_POOLS} from './datacenter-data.js';
export const ABYSS_NAME='ABYSS 水冷主机';
// Same handle shape as overseer-world / tether-world. `water` is the datacenter world (level/phase getters).
export function createAbyssWorld(scene,obstacles,water){
 const battle=createBossBattleRecord(),haloTarget={};
 const rules=createAbyss(),root=new T.Group();scene.add(root);let stage=-1;
 const coreMat=new T.MeshBasicMaterial({color:0x71ffff}),shell=new T.MeshStandardMaterial({color:0x1f4a5e,emissive:0x0d3a4c,emissiveIntensity:.8,transparent:true,opacity:.85});
 const core=new T.Mesh(new T.IcosahedronGeometry(1,1),coreMat);core.position.set(ABYSS_POSITION.x,ABYSS_POSITION.y,ABYSS_POSITION.z);core.userData.overseer='core';root.add(core);
 const cage=new T.Mesh(new T.IcosahedronGeometry(1.45,1),shell);cage.position.copy(core.position);cage.userData.overseer='core';root.add(cage);
 const arc=new T.Mesh(new T.RingGeometry(3.5,37,64),new T.MeshBasicMaterial({color:0xffc16c,transparent:true,opacity:.3,side:T.DoubleSide,depthWrite:false}));arc.rotation.x=-Math.PI/2;arc.position.set(0,.05,0);arc.visible=false;root.add(arc);
 const panel=document.createElement('div');panel.className='boss-mechanic';panel.style.cssText='position:fixed;top:124px;right:auto;left:50%;transform:translateX(-50%);width:440px;max-width:calc(100vw - 48px);pointer-events:none;z-index:12;padding:12px;background:#081d2ee8;border:1px solid #66dce8;color:#e0fbff;font:13px sans-serif;white-space:pre-line';document.body.append(panel);
 const title=document.createElement('div'),healthTrack=document.createElement('div'),healthFill=document.createElement('div');
 healthTrack.style.cssText='height:12px;background:#152638;border:1px solid #9cb2bd;margin:8px 0;position:relative';healthFill.style.cssText='height:100%;width:100%;background:linear-gradient(90deg,#6fe6ff,#ff5b79);transition:width .12s linear';
 healthTrack.append(healthFill);panel.append(title,healthTrack);const hint=document.createElement('div');panel.append(hint);
 let shieldFeedback=0;
 function sync(playing=true){
  const s=rules.state;root.visible=s.active;panel.hidden=!playing||!s.active;
  cage.visible=s.phase!=='exposed';arc.visible=s.attack!=='rest';arc.material.color.setHex(s.attack==='live'?0xff4568:0xffc16c);arc.position.y=Math.max(.05,water.level+.02);
  title.textContent=ABYSS_NAME+' · 阶段 '+s.tier+' / '+(s.tier===2?'高频放电':'放电')+' · '+Math.ceil(s.hp)+' / '+ABYSS_MAX_HP;
  healthFill.style.width=(Math.max(0,s.hp)/ABYSS_MAX_HP*100)+'%';
  hint.textContent=abyssHint(s,water.phase)+'\n'+(shieldFeedback>0?'冷却液护罩：射击无效！等待排水。 ':'')+'水位 '+water.level.toFixed(2)+' m · 已召唤 '+s.summons;
  const mark=haloMarkText(haloTarget);if(mark)hint.textContent+=' · '+mark;
  panel.style.borderColor=s.phase==='exposed'?'#71ffff':'#ffc85a';panel.dataset.exposed=String(s.phase==='exposed');
 }
 function setStage(index){if(stage===index)return;delete haloTarget.haloMark;stage=index;rules.reset(index===3);if(index===3)battle.start(ABYSS_NAME);sync();}
 function clear(){delete haloTarget.haloMark;battle.clear();stage=-1;shieldFeedback=0;rules.reset();sync(false);}
 let summonRequest=0;
 function update(dt,player,feetY,playing,grounded=true,alive=0){
  if(!rules.blocking||!playing){sync(playing);return 0;}
  stepHaloMark(haloTarget,dt);battle.tick(dt);shieldFeedback=Math.max(0,shieldFeedback-dt);
  const damage=rules.tick(dt,{level:water.level,feetY,alive});summonRequest+=rules.takeSummons();
  if(rules.state.phase!=='exposed')delete haloTarget.haloMark;sync(playing);return damage;
 }
 // app.js drains this each frame and spawns stalkers at the pools farthest from the player.
 function takeSummons(player){const n=summonRequest;summonRequest=0;if(!n)return [];return [...STALKER_POOLS].sort((a,b)=>Math.hypot(b.x-player.x,b.z-player.z)-Math.hypot(a.x-player.x,a.z-player.z)).slice(0,n).map(p=>({x:p.x,z:p.z,y:0}));}
 function hit(object,amount,{halo=false}={}){const shielded=rules.blocking&&rules.state.phase==='shield';if(shielded)shieldFeedback=1.5;const was=rules.blocking,dealt=rules.damage('core',amount*haloDamageMultiplier(haloTarget));const marked=halo&&dealt>0&&registerHaloWeakHit(haloTarget);battle.hit(dealt,true,false);sync();return {shielded,marked,damage:dealt,killed:was&&!rules.blocking,weak:dealt>0,message:'冷却液护罩！等待排水后核心露出再攻击',killMessage:'ABYSS 已停机 // 水位归零，返回进气闸撤离'};}
 function updateMarkers(){}
 clear();return {setStage,clear,update,hit,updateMarkers,takeSummons,battle,origin:new T.Vector3(ABYSS_POSITION.x,0,ABYSS_POSITION.z),get blocking(){return rules.blocking;},get state(){return rules.state;},get targets(){return rules.blocking?[core,...(cage.visible?[cage]:[])]:[];}};
}
