export {modifierDamage as p4Damage} from './p4-catalog.js';
import {P4_MODES,parameters,routeFor,MODIFIERS,hashSeed,seeded,modifierDescription} from './p4-catalog.js';
import {createP4Store,P4_ACTIVE_KEY,p4Awards} from './p4-profile.js';
import {createP4Session} from './p4-session.js';
import {createFixedClock,createGhostRecorder,ghostAt,ghostKey,validGhost,createInputRecorder,createInputReplay} from './p4-replay.js';
import {createP4World} from './p4-world.js';
import {createChapterAttempt,createAchievementStore} from './chapter-achievements.js';
export const p4Requested=()=>new URLSearchParams(globalThis.location?.search||'').has('p4');
export const p4MemoryStorage=()=>({getItem:()=>null,setItem(){},removeItem(){}});
export function p4AchievementStub(){const attempt=createChapterAttempt();return {attempt,begin:x=>attempt.begin(x),finish(){},update(){}};}
const metrics=()=>({seconds:0,kills:0,damage:0,shots:0,hits:0,dealt:0,distance:0,vehicleDistance:0,weaponKills:Array(12).fill(0),onlyGhost:true});
const finite=(n,cap=1e9)=>Number.isFinite(n)&&n>=0&&n<=cap?n:0;
const cleanMetrics=x=>{const m=metrics();for(const k of Object.keys(m))if(typeof m[k]==='number')m[k]=finite(x?.[k]);if(Array.isArray(x?.weaponKills)&&x.weaponKills.length===12)m.weaponKills=x.weaponKills.map(n=>Math.floor(finite(n,1e6)));m.onlyGhost=x?.onlyGhost===true;return m;};
const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s)%60).padStart(2,'0')}`;
function loadStyle(){if(document.querySelector('[data-p4-style]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='./p4.css';l.dataset.p4Style='';document.head.append(l);}
export function createP4Runtime(api){
 const store=createP4Store(),requested=p4Requested(),legacyAwards=createAchievementStore().read().awards;let observer=null,attack=0,lastDifficulty;
 if(!requested){
  function settle(win,useLast=false){if(!observer)return;const snap=useLast?(observer.lastSnapshot||api.snapshot()):api.snapshot(),o=observer;observer=null;const result={...o.metrics,id:o.id,config:o.config,resumed:o.resumed,tags:{difficulty:o.config.difficulty,resumed:o.resumed,modifiers:[...o.config.mods]},practice:o.practice,startStage:o.startStage,outcome:win===null?'abandoned':win?'won':'lost',seconds:o.metrics.seconds,kills:Math.max(0,snap.kills-o.inheritedKills),progress:win&&!o.practice?5:snap.stage,finishedAt:Date.now(),telemetryId:snap.telemetryId};store.record(result);
   if(win!==null){let badge=document.querySelector('#p4-normal-settlement');if(!badge){badge=document.createElement('aside');badge.id='p4-normal-settlement';badge.style.cssText='position:fixed;bottom:16px;left:24px;z-index:1500;max-width:430px;padding:9px 16px;border-left:2px solid #89ead4;background:#102b35ed;color:#bfe9e2;font:12px/1.6 sans-serif;pointer-events:none';document.body.append(badge);}const profile=store.read().profile;const title=p4Awards(profile.results,legacyAwards).find(a=>a.id===profile.equippedTitle&&a.unlocked);badge.textContent=`P4 档案 · 难度锁定 ${o.config.difficulty} · ${o.practice?'阶段练习':o.resumed?'续局':'新局'} · 无模式修饰符${title?' · '+title.name:''}`;}
  }
  const passive={active:false,get difficulty(){return observer?.config.difficulty||lastDifficulty;},params:parameters(),
   begin({map,difficulty,stage,snapshot,replay,inheritedKills=0}){settle(null,true);lastDifficulty=difficulty;document.querySelector('#p4-normal-settlement')?.remove();observer={id:`story-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,config:{mode:'story',map,difficulty,seed:0,mods:[],vehicle:'rover',weapon:0},resumed:!!snapshot,practice:replay,startStage:stage,inheritedKills,metrics:metrics(),last:null,lastSnapshot:null};},
   shot(index){if(observer){observer.metrics.shots++;if(index!==2)observer.metrics.onlyGhost=false;}attack=index;},
   hit(damage,head,kills,source=attack){if(observer){observer.metrics.hits++;observer.metrics.dealt+=finite(damage);if(source!==2&&damage>0)observer.metrics.onlyGhost=false;if(source>=0&&source<12)observer.metrics.weaponKills[source]+=finite(kills,100);}},
   nonGhost(){if(observer)observer.metrics.onlyGhost=false;},hurt(damage){if(observer)observer.metrics.damage+=finite(damage);},
   frame(dt){if(!observer||api.snapshot().state!=='playing')return;const snap=api.snapshot();observer.metrics.seconds+=dt;const p=snap.position;if(observer.last){const d=Math.hypot(p.x-observer.last.x,p.y-observer.last.y,p.z-observer.last.z);if(d<4)observer.metrics.distance+=d;}observer.last={...p};observer.lastSnapshot=snap;},
   gameEnd(win){settle(win);return false;}
  };
  window.addEventListener('pagehide',()=>settle(null,true));document.addEventListener('visibilitychange',()=>{if(document.hidden)api.stop();});return passive;
 }

 loadStyle();document.body.classList.add('p4-active');const root=document.createElement('section');root.className='p4-runtime';root.innerHTML='<header class="p4-strip"><b></b><span></span><button data-p4="pause">暂停 / Esc</button></header><div class="p4-dialog" role="dialog" aria-modal="true"><div class="p4-panel"><small>P4 / INDEPENDENT OPERATION</small><h1></h1><p class="p4-detail"></p><p class="p4-status" role="status"></p><div class="p4-actions"></div></div></div>';document.body.append(root);
 const title=root.querySelector('h1'),detail=root.querySelector('.p4-detail'),status=root.querySelector('.p4-status'),actions=root.querySelector('.p4-actions'),dialog=root.querySelector('.p4-dialog'),strip=root.querySelector('.p4-strip');
 const saved=store.active(),id=new URLSearchParams(location.search).get('p4');let run=saved.run,session,world,params=parameters(),recorder=createGhostRecorder(),inputRecorder=createInputRecorder(),clock=createFixedClock(),carry=null,result=null,lastPosition=null,simulating=false,lastDamage=0,lastKills=0,lastTime=0,pendingFrame=null,booted=false,previousUI='',targetOrigin=new Map(),boons={damage:1,recoil:1,ammo:1};
 function button(label,fn){const b=document.createElement('button');b.textContent=label;b.onclick=fn;actions.append(b);return b;}
 function home(){location.href='./p4-hub.html';}
 function invalid(message){title.textContent='无法接入行动';detail.textContent=message;button('返回行动中枢',home);}
 if(!saved.ok||!run||run.id!==id||routeFor(run.config)[run.routeIndex]?.map!==api.map){invalid('行动记录不存在、版本不支持，或当前章节与中继记录不符。主线存档未修改。');return {active:true,params,boot(){},frame(){},gameEnd:()=>true,encounter:s=>s,shot(){},hit(){}};}
 let transfer=false;try{const key='neon-eclipse.p4.handoff.v1';transfer=sessionStorage.getItem(key)===`${id}:${run.routeIndex}`;sessionStorage.removeItem(key);}catch{}
 const fresh=run.fresh===true;session=createP4Session(run.config,fresh?null:run);if(!fresh&&transfer&&run.resumed===false){const transferState={...run,resumed:false};session=createP4Session(run.config,transferState);}
 let resumed=!!run.resumed||(!fresh&&!transfer),m=cleanMetrics(run.metrics);carry=run.carry||null;params=parameters(run.config.mods);if(run.boons)for(const k of Object.keys(boons))boons[k]=Number.isFinite(run.boons[k])?Math.max(.1,Math.min(4,run.boons[k])):1;
 const ghostStored=store.ghosts().items.find(g=>g.key===ghostKey(run.config)&&validGhost(g));
 const ghostInputs=createInputReplay(ghostStored?.inputs||[]);
 function applyParameters(){params={...parameters(run.config.mods)};params.damage*=boons.damage;params.recoil*=boons.recoil;params.ammo*=boons.ammo;api.parameters(params,run.config.difficulty);document.body.classList.toggle('p4-no-hud',params.hud===0);}
 function checkpoint(handoff=false){const s=session.state;if(s.phase==='finished')return false;const record={...run,version:1,fresh:false,routeIndex:s.routeIndex,seconds:s.elapsed,progress:s.progress,credits:s.credits,resumed,metrics:m,carry,boons,updatedAt:Date.now()};const active=store.active();if(active.run&&active.run.id!==id){status.textContent='另一标签页已启动新行动；当前结果仍可结算，但不会覆盖它的中继。';return false;}const ok=store.checkpoint(record).ok;if(ok){run=record;if(handoff)try{sessionStorage.setItem('neon-eclipse.p4.handoff.v1',`${id}:${s.routeIndex}`);}catch{resumed=true;}}else status.textContent='本地存储不可用，中继未保存。请重试，不要关闭页面。';return ok;}
 function saveResult(){const r=store.record(result);status.textContent=r.ok?'成绩已写入独立 P4 档案。主线进度未改变。':'成绩暂未保存：'+r.code+'。请重试保存或导出当前成绩。';if(r.ok){store.clearActive(id);if(result.ghostNotSaved)status.textContent+=' 幽灵轨迹超出本地容量，未覆盖已有幽灵。';}return r.ok;}
 function finish(event){if(!event)return;api.stop();const snap=api.snapshot();m.kills+=Math.max(0,snap.kills-lastKills);lastDamage=snap.damage;lastKills=snap.kills;const s=session.state;
  result={...m,id,config:run.config,resumed,tags:{difficulty:run.config.difficulty,resumed,modifiers:[...run.config.mods]},outcome:event.outcome,seconds:s.elapsed,progress:s.progress,finishedAt:Date.now()};
  if(event.outcome==='won'&&run.config.mode==='ghost'&&!resumed&&!recorder.truncated&&!inputRecorder.truncated&&(!ghostStored||s.elapsed<ghostStored.seconds)){const g={version:1,key:ghostKey(run.config),seconds:s.elapsed,frames:recorder.frames,inputs:inputRecorder.events};if(validGhost(g)&&!store.saveGhost(g).ok)result.ghostNotSaved=true;}
  if(run.config.mode==='ghost'&&(recorder.truncated||inputRecorder.truncated))result.ghostNotSaved=true;saveResult();render(true);
 }
 function process(event){if(!event)return;if(event.type==='finish'){finish(event);return;}if(event.type==='launch'){launch();return;}if(event.type==='supply'){api.resupply('ammo');if(run.config.mode==='bossrush')api.resupply('health');}carry=api.carry();api.stop();checkpoint();render(true);}
 function launch(){const entry=session.entry;if(entry.map!==api.map){if(checkpoint(true))location.href=`./index.html?map=${encodeURIComponent(entry.map)}&p4=${encodeURIComponent(id)}`;else{session.pause();render(true);}return;}
  world?.clearLayout();applyParameters();let stage=entry.stage;if(run.config.mode==='tower')stage=session.state.progress%3;
  api.start(stage,run.config.weapon,carry);lastDamage=api.snapshot().damage;lastKills=api.snapshot().kills;lastPosition=null;targetOrigin.clear();
  if(run.config.mode==='tower'){const snap=api.snapshot();world.layout(hashSeed(`${run.config.seed}:${session.state.progress}`),{...snap.position,feetY:snap.position.y-1.7});}
  if(run.config.mode==='range'){api.makeRange();world.targets(api.enemies);for(const e of api.enemies)targetOrigin.set(e,{x:e.group.position.x,z:e.group.position.z});}
  carry=api.carry();checkpoint();api.play();render(true);
 }
 function buy(kind){const prices={ammo:20,heal:25,stability:60};if(!session.buy(prices[kind])){status.textContent='积分不足，或当前不在整备阶段。';return;}if(kind==='ammo')api.resupply('ammo');if(kind==='heal')api.resupply('health');if(kind==='stability')boons.recoil=Math.max(.4,boons.recoil*.85);carry=api.carry();checkpoint();render(true);}
 function choose(kind){if(!session.upgrade())return;if(kind==='power')boons.damage=Math.min(3,boons.damage*1.08);if(kind==='supply'){boons.ammo=Math.min(3,boons.ammo*1.2);api.resupply('ammo');}if(kind==='medical')api.resupply('health');carry=api.carry();checkpoint();render(true);}
 function abandon(){if(confirm('结束本轮并记录中止？不会改变主线存档。'))process(session.abandon());}
 function render(force=false){const s=session.state,key=s.phase+':'+s.progress+':'+s.credits;if(!force&&key===previousUI)return;previousUI=key;dialog.hidden=s.phase==='playing';actions.replaceChildren();title.textContent=P4_MODES[run.config.mode].name;detail.textContent=`难度已锁定：${{easy:'简单',normal:'普通',hard:'困难'}[run.config.difficulty]} · ${resumed?'续局，不计纯净最快纪录':'新局'} · ${run.config.mods.map(modifierDescription).join(' / ')||'无修饰符'}。`;
  if(s.phase==='ready'){detail.textContent+=` ${P4_MODES[run.config.mode].brief}。${run.config.challenge?'挑战要求不续局；'+(run.config.mode==='tower'?'达到'+(run.config.challenge.kind==='weekly'?20:10)+'层后主动撤离。':'完成模式目标。'):''}1 主武器 / 2 幽灵消音手枪副武器 / 3 近战；滚轮循环实际携带装备，近战按住左键连击。`;button('部署行动',()=>process(session.start()));button('放弃并返回',()=>{process(session.abandon());home();});}
  if(s.phase==='paused'){title.textContent='行动已暂停';button('继续行动',()=>{session.resume();if(session.state.phase==='playing')api.play();render(true);});button('中止行动',abandon);}
  if(s.phase==='shop'){title.textContent=run.config.mode==='tower'?`第 ${s.progress} 层已清理`:`第 ${s.progress} 波已清理`;detail.textContent+=` 积分 ${s.credits}。波间倒计时内可以采购；Esc 暂停倒计时。`;button('弹药补给 · 20',()=>buy('ammo'));button('恢复35生命 · 25',()=>buy('heal'));button(boons.recoil<=.4?'后坐稳定 · 已满':'后坐稳定 · 60',()=>buy('stability')).disabled=boons.recoil<=.4;button('立即继续',()=>process(session.start()));button('中止行动',abandon);}
  if(s.phase==='supply'){title.textContent='整备中继';detail.textContent+='下一站：'+session.entry.map+'。补给不会重置已累计时间。';if(run.config.mode==='raid')button('继续突袭',()=>process(session.start()));button('暂停',()=>{session.pause();render(true);});}
  if(s.phase==='upgrade'){title.textContent=`第 ${s.progress} 层 · 选择增益`;button(boons.damage>=3?'火力 · 已达3倍上限':'火力 +8%（上限3倍）',()=>choose('power')).disabled=boons.damage>=3;button('恢复35生命',()=>choose('medical'));button(boons.ammo>=3?'备弹 · 已达3倍上限':'备用弹药 +20%（上限3倍）',()=>choose('supply')).disabled=boons.ammo>=3;button('不选增益，继续整备',()=>choose('skip'));}
  if(run.config.mode==='tower'&&s.progress>0&&['shop','upgrade','paused'].includes(s.phase))button('主动撤离 · 保存层数',()=>process(session.extract()));
  if(s.phase==='finished'){title.textContent={won:'行动成功',lost:'行动失败',abandoned:'行动已中止',extracted:'撤离成功'}[s.outcome];detail.textContent+=` 用时 ${fmt(s.elapsed)} · 进度 ${s.progress} · 击破 ${m.kills} · 伤害 ${Math.round(m.dealt)} · DPS ${(m.dealt/Math.max(1,s.elapsed)).toFixed(1)}。`;const profile=store.read().profile,titleAward=p4Awards(profile.results,legacyAwards).find(a=>a.id===profile.equippedTitle&&a.unlocked);detail.textContent+=' '+profile.nickname+' · 佩戴称号：'+(titleAward?.name||'未佩戴')+'。';button('重试保存',saveResult);button('导出本轮JSON',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));a.download='p4-result.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});button('返回行动中枢',home);}
  if(!dialog.hidden)actions.querySelector('button')?.focus({preventScroll:true});
 }
 const runtime={active:true,get params(){return params;},get difficulty(){return run.config.difficulty;},get continuous(){return ['ghost','modifiers'].includes(run.config.mode);},get manual(){return ['survival','tower','range'].includes(run.config.mode);},get range(){return run.config.mode==='range';},lateFrame(){api.environment(params);},
  begin(){},parry(){if(params.parryHeal>0&&session.state.phase==='playing')api.heal(params.parryHeal);},equipmentChanged(){carry=api.carry();checkpoint();},nonGhost(){m.onlyGhost=false;},hurt(damage){m.damage+=finite(damage);},
  encounter(stage){if(!runtime.manual)return stage;const progress=session.state.progress,count=Math.min(stage.count,run.config.mode==='range'?3:stage.count),roles=run.config.mode==='range'?['assault']:((progress+1)%5===0?['harborElite','assault','ranged','heavy']:['assault','ranged','assault']);if(run.config.mode==='tower'){const random=seeded(hashSeed(run.config.seed+':'+progress));for(let i=0;i<roles.length;i++)roles[i]=['assault','ranged','heavy'][Math.floor(random()*3)];}return {...stage,count,roles,sentry:false,swarm:false,level:1+Math.floor(progress/3),boss:false};},
  shot(index){attack=index;m.shots++;if(index!==2)m.onlyGhost=false;},hit(damage,head,kills,source=attack){m.hits++;m.dealt+=finite(damage);if(source!==2&&damage>0)m.onlyGhost=false;if(source>=0&&source<12)m.weaponKills[source]+=finite(kills,100);},
  gameEnd(win){const snap=api.snapshot();m.kills+=Math.max(0,snap.kills-lastKills);lastKills=snap.kills;process(win?session.cleared():session.lose());return true;},
  prepareFrame(dt){pendingFrame=dt;},fixed(dt,update){if(simulating)return false;const realDt=pendingFrame??dt;pendingFrame=null;simulating=true;clock.advance(realDt,(step,tick)=>{if(api.snapshot().state==='playing'){const before=api.snapshot();inputRecorder.record(tick,{bits:before.input,yaw:before.yaw,pitch:before.pitch,weapon:before.selected});update(step);}});simulating=false;return true;},
  boot(){world=createP4World(api);booted=true;render(true);},
  frame(dt){if(!booted)return;const snap=api.snapshot();let s=session.state;if(['playing','shop','supply'].includes(s.phase)&&(api.inventoryOpen()||s.phase==='playing'&&snap.state==='paused')){session.pause();render(true);s=session.state;}
   if(s.phase==='playing'){
    m.kills+=Math.max(0,snap.kills-lastKills);lastDamage=snap.damage;lastKills=snap.kills;
    const p=snap.position;if(lastPosition){const d=Math.hypot(p.x-lastPosition.x,p.y-lastPosition.y,p.z-lastPosition.z);if(d<4)m.distance+=d;}lastPosition={...p};
    if(run.config.mode==='ghost'){recorder.record(s.elapsed,p,snap.yaw,snap.input);const pose=ghostStored?ghostAt(ghostStored.frames,s.elapsed):null;if(pose){const command=ghostInputs.at(Math.floor(s.elapsed*60));pose.input=command.bits??pose.input;}world.ghost(pose);}
    if(runtime.range){api.rangeSupplies();world.melee(snap.selected===3,snap.yaw,api.meleeRange);api.moveRange(s.elapsed,targetOrigin);if(!api.enemies.length){api.replenishRange();world.targets(api.enemies);targetOrigin.clear();for(const e of api.enemies)targetOrigin.set(e,{x:e.group.position.x,z:e.group.position.z});}}
    else if(runtime.manual&&api.enemies.length===0)process(session.cleared());
    carry=api.carry();
   }
   if(!['ready','finished'].includes(session.state.phase))carry=api.carry();
   process(session.tick(Math.min(86400,Math.max(0,dt)),{hits:m.hits}));s=session.state;
   if(s.phase!=='finished'&&s.elapsed-lastTime>=5){lastTime=s.elapsed;checkpoint();}
   strip.querySelector('b').textContent=P4_MODES[run.config.mode].name;
   strip.querySelector('span').textContent=`${fmt(s.elapsed)}${run.config.mode==='raid'?' / 8:00':''} · ${s.phase==='shop'||s.phase==='supply'?'整备 '+Math.ceil(s.remaining)+'s':'进度 '+s.progress+(runtime.manual?' · 敌人 '+api.enemies.length:'')} · DPS ${(m.dealt/Math.max(1,s.elapsed)).toFixed(1)}`;
   render();
  }
 };
 strip.querySelector('button').onclick=()=>{if(session.pause()){api.stop();render(true);}};
 document.addEventListener('keydown',e=>{if(['Escape','KeyQ'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(e.code==='Escape'){if(session.state.phase==='paused'){session.resume();if(session.state.phase==='playing')api.play();}else{session.pause();api.stop();}render(true);}}},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&session.pause()){api.stop();render(true);}});
 window.addEventListener('pagehide',()=>{if(session.state.phase!=='finished'){carry=api.carry();checkpoint();}});
 return runtime;
}
