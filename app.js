import {createTypedAmmo,AMMO_NAMES} from './typed-ammo.js';
import {createTypedAmmoUI} from './typed-ammo-ui.js';
import {createWeaponWorkshop} from './weapon-mods-ui.js';
import {freshWeaponMods} from './weapon-mods-rules.js';
import {createP4Runtime,p4Requested,p4MemoryStorage,p4AchievementStub,p4Damage} from './p4-runtime.js';
let p4=null;
const p4Incoming=n=>incomingDamage(n,p4?.difficulty)*(p4?.params.incoming??1)/(p4?.params.health??1);
const p4Outgoing=(n,zone)=>p4Damage(outgoingDamage(n,p4?.difficulty),p4?.params,zone);
const p4Cooldown=n=>attackCooldown(n,p4?.difficulty)*(p4?.params.enemyCooldown??1);
import {haloDamageMultiplier} from './weapons/halo-rules.js';
import {createOrdnance} from './ordnance-world.js';
import {ORDNANCE,cinderDamage,interruptBreakerBoss} from './ordnance-rules.js';
import {createMortarMarkers} from './mortar-world.js';
import {rusherBlastDamage,mortarStrike,RUSHER} from './squad.js';
import {createTacticalThrowables as createEmpSystem} from './tactical-system.js';
import {TACTICAL,tacticalFalloff} from './tactical-rules.js';
import {createEmpUI} from './emp-ui.js';
import {createEngineerDirector} from './engineer-director.js';
import {chooseSentrySite} from './sentry-rules.js';
import {chooseSwarmSite,swarmFormation} from './swarm-rules.js';
import {chooseVoltChain} from './weapons/volt-rules.js';
import {voltAnchor,voltClearPath,createVoltArc} from './volt-world.js';
import {voltCheckpoint,supplementVoltSupply} from './weapons/runtime.js';
import {createRailCharge,selectRailImpacts} from './weapons/railspike-rules.js';
import {railspikeCheckpoint,supplementRailspikeSupply} from './weapons/runtime.js';
import {createRailPanels} from './rail-panels.js';
import {createDestructibles} from './destructibles.js';
import {createBarrels} from './barrel-world.js';
import {FIELD_LAYOUTS} from './field-layouts.js';
import {createEnergyNodes} from './energy-nodes.js';
import {EXECUTION,executable,createExecution,createExecutionStagger} from './execution-rules.js';
import {createFieldKit} from './field-kit.js';
import {defaultKit} from './field-kit-rules.js';
import {DEFAULT_LOADOUT,createLoadoutState} from './loadout-rules.js';
import {createLoadoutWorld} from './loadout-world.js';
import {createWeaponDrops} from './weapon-drops.js';
import {BARREL,blastDamage,blastVisible} from './barrel-rules.js';
import {createHaloBurst,registerHaloWeakHit,stepHaloMark} from './weapons/halo-rules.js';
import {haloCheckpoint,supplementHaloSupply} from './weapons/runtime.js';
import {createRuntimeWeapons,canSprintWithWeapon,tempestCheckpoint,restoreRuntimeAmmo,supplementTempestSupply,legacySelected} from './weapons/runtime.js';
import {DIFFICULTIES,currentDifficulty,incomingDamage,outgoingDamage,attackCooldown} from './combat-difficulty.js';
import {createMeleeSweep} from './melee-sweep.js';
import {createParry} from './parry-rules.js';
import {createParryUI} from './parry-ui.js';
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
import {createSwitchyardWorld} from './switchyard-world.js';
import {createElevatorWorld} from './elevator-world.js';
import {createSkyhookWorld} from './skyhook-world.js';
import {createLeviathanWorld} from './leviathan-world.js';
import {createGlacierWorld} from './glacier-world.js';
import {createChapterCues,chapterSnapshot} from './chapter-cues.js';
import {createPolarWorld} from './polar-world.js';
import {createPolarNavigation} from './polar-navigation.js';
import {createAbyssWorld} from './abyss-world.js';
import {createDatacenterWorld} from './datacenter-world.js';
import {createDatacenterNavigation} from './datacenter-navigation.js';
import {createOrbitalWorld} from './orbital-world.js';
import {createOrbitalNavigation} from './orbital-navigation.js';
import {createPlayerMotion} from './player-motion.js';
import {createJourneyStore,CHAPTERS} from './journey.js';
import {createGameMenu} from './menu-ui.js';
import {chapterURL} from './menu-state.js';
import {createRoofWorld} from './roof-world.js';
import {IS_STATION,IS_ROOF,IS_TOWER,IS_TRAIN,IS_HARBOR,IS_ORBITAL,IS_DATACENTER,IS_POLAR,IS_JOURNEY,MAP_ID,createLevelMenu} from './level.js';
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
import { STAGES, SUPPLIES, createMission, applySupply, chooseEncounterSpawns } from './mission.js';
import { createMissionWorld } from './mission-world.js';
import { createMissionUI } from './mission-ui.js';
import { createCampaignStore, STAGE_ENTRIES } from './campaign.js';
import { createCampaignUI } from './campaign-ui.js';

