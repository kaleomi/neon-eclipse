import {createNavalAim,turnNavalAim,navalAimPoint,navalCameraPose} from './naval-aim.js';
import {bindExpeditionUI} from './expedition-ui.js';
import {createVehicleAudio} from './audio/vehicle-audio.js';
import {bindJointCheckpointUI,bindCheckpointUI} from './joint-checkpoint-ui.js';
import {createNavalRun,navalCheckpointFromMission,restoreNavalCheckpoint,navalCheckpointLabel,createNavalCheckpointStore,NAVAL_CHECKPOINT_CHANNEL} from './naval-checkpoint-model.js';
import {restoreJointCheckpoint} from './joint-checkpoint-model.js';
import {createJointMission,stepJointMission,finishJointFlight,jointBoardAllowed,jointGoal,JOINT_STAGES,JOINT_LABELS} from './joint-mission.js';
import {buildJointWorld} from './joint-world.js';
import {createLighthouseMission,stepLighthouseMission,lighthouseGoal,lighthouseBoardAllowed,lighthouseExitAllowed,lighthouseSummary,restoreLighthouseCheckpoint,lighthouseCheckpointLabel,LIGHTHOUSE_STAGES,LIGHTHOUSE_LABELS,LIGHTHOUSE_PROFILES,normalizeLighthouse} from './lighthouse-mission.js';
import {stepHelicopter,helicopterSpeed} from './helicopter-rules.js';
import {FIELD_HELI_SITE,HELI_PADS,createFieldHelicopter,parkHelicopter,canBoardHelicopter,helicopterExit,helicopterInput,helicopterStatusLabel,HELICOPTER_HINT,fieldGround,helicopterBlocks,vehicleHeliObstacles,helicopterPlaneBox} from './helicopter-field.js';
import {createHelicopterModel} from './helicopter-world.js';
import {buildHelipads} from './helipad-world.js';
import {buildLighthouseWorld} from './lighthouse-world.js';
import {createFrontierMission,stepFrontierMission,frontierGoal,frontierBoardAllowed,frontierExitAllowed,frontierSummary,restoreFrontierCheckpoint,frontierCheckpointLabel,FRONTIER_IDS,FRONTIER_TITLES,FRONTIER_STAGES,FRONTIER_LABELS,FRONTIER_PROFILES,FRONTIER_SITES,normalizeFrontier,aliveHostiles} from './frontier-missions.js';
import {SITE_VEHICLE_BOXES,SITE_HELI_OBSTACLES,FRONTIER_HELIPADS,siteHeight,siteBlocksVehicle,stepAllowed,createRifle,stepRifle,RIFLE} from './frontier-site.js';
import {buildFrontierWorld,drawFrontierOnRadar} from './frontier-world.js';
import {bindVehicleGuidance} from './vehicle-guidance.js';
import {createVehicleGamepad,VEHICLE_PAD_HELP} from './vehicle-gamepad.js';
import {buildReconWorld} from './recon-world.js';
import {createFlightMission,stepFlightMission,FLIGHT_PHASES,flightGoal,flightTitle,flightPhase,flightProgress,flightCourse} from './flight-mission.js';
import {bindFlightMissionUI} from './flight-mission-ui.js';
import {buildFlightMissionWorld} from './flight-mission-world.js';
import {createNavalMission,stepNavalMission,navalSummary,cycleNavalTarget} from './naval-mission.js';
import {bindNavalDifficulty,selectedNavalDifficulty} from './naval-settings.js';
import {buildSeaCombatWorld} from './sea-combat-world.js';
import {SEA_GUN,gunTargetStatus} from './sea-combat.js';
import {CHASE,CHASE_GATES,CHASE_EVAC,createSeaChase,stepSeaChase} from './chase-rules.js';
import {buildChaseWorld} from './chase-world.js';
import {bindFlightPitchSetting,isFlightInverted,flightElevator,flightPitchHint} from './flight-settings.js';
import {moveFlightHeading,wrapHeading} from './flight-heading.js';
import * as T from './node_modules/three/build/three.module.js';
import {CollisionGrid,ROVER,createRover,stepRover,walkPlayer,canEnterRover,exitRover,terrainHeight,forward,right,TEST_SPAWN,DRIVE_GATES,createDriveTrial,stepDriveTrial} from './vehicle-rules.js';
import {buildProvingGround,createRoverModel,collisionBoxes,TEST_OBSTACLES,TEST_POLES} from './vehicle-world.js';
import {YACHT,FIELD,FIELD_BUILDINGS,DOCK,createYacht,stepYacht,canBoardYacht,yachtExit,isFootSurface,landSurface,footHeight,bodyBlocksPlayer,WATER_GATES,routeStep} from './maritime-rules.js';
import {createPlane,stepPlane,canBoardPlane,planeExit,FLIGHT_GATES} from './flight-rules.js';
import {createDurability,stepImpactDamage,limitInput,clampSpeed,stepRepair,durabilitySummary,durabilityTier,REPAIR_STATIONS} from './vehicle-durability.js';
import {createRange,stepRange,createWeaponState,enterGunner,leaveGunner,gunnerDriveInput,aimTurret,stepRoofGun,stepPlaneGun,stepHeliGun,stepRearm,weaponSummary,rangeSummary,aimDirection,ROOF_GUN} from './vehicle-weapons.js';
import {buildTargetRange,createTurretModel,createFireEffects,createDamageSmoke,drawRangeOnRadar} from './vehicle-weapons-world.js';
import {createEscort,stepEscort,escortGoal,escortFollowInput,truckBlocks,escortSummary,ESCORT_START,ESCORT_PROFILES,normalizeEscort} from './escort-rules.js';
import {buildEscortWorld,drawEscortOnRadar} from './escort-world.js';
import {buildSeaAirField,createAircraftModel,createYachtModel} from './sea-air-world.js';
const $=selector=>document.querySelector(selector),keys=new Set(),overlay=$('#drive-overlay'),message=$('#drive-message');
let active=false,started=false,kind=null,drag=false,locked=false,cameraMode='chase',orbit=0,pitch=0,accumulator=0,last=performance.now(),time=0,recovery=0,recoveryArmed=false,messageTime=0,hudTimer=0,armedStation=null,flightHeading=0;
let sortie=createFlightMission(),joint=createJointMission(),jointArmed=false,lighthouse=createLighthouseMission(),lighthouseArmed=false;
// Missions 6–8 share one slot: only one frontier mission runs at a time.
let frontier=createFrontierMission(),frontierArmed=null;const rifle=createRifle();
const FRONTIER_KEY='neon-eclipse.frontier-difficulty.v1',readFrontierDifficulty=id=>{try{return normalizeFrontier(id,localStorage.getItem(FRONTIER_KEY));}catch{return 'normal';}};
const frontierActive=()=>frontier.status==='active';
const LIGHTHOUSE_KEY='neon-eclipse.lighthouse-difficulty.v1',readLighthouseDifficulty=()=>{try{return normalizeLighthouse(localStorage.getItem(LIGHTHOUSE_KEY));}catch{return 'normal';}};
let expeditionUI=null,missionIntent=0;
const EXPEDITION_RESULT_NOTE=' 本轮属于先遣队，请在上方先遣队面板查看保存状态并继续/重试；不写入原 FPS 战役或单项飞行成绩。';
// P3: target range, vehicle weapons and wear. Rules live in vehicle-weapons.js / vehicle-durability.js; nothing here is persisted.
const range=createRange(),roofGun=createWeaponState('roof'),planeGun=createWeaponState('plane'),heliGun=createWeaponState('heli'),wear={rover:createDurability('rover'),yacht:createDurability('yacht')};
let gunner=false,fire=false,rocketKey=false;
// Phase 2 debt: vehicle audio (engine beds + one-shot events from gameplay counters). Fails soft without WebAudio.
const vehicleAudio=createVehicleAudio({storage:localStorage});window.neonVehicleAudio=vehicleAudio;let audioLandings=0,audioCheckpoints=0,audioHullHits=0,audioWaves=0,audioRearms=0,audioFrontierKills=0;
let escort=createEscort(),escortArmed=false;const ESCORT_KEY='neon-eclipse.escort-difficulty.v1';
function readEscortDifficulty(){try{return normalizeEscort(localStorage.getItem(ESCORT_KEY));}catch{return 'normal';}}
const escortRange={targets:[],shots:0,hits:0,kills:0};// roof gun target list while escorting: range targets + live hounds
const frontierRangeState={targets:[],shots:0,hits:0,kills:0};const frontierRange=()=>{frontierRangeState.targets=frontier.hostiles;return frontierRangeState;};const frontierBoxes=()=>planeBoxes;
let chase=createSeaChase(),chaseArmed=false,freeArmed=false;const emptyNaval=createSeaChase();
bindNavalDifficulty($('#naval-settings'));
bindFlightPitchSetting($('#vehicle-flight-pitch'));
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(error){$('#drive-overlay-title').textContent='无法创建 3D 画面';$('#drive-overlay-copy').textContent='需要支持 WebGL 2 的浏览器和显卡。请检查硬件加速。';$('#resume-drive').hidden=true;throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','海陆空试验场，点击锁定鼠标');$('#vehicle-scene').append(canvas);
const scene=new T.Scene();scene.background=new T.Color(0x879da3);scene.fog=new T.Fog(0x879da3,300,1450);const camera=new T.PerspectiveCamera(66,innerWidth/innerHeight,.1,2200);
scene.add(new T.HemisphereLight(0xd5f2ff,0x66533a,2.6));const sun=new T.DirectionalLight(0xffdfb0,3.5);sun.position.set(-55,85,-40);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,far:180});sun.shadow.normalBias=.04;scene.add(sun,sun.target);
const geometry=new CollisionGrid([...collisionBoxes(),...FIELD_BUILDINGS,...SITE_VEHICLE_BOXES],24,FIELD.bounds);// turbine towers / dish masts / tower body block feet and vehicles alike
const footWorld={geometry,free:(x,z,r)=>isFootSurface(x,z,r)&&(geometry.free(x,z,r)||siteHeight(x,z)>0)};
const groundAt=(x,z)=>Math.max(terrainHeight(x,z),footHeight(x,z),siteHeight(x,z));
const baseLand={geometry,free:(x,z,r)=>landSurface(x,z,r)&&geometry.free(x,z,r),clearSegment:(a,b,r)=>geometry.clearSegment(a,b,r)};
const environment=buildProvingGround(scene,{extended:true}),seaAir=buildSeaAirField(scene,{provingGroundPresent:true}),roverModel=createRoverModel(scene),planeModel=createAircraftModel(scene),yachtModel=createYachtModel(scene);
const chaseWorld=buildChaseWorld(scene),seaCombatWorld=buildSeaCombatWorld(scene),interceptorWorld=buildChaseWorld(scene,{showMarkers:false,role:'interceptor'}),interceptorCombat=buildSeaCombatWorld(scene,{showPlayerGun:false});
const rover=createRover(),plane=createPlane(),yacht=createYacht(),heli=createFieldHelicopter(HELI_PADS.shore);
const heliModel=createHelicopterModel();scene.add(heliModel.root);const helipads=buildHelipads(scene);
const navalAim=createNavalAim(yacht.yaw);
const guidance=bindVehicleGuidance(),jointWorld=buildJointWorld(scene),lighthouseWorld=buildLighthouseWorld(scene),frontierWorld=buildFrontierWorld(scene);
const rangeWorld=buildTargetRange(scene,range),turretModel=createTurretModel(roverModel.body),fireEffects=createFireEffects(scene),damageSmoke=createDamageSmoke(scene);
const armed=()=>joint.status!=='active'&&chase.status!=='active'&&sortie.status!=='active'&&lighthouse.status!=='active'&&!frontierActive();
const escortWorld=buildEscortWorld(scene);const escorting=()=>escort.status==='active';
function setGunner(on){if(on===gunner)return;gunner=on;if(on)enterGunner(roofGun,rover);else leaveGunner(roofGun);orbit=0;pitch=0;updateCamera(1);}
const checkpointUI=bindJointCheckpointUI({onNotice:notify,onRestore:restoreCheckpoint});
const navalCheckpointUI=bindCheckpointUI({store:createNavalCheckpointStore(),prefix:'naval',fromMission:navalCheckpointFromMission,label:navalCheckpointLabel,channelName:NAVAL_CHECKPOINT_CHANNEL,startSelector:'#start-chase',onNotice:notify,onRestore:restoreNavalCheckpointRun});
const flightWorld=buildFlightMissionWorld(scene),reconWorld=buildReconWorld(scene);
const flightUI=bindFlightMissionUI({getMission:()=>sortie,getPlane:()=>plane,start:startFlight,exit:()=>{recover('airfield');resume();}});
expeditionUI=bindExpeditionUI({root:$('.drive-panel'),launch:launchExpeditionMission,onLeave:()=>{recover();resume();}});
const planeBoxes=[...TEST_OBSTACLES.map(b=>({minX:b.x-b.w/2,maxX:b.x+b.w/2,minZ:b.z-b.d/2,maxZ:b.z+b.d/2,h:b.h})),...TEST_POLES.map(([x,z])=>({minX:x-.25,maxX:x+.25,minZ:z-.25,maxZ:z+.25,h:12})),...FIELD_BUILDINGS,{...DOCK,h:.85},...SITE_VEHICLE_BOXES];
// Helicopter rearm: any known pad (shore/island/frontier airfield) counts while grounded.
const HELI_REARM={get x(){return heliRearmPad().x;},get z(){return heliRearmPad().z;},radius:12};
function heliRearmPad(){let best=HELI_PADS.shore,bd=Infinity;for(const p of [...Object.values(HELI_PADS),...Object.values(FRONTIER_HELIPADS||{})]){if(!p)continue;const d=Math.hypot(heli.x-p.x,heli.z-p.z);if(d<bd){bd=d;best=p;}}return best;}
const HELI_SITE={...FIELD_HELI_SITE,obstacles:[...FIELD_HELI_SITE.obstacles,...SITE_HELI_OBSTACLES]};
const roverWorld={...baseLand,free:(x,z,r)=>{if(!baseLand.free(x,z,r))return false;if(truckBlocks(escort,x,z,r))return false;if(helicopterBlocks(heli,x,z,r+.6))return false;if(!plane.onGround)return true;const f=forward(plane.yaw),side=right(plane.yaw);return [[0,0],[0,3.8],[0,-3.8],[-5.5,0],[5.5,0]].every(([a,b])=>Math.hypot(x-plane.x-side.x*a-f.x*b,z-plane.z-side.z*a-f.z*b)>r+1.2);}};
const walkingWorld={free:(x,z,r)=>footWorld.free(x,z,r)&&!bodyBlocksPlayer(x,z,plane,yacht)&&!helicopterBlocks(heli,x,z,r)&&stepAllowed(player,{x,z},siteHeight)};
const safeExitWorld={geometry,free:(x,z,r)=>{const f=forward(rover.yaw);return walkingWorld.free(x,z,r)&&[-1.25,0,1.25].every(d=>Math.hypot(x-rover.x-f.x*d,z-rover.z-f.z*d)>1.23+r);}};
let player={x:TEST_SPAWN.x-3.3,z:TEST_SPAWN.z+1.3,yaw:Math.atan2(3.3,1.3)},trial=createDriveTrial(),airTrial=createDriveTrial(),seaTrial=createDriveTrial();
const raycaster=new T.Raycaster(),desired=new T.Vector3(),focus=new T.Vector3(),direction=new T.Vector3();
const held=(...codes)=>codes.some(code=>keys.has(code)),entity=()=>kind==='plane'?plane:kind==='yacht'?yacht:kind==='rover'?rover:kind==='helicopter'?heli:player;
function notify(text){message.textContent=text;message.classList.add('visible');messageTime=4;}
function clearInput(){keys.clear();drag=false;fire=false;rocketKey=false;recovery=0;accumulator=0;}
// Suspending or explicitly resuming supersedes any dispatch still waiting for storage.
function pause(){++missionIntent;if(!active)return;active=false;vehicleAudio.pause();clearInput();overlay.hidden=false;document.exitPointerLock?.();$('#drive-overlay-title').textContent='联合试验已暂停';$('#drive-overlay-copy').textContent='载具、波浪与路线计时已冻结。继续会回到原位置；试验调度会回收全部载具并重置三条路线。';$('#resume-drive').textContent='继续试验 →';$('#resume-drive').focus();updateHUD();}
function resume(){if(frontier.status==='won'||frontier.status==='lost'||lighthouse.status==='won'||lighthouse.status==='lost'||joint.status==='won'||joint.status==='lost'||chase.status==='won'||chase.status==='lost'||sortie.status==='won'||sortie.status==='lost'||escort.status==='won'||escort.status==='lost'){notify('请选择重试任务，或返回自由试驾。');return;}++missionIntent;active=true;started=true;vehicleAudio.resume();vehicleAudio.unlock();clearInput();overlay.hidden=true;last=performance.now();recoveryArmed=false;armedStation=null;$('#recover-drive').textContent='回收全部载具并重置路线';canvas.focus();updateHUD();}
function recover(station='garage'){
 vehicleAudio.reset();// New task/restore must not inherit old audio counters or warning timers.
 ++missionIntent;// A newer dispatch/mode selection cancels an older async mission launch.
 expeditionUI?.detach();// Switching mode or restoring a legacy checkpoint never carries campaign score ownership.
 joint=createJointMission();jointArmed=false;const hadLighthouse=lighthouse.status!=='idle'||frontier.status!=='idle';lighthouse=createLighthouseMission();lighthouseArmed=false;frontier=createFrontierMission();frontierArmed=null;Object.assign(rifle,createRifle());
 const hadChase=chase.status!=='idle',hadFlight=sortie.status!=='idle';sortie=createFlightMission();flightUI.reset();chase=createSeaChase();chaseArmed=false;freeArmed=false;$('#resume-drive').hidden=false;if(hadChase||hadFlight||hadLighthouse){$('#drive-overlay-title').textContent='已返回自由试驾';$('#drive-overlay-copy').textContent='任务已结束，全部载具和路线已重置。可继续自由试驾或重新开始海上/飞行任务。';}
 Object.assign(rover,createRover());Object.assign(plane,createPlane());Object.assign(yacht,createYacht());parkHelicopter(heli,HELI_PADS.shore);Object.assign(navalAim,createNavalAim(yacht.yaw));
 const hadEscort=escort.status!=='idle';escort=createEscort();escortArmed=false;if(hadEscort){$('#drive-overlay-title').textContent='已返回自由试驾';$('#drive-overlay-copy').textContent='护送任务已结束，全部载具和路线已重置。';}
 setGunner(false);fire=false;rocketKey=false;Object.assign(roofGun,createWeaponState('roof'));Object.assign(planeGun,createWeaponState('plane'));Object.assign(heliGun,createWeaponState('heli'));Object.assign(wear.rover,createDurability('rover'));Object.assign(wear.yacht,createDurability('yacht'));
 player=station==='airfield'?{x:-308,z:224,yaw:Math.atan2(8,4)}:station==='marina'?{x:270.5,z:183,yaw:Math.atan2(7.5,3)}:station==='shore'?{x:HELI_PADS.shore.x-6,z:HELI_PADS.shore.z+6,yaw:Math.atan2(6,-6)}:{x:TEST_SPAWN.x-3.3,z:TEST_SPAWN.z+1.3,yaw:Math.atan2(3.3,1.3)};
 kind=null;trial=createDriveTrial();airTrial=createDriveTrial();seaTrial=createDriveTrial();orbit=0;pitch=0;flightHeading=plane.yaw;clearInput();updateCamera(1);notify('试验已重置，全部载具返回各自泊位。');updateHUD();
}
function nearby(){const options=[];if(canEnterRover(player,rover,baseLand))options.push(['rover',rover]);if(canBoardPlane(player,plane,footWorld))options.push(['plane',plane]);if(canBoardYacht(player,yacht,footWorld))options.push(['yacht',yacht]);if(canBoardHelicopter(player,heli,footWorld))options.push(['helicopter',heli]);options.sort((a,b)=>Math.hypot(player.x-a[1].x,player.z-a[1].z)-Math.hypot(player.x-b[1].x,player.z-b[1].z));return options[0]?.[0];}
function interact(){
 if(sortie.status==='active'){notify('飞行任务中不能离机；按 Esc 可中止任务或重试。');return;}
 if(chase.status==='active'){notify('追逐任务中不能离船；按 Esc 可重试或返回自由试驾。');return;}
 if(escort.status==='active'&&kind==='rover'){notify('护送任务中不能下车；按 Esc 可中止或重试。');return;}
 if(kind==='helicopter'&&!lighthouseExitAllowed(lighthouse,kind)){notify('撤离飞行中不能离机；请在岸边停机坪着陆并熄火。');return;}
 if(!frontierExitAllowed(frontier,kind)){notify('转场飞行中不能离机；请在目标停机坪着陆并熄火。');return;}
 if(kind){const s=entity(),result=kind==='plane'?planeExit(s,safeExitWorld):kind==='yacht'?yachtExit(s,safeExitWorld):kind==='helicopter'?helicopterExit(s,footWorld):exitRover(s,footWorldWithSegment());if(!result.ok){notify(gunner&&kind==='rover'?'炮手位不能直接下车：空格刹停或按 F 回到驾驶位。':result.reason);return;}player={x:result.x,z:result.z,yaw:s.yaw};if(kind!=='helicopter')s.speed=0;if(kind==='plane')s.throttle=0;if('steer'in s)s.steer=0;kind=null;setGunner(false);notify('已安全离开载具。靠近另一台载具按 E 进入。');}
 else{const target=nearby();if(!target){notify('靠近停稳的载具按 E。飞机在机场，游艇在东侧码头。');return;}if(!jointBoardAllowed(joint,target)){notify('当前联合阶段需要 '+JOINT_LABELS[joint.stage]+'，不能跳过换乘顺序。');return;}if(!lighthouseBoardAllowed(lighthouse,target)){notify(target==='helicopter'?'先完成三处清点，再登上灯塔停机坪的直升机。':lighthouse.stage==='heli'||lighthouse.stage==='lift'?'清点已完成，请到停机坪登上直升机撤离。':'灯塔岛登陆只使用游艇；越野车和飞机不参与本关。');return;}if(!frontierBoardAllowed(frontier,target)){notify('当前阶段需要 '+FRONTIER_LABELS[frontier.id][frontier.stage]+'，这台载具现在不参与。');return;}kind=target;const s=entity();if(kind!=='helicopter')s.speed=0;if(kind==='plane')notify('鼠标左右看即可引导航向 · Shift/Ctrl 油门 · '+flightPitchHint(isFlightInverted())+' · 地面空格刹车');else if(kind==='yacht')notify('高速游艇：W 加速 / S 倒车 · A/D 船舵 · 空格强反推 · 靠泊前提前减速');else if(kind==='helicopter')notify(HELICOPTER_HINT);else notify('W / S 前进与倒车 · A/D 转向 · 空格刹车');}
 orbit=0;pitch=0;flightHeading=plane.yaw;Object.assign(navalAim,createNavalAim(yacht.yaw));clearInput();updateCamera(1);updateHUD();
}
function footWorldWithSegment(){return {...safeExitWorld,clearSegment:(a,b,r)=>geometry.clearSegment(a,b,r)};}
async function launchExpeditionMission(spec,difficulty,checkpoint=null){
 if(checkpoint){
  if(spec.id==='naval')restoreNavalCheckpointRun(checkpoint);else if(spec.id==='joint')restoreCheckpoint(checkpoint);else if(spec.id==='lighthouse')restoreLighthouseRun(checkpoint);else if(FRONTIER_IDS.includes(spec.id))restoreFrontierRun(spec.id,checkpoint);else return null;
  const pick=()=>spec.id==='naval'?chase:spec.id==='lighthouse'?lighthouse:FRONTIER_IDS.includes(spec.id)?frontier:joint;const source=pick();return {source,isCurrent:()=>source===pick()};
 }
 const source=spec.id==='escort'?startEscort(difficulty):spec.id==='naval'?await startChase(difficulty):spec.id==='recon'?startFlight('recon'):spec.id==='lighthouse'?startLighthouse(difficulty):FRONTIER_IDS.includes(spec.id)?startFrontier(spec.id,difficulty):await startJointTask();
 return {source,isCurrent:()=>source===(spec.id==='escort'?escort:spec.id==='naval'?chase:spec.id==='recon'?sortie:spec.id==='lighthouse'?lighthouse:FRONTIER_IDS.includes(spec.id)?frontier:joint)};
}
function startFlight(type='return'){
 recover('airfield');kind='plane';cameraMode='chase';flightHeading=plane.yaw;sortie=createFlightMission(plane,type);resume();notify(type==='recon'?'':'归航试炼：五分钟内完成五门导航、北向返航和跑道停稳；任务中 R 回收不可用。');updateCamera(1);updateHUD();return sortie;
}
function finishFlight(){if(joint.status==='active'&&joint.stage==='recon'){finishJointFlight(joint,sortie.result);sortie=createFlightMission();flightUI.reset();if(joint.status==='lost')finishJoint();else{notify('侦察上传已完成 · 停稳下机，到交接终端按住 F。');updateHUD();}return;}const expeditionOwned=expeditionUI?.finish('recon',sortie)||false;pause();flightUI.finish({record:!expeditionOwned,expedition:expeditionOwned});updateHUD();}
function finishJoint(){const expeditionOwned=expeditionUI?.finish('joint',joint);if(joint.status==='won'&&!expeditionOwned)checkpointUI.complete(joint);pause();$('#resume-drive').hidden=true;$('#drive-overlay-title').textContent='海空接力 · '+(joint.status==='won'?'联合任务完成':'任务中止');$('#drive-overlay-copy').textContent=joint.reason+'。已完成 '+joint.completed.length+'/9 阶段，用时 '+joint.elapsed.toFixed(1)+' 秒'+(joint.recovered?'（检查点继续，不是完整一命用时）':'')+'。本轮不计入单项飞行成绩。'+(expeditionOwned?'先遣队节点和提交结果以上方面板为准。':'失败时可在下方检查点面板恢复最近安全阶段；以保存状态为准。');if(expeditionOwned)$('#drive-overlay-copy').textContent+=EXPEDITION_RESULT_NOTE;$('#drive-overlay-title').tabIndex=-1;$('#drive-overlay-title').focus({preventScroll:true});$('.drive-panel').scrollTop=0;updateHUD();}
function startLighthouse(difficulty=readLighthouseDifficulty()){
 recover('marina');lighthouse=createLighthouseMission(difficulty,true);parkHelicopter(heli,HELI_PADS.island);resume();
 notify('灯塔岛登陆：沿栈桥 E 登船 → 驶向东南灯塔岛浮桥停稳 → E 下船步行上岛 → 三处按住 F 清点 → 登上停机坪直升机，飞回西北岸边停机坪着陆熄火。'+LIGHTHOUSE_PROFILES[lighthouse.profile.id].description);updateHUD();return lighthouse;
}
function restoreLighthouseRun(record){const restored=restoreLighthouseCheckpoint(record);recover('marina');lighthouse=restored.mission;Object.assign(yacht,{...createYacht(),x:491,z:216,yaw:0});parkHelicopter(heli,HELI_PADS.island);player=restored.player;kind=null;orbit=0;pitch=0;clearInput();updateCamera(1);resume();notify('已从安全节点恢复 · '+lighthouseCheckpointLabel(record)+'；直升机冷机停在灯塔停机坪，本轮为检查点继续。');updateHUD();}
function finishLighthouse(){
 const expeditionOwned=expeditionUI?.finish('lighthouse',lighthouse);pause();$('#resume-drive').hidden=true;const s=lighthouseSummary(lighthouse);
 $('#drive-overlay-title').textContent='灯塔岛登陆 · '+(lighthouse.status==='won'?'登陆任务完成':'任务失败');
 $('#drive-overlay-copy').textContent=lighthouse.reason+'。难度 '+s.label+' · 用时 '+lighthouse.elapsed.toFixed(1)+' 秒 · 清点 '+s.surveys+'/'+s.total+' · 阶段 '+s.stageIndex+'/'+s.stages+(lighthouse.recovered?'（安全节点继续，不是完整一命）':'')+'。三处清点完成后先遣队会保存安全节点；重试可从灯塔停机坪继续。不写入单项飞行成绩。'+(expeditionOwned?EXPEDITION_RESULT_NOTE:'');
 updateHUD();$('#start-lighthouse').focus({preventScroll:true});$('.drive-panel').scrollTop=0;
}
$('#start-lighthouse').addEventListener('click',()=>{if(!lighthouseArmed){lighthouseArmed=true;$('#start-lighthouse').textContent='确认开始 · 重置全部载具与路线';return;}lighthouseArmed=false;startLighthouse();});
$('#start-lighthouse').addEventListener('blur',()=>{lighthouseArmed=false;$('#start-lighthouse').textContent=lighthouse.status==='idle'?'开始灯塔岛登陆 · 第 5 关':'重试灯塔岛登陆 · 第 5 关';});
$('#lighthouse-free-drive').addEventListener('click',()=>{recover('marina');resume();});
// ---- Missions 6–8. Start stations: windfarm from the garage (rover), platform from the shore pad (helicopter), radar from the garage with every vehicle available.
function placeFrontierVehicles(id){
 if(id==='windfarm'){parkHelicopter(heli,FRONTIER_HELIPADS.farm);}
 else if(id==='platform'){parkHelicopter(heli,HELI_PADS.shore);Object.assign(yacht,{...createYacht(),...FRONTIER_SITES.mooring});}
 else{parkHelicopter(heli,HELI_PADS.shore);}
}
function startFrontier(id,difficulty=readFrontierDifficulty(id)){
 recover(id==='platform'?'shore':'garage');frontier=createFrontierMission(id,difficulty,true);placeFrontierVehicles(id);resume();
 notify(FRONTIER_TITLES[id]+'：'+FRONTIER_PROFILES[id][frontier.profile.id].description);updateHUD();return frontier;
}
function restoreFrontierRun(id,record){
 const restored=restoreFrontierCheckpoint(id,record);recover(id==='platform'?'shore':'garage');frontier=restored.mission;placeFrontierVehicles(id);
 if(restored.heliPad)parkHelicopter(heli,restored.heliPad);if(restored.rover)Object.assign(rover,{...createRover(),...restored.rover});if(restored.yacht)Object.assign(yacht,{...createYacht(),...restored.yacht});
 player=restored.player;kind=null;orbit=0;pitch=0;clearInput();updateCamera(1);resume();notify('已从安全节点恢复 · '+frontierCheckpointLabel(id,record)+'；本轮为检查点继续。');updateHUD();
}
function finishFrontier(){
 const id=frontier.id,expeditionOwned=expeditionUI?.finish(id,frontier);pause();$('#resume-drive').hidden=true;const s=frontierSummary(frontier);
 $('#drive-overlay-title').textContent=s.title+' · '+(frontier.status==='won'?'任务完成':'任务失败');
 $('#drive-overlay-copy').textContent=frontier.reason+'。难度 '+s.label+' · 用时 '+frontier.elapsed.toFixed(1)+' 秒 · 阶段 '+s.stageIndex+'/'+s.stages+' · 生命 '+s.health+'%'+(frontier.recovered?'（安全节点继续，不是完整一命）':'')+'。先遣队模式下到达安全节点会自动保存；不写入单项飞行成绩。'+(expeditionOwned?EXPEDITION_RESULT_NOTE:'');
 updateHUD();$('#start-'+id).focus({preventScroll:true});$('.drive-panel').scrollTop=0;
}
for(const id of FRONTIER_IDS){
 const button=$('#start-'+id),index=FRONTIER_IDS.indexOf(id)+6;
 button.addEventListener('click',()=>{if(frontierArmed!==id){frontierArmed=id;button.textContent='确认开始 · 重置全部载具与路线';return;}frontierArmed=null;startFrontier(id);});
 button.addEventListener('blur',()=>{frontierArmed=null;button.textContent=(frontier.status!=='idle'&&frontier.id===id?'重试':'开始')+FRONTIER_TITLES[id]+' · 第 '+index+' 关';});
}
$('#frontier-free-drive').addEventListener('click',()=>{recover();resume();});
{const select=$('#frontier-difficulty-select'),copy=$('#frontier-difficulty-copy');if(select){select.value=readFrontierDifficulty('windfarm');const sync=()=>{copy.textContent=FRONTIER_IDS.map(id=>FRONTIER_TITLES[id]+'：'+FRONTIER_PROFILES[id][normalizeFrontier(id,select.value)].description).join(' ');};sync();select.addEventListener('change',()=>{try{localStorage.setItem(FRONTIER_KEY,normalizeFrontier('windfarm',select.value));}catch{}sync();});}}
{const select=$('#lighthouse-difficulty-select'),copy=$('#lighthouse-difficulty-copy');if(select){select.value=readLighthouseDifficulty();const sync=()=>{copy.textContent=LIGHTHOUSE_PROFILES[normalizeLighthouse(select.value)].description;};sync();select.addEventListener('change',()=>{try{localStorage.setItem(LIGHTHOUSE_KEY,normalizeLighthouse(select.value));}catch{}sync();});}}
function restoreCheckpoint(record){const restored=restoreJointCheckpoint(record);recover();joint=restored.mission;Object.assign(rover,restored.rover);Object.assign(plane,restored.plane);Object.assign(yacht,restored.yacht);Object.assign(navalAim,createNavalAim(yacht.yaw));player=restored.player;kind=null;orbit=0;pitch=0;flightHeading=plane.yaw;clearInput();updateCamera(1);resume();notify('已恢复安全阶段 · '+JOINT_LABELS[joint.stage]+'；本轮为检查点继续。');return joint.runId;}
async function startJointTask(){
 const intent=++missionIntent,candidate=createJointMission(true);if(!await checkpointUI.begin(candidate.runId,()=>intent===missionIntent)||intent!==missionIntent)return null;
 recover();joint=candidate;resume();notify('海空接力：步行到设备终端，按住 F 领取，再驾驶越野车前往码头。');return joint;
}
$('#start-joint').addEventListener('click',async()=>{if(!jointArmed){jointArmed=true;$('#start-joint').textContent='确认从头开始 · 到达新节点后替换旧检查点';return;}await startJointTask();});
$('#start-joint').addEventListener('blur',()=>{jointArmed=false;$('#start-joint').textContent='开始联合任务 · 海空接力';});
$('#abort-joint').addEventListener('click',()=>{if(!confirm('中止联合任务并回收全部载具？实时位置将重置，已成功保存的安全检查点会保留。'))return;recover();resume();});
function startEscort(difficulty=readEscortDifficulty()){
 recover('garage');Object.assign(rover,createRover(ESCORT_START.rover));player={...ESCORT_START.player};kind='rover';cameraMode='chase';orbit=0;pitch=0;escort=createEscort(difficulty,true);setGunner(true);resume();
 notify('荒原车队护送：F 在炮手位/驾驶位切换 · 炮手位时车辆自动跟随卡车 · 红色地面线是猎犬机突进预警，可打断或躲开');updateHUD();return escort;
}
function finishEscort(){
 const expeditionOwned=expeditionUI?.finish('escort',escort,{roverHull:wear.rover.hull});
 pause();$('#resume-drive').hidden=true;const s=escortSummary(escort);$('#drive-overlay-title').textContent='荒原车队护送 · '+(escort.status==='won'?'车队抵达':'任务失败');
 $('#drive-overlay-copy').textContent=escort.reason+'。难度 '+s.label+' · 用时 '+s.elapsed.toFixed(1)+' 秒 · 卡车耐久 '+s.truckHull+'% · 护送车耐久 '+Math.ceil(wear.rover.hull)+'% · 击毁猎犬机 '+s.killed+'/'+s.total+' · 卡车被撞 '+s.truckHits+' 次。可直接重试；不写入 FPS 战役存档。';
 if(expeditionOwned)$('#drive-overlay-copy').textContent+=EXPEDITION_RESULT_NOTE;updateHUD();$('#start-escort').focus({preventScroll:true});$('.drive-panel').scrollTop=0;
}
$('#start-escort').addEventListener('click',()=>{if(!escortArmed){escortArmed=true;$('#start-escort').textContent='确认开始 · 重置全部载具与路线';return;}escortArmed=false;startEscort();});
$('#start-escort').addEventListener('blur',()=>{escortArmed=false;$('#start-escort').textContent=escort.status==='idle'?'开始车队护送 · 荒原车队':'重试车队护送 · 荒原车队';});
$('#escort-free-drive').addEventListener('click',()=>{recover('garage');resume();});
{const select=$('#escort-difficulty-select'),copy=$('#escort-difficulty-copy');if(select){select.value=readEscortDifficulty();const sync=()=>{copy.textContent=ESCORT_PROFILES[normalizeEscort(select.value)].description;};sync();select.addEventListener('change',()=>{try{localStorage.setItem(ESCORT_KEY,normalizeEscort(select.value));}catch{}sync();});}}
async function startChase(difficulty=selectedNavalDifficulty()){
 const intent=++missionIntent,candidate=createNavalRun(yacht,difficulty);if(!await navalCheckpointUI.begin(candidate.runId,()=>intent===missionIntent)||intent!==missionIntent)return null;
 recover('marina');kind='yacht';cameraMode='chase';orbit=0;pitch=0;chase=createNavalRun(yacht,candidate.naval.profile.id,candidate.runId);resume();notify('南湾突围：穿过 3 个检查点，甩开或击毁全部敌艇后减速撤离；鼠标 360° 环视瞄准、左键舰炮、Q 查看敌艇状态，注意错峰齐射预警。每过一个检查点自动保存安全节点。');updateHUD();return chase;
}
function restoreNavalCheckpointRun(record){const restored=restoreNavalCheckpoint(record);recover('marina');chase=restored.task;Object.assign(yacht,restored.yacht);Object.assign(navalAim,createNavalAim(yacht.yaw));kind='yacht';cameraMode='chase';orbit=0;pitch=0;clearInput();updateCamera(1);resume();notify('已从安全节点恢复 · '+navalCheckpointLabel(record)+'；敌艇重新就位，本轮为检查点继续。');updateHUD();return chase.runId;}
$('#start-chase').addEventListener('click',()=>{if(!chaseArmed){chaseArmed=true;$('#start-chase').textContent='确认开始 · 重置全部载具与路线';return;}startChase();});
$('#start-chase').addEventListener('blur',()=>{chaseArmed=false;$('#start-chase').textContent=chase.status==='idle'?'开始海上追逐 · 南湾突围':'重试海上追逐 · 南湾突围';});
$('#chase-free-drive').addEventListener('click',()=>{if(!freeArmed){freeArmed=true;$('#chase-free-drive').textContent='确认结束任务 · 返回码头自由试驾';return;}recover('marina');resume();});
$('#chase-free-drive').addEventListener('blur',()=>{freeArmed=false;$('#chase-free-drive').textContent='结束追逐，返回自由试驾';});
function finishChase(){
 const expeditionOwned=expeditionUI?.finish('naval',chase);
 if(chase.status==='won'&&!expeditionOwned)navalCheckpointUI.complete(chase);pause();$('#resume-drive').hidden=true;$('#drive-overlay-title').textContent=chase.status==='won'?'南湾突围 · 撤离成功':'南湾突围 · 任务失败';$('#drive-overlay-copy').textContent=chase.reason+'。难度 '+chase.naval.profile.label+' · 用时 '+chase.elapsed.toFixed(1)+' 秒'+(chase.recovered?'（检查点继续，不是完整一命用时）':'')+' · 检查点 '+chase.index+'/3 · 剩余船体 '+Math.ceil(chase.hull)+'% · 舰炮命中 '+navalSummary(chase).hits+'/'+navalSummary(chase).shots+'。可直接重试'+(expeditionOwned?'；先遣队节点和提交结果以上方面板为准':chase.status==='won'?'；本轮安全节点已关闭':'，或在下方从最近安全节点继续')+'；不写入 FPS 战役存档。';if(expeditionOwned)$('#drive-overlay-copy').textContent+=EXPEDITION_RESULT_NOTE;updateHUD();$('#start-chase').focus({preventScroll:true});$('.drive-panel').scrollTop=0;
}
$('#resume-drive').addEventListener('click',resume);$('#pause-drive').addEventListener('click',pause);
$('#recover-drive').addEventListener('click',()=>{if(!recoveryArmed){recoveryArmed=true;$('#recover-drive').textContent='确认回收全部载具并清零路线';return;}recover();recoveryArmed=false;$('#recover-drive').textContent='回收全部载具并重置路线';});
$('#recover-drive').addEventListener('blur',()=>{recoveryArmed=false;$('#recover-drive').textContent='回收全部载具并重置路线';});
for(const button of document.querySelectorAll('[data-station]')){const original=button.textContent;button.addEventListener('click',()=>{if(armedStation!==button.dataset.station){armedStation=button.dataset.station;button.textContent='确认调度 · 重置全部路线';return;}recover(button.dataset.station);resume();});button.addEventListener('blur',()=>{armedStation=null;button.textContent=original;});}
$('#return-menu').addEventListener('click',e=>{if(started&&!confirm('返回主菜单？试验区位置与路线会重置；已成功保存的飞行成绩和联合检查点会保留，原六章存档不受影响。'))e.preventDefault();});
overlay.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const buttons=[...overlay.querySelectorAll('button,input,select,summary,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
window.addEventListener('keydown',e=>{
 if(e.code==='Escape'){e.preventDefault();if(e.repeat)return;if(active)pause();else if(started)resume();return;}if(!active)return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyF','KeyE','KeyC','KeyR','KeyQ','KeyZ','KeyG','KeyI','ShiftLeft','ShiftRight','ControlLeft','ControlRight'].includes(e.code))e.preventDefault();
 if(e.repeat)return;keys.add(e.code);if(e.code==='KeyQ'&&kind==='yacht'&&chase.naval&&chase.status==='active'){cycleNavalTarget(chase);notify('观察敌艇：'+navalSummary(chase).target.label+'（不改变炮口）');}if(e.code==='KeyE')interact();if(e.code==='KeyI'&&kind==='helicopter'){if(heli.status==='crashed')notify('机体损坏，请回收。');else if(!heli.grounded)notify('空中不能熄火。');else if(heli.powered){heli.powered=false;heli.collective=0;notify('发动机熄火 · 等待旋翼停转后可 E 离机');}else{heli.status='running';heli.powered=true;notify('发动机启动 · Shift 拉起');}}if(e.code==='KeyF'&&kind==='rover'){if(!armed()&&!frontierActive())notify('任务进行中，车顶机枪不可用。');else{setGunner(!gunner);notify(gunner?(escorting()?'炮手位 · 车辆自动跟随卡车 · 鼠标瞄准，左键射击，F 回驾驶位':'已切换到炮手位 · 车辆保持直行 3 秒 · 鼠标瞄准，左键射击，空格刹车，F 回驾驶位'):'已回到驾驶位');}}if(e.code==='KeyG')rocketKey=true;if(e.code==='KeyC'&&kind&&!gunner){cameraMode=cameraMode==='chase'?'hood':'chase';orbit=0;pitch=0;flightHeading=plane.yaw;updateCamera(1);notify(cameraMode==='hood'?'已切换前向视角':'已切换追尾视角');}
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyG')rocketKey=false;});
// Gamepad: polled once per frame; held buttons/sticks are injected as key codes, taps are replayed through the keydown handler.
const gamepad=createVehicleGamepad({getGamepads:()=>navigator.getGamepads?.()||[]});window.neonVehicleGamepad=gamepad;let padFire=false,padLook={x:0,y:0},padSeen=false;
function pollGamepad(){
 const f=gamepad.poll();
 if(!gamepad.connected){if(padFire){padFire=false;fire=false;}return;}
 if(!padSeen){padSeen=true;notify(VEHICLE_PAD_HELP);}
 for(const code of f.edges){if(code==='Escape'){if(active)pause();else if(started)resume();continue;}if(!active)continue;window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));}
 if(!active){for(const c of gamepad.reset())keys.delete(c);return;}
 for(const c of f.release)keys.delete(c);for(const c of f.press)keys.add(c);
 if(f.fire!==padFire){padFire=f.fire;fire=f.fire;}
 rocketKey=f.rocket||held('KeyG');
 padLook=f.look;
 if(padLook.x||padLook.y)applyLook(padLook.x,padLook.y);
}window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
canvas.addEventListener('click',()=>{if(active&&document.pointerLockElement!==canvas){try{const request=canvas.requestPointerLock?.();request?.catch(()=>notify('鼠标锁定不可用，可按住左键拖动视角。'));}catch{notify('可按住左键拖动视角。');}}});
canvas.addEventListener('mousedown',e=>{if(!active)return;if(e.button===0){drag=true;fire=true;}if(e.button===2){if(kind==='yacht')drag=true;else rocketKey=true;}});window.addEventListener('mouseup',e=>{drag=kind==='yacht'?!!(e.buttons&3):false;if(e.button===0)fire=false;if(e.button===2)rocketKey=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('pointerlockchange',()=>{const was=locked;locked=document.pointerLockElement===canvas;if(was&&!locked&&active)pause();});document.addEventListener('pointerlockerror',()=>notify('鼠标锁定不可用，可按住左键拖动视角。'));
function applyLook(mx,my){if(kind==='rover'&&gunner){aimTurret(roofGun,mx*.003,-my*.003);return;}if(kind==='yacht'){turnNavalAim(navalAim,mx,my);return;}if(kind==='plane'){flightHeading=moveFlightHeading(flightHeading,plane.yaw,mx*.003);orbit=wrapHeading(flightHeading-plane.yaw);}else if(kind)orbit=Math.max(-1.35,Math.min(1.35,orbit+mx*.003));else player.yaw+=mx*.003;pitch=Math.max(-.8,Math.min(.8,pitch-my*.003));}
window.addEventListener('mousemove',e=>{if(!active||(!locked&&!drag))return;applyLook(Math.max(-200,Math.min(200,e.movementX||0)),Math.max(-200,Math.min(200,e.movementY||0)));});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function updatePhysics(dt){
 const from={...entity()},axis=Number(held('KeyD','ArrowRight'))-Number(held('KeyA','ArrowLeft')),throttle=Number(held('KeyW','ArrowUp'))-Number(held('KeyS','ArrowDown'));
 const hullBefore={rover:wear.rover.hull,yacht:wear.yacht.hull},planeLandingsBefore=plane.landings;
 if(kind==='rover'){
  const speedBefore=rover.speed;if(gunner&&held('Space'))roofGun.cruise=0;
  const driverInput=gunner?(escorting()?escortFollowInput(escort,rover):{...gunnerDriveInput(roofGun,rover,dt),brake:held('Space')}):{throttle,steer:axis,brake:held('Space')};
  stepRover(rover,limitInput(wear.rover,driverInput),dt,roverWorld);clampSpeed(wear.rover,rover,ROVER.maxSpeed,ROVER.reverseSpeed);
  const tierBefore=durabilityTier(wear.rover);if(stepImpactDamage(wear.rover,rover,speedBefore)){const tier=durabilityTier(wear.rover);notify('车体受损 · 耐久 '+Math.ceil(wear.rover.hull)+'%'+(tier!==tierBefore?(tier==='disabled'?' · 动力失效，跛行回车库维修':' · 冒烟，操控下降 20%'):''));}
  if(stepRepair(wear.rover,rover,dt))notify('车库维修完成 · 车体耐久 100%');
  if(wear.rover.hull<hullBefore.rover)audioHullHits++;
  if(stepRearm(roofGun,rover,dt,REPAIR_STATIONS.rover))notify('车顶机枪已补弹');
 }
 else if(kind==='plane'){
  const before=plane.crashed,rx=Math.abs(Math.cos(rover.yaw))*1.3+Math.abs(Math.sin(rover.yaw))*2.4,rz=Math.abs(Math.sin(rover.yaw))*1.3+Math.abs(Math.cos(rover.yaw))*2.4;const vehicleObstacle={minX:rover.x-rx,maxX:rover.x+rx,minZ:rover.z-rz,maxZ:rover.z+rz,h:2.5},heliBox=helicopterPlaneBox(heli);
  const manualRudder=Number(held('KeyD','KeyZ'))-Number(held('KeyA','KeyQ')),manualRoll=Number(held('ArrowRight'))-Number(held('ArrowLeft'));
  const rudderDelta=stepPlane(plane,{heading:flightHeading,throttle:Number(held('ShiftLeft','ShiftRight'))-Number(held('ControlLeft','ControlRight')),elevator:flightElevator(Number(held('KeyW'))-Number(held('KeyS')),isFlightInverted())+Number(held('ArrowDown'))-Number(held('ArrowUp')),roll:manualRoll,rudderAssist:manualRudder,brake:held('Space')},dt,heliBox?[...planeBoxes,vehicleObstacle,heliBox]:[...planeBoxes,vehicleObstacle]);
  if(manualRoll)flightHeading=plane.yaw;else flightHeading=wrapHeading(flightHeading+(rudderDelta||0));
  orbit=wrapHeading(flightHeading-plane.yaw);
  if(sortie.status==='active'){
   const phase=sortie.phase,index=sortie.route.index;stepFlightMission(sortie,plane,from,dt,{scan:held('KeyF'),boxes:[...planeBoxes,vehicleObstacle]});
   if(sortie.status!=='active'){finishFlight();return;}
   if(phase!==sortie.phase||index!==sortie.route.index)notify(flightTitle(sortie)+' · '+flightPhase(sortie)+' · '+flightProgress(sortie));
  }
  if(plane.crashed&&!before){if(joint.status==='active'){joint.status='lost';joint.reason='飞机受损，联合任务中止';finishJoint();return;}if(frontierActive()){frontier.status='lost';frontier.reason='飞机受损，任务中止';finishFrontier();return;}pause();$('#drive-overlay-title').textContent='飞机受损 · 试验中止';$('#drive-overlay-copy').textContent='触地姿态、速度、障碍或边界导致迫停。请使用试验调度回收；空中不能直接离机。';notify('飞机受损，请回收后重新起飞。');}
 }else if(kind==='yacht'){
  const speedBefore=yacht.speed,inChase=chase.status==='active',landingsBefore=plane.landings;void landingsBefore;
  stepYacht(yacht,inChase?{throttle,steer:axis,brake:held('Space')}:limitInput(wear.yacht,{throttle,steer:axis,brake:held('Space')}),dt);
  if(!inChase){clampSpeed(wear.yacht,yacht,YACHT.maxSpeed,YACHT.reverseSpeed);const tierBefore=durabilityTier(wear.yacht);if(stepImpactDamage(wear.yacht,yacht,speedBefore)){const tier=durabilityTier(wear.yacht);notify('船体受损 · 耐久 '+Math.ceil(wear.yacht.hull)+'%'+(tier!==tierBefore?(tier==='disabled'?' · 动力失效，跛行回码头维修':' · 冒烟，操控下降 20%'):''));}if(stepRepair(wear.yacht,yacht,dt))notify('码头维修完成 · 船体耐久 100%');if(wear.yacht.hull<hullBefore.yacht)audioHullHits++;}
  if(chase.status==='active'){const previousHull=chase.hull,previousAlive=navalSummary(chase).alive,previousGate=chase.index;stepNavalMission(chase,yacht,from,dt,{fire:fire||held('KeyF'),aimPoint:navalAimPoint(navalAim,yacht)});if(chase.status==='active'&&chase.index>previousGate&&chase.index<=CHASE_GATES.length){if(!expeditionUI?.saveCheckpoint('naval',chase))navalCheckpointUI.save(chase);audioCheckpoints++;}if(chase.hull<previousHull){audioHullHits++;notify('船体受损 · 耐久 '+Math.ceil(chase.hull)+'%');}if(navalSummary(chase).alive<previousAlive)notify('敌艇已击毁 · 剩余 '+navalSummary(chase).alive+' 艘。仍需完成航点并撤离。');if(chase.status!=='active'){finishChase();return;}}
 }
 else if(kind==='helicopter'){
  const before=heli.status,landings=heli.landings;stepHelicopter(heli,helicopterInput(held),dt,{...HELI_SITE,obstacles:[...HELI_SITE.obstacles,...vehicleHeliObstacles(plane,rover)]});heli.speed=helicopterSpeed(heli);
  if(heli.landings>landings)audioLandings++;
  if(heli.status==='crashed'&&before!=='crashed'){if(lighthouse.status!=='active'&&!frontierActive()){pause();$('#drive-overlay-title').textContent='直升机受损 · 试验中止';$('#drive-overlay-copy').textContent=heli.reason+'。请使用试验调度回收；空中不能离机。';notify('直升机受损，请回收后重试。');}}
 }
 else walkPlayer(player,{forward:throttle,side:axis,sprint:held('ShiftLeft','ShiftRight')},dt,walkingWorld,rover);
 if(!kind&&frontierActive()){const shot=stepRifle(rifle,player,pitch,groundAt(player.x,player.z),{fire},dt,frontierRange(),frontierBoxes());if(shot?.target&&!shot.target.alive)notify(({drone:'哨戒机击落',turret:'炮塔摧毁',dish:'天线摧毁',mech:'机甲击毁'})[shot.target.type]+' · 剩余 '+aliveHostiles(frontier).length);}
 stepRange(range,dt);const live=armed();
 if(escorting()){escortRange.targets.length=0;for(const t of range.targets)escortRange.targets.push(t);for(const h of escort.hounds)if(h.alive)escortRange.targets.push(h);}
 const escortHitsBefore=escortRange.hits,escortKillsBefore=escortRange.kills;
 const roofShot=stepRoofGun(roofGun,rover,{fire:fire&&gunner&&kind==='rover'&&(live||frontierActive())},dt,frontierActive()?frontierRange():escorting()?escortRange:range,planeBoxes,{ground:terrainHeight(rover.x,rover.z)});
 if(roofShot?.target&&roofShot.target.type!=='hound'&&!frontierActive()){range.hits+=escortRange.hits-escortHitsBefore;range.kills+=escortRange.kills-escortKillsBefore;}// range targets hit while escorting still count for the range boardif(roofShot?.target&&!roofShot.target.alive)notify(roofShot.target.type==='hound'?'猎犬机击毁 · 剩余 '+escortSummary(escort).alive:'靶标击破 · 累计 '+roofGun.kills);
 if(escorting()){const events=stepEscort(escort,{rover,wear:wear.rover,free:baseLand.free},dt)||[];if(events.includes('wave'))audioWaves++;if(events.includes('wave'))notify('伏击！第 '+escort.waveIndex+' 波猎犬机 · 注意红色地面预警线');if(escort.status!=='active'){finishEscort();return;}}
 const planeShot=stepPlaneGun(planeGun,plane,{fire:fire&&kind==='plane'&&(live||frontierActive())&&!plane.onGround,rocket:rocketKey&&kind==='plane'&&(live||frontierActive())&&!plane.onGround},dt,frontierActive()?frontierRange():range,planeBoxes);if(planeShot?.target&&!planeShot.target.alive)notify('空中靶标击破 · 累计 '+planeGun.kills);
 {const heliLive=kind==='helicopter'&&(live||frontierActive());const heliShot=stepHeliGun(heliGun,heli,{fire:fire&&heliLive,rocket:rocketKey&&heliLive},dt,frontierActive()?frontierRange():range,planeBoxes);if(heliShot?.target&&!heliShot.target.alive)notify('直升机机炮击破 · 累计 '+heliGun.kills);
  if(kind==='helicopter'&&heli.grounded&&stepRearm(heliGun,heli,dt,HELI_REARM,{stopped:true})){audioRearms++;notify('停机坪补给完成 · 机炮弹链与 2 枚火箭已装填');}}
 if(kind==='plane'&&plane.onGround&&!plane.crashed&&stepRearm(planeGun,plane,dt,REPAIR_STATIONS.plane)){audioRearms++;notify('机库补给完成 · 机炮弹链与 2 枚火箭已装填');}
 if(plane.landings>planeLandingsBefore)audioLandings++;
 if(!active)return;
 if(frontierActive()){
  const healthBefore=frontier.health,stageBefore=frontier.stage,gateBefore=frontier.gate,aliveBefore=aliveHostiles(frontier).length+(frontier.mech?.alive?1:0);
  const changed=stepFrontierMission(frontier,{kind,player,rover,yacht,plane,heli,action:held('KeyF'),boxes:planeBoxes,ground:groundAt},dt);
  {const aliveAfter=aliveHostiles(frontier).length+(frontier.mech?.alive?1:0);if(aliveAfter<aliveBefore)audioFrontierKills+=aliveBefore-aliveAfter;}
  if(frontier.health<healthBefore){audioHullHits++;notify('受到 '+frontier.lastHit+' 攻击 · 生命 '+Math.ceil(frontier.health)+'%');}
  if(changed){if(frontier.status!=='active'){finishFrontier();return;}audioCheckpoints++;if(frontier.stage!==stageBefore){expeditionUI?.saveCheckpoint(frontier.id,frontier);notify('阶段 · '+FRONTIER_LABELS[frontier.id][frontier.stage]);}else if(frontier.gate!==gateBefore)notify(frontier.lastMessage||'');}
 }
 if(lighthouse.status==='active'){
  const changed=stepLighthouseMission(lighthouse,{kind,player,yacht,heli,action:held('KeyF')},dt);
  if(changed){if(lighthouse.status!=='active'){finishLighthouse();return;}audioCheckpoints++;expeditionUI?.saveCheckpoint('lighthouse',lighthouse);notify('登陆阶段 · '+LIGHTHOUSE_LABELS[lighthouse.stage]);}
 }
 if(joint.status==='active'){
  const changed=stepJointMission(joint,{kind,player,rover,yacht,plane,action:held('KeyF')},dt);
  if(changed){if(!expeditionUI?.saveCheckpoint('joint',joint))checkpointUI.save(joint);audioCheckpoints++;if(joint.stage==='recon'){sortie=createFlightMission(plane,'recon');joint.flightId=sortie.attempt.id;flightHeading=plane.yaw;}if(joint.status==='won'){finishJoint();return;}notify('联合阶段 · '+JOINT_LABELS[joint.stage]);}
 }
 if(joint.status!=='active'&&stepDriveTrial(trial,kind==='rover'?from:rover,rover,dt,kind==='rover'))notify(trial.complete?'陆地路线完成，可继续试驾或前往机场与码头。':'陆地检查点 '+trial.index+' / 6');
 if(joint.status!=='active'&&sortie.status==='idle'&&routeStep(airTrial,FLIGHT_GATES,kind==='plane'?from:plane,plane,dt,kind==='plane'&&!plane.onGround,23,true))notify(airTrial.complete?'飞行路线完成，请返回跑道安全降落。':'飞行导航门 '+airTrial.index+' / 5');
 if(joint.status!=='active'&&chase.status==='idle'&&routeStep(seaTrial,WATER_GATES,kind==='yacht'?from:yacht,yacht,dt,kind==='yacht',15))notify(seaTrial.complete?'海上路线完成，请停稳并靠泊。':'海上浮标 '+seaTrial.index+' / 5');
 if(held('KeyR')&&(joint.status==='active'||chase.status==='active'||sortie.status==='active'||escort.status==='active'||lighthouse.status==='active'||frontierActive())){recovery=0;return;}
 if(held('KeyR')){const s=entity();if((kind!=='plane'||plane.onGround||plane.crashed)&&(kind!=='helicopter'||heli.grounded||heli.status==='crashed')&&(!kind||Math.abs(s.speed||0)<1.2)){recovery+=dt;if(recovery>=1.5)recover(kind==='plane'?'airfield':kind==='yacht'||kind==='helicopter'?'marina':'garage');}else{recovery=0;notify('行驶或飞行中不能快速回收；需要时在暂停菜单使用试验调度。');}}else recovery=0;
}
function updateCamera(blend){
 if(kind==='rover'&&gunner){const ground=terrainHeight(rover.x,rover.z),d=aimDirection(roofGun.aimYaw,roofGun.aimPitch);camera.position.set(rover.x-d.x*.9,ground+ROOF_GUN.mountHeight+.55,rover.z-d.z*.9);camera.lookAt(rover.x+d.x*40,camera.position.y+d.y*40,rover.z+d.z*40);}
 else if(kind==='yacht'){
  const view=navalCameraPose(navalAim,yacht,cameraMode);focus.set(yacht.x,3.5,yacht.z);desired.copy(view.eye);direction.copy(desired).sub(focus);const length=direction.length();raycaster.set(focus,direction.normalize());raycaster.far=length;
  const hit=raycaster.intersectObjects(scene.children.filter(object=>object.isMesh),false)[0];if(hit&&hit.distance<length)desired.copy(focus).addScaledVector(direction,Math.max(1,hit.distance-.4));
  camera.position.copy(desired);camera.lookAt(view.target.x,view.target.y,view.target.z);
 }
 else if(kind){if(kind==='plane')orbit=wrapHeading(flightHeading-plane.yaw);const s=entity(),f=forward(s.yaw+orbit),base=forward(s.yaw),height=kind==='plane'?s.y:kind==='yacht'?1:kind==='helicopter'?s.y:terrainHeight(s.x,s.z),isPlane=kind==='plane'||kind==='helicopter',isBoat=kind==='yacht';
  if(cameraMode==='chase'){focus.set(s.x,height+(isPlane?.3:isBoat?1.5:1.75),s.z);const distance=isPlane?22:isBoat?18:8.2;desired.set(s.x-f.x*distance,height+(isPlane?7:isBoat?8:4.1)+pitch*2,s.z-f.z*distance);
   direction.copy(desired).sub(focus);const length=direction.length();raycaster.set(focus,direction.normalize());raycaster.far=length;const hit=raycaster.intersectObjects(scene.children.filter(object=>object.isMesh),false)[0];if(hit&&hit.distance<length)desired.copy(focus).addScaledVector(direction,Math.max(1,hit.distance-.4));camera.position.lerp(desired,blend);camera.lookAt(focus);
  }else{const ahead=isPlane?2.3:isBoat?2:1.1;camera.position.set(s.x+base.x*ahead,height+(isPlane?.85:isBoat?2.3:2.12),s.z+base.z*ahead);camera.lookAt(camera.position.x+f.x*15,camera.position.y+pitch*8+(isPlane?Math.sin(s.pitch)*15:0),camera.position.z+f.z*15);}
 }else{const f=forward(player.yaw);camera.position.set(player.x,groundAt(player.x,player.z)+1.7,player.z);camera.lookAt(player.x+f.x*10,camera.position.y+pitch*8,player.z+f.z*10);}
 const s=entity();sun.target.position.set(s.x,0,s.z);sun.position.set(s.x-55,85,s.z-40);
}
const radar=$('#drive-radar'),ctx=radar.getContext('2d');
function updateHUD(){
 const fleet=chase.naval?navalSummary(chase):null,profile=chase.naval?.profile;
 const chasing=chase.status!=='idle',s=entity(),current=chasing?chase:kind==='plane'?(sortie.status==='idle'?airTrial:sortie.route):kind==='yacht'?seaTrial:trial,gates=chasing?[...CHASE_GATES,CHASE_EVAC]:kind==='plane'?flightCourse(sortie):kind==='yacht'?WATER_GATES:DRIVE_GATES;
 $('#drive-speed').textContent=kind?Math.round(Math.abs(s.speed)*3.6):0;$('#drive-mode').textContent=kind==='plane'?'AIR / 固定翼':kind==='helicopter'?'AIR / 直升机':kind==='yacht'?'SEA / 游艇':kind==='rover'?(gunner?'ROVER / 炮手':'ROVER / 驾驶'):'步行';$('#drive-camera-label').textContent=kind?(gunner?'炮手视角':cameraMode==='chase'?'追尾视角':'前向视角'):'自由视角';
 $('#drive-gear').textContent=kind==='plane'?(plane.crashed?'受损':plane.onGround?'地面':plane.stall?'失速':'飞行'):kind==='helicopter'?helicopterStatusLabel(heli):kind?(s.speed<-.1?'R':s.speed>.1?'D':'N'):'—';$('#speed-fill').style.width=(kind?Math.min(100,Math.abs(s.speed)/(kind==='plane'?78:kind==='yacht'?YACHT.maxSpeed:29)*100):0)+'%';
 $('#drive-distance').textContent=kind?(s.distance>1000?(s.distance/1000).toFixed(2)+' km':Math.floor(s.distance)+' m'):'0 m';$('#drive-impacts').textContent=kind?(s.impacts||0):0;$('#drive-time').textContent=current.started?current.elapsed.toFixed(1)+' s':'—';
 $('#flight-instruments').hidden=kind!=='plane';$('#flight-altitude').textContent=Math.max(0,plane.y-1.3).toFixed(0)+' m';$('#flight-throttle').textContent=Math.round(plane.throttle*100)+'%';$('#flight-vspeed').textContent=plane.verticalSpeed.toFixed(1)+' m/s';$('#flight-landings').textContent=plane.landings;
 const headingError=wrapHeading(flightHeading-plane.yaw)*180/Math.PI;$('#flight-heading-status').textContent=Math.abs(headingError)<1?'鼠标航向 · 已对准':'鼠标航向 · '+(headingError<0?'← 左转 ':'右转 → ')+Math.abs(headingError).toFixed(0)+'°';
 document.body.dataset.flightCameraOrbit=orbit.toFixed(5);
 document.body.dataset.flightHeadingError=headingError.toFixed(2);document.body.dataset.flightYaw=plane.yaw.toFixed(5);document.body.dataset.flightLookHeading=flightHeading.toFixed(5);
 $('#flight-warning').textContent=plane.crashed?'飞机受损 · 暂停菜单回收':plane.stall?'失速警告：增加油门，降低机头':plane.y>270?'接近 300 米试验高度上限':plane.onGround?'起飞：提高油门至 100%，速度超过 101 km/h 后按'+(isFlightInverted()?'W':'S')+' 抬头':'巡航建议 25–40% 油门。降落：机翼放平，下降率 <6 m/s，速度 <173 km/h';
 $('#route-fill').style.width=current.index/gates.length*100+'%';$('#route-label').textContent=(kind==='plane'?'飞行导航':kind==='yacht'?'海上浮标':'路线检查点')+' '+current.index+' / '+gates.length+(current.complete?' · 已完成':'');$('#drive-crosshair').hidden=kind?(!gunner&&!(kind==='yacht'&&chase.status==='active')&&!(frontierActive()&&kind==='plane')):!frontierActive();
 $('#look-help').textContent=kind==='yacht'?'鼠标 360° 环视 · 点击锁定鼠标 · 未锁定可右键拖动瞄准':'点击场景锁定鼠标 · 也可按住左键拖动视角';
 const gate=gates[current.index],nearest=kind?null:nearby();$('#drive-task').textContent=recovery>0?'正在回收 '+Math.round(recovery/1.5*100)+'%':!kind?(nearest?'按 E 进入'+({rover:'越野车',plane:'固定翼飞机',yacht:'游艇',helicopter:'直升机'}[nearest]):'寻找载具 · 机场西侧 / 码头东侧 · 暂停菜单可试验调度'):current.complete?(kind==='plane'?'导航完成 · 请安全降落':kind==='yacht'?'巡航完成 · 请靠泊停稳':'路线完成 · 自由探索'):gate.name+' · '+Math.round(Math.hypot(s.x-gate.x,s.z-gate.z))+' m'+(kind==='plane'?' / 高度 '+gate.y+' m':'');
 $('#control-hints').textContent=kind==='plane'?'鼠标引导航向 + A/D 叠加方向舵 · ←/→ 滚转 · Shift/Ctrl 油门 · '+flightPitchHint(isFlightInverted())+' · C 切视角 · 空格地面刹车'+(armed()?' · 左键机炮 · 右键/G 火箭（仅空中，机库停稳补给）':''):kind==='yacht'?'W/S 高速油门与倒车 · A/D 船舵 · 空格强反推 · 最高约 115 km/h · 靠泊前提前减速':kind==='helicopter'?HELICOPTER_HINT+(armed()?' · 左键机炮 · 右键/G 火箭（仅空中，停机坪停稳补给）':''):kind==='rover'?(gunner?'鼠标瞄准 · 左键射击 · 空格刹车 · F 回驾驶位 · 车辆保持直行 3 秒后滑行':'WASD 驾驶 · 空格刹车 · E 下车 · C 视角 · F 炮手位 · 停车后按住 R 回收'):'WASD 移动/驾驶 · 空格刹车 · E 上下车 · C 视角 · 停车后按住 R 回收';
 updateWeaponHUD();
 const escortOn=escort.status!=='idle';$('#escort-panel').hidden=!escortOn;$('#escort-free-drive').hidden=!escortOn;if(!escortArmed)$('#start-escort').textContent=escortOn?'重试车队护送 · 荒原车队':'开始车队护送 · 荒原车队';
 if(escortOn){const es=escortSummary(escort),g=escortGoal(escort);$('.drive-objective h1').textContent='荒原车队护送';$('#escort-truck-hull').textContent=es.truckHull+'%';$('#escort-truck-meter').value=es.truckHull;$('#escort-hounds').textContent=es.alive+' 活跃 / '+es.killed+'/'+es.total+' 击毁';$('#escort-wave').textContent=es.wave+' / '+es.waves;$('#escort-active-difficulty').textContent='当前任务：'+es.label;
  $('#escort-state').textContent=escort.status!=='active'?escort.reason:es.warnings>0?'猎犬机锁定突进！打断或驶离红线':es.truckArrived?'卡车已到哨站 · 清除剩余猎犬机':es.truckWaiting?'卡车等待护送车靠近（70 米内）':es.alive>0?'交战中 · 优先打断预警中的猎犬机':'护送中 · 下一个伏击点未知';
  $('#route-label').textContent='护送路段 '+Math.min(es.leg+1,es.legs)+' / '+es.legs+' · '+g.name;$('#route-fill').style.width=((es.leg+(es.truckArrived?1:0))/es.legs*100)+'%';
  $('#drive-task').textContent=escort.status!=='active'?escort.reason:g.name+' · 卡车距 '+Math.round(Math.hypot(escort.truck.x-g.x,escort.truck.z-g.z))+' m · 与卡车 '+Math.round(Math.hypot(rover.x-escort.truck.x,rover.z-escort.truck.z))+' m';
  $('#control-hints').textContent=(gunner?'炮手位：车辆自动跟随 · 鼠标瞄准 · 左键射击 · F 切驾驶位':'驾驶位：WASD · 空格刹车 · F 切炮手位（自动跟随）')+' · 卡车被撞或护送车报废即失败';
  $('#escort-panel').dataset.warning=String(es.warnings>0);}
 $('#chase-panel').hidden=!chasing;$('#chase-free-drive').hidden=!chasing;
 if(!chaseArmed)$('#start-chase').textContent=chasing?'重试海上追逐 · 南湾突围':'开始海上追逐 · 南湾突围';
 $('.drive-objective h1').textContent=chasing?'南湾突围':'海陆空先遣';
 if(chasing){
  const goal=CHASE_GATES[chase.index]||CHASE_EVAC,seconds=Math.ceil(chase.remaining);$('#chase-time').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');$('#chase-hull').textContent=Math.ceil(chase.hull)+'%';$('#chase-hull-meter').value=chase.hull;$('#chase-range').textContent=Math.round(chase.distance)+' m';
  $('#chase-tracking').textContent=chase.status==='won'?'已撤离':chase.status==='lost'?'任务失败':chase.elapsed<profile.headStart?'离港准备 · 敌艇即将启动':fleet.sunk?'全部敌艇已击毁 · 继续完成航点':chase.escaped?'已脱离全部追踪 · 仍需防止重新发现':'剩余 '+fleet.alive+'/'+fleet.total+' 艇 · 各拉开 '+profile.loseDistance+' 米或借遮挡保持 '+profile.loseSeconds+' 秒';
  $('#naval-active-difficulty').textContent='当前任务：'+profile.label+' · '+fleet.total+' 艇'+(chase.recovered?' · 检查点继续':'');
  $('#route-label').textContent='追逐检查点 '+chase.index+' / 3 · '+(chase.index===3?'前往南湾撤离区':'按顺序通过');$('#route-fill').style.width=(chase.status==='won'?100:chase.index/4*100)+'%';
  $('#drive-task').textContent=chase.status!=='active'?chase.reason:goal.name+' · '+Math.round(Math.hypot(yacht.x-goal.x,yacht.z-goal.z))+' m'+(chase.index===3?' · 先甩开追踪，减速至 43 km/h 以下':'');
  document.body.dataset.chaseGoalX=String(goal.x);document.body.dataset.chaseGoalZ=String(goal.z);
 }
 const combat=fleet?fleet.target.combat:chase.combat,warning=fleet?.warning?.combat.warning||null,cooldown=chase.naval?.weaponCooldown||0;
 $('#sea-weapon-panel').hidden=!chasing||!combat.enabled;
 if(chasing&&fleet){
  $('#sea-target-label').textContent='观察：'+fleet.target.label+' · Q 切换（不锁定）';
  $('#sea-enemy-hull').textContent=combat.enemySunk?'已击毁':Math.ceil(combat.enemyHull)+'%';$('#sea-enemy-meter').value=combat.enemyHull;
  $('#sea-gun-state').textContent=cooldown>0?'装填 '+cooldown.toFixed(1)+' 秒':'左键舰炮 · 瞄准海面准星方向（F 兼容）';
  $('#sea-fire-warning').textContent=warning?fleet.warning.label+(warning.phase==='aim'?'锁定 '+Math.max(0,warning.remaining).toFixed(1)+' 秒 · 转向规避！':'齐射中！躲开橙色弹道'):fleet.sunk?'威胁解除，航点任务仍需完成':(fleet.total>1?'双艇错峰射击 · 预警锁定点不会跟随移动':'单艇预警射击 · 锁定点不会跟随移动');
  $('#sea-weapon-panel').dataset.warning=String(!!warning);$('#sea-weapon-panel').dataset.hit=String(fleet.hitFlash>0);$('#control-hints').textContent+=' · 鼠标 360° 环视/瞄准 · 左键舰炮 · Q 查看敌艇（共享 1.6 秒装填）';
 }
 document.body.dataset.navalDifficulty=profile?.id||'none';document.body.dataset.navalCount=String(fleet?.total||0);document.body.dataset.navalAlive=String(fleet?.alive||0);document.body.dataset.navalTarget=String(chase.naval?.selected??-1);document.body.dataset.navalWarnings=String(chase.naval?.members.filter(m=>m.combat.warning).length||0);document.body.dataset.navalFleet=JSON.stringify(chase.naval?.members.map(m=>({id:m.id,role:m.role,x:+m.enemy.x.toFixed(3),z:+m.enemy.z.toFixed(3),hull:m.combat.enemyHull,sunk:m.combat.enemySunk,escaped:m.escaped,warning:m.combat.warning?.phase||'none'}))||[]);
 document.body.dataset.seaCombatEnabled=String(combat.enabled);document.body.dataset.seaEnemyHull=String(combat.enemyHull);document.body.dataset.seaEnemySunk=String(fleet?.sunk||false);document.body.dataset.seaShots=String(fleet?.shots||0);document.body.dataset.seaHits=String(fleet?.hits||0);document.body.dataset.seaEnemyShots=String(fleet?.enemyShots||0);document.body.dataset.seaEnemyHits=String(fleet?.enemyHits||0);document.body.dataset.seaProjectiles=String(fleet?.projectiles||0);document.body.dataset.seaWarning=warning?.phase||'none';document.body.dataset.seaWarningRemaining=(warning?.remaining||0).toFixed(4);document.body.dataset.seaGunCooldown=cooldown.toFixed(4);
 document.body.dataset.chaseStatus=chase.status;document.body.dataset.chaseRecovered=String(chase.recovered===true);document.body.dataset.chaseRunId=chase.runId||'';document.body.dataset.chaseGate=String(chase.index);document.body.dataset.chaseHull=chase.hull.toFixed(2);document.body.dataset.chaseRemaining=chase.remaining.toFixed(3);document.body.dataset.chaseEscaped=String(chase.escaped);document.body.dataset.chaseEnemyX=chase.enemy.x.toFixed(3);document.body.dataset.chaseEnemyZ=chase.enemy.z.toFixed(3);const aimPoint=navalAimPoint(navalAim,yacht);document.body.dataset.navalAimYaw=navalAim.yaw.toFixed(4);document.body.dataset.navalAimX=aimPoint.x.toFixed(2);document.body.dataset.navalAimZ=aimPoint.z.toFixed(2);document.body.dataset.yachtX=yacht.x.toFixed(3);document.body.dataset.yachtZ=yacht.z.toFixed(3);document.body.dataset.yachtYaw=yacht.yaw.toFixed(5);
 ctx.fillStyle='#142e38';ctx.fillRect(0,0,240,240);const co=n=>120+n*.185;ctx.fillStyle='#65766a';ctx.fillRect(co(-600),co(-600),820*.185,1200*.185);ctx.fillStyle='#244b5a';ctx.fillRect(co(220),co(-600),380*.185,1200*.185);
 ctx.strokeStyle='#b2b29a';ctx.lineWidth=3;ctx.strokeRect(co(-105),co(-105),210*.185,210*.185);ctx.fillStyle='#253840';ctx.fillRect(co(-322),co(-480),44*.185,760*.185);ctx.fillStyle='#b9a581';ctx.fillRect(co(205),co(174),67*.185,12*.185);
 drawRangeOnRadar(ctx,co,range);drawEscortOnRadar(ctx,co,escort);drawFrontierOnRadar(ctx,co,frontier);
 gates.forEach((g,i)=>{ctx.fillStyle=i<current.index?'#5a937b':i===current.index?'#f3e8b1':'#718a88';ctx.beginPath();ctx.arc(co(g.x),co(g.z),i===current.index?4:2,0,Math.PI*2);ctx.fill();});
 for(const [obj,color,label] of [[rover,'#e9c06e','R'],[plane,'#d1f5fb','A'],[yacht,'#96d9db','S'],[heli,'#f4c8ff','H']]){ctx.save();ctx.translate(co(obj.x),co(obj.z));ctx.rotate(obj.yaw);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(-3,4);ctx.lineTo(3,4);ctx.fill();ctx.restore();ctx.fillText(label,co(obj.x)+5,co(obj.z)+2);}
 if(chasing){for(const ship of chase.naval.members){if(ship.combat.enemySunk)continue;ctx.fillStyle=ship.role==='interceptor'?'#b49bff':'#ff795e';ctx.beginPath();ctx.arc(co(ship.enemy.x),co(ship.enemy.z),ship.id===chase.naval.selected?5:3,0,Math.PI*2);ctx.fill();ctx.fillText(ship.role==='interceptor'?'拦截':'追击',co(ship.enemy.x)+5,co(ship.enemy.z));}ctx.strokeStyle=chase.escaped?'#b6ffd7':'#e5b979';ctx.beginPath();ctx.arc(co(CHASE_EVAC.x),co(CHASE_EVAC.z),5,0,Math.PI*2);ctx.stroke();}
 if(sortie.status==='active'&&sortie.route.complete){const g=flightGoal(sortie);ctx.strokeStyle='#a4ffea';ctx.strokeRect(co(g.x)-5,co(g.z)-5,10,10);ctx.fillText('返航 N',co(g.x)+7,co(g.z));}
 if(!kind){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(co(player.x),co(player.z),3,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#d6e0d0';ctx.font='10px monospace';ctx.fillText('N ↑  R LAND / A AIR / S SEA',8,14);
 flightUI.update();
 $('#abort-joint').hidden=joint.status==='idle';
 Object.assign(document.body.dataset,{jointStatus:joint.status,jointStage:joint.stage,jointRecovered:String(joint.recovered),jointRunId:joint.runId||'',jointHold:joint.hold.toFixed(3),jointElapsed:joint.elapsed.toFixed(3),jointCompleted:JSON.stringify(joint.completed),jointPlayer:JSON.stringify(player),jointRover:JSON.stringify({x:rover.x,z:rover.z,yaw:rover.yaw,speed:rover.speed}),jointYacht:JSON.stringify({x:yacht.x,z:yacht.z,yaw:yacht.yaw,speed:yacht.speed})});
 const lighthouseOn=lighthouse.status!=='idle';$('#lighthouse-panel').hidden=!lighthouseOn;$('#lighthouse-free-drive').hidden=!lighthouseOn;if(!lighthouseArmed)$('#start-lighthouse').textContent=lighthouseOn?'重试灯塔岛登陆 · 第 5 关':'开始灯塔岛登陆 · 第 5 关';
 if(lighthouseOn){const ls=lighthouseSummary(lighthouse),g=lighthouseGoal(lighthouse,{yacht,player,kind,heli}),seconds=Math.ceil(ls.remaining);$('.drive-objective h1').textContent='灯塔岛登陆';$('#lighthouse-time').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');$('#lighthouse-surveys').textContent=ls.surveys+' / '+ls.total;$('#lighthouse-active-difficulty').textContent='当前任务：'+ls.label;$('#lighthouse-state').textContent=lighthouse.status!=='active'?lighthouse.reason:LIGHTHOUSE_LABELS[lighthouse.stage];
  $('#drive-task').textContent=lighthouse.status==='active'?g.name+' · '+Math.round(Math.hypot(s.x-g.x,s.z-g.z))+' m'+(lighthouse.hold>0?' · 保持 '+lighthouse.hold.toFixed(1)+' s':''):lighthouse.reason;$('#route-label').textContent='登陆阶段 '+ls.stageIndex+'/'+ls.stages+' · '+LIGHTHOUSE_LABELS[lighthouse.stage];$('#route-fill').style.width=(ls.stageIndex/ls.stages*100)+'%';$('#control-hints').textContent+=' · 灯塔岛：E 上下船，F 清点；调度/换任务会中止。';}
 const frontierOn=frontier.status!=='idle';$('#frontier-panel').hidden=!frontierOn;$('#frontier-free-drive').hidden=!frontierOn;for(const id of FRONTIER_IDS)if(frontierArmed!==id)$('#start-'+id).textContent=(frontierOn&&frontier.id===id?'重试':'开始')+FRONTIER_TITLES[id]+' · 第 '+(FRONTIER_IDS.indexOf(id)+6)+' 关';
 if(frontierOn){const fs=frontierSummary(frontier),g=frontierGoal(frontier,{player,rover,heli,yacht,kind}),seconds=Math.ceil(fs.remaining);$('.drive-objective h1').textContent=fs.title;$('#frontier-time').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');$('#frontier-health').textContent=fs.health+'%';$('#frontier-health-meter').value=fs.health;$('#frontier-hostiles').textContent=fs.mechMax?fs.mechHp+' / '+fs.mechMax:fs.total?(fs.total-fs.hostiles)+' / '+fs.total:'—';$('#frontier-active-difficulty').textContent='当前任务：'+fs.label+(fs.fuse!==null&&fs.fuse!==undefined?' · 引信 '+Math.ceil(fs.fuse)+' s':'');$('#frontier-state').textContent=frontier.status!=='active'?frontier.reason:FRONTIER_LABELS[frontier.id][frontier.stage]+(!kind?' · 步枪 '+(rifle.reload>0?'装填中':rifle.ammo+'/'+rifle.belt):'');
  $('#drive-task').textContent=frontier.status==='active'?g.name+' · '+Math.round(Math.hypot(s.x-g.x,s.z-g.z))+' m'+(frontier.hold>0?' · 保持 '+frontier.hold.toFixed(1)+' s':''):frontier.reason;$('#route-label').textContent='阶段 '+fs.stageIndex+'/'+fs.stages+' · '+FRONTIER_LABELS[frontier.id][frontier.stage];$('#route-fill').style.width=(fs.stageIndex/fs.stages*100)+'%';$('#control-hints').textContent+=' · 步行左键射击步枪；调度/换任务会中止。';}
 Object.assign(document.body.dataset,{frontierId:frontier.id,frontierStatus:frontier.status,frontierStage:frontier.stage,frontierDifficulty:frontier.profile.id,frontierHealth:String(Math.ceil(frontier.health)),frontierHostiles:String(aliveHostiles(frontier).length),frontierGate:String(frontier.gate),frontierRecovered:String(frontier.recovered===true),frontierElapsed:frontier.elapsed.toFixed(3),rifleAmmo:String(rifle.ammo),rifleShots:String(rifle.shots),rifleKills:String(rifle.kills)});
 Object.assign(document.body.dataset,{lighthouseStatus:lighthouse.status,lighthouseStage:lighthouse.stage,lighthouseSurveys:String(lighthouse.surveys),lighthouseDifficulty:lighthouse.profile.id,lighthouseHold:lighthouse.hold.toFixed(3),lighthouseElapsed:lighthouse.elapsed.toFixed(3),lighthouseRecovered:String(lighthouse.recovered===true),heliStatus:heli.status,heliPowered:String(heli.powered),heliGrounded:String(heli.grounded),heliY:heli.y.toFixed(2),heliX:heli.x.toFixed(1),heliZ:heli.z.toFixed(1)});
 if(joint.status!=='idle'){const g=jointGoal(joint,{rover,yacht,plane,player,kind});$('.drive-objective h1').textContent='联合行动 · 海空接力';if(joint.stage!=='recon')$('#drive-task').textContent=joint.status==='active'?g.name+' · '+Math.round(Math.hypot(s.x-g.x,s.z-g.z))+' m'+(joint.hold>0?' · 操作保持 '+joint.hold.toFixed(1)+' s':''):joint.reason;$('#route-label').textContent='联合阶段 '+joint.completed.length+'/9 · '+JOINT_LABELS[joint.stage]+(joint.recovered?' · 检查点继续':'');$('#route-fill').style.width=(joint.completed.length/9*100)+'%';$('#control-hints').textContent+=' · 联合任务：F 交互，E 换乘；调度/换任务会中止。';}

 Object.assign(document.body.dataset,{escortStatus:escort.status,escortTruckHull:escort.truck.hull.toFixed(1),escortTruckX:escort.truck.x.toFixed(2),escortTruckZ:escort.truck.z.toFixed(2),escortTruckLeg:String(escort.truck.index),escortWave:String(escort.waveIndex),escortAlive:String(escortSummary(escort).alive),escortKilled:String(escort.killed),escortWarnings:String(escortSummary(escort).warnings),escortDifficulty:escort.profile.id});
 Object.assign(document.body.dataset,{gamepad:String(gamepad.connected),gunner:String(gunner),weaponsArmed:String(armed()),roofAmmo:String(roofGun.ammo),roofReload:roofGun.reload.toFixed(3),roofShots:String(roofGun.shots),roofKills:String(roofGun.kills),planeAmmo:String(planeGun.ammo),planeRockets:String(planeGun.rockets),planeShots:String(planeGun.shots),planeKills:String(planeGun.kills),heliAmmo:String(heliGun.ammo),heliRockets:String(heliGun.rockets),heliShots:String(heliGun.shots),heliKills:String(heliGun.kills),rangeKills:String(range.kills),rangeAlive:String(rangeSummary(range).alive),roverHull:wear.rover.hull.toFixed(2),roverTier:durabilityTier(wear.rover),roverRepair:wear.rover.repair.toFixed(3),yachtHull:wear.yacht.hull.toFixed(2),yachtTier:durabilityTier(wear.yacht)});
 document.body.dataset.vehicleMode=kind==='rover'?'driving':kind||'walking';document.body.dataset.vehicleKind=kind||'walking';document.body.dataset.driveActive=String(active);document.body.dataset.cameraMode=cameraMode;
}
function updateWeaponHUD(){
 const panel=$('#vehicle-weapon-panel');panel.hidden=!kind||!armed();if(panel.hidden)return;
 const weapon=kind==='plane'?planeGun:kind==='helicopter'?heliGun:kind==='rover'?roofGun:null,ws=weapon?weaponSummary(weapon):null,dur=kind==='yacht'?durabilitySummary(wear.yacht):kind==='rover'?durabilitySummary(wear.rover):null,rs=rangeSummary(range),live=armed();
 $('#vw-seat').textContent=kind==='rover'?(gunner?'炮手':'驾驶'):kind==='plane'?'飞行员':'舵手';
 $('#vw-ammo').textContent=ws?(ws.reloading?'装填 '+ws.reloadPercent+'%':ws.ammo+' / '+ws.belt):'—';
 $('#vw-rockets').textContent=(kind==='plane'||kind==='helicopter')&&ws?ws.rockets+' / 2':'—';
 $('#vw-hull-meter').hidden=!dur;$('#vw-hull').hidden=!dur;if(dur){$('#vw-hull-meter').value=dur.hull;$('#vw-hull').textContent='耐久 '+dur.hull+'% · '+dur.label+(dur.repairing?' · 维修中 '+dur.repairPercent+'%':dur.tier!=='normal'?' · 停回'+dur.station.name+' 5 秒自动维修':'');}
 $('#vw-range').textContent='靶场 '+rs.kills+' 击破 · 存活 '+rs.alive+'/'+rs.total+(ws?' · 本武器命中率 '+ws.accuracy+'%':'');
 $('#vw-hint').textContent=!live?'任务进行中 · 武器与靶场统计暂停':escorting()&&kind==='rover'?(gunner?'自动跟随卡车 · 猎犬机预警时优先射击'+(ws.reloading?' · 装填中':''):'F 回炮手位后车辆自动跟随'):kind==='rover'?(gunner?(ws.cruise>0?'直行保持 '+ws.cruise.toFixed(1)+' 秒':'车辆滑行中 · 空格刹车')+(ws.rearming?' · 补弹 '+ws.rearmPercent+'%':''):'F 切换炮手位 · 靶板在场地北/东/南侧，低空无人机绕中央盘旋'):kind==='plane'?(plane.onGround?(ws.rearming?'机库补给 '+ws.rearmPercent+'%':'起飞后左键机炮、右键火箭 · 气球与高空无人机在机场西北'):'左键机炮 · 右键/G 火箭 · 火箭有溅射，落地爆炸'):kind==='helicopter'?(heli.grounded?(ws.rearming?'停机坪补给 '+ws.rearmPercent+'%':'起飞后左键机头机炮、右键火箭 · 机炮固定朝前微向下，用机身俯仰修正'):'左键机炮 · 右键/G 火箭 · 前倾压低弹道'):'撞击损伤船体 · 停回码头泊位自动维修';
 panel.dataset.tier=dur?dur.tier:'normal';panel.dataset.gunner=String(gunner);
}
function frame(now){const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;pollGamepad();if(active){time+=dt;accumulator+=dt;while(accumulator>=1/120&&active){updatePhysics(1/120);accumulator=Math.max(0,accumulator-1/120);}
  const s=entity(),fleet=chase.naval?navalSummary(chase):null;
  vehicleAudio.update(dt,{kind,speed:s.speed||0,rpm:heli.rpm,collective:heli.collective,throttle:kind==='plane'?plane.throttle:kind==='helicopter'?heli.collective*heli.rpm:kind?(Number(held('KeyW','ArrowUp'))-Number(held('KeyS','ArrowDown'))):0,onGround:kind==='helicopter'?heli.grounded:plane.onGround,stall:kind==='helicopter'?false:plane.stall,crashed:kind==='helicopter'?heli.status==='crashed':plane.crashed,impacts:kind?s.impacts:0,active:true,nearWater:!kind&&Math.hypot(player.x-yacht.x,player.z-yacht.z)<40});
  vehicleAudio.events({roofShots:roofGun.shots,planeShots:planeGun.shots+heliGun.shots,rocketShots:planeGun.rocketShots+heliGun.rocketShots,roofHits:roofGun.hits,planeHits:planeGun.hits+heliGun.hits,seaShots:fleet?.shots||0,seaHits:fleet?.hits||0,repairs:wear.rover.repairs+wear.yacht.repairs,rearms:audioRearms,landings:audioLandings,checkpoints:audioCheckpoints,hullHits:audioHullHits,waves:audioWaves,houndKills:escort.killed||0,rifleShots:rifle.shots,frontierKills:audioFrontierKills,frontierExplosions:frontier.effectCounts?.explode||0,frontierCollapses:frontier.effectCounts?.collapse||0,mechSteps:frontier.mechSteps||0});if(messageTime>0){messageTime-=dt;if(messageTime<=0)message.classList.remove('visible');}}
 heliModel.update(heli);helipads.update(lighthouse,time);frontierWorld.update(frontier,time);jointWorld.update(joint,time);lighthouseWorld.update(lighthouse,time);escortWorld.update(escort,time);rangeWorld.update(time);turretModel.update(roofGun,rover.yaw);fireEffects.update([roofGun,planeGun,heliGun,rifle]);damageSmoke.update([{tier:durabilityTier(wear.rover),x:rover.x,y:terrainHeight(rover.x,rover.z)+1.9,z:rover.z},{tier:durabilityTier(wear.yacht),x:yacht.x,y:2.2,z:yacht.z}],time);roverModel.update(rover,time);planeModel.update(plane,time);yachtModel.update(yacht,time);environment.update(trial.index,time);flightWorld.update(sortie,time);reconWorld.update(sortie,time,camera);seaAir.update(time,sortie.status==='idle'?airTrial.index:sortie.route.index,chase.status==='idle'?seaTrial.index:WATER_GATES.length,sortie.type!=='recon'||sortie.status==='idle');const members=chase.naval?.members,summary=chase.naval?navalSummary(chase):null;chaseWorld.update(members?.[0]||chase,time);seaCombatWorld.update(members?.[0]||chase,yacht,time,navalAimPoint(navalAim,yacht),summary?.playerFlash,chase.naval?.playerCombat);interceptorWorld.update(members?.[1]||emptyNaval,time);interceptorCombat.update(members?.[1]||emptyNaval,yacht,time);updateCamera(1-Math.exp(-9*dt));guidance.update({camera,goal:sortie.status==='active'?flightGoal(sortie):escort.status==='active'?{...escortGoal(escort),y:3}:joint.status==='active'?jointGoal(joint,{rover,yacht,plane,player,kind}):lighthouse.status==='active'?lighthouseGoal(lighthouse,{yacht,player,kind}):chase.status==='active'?(CHASE_GATES[chase.index]||CHASE_EVAC):kind==='plane'?FLIGHT_GATES[airTrial.index]:kind==='yacht'?WATER_GATES[seaTrial.index]:kind==='rover'?DRIVE_GATES[trial.index]:{x:rover.x,y:3,z:rover.z,name:'越野车 · E 上车'},position:kind==='plane'?plane:kind==='yacht'?yacht:kind==='rover'?rover:player,visible:active,recon:sortie.status==='active'&&sortie.type==='recon'&&['takeoff','route'].includes(sortie.phase),mission:sortie});hudTimer+=dt;if(hudTimer>.08){updateHUD();hudTimer=0;}renderer.render(scene,camera);requestAnimationFrame(frame);}
updateCamera(1);updateHUD();$('#resume-drive').focus();requestAnimationFrame(frame);
