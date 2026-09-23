import {createGlacierWorld} from './glacier-world.js';
import {createAbyssWorld} from './abyss-world.js';
import {createTetherWorld} from './tether-world.js';
import {createOverseerWorld} from './overseer-world.js';
import {createSwitchyardWorld} from './switchyard-world.js';
import {createElevatorWorld} from './elevator-world.js';
import {createSkyhookWorld} from './skyhook-world.js';
import {createLeviathanWorld} from './leviathan-world.js';
import {createPolarWorld} from './polar-world.js';
import {createDatacenterWorld} from './datacenter-world.js';
import {createOrbitalWorld} from './orbital-world.js';
import {createHarborWorld} from './harbor-world.js';
import {createTrainWorld} from './train-world.js';
import {createTowerWorld} from './tower-world.js';
import {createRoofWorld} from './roof-world.js';
import {createStationWorld} from './station-world.js';
import {createPolarNavigation} from './polar-navigation.js';
import {createDatacenterNavigation} from './datacenter-navigation.js';
import {createOrbitalNavigation} from './orbital-navigation.js';
import {createHarborNavigation} from './harbor-navigation.js';
import {createTrainNavigation} from './train-navigation.js';
import {createTowerNavigation} from './tower-navigation.js';
import {createRoofEnemyNavigation} from './roof-enemy-navigation.js';
import {buildReactorArena} from './reactor-arena.js';
import {IS_STATION,IS_ROOF,IS_TOWER,IS_TRAIN,IS_HARBOR,IS_ORBITAL,IS_DATACENTER,IS_POLAR} from './level.js';
// Per-map selection that used to be three long ternaries in app.js: the art / level world, the boss ("overseer")
// world with its event -> sound table, the enemy navigation helper and the player spawn point. Each selector is called
// from app.js at exactly the position the ternary used to sit, so scene-graph creation order is unchanged.
// Boss callbacks read player feet and audio lazily through the injected getters (playerMotion is created after art).
export function createMapArt({scene,renderer,obstacles,playerCeilings}){
 if(IS_POLAR)return {art:createPolarWorld(scene,renderer,obstacles),reactor:null};
 if(IS_DATACENTER)return {art:createDatacenterWorld(scene,renderer,obstacles),reactor:null};
 if(IS_ORBITAL)return {art:createOrbitalWorld(scene,renderer,obstacles),reactor:null};
 if(IS_HARBOR)return {art:createHarborWorld(scene,renderer,obstacles),reactor:null};
 if(IS_TRAIN)return {art:createTrainWorld(scene,renderer,obstacles),reactor:null};
 if(IS_TOWER)return {art:createTowerWorld(scene,renderer,obstacles),reactor:null};
 if(IS_ROOF)return {art:createRoofWorld(scene,renderer,obstacles),reactor:null};
 if(IS_STATION)return {art:createStationWorld(scene,renderer,obstacles),reactor:null};
 return buildReactorArena({scene,renderer,obstacles,playerCeilings});
}
export const HAS_BOSS_RECORD=IS_TRAIN||IS_HARBOR||IS_TOWER||IS_STATION||IS_ROOF||IS_ORBITAL||IS_DATACENTER||IS_POLAR;
export function createMapOverseer({scene,obstacles,art,getPlayerFeet,play,notify}){
 return IS_POLAR?createGlacierWorld(scene,obstacles,art):IS_DATACENTER?createAbyssWorld(scene,obstacles,art):IS_ORBITAL?createTetherWorld(scene,obstacles):IS_ROOF?createOverseerWorld(scene,obstacles):IS_STATION?createSwitchyardWorld(scene,obstacles,{onEvent:event=>{
 const sounds={'started':'boss.phase','switch.armed':'objective.node','train.warning':'rail.charge','train.moving':'enemy.fire','window.opened':'boss.window.open','window.closed':'boss.window.close','blast.warning':'rail.charge','blast.impact':'bolt.wall','defeated':'objective.complete'};
 if(sounds[event])play(sounds[event]);
 if(event==='started')notify('SWITCHYARD 接管调度 // 操作亮起编号的道岔，让维护列车破盾');
}}):IS_TOWER?createElevatorWorld(scene,obstacles,{getPlayerFeet:getPlayerFeet,onEvent:event=>{
 const sounds={'started':'boss.phase','lift.moving':'rail.charge','lift.docked':'objective.node','window.opened':'boss.window.open','window.closed':'boss.window.close','unit.broken':'boss.phase','beam.warning':'rail.charge','beam.impact':'bolt.wall','defeated':'objective.complete'};
 if(sounds[event])play(sounds[event]);
 if(event==='started')notify('ELEVATOR 接管升降井 // 前往东侧 0m 检修台，逐层击破动力锁');
}}):IS_TRAIN||IS_HARBOR?(IS_TRAIN?createSkyhookWorld:createLeviathanWorld)(scene,obstacles,{getPlayerFeet:getPlayerFeet,onEvent:event=>{
 const sounds={'started':'boss.phase','mechanic.started':'rail.charge','window.opened':'boss.window.open','window.closed':'boss.window.close','unit.broken':'boss.phase','phase.ready':'objective.node','attack.warning':'rail.charge','attack.impact':'bolt.wall','defeated':'objective.complete'};
 if(sounds[event])play(sounds[event]);
 if(event==='started')notify(IS_TRAIN?'SKYHOOK 追击 // 返回控制车顶，操作牵引绞盘':'LEVIATHAN 封锁港区 // 返回吊机高架，依序吊箱破甲');
}}):null;
}
export function createMapEnemyNavigation(obstacles,navigation){
 return IS_POLAR?createPolarNavigation(obstacles):IS_DATACENTER?createDatacenterNavigation(obstacles):IS_ORBITAL?createOrbitalNavigation(obstacles):IS_HARBOR?createHarborNavigation(obstacles):IS_TRAIN?createTrainNavigation(obstacles):IS_TOWER?createTowerNavigation(obstacles):IS_ROOF?createRoofEnemyNavigation(obstacles,navigation):null;
}
// Player spawn (feet x/z) per map; app.js passes it straight to createPlayerMotion.
export function mapSpawn(){
 return IS_POLAR||IS_DATACENTER||IS_ORBITAL||IS_HARBOR?{x:37.1,z:37.1}:IS_TRAIN?{x:14,z:37.1}:IS_TOWER?{x:29,z:23}:IS_ROOF?{x:37.1,z:37.1}:IS_STATION?{x:31.1,z:37.1}:{x:39.1,z:39.1};
}
