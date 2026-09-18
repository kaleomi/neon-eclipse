import {chooseVoltChain} from './weapons/volt-rules.js';
import {voltAnchor,voltClearPath,createVoltArc} from './volt-world.js';
import {voltCheckpoint,supplementVoltSupply} from './weapons/runtime.js';
import {createRailCharge,selectRailImpacts} from './weapons/railspike-rules.js';
import {railspikeCheckpoint,supplementRailspikeSupply} from './weapons/runtime.js';
import {createRailPanels} from './rail-panels.js';
import {createHaloBurst,registerHaloWeakHit,stepHaloMark} from './weapons/halo-rules.js';
import {haloCheckpoint,supplementHaloSupply} from './weapons/runtime.js';
import {createRuntimeWeapons,canSprintWithWeapon,tempestCheckpoint,restoreRuntimeAmmo,supplementTempestSupply,legacySelected} from './weapons/runtime.js';
import {currentDifficulty,incomingDamage,outgoingDamage,attackCooldown} from './combat-difficulty.js';
import {createMeleeSweep} from './melee-sweep.js';
import {createMeleeStrike,MELEE_STRIKE} from './melee-strike.js';
import {createAchievementUI} from './achievement-ui.js';
import {createPresentation} from './presentation.js';
import {createGameAudio} from './audio/game-audio.js';
import {createFieldRecord} from './field-record.js';
import {createTelemetry,createTelemetryAttempt} from './telemetry.js';
import {createHarborCombatUI} from './harbor-combat-ui.js';
import {createHarborWorld} from './harbor-world.js';
import {createHarborNavigation} from './harbor-navigation.js';
import {harborWater} from './harbor-data.js';
import {createTrainWorld} from './train-world.js';
import {createTrainNavigation} from './train-navigation.js';
import {createHiddenWorld} from './hidden-world.js';
import {createStarWorld} from './star-world.js';
import {createTowerWorld} from './tower-world.js';
import {createTowerNavigation} from './tower-navigation.js';
import {createBossRecordUI} from './boss-record-ui.js';
import {createRoofEnemyNavigation} from './roof-enemy-navigation.js';
import {createTransportWorld} from './transport-world.js';
import {sprintPose} from './action-poses.js';
import {createLookInput} from './look-input.js';
import {createOverseerWorld} from './overseer-world.js';
import {createTetherWorld} from './tether-world.js';
import {createOrbitalWorld} from './orbital-world.js';
import {createOrbitalNavigation} from './orbital-navigation.js';
import {createPlayerMotion} from './player-motion.js';
import {createJourneyStore,CHAPTERS} from './journey.js';
import {createGameMenu} from './menu-ui.js';
import {chapterURL} from './menu-state.js';
import {createRoofWorld} from './roof-world.js';
import {IS_STATION,IS_ROOF,IS_TOWER,IS_TRAIN,IS_HARBOR,IS_ORBITAL,IS_JOURNEY,MAP_ID,createLevelMenu} from './level.js';
import {createStationWorld} from './station-world.js';
import * as THREE from './node_modules/three/build/three.module.js';
import { createArt } from './art.js';
import { createWeapons } from './weapon-models.js';
import { ENEMY_TYPES, BOSS_PHASES, roleForStage, createBossState, resolveEnemyDamage } from './enemy-rules.js';
import { createEnemyModel } from './enemy-model.js';
import { createEnemyDirector } from './enemy-ai.js';
import { createEnemyUI } from './enemy-ui.js';
import { ARENA, createNavigator } from './arena.js';
import { createRadar } from './radar.js';
import { createEnemyProjectiles } from './projectiles.js';
import { WEAPONS, createHandling, damageAtDistance, shotSpread, advanceReload, meleePose } from './combat.js';
import { createCombatUI } from './combat-ui.js';
import { STAGES, createMission, applySupply, chooseEncounterSpawns } from './mission.js';
import { createMissionWorld } from './mission-world.js';
import { createMissionUI } from './mission-ui.js';
import { createCampaignStore, STAGE_ENTRIES } from './campaign.js';
import { createCampaignUI } from './campaign-ui.js';

