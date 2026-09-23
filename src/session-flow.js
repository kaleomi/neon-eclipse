import {validDeployment, deploymentLoadout, deploymentURL, deploymentFromSearch} from './menu-deployment.js';
import {MAP_ID} from './level.js';
import {chapterURL} from './menu-state.js';
import {CHAPTERS} from './journey.js';
import {p4Requested} from './p4-runtime.js';
import {shouldPlayIntro} from './cinematic-rules.js';
import {createChapterIntro} from './cinematic-world.js';
// Session flow: campaign / journey / replay entry points, checkpoint saving, chapter intro request and the play
// transition. Moved out of app.js unchanged; session scalars (state, runMode, replayEntry, pendingJourneyResult, ...)
// still live in app.js and are reached through ctx accessors. Owns only the two flags nothing else needed:
// navigating (exposed read-only for the menu) and introRequested.
export function createSessionFlow(ctx){
 let navigating=false,introRequested=false;
 function saveCheckpoint(){if(ctx.p4?.active)return;if(ctx.runMode==='campaign')ctx.campaign.save(ctx.checkpoint());if(ctx.runMode==='journey'&&!ctx.journey.save(MAP_ID,ctx.checkpoint()))ctx.notify('战役检查点写入失败 // 请勿关闭页面');}
 function refreshJourney(){
  document.body.dataset.playMode=ctx.runMode;
  ctx.gameMenu?.update(ctx.state);ctx.gameMenu?.refresh();
 }
 function openMenuChapter(map,mode='campaign',entry='chapter'){
  if(navigating)return false;
  const destination=chapterURL(map,mode,entry);
  navigating=true;ctx.gameMenu?.refresh();location.href=destination;return true;
 }
 function applyDeployment(value){
  if(!validDeployment(value))return;
  ctx.loadout.reset(deploymentLoadout(value));ctx.selected=ctx.loadout.first();ctx.selectedSpecial=null;ctx.hud();
 }
 function startJourney(deployment){
  if(navigating)return false;
  if(ctx.pendingJourneyResult){ctx.gameMenu?.error('请先保存当前章节结果，再开始新游戏。');return false;}
  if(deployment!==undefined&&!validDeployment(deployment)){ctx.gameMenu?.error('战备配置无效，请重新选择。');return false;}
  if(!ctx.journey.start()){ctx.gameMenu?.error('无法保存新战役。请允许浏览器存储后重试，或在选择关卡中体验单章模式。');return false;}
  ctx.pendingJourneyResult=null;
  if(MAP_ID!=='reactor'){if(!deployment)return openMenuChapter('reactor','journey');navigating=true;location.href=deploymentURL(deployment);return true;}
  ctx.runMode='journey';ctx.reset();applyDeployment(deployment);requestIntro(0,null);
  if(!ctx.journey.save(MAP_ID,ctx.checkpoint())){ctx.state='ready';refreshJourney();ctx.gameMenu?.error('新战役入口已创建，但检查点写入失败。请重试继续游戏。');return false;}
  return enterPlay();
 }
 function continueJourney(){
  if(navigating)return false;
  if(ctx.pendingJourneyResult){
   if(!ctx.journey.finish(MAP_ID,ctx.pendingJourneyResult)){ctx.gameMenu?.error('章节结果仍无法保存，请勿关闭页面。保存成功后才会进入下一关。');return false;}
   ctx.pendingJourneyResult=null;
  }
  const d=ctx.journey.data;
  if(!d){ctx.gameMenu?.error('没有可继续的战役，请从主菜单开始新游戏。');return false;}
  if(d.status==='complete'){refreshJourney();return true;}
  if(d.status==='between'){
   if(!ctx.journey.advance()){ctx.gameMenu?.error('无法保存下一关入口，章节结算仍保留。请点击进入下一关重试。');return false;}
   return openMenuChapter(CHAPTERS[d.chapter+1].map,'journey');
  }
  const chapter=CHAPTERS[d.chapter];
  if(MAP_ID!==chapter.map)return openMenuChapter(chapter.map,'journey','continue');
  ctx.runMode='journey';ctx.reset(d.checkpoint?.stageIndex||0,d.checkpoint);
  if(MAP_ID==='reactor'&&d.chapter===0&&!d.checkpoint)applyDeployment(deploymentFromSearch(location.search));
  requestIntro(d.checkpoint?.stageIndex||0,d.checkpoint);
  if(!d.checkpoint&&!ctx.journey.save(MAP_ID,ctx.checkpoint())){ctx.state='ready';refreshJourney();ctx.gameMenu?.error('无法保存本章入口检查点，请允许浏览器存储后重试。');return false;}
  return enterPlay();
 }
 function startSingleChapter(){
  if(navigating)return false;
  if(ctx.pendingJourneyResult){ctx.gameMenu?.error('本章结果尚未保存，请先返回结算重试保存。');return false;}
  ctx.runMode='campaign';ctx.reset();requestIntro(0,null);saveCheckpoint();return enterPlay();
 }
 async function enterPlay(){
  ctx.loadoutWorld.hide();ctx.fieldKit.hide();
  try{await ctx.gameAudio.unlock();}catch{}
  ctx.gameAudio.resume();ctx.gameAudio.play('ui.resume');
  ctx.lookInput.reset();ctx.state='playing';document.body.dataset.playState=ctx.state;ctx.overlay.hidden=true;
  if(introRequested){introRequested=false;beginChapterIntro();}
  try{await ctx.renderer.domElement.requestPointerLock();}catch{ctx.notify('鼠标锁定不可用：按住左键拖动瞄准，方向键也可转向');}
 }
 function requestIntro(stageIndex,checkpoint){introRequested=!p4Requested()&&shouldPlayIntro({stageIndex,checkpoint,setting:ctx.fxSettings.intro,webdriver:Boolean(navigator.webdriver),search:location.search});return introRequested;}
 function beginChapterIntro(){if(!ctx.chapterIntro)ctx.chapterIntro=createChapterIntro({camera:ctx.camera,mapId:MAP_ID,onFinish:()=>{ctx.camera.rotation.set(ctx.pitch,ctx.yaw,0);ctx.lookInput.reset();ctx.keys.clear();ctx.firing=false;ctx.gun.visible=true;}});ctx.chapterIntro.begin({objective:ctx.mission.current.title});ctx.gun.visible=false;}
 function continueCampaign(){
  if(navigating)return false;
  if(ctx.pendingJourneyResult){ctx.gameMenu?.error('本章结果尚未保存，请先返回结算重试保存。');return false;}
  const saved=ctx.campaign.checkpoint;ctx.runMode='campaign';
  if(saved){ctx.reset(saved.stageIndex,saved);ctx.notify('已读取阶段入口检查点');}else{ctx.reset();requestIntro(0,null);saveCheckpoint();}
  return enterPlay();
 }
 function retryStage(){
  if(navigating||ctx.pendingJourneyResult)return false;
  const saved=ctx.runMode==='replay'?ctx.replayEntry:ctx.runMode==='journey'?ctx.journey.data?.checkpoint:ctx.campaign.checkpoint;if(!saved)return false;
  ctx.reset(saved.stageIndex,saved);ctx.notify('阶段已重置');return enterPlay();
 }
 function startReplay(index){
  if(navigating||ctx.pendingJourneyResult){ctx.gameMenu?.error('请先完成当前章节结果保存，再开始训练。');return false;}
  if(!Number.isInteger(index)||index<0||index>ctx.campaign.unlocked)return;
  ctx.runMode='replay';ctx.reset(index);ctx.replayEntry=ctx.checkpoint();ctx.notify('阶段训练 // 不覆盖主行动检查点');enterPlay();
 }
 return {get navigating(){return navigating;},saveCheckpoint,refreshJourney,openMenuChapter,startJourney,continueJourney,startSingleChapter,enterPlay,requestIntro,beginChapterIntro,continueCampaign,retryStage,startReplay};
}
