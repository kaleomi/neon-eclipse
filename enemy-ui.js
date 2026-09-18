import {haloMarkText} from './weapons/halo-rules.js';
import * as THREE from './node_modules/three/build/three.module.js';
import {ENEMY_TYPES,BOSS_PHASES,facingDot} from './enemy-rules.js';
export function bossLabel(enemy){
 const s=enemy.bossState;return BOSS_PHASES[s.phase].name+(s.transitionRemaining>0?' / 阶段切换':s.openRemaining>0?' / 核心暴露 '+s.openRemaining.toFixed(1)+'s':' / 装甲激活');
}
export function createEnemyUI(){
 const root=document.createElement('section');root.id='enemy-combat-hud';root.hidden=true;
 root.innerHTML='<div class="swarm-coordination-status" hidden></div><div class="enemy-inspector"><b></b><div class="target-life"><i></i></div><span></span></div><div class="boss-mechanic"><strong></strong><span></span></div><div class="armor-feedback"></div>';
 document.body.append(root);
 const inspector=root.querySelector('.enemy-inspector'),bossPanel=root.querySelector('.boss-mechanic'),impact=root.querySelector('.armor-feedback');
 const ray=new THREE.Raycaster();let timer=0,impactLife=0,target=null;
 function hit(armored,weak){
  if(!armored&&!weak)return;impact.textContent=weak?'核心弱点命中': '护甲抵挡 · 尝试绕侧 / 等待暴露';impact.dataset.kind=weak?'weak':'armor';impactLife=.65;
 }
 function clear(){impactLife=0;target=null;timer=0;}
 function update(dt,playing,camera,enemies,obstacles){
  root.hidden=!playing;if(!playing)document.body.classList.remove('boss-targeted');const boss=enemies.find(e=>e.boss);document.body.classList.toggle('boss-fight',playing&&Boolean(boss));if(!playing)return;
  impactLife=Math.max(0,impactLife-dt);impact.style.opacity=impactLife>0?'1':'0';
  bossPanel.hidden=!boss;
  if(boss){
   const state=boss.bossState,phase=BOSS_PHASES[state.phase];bossPanel.querySelector('strong').textContent='THE WARDEN / '+bossLabel(boss);
   bossPanel.querySelector('span').textContent=state.openRemaining>0?'瞄准青色胸口核心 · 核心伤害 ×2.5':state.transitionRemaining>0?'武器切换预警 · 趁机换弹和移动':phase.hint+' · '+phase.attacks+' 次攻击后暴露';
   bossPanel.dataset.exposed=String(state.openRemaining>0);
  }
  const receivers=enemies.filter(e=>e.swarmIntel),relay=root.querySelector('.swarm-coordination-status'),lit=receivers.some(e=>e.swarmIntel.lit);
  relay.hidden=!receivers.length;relay.dataset.lit=String(lit);relay.textContent=lit?'蜂群照明共享 → '+receivers.length+' 名远程 · 横移断照明 / 击落断共享':'远程搜索旧位置 · '+Math.max(0,...receivers.map(e=>e.swarmIntel.remaining)).toFixed(1)+'s · 无隔墙射击';
  timer-=dt;
  if(timer<=0){
   timer=.12;camera.updateMatrixWorld();enemies.forEach(e=>e.group.updateMatrixWorld(true));
   ray.setFromCamera(new THREE.Vector2(),camera);ray.far=75;
   const hit=ray.intersectObjects(enemies.flatMap(e=>e.group.children).concat(obstacles.map(o=>o.mesh)),false)[0];
   target=hit?enemies.find(e=>e.group===hit.object.parent):null;
  }
  if(target&&!enemies.includes(target))target=null;
  inspector.hidden=!target;document.body.classList.toggle('boss-targeted',Boolean(target?.boss));
  if(target){
   const p=ENEMY_TYPES[target.type];inspector.querySelector('b').textContent=p.name+' / '+Math.max(0,Math.ceil(target.hp));
   inspector.dataset.haloMarked=String(Boolean(haloMarkText(target)));
   inspector.style.setProperty('--enemy-accent','#'+p.color.toString(16).padStart(6,'0'));
   inspector.querySelector('i').style.width=Math.max(0,target.hp/target.maxHp*100)+'%';
   inspector.querySelector('span').textContent=target.boss?target.bossState.openRemaining>0?'青色胸口核心 ×2.5':'装甲减伤 · 等待过载':target.type==='heavy'?facingDot(target.group.position,target.group.rotation.y,camera.position)>.55?'正面护甲：仅承受 30% 伤害':'侧后方无正面减伤 · 背部核心 ×2':p.hint;
   if(target.type==='engineer')inspector.querySelector('span').textContent=target.engineerBuilding?'部署炮塔 '+target.engineerRemaining.toFixed(1)+'s · 命中工程兵可打断':target.engineerSpent?'部署配额已用尽 · 已建炮塔需独立摧毁':(target.engineerStatus?target.engineerStatus+' · ':'')+p.hint;
   if(target.type==='sentry')inspector.querySelector('span').textContent=(target.sentryPhase==='locked'?'锁定 / 三连扫射 · 立即横移或入掩体':'扫描扇区外可绕行 · 正面承伤 35%')+' · 背部绿核 ×2';
   if(target.swarmIntel)inspector.querySelector('span').textContent+=' · 蜂群共享旧位 '+target.swarmIntel.remaining.toFixed(1)+'s';
   if(target.empRemaining>0)inspector.querySelector('span').textContent='EMP 失能 '+target.empRemaining.toFixed(1)+'s · 仍可受伤，已发弹丸仍需躲避';
   const mark=haloMarkText(target);if(mark)inspector.querySelector('span').textContent+=' · '+mark;
  }
 }
 return {update,hit,clear};
}