const fieldRecord=createFieldRecord();
const telemetry=createTelemetry();let telemetryAttempt=null,telemetryShots=[0,0,0,0,0,0,0,0];
window.neonTelemetry=telemetry;
// Test-only probe (chapter 07 browser test): read feet height / boss state and place the player. No game-state writes beyond position.
if(IS_DATACENTER)window.__datacenterProbe=()=>({feetY:playerMotion.state.y,x:camera.position.x,z:camera.position.z,stage:mission.state.index,level:art.level,phase:art.phase,pumps:art.pumps,speedScale:art.moveScale(playerMotion.state.y),shorted:art.shorted(selected,playerMotion.state.y),toast:toast.textContent,bossBlocking:Boolean(overseer?.blocking),place(x,z,feetY=0,facing=0){camera.position.set(x,feetY+1.7,z);playerMotion.reset(camera.position,feetY);yaw=facing;},advanceWater(seconds){art.advance(seconds);}});
// Test-only probe (chapter 09 browser test): storm clock / warmth / boss state; place the player; advance the clock. Only on ?map=polar.
if(IS_POLAR)window.__polarProbe=()=>({feetY:playerMotion.state.y,x:camera.position.x,z:camera.position.z,stage:mission.state.index,phase:art.phase,intensity:art.intensity,thermal:art.thermal,warmth:art.warmth,visibility:art.visibility,fogDensity:scene.fog.density,health,toast:toast.textContent,bossBlocking:Boolean(overseer?.blocking),bossPhase:overseer?.state?.phase??null,bossPosition:overseer?.position??null,place(x,z,feetY=0,facing=0){camera.position.set(x,feetY+1.7,z);playerMotion.reset(camera.position,feetY);yaw=facing;},advanceStorm(seconds){art.advance(seconds);},setWarmth(v){art.setWarmth(v);},heal(){health=100;hud();},placeBoss(x,z){overseer?.place?.(x,z);},advanceBoss(seconds){overseer?.advance?.(seconds,{x:camera.position.x,z:camera.position.z},playerMotion.state.y);}});
if(IS_ORBITAL)window.__orbitalProbe=()=>({feetY:playerMotion.state.y,stage:mission.state.index,bossBlocking:Boolean(overseer?.blocking),place(x,z,feetY=0,facing=0){camera.position.set(x,feetY+1.7,z);playerMotion.reset(camera.position,feetY);yaw=facing;}});
const meleeSweep=createMeleeSweep(),meleeStrike=createMeleeStrike(),haloBurst=createHaloBurst(),railCharge=createRailCharge();let railCue=0;
function cancelRail(){railCharge.cancel();railCue=0;}
let gameMenu=null,navigating=false;
const $ = s => document.querySelector(s);
const overlay = document.createElement('section');
overlay.className = 'mission-overlay';
overlay.innerHTML = `<div class="mission-card"><span id="session-eyebrow" class="eyebrow">NEON ECLIPSE / SECTOR K-19</span><h2 id="session-title">突破<span>暗影封锁</span></h2><p id="brief">启动西侧冷却装置，取得东侧权限，解除反应堆封锁。击败 Warden 后返回南部撤离。橙色突击、紫色远程、金色重装：识别敌人，选择打法。</p><div class="controls"><span><b>W A S D</b>移动</span><span><b>鼠标</b>瞄准 / 左键射击</span><span><b>1 — 6</b>切换武器</span><span><b>R / SHIFT</b>换弹 / 冲刺</span><span><b>SPACE / ESC</b>跳跃 / 暂停</span><span><b>右键 / E</b>瞄准 / 按住交互</span></div><button id="deploy">开始行动 ↗</button><small id="lock-note">G 按住预览 / 松开投掷无伤害 EMP · SPACE 跳跃 · 步枪按住连射 · E 交互 · 红色加号补给恢复生命，子弹标识补给补充弹药</small></div>`;
document.body.append(overlay);createLevelMenu();
if(IS_STATION){$('#session-title').innerHTML='地下<span>运输站</span>';$('#brief').textContent='从维护通道恢复供电，清理站台，穿过停靠列车，完成调度防守后操作编号道岔，让维护列车撞开 SWITCHYARD 护盾，攻击青色核心，再登末班列车撤离。检查点仍按原五阶段保存。';$('#session-eyebrow').textContent='NEON ECLIPSE / U-02';$('.topstat').textContent='CHAPTER 02 / UNDERGROUND TRANSIT';}
if(IS_ROOF){$('#session-title').innerHTML='天穹<span>通讯枢纽</span>';$('#brief').textContent='进入露天天线阵列，依次接通双中继、接管天线并上传信号。躲开放电区，最后返回南部升降平台撤离。';$('#session-eyebrow').textContent='NEON ECLIPSE / A-03';$('.topstat').textContent='CHAPTER 03 / SKYLINK ARRAY';}
if(IS_TOWER){$('#session-title').innerHTML='多层<span>中枢塔</span>';$('#brief').textContent='解除大厅隔离，沿金色台阶逐层攀升至三米设备层和六米核心层。守住中枢隔离链路，再到东侧战斗升降井逐层击破 ELEVATOR 动力锁，最后返回大厅撤离。';$('#session-eyebrow').textContent='NEON ECLIPSE / C-04';$('.topstat').textContent='CHAPTER 04 / CONTROL SPIRE';}
if(IS_TRAIN){$('#session-title').innerHTML='疾驰<span>货运列车</span>';$('#brief').textContent='穿越高速列车车厢，登上车顶关闭干扰器，守住控制链路，最后进入驾驶舱完成接应。跌落会返回当前阶段入口。';$('#session-eyebrow').textContent='NEON ECLIPSE / T-05';$('.topstat').textContent='CHAPTER 05 / RUNAWAY FREIGHT';}
if(IS_HARBOR){$('#session-title').innerHTML='风暴<span>港口</span>';$('#brief').textContent='穿越集装箱堆场，登上吊机高架，守住码头信标，最后登船撤离。落水会返回当前阶段入口，星星探索不影响主线。';$('#session-eyebrow').textContent='NEON ECLIPSE / H-06';$('.topstat').textContent='CHAPTER 06 / STORM HARBOR';}
if(IS_ORBITAL){$('#session-title').innerHTML='轨道<span>电梯基座</span>';$('#brief').textContent='基座分三段重力：越高越轻，跳得更高、后坐更大。解除门禁，登上四米环与九米环，守住锚索校准，击破 TETHER 三段稳定器后攻击核心，返回升降平台撤离。';$('#session-eyebrow').textContent='NEON ECLIPSE / O-07';$('.topstat').textContent='CHAPTER 07 / ORBITAL TETHER BASE';}
if(IS_POLAR){$('#session-title').innerHTML='极地<span>雷达阵列</span>';$('#brief').textContent='雪原每四十秒一场暴风雪：能见度十米、敌人靠热成像。体温持续流失，暖房与塔顶加热板回温。接通三座雷达塔，把重炮机甲 GLACIER 引上中央薄冰压碎冰面击沉，返回暖房撤离。';$('#session-eyebrow').textContent='NEON ECLIPSE / P-09';$('.topstat').textContent='CHAPTER 09 / POLAR RADAR ARRAY';}
if(IS_DATACENTER){$('#session-title').innerHTML='沉没<span>数据中心</span>';$('#brief').textContent='机房定时涨水：水中移速减半、能量武器短路，基座顶始终干燥。解除进气闸，启动并守住两台排水泵，在排水窗口击破 ABYSS 核心，返回进气闸撤离。';$('#session-eyebrow').textContent='NEON ECLIPSE / D-08';$('.topstat').textContent='CHAPTER 08 / SUNKEN DATA CENTER';}
const handling=createHandling();
const combatUI=createCombatUI();
const mission=createMission();
const missionUI=createMissionUI();
const enemyUI=createEnemyUI();
const harborCombatUI=IS_HARBOR?createHarborCombatUI():null;
const campaign=createCampaignStore(p4Requested()?p4MemoryStorage():undefined);
const journey=createJourneyStore(p4Requested()?p4MemoryStorage():undefined);
const campaignUI=createCampaignUI(campaign,{continue:continueCampaign,retry:retryStage,replay:startReplay});
const achievementUI=p4Requested()?p4AchievementStub():createAchievementUI(MAP_ID,()=>{if(pendingJourneyResult){gameMenu?.error('本章结果尚未保存，请先返回结算重试保存。');return;}startSingleChapter();});
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
if(IS_POLAR){stamp.innerHTML='<strong>POLAR ARRAY</strong><span>P-09 / WHITEOUT CYCLE<br>三塔 · 暖房 · 薄冰 · GLACIER</span>';stamp.classList.add('polar-stamp');}
if(IS_DATACENTER){stamp.innerHTML='<strong>SUNKEN DATA</strong><span>D-08 / TIDAL FLOODING<br>进气闸 · 双泵 · ABYSS · 撤离</span>';stamp.classList.add('datacenter-stamp');}
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
const art=IS_POLAR?createPolarWorld(scene,renderer,obstacles):IS_DATACENTER?createDatacenterWorld(scene,renderer,obstacles):IS_ORBITAL?createOrbitalWorld(scene,renderer,obstacles):IS_HARBOR?createHarborWorld(scene,renderer,obstacles):IS_TRAIN?createTrainWorld(scene,renderer,obstacles):IS_TOWER?createTowerWorld(scene,renderer,obstacles):IS_ROOF?createRoofWorld(scene,renderer,obstacles):IS_STATION?createStationWorld(scene,renderer,obstacles):buildReactor();
const fieldLayout=FIELD_LAYOUTS[MAP_ID];
const railPanels=fieldLayout?createRailPanels(scene,obstacles,fieldLayout.panels):[];
const presentation=createPresentation({renderer,scene,sun,art,camera,qualityButton,record:fieldRecord});
const overseer=IS_POLAR?createGlacierWorld(scene,obstacles,art):IS_DATACENTER?createAbyssWorld(scene,obstacles,art):IS_ORBITAL?createTetherWorld(scene,obstacles):IS_ROOF?createOverseerWorld(scene,obstacles):IS_STATION?createSwitchyardWorld(scene,obstacles,{onEvent:event=>{
 const sounds={'started':'boss.phase','switch.armed':'objective.node','train.warning':'rail.charge','train.moving':'enemy.fire','window.opened':'boss.window.open','window.closed':'boss.window.close','blast.warning':'rail.charge','blast.impact':'bolt.wall','defeated':'objective.complete'};
 if(sounds[event])gameAudio.play(sounds[event]);
 if(event==='started')notify('SWITCHYARD 接管调度 // 操作亮起编号的道岔，让维护列车破盾');
}}):IS_TOWER?createElevatorWorld(scene,obstacles,{getPlayerFeet:()=>playerMotion.state.y,onEvent:event=>{
 const sounds={'started':'boss.phase','lift.moving':'rail.charge','lift.docked':'objective.node','window.opened':'boss.window.open','window.closed':'boss.window.close','unit.broken':'boss.phase','beam.warning':'rail.charge','beam.impact':'bolt.wall','defeated':'objective.complete'};
 if(sounds[event])gameAudio.play(sounds[event]);
 if(event==='started')notify('ELEVATOR 接管升降井 // 前往东侧 0m 检修台，逐层击破动力锁');
}}):IS_TRAIN||IS_HARBOR?(IS_TRAIN?createSkyhookWorld:createLeviathanWorld)(scene,obstacles,{getPlayerFeet:()=>playerMotion.state.y,onEvent:event=>{
 const sounds={'started':'boss.phase','mechanic.started':'rail.charge','window.opened':'boss.window.open','window.closed':'boss.window.close','unit.broken':'boss.phase','phase.ready':'objective.node','attack.warning':'rail.charge','attack.impact':'bolt.wall','defeated':'objective.complete'};
 if(sounds[event])gameAudio.play(sounds[event]);
 if(event==='started')notify(IS_TRAIN?'SKYHOOK 追击 // 返回控制车顶，操作牵引绞盘':'LEVIATHAN 封锁港区 // 返回吊机高架，依序吊箱破甲');
}}):null;
const transport=IS_ROOF?createTransportWorld(scene,art.ceilings,obstacles):null;
const bossRecordUI=IS_TRAIN||IS_HARBOR||IS_TOWER||IS_STATION||IS_ROOF||IS_ORBITAL||IS_DATACENTER||IS_POLAR?createBossRecordUI(document.querySelector('.mission-card')):null;
if(!p4Requested())createHiddenWorld(scene,MAP_ID,obstacles);
const missionWorld=createMissionWorld(scene,obstacles);
const starWorld=p4Requested()?{update(){}}:createStarWorld(scene,MAP_ID,notify);
const navigation=createNavigator(obstacles);
const destructibles=railPanels.length?createDestructibles(scene,obstacles,railPanels,{idPrefix:MAP_ID,onTopologyChange:()=>navigation.invalidate(),onBreak:mesh=>gameAudio.play('melee.hit',{position:{x:mesh.position.x,z:mesh.position.z}})}):null;
const barrels=fieldLayout?createBarrels(scene,obstacles,{idPrefix:MAP_ID,positions:fieldLayout.barrels,onTopologyChange:()=>navigation.invalidate(),onBlast:applyBarrelBlast}):null;
const roofEnemyNavigation=IS_POLAR?createPolarNavigation(obstacles):IS_DATACENTER?createDatacenterNavigation(obstacles):IS_ORBITAL?createOrbitalNavigation(obstacles):IS_HARBOR?createHarborNavigation(obstacles):IS_TRAIN?createTrainNavigation(obstacles):IS_TOWER?createTowerNavigation(obstacles):IS_ROOF?createRoofEnemyNavigation(obstacles,navigation):null;
const playerMotion=createPlayerMotion(obstacles,art.ceilings||playerCeilings,IS_POLAR||IS_DATACENTER||IS_ORBITAL||IS_HARBOR?{x:37.1,z:37.1}:IS_TRAIN?{x:14,z:37.1}:IS_TOWER?{x:29,z:23}:IS_ROOF?{x:37.1,z:37.1}:IS_STATION?{x:31.1,z:37.1}:{x:39.1,z:39.1},{gravityAt:art.gravityAt||null});
let jumpRequested=false,pendingJourneyResult=null;
const radar=createRadar(obstacles);
const parry=createParry(),parryUI=createParryUI(),parryForward=new THREE.Vector3();
const enemyProjectiles=createEnemyProjectiles(scene,obstacles,(damage,source)=>{
 if(execution.invulnerable)return;damage=p4Incoming(damage);ordnance.cancelCharge();fieldRecord.hurt(Math.min(health,damage));achievementUI.attempt.hurt(Math.min(health,damage));health=Math.max(0,health-damage);mission.interrupt();combatUI.damaged(source);damageTime=.3;gameAudio.hurt(health);hud();
},(position,color,count)=>{art.burst(position,color,count);if(color!==0xff5435)gameAudio.play('bolt.wall',{position:{x:position.x,z:position.z}});},{
 resolveTarget:(origin,target,boss,owner)=>emp.attackTarget(origin,target,boss,owner),allowPending:(origin,target,boss,owner)=>emp.allowPending(origin,target,boss,owner),
 onQueue:(origin,attack,boss)=>gameAudio.telegraph(attack.color,{x:origin.x,z:origin.z},boss?false:!lineOfSight(origin)),
 onEmit:(origin)=>gameAudio.play('enemy.fire',{position:{x:origin.x,z:origin.z}}),
 maxAttackers:3,
 tryParry:(bolt,time)=>{const accepted=state==='playing'&&selected===3&&parry.intercept(bolt,time,camera.getWorldDirection(parryForward));if(accepted){gameAudio.play('hit.armor');p4?.parry?.();}return accepted;},
 getReflectTargets:()=>enemies.filter(e=>e.hp>0).flatMap(e=>e.group.children).concat(overseer?.targets||[]),
 onObstacleHit:(obstacle,bolt)=>{const damage=bolt.reflected?p4Outgoing(bolt.damage):p4Incoming(bolt.damage);destructibles?.hit(obstacle.mesh,damage);energyNodes?.hit(obstacle.mesh,damage);barrels?.hit(obstacle.mesh,damage,{player:bolt.reflected,weapon:bolt.reflected?3:null});},
 onReflectHit:applyParryHit
});
const viewModel=createWeapons(camera);
const {gun,flash}=viewModel;
const weapons=createRuntimeWeapons();
const typedAmmo=createTypedAmmo({enabled:!p4Requested()}),typedAmmoUI=createTypedAmmoUI(typedAmmo);
function syncTypedAmmo(){reserves=typedAmmo.mirror(reserves,weapons);}
function supplyWeapon(){return selected===3?loadout.state.primary:loadout.state.primary>=9&&selected===2?loadout.state.primary:selected;}
let meleeRemaining=0,meleePending=false,sprintBlend=0;
let runMode=IS_JOURNEY?'journey':'campaign',replayEntry=null;
let state='ready',wave=1,health=100,kills=0,selected=0,cooldown=0,reload=0,recoil=0;
let yaw=0,pitch=0,firing=false,aiming=false,elapsed=0,toastTime=0,damageTime=0,hitTime=0;
let fireBuffer=0,moving=false,sprinting=false,enemyFireGate=0;
const keys=new Set(), enemies=[], effects=[], ray=new THREE.Raycaster();
const interactionRay=new THREE.Raycaster();
const lookInput=createLookInput();
let rounds=[], reserves=[],ammoHudKey='';
const gameAudio=createGameAudio({storage:localStorage});window.neonAudio=gameAudio;
const energyNodes=fieldLayout?.nodes.length?createEnergyNodes(scene,obstacles,fieldLayout.nodes,{enemies,projectiles:enemyProjectiles,onTopologyChange:()=>navigation.invalidate(),onPulse:n=>{gameAudio.play('hit.armor');notify('EMP节点放电 // '+n+'个机械目标瘫痪3秒');}}):null;
const execution=createExecution(),executionStagger=createExecutionStagger(e=>{enemyProjectiles.cancelOwner(e.group);e.charge=0;});let executionHint='',executionHintTime=0;
const fieldKit=createFieldKit({scene,camera,gun,weapons,enabled:!!fieldLayout,onRestart:()=>startSingleChapter(),getTargets:()=>enemies.filter(e=>e.hp>0).flatMap(e=>e.group.children).concat(obstacles.map(o=>o.mesh),overseer?.targets||[]),onFire:()=>{p4?.shot(8);fieldRecord.shot();achievementUI.attempt.shot(8);gameAudio.play('fire.railspike');},onImpact:(point)=>{
 const cover=obstacles.slice();const props=cover.filter(o=>barrels?.isTarget(o.mesh)||energyNodes?.isTarget(o.mesh)).map(o=>({mesh:o.mesh,damage:blastVisible(point,o.mesh.position,cover,o.mesh)?blastDamage(point,o.mesh.position):0}));
 applyBarrelBlast(point,{player:true,weapon:8,p4Direct:true},cover);for(const p of props){barrels?.hit(p.mesh,p.damage,{player:true,weapon:8});energyNodes?.hit(p.mesh,p.damage);}
}});
const ordnance=createOrdnance({reserveSource:typedAmmo,getProfile:index=>workshop.heavy(index),scene,camera,gun,entries:STAGE_ENTRIES,getStage:()=>mission.state.index,getPrimary:()=>loadout.state.primary,getMelee:()=>loadout.state.melee,getSelected:()=>selected,obstacles,hasSight:lineOfSight,isBusy:()=>loadout.unsupported||loadoutBusy(),isNoticeVisible:()=>toastTime>0,onPickup:index=>{if(index===11){if(loadout.equipMelee(11))changeWeapon(3);}else if(loadout.equip(index))changeWeapon(2);hud();},onFire:index=>{p4?.shot(index);if(index===11){achievementUI.attempt.nonBlade();overseer?.battle.shot(3);gameAudio.play('melee.swing');}else{fieldRecord.shot();achievementUI.attempt.shot(index);overseer?.battle.shot(index);gameAudio.play('fire.railspike');}},onBlast:cinderBlast,onRay:ordnanceRay,notify});
const loadout=createLoadoutState({heavySupported:!!fieldLayout,canEquipHeavy:index=>ordnance.owns(index)});
const loadoutBusy=()=>emp.active||emp.aiming||ordnance.active||ordnance.busy||fieldKit.active||fieldKit.busy||execution.active||meleePending||reload>0||cooldown>0||haloBurst.active||railCharge.progress>0;
const loadoutWorld=createLoadoutWorld({scene,camera,entries:STAGE_ENTRIES,loadout,weapons,heavySupported:!!fieldLayout,ordnance,getState:()=>state,hasSight:lineOfSight,isNoticeVisible:()=>toastTime>0,isBusy:loadoutBusy,getThrowableStock:()=>({...emp.snapshot().charges,emp:emp.checkpoint().emp.charges}),onEquip:()=>{emp.cancelAim();if(!loadout.allows(selected))changeWeapon(loadout.first());hud();p4?.equipmentChanged?.();}});
const workshop=createWeaponWorkshop({weapons,base:createRuntimeWeapons(),disabled:p4Requested(),heavySupported:!!fieldLayout,onRestart:()=>startSingleChapter(),getUnlocks:()=>({stars:starWorld.store?.collected.length||0,awards:achievementUI.store?.read().awards?.length||0})});
const weaponDrops=createWeaponDrops({scene,camera,loadout,weapons,hasSight:lineOfSight,isNoticeVisible:()=>toastTime>0||ordnance.cacheInReach,isBusy:loadoutBusy,notify,onEquip:index=>changeWeapon(index)});
// Chapter 07/08/09 audio cues (Phase 2 debt): diff world/boss state each frame, play catalog sfx. Pure module, no world changes.
const chapterCues=createChapterCues((name,opts)=>gameAudio.play(name,opts));
let streakTime=0;const streakBanner=document.createElement('div');streakBanner.className='streak-banner';document.body.append(streakBanner);
function showStreak(step){if(!step)return;streakBanner.textContent=step>=10?'连续击破 ×10 // 清场':step>=5?'连续击破 ×5 // 压制':'连续击破 ×3';streakBanner.dataset.step=String(step);streakBanner.dataset.show='true';streakTime=1.6;}
function lineOfSight(origin){ray.set(camera.position,origin.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(origin);return !obstacles.some(o=>ray.intersectObject(o.mesh,false).length);}
const mortarMarkers=createMortarMarkers(scene);
function environmentHurt(damage,point,sound='player.hazard'){if(damage<=0||execution.invulnerable)return;damage=Math.min(health,p4Incoming(damage));ordnance.cancelCharge();fieldRecord.hurt(damage);achievementUI.attempt.hurt(damage);health=Math.max(0,health-damage);mission.interrupt();combatUI.damaged(point);damageTime=.3;gameAudio.play(sound);gameAudio.hurt(health);hud();}
function rusherBlast({enemy,x,y,z,radius,damage}){const point=new THREE.Vector3(x,y+.9,z);art.burst(point,0xff3b3b,36);gameAudio.play('vehicle.impact',{position:{x,z}});const cover=obstacles.slice();
 if(blastVisible(point,camera.position,cover))environmentHurt(rusherBlastDamage(camera.position.distanceTo(point),{radius,damage}),point);
 for(const e of enemies){if(e===enemy||e.hp<=0||e.boss)continue;const anchor=voltAnchor(e),dealt=rusherBlastDamage(anchor.distanceTo(point),{radius,damage:RUSHER.selfKillDamage});if(dealt>0&&blastVisible(point,anchor,cover.filter(o=>o.owner!==e.group))){e.hp-=dealt;if(e.hp<=0){enemyProjectiles.cancelOwner(e.group);art.burst(anchor,0xffad68,24);weaponDrops.drop(e);disposeGroup(e.group);enemies.splice(enemies.indexOf(e),1);kills++;}}}
 notify('自爆奔袭者起爆 // 波及 '+radius+'m');}
function mortarEvent(m){if(m.type==='telegraph'){mortarMarkers.telegraph({x:m.x,z:m.z,radius:m.radius,seconds:m.seconds,owner:m.owner,y:playerMotion.state.y});gameAudio.telegraph('orange',{x:m.x,z:m.z},false);return;}
 const point=new THREE.Vector3(m.x,playerMotion.state.y,m.z);art.burst(point.clone().add(new THREE.Vector3(0,.6,0)),0xff6a3d,40);gameAudio.play('vehicle.impact',{position:{x:m.x,z:m.z}});
 const feet=new THREE.Vector3(camera.position.x,playerMotion.state.y,camera.position.z);if(Math.abs(feet.y-point.y)<2.2)environmentHurt(mortarStrike(point,feet,{radius:m.radius,damage:m.damage}),point);}
const enemyDirector=createEnemyDirector({onRusherBlast:rusherBlast,onMortar:mortarEvent,scaleCooldown:p4Cooldown,onEliteWindow:()=>fieldRecord.window(),thermalVision:IS_POLAR?()=>art.thermal:null,enemies,player:camera,navigation,vertical:roofEnemyNavigation,move,obstacles,projectiles:enemyProjectiles,onBossEvent:(enemy,event)=>{
 if(event.changed){notify('Warden 阶段切换 // '+BOSS_PHASES[enemy.bossState.phase].name);gameAudio.play('boss.phase');}
 else if(event.opened){notify('Warden 过载 // 青色胸口核心暴露，集中攻击！');gameAudio.play('boss.window.open');}
 else if(event.closed)gameAudio.play('boss.window.close');
 hud();
}});
function notify(text){toast.textContent=text;toastTime=3;}
function ammoHud(){
 typedAmmoUI.render(state==='playing',selected,supplyWeapon());
 const heavy=fieldKit.busy,key=[heavy,fieldKit.heavy,selected,rounds[selected],reserves[selected],typedAmmo.enabled?typedAmmo.available(selected):0].join(':');if(key===ammoHudKey)return;ammoHudKey=key;
 $('#player-hud .ammo').dataset.weapon=heavy?'heavy':selected===3?'melee':'firearm';$('#ammo').textContent=heavy?fieldKit.heavy:Number.isFinite(rounds[selected])?rounds[selected]:'∞';
 $('.ammo i').textContent=heavy?' / 2':selected===3?' / —':` / ${typedAmmo.enabled?typedAmmo.available(selected):reserves[selected]}`;
 $('.ammo span').textContent=heavy?'H / 重型脉冲炮':selected===3?'近战':selected===4?'TEMPEST / 机动冲锋':selected===5?'HALO / 三连点射':selected===6?'RAILSPIKE / 蓄力穿透':selected===7?'VOLT / 电弧霰弹':'弹药';
}
function hud(){
 $('#health').textContent=Math.ceil(health); $('#healthbar').style.width=`${health}%`;
 $('#player-hud .health').dataset.low=String(health<=25);ammoHud();
 $('.boss-note').textContent=mission.current.title;
 viewModel.select(selected);
 document.querySelectorAll('.loadout-card').forEach((el,i)=>{el.classList.toggle('active',i===selected&&!(i===3&&loadout.state.melee===11));el.classList.toggle('kit-unavailable',!loadout.allows(i)||i===3&&loadout.state.melee===11);});
}
function disposeGroup(group){if(group.userData.sentry){for(let i=obstacles.length-1;i>=0;i--)if(obstacles[i].owner===group)obstacles.splice(i,1);navigation.invalidate();}group.traverse(o=>{if(o.geometry)o.geometry.dispose();});group.userData.ownedMaterials?.forEach(m=>m.dispose());scene.remove(group);}
function addSentry(p){
 if(enemies.some(e=>e.hp>0&&e.type==='sentry'))return false;
 const group=createEnemyModel('sentry'),profile=ENEMY_TYPES.sentry;group.position.set(p.x,p.y,p.z);group.rotation.y=Math.atan2(camera.position.x-p.x,camera.position.z-p.z);scene.add(group);
 enemies.push({group,type:'sentry',hp:profile.hp,maxHp:profile.hp,boss:false,speed:0,attack:1.5,radius:profile.radius,charge:0,seed:0,sentryHome:group.rotation.y,sentryScan:0});
 obstacles.push({x:p.x,z:p.z,w:1.2,d:1.2,h:.45,bottom:0,top:.45,mesh:group.userData.parts.base,owner:group});navigation.invalidate();return true;
}
const empUI=createEmpUI();
const emp=createEmpSystem({scene,camera,enemies,obstacles,projectiles:enemyProjectiles,getKind:()=>loadout.state.throwable,onPulse:point=>cinderBlast(point,{radius:6,damage:70,selfDamage:18,index:12}),onUtility:(event,kind,count)=>{if(event==='throw'&&kind==='pulse'){achievementUI.attempt.nonBlade('脉冲手雷');p4?.nonGhost?.();}notify(TACTICAL[kind].name+(event==='throw'?'已投出 // 1.2s 引信':kind==='pulse'?'爆发 // '+count+' 个普通敌人致盲2秒':kind==='decoy'?'信标上线 // 4秒诱导普通敌人瞄准':'烟幕展开 // 5秒阻断远程锁定，不挡已发弹丸'));gameAudio.play(event==='throw'?'rail.charge':'volt.chain');},onEvent:(event,count)=>{
 if(event==='throw'){notify('EMP 已投出 // 1.2s 引信 · 6m 球形范围 · 不影响纯刀');gameAudio.play('rail.charge');}
 else {notify('EMP 脉冲 // '+count+' 个目标受冲击 · 机械失能3s / 护盾破6s · Boss 与工程兵免疫');gameAudio.play('volt.chain');}
}});
function empReady(){return !ordnance.busy&&!execution.active&&!fieldKit.busy&&state==='playing'&&!firing&&reload<=0&&handling.state.switchRemaining<=0&&meleeRemaining<=0&&haloBurst.remaining===0&&railCharge.progress===0;}
const engineerDirector=createEngineerDirector({scene,enemies,player:camera,obstacles,projectiles:enemyProjectiles,protectedPoints:()=>[...SUPPLIES,mission.current].filter(Boolean),deploy:addSentry,canStart:()=>MAP_ID==='reactor'&&mission.state.defending&&enemyFireGate<=0&&!enemyProjectiles.charging&&!enemyProjectiles.hasThreatTag('sentry'),onEvent:(event,e)=>{
 if(event==='started'){enemyFireGate=Math.max(enemyFireGate,2.7);notify('工程兵正在部署炮塔 // 琥珀施工框 2.5s · 命中工程兵可打断');gameAudio.telegraph('amber',{x:e.group.position.x,z:e.group.position.z});}
 else if(event==='deployed'){enemyFireGate=Math.max(enemyFireGate,.8);notify('工程兵部署完成 // 炮塔扫描上线，绕后攻击绿核');hud();}
 else if(event==='interrupted')notify('炮塔部署已打断 // 工程兵 3 秒后可重试');
 else if(event==='repair-started'){notify('工程兵正在维修炮塔 // 1.6秒琥珀链路 · 命中工程兵或EMP炮塔可打断');gameAudio.telegraph('amber',{x:e.group.position.x,z:e.group.position.z});}
 else if(event==='repair-interrupted')notify('维修已打断 // 无治疗 · 6秒后可重试');
 else if(event==='repaired'){notify('炮塔维修完成 // 单次最多恢复24耐久，每名工程兵最多2次');gameAudio.play('hit.armor');}
}});
function spawnEncounter(stage){
 stage=p4?.encounter?.(stage)||stage;
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
  scene.add(group);const hp=(profile.hp+wave*profile.hpPerLevel)*(boss?1:(p4?.params.enemyHp??1));
  enemies.push({flankRoute:stage.harborFlanks?.[i]?.map(p=>({...p}))||[],group,type,hp,maxHp:hp,boss,bossState:boss?createBossState():null,speed:profile.speed*(1+wave*.025)*(boss?1:(p4?.params.enemySpeed??1)),attack:1+Math.random(),radius:profile.radius,charge:0,seed:i*1.37+wave});
 }
 if(MAP_ID==='reactor'&&stage.sentry&&!mission.state.defending&&!enemies.some(e=>e.type==='sentry')){
  const p=chooseSentrySite(stage,camera.position,obstacles,enemies,SUPPLIES);
  if(p){addSentry(p);notify('哨兵炮塔上线 // 绿色扇区 · 锁定后横移，绕后攻击绿色核心');}
 }
 if(MAP_ID==='reactor'&&stage.swarm&&!enemies.some(e=>e.type==='swarmDrone')){
  const center=chooseSwarmSite(stage,camera.position,obstacles,enemies);
  if(center){const pack={center:{...center}},profile=ENEMY_TYPES.swarmDrone;
   for(const [slot,p] of swarmFormation(center).entries()){const group=createEnemyModel('swarmDrone');group.scale.setScalar(profile.scale);group.position.set(p.x,p.y,p.z);scene.add(group);
    enemies.push({group,type:'swarmDrone',hp:profile.hp,maxHp:profile.hp,boss:false,speed:profile.speed,attack:2+slot*.15,radius:profile.radius,charge:0,seed:slot,swarm:pack,swarmSlot:slot});
   }
   notify('蜂群编队进入空域 // 蓝色蜂鸣后锁定旧位置 · 霰弹 / VOLT 可清群');
  }
 }
 hud();
}
function reset(stageIndex=0,snapshot=null){
 ordnance.reset(snapshot?.ordnance);mortarMarkers.clear();
 weaponDrops.reset();loadoutWorld.hide();loadout.reset(snapshot?(snapshot.loadout===undefined?DEFAULT_LOADOUT:snapshot.loadout):undefined);
 destructibles?.suspend();barrels?.suspend();energyNodes?.suspend();execution.cancel();executionStagger.clear(enemies);executionHint='';fieldKit.reset(snapshot?(snapshot.fieldKit===undefined?defaultKit():snapshot.fieldKit):undefined);
 workshop.reset(snapshot?(snapshot.weaponMods??freshWeaponMods()):undefined);
 chapterCues.reset();gameAudio.reset();
 emp.reset(snapshot?.emp,snapshot?.tactical,{checkpoint:!!snapshot});
 engineerDirector.clear();enemyDirector.clear?.();
 haloBurst.cancel();cancelRail();
 fieldRecord.begin(stageIndex);achievementUI.begin({map:MAP_ID,stage:stageIndex,snapshot:!!snapshot,replay:runMode==='replay'});
 telemetryAttempt=p4?.active?null:createTelemetryAttempt({map:MAP_ID,mode:runMode,difficulty:currentDifficulty().id,stage:stageIndex,snapshot:!!snapshot});
 p4?.begin?.({map:MAP_ID,difficulty:currentDifficulty().id,stage:stageIndex,snapshot:!!snapshot,replay:runMode==='replay',inheritedKills:snapshot?.kills||0});telemetryShots=[0,0,0,0,0,0,0,0];
 bossRecordUI?.clear();lookInput.reset();transport?.reset(snapshot?.transportTime||0,snapshot?.transportTrip===true);meleePending=false;meleeStrike.cancel();parry.reset();sprintBlend=0;
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
 if(!snapshot)fieldKit.clampAmmo(reserves);typedAmmo.reset(snapshot?.typedAmmo,reserves,snapshot?.ordnance,fieldKit.snapshot().mode==='light');syncTypedAmmo();if(!loadout.allows(selected))selected=loadout.first();
 playerMotion.reset(camera.position,restoredFeet);destructibles?.reset(camera.position);barrels?.reset(camera.position);energyNodes?.reset(camera.position);camera.rotation.set(pitch,yaw,0);spawnEncounter(mission.current);campaignUI.announce(mission.current,runMode==='replay');

}
function end(win){if(p4?.gameEnd(win))return;ordnance.clear();mortarMarkers.clear();weaponDrops.reset();loadoutWorld.hide();execution.cancel();fieldKit.clear();fieldKit.hide();parry.reset();emp.clear();engineerDirector.clear();enemyDirector.clear?.();haloBurst.cancel();cancelRail();if(!win){fieldRecord.die(camera.position);achievementUI.attempt.die();}achievementUI.finish(win&&mission.state.complete&&runMode!=='replay');
 if(telemetryAttempt){const attempt=telemetryAttempt;telemetryAttempt=null;telemetry.record({attempt,won:win,stages:fieldRecord.records,kills,time:mission.state.time,weaponShots:telemetryShots,endStage:runMode==='replay'?replayEntry.stageIndex:mission.state.index}).catch(()=>{});}if(overseer?.battle.summary.status==='active')overseer.battle.finish(win?'won':'lost',bossLoadout());bossRecordUI?.show(overseer?.battle.summary);jumpRequested=false;enemyProjectiles.clear();state=win?'won':'lost';document.body.dataset.playState=state;gameAudio.play(win?'mission.won':'mission.lost');if(!win)gameAudio.play('player.death');document.exitPointerLock?.();overlay.hidden=false;
 $('#session-title').innerHTML=win?(runMode==='replay'?'阶段<span>训练完成</span>':'行动<span>撤离成功</span>'):'信号<span>连接中断</span>';
 const seconds=Math.floor(mission.state.time);
 $('#brief').textContent=`${win?(runMode==='replay'?'本阶段训练完成，主行动检查点未改变。':(IS_POLAR?'GLACIER 已沉入冰湖，小队离开极地雷达阵列。':IS_DATACENTER?'ABYSS 已停机，小队离开沉没数据中心。':IS_ORBITAL?'TETHER 已沉寂，小队离开轨道电梯基座。':IS_HARBOR?'小队已登船，离开风暴港口。':IS_TRAIN?'列车控制权已移交，接应队伍已登车。':IS_TOWER?'中枢已隔离，小队已从大厅撤离。':IS_ROOF?'信号已送出，小队已返回升降平台。':IS_STATION?'已登上末班列车，运输站行动完成。':'反应堆已移交，撤离完成。')):'可从阶段入口检查点重试，或重新开始行动。'} 击破 ${kills} 个目标 · 用时 ${Math.floor(seconds/60)}分${seconds%60}秒 · 阶段 ${runMode==='replay'?replayEntry.stageIndex+1:Math.min(5,mission.state.index+1)}/5。`;
 if(win&&runMode==='campaign')campaign.complete();
 if(win&&runMode==='journey'){pendingJourneyResult={time:mission.state.time,kills};if(journey.finish(MAP_ID,pendingJourneyResult))pendingJourneyResult=null;else $('#brief').textContent='章节已完成，但战役存档写入失败。请重试保存后再继续。';}
 if(win&&runMode==='journey'&&journey.data?.status==='complete'){$('#session-title').innerHTML='港口撤离<span>战役完成</span>';$('#brief').textContent='反应堆、地下运输站、天穹通讯枢纽、多层中枢塔、疾驰货运列车、风暴港口：六章行动全部完成。共击破 '+journey.data.results.reduce((n,r)=>n+r.kills,0)+' 个目标。可继续单章训练，或重新开始战役。';}
 $('#deploy').textContent='开始新行动 ↗';firing=false;fireBuffer=0;aiming=false;keys.clear();campaignUI.refresh(state,runMode);refreshJourney();}
