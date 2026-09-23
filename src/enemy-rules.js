import {haloDamageMultiplier} from '../weapons/halo-rules.js';
import {harborEliteDamage} from './harbor-elite.js';
import {artilleryDamage} from './squad.js';
// Pure combat rules: silhouettes/colors identify roles, never hidden invulnerability.
export const ENEMY_TYPES={
 commander:{name:'战术指挥官',color:0xeb9bff,hp:110,hpPerLevel:0,speed:1.9,turn:2.3,scale:1,radius:.65,near:12,far:18,range:28,cooldown:3.4,behavior:'ranged',hint:'12米同层无遮挡队友冷却恢复+25% · 不叠加/不缩短预警 · 击倒指挥官或切断链路',attack:{color:'purple',charge:1,speed:18,damage:8,angles:[0],bursts:1,showAim:true}},
 engineer:{name:'战地工程兵',color:0xffc36a,hp:90,hpPerLevel:0,speed:1.8,turn:2.5,scale:1,radius:.65,near:10,far:16,range:24,cooldown:3.6,behavior:'ranged',hint:'部署2.5s受击打断 · 维修1.6s可受击/EMP目标打断，限2次 · 单次炮塔配额',attack:{color:'amber',charge:1,speed:17,damage:5,angles:[0],bursts:1,showAim:true}},
 sentry:{name:'哨兵炮塔',color:0x6affb6,hp:150,hpPerLevel:0,speed:0,turn:0,scale:1,radius:.75,near:1.6,far:0,range:22,cooldown:4.8,hint:'绿色扫描扇区 · 锁定 1.2s 后三连扫射 · 横移/掩体，绕后打绿色核心 ×2',attack:{color:'green',charge:1.2,speed:16,damage:7,angles:[-.09],bursts:3,burstDelay:.18,burstOffset:.09,showAim:true}},
 swarmDrone:{name:'蜂群无人机 · 编队型',color:0x63cfff,hp:28,hpPerLevel:0,speed:2,turn:5,scale:.8,radius:.55,near:6,far:8,range:18,cooldown:4,behavior:'ranged',hint:'六机蜂群 · 蓝光蜂鸣预警 1s · 横移躲开旧瞄准点 / 霰弹与 雷霆电弧霰弹枪 清群',attack:{color:'blue',charge:1,speed:13,damage:3,angles:[0],bursts:1,showAim:true}},
 harborElite:{name:'港务镇压者',color:0x8fe3ec,hp:230,hpPerLevel:0,speed:1.65,turn:1.15,scale:1.12,radius:.85,near:9,far:14,range:34,cooldown:5.2,hint:'金色瞄准锁定 · 双轮扇射后青色胸核暴露 2.4 秒',attack:{color:'amber',charge:1.3,speed:18,damage:9,angles:[-.12,0,.12],bursts:2,burstDelay:.35,burstOffset:.06,showAim:true}},
 assault:{name:'突击守卫',color:0xff8f50,hp:72,hpPerLevel:9,speed:3.35,turn:3.5,scale:1,radius:.65,near:5.5,far:9,range:21,cooldown:1.8,
  hint:'快速接近 · 拉开距离，利用近战与霰弹枪',attack:{color:'orange',charge:.45,speed:17,damage:5,angles:[-.025,.025],bursts:1}},
 ranged:{name:'远程守卫',color:0xc59bff,hp:60,hpPerLevel:8,speed:2.1,turn:2.5,scale:1,radius:.65,near:17,far:25,range:46,cooldown:3,
  hint:'紫色瞄准线锁定旧位置 · 横移或寻找掩体',attack:{color:'purple',charge:1,speed:24,damage:10,angles:[0],bursts:1,showAim:true}},
 heavy:{name:'重装守卫',color:0xffd16c,hp:150,hpPerLevel:12,speed:1.3,turn:.95,scale:1.12,radius:.85,near:10,far:14,range:32,cooldown:3.1,
  hint:'正面装甲减伤 · 绕侧或命中背部核心',attack:{color:'amber',charge:.9,speed:12,damage:8,angles:[-.13,0,.13],bursts:1}},
 drone:{name:'蜂群无人机',color:0xffa050,hp:34,hpPerLevel:3,speed:4.4,turn:5,scale:.8,radius:.5,near:4,far:8,range:16,cooldown:1.5,behavior:'assault',
  hint:'血量低、成群贴近 · 霰弹或近战清理，别被围住',attack:{color:'orange',charge:.45,speed:16,damage:3,angles:[0],bursts:1}},
 sniper:{name:'狙击守卫',color:0xb98cff,hp:58,hpPerLevel:6,speed:1.7,turn:2,scale:1.02,radius:.65,near:22,far:34,range:62,cooldown:3.6,behavior:'ranged',
  hint:'紫色锁定线 1.6 秒 · 切断视线或换高度段',attack:{color:'purple',charge:1.6,speed:30,damage:16,angles:[0],bursts:1,showAim:true}},
 stalker:{name:'潜行者',color:0x7fd7c8,hp:46,hpPerLevel:5,speed:3.9,turn:4.5,scale:.95,radius:.55,near:3.5,far:9,range:14,cooldown:1.6,behavior:'assault',stealth:{far:18,near:7},
  hint:'远处近乎透明 · 7 米内显形，听脚步与涟漪',attack:{color:'orange',charge:.45,speed:17,damage:6,angles:[0],bursts:1}},
 hound:{name:'猎犬机',color:0xff5a5a,hp:38,hpPerLevel:4,speed:5.2,turn:6,scale:.9,radius:.5,near:3.5,far:8,range:14,cooldown:1.4,behavior:'assault',thermal:true,
  hint:'低矮快速机械体 · 红眼预警后直线突进，横移后用霰弹/雷霆电弧霰弹枪/EMP收掉 · 暴风雪中靠热成像仍能追踪',attack:{color:'orange',charge:.45,speed:19,damage:5,angles:[0],bursts:1}},
 rusher:{name:'自爆奔袭者',color:0xff3b3b,hp:44,hpPerLevel:4,speed:5.6,turn:6,scale:.92,radius:.55,near:1.8,far:40,range:0,cooldown:99,behavior:'assault',mechanical:true,noSquad:true,
  hint:'红光加速闪烁 · 2.2米内起爆1秒 · 远距击毁可波及旁边敌人',attack:{color:'orange',charge:.45,speed:0,damage:0,angles:[],bursts:0}},
 artilleryMech:{name:'重炮机甲',color:0xff8a3d,hp:320,hpPerLevel:14,speed:1.05,turn:.8,scale:1.35,radius:1,near:9,far:26,range:34,cooldown:5.5,behavior:'ranged',mechanical:true,mortar:true,
  hint:'迫击落点红圈 2 秒 · 离开红圈 · 打膝关节两次暴露核心 5 秒',attack:{color:'orange',charge:2,speed:0,damage:26,angles:[0],bursts:1,showAim:false}},
 shield:{name:'护盾兵',color:0x9fc4ff,hp:120,hpPerLevel:10,speed:1.9,turn:1.6,scale:1.1,radius:.8,near:7,far:11,range:26,cooldown:2.8,behavior:'assault',frontShield:true,
  hint:'正面护盾免疫 · EMP可破盾6秒 · 绕侧或打背部核心',attack:{color:'amber',charge:.8,speed:14,damage:8,angles:[-.08,.08],bursts:1}},
 warden:{name:'THE WARDEN',color:0xff668d,hp:1000,hpPerLevel:0,speed:1.75,turn:.95,scale:1.9,radius:1.235,near:10,far:15,range:44,cooldown:2.5,
  hint:'等待过载窗口 · 攻击青色胸口核心'}
};
export const BOSS_PHASES=[
 {name:'I / 精确压制',hint:'紫色瞄准线锁定旧位置，横移躲避',attacks:2,window:3.4,cooldown:2.5,
  attack:{color:'pink',charge:.9,speed:20,damage:10,angles:[0],bursts:1,showAim:true}},
 {name:'II / 扇形封锁',hint:'五连扇形弹幕，利用掩体与弹间空隙',attacks:3,window:3.2,cooldown:2.6,
  attack:{color:'pink',charge:1,speed:13,damage:7,angles:[-.32,-.16,0,.16,.32],bursts:1}},
 {name:'III / 交错扫射',hint:'两轮交错弹幕，不要停在第一轮空隙',attacks:2,window:3,cooldown:2.4,
  attack:{color:'pink',charge:.8,speed:15,damage:7,angles:[-.22,0,.22],bursts:2,burstDelay:.3,burstOffset:.11}}
];
const ROLE_SETS={
 coolant:['assault','assault','ranged','assault','heavy'],
 access:['ranged','assault','heavy','ranged','assault','assault'],
 reactor:['heavy','ranged','assault','ranged','heavy','assault','assault'],
 warden:['warden','assault','ranged','assault'],
 extract:['assault','commander','assault','heavy']
};
export function roleForStage(stage,index){const roles=stage.roles||ROLE_SETS[stage.id]||['assault'];return roles[index%roles.length];}
export function turnTowards(current,target,maxStep){const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));return current+Math.max(-maxStep,Math.min(maxStep,delta));}
export function facingDot(enemyPosition,rotation,attacker){
 const dx=attacker.x-enemyPosition.x,dz=attacker.z-enemyPosition.z,length=Math.hypot(dx,dz)||1;
 return (dx*Math.sin(rotation)+dz*Math.cos(rotation))/length;
}
export function resolveEnemyDamage(enemy,baseDamage,zone,attacker){
 let multiplier=1,armored=false,weak=false;
 if(enemy.boss){
  const exposed=enemy.bossState?.openRemaining>0;
  if(exposed&&zone==='core'){multiplier=2.5;weak=true;}
  else if(!exposed){multiplier=.55;armored=true;}
 } else if(enemy.type==='sentry'){if(zone==='core'){multiplier=2;weak=true;}else if(facingDot(enemy.group.position,enemy.group.rotation.y,attacker)>.45){multiplier=.35;armored=true;}
 } else if(enemy.type==='harborElite'){const result=harborEliteDamage(enemy,zone,facingDot(enemy.group.position,enemy.group.rotation.y,attacker)>.55);multiplier=result.multiplier;armored=result.armored;weak=result.weak;
 } else if(enemy.type==='shield'){
  // Frontal shield is an absolute block (readable: shots spark off) unless EMP has broken it; the rear core is the payoff.
  if(zone==='core'){multiplier=2;weak=true;}
  else if(!(enemy.shieldDownRemaining>0)&&facingDot(enemy.group.position,enemy.group.rotation.y,attacker)>.35){multiplier=0;armored=true;}
 } else if(enemy.type==='artilleryMech'){
  const r=artilleryDamage(enemy,1,zone);multiplier=r.damage;armored=r.armored;weak=r.weak;
 } else if(enemy.type==='heavy'){
  if(zone==='core'){multiplier=2;weak=true;}
  else if(facingDot(enemy.group.position,enemy.group.rotation.y,attacker)>.55){multiplier=.3;armored=true;}
 }
 return {damage:baseDamage*multiplier*haloDamageMultiplier(enemy),armored,weak};
}
export function createBossState(){return {phase:0,attacks:0,openQueued:false,openRemaining:0,transitionRemaining:1.2};}
export function recordBossAttack(state){state.attacks++;if(state.attacks>=BOSS_PHASES[state.phase].attacks)state.openQueued=true;}
export function stepBossState(enemy,dt,attackFinished=true){
 const state=enemy.bossState,phase=enemy.hp/enemy.maxHp>.67?0:enemy.hp/enemy.maxHp>.34?1:2;
 let changed=false,opened=false,closed=false;
 if(phase>state.phase){Object.assign(state,{phase,attacks:0,openQueued:false,openRemaining:0,transitionRemaining:1.2});changed=true;}
 else state.transitionRemaining=Math.max(0,state.transitionRemaining-dt);
 if(state.openRemaining>0){state.openRemaining=Math.max(0,state.openRemaining-dt);closed=state.openRemaining===0;}
 if(!changed&&state.openQueued&&attackFinished&&state.transitionRemaining===0){
  state.openRemaining=BOSS_PHASES[state.phase].window;state.openQueued=false;state.attacks=0;opened=true;
 }
 return {changed,opened,closed};
}
// `behavior` lets new silhouettes (drone, sniper) reuse the assault / ranged movement without new branches.
export const enemyBehavior=type=>ENEMY_TYPES[type]?.behavior||type;
export function movementIntent(type,distance,visible){
 const p=ENEMY_TYPES[type],behavior=enemyBehavior(type);
 if(type==='rusher')return 'approach';
 if(!visible||distance>p.far)return 'approach';
 if(behavior==='ranged'&&distance<p.near)return 'retreat';
 if(behavior==='ranged')return 'strafe';
 if(behavior==='assault'&&distance>p.near)return 'approach';
 return 'hold';
}