const fieldRecord=createFieldRecord();
const telemetry=createTelemetry();let telemetryAttempt=null,telemetryShots=[0,0,0,0,0,0,0,0];
window.neonTelemetry=telemetry;
// Test-only probe (chapter 07 browser test): read feet height / boss state and place the player. No game-state writes beyond position.
if(IS_ORBITAL)window.__orbitalProbe=()=>({feetY:playerMotion.state.y,stage:mission.state.index,bossBlocking:Boolean(overseer?.blocking),place(x,z,feetY=0,facing=0){camera.position.set(x,feetY+1.7,z);playerMotion.reset(camera.position,feetY);yaw=facing;}});
const meleeSweep=createMeleeSweep(),meleeStrike=createMeleeStrike(),haloBurst=createHaloBurst(),railCharge=createRailCharge();let railCue=0;
function cancelRail(){railCharge.cancel();railCue=0;}
let gameMenu=null,navigating=false;
const $ = s => document.querySelector(s);
const overlay = document.createElement('section');
overlay.className = 'mission-overlay';
overlay.innerHTML = `<div class="mission-card"><span id="session-eyebrow" class="eyebrow">NEON ECLIPSE / SECTOR K-19</span><h2 id="session-title">突破<span>暗影封锁</span></h2><p id="brief">启动西侧冷却装置，取得东侧权限，解除反应堆封锁。击败 Warden 后返回南部撤离。橙色突击、紫色远程、金色重装：识别敌人，选择打法。</p><div class="controls"><span><b>W A S D</b>移动</span><span><b>鼠标</b>瞄准 / 左键射击</span><span><b>1 — 6</b>切换武器</span><span><b>R / SHIFT</b>换弹 / 冲刺</span><span><b>SPACE / ESC</b>跳跃 / 暂停</span><span><b>右键 / E</b>瞄准 / 按住交互</span></div><button id="deploy">开始行动 ↗</button><small id="lock-note">SPACE 跳跃 · 步枪按住连射 · E 交互 · 红色加号补给恢复生命，子弹标识补给补充弹药</small></div>`;
document.body.append(overlay);createLevelMenu();
if(IS_STATION){$('#session-title').innerHTML='地下<span>运输站</span>';$('#brief').textContent='从维护通道恢复供电，清理站台，穿过停靠列车，在调度室切换道岔，登上末班列车撤离。六张地图的检查点独立保存。';$('#session-eyebrow').textContent='NEON ECLIPSE / U-02';$('.topstat').textContent='CHAPTER 02 / UNDERGROUND TRANSIT';}
if(IS_ROOF){$('#session-title').innerHTML='天穹<span>通讯枢纽</span>';$('#brief').textContent='进入露天天线阵列，依次接通双中继、接管天线并上传信号。躲开放电区，最后返回南部升降平台撤离。';$('#session-eyebrow').textContent='NEON ECLIPSE / A-03';$('.topstat').textContent='CHAPTER 03 / SKYLINK ARRAY';}
if(IS_TOWER){$('#session-title').innerHTML='多层<span>中枢塔</span>';$('#brief').textContent='解除大厅隔离，沿金色台阶逐层攀升至三米设备层和六米核心层。守住中枢隔离链路，再乘升降机或原路下楼撤离。';$('#session-eyebrow').textContent='NEON ECLIPSE / C-04';$('.topstat').textContent='CHAPTER 04 / CONTROL SPIRE';}
if(IS_TRAIN){$('#session-title').innerHTML='疾驰<span>货运列车</span>';$('#brief').textContent='穿越高速列车车厢，登上车顶关闭干扰器，守住控制链路，最后进入驾驶舱完成接应。跌落会返回当前阶段入口。';$('#session-eyebrow').textContent='NEON ECLIPSE / T-05';$('.topstat').textContent='CHAPTER 05 / RUNAWAY FREIGHT';}
if(IS_HARBOR){$('#session-title').innerHTML='风暴<span>港口</span>';$('#brief').textContent='穿越集装箱堆场，登上吊机高架，守住码头信标，最后登船撤离。落水会返回当前阶段入口，星星探索不影响主线。';$('#session-eyebrow').textContent='NEON ECLIPSE / H-06';$('.topstat').textContent='CHAPTER 06 / STORM HARBOR';}
if(IS_ORBITAL){$('#session-title').innerHTML='轨道<span>电梯基座</span>';$('#brief').textContent='基座分三段重力：越高越轻，跳得更高、后坐更大。解除门禁，登上四米环与九米环，守住锚索校准，击破 TETHER 三段稳定器后攻击核心，返回升降平台撤离。';$('#session-eyebrow').textContent='NEON ECLIPSE / O-07';$('.topstat').textContent='CHAPTER 07 / ORBITAL TETHER BASE';}
const handling=createHandling();
const combatUI=createCombatUI();
const mission=createMission();
const missionUI=createMissionUI();
const enemyUI=createEnemyUI();
const harborCombatUI=IS_HARBOR?createHarborCombatUI():null;
const campaign=createCampaignStore();
const journey=createJourneyStore();
const campaignUI=createCampaignUI(campaign,{continue:continueCampaign,retry:retryStage,replay:startReplay});
const achievementUI=createAchievementUI(MAP_ID,()=>{if(pendingJourneyResult){gameMenu?.error('本章结果尚未保存，请先返回结算重试保存。');return;}startSingleChapter();});
const stamp=document.createElement('div');stamp.className='art-stamp';stamp.innerHTML='<strong>SECTOR K–19</strong><span>ION REACTOR / 07<br>STATUS: HOSTILE OCCUPATION<br>清除守卫 · 夺回反应堆</span>';document.body.append(stamp);
if(IS_STATION){stamp.innerHTML='<strong>UNDERGROUND</strong><span>U-02 / LAST SERVICE<br>维护通道 · 站台 · 车厢 · 调度室</span>';stamp.classList.add('station-stamp');}
if(IS_ROOF){stamp.innerHTML='<strong>SKYLINK ARRAY</strong><span>A-03 / ABOVE THE CITY<br>双中继 · 天线控制 · 信号上传</span>';stamp.classList.add('roof-stamp');}
const compass=document.createElement('div');compass.className='compass';compass.innerHTML='<b>000° / N</b>';document.body.append(compass);
const toast = document.createElement('div'); toast.className = 'toast'; document.body.append(toast);
const damageScreen = document.createElement('div'); damageScreen.className = 'damage-screen'; document.body.append(damageScreen);
const hit = document.createElement('div'); hit.className = 'hitmarker'; hit.textContent = '×'; document.body.append(hit);
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
catch (e) { $('#brief').textContent = '无法启动 WebGL，请启用浏览器硬件加速后重试。'; $('#deploy').disabled = true; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
$('#game').append(renderer.domElement);
const qualityButton=document.createElement('button');qualityButton.id='quality';qualityButton.type='button';qualityButton.textContent='画质：精细 / 按 Q 切换';qualityButton.setAttribute('aria-pressed','false');$('.mission-card').append(qualityButton);
function toggleQuality(){presentation.toggleQuality();}
qualityButton.addEventListener('click',toggleQuality);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x071217); scene.fog = new THREE.FogExp2(0x071217, .014);
const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, .08, 160);
camera.rotation.order = 'YXZ'; scene.add(camera);
scene.add(new THREE.HemisphereLight(0x94e9f6, 0x17232b, 2.2));
const sun = new THREE.DirectionalLight(0x9bcbd5, 2.6); sun.position.set(8, 18, 6); scene.add(sun);
const cyan = new THREE.MeshStandardMaterial({ color: 0x36dfe8, emissive: 0x16bccd, emissiveIntensity: 2 });
const orange = new THREE.MeshStandardMaterial({ color: 0xff7844, emissive: 0xff3a10, emissiveIntensity: 1.5 });
if(IS_TOWER){stamp.innerHTML='<strong>CONTROL SPIRE</strong><span>C-04 / VERTICAL LOCKDOWN<br>大厅 · 设备层 · 核心层 · 撤离</span>';stamp.classList.add('tower-stamp');}
if(IS_TRAIN){stamp.innerHTML='<strong>RUNAWAY FREIGHT</strong><span>T-05 / MOVING TRAIN<br>尾车 · 货舱 · 车顶 · 机车接管</span>';stamp.classList.add('train-stamp');}
if(IS_HARBOR){stamp.innerHTML='<strong>STORM HARBOR</strong><span>H-06 / NIGHT EXTRACTION<br>堆场 · 吊机 · 码头 · 登船撤离</span>';stamp.classList.add('harbor-stamp');}
if(IS_ORBITAL){stamp.innerHTML='<strong>ORBITAL TETHER</strong><span>O-07 / GRAVITY BANDS<br>门禁 · 四米环 · 九米锚索 · TETHER</span>';stamp.classList.add('orbital-stamp');}
const steel = new THREE.MeshStandardMaterial({ color: 0x253944, roughness: .55, metalness: .65 });
const dark = new THREE.MeshStandardMaterial({ color: 0x0b1720, roughness: .6, metalness: .7 });
const pale = new THREE.MeshStandardMaterial({ color: 0x8da7aa, roughness: .5, metalness: .5 });
function box(w,h,d,x,y,z,mat=steel,parent=scene) {
 const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); m.position.set(x,y,z); parent.add(m); return m;
}
const obstacles=[],playerCeilings=[];let reactor=null;
function buildReactor(){
const floor=box(ARENA.size,.3,ARENA.size,0,-.2,0,dark);floor.userData.floor=true;
const grid = new THREE.GridHelper(ARENA.size,40,0x24545c,0x142c34);grid.position.y=.005;scene.add(grid);

function solid(w,h,d,x,z,mat=steel){const m=box(w,h,d,x,h/2,z,mat);obstacles.push({x,z,w,h,d,mesh:m});return m;}
const edge=ARENA.half;
solid(1,10,ARENA.size+1,-edge,0);solid(1,10,ARENA.size+1,edge,0);solid(ARENA.size,10,1,0,-edge);solid(ARENA.size,10,1,0,edge);
const walkway=new THREE.MeshStandardMaterial({color:0x132830});
for(let i=-36;i<=36;i+=12){
 for(const side of [-1,1]){box(.16,7,.18,side*(edge-.6),4,i,cyan);box(2,10,1.2,i,5,-edge+1,steel);}
 box(1.8,.08,ARENA.size-4,i,.025,0,walkway);box(.08,.03,ARENA.size-4,i,.07,0,cyan);box(ARENA.size-1,.2,.3,0,8,i,steel);
}
for(const [x,z] of ARENA.covers){
 solid(3,2.5,3,x,z);obstacles[obstacles.length-1].cover=true;
 box(3.05,.12,3.05,x,2.1,z,cyan);box(2.7,.1,2.7,x,2.56,z,dark);
}
reactor = new THREE.Group(); reactor.position.set(0,0,-16); scene.add(reactor);
solid(5,3,5,0,-16,dark);
const core = new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,6,12),cyan); core.position.y=4; reactor.add(core);
for(let y=1;y<8;y+=2) {
 const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5,.14,8,48),steel); ring.rotation.x=Math.PI/2; ring.position.y=y; reactor.add(ring);
}
const lamp=new THREE.PointLight(0x16eaff,45,20); lamp.position.set(0,5,-16); scene.add(lamp);
for(const x of [-37,37]) for(const z of [-34,34]) { box(1,6,1,x,3,z,dark); box(1.03,1,1.03,x,5,z,orange); }
playerCeilings.push({x:0,z:-16,w:6.5,d:6.5,bottom:0,top:9});
return createArt(scene,renderer,reactor,obstacles);
}
const art=IS_ORBITAL?createOrbitalWorld(scene,renderer,obstacles):IS_HARBOR?createHarborWorld(scene,renderer,obstacles):IS_TRAIN?createTrainWorld(scene,renderer,obstacles):IS_TOWER?createTowerWorld(scene,renderer,obstacles):IS_ROOF?createRoofWorld(scene,renderer,obstacles):IS_STATION?createStationWorld(scene,renderer,obstacles):buildReactor();
if(MAP_ID==='reactor')createRailPanels(scene,obstacles);
const presentation=createPresentation({renderer,scene,sun,art,camera,qualityButton,record:fieldRecord});
const overseer=IS_ORBITAL?createTetherWorld(scene,obstacles):IS_ROOF?createOverseerWorld(scene,obstacles):null;
const transport=IS_ROOF?createTransportWorld(scene,art.ceilings,obstacles):null;
const bossRecordUI=IS_ROOF||IS_ORBITAL?createBossRecordUI(document.querySelector('.mission-card')):null;
createHiddenWorld(scene,MAP_ID,obstacles);
const missionWorld=createMissionWorld(scene,obstacles);
const starWorld=createStarWorld(scene,MAP_ID,notify);
const navigation=createNavigator(obstacles);
const roofEnemyNavigation=IS_ORBITAL?createOrbitalNavigation(obstacles):IS_HARBOR?createHarborNavigation(obstacles):IS_TRAIN?createTrainNavigation(obstacles):IS_TOWER?createTowerNavigation(obstacles):IS_ROOF?createRoofEnemyNavigation(obstacles,navigation):null;
const playerMotion=createPlayerMotion(obstacles,art.ceilings||playerCeilings,IS_ORBITAL||IS_HARBOR?{x:37.1,z:37.1}:IS_TRAIN?{x:14,z:37.1}:IS_TOWER?{x:29,z:23}:IS_ROOF?{x:37.1,z:37.1}:IS_STATION?{x:31.1,z:37.1}:{x:39.1,z:39.1},{gravityAt:art.gravityAt||null});
let jumpRequested=false,pendingJourneyResult=null;
const radar=createRadar(obstacles);
const enemyProjectiles=createEnemyProjectiles(scene,obstacles,(damage,source)=>{
 damage=incomingDamage(damage);fieldRecord.hurt(Math.min(health,damage));achievementUI.attempt.hurt(Math.min(health,damage));health=Math.max(0,health-damage);mission.interrupt();combatUI.damaged(source);damageTime=.3;gameAudio.hurt(health);hud();
},(position,color,count)=>{art.burst(position,color,count);if(color!==0xff5435)gameAudio.play('bolt.wall',{position:{x:position.x,z:position.z}});},{
 onQueue:(origin,attack,boss)=>gameAudio.telegraph(attack.color,{x:origin.x,z:origin.z},boss?false:!lineOfSight(origin)),
 onEmit:(origin)=>gameAudio.play('enemy.fire',{position:{x:origin.x,z:origin.z}})
});
const viewModel=createWeapons(camera);
const {gun,flash}=viewModel;
const weapons=createRuntimeWeapons();
let meleeRemaining=0,meleePending=false,sprintBlend=0;
let runMode=IS_JOURNEY?'journey':'campaign',replayEntry=null;
let state='ready',wave=1,health=100,kills=0,selected=0,cooldown=0,reload=0,recoil=0;
let yaw=0,pitch=0,firing=false,aiming=false,elapsed=0,toastTime=0,damageTime=0,hitTime=0;
let fireBuffer=0,moving=false,sprinting=false,enemyFireGate=0;
const keys=new Set(), enemies=[], effects=[], ray=new THREE.Raycaster();
const interactionRay=new THREE.Raycaster();
const lookInput=createLookInput();
let rounds=[], reserves=[];
const gameAudio=createGameAudio({storage:localStorage});window.neonAudio=gameAudio;
let streakTime=0;const streakBanner=document.createElement('div');streakBanner.className='streak-banner';document.body.append(streakBanner);
function showStreak(step){if(!step)return;streakBanner.textContent=step>=10?'连续击破 ×10 // 清场':step>=5?'连续击破 ×5 // 压制':'连续击破 ×3';streakBanner.dataset.step=String(step);streakBanner.dataset.show='true';streakTime=1.6;}
function lineOfSight(origin){ray.set(camera.position,origin.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(origin);return !obstacles.some(o=>ray.intersectObject(o.mesh,false).length);}
const enemyDirector=createEnemyDirector({scaleCooldown:attackCooldown,onEliteWindow:()=>fieldRecord.window(),enemies,player:camera,navigation,vertical:roofEnemyNavigation,move,obstacles,projectiles:enemyProjectiles,onBossEvent:(enemy,event)=>{
 if(event.changed){notify('Warden 阶段切换 // '+BOSS_PHASES[enemy.bossState.phase].name);gameAudio.play('boss.phase');}
 else if(event.opened){notify('Warden 过载 // 青色胸口核心暴露，集中攻击！');gameAudio.play('boss.window.open');}
 else if(event.closed)gameAudio.play('boss.window.close');
 hud();
}});
function notify(text){toast.textContent=text;toastTime=3;}
function hud(){
 $('#health').textContent=Math.ceil(health); $('#healthbar').style.width=`${health}%`;
 $('#player-hud .health').dataset.low=String(health<=25);$('#player-hud .ammo').dataset.weapon=selected===3?'melee':'firearm';
 $('#ammo').textContent=Number.isFinite(rounds[selected])?rounds[selected]:'∞';
 $('.ammo i').textContent=selected===3?' / —':` / ${reserves[selected]}`;
 $('.ammo span').textContent=selected===3?'近战':selected===4?'TEMPEST / 机动冲锋':selected===5?'HALO / 三连点射':selected===6?'RAILSPIKE / 蓄力穿透':selected===7?'VOLT / 电弧霰弹':'弹药';
 $('.boss-note').textContent=mission.current.title;
 viewModel.select(selected);
 document.querySelectorAll('.loadout-card').forEach((el,i)=>el.classList.toggle('active',i===selected));
}
function disposeGroup(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();});group.userData.ownedMaterials?.forEach(m=>m.dispose());scene.remove(group);}
function spawnEncounter(stage){
 if(art.setStage?.(mission.state.index)){navigation.invalidate();roofEnemyNavigation?.invalidate?.();}
 overseer?.setStage(mission.state.index);
 wave=stage.level;
 const count=stage.count;
 const spots=chooseEncounterSpawns(stage,camera.position,obstacles);
 if(spots.length<count)throw new Error('Not enough safe encounter spawn points');
 for(let i=0;i<count;i++) {
  const type=roleForStage(stage,i),profile=ENEMY_TYPES[type],boss=type==='warden';
  const group=createEnemyModel(type);group.scale.setScalar(profile.scale);
  const p=spots[i];group.position.set(p.x,p.y??stage.feetY??0,p.z);group.rotation.y=Math.atan2(camera.position.x-p.x,camera.position.z-p.z);
  scene.add(group);const hp=profile.hp+wave*profile.hpPerLevel;
  enemies.push({flankRoute:stage.harborFlanks?.[i]?.map(p=>({...p}))||[],group,type,hp,maxHp:hp,boss,bossState:boss?createBossState():null,speed:profile.speed*(1+wave*.025),attack:1+Math.random(),radius:profile.radius,charge:0,seed:i*1.37+wave});
 }
 hud();
}
function reset(stageIndex=0,snapshot=null){
 haloBurst.cancel();cancelRail();
 fieldRecord.begin(stageIndex);achievementUI.begin({map:MAP_ID,stage:stageIndex,snapshot:!!snapshot,replay:runMode==='replay'});
 telemetryAttempt=createTelemetryAttempt({map:MAP_ID,mode:runMode,difficulty:currentDifficulty().id,stage:stageIndex,snapshot:!!snapshot});telemetryShots=[0,0,0,0,0,0,0,0];
 bossRecordUI?.clear();lookInput.reset();transport?.reset(snapshot?.transportTime||0,snapshot?.transportTrip===true);meleePending=false;meleeStrike.cancel();sprintBlend=0;
 overseer?.clear();art.clear();enemyProjectiles.clear();handling.reset();combatUI.clear();enemyUI.clear();mission.reset(stageIndex);missionWorld.reset();fireBuffer=0;enemyFireGate=0;moving=false;sprinting=false;aiming=false;firing=false;keys.clear();
 enemies.forEach(e=>disposeGroup(e.group));enemies.length=0; effects.forEach(e=>{scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();});effects.length=0;
 jumpRequested=false;health=100;kills=0;wave=1;selected=0;cooldown=0;reload=0;recoil=0;elapsed=0;meleeRemaining=0;
 rounds=weapons.map(w=>w.cap);reserves=weapons.map(w=>w.reserve);
 if(art.setStage?.(mission.state.index)){navigation.invalidate();roofEnemyNavigation?.invalidate?.();}art.restoreMotion?.(snapshot);
 const entry=STAGE_ENTRIES[stageIndex];let restoredFeet=entry.feetY||0;camera.position.set(entry.x,restoredFeet+1.7,entry.z);yaw=0;pitch=0;
 if(snapshot){
  health=snapshot.health;({rounds,reserves,selected}=restoreRuntimeAmmo(snapshot));
  if(playerMotion.canOccupy(snapshot.x,snapshot.z,snapshot.feetY||0)){camera.position.set(snapshot.x,1.7,snapshot.z);restoredFeet=snapshot.feetY||0;}
  yaw=snapshot.yaw;pitch=snapshot.pitch;kills=snapshot.kills;mission.state.time=snapshot.time;missionWorld.restore(snapshot.collected);
 }
 playerMotion.reset(camera.position,restoredFeet);camera.rotation.set(pitch,yaw,0);spawnEncounter(mission.current);campaignUI.announce(mission.current,runMode==='replay');

}
function end(win){haloBurst.cancel();cancelRail();if(!win){fieldRecord.die(camera.position);achievementUI.attempt.die();}achievementUI.finish(win&&mission.state.complete&&runMode!=='replay');
 if(telemetryAttempt){const attempt=telemetryAttempt;telemetryAttempt=null;telemetry.record({attempt,won:win,stages:fieldRecord.records,kills,time:mission.state.time,weaponShots:telemetryShots,endStage:runMode==='replay'?replayEntry.stageIndex:mission.state.index}).catch(()=>{});}if(overseer?.battle.summary.status==='active')overseer.battle.finish(win?'won':'lost',bossLoadout());bossRecordUI?.show(overseer?.battle.summary);jumpRequested=false;enemyProjectiles.clear();state=win?'won':'lost';document.body.dataset.playState=state;gameAudio.play(win?'mission.won':'mission.lost');if(!win)gameAudio.play('player.death');document.exitPointerLock?.();overlay.hidden=false;
 $('#session-title').innerHTML=win?(runMode==='replay'?'阶段<span>训练完成</span>':'行动<span>撤离成功</span>'):'信号<span>连接中断</span>';
 const seconds=Math.floor(mission.state.time);
 $('#brief').textContent=`${win?(runMode==='replay'?'本阶段训练完成，主行动检查点未改变。':(IS_ORBITAL?'TETHER 已沉寂，小队离开轨道电梯基座。':IS_HARBOR?'小队已登船，离开风暴港口。':IS_TRAIN?'列车控制权已移交，接应队伍已登车。':IS_TOWER?'中枢已隔离，小队已从大厅撤离。':IS_ROOF?'信号已送出，小队已返回升降平台。':IS_STATION?'已登上末班列车，运输站行动完成。':'反应堆已移交，撤离完成。')):'可从阶段入口检查点重试，或重新开始行动。'} 击破 ${kills} 个目标 · 用时 ${Math.floor(seconds/60)}分${seconds%60}秒 · 阶段 ${runMode==='replay'?replayEntry.stageIndex+1:Math.min(5,mission.state.index+1)}/5。`;
 if(win&&runMode==='campaign')campaign.complete();
 if(win&&runMode==='journey'){pendingJourneyResult={time:mission.state.time,kills};if(journey.finish(MAP_ID,pendingJourneyResult))pendingJourneyResult=null;else $('#brief').textContent='章节已完成，但战役存档写入失败。请重试保存后再继续。';}
 if(win&&runMode==='journey'&&journey.data?.status==='complete'){$('#session-title').innerHTML='港口撤离<span>战役完成</span>';$('#brief').textContent='反应堆、地下运输站、天穹通讯枢纽、多层中枢塔、疾驰货运列车、风暴港口：六章行动全部完成。共击破 '+journey.data.results.reduce((n,r)=>n+r.kills,0)+' 个目标。可继续单章训练，或重新开始战役。';}
 $('#deploy').textContent='开始新行动 ↗';firing=false;fireBuffer=0;aiming=false;keys.clear();campaignUI.refresh(state,runMode);refreshJourney();}