function pause(){execution.cancel();ordnance.cancelCharge();emp.cancelAim();lookInput.reset();if(state!=='playing')return;parry.cancel();cancelRail();bossRecordUI?.show(overseer?.battle.summary);jumpRequested=false;state='paused';overseer?.update(0,camera.position,playerMotion.state.y,false);document.body.dataset.playState=state;gameAudio.play('ui.pause');gameAudio.pause();firing=false;fireBuffer=0;aiming=false;keys.clear();overlay.hidden=false;
 $('#session-title').innerHTML='行动<span>已暂停</span>';$('#brief').textContent='战场已冻结。当前目标：'+mission.current.title+'。';$('#deploy').textContent='继续当前战斗 ↗';campaignUI.refresh(state,runMode);refreshJourney();}
function bossLoadout(){return {health,rounds:rounds.slice(0,3),reserves:reserves.slice(0,3),...tempestCheckpoint(rounds,reserves,selected),...haloCheckpoint(rounds,reserves,selected),...railspikeCheckpoint(rounds,reserves,selected),...voltCheckpoint(rounds,reserves,selected)};}
function checkpoint(){
 syncTypedAmmo();
 return {stageIndex:mission.state.index,health,rounds:rounds.slice(0,3),reserves:reserves.slice(0,3),selected:legacySelected(selected),...tempestCheckpoint(rounds,reserves,selected),...haloCheckpoint(rounds,reserves,selected),...railspikeCheckpoint(rounds,reserves,selected),...voltCheckpoint(rounds,reserves,selected),...typedAmmo.checkpoint(),...workshop.checkpoint(),...emp.checkpoint(),...fieldKit.checkpoint(),...loadout.checkpoint(),...ordnance.checkpoint(),x:camera.position.x,z:camera.position.z,yaw,pitch,time:mission.state.time,kills,feetY:playerMotion.state.y,collected:missionWorld.collected,...(IS_TRAIN?{trainTime:art.trainTime}:{}),...(IS_TOWER?{towerLiftTime:art.liftTime}:{}),...(IS_DATACENTER?{waterTime:art.time}:{}),...(IS_POLAR?{stormTime:art.time,warmth:art.warmth}:{}),...(transport?{transportTime:transport.time,transportTrip:transport.tripCompleted}:{})};
}
function saveCheckpoint(){if(p4?.active)return;if(runMode==='campaign')campaign.save(checkpoint());if(runMode==='journey'&&!journey.save(MAP_ID,checkpoint()))notify('战役检查点写入失败 // 请勿关闭页面');}
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
 loadoutWorld.hide();fieldKit.hide();
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
// Capture only the equipment shortcuts: the paused menu traps bubbling keys.
document.addEventListener('keydown',e=>{
 if(e.code==='Escape'&&(loadoutWorld.open||fieldKit.open)){e.preventDefault();e.stopPropagation();loadoutWorld.hide();fieldKit.hide();$('#deploy').focus();return;}
 const typing=e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement||e.target.isContentEditable;
 if(p4?.active&&e.code==='KeyT'&&!typing){e.preventDefault();e.stopImmediatePropagation();notify('P4 使用波间整备；T 试点不会重开挑战，U 装备终端仍可使用');return;}
 if(e.code==='KeyT'&&!e.repeat&&!typing&&fieldLayout){e.preventDefault();e.stopPropagation();if(state==='playing'){pause();document.exitPointerLock?.();}loadoutWorld.hide();if(fieldKit.open){fieldKit.hide();$('#deploy').focus();}else fieldKit.show();return;}
 if(e.code==='KeyU'&&!e.repeat&&!typing){e.preventDefault();e.stopPropagation();if(loadoutWorld.open)loadoutWorld.hide();else{if(state==='playing'){pause();document.exitPointerLock?.();}fieldKit.hide();loadoutWorld.show();}}
},true);
document.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement||e.target.isContentEditable)return;
 if(state==='playing'&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 if(e.code==='KeyQ'&&!e.repeat){toggleQuality();return;}
 if(e.code==='Escape'){pause();document.exitPointerLock?.();}
 if(state!=='playing')return;keys.add(e.code);
 if(e.code==='KeyF'&&!e.repeat){if(!ordnance.pick())weaponDrops.pick();return;}
 if(e.code==='KeyG'){e.preventDefault();if(!e.repeat&&!parry.busy&&empReady()&&!emp.begin())notify(emp.charges?'投掷物引信正在运行':'当前投掷物已耗尽 · 本章不补充');return;}
 if(p4?.params.headshotsOnly&&e.code==='KeyV'){notify('弱点协议：处决关闭，请攻击头部、弱点或机关');return;}
 if(e.code==='KeyB'&&!e.repeat&&typedAmmo.enabled){typedAmmo.cycleSupply();notify('弹药箱补给类型 // '+AMMO_NAMES[typedAmmo.supplyType(supplyWeapon())]+' · 不补充投掷物');return;}
 if(e.code==='KeyV'&&!e.repeat&&loadout.state.melee===3&&selected===3&&!execution.active&&!fieldKit.busy&&!ordnance.busy&&!parry.busy&&!meleePending&&cooldown<=0&&reload<=0&&handling.state.switchRemaining<=0){const target=executionTarget();if(execution.begin(target)){emp.cancelAim();cooldown=EXECUTION.cooldown;fireBuffer=0;firing=false;gameAudio.play('melee.swing');}return;}
 if(e.code==='KeyH'&&!e.repeat&&selected===3&&loadout.state.melee===11){emp.cancelAim();if(ordnance.press({index:11,ready:!loadoutBusy()&&!parry.busy&&handling.state.switchRemaining<=0})){firing=false;fireBuffer=0;}return;}
 if(e.code==='KeyH'&&!e.repeat&&loadout.state.primary>=9){emp.cancelAim();camera.rotation.set(THREE.MathUtils.clamp(pitch+handling.state.pitch,-1.45,1.45),yaw+handling.state.yaw,0);if(ordnance.press({ads:aiming&&handling.state.ads>=(workshop.heavy(loadout.state.primary)?.adsThreshold??.9),ready:!loadoutBusy()&&!parry.busy&&meleeRemaining<=0&&handling.state.switchRemaining<=0})){firing=false;fireBuffer=0;}return;}
 if(e.code==='KeyH'&&!e.repeat&&!loadout.allows(8)){notify('PULSE 未装备 // 在 U 装备终端中替换主武器');return;}
 if(e.code==='KeyH'&&!e.repeat&&fieldLayout&&loadout.allows(8)&&!execution.active&&!parry.busy&&!meleePending&&meleeRemaining<=0&&cooldown<=0&&reload<=0&&handling.state.switchRemaining<=0&&!haloBurst.active&&railCharge.progress===0){emp.cancelAim();camera.rotation.set(THREE.MathUtils.clamp(pitch+handling.state.pitch,-1.45,1.45),yaw+handling.state.yaw,0);if(fieldKit.launch()){firing=false;fireBuffer=0;aiming=false;}else notify('重型脉冲炮冷却中、仍在飞行或弹药耗尽');return;}
 if(e.code==='Space'&&!e.repeat)jumpRequested=true;
 if(/^Digit[1-8]$/.test(e.code)&&!e.repeat)changeWeapon(Number(e.code.slice(-1))-1);
 if(e.code==='KeyR')startReload();
});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyH')ordnance.cancelCharge();if(e.code==='KeyG'){if(empReady()){camera.rotation.set(pitch,yaw,0);emp.release();}else emp.cancelAim();}});
document.addEventListener('mousedown',e=>{if(state!=='playing')return;if(e.button===0){emp.cancelAim();firing=true;fireBuffer=.18;}if(e.button===2){
 if(selected===3&&loadout.state.melee===11){aiming=false;return;}
 if(selected===3){aiming=false;emp.cancelAim();if(parry.press({ready:!ordnance.busy&&!execution.active&&!fieldKit.busy&&cooldown<=0&&handling.state.switchRemaining<=0&&meleeRemaining<=0&&reload<=0})){fireBuffer=0;firing=false;gameAudio.play('weapon.switch');}}
 else aiming=true;
}});
document.addEventListener('mouseup',e=>{if(e.button===0){firing=false;ordnance.cancelCharge();if(selected===6)cancelRail();lookInput.end();}if(e.button===2){aiming=false;parry.release();}});
document.addEventListener('contextmenu',e=>e.preventDefault());
function changeWeapon(index){
 if(!loadout.allows(index)){notify('未携带此武器 // U 查看清单 · 返回青色装备终端换装，不丢弃库存');return;}
 execution.cancel();ordnance.cancelCharge();emp.cancelAim();
 if(!Number.isInteger(index)||index<0||index>=weapons.length||index===selected)return;
 haloBurst.cancel();cancelRail();selected=index;meleeRemaining=0;meleePending=false;meleeStrike.cancel();parry.cancel();reload=0;fireBuffer=0;firing=false;recoil=0;handling.switchWeapon();combatUI.switching();hud();
}
function startReload(){
 if(execution.active||fieldKit.busy||ordnance.busy)return;
 emp.cancelAim();
 if(selected===6){cancelRail();firing=false;fireBuffer=0;}
 const w=weapons[selected];if(reload||selected===3||rounds[selected]===w.cap)return;
 syncTypedAmmo();if(!reserves[selected]){notify('备用弹药耗尽 · 切换武器');return;}
 haloBurst.cancel();cancelRail();reload=w.reload;fireBuffer=0;gameAudio.play(selected===4?'reload.tempest':'reload.start');hud();
}
function blocked(x,z,r){return obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);}
function move(pos,dx,dz,r){if(!blocked(pos.x+dx,pos.z,r))pos.x+=dx;if(!blocked(pos.x,pos.z+dz,r))pos.z+=dz;}
function trace(from,to,color=0xffbd75){
 const mesh=new THREE.Line(new THREE.BufferGeometry().setFromPoints([from,to]),new THREE.LineBasicMaterial({color,transparent:true,opacity:.9}));scene.add(mesh);effects.push({mesh,life:.09});
}
function executionTarget(){
 if(loadout.state.melee!==3||selected!==3||!enemies.some(executable))return null;camera.rotation.set(THREE.MathUtils.clamp(pitch+handling.state.pitch,-1.45,1.45),yaw+handling.state.yaw,0);scene.updateMatrixWorld(true);
 const meshes=enemies.filter(e=>e.hp>0).flatMap(e=>e.group.children).concat(obstacles.map(o=>o.mesh),overseer?.targets||[]);
 const contact=meleeSweep.resolve(camera,meshes,m=>enemies.some(e=>executable(e)&&m.parent===e.group),EXECUTION.range,obstacles);
 const e=contact&&enemies.find(e=>e.group===contact.object.parent);return executable(e)?e:null;
}
function finishExecution(e){
 if(!executable(e)||!enemies.includes(e))return;const restored=Math.min(EXECUTION.heal,100-health);health+=restored;notify('处决成功 // 生命 +'+restored);const damage=e.hp;e.hp=0;enemyProjectiles.cancelOwner(e.group);art.burst(e.group.position.clone().add(new THREE.Vector3(0,1,0)),0x6cf4e8,12);weaponDrops.drop(e);disposeGroup(e.group);enemies.splice(enemies.indexOf(e),1);kills++;achievementUI.attempt.hit(3,1);combatUI.registerHit(damage,false,1,3);hitTime=.25;hit.dataset.kind='kill';showStreak(gameAudio.hit({killed:true,headshot:false,armored:false,core:false,elite:false,boss:false}));hud();
}
function applyBarrelBlast(point,source,cover){
 // Resolve all visibility before this pulse changes any cover or actor collection.
 const affected=enemies.filter(e=>e.hp>0&&!e.boss).map(e=>{const anchor=voltAnchor(e);return {e,damage:blastVisible(point,anchor,cover.filter(o=>o.owner!==e.group))?blastDamage(point,anchor):0};});
 const self=blastVisible(point,camera.position,cover)?blastDamage(point,camera.position,BARREL.playerDamage):0;
 const panels=railPanels.map(mesh=>({mesh,damage:blastVisible(point,mesh.position,cover,mesh)?blastDamage(point,mesh.position):0}));
 for(const {e,damage} of affected){if(damage<=0)continue;const dealt=Math.min(e.hp,resolveEnemyDamage(e,source.player?p4Outgoing(damage,'body'):damage,'body',point).damage);if(dealt<=0)continue;e.hp-=dealt;
  if(source.player){achievementUI.attempt.environmentHit(dealt);p4?.nonGhost?.();p4?.hit(dealt,false,e.hp<=0?1:0,source.p4Direct?8:-1);}
  if(e.hp<=0){enemyProjectiles.cancelOwner(e.group);weaponDrops.drop(e);disposeGroup(e.group);enemies.splice(enemies.indexOf(e),1);kills++;}
 }
 if(self>0&&!execution.invulnerable){const damage=Math.min(health,p4Incoming(self));ordnance.cancelCharge();fieldRecord.hurt(damage);achievementUI.attempt.hurt(damage);health-=damage;mission.interrupt();combatUI.damaged(point);damageTime=.3;gameAudio.hurt(health);}
 for(const {mesh,damage} of panels)destructibles?.hit(mesh,damage);
 art.burst(point,0xff9445,12);gameAudio.play('vehicle.impact',{position:{x:point.x,z:point.z}});hud();
}
function applyParryHit(impact,bolt){
 const target=enemies.find(e=>e.hp>0&&e.group===impact.object.parent);
 if(!target||target.boss){notify('Boss / 装置吸收反射弹 · 需直接攻击');return;} // No new Boss damage route.
 const resolved=resolveEnemyDamage(target,p4Outgoing(bolt.damage,'body'),'body',bolt.parryOrigin);
 const dealt=Math.min(target.hp,Math.max(0,resolved.damage));if(dealt<=0)return;
 target.hp-=dealt;let killed=0;
 if(target.hp<=0){
  enemyProjectiles.cancelOwner(target.group);
  art.burst(target.group.position.clone().add(new THREE.Vector3(0,1.2,0)),0xffad68,32);
  weaponDrops.drop(target);disposeGroup(target.group);enemies.splice(enemies.indexOf(target),1);kills++;killed=1;
 }
 achievementUI.attempt.hit(3,killed);
 hitTime=killed?.25:.16;hit.dataset.kind=killed?'kill':resolved.armored?'armor':'body';
 combatUI.registerHit(dealt,false,killed,3);enemyUI.hit(resolved.armored,false);
 showStreak(gameAudio.hit({killed:killed>0,headshot:false,armored:resolved.armored,core:false,elite:killed>0&&(target.type==='harborElite'||target.elite),boss:false}));
 hud();
}
function ordnanceContact(index,contact,origin){
 const profile=ORDNANCE[index]||{damage:70,color:0xffd894},target=enemies.find(e=>e.hp>0&&e.group===contact.object.parent);let damage=p4Outgoing(contact.damage??profile.damage,contact.object.userData.overseer!==undefined?'core':(['head','core'].includes(contact.object.userData.hitZone)?contact.object.userData.hitZone:'body')),dealt=0,killed=0,core=false,armored=false;
 if(contact.object.userData.overseer!==undefined){const interrupted=index===11&&overseer.interruptCharge?.();const r=overseer.hit(contact.object,damage);dealt=r.damage;core=r.weak;armored=r.damage===0;if(interrupted)notify('BREAKER 打断Boss蓄力 · 本阶段配额已用');else if(r.shielded)notify(r.message||'核心仍受保护 · 先处理场景机制');if(r.killed){overseer.battle.finish('won',bossLoadout());kills++;killed++;}}
 else if(target){const resolved=resolveEnemyDamage(target,damage,contact.object.userData.hitZone,origin);
  if(index===10&&!target.boss){const pierced=damage*haloDamageMultiplier(target);if(resolved.damage<pierced){resolved.damage=pierced;resolved.armored=false;}}
  dealt=Math.min(target.hp,resolved.damage);target.hp-=dealt;core=resolved.weak;armored=resolved.armored;
  if(index===11&&dealt>0){if(target.boss){if(interruptBreakerBoss(target,enemyProjectiles))notify('BREAKER 打断Boss蓄力 · 本阶段配额已用');}else{const direction=target.group.position.clone().sub(origin);direction.y=0;if(direction.lengthSq()>1e-8){direction.normalize();if(target.type!=='sentry'&&target.group.position.y<.2)for(let n=0;n<20;n++)move(target.group.position,direction.x*.075,direction.z*.075,target.radius||.6);}target.attack=Math.max(target.attack||0,.9);}}
  if(target.hp<=0){enemyProjectiles.cancelOwner(target.group);weaponDrops.drop(target);disposeGroup(target.group);enemies.splice(enemies.indexOf(target),1);kills++;killed++;}
 }else{destructibles?.hit(contact.object,damage);energyNodes?.hit(contact.object,damage);barrels?.hit(contact.object,damage,{player:true,weapon:index});}
 if(dealt>0){achievementUI.attempt.hit(index,killed);hitTime=killed?.25:.16;hit.dataset.kind=killed?'kill':core?'core':armored?'armor':'body';combatUI.registerHit(dealt,false,killed,index);enemyUI.hit(armored,core);gameAudio.hit({killed:killed>0,headshot:false,armored,core,elite:!!target?.elite,boss:!!target?.boss});}art.burst(contact.point,profile.color,12);hud();
}
function ordnanceHammer(origin,direction){
 scene.updateMatrixWorld(true);const contacts=[];
 for(const e of enemies.filter(e=>e.hp>0)){const point=voltAnchor(e),delta=point.clone().sub(origin);if(delta.length()>3.5||delta.clone().normalize().dot(direction)<Math.cos(35*Math.PI/180)||!voltClearPath(origin,point,obstacles.filter(o=>o.owner!==e.group).map(o=>o.mesh)))continue;const object=e.group.children.find(m=>m.isMesh&&m.userData.hitZone==='body')||e.group.children.find(m=>m.isMesh);if(object)contacts.push({object,point});}
 const targets=overseer?.targets||[],contact=meleeSweep.resolve(camera,targets.concat(obstacles.map(o=>o.mesh)),m=>targets.includes(m)||railPanels.includes(m)||barrels?.isTarget(m)||energyNodes?.isTarget(m),3.5,obstacles);if(contact)contacts.push(contact);
 for(const c of contacts)ordnanceContact(11,c,origin);
}
function ordnanceRay(index,origin,direction){
 if(index===11){ordnanceHammer(origin,direction);return;}
 scene.updateMatrixWorld(true);const heavy=workshop.heavy(index)||ORDNANCE[index],cast=new THREE.Raycaster(origin,direction,0,heavy.range),meshes=enemies.filter(e=>e.hp>0).flatMap(e=>e.group.children).concat(obstacles.map(o=>o.mesh),overseer?.targets||[]),contacts=cast.intersectObjects(meshes,false),seen=new Set();let count=0,end=origin.clone().addScaledVector(direction,heavy.range);
 for(const contact of contacts){const target=enemies.find(e=>e.hp>0&&e.group===contact.object.parent),boss=contact.object.userData.overseer!==undefined,key=target|| (boss?overseer:contact.object);if(seen.has(key))continue;seen.add(key);end=contact.point;contact.damage=ORDNANCE[index].damage*(count?heavy.secondTargetFactor??.7:1);ordnanceContact(index,contact,origin);count++;if(index!==10||!target||target.boss||count>=2)break;}
 trace(camera.position.clone().add(new THREE.Vector3(0,-.12,0)),end,ORDNANCE[index].color);
}
function cinderBlast(point,{index=9,radius=workshop.heavy(index)?.radius??4,damage=180,selfDamage=workshop.heavy(index)?.selfDamage??35}={}){
 const falloff=distance=>tacticalFalloff(distance,radius,damage);
 scene.updateMatrixWorld(true);const cover=obstacles.slice(),contacts=[];
 for(const enemy of enemies.filter(e=>e.hp>0)){const anchor=voltAnchor(enemy),damage=falloff(anchor.distanceTo(point));if(damage>0&&blastVisible(point,anchor,cover.filter(o=>o.owner!==enemy.group))){const object=enemy.group.children.find(m=>m.isMesh&&m.userData.hitZone==='body')||enemy.group.children.find(m=>m.isMesh);if(object)contacts.push({object,point:anchor,damage});}}
 // Each exposed Boss component and prop still goes through its original hit/armor gate.
 for(const object of [...(overseer?.targets||[]),...cover.filter(o=>barrels?.isTarget(o.mesh)||energyNodes?.isTarget(o.mesh)||railPanels.includes(o.mesh)).map(o=>o.mesh)]){const anchor=object.getWorldPosition(new THREE.Vector3()),damage=falloff(anchor.distanceTo(point));if(damage>0&&blastVisible(point,anchor,cover,object))contacts.push({object,point:anchor,damage});}
 for(const contact of contacts)ordnanceContact(index,contact,point);
 const self=tacticalFalloff(camera.position.distanceTo(point),radius,selfDamage);if(self>0&&!execution.invulnerable&&blastVisible(point,camera.position,cover)){const damage=Math.min(health,p4Incoming(self));ordnance.cancelCharge();fieldRecord.hurt(damage);achievementUI.attempt.hurt(damage);health-=damage;mission.interrupt();combatUI.damaged(point);damageTime=.3;gameAudio.hurt(health);}
 art.burst(point,(ORDNANCE[index]?.color||0xffd894),32);gameAudio.play('vehicle.impact',{position:{x:point.x,z:point.z}});hud();
}

