import {CHAPTERS} from './journey.js';
export function createJourneyUI(store,actions){
 const root=document.createElement('section');root.className='journey-menu';
 root.innerHTML='<div class="journey-heading">连续战役 / SIX CHAPTERS</div><div class="journey-actions"><button type="button" class="journey-new">开始六章战役</button><button type="button" class="journey-continue">继续战役</button></div><p class="journey-note"></p>';
 document.querySelector('.level-menu').after(root);
 const fresh=root.querySelector('.journey-new'),resume=root.querySelector('.journey-continue');let armed=false;
 fresh.addEventListener('click',()=>{if(store.data&&!armed){armed=true;fresh.textContent='确认重开 / 覆盖战役进度';return;}armed=false;actions.start();});resume.addEventListener('click',actions.continue);
 const transition=document.createElement('section');transition.className='journey-transition';transition.hidden=true;transition.setAttribute('role','dialog');transition.setAttribute('aria-modal','true');transition.setAttribute('aria-label','章节过渡');
 transition.innerHTML='<div class="journey-interlude"><small></small><h2></h2><svg viewBox="0 0 600 190" aria-hidden="true"><path class="transit-lines" d="M0 145H600M0 162H600M90 0V180M500 0V180"/><g class="transit-vehicle"><path d="M165 60H415L445 96V139H155V80Z"/><path d="M180 75H220V103H180ZM240 75H280V103H240ZM300 75H340V103H300ZM360 75H400L425 103H360Z"/><circle cx="210" cy="145" r="13"/><circle cx="390" cy="145" r="13"/></g><path class="transit-mast" d="M270 15H340V155H270ZM260 15H350M260 55H350M260 95H350M260 155H350M295 0V185M315 0V185"/></svg><p></p><div class="journey-actions"><button type="button" class="journey-enter"></button><button type="button" class="journey-later">稍后继续</button></div></div>';
 document.body.append(transition);let enter=null,previous=null;
 const enterButton=transition.querySelector('.journey-enter'),later=transition.querySelector('.journey-later');
 function close(){transition.hidden=true;previous?.focus();}
 later.addEventListener('click',close);enterButton.addEventListener('click',()=>{if(enter?.()===false)return;transition.hidden=true;});
 transition.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}if(e.key==='Tab'){e.preventDefault();(document.activeElement===enterButton?later:enterButton).focus();}});
 function showInterlude(chapter,onEnter){
  previous=document.activeElement;enter=onEnter;transition.dataset.chapter=String(chapter);transition.querySelector('small').textContent='CHAPTER '+chapter+' COMPLETE / TRANSIT';transition.querySelector('h2').textContent=['驶向地下运输站','上升至天穹枢纽','进入多层中枢塔','登上疾驰货运列车','进入风暴港口'][chapter-1];transition.querySelector('p').textContent=['反应堆已移交。小队沿货运通道驶向地下运输站。下一章生命与弹药重新整备。','末班列车已抵达枢纽下层。小队转乘维护升降平台，准备接通天穹信号。下一章生命与弹药重新整备。','天穹信号已送出，却指向仍在运行的中枢塔。小队进入三层控制设施，隔离核心后返回大厅撤离。第四章生命与弹药重新整备，旧三章记录保留。','中枢已隔离，但最后一批数据正在高速货运列车上转移。小队登车夺取机车控制权，第五章生命与弹药重新整备。','列车已驶入港区。暴雨中的接应船正在等待信标，小队需穿过集装箱堆场并取得吊机权限，再恢复码头信标。第六章生命与弹药重新整备。'][chapter-1];enterButton.textContent='进入第 '+(chapter+1)+' 章 / '+CHAPTERS[chapter].name;transition.hidden=false;enterButton.focus();
 }
 function refresh(state='ready',mode='campaign'){
  const d=store.data;document.body.dataset.playMode=mode;armed=false;fresh.textContent='开始六章战役';resume.hidden=!d||d.status==='complete'||mode==='journey'&&state!=='ready';
  if(d)resume.textContent=d.status==='between'?'章节完成 / 继续下一章':'继续战役 / 第 '+(d.chapter+1)+' 章';
  root.querySelector('.journey-note').textContent=!store.persistent?'战役存储不可用：暂不能跨章继续。单章模式仍可使用。':!d?'独立战役存档，不覆盖下方单章检查点。':d.status==='complete'?'六章战役已完成。可重开战役，或选择任意单章训练。':d.status==='between'?(d.fiveChapterImported&&d.chapter===4?'已保留旧五章通关记录，可以继续第六章。':d.fourChapterImported&&d.chapter===3?'已保留旧四章通关记录，可以继续第五章。':d.legacyImported&&d.chapter===2?'已保留旧三章通关记录，可以继续第四章。':'已记录章节结算，可随时继续下一章。'):'战役已记录：'+CHAPTERS[d.chapter].name+' / '+(d.checkpoint?'阶段 '+(d.checkpoint.stageIndex+1)+' 入口':'章节入口');
 }
 return {refresh,showInterlude};
}