function pause(){lookInput.reset();if(state!=='playing')return;cancelRail();bossRecordUI?.show(overseer?.battle.summary);jumpRequested=false;state='paused';document.body.dataset.playState=state;gameAudio.play('ui.pause');gameAudio.pause();firing=false;fireBuffer=0;aiming=false;keys.clear();overlay.hidden=false;
 $('#session-title').innerHTML='行动<span>已暂停</span>';$('#brief').textContent='战场已冻结。当前目标：'+mission.current.title+'。';$('#deploy').textContent='继续当前战斗 ↗';campaignUI.refresh(state,runMode);refreshJourney();}
function bossLoadout(){return {health,rounds:rounds.slice(0,3),reserves:reserves.slice(0,3),...tempestCheckpoint(rounds,reserves,selected),...haloCheckpoint(rounds,reserves,selected),...railspikeCheckpoint(rounds,reserves,selected),...voltCheckpoint(rounds,reserves,selected)};}
function checkpoint(){
 return {stageIndex:mission.state.index,health,rounds:rounds.slice(0,3),reserves:reserves.slice(0,3),selected:legacySelected(selected),...tempestCheckpoint(rounds,reserves,selected),...haloCheckpoint(rounds,reserves,selected),...railspikeCheckpoint(rounds,reserves,selected),...voltCheckpoint(rounds,reserves,selected),x:camera.position.x,z:camera.position.z,yaw,pitch,time:mission.state.time,kills,feetY:playerMotion.state.y,collected:missionWorld.collected,...(IS_TRAIN?{trainTime:art.trainTime}:{}),...(IS_TOWER?{towerLiftTime:art.liftTime}:{}),...(transport?{transportTime:transport.time,transportTrip:transport.tripCompleted}:{})};
}
function saveCheckpoint(){if(runMode==='campaign')campaign.save(checkpoint());if(runMode==='journey'&&!journey.save(MAP_ID,checkpoint()))notify('战役检查点写入失败 // 请勿关闭页面');}
function refreshJourney(){
 document.body.dataset.playMode=runMode;
 gameMenu?.update(state);gameMenu?.refresh();
}
function openMenuChapter(map,mode='campaign',entry='chapter'){
 if(navigating)return false;
 const destination=chapterURL(map,mode,entry);
 navigating=true;gameMenu?.refresh();location.href=destination;return true;
}
function startJourney(){
 if(navigating)return false;
 if(!journey.start()){gameMenu?.error('无法保存新战役。请允许浏览器存储后重试，或在选择关卡中体验单章模式。');return false;}
 pendingJourneyResult=null;
 if(MAP_ID!=='reactor')return openMenuChapter('reactor','journey');
 runMode='journey';reset();
 if(!journey.save(MAP_ID,checkpoint())){state='ready';refreshJourney();gameMenu?.error('新战役入口已创建，但检查点写入失败。请重试继续游戏。');return false;}
 return enterPlay();
}
function continueJourney(){
 if(navigating)return false;
 if(pendingJourneyResult){
  if(!journey.finish(MAP_ID,pendingJourneyResult)){gameMenu?.error('章节结果仍无法保存，请勿关闭页面。保存成功后才会进入下一关。');return false;}
  pendingJourneyResult=null;
 }
 const d=journey.data;
 if(!d){gameMenu?.error('没有可继续的战役，请从主菜单开始新游戏。');return false;}
 if(d.status==='complete'){refreshJourney();return true;}
 if(d.status==='between'){
  if(!journey.advance()){gameMenu?.error('无法保存下一关入口，章节结算仍保留。请点击进入下一关重试。');return false;}
  return openMenuChapter(CHAPTERS[d.chapter+1].map,'journey');
 }
 const chapter=CHAPTERS[d.chapter];
 if(MAP_ID!==chapter.map)return openMenuChapter(chapter.map,'journey','continue');
 runMode='journey';reset(d.checkpoint?.stageIndex||0,d.checkpoint);
 if(!d.checkpoint&&!journey.save(MAP_ID,checkpoint())){state='ready';refreshJourney();gameMenu?.error('无法保存本章入口检查点，请允许浏览器存储后重试。');return false;}
 return enterPlay();
}
function startSingleChapter(){
 if(navigating)return false;
 if(pendingJourneyResult){gameMenu?.error('本章结果尚未保存，请先返回结算重试保存。');return false;}
 runMode='campaign';reset();saveCheckpoint();return enterPlay();
}
async function enterPlay(){
 try{await gameAudio.unlock();}catch{}
 gameAudio.resume();gameAudio.play('ui.resume');
 lookInput.reset();state='playing';document.body.dataset.playState=state;overlay.hidden=true;
 try{await renderer.domElement.requestPointerLock();}catch{notify('鼠标锁定不可用：按住左键拖动瞄准，方向键也可转向');}
}
function continueCampaign(){
 if(navigating)return false;
 if(pendingJourneyResult){gameMenu?.error('本章结果尚未保存，请先返回结算重试保存。');return false;}
 const saved=campaign.checkpoint;runMode='campaign';
 if(saved){reset(saved.stageIndex,saved);notify('已读取阶段入口检查点');}else{reset();saveCheckpoint();}
 return enterPlay();
}
function retryStage(){
 if(navigating||pendingJourneyResult)return false;
 const saved=runMode==='replay'?replayEntry:runMode==='journey'?journey.data?.checkpoint:campaign.checkpoint;if(!saved)return false;
 reset(saved.stageIndex,saved);notify('阶段已重置');return enterPlay();
}
function startReplay(index){
 if(navigating||pendingJourneyResult){gameMenu?.error('请先完成当前章节结果保存，再开始训练。');return false;}
 if(!Number.isInteger(index)||index<0||index>campaign.unlocked)return;
 runMode='replay';reset(index);replayEntry=checkpoint();notify('阶段训练 // 不覆盖主行动检查点');enterPlay();
}
$('#deploy').addEventListener('click',()=>gameMenu?.activatePrimary());
document.addEventListener('pointerlockchange',()=>{lookInput.reset();if(document.pointerLockElement!==renderer.domElement)pause();});
window.addEventListener('blur',()=>{pause();if(document.pointerLockElement)document.exitPointerLock();});
document.addEventListener('mousemove',e=>{
 if(state!=='playing')return;
 const delta=lookInput.sample(e,document.pointerLockElement===renderer.domElement);if(!delta)return;
 const sensitivity=.0022*combatUI.sensitivity*(1-handling.state.ads*.35);
 yaw-=delta.x*sensitivity;pitch=THREE.MathUtils.clamp(pitch-delta.y*sensitivity,-1.35,1.35);
});
renderer.domElement.addEventListener('mousedown',e=>{if(state==='playing'&&e.button===0&&document.pointerLockElement!==renderer.domElement)lookInput.begin(e.clientX,e.clientY);});
renderer.domElement.addEventListener('mouseleave',()=>lookInput.end());
document.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement||e.target.isContentEditable)return;
 if(state==='playing'&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 if(e.code==='KeyQ'&&!e.repeat){toggleQuality();return;}
 if(e.code==='Escape'){pause();document.exitPointerLock?.();}
 if(state!=='playing')return;keys.add(e.code);
 if(e.code==='Space'&&!e.repeat)jumpRequested=true;
 if(/^Digit[1-8]$/.test(e.code)&&!e.repeat)changeWeapon(Number(e.code.slice(-1))-1);
 if(e.code==='KeyR')startReload();
});
document.addEventListener('keyup',e=>keys.delete(e.code));
document.addEventListener('mousedown',e=>{if(state!=='playing')return;if(e.button===0){firing=true;fireBuffer=.18;}if(e.button===2)aiming=true;});
document.addEventListener('mouseup',e=>{if(e.button===0){firing=false;if(selected===6)cancelRail();lookInput.end();}if(e.button===2)aiming=false;});
document.addEventListener('contextmenu',e=>e.preventDefault());
function changeWeapon(index){
 if(!Number.isInteger(index)||index<0||index>=weapons.length||index===selected)return;
 haloBurst.cancel();cancelRail();selected=index;meleeRemaining=0;meleePending=false;meleeStrike.cancel();reload=0;fireBuffer=0;firing=false;recoil=0;handling.switchWeapon();combatUI.switching();hud();
}
function startReload(){
 if(selected===6){cancelRail();firing=false;fireBuffer=0;}
 const w=weapons[selected];if(reload||selected===3||rounds[selected]===w.cap)return;
 if(!reserves[selected]){notify('备用弹药耗尽 · 切换武器');return;}
 haloBurst.cancel();cancelRail();reload=w.reload;fireBuffer=0;gameAudio.play(selected===4?'reload.tempest':'reload.start');hud();
}
function blocked(x,z,r){return obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);}
function move(pos,dx,dz,r){if(!blocked(pos.x+dx,pos.z,r))pos.x+=dx;if(!blocked(pos.x,pos.z+dz,r))pos.z+=dz;}
function trace(from,to,color=0xffbd75){
 const mesh=new THREE.Line(new THREE.BufferGeometry().setFromPoints([from,to]),new THREE.LineBasicMaterial({color,transparent:true,opacity:.9}));scene.add(mesh);effects.push({mesh,life:.09});
}
function shoot(meleeImpact=false,meleeContact=null,haloRound=false){
 if(!meleeImpact&&((cooldown>0&&!haloRound)||handling.state.switchRemaining>0))return false;
 if(selected===3&&!meleeImpact){cooldown=weapons[3].delay;meleeRemaining=MELEE_STRIKE.duration;meleePending=true;meleeStrike.begin();overseer?.battle.shot(3);return true;}
 if(reload>0){if(weapons[selected].perShell&&rounds[selected]>0)reload=0;else return false;}
 if(rounds[selected]<=0){startReload();cooldown=.2;fireBuffer=0;return false;}
 const w=weapons[selected];if(selected!==3)overseer?.battle.shot(selected);rounds[selected]--;if(selected!==3){fieldRecord.shot();achievementUI.attempt.shot(selected);}telemetryShots[selected]++;if(!meleeImpact)cooldown=w.delay;recoil=1;
 gameAudio.weaponFire(selected);
 scene.updateMatrixWorld(true);
 let totalDamage=0,headshot=false,killed=0,armoredHit=false,coreHit=false,killedElite=false,killedBoss=false;
 const voltSources=new Map();
 const spread=shotSpread(w,handling.state.ads,handling.state.heat,moving);
 const meshes=enemies.flatMap(e=>e.group.children).concat(obstacles.map(o=>o.mesh),overseer?.targets||[]);
 for(let p=0;p<w.pellets;p++){
  let impact,railResult;
  if(selected===3){
   impact=meleeContact;
  }else{
   ray.setFromCamera(new THREE.Vector2((Math.random()-.5)*spread,(Math.random()-.5)*spread),camera);ray.far=w.range;
   const intersections=ray.intersectObjects(meshes,false);
   if(selected===6)railResult=selectRailImpacts(intersections,object=>enemies.find(e=>e.hp>0&&e.group===object.parent)||(object.userData.overseer!==undefined?'overseer:'+object.userData.overseer:null));
   impact=intersections[0];
  }
  for(const contact of (railResult?railResult.hits:[impact])){
  impact=contact;
  const target=impact&&enemies.find(e=>e.group===impact.object.parent);
  if(impact)art.burst(impact.point,target?0xff9459:0x74f8ed,selected===1?4:10);
  if(impact&&impact.object.userData.overseer!==undefined){
   const result=overseer.hit(impact.object,outgoingDamage(damageAtDistance(w,impact.distance,false)*(impact.railFactor??1)),{halo:selected===5});if(result.marked)gameAudio.play('halo.mark');if(result.shielded)notify(result.message||'核心无敌！先击破两座金色供电节点，再攻击青色核心');totalDamage+=result.damage;coreHit ||= result.weak;armoredHit ||= result.damage===0;
   if(result.killed){overseer.battle.finish('won',bossLoadout());kills++;killed++;killedBoss=true;notify(result.killMessage||'枢纽监察者已击破 // 清理守卫，建立上传链路');}
  }
  if(target&&target.hp>0){
   const isHead=selected!==3&&impact.object.userData.hitZone==='head';
   const baseDamage=outgoingDamage(damageAtDistance(w,impact.distance,isHead)*(impact.railFactor??1));
   const resolved=resolveEnemyDamage(target,baseDamage,impact.object.userData.hitZone,camera.position);
   if(selected===7&&resolved.damage>0)voltSources.set(target,(voltSources.get(target)||0)+baseDamage);
   if(target.type==='harborElite'&&target.eliteState?.ventRemaining>0&&impact.object.userData.hitZone==='core')fieldRecord.coreHit(target);
   totalDamage+=Math.min(target.hp,resolved.damage);target.hp-=resolved.damage;if(target.hp<=0&&target.type==='harborElite'&&target.eliteState?.ventRemaining>0&&impact.object.userData.hitZone==='core')achievementUI.attempt.counter();
   if(selected===5&&resolved.damage>0&&target.hp>0&&(resolved.weak&&impact.object.userData.hitZone==='core'||isHead&&!resolved.armored)&&registerHaloWeakHit(target))gameAudio.play('halo.mark');
   armoredHit ||= resolved.armored;coreHit ||= resolved.weak;headshot ||= (isHead&&!resolved.armored)||resolved.weak;
  }
  }
  const terminal=railResult?railResult.stop:impact;
  const endpoint=terminal?terminal.point:ray.ray.at(w.range,new THREE.Vector3());
  if(selected!==3)trace(gun.localToWorld(flash.position.clone()),endpoint,selected===6?0xffd1a0:selected===7?0x70f2ff:0xffbd75);
 }
 if(selected===7){
  const chain=chooseVoltChain(voltSources,enemies,{position:voltAnchor,visible:(from,to)=>voltClearPath(from,to,obstacles.map(o=>o.mesh).concat(overseer?.targets||[]))});
  if(chain){const result=resolveEnemyDamage(chain.target,chain.damage,'body',chain.from),dealt=Math.min(chain.target.hp,result.damage);
   if(dealt>0){chain.target.hp-=result.damage;totalDamage+=dealt;armoredHit ||= result.armored;
    const mesh=createVoltArc(chain.from,chain.to);scene.add(mesh);effects.push({mesh,life:.2});art.burst(chain.to,0x70f2ff,12);gameAudio.play('volt.chain');combatUI.chain(dealt);
   }
  }
 }
 for(let i=enemies.length-1;i>=0;i--)if(enemies[i].hp<=0){
  if(enemies[i].boss)killedBoss=true;else if(enemies[i].type==='harborElite'||enemies[i].elite)killedElite=true;
  art.burst(enemies[i].group.position.clone().add(new THREE.Vector3(0,1.2,0)),0xffad68,32);disposeGroup(enemies[i].group);enemies.splice(i,1);kills++;killed++;
 }
 achievementUI.attempt.hit(selected,killed);
 if(totalDamage>0){
  hitTime=killed?.25:.16;hit.dataset.kind=killed?'kill':coreHit?'core':headshot?'head':armoredHit?'armor':'body';combatUI.registerHit(totalDamage,headshot,killed);
  showStreak(gameAudio.hit({killed:killed>0,headshot,armored:armoredHit&&!coreHit,core:coreHit,elite:killedElite,boss:killedBoss}));
  enemyUI.hit(armoredHit&&!coreHit,coreHit);
 }
 handling.shot(w,Math.random(),art.recoilScale?.(playerMotion.state.y)??1);flash.visible=selected!==3;hud();return true;
}
function update(dt){
 for(const enemy of enemies)stepHaloMark(enemy,dt);
 fieldRecord.tick(dt,mission.state.index);
 const previousPlayer=camera.position.clone();
 elapsed+=dt;cooldown=Math.max(0,cooldown-dt);recoil=Math.max(0,recoil-dt*7);enemyFireGate=Math.max(0,enemyFireGate-dt);
 fireBuffer=Math.max(0,fireBuffer-dt);
 const previousMelee=meleeRemaining;meleeRemaining=Math.max(0,meleeRemaining-dt);
 if(reload>0){const next=advanceReload(dt,reload,rounds[selected],reserves[selected],weapons[selected]);reload=next.remaining;rounds[selected]=next.rounds;reserves[selected]=next.reserve;if(next.inserted){gameAudio.play('reload.shell');hud();}}

 if(keys.has('ArrowLeft'))yaw+=dt*1.6;if(keys.has('ArrowRight'))yaw-=dt*1.6;
 let mx=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),mz=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));
 moving=mx!==0||mz!==0;sprinting=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&canSprintWithWeapon(weapons[selected],{moving,aiming,firing,reload});
 handling.update(dt,aiming&&reload<=0&&selected!==3);
 const ads=handling.state.ads,len=Math.hypot(mx,mz)||1,speed=(sprinting?8:5)*(1-ads*.4);
 mx=mx/len*dt*speed;mz=mz/len*dt*speed;
 transport?.tick(dt,camera.position,playerMotion);art.beforeMotion?.(dt,camera.position,playerMotion,enemies);
 const airborne=playerMotion.step(dt,camera.position,mx*Math.cos(yaw)+mz*Math.sin(yaw),-mx*Math.sin(yaw)+mz*Math.cos(yaw),jumpRequested);jumpRequested=false;
 if(IS_TRAIN&&playerMotion.state.y<.25){const e=STAGE_ENTRIES[mission.state.index];camera.position.set(e.x,e.feetY+1.7,e.z);playerMotion.reset(camera.position,e.feetY);mission.interrupt();notify('脱离列车 // 已返回当前阶段入口，重新尝试');}
 if(IS_HARBOR&&playerMotion.state.y<.25&&harborWater(camera.position)){const e=STAGE_ENTRIES[mission.state.index];camera.position.set(e.x,e.feetY+1.7,e.z);playerMotion.reset(camera.position,e.feetY);mission.interrupt();notify('落水重试 // 已返回当前阶段入口，收集记录保留');}
 if(airborne.jumped)gameAudio.play('player.jump');if(airborne.landed)gameAudio.play('player.land');
 camera.rotation.set(THREE.MathUtils.clamp(pitch+handling.state.pitch,-1.45,1.45),yaw+handling.state.yaw,0);
 const fov=74-ads*22+(sprinting?5:0);camera.fov=THREE.MathUtils.lerp(camera.fov,fov,1-Math.exp(-dt*12));camera.updateProjectionMatrix();
 const reloadArc=reload>0?Math.sin((1-reload/weapons[selected].reload)*Math.PI):0;
 const lower=reloadArc*.28+handling.state.switchRemaining*.7;
 gun.position.set(.29-ads*.24,-.28-lower+(moving?Math.sin(elapsed*9)*.006:0),-.68+recoil*.065);
 gun.rotation.set(recoil*.06+reloadArc*.22,.16*(1-ads)+(moving?Math.sin(elapsed*5)*.007:0),selected===3?-recoil*.9:-reloadArc*.55-(sprinting?.15:0));
 const pose=meleePose(meleeRemaining);if(selected===3){gun.position.x+=pose.x;gun.position.y+=pose.y;gun.position.z+=pose.z;gun.rotation.set(pose.pitch,0,pose.roll);}
 sprintBlend+=((sprinting&&selected!==3?(reload>0&&weapons[selected].sprintReload?.55:1):0)-sprintBlend)*(1-Math.exp(-dt*12));
 const runPose=sprintPose(elapsed,sprintBlend,playerMotion.state.grounded);
 gun.position.x+=runPose.x;gun.position.y+=runPose.y;gun.position.z+=runPose.z;gun.rotation.x+=runPose.pitch;gun.rotation.y+=runPose.yaw;gun.rotation.z+=runPose.roll;
 viewModel.animate(selected,recoil,reload>0?1-reload/weapons[selected].reload:0,railCharge.progress);
 gun.scale.setScalar(1);flash.visible=recoil>.6&&selected!==3;
 if(meleePending&&selected===3){
  const contact=meleeStrike.step(previousMelee,meleeRemaining,()=>{
   scene.updateMatrixWorld(true);
   const meshes=enemies.flatMap(e=>e.group.children).concat(obstacles.map(o=>o.mesh),overseer?.targets||[]);
   return meleeSweep.resolve(camera,meshes,object=>object.userData.overseer!==undefined||enemies.some(enemy=>enemy.hp>0&&object.parent===enemy.group),weapons[3].range,obstacles);
  });
  if(contact){meleePending=false;shoot(true,contact.impact);}
 }
 const wantsShot=weapons[selected].automatic?firing||fireBuffer>0:fireBuffer>0;
 if(selected===6){
  railCharge.tick(dt,firing,cooldown<=0&&handling.state.switchRemaining<=0&&reload<=0&&rounds[6]>0,()=>shoot());
  const cue=Math.ceil(railCharge.progress*4);if(cue>railCue)gameAudio.play('rail.charge');railCue=cue;
  if(firing&&rounds[6]===0&&reload<=0&&!railCharge.latched)startReload();
  fireBuffer=0;
 }else if(selected===5){
  const continuing=haloBurst.active;haloBurst.tick(dt,()=>shoot(false,null,true));
  if(continuing)fireBuffer=0;
  else if(wantsShot&&cooldown<=0&&handling.state.switchRemaining<=0&&reload<=0){
   if(haloBurst.begin(rounds[5])){haloBurst.tick(0,()=>shoot(false,null,true));fireBuffer=0;}
   else {startReload();fireBuffer=0;}
  }
 }else if(wantsShot&&shoot())fireBuffer=0;
 enemyFireGate=enemyDirector.update(dt,elapsed,enemyFireGate);
 enemyProjectiles.update(dt,camera.position,previousPlayer);
 const bossDamage=incomingDamage(overseer?.update(dt,camera.position,playerMotion.state.y,true,playerMotion.state.grounded)||0);
 if(bossDamage){overseer.battle.hurt(Math.min(health,bossDamage));fieldRecord.hurt(Math.min(health,bossDamage));achievementUI.attempt.hurt(Math.min(health,bossDamage));health=Math.max(0,health-bossDamage);mission.interrupt();combatUI.damaged(overseer.origin||new THREE.Vector3(0,0,-21));damageTime=.3;gameAudio.hurt(health);hud();}
 art.setBossActive?.(Boolean(overseer?.blocking));
 const hazard=art.hazardDamage?.(dt,{x:camera.position.x,z:camera.position.z,feetY:playerMotion.state.y});if(hazard){fieldRecord.hurt(Math.min(health,hazard.damage));achievementUI.attempt.hurt(Math.min(health,hazard.damage));health=Math.max(0,health-hazard.damage);mission.interrupt();combatUI.damaged(new THREE.Vector3(hazard.x,0,hazard.z));damageTime=.3;gameAudio.play('player.hazard');hud();}
 if(health<=0){end(false);return;}
 missionWorld.collect(camera.position,type=>{
  const supply=supplementVoltSupply(type,supplementRailspikeSupply(type,supplementHaloSupply(type,supplementTempestSupply(type,applySupply(type,health,reserves,weapons),reserves),reserves),reserves),reserves);if(!supply.changed)return false;
  health=supply.health;reserves=supply.reserves;notify(type==='health'?'医疗补给 // 恢复最多 35 点生命':'弹药补给 // 备用弹药已增加');gameAudio.play(type==='health'?'supply.health':'supply.ammo');hud();return true;
 });
 starWorld.update(dt,elapsed,camera.position,true);
 const interaction=interactionStatus();
 const event=mission.tick(dt,{player:camera.position,held:keys.has('KeyE'),clear:enemies.length===0&&!overseer?.blocking,canInteract:interaction.allowed,transportReady:transport?.tripCompleted===true});
 if(event){
  if(event.type==='node'){keys.delete('KeyE');firing=false;fireBuffer=0;notify(event.message);gameAudio.play('objective.node');hud();}
  else if(event.type==='reinforcement'){spawnEncounter(event.stage);notify(event.message);gameAudio.play('reinforcement');hud();}
  else if(event.type==='defense'){
   keys.delete('KeyE');firing=false;fireBuffer=0;
   spawnEncounter({...event.stage,count:event.stage.defenseCount,spawns:event.stage.defenseSpawns||event.stage.spawns,roles:event.stage.defenseRoles||event.stage.roles});
   notify((event.stage.defenseLabel||'权限上传')+'开始 // 留在 '+event.stage.defenseRadius+' 米内防守 '+event.stage.defenseDuration+' 秒 · 可移动射击');gameAudio.play('objective.defense.start');hud();
  }else{
   haloBurst.cancel();cancelRail();enemyProjectiles.clear();keys.delete('KeyE');firing=false;fireBuffer=0;enemyFireGate=0;
   notify(event.finished.message);gameAudio.play(event.complete?'objective.extract':'objective.complete');
   if(event.complete||runMode==='replay'){end(true);return;}
   spawnEncounter(event.next);saveCheckpoint();campaignUI.announce(event.next);hud();
  }
 }


}
function objectiveTarget(){
 if(mission.current.requiresTrip&&!transport?.tripCompleted)return new THREE.Vector3(35,4.75,5);
 const boss=enemies.find(e=>e.boss);
 return mission.current.boss&&boss?boss.group.position.clone().add(new THREE.Vector3(0,2.5,0)):missionWorld.target(mission.current);
}
function interactionStatus(){
 const target=missionWorld.target(mission.current),delta=target.clone().sub(camera.position),distance=delta.length();
 const busy=moving||firing||reload>0||handling.state.switchRemaining>0||!playerMotion.state.grounded;
 const forward=new THREE.Vector3();camera.getWorldDirection(forward);
 const facing=mission.current.id==='extract'||delta.clone().normalize().dot(forward)>.65;
 interactionRay.set(camera.position,delta.normalize());interactionRay.far=Math.max(0,distance-.1);
 const visible=interactionRay.intersectObjects(obstacles.map(o=>o.mesh),false).length===0;
 const levelReady=mission.current.feetY===undefined||Math.abs(playerMotion.state.y-mission.current.feetY)<.35;
 const reason=!levelReady?'请登上高架，到终端所在楼层':mission.current.requiresTrip&&!transport?.tripCompleted?'先从高架乘坐运输车到远端泊位，再修复终端':'';
 return {allowed:!busy&&facing&&visible&&!reason,busy,visible:facing&&visible,reason};
}
rounds=weapons.map(w=>w.cap);reserves=weapons.map(w=>w.reserve);camera.position.set(ARENA.start.x,1.7,ARENA.start.z);hud();
gameMenu=createGameMenu({overlay,journey,campaign,
 getSession:()=>({state,mode:runMode,map:MAP_ID,stage:mission.state.index,stageTitle:mission.current.title,time:mission.state.time,kills,
  checkpoint:runMode==='replay'?replayEntry:runMode==='journey'?journey.data?.checkpoint:campaign.checkpoint,
  pending:Boolean(pendingJourneyResult),navigating}),
 actions:{newGame:startJourney,continueJourney,continueSingle:continueCampaign,startSingle:startSingleChapter,
  resume:()=>enterPlay(),retry:retryStage,openChapter:openMenuChapter,
  quality:value=>{if(![0,1,2].includes(value))return;for(let i=0;i<3&&Number(document.body.dataset.renderQuality)!==value;i++)toggleQuality();}}
});
campaignUI.refresh(state,runMode);refreshJourney();
let last=performance.now(),fpsTime=0,frames=0;
function frame(now){
 const dt=Math.max(0,Math.min((now-last)/1000,.05));last=now;
 gun.visible=state==='playing';
 if(state==='playing')update(dt);
 else starWorld.update(0,elapsed,camera.position,false);
 if(state!=='playing')overseer?.update(0,camera.position,playerMotion.state.y,false);
 transport?.sync(camera.position,state==='playing');
 overseer?.updateMarkers(camera,state==='playing');
 enemyUI.update(state==='playing'?dt:0,state==='playing',camera,enemies,obstacles);
 harborCombatUI?.update(state==='playing',mission,enemies,camera.position);
 campaignUI.update(state==='playing'?dt:0,state==='playing',runMode);
 combatUI.update(state==='playing'?dt:0,{playing:state==='playing',spread:shotSpread(weapons[selected],handling.state.ads,handling.state.heat,moving),heat:handling.state.heat,reloading:reload,reloadDuration:weapons[selected].reload,perShell:weapons[selected].perShell,sprintReload:weapons[selected].sprintReload,burstPending:selected===5?haloBurst.remaining:0,voltSelected:selected===7,railSelected:selected===6,railProgress:railCharge.progress,switching:handling.state.switchRemaining,melee:selected===3,ammo:rounds[selected],reserve:reserves[selected],capacity:weapons[selected].cap,health,player:camera.position,yaw});
 radar.update(dt,state==='playing',camera.position,yaw,enemies,enemyProjectiles.positions(),mission.current,missionWorld.available);
 const missionInteraction=state==='playing'?interactionStatus():{busy:false,visible:false};
 missionUI.update({playing:state==='playing',mission,camera,yaw,target:objectiveTarget(),remaining:enemies.length+(overseer?.blocking?1:0),canInteract:missionInteraction.visible,busy:missionInteraction.busy,blockedReason:missionInteraction.reason,markerLabel:mission.current.requiresTrip&&!transport?.tripCompleted?'乘车前往远端检修终端':null});
 missionWorld.update(elapsed,mission.state.index,mission.state.defending,mission.state.node,camera);
 if(reactor)reactor.rotation.y=Math.sin(now*.0002)*.04;
 art.update(state==='playing'||state==='ready'?dt:0,state==='ready'?now*.001:elapsed);
 const heading=((Math.round(-yaw*180/Math.PI)%360)+360)%360;compass.firstChild.textContent=String(heading).padStart(3,'0')+'° / '+['N','NE','E','SE','S','SW','W','NW'][Math.round(heading/45)%8];
 for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0){const m=effects[i].mesh;scene.remove(m);m.geometry.dispose();m.material.dispose();effects.splice(i,1);}}
 toastTime=Math.max(0,toastTime-dt);toast.style.opacity=toastTime>0?'1':'0';damageTime=Math.max(0,damageTime-dt);damageScreen.style.opacity=damageTime*2;hitTime=Math.max(0,hitTime-dt);hit.style.opacity=hitTime>0?'1':'0';
 if(streakTime>0){streakTime-=dt;if(streakTime<=0)streakBanner.dataset.show='false';}
 gameAudio.setListener(camera.position.x,camera.position.z,yaw);gameAudio.update(dt,{playState:state,health,enemiesNear:enemies.reduce((n,e)=>n+(e.group.position.distanceToSquared(camera.position)<45*45?1:0),0),bossActive:Boolean(overseer?.blocking||enemies.some(e=>e.boss)),defending:mission.state.defending===true,extracting:mission.state.extracting===true});
 frames++;fpsTime+=Math.min((now-(frame.previousNow||now))/1000,1);frame.previousNow=now;if(fpsTime>.5){$('#fps').textContent=Math.round(frames/fpsTime);frames=0;fpsTime=0;}
 achievementUI.update(state);
 presentation.update(dt,yaw,pitch,state);
 document.body.dataset.combatDifficulty=currentDifficulty().id;$('.boss-note').textContent=mission.current.title+' · '+currentDifficulty().label;
 gameMenu.update(state);
 renderer.render(scene,camera);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
