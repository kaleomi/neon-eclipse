import {createLoadoutState} from '../src/loadout-rules.js';
import assert from 'node:assert/strict';
import {createSessionFlow} from '../src/session-flow.js';
// Minimal browser globals: the flow touches document.body.dataset, location and navigator.
globalThis.document??={body:{dataset:{}}};globalThis.location??={search:'',href:''};globalThis.navigator??={webdriver:true};
function harness({checkpoint=null,journeyData=null,map='reactor'}={}){
 const calls=[];const rec=name=>(...a)=>{calls.push([name,...a]);};
 const ctx={
  state:'ready',runMode:'campaign',replayEntry:null,pendingJourneyResult:null,p4:null,firing:false,yaw:0,pitch:0,chapterIntro:null,
  campaign:{checkpoint,unlocked:2,save:rec('campaign.save')},
  journey:{data:journeyData,start:()=>true,save:()=>true,finish:()=>true,advance:()=>true},
  gameMenu:{update:rec('menu.update'),refresh:rec('menu.refresh'),error:rec('menu.error')},
  reset:rec('reset'),checkpoint:()=>({stageIndex:1,fake:true}),notify:rec('notify'),
  loadoutWorld:{hide:rec('loadout.hide')},fieldKit:{hide:rec('fieldKit.hide')},lookInput:{reset(){}},keys:{clear(){}},
  gameAudio:{unlock:async()=>{},resume(){},play:rec('audio.play')},renderer:{domElement:{requestPointerLock:async()=>{throw new Error('no lock');}}},
  overlay:{hidden:false},gun:{visible:true},camera:{rotation:{set(){}}},mission:{current:{title:'t'}},fxSettings:{intro:false},
 };
 return {ctx,calls,flow:createSessionFlow(ctx)};
}
// continueCampaign with a saved checkpoint: resets to it, notifies, transitions to playing and hides the overlay; pointer lock failure only notifies.
{
 const {ctx,calls,flow}=harness({checkpoint:{stageIndex:2}});
 await flow.continueCampaign();
 assert.equal(ctx.runMode,'campaign');assert.deepEqual(calls.find(c=>c[0]==='reset'),['reset',2,{stageIndex:2}]);
 assert.equal(ctx.state,'playing');assert.equal(ctx.overlay.hidden,true);assert.equal(document.body.dataset.playState,'playing');
 assert.ok(calls.some(c=>c[0]==='notify'&&/检查点/.test(c[1])));assert.ok(calls.some(c=>c[0]==='notify'&&/鼠标锁定/.test(c[1])),'pointer lock fallback notice');
 assert.ok(calls.some(c=>c[0]==='audio.play'&&c[1]==='ui.resume'));
}
// startSingleChapter without a checkpoint: fresh reset + checkpoint saved; blocked while a journey result is pending.
{
 const {ctx,calls,flow}=harness();
 await flow.startSingleChapter();
 assert.deepEqual(calls.filter(c=>c[0]==='reset'),[['reset']]);assert.ok(calls.some(c=>c[0]==='campaign.save'&&c[1].fake));
 ctx.pendingJourneyResult={kills:1};assert.equal(flow.startSingleChapter(),false);assert.ok(calls.some(c=>c[0]==='menu.error'));
}
// startReplay: replay mode, replayEntry captured from checkpoint(), rejects out-of-range and blocked indexes.
{
 const {ctx,flow}=harness();
 flow.startReplay(1);assert.equal(ctx.runMode,'replay');assert.deepEqual(ctx.replayEntry,{stageIndex:1,fake:true});
 ctx.runMode='campaign';flow.startReplay(9);assert.equal(ctx.runMode,'campaign','index beyond unlocked ignored');
}
// retryStage picks the entry for the current mode; nothing to retry returns false.
{
 const {ctx,calls,flow}=harness({checkpoint:{stageIndex:3}});
 ctx.runMode='replay';ctx.replayEntry={stageIndex:1};await flow.retryStage();
 assert.deepEqual(calls.find(c=>c[0]==='reset'),['reset',1,{stageIndex:1}]);
 ctx.runMode='journey';assert.equal(flow.retryStage(),false,'journey without checkpoint');
}
// navigating guard: openMenuChapter flips navigating once and everything else refuses afterwards.
{
 const {flow}=harness();
 assert.equal(flow.navigating,false);assert.equal(flow.openMenuChapter('polar','journey'),true);assert.equal(flow.navigating,true);
 assert.equal(flow.openMenuChapter('roof'),false);assert.equal(flow.startJourney(),false);assert.equal(flow.continueJourney(),false);assert.equal(flow.retryStage(),false);
}
// journey: new game on reactor resets in journey mode; on another map it navigates to reactor; complete journey just refreshes.
{
 const {ctx,calls,flow}=harness();
 await flow.startJourney();assert.equal(ctx.runMode,'journey');assert.equal(ctx.state,'playing');
 const h2=harness({journeyData:{status:'complete'}});assert.equal(h2.flow.continueJourney(),true);assert.ok(h2.calls.some(c=>c[0]==='menu.refresh'));
 const h3=harness();assert.equal(h3.flow.continueJourney(),false);assert.ok(h3.calls.some(c=>c[0]==='menu.error'));
}
console.log('session-flow rules ok');

// New-game preparation is committed only by the confirmed launch, before the entry checkpoint.
{
 const {ctx,flow}=harness();ctx.loadout=createLoadoutState();let saved=null;ctx.hud=()=>{};
 ctx.checkpoint=()=>({stageIndex:0,...ctx.loadout.checkpoint(),selected:ctx.selected});
 ctx.journey.save=(_map,value)=>{saved=value;return true;};
 await flow.startJourney({primary:5,throwable:'smoke'});
 assert.equal(saved.loadout.primary,5);assert.equal(saved.loadout.throwable,'smoke');assert.equal(saved.selected,5);
 assert.equal(ctx.state,'playing');
}
{
 const {ctx,flow,calls}=harness();let starts=0;ctx.journey.start=()=>{starts++;return true;};
 assert.equal(flow.startJourney({primary:11,throwable:'emp'}),false);assert.equal(starts,0);
 ctx.pendingJourneyResult={kills:1};assert.equal(flow.startJourney({primary:1,throwable:'emp'}),false);assert.equal(starts,0);
 assert(!calls.some(c=>c[0]==='reset'));
}
{
 const {ctx,flow,calls}=harness();ctx.journey.start=()=>false;
 assert.equal(flow.startJourney({primary:1,throwable:'emp'}),false);assert.equal(ctx.state,'ready');assert(!calls.some(c=>c[0]==='reset'));
}
{
 const {ctx,flow}=harness();ctx.loadout=createLoadoutState();ctx.hud=()=>{};ctx.journey.save=()=>false;
 assert.equal(await flow.startJourney({primary:1,throwable:'emp'}),false);assert.equal(ctx.state,'ready');assert.equal(ctx.overlay.hidden,false);
}
console.log('PASS deployment launch applies real loadout before checkpoint; invalid/pending/save-failure guards');