function shoot(meleeImpact=false,meleeContact=null,haloRound=false){
 if(selected===3&&loadout.state.melee===11&&!meleeImpact)return ordnance.press({index:11,ready:!execution.active&&!fieldKit.busy&&!parry.busy&&!meleePending&&reload<=0&&cooldown<=0&&handling.state.switchRemaining<=0});
 if(execution.active||fieldKit.busy||ordnance.busy)return false;
 if(!meleeImpact&&((cooldown>0&&!haloRound)||handling.state.switchRemaining>0))return false;
 if(selected===3&&!meleeImpact){if(parry.busy)return false;cooldown=weapons[3].delay;meleeRemaining=MELEE_STRIKE.duration;meleePending=true;meleeStrike.begin();overseer?.battle.shot(3);return true;}
 if(!meleeImpact&&art.shorted?.(selected,playerMotion.state.y)){if(cooldown<=0){notify('能量武器在水中短路 // 上岸或换用实弹');cooldown=.6;}return false;}
 if(reload>0){if(weapons[selected].perShell&&rounds[selected]>0)reload=0;else return false;}
 if(rounds[selected]<=0){startReload();cooldown=.2;fireBuffer=0;return false;}
 const w=weapons[selected];if(selected!==3)overseer?.battle.shot(selected);rounds[selected]--;if(selected!==3){fieldRecord.shot();achievementUI.attempt.shot(selected);}telemetryShots[selected]++;p4?.shot(selected);if(!meleeImpact)cooldown=w.delay;recoil=1;
 gameAudio.weaponFire(selected);
 scene.updateMatrixWorld(true);
 let totalDamage=0,headshot=false,killed=0,armoredHit=false,coreHit=false,killedElite=false,killedBoss=false;
 const voltSources=new Map();
 const spread=shotSpread(w,handling.state.ads,handling.state.heat,moving);
 for(let p=0;p<w.pellets;p++){
  // A broken surface must not absorb the remaining pellets of this discharge.
  const meshes=enemies.flatMap(e=>e.group.children).concat(obstacles.map(o=>o.mesh),overseer?.targets||[]);
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
  if(impact){const damage=p4Outgoing(damageAtDistance(w,impact.distance,false)*(impact.railFactor??1));destructibles?.hit(impact.object,damage);energyNodes?.hit(impact.object,damage);barrels?.hit(impact.object,damage,{player:true,weapon:selected});}
  if(impact&&impact.object.userData.overseer!==undefined){
   const result=overseer.hit(impact.object,p4Outgoing(damageAtDistance(w,impact.distance,false)*(impact.railFactor??1)),{halo:selected===5});if(result.marked)gameAudio.play('halo.mark');if(result.shielded)notify(result.message||'核心无敌！先击破两座金色供电节点，再攻击青色核心');totalDamage+=result.damage;coreHit ||= result.weak;armoredHit ||= result.damage===0;
   if(result.killed){overseer.battle.finish('won',bossLoadout());kills++;killed++;killedBoss=true;notify(result.killMessage||'枢纽监察者已击破 // 清理守卫，建立上传链路');}
  }
  if(target&&target.hp>0){
   const isHead=selected!==3&&impact.object.userData.hitZone==='head';
   const baseDamage=p4Outgoing(damageAtDistance(w,impact.distance,isHead)*(impact.railFactor??1),['head','core'].includes(impact.object.userData.hitZone)?impact.object.userData.hitZone:'body');
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
  const chain=p4?.params.headshotsOnly?null:chooseVoltChain(voltSources,enemies,{position:voltAnchor,visible:(from,to)=>voltClearPath(from,to,obstacles.map(o=>o.mesh).concat(overseer?.targets||[]))});
  if(chain){const result=resolveEnemyDamage(chain.target,chain.damage,'body',chain.from),dealt=Math.min(chain.target.hp,result.damage);
   if(dealt>0){chain.target.hp-=result.damage;totalDamage+=dealt;armoredHit ||= result.armored;
    const mesh=createVoltArc(chain.from,chain.to);scene.add(mesh);effects.push({mesh,life:.2});art.burst(chain.to,0x70f2ff,12);gameAudio.play('volt.chain');combatUI.chain(dealt);
   }
  }
 }
 for(let i=enemies.length-1;i>=0;i--)if(enemies[i].hp<=0){
  if(enemies[i].type==='swarmDrone'||enemies[i].type==='sentry'||enemies[i].type==='engineer')enemyProjectiles.cancelOwner(enemies[i].group);
  if(enemies[i].boss)killedBoss=true;else if(enemies[i].type==='harborElite'||enemies[i].elite)killedElite=true;
  art.burst(enemies[i].group.position.clone().add(new THREE.Vector3(0,1.2,0)),0xffad68,32);weaponDrops.drop(enemies[i]);disposeGroup(enemies[i].group);enemies.splice(i,1);kills++;killed++;
 }
 achievementUI.attempt.hit(selected,killed);
 if(totalDamage>0){
  hitTime=killed?.25:.16;hit.dataset.kind=killed?'kill':coreHit?'core':headshot?'head':armoredHit?'armor':'body';combatUI.registerHit(totalDamage,headshot,killed,selected);
  showStreak(gameAudio.hit({killed:killed>0,headshot,armored:armoredHit&&!coreHit,core:coreHit,elite:killedElite,boss:killedBoss}));
  enemyUI.hit(armoredHit&&!coreHit,coreHit);
 }
 handling.shot(w,Math.random(),art.recoilScale?.(playerMotion.state.y)??1);flash.visible=selected!==3;hud();return true;
}
function update(dt){
 if(p4?.active&&p4.fixed?.(dt,update))return;
 executionStagger.update(enemies,dt);
 destructibles?.step(dt);barrels?.step(dt,camera);
 parry.step(dt);
 for(const enemy of enemies)stepHaloMark(enemy,dt);
 fieldRecord.tick(dt,mission.state.index);
 const previousPlayer=camera.position.clone();
 elapsed+=dt;cooldown=Math.max(0,cooldown-dt);recoil=Math.max(0,recoil-dt*7);enemyFireGate=Math.max(0,enemyFireGate-dt);
 fireBuffer=Math.max(0,fireBuffer-dt);
 const previousMelee=meleeRemaining;meleeRemaining=Math.max(0,meleeRemaining-dt);
 if(reload>0){syncTypedAmmo();const before=rounds[selected],next=advanceReload(dt,reload,rounds[selected],reserves[selected],weapons[selected]);reload=next.remaining;rounds[selected]=next.rounds;if(typedAmmo.enabled){typedAmmo.take(selected,next.rounds-before);syncTypedAmmo();}else reserves[selected]=next.reserve;if(next.inserted){gameAudio.play('reload.shell');hud();}}

 if(keys.has('ArrowLeft'))yaw+=dt*1.6;if(keys.has('ArrowRight'))yaw-=dt*1.6;
 let mx=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),mz=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));
 moving=mx!==0||mz!==0;sprinting=!ordnance.busy&&!execution.active&&!fieldKit.busy&&(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&canSprintWithWeapon(weapons[selected],{moving,aiming:aiming||(selected===3&&parry.busy),firing,reload});
 handling.update(dt,aiming&&reload<=0&&selected!==3);
 const ads=handling.state.ads,len=Math.hypot(mx,mz)||1,speed=(sprinting?8*fieldKit.speed:5)*(1-ads*.4)*(art.moveScale?.(playerMotion.state.y)??1);
 mx=mx/len*dt*speed*(p4?.params.move??1);mz=mz/len*dt*speed*(p4?.params.move??1);
 transport?.tick(dt,camera.position,playerMotion);art.beforeMotion?.(dt,camera.position,playerMotion,enemies);overseer?.beforeMotion?.(dt,camera.position,playerMotion,enemies);
 const airborne=playerMotion.step(dt,camera.position,mx*Math.cos(yaw)+mz*Math.sin(yaw),-mx*Math.sin(yaw)+mz*Math.cos(yaw),jumpRequested);jumpRequested=false;
 if(IS_TRAIN&&playerMotion.state.y<.25){const e=STAGE_ENTRIES[mission.state.index];camera.position.set(e.x,e.feetY+1.7,e.z);playerMotion.reset(camera.position,e.feetY);mission.interrupt();notify('脱离列车 // 已返回当前阶段入口，重新尝试');}
 if(IS_HARBOR&&playerMotion.state.y<.25&&harborWater(camera.position)){const e=STAGE_ENTRIES[mission.state.index];camera.position.set(e.x,e.feetY+1.7,e.z);playerMotion.reset(camera.position,e.feetY);mission.interrupt();notify('落水重试 // 已返回当前阶段入口，收集记录保留');}
 if(airborne.jumped)gameAudio.play('player.jump');if(airborne.landed)gameAudio.play('player.land');
 camera.rotation.set(THREE.MathUtils.clamp(pitch+handling.state.pitch,-1.45,1.45),yaw+handling.state.yaw,0);
 execution.step(dt,executionTarget,finishExecution);
 const fov=74-ads*((loadout.state.primary>=9&&selected===2?workshop.heavy(loadout.state.primary)?.zoom:weapons[selected].zoom)??22)+(sprinting?5:0);camera.fov=THREE.MathUtils.lerp(camera.fov,fov,1-Math.exp(-dt*12));camera.updateProjectionMatrix();
 const reloadArc=reload>0?Math.sin((1-reload/weapons[selected].reload)*Math.PI):0;
 const lower=reloadArc*.28+handling.state.switchRemaining*.7;
 gun.position.set(.29-ads*.24,-.28-lower+(moving?Math.sin(elapsed*9)*.006:0),-.68+recoil*.065);
 gun.rotation.set(recoil*.06+reloadArc*.22,.16*(1-ads)+(moving?Math.sin(elapsed*5)*.007:0),selected===3?-recoil*.9:-reloadArc*.55-(sprinting?.15:0));
 const pose=meleePose(meleeRemaining);if(selected===3){gun.position.x+=pose.x;gun.position.y+=pose.y;gun.position.z+=pose.z;gun.rotation.set(pose.pitch,0,pose.roll);}
 sprintBlend+=((sprinting&&selected!==3?(reload>0&&weapons[selected].sprintReload?.55:1):0)-sprintBlend)*(1-Math.exp(-dt*12));
 if(selected===3&&parry.guard>0){const g=parry.guard;gun.position.x-=.13*g;gun.position.y+=.11*g;gun.position.z+=.07*g;gun.rotation.x-=.15*g;gun.rotation.z-=.95*g;}
 if(execution.active){const thrust=Math.sin(execution.phase*Math.PI);gun.position.z-=.32*thrust;gun.position.y+=.08*thrust;gun.rotation.z-=.65*thrust;}
 const runPose=sprintPose(elapsed,sprintBlend,playerMotion.state.grounded);
 gun.position.x+=runPose.x;gun.position.y+=runPose.y;gun.position.z+=runPose.z;gun.rotation.x+=runPose.pitch;gun.rotation.y+=runPose.yaw;gun.rotation.z+=runPose.roll;
 viewModel.animate(selected,recoil,reload>0?1-reload/weapons[selected].reload:0,railCharge.progress);
 gun.scale.setScalar(1);flash.visible=recoil>.6&&selected!==3;
 if(meleePending&&selected===3){
  const contact=meleeStrike.step(previousMelee,meleeRemaining,()=>{
   scene.updateMatrixWorld(true);
   const meshes=enemies.flatMap(e=>e.group.children).concat(obstacles.map(o=>o.mesh),overseer?.targets||[]);
   return meleeSweep.resolve(camera,meshes,object=>energyNodes?.isTarget(object)||barrels?.isTarget(object)||destructibles?.isTarget(object)||object.userData.overseer!==undefined||enemies.some(enemy=>enemy.hp>0&&object.parent===enemy.group),weapons[3].range,obstacles);
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
 emp.update(dt);
 engineerDirector.update(dt);
 if(!p4?.range)enemyFireGate=enemyDirector.update(dt,elapsed,enemyFireGate);
 for(let i=enemies.length-1;i>=0;i--)if(enemies[i].hp<=0&&enemies[i].type==='rusher'){enemyProjectiles.cancelOwner(enemies[i].group);disposeGroup(enemies[i].group);enemies.splice(i,1);}
 enemyProjectiles.update(dt,camera.position,previousPlayer);
 overseer?.prepareMission?.(mission.state,enemies.length===0);
 overseer?.interact?.(dt,{camera,held:keys.has('KeyE'),busy:moving||firing||reload>0||handling.state.switchRemaining>0||meleeRemaining>0||emp.aiming||damageTime>0,feetY:playerMotion.state.y,grounded:playerMotion.state.grounded});
 const bossDamage=p4Incoming(overseer?.update(dt,camera.position,playerMotion.state.y,true,playerMotion.state.grounded,enemies.filter(e=>e.type==='stalker').length)||0);
 if(overseer?.takeSummons){const spots=overseer.takeSummons(camera.position);if(spots.length){spawnEncounter({...mission.current,count:spots.length,spawns:spots.map(p=>({x:p.x,z:p.z,feetY:p.y??0})),roles:[overseer.summonRole||'stalker'],feetY:0});notify(overseer.summonMessage||'ABYSS 唤出潜行者 // 涨水期间从水中接近');gameAudio.play('reinforcement');}}
 if(bossDamage&&!execution.invulnerable){overseer.battle.hurt(Math.min(health,bossDamage));ordnance.cancelCharge();fieldRecord.hurt(Math.min(health,bossDamage));achievementUI.attempt.hurt(Math.min(health,bossDamage));health=Math.max(0,health-bossDamage);mission.interrupt();combatUI.damaged(overseer.origin||new THREE.Vector3(0,0,-21));damageTime=.3;gameAudio.hurt(health);hud();}
 art.setBossActive?.(Boolean(overseer?.blocking));
 const hazard=art.hazardDamage?.(dt,{x:camera.position.x,z:camera.position.z,feetY:playerMotion.state.y});
 if(IS_ORBITAL||IS_DATACENTER||IS_POLAR)chapterCues.update(chapterSnapshot({map:MAP_ID,art,overseer,feetY:playerMotion.state.y,padLive:Boolean(hazard&&IS_ORBITAL)}));
 if(hazard&&!execution.invulnerable){ordnance.cancelCharge();fieldRecord.hurt(Math.min(health,hazard.damage));achievementUI.attempt.hurt(Math.min(health,hazard.damage));health=Math.max(0,health-hazard.damage);mission.interrupt();combatUI.damaged(new THREE.Vector3(hazard.x,0,hazard.z));damageTime=.3;gameAudio.play('player.hazard');hud();}
 fieldKit.step(dt);if(!keys.has('KeyH')&&!firing)ordnance.cancelCharge();ordnance.step(dt);mortarMarkers.update(dt);energyNodes?.flush();barrels?.flush();executionStagger.update(enemies,0);
 if(health<=0){end(false);return;}
 missionWorld.collect(camera.position,type=>{
  if(type==='ammo'&&typedAmmo.enabled){const kind=typedAmmo.supplyType(supplyWeapon());if(kind==='grenade'&&!ordnance.owns(9))return false;const added=typedAmmo.supply(kind);if(!added)return false;syncTypedAmmo();notify(AMMO_NAMES[kind]+'共享储备 +'+added+' 单位 // B切换类型，投掷物不补充');gameAudio.play('supply.ammo');hud();return true;}
  const supply=supplementVoltSupply(type,supplementRailspikeSupply(type,supplementHaloSupply(type,supplementTempestSupply(type,applySupply(type,health,reserves,weapons),reserves),reserves),reserves),reserves);fieldKit.clampAmmo(supply.reserves);if(supply.health===health&&supply.reserves.every((n,i)=>n===reserves[i]))return false;
  health=supply.health;reserves=supply.reserves;notify(type==='health'?'医疗补给 // 恢复最多 35 点生命':'弹药补给 // 备用弹药已增加');gameAudio.play(type==='health'?'supply.health':'supply.ammo');hud();return true;
 });
 starWorld.update(dt,elapsed,camera.position,true);
 const interaction=interactionStatus();
 const event=p4?.manual?null:mission.tick(dt,{player:camera.position,held:keys.has('KeyE'),clear:enemies.length===0&&!overseer?.blocking&&(overseer?.canAdvance?.(mission.state)??true),canInteract:interaction.allowed,transportReady:transport?.tripCompleted===true});
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
   if(event.complete||(runMode==='replay'&&!p4?.continuous)){end(true);return;}
   emp.clear();engineerDirector.clear();spawnEncounter(event.next);saveCheckpoint();campaignUI.announce(event.next);hud();
  }
 }


}
function objectiveTarget(){
 if(overseer?.blocking&&overseer.objective)return overseer.objective;
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
gameMenu=p4Requested()?{update(){},refresh(){},error(){}}:createGameMenu({overlay,journey,campaign,
 getSession:()=>({state,mode:runMode,map:MAP_ID,stage:mission.state.index,stageTitle:mission.current.title,time:mission.state.time,kills,
  checkpoint:runMode==='replay'?replayEntry:runMode==='journey'?journey.data?.checkpoint:campaign.checkpoint,
  pending:Boolean(pendingJourneyResult),navigating}),
 actions:{newGame:startJourney,continueJourney,continueSingle:continueCampaign,startSingle:startSingleChapter,
  resume:()=>enterPlay(),retry:retryStage,openChapter:openMenuChapter,
  quality:value=>{if(![0,1,2].includes(value))return;for(let i=0;i<3&&Number(document.body.dataset.renderQuality)!==value;i++)toggleQuality();}}
});
campaignUI.refresh(state,runMode);refreshJourney();
// P4 integration seam: native combat implementation remains the single source of truth.
const p4BaseWeapons=createRuntimeWeapons(),p4LightBase=new Map();scene.traverse(o=>{if(o.isLight)p4LightBase.set(o,o.intensity);});
const p4API={map:MAP_ID,scene,camera,enemies,obstacles,meleeRange:weapons[3].range,
 invalidate(){navigation.invalidate();roofEnemyNavigation?.invalidate?.();},canOccupy:(x,z,y)=>playerMotion.canOccupy(x,z,y),
 snapshot(){return {state,telemetryId:telemetryAttempt?.id,position:{x:camera.position.x,y:camera.position.y,z:camera.position.z},yaw,pitch,selected,health,kills,stage:mission.state.index,damage:fieldRecord.records.reduce((n,r)=>n+r.damage,0),difficulty:currentDifficulty().id,input:['KeyW','KeyS','KeyA','KeyD','Space','ShiftLeft','KeyE','KeyR'].reduce((n,k,i)=>n+(keys.has(k)?1<<i:0),0)+(firing?256:0)+(aiming?512:0)};},
 carry(){return {...loadout.checkpoint(),...ordnance.checkpoint(),...emp.checkpoint(),...fieldKit.checkpoint(),selected,health,rounds:rounds.map(n=>Number.isFinite(n)?n:null),reserves:reserves.map(n=>Number.isFinite(n)?n:null)};},
 parameters(params){for(let i=0;i<weapons.length;i++){const b=p4BaseWeapons[i];weapons[i].spread=b.spread*params.spread;weapons[i].kick=b.kick*params.recoil;weapons[i].reload=b.reload*params.reload;weapons[i].reserve=Number.isFinite(b.reserve)?Math.floor(b.reserve*params.ammo):b.reserve;}},
 environment(params){if(params.fog>.014&&scene.fog)scene.fog.density=Math.max(scene.fog.density,params.fog);if(params.light!==1)for(const [light,base] of p4LightBase)light.intensity=base*params.light;},
 start(stage,primary,carry){runMode='replay';reset(stage);p4API.parameters(p4.params);replayEntry=checkpoint();if(carry?.loadout){ordnance.reset(carry.ordnance);loadout.reset(carry.loadout);emp.reset(carry.emp,carry.tactical,{checkpoint:true});fieldKit.reset(carry.fieldKit);}else loadout.equip(primary);selected=carry&&Number.isInteger(carry.selected)&&weapons[carry.selected]&&loadout.allows(carry.selected)?carry.selected:loadout.first();handling.reset();
  if(carry&&Number.isFinite(carry.health)&&carry.health>0&&carry.health<=100)health=carry.health;
  rounds=weapons.map((w,i)=>i===3?Infinity:Math.max(0,Math.min(w.cap,carry&&Number.isFinite(carry.rounds?.[i])?carry.rounds[i]:w.cap)));
  reserves=weapons.map((w,i)=>i===3?Infinity:Math.max(0,Math.min(w.reserve,carry&&Number.isFinite(carry.reserves?.[i])?carry.reserves[i]:w.reserve)));
  hud();},
 inventoryOpen:()=>loadoutWorld.open,play:()=>enterPlay(),stop(){pause();enemyProjectiles.clear();document.exitPointerLock?.();},
 heal(amount){health=Math.min(100,health+Math.max(0,amount));hud();},resupply(type){if(type==='health')health=Math.min(100,health+35);else reserves=weapons.map(w=>w.reserve);hud();},
 makeRange(){for(let i=0;i<enemies.length;i++){const e=enemies[i],angle=(i-(enemies.length-1)/2)*.5,feet=camera.position.y-1.7;for(const radius of [10,8,6,4]){const x=camera.position.x+Math.sin(angle)*radius,z=camera.position.z-Math.cos(angle)*radius;if(playerMotion.canOccupy(x,z,feet)&&lineOfSight(new THREE.Vector3(x,feet+1.2,z))){e.group.position.set(x,feet,z);break;}}e.p4Target=true;e.speed=0;e.attack=Infinity;e.hp=250;e.maxHp=250;}},rangeSupplies(){reserves=weapons.map(w=>w.reserve);},
 moveRange(t,origins){for(let i=0;i<enemies.length;i++){const e=enemies[i],o=origins.get(e);if(!o)continue;const x=o.x+Math.sin(t*(.55+i*.15)+i)*2;if(playerMotion.canOccupy(x,o.z,e.group.position.y))e.group.position.x=x;e.group.rotation.y=Math.atan2(camera.position.x-e.group.position.x,camera.position.z-e.group.position.z);}},
 replenishRange(){spawnEncounter(mission.current);p4API.makeRange();}
};
p4=createP4Runtime(p4API);
const p4HitBase=combatUI.registerHit;combatUI.registerHit=(damage,head,count,source)=>{p4.hit(damage,head,count,source);p4HitBase(damage,head,count);};
const p4HurtBase=fieldRecord.hurt;fieldRecord.hurt=n=>{p4.hurt?.(n);p4HurtBase(n);};
if(p4.active){overlay.style.setProperty('display','none','important');p4.boot();}
else {const link=document.createElement('a');link.href='./p4-hub.html';link.textContent='行动中枢 / P4 ↗';link.className='p4-home-link';link.style.cssText='position:fixed;top:68px;right:28px;z-index:140;padding:10px 18px;color:#a2f5da;background:linear-gradient(135deg,#12343eee,#081820ee);border:1px solid #497c87;text-decoration:none;font:13px sans-serif;box-shadow:0 8px 24px #0008,inset 0 1px #abfff833';document.body.append(link);const hideStyle=document.createElement('style');hideStyle.textContent='body[data-play-state="playing"] .p4-home-link{display:none}';document.head.append(hideStyle);}

let last=performance.now(),fpsTime=0,frames=0;
function frame(now){
 const p4RealDt=Math.max(0,(now-last)/1000);p4?.prepareFrame?.(p4RealDt);
 const dt=Math.max(0,Math.min((now-last)/1000,.05));last=now;
 gun.visible=state==='playing';
 if(state==='playing')update(dt);
 else starWorld.update(0,elapsed,camera.position,false);
 p4?.frame(p4RealDt);
 if(state!=='playing')overseer?.update(0,camera.position,playerMotion.state.y,false);
 transport?.sync(camera.position,state==='playing');
 overseer?.updateMarkers(camera,state==='playing');
 loadoutWorld.render(state==='playing');weaponDrops.render(state==='playing');
 empUI.update(state==='playing',emp);
 parryUI.update(state==='playing'&&loadout.state.melee===3,selected,parry.state);
 destructibles?.updateMarkers(camera,state==='playing');
 energyNodes?.step(state==='playing'?dt:0,camera,state==='playing');
 executionHintTime-=dt;if(executionHintTime<=0){executionHintTime=.12;executionHint=state==='playing'&&loadout.state.melee===3&&selected===3&&!execution.active&&!fieldKit.busy&&!ordnance.busy&&!parry.busy&&!meleePending&&cooldown<=0&&reload<=0&&handling.state.switchRemaining<=0&&executionTarget()?'V 处决就绪':'';}fieldKit.render(state==='playing',execution.active?(execution.invulnerable?'处决 · 保护窗口':'处决 · 保护已结束'):executionHint,loadout.allows(8));ordnance.render(state==='playing');ammoHud();
 enemyUI.update(state==='playing'?dt:0,state==='playing',camera,enemies,obstacles);
 harborCombatUI?.update(state==='playing',mission,enemies,camera.position);
 campaignUI.update(state==='playing'?dt:0,state==='playing',runMode);
 combatUI.update(state==='playing'?dt:0,{playing:state==='playing',spread:shotSpread(weapons[selected],handling.state.ads,handling.state.heat,moving),heat:handling.state.heat,reloading:reload,reloadDuration:weapons[selected].reload,perShell:weapons[selected].perShell,sprintReload:weapons[selected].sprintReload,burstPending:selected===5?haloBurst.remaining:0,voltSelected:selected===7,railSelected:selected===6,railProgress:railCharge.progress,switching:handling.state.switchRemaining,melee:selected===3,ammo:rounds[selected],reserve:reserves[selected],capacity:weapons[selected].cap,health,player:camera.position,yaw});
 radar.update(dt,state==='playing',camera.position,yaw,enemies,enemyProjectiles.positions(),mission.current,missionWorld.available);
 const missionInteraction=state==='playing'?interactionStatus():{busy:false,visible:false};
 missionUI.update({playing:state==='playing'&&!p4?.manual,mission,camera,yaw,target:objectiveTarget(),remaining:enemies.length+(overseer?.blocking?1:0),canInteract:missionInteraction.visible,busy:missionInteraction.busy,blockedReason:missionInteraction.reason,mechanicActive:Boolean(overseer?.blocking&&overseer.objective),markerLabel:overseer?.blocking&&overseer.objectiveLabel?overseer.objectiveLabel:mission.current.requiresTrip&&!transport?.tripCompleted?'乘车前往远端检修终端':null});
 missionWorld.update(elapsed,mission.state.index,mission.state.defending,mission.state.node,camera);
 if(reactor)reactor.rotation.y=Math.sin(now*.0002)*.04;
 art.update(state==='playing'||state==='ready'?dt:0,state==='ready'?now*.001:elapsed);
 p4?.lateFrame?.();
 const heading=((Math.round(-yaw*180/Math.PI)%360)+360)%360;compass.firstChild.textContent=String(heading).padStart(3,'0')+'° / '+['N','NE','E','SE','S','SW','W','NW'][Math.round(heading/45)%8];
 for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0){const m=effects[i].mesh;scene.remove(m);m.geometry.dispose();m.material.dispose();effects.splice(i,1);}}
 toastTime=Math.max(0,toastTime-dt);toast.style.opacity=toastTime>0?'1':'0';damageTime=Math.max(0,damageTime-dt);damageScreen.style.opacity=damageTime*2;hitTime=Math.max(0,hitTime-dt);hit.style.opacity=hitTime>0?'1':'0';
 if(streakTime>0){streakTime-=dt;if(streakTime<=0)streakBanner.dataset.show='false';}
 gameAudio.setListener(camera.position.x,camera.position.z,yaw);gameAudio.update(dt,{playState:state,health,enemiesNear:enemies.reduce((n,e)=>n+(e.group.position.distanceToSquared(camera.position)<45*45?1:0),0),bossActive:Boolean(overseer?.blocking||enemies.some(e=>e.boss)),defending:mission.state.defending===true,extracting:mission.state.extracting===true});
 frames++;fpsTime+=Math.min((now-(frame.previousNow||now))/1000,1);frame.previousNow=now;if(fpsTime>.5){$('#fps').textContent=Math.round(frames/fpsTime);frames=0;fpsTime=0;}
 achievementUI.update(state);
 presentation.update(dt,yaw,pitch,state);
 const displayedDifficulty=DIFFICULTIES[p4?.difficulty]||currentDifficulty();document.body.dataset.combatDifficulty=displayedDifficulty.id;$('.boss-note').textContent=mission.current.title+' · '+displayedDifficulty.label;
 gameMenu.update(state);
 renderer.render(scene,camera);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
