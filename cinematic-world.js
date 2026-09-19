import * as T from './node_modules/three/build/three.module.js';
import {INTRO,chapterIntro,introFrame,createIntroClock} from './cinematic-rules.js';
// Chapter intro presentation: a fixed overlay (three lines + objective card + skip button) and a camera fly-by
// that converges on the player's spawn. Game simulation does not run while the intro is active; the caller
// gates `update(dt)` and input on `intro.active`. Camera pose is restored exactly on finish/skip/cancel.
export function createChapterIntro({camera,mapId,onFinish=()=>{},rules=INTRO,document:doc=globalThis.document}){
 const data=chapterIntro(mapId),clock=createIntroClock(rules);
 const root=doc.createElement('section');root.className='chapter-intro';root.hidden=true;root.setAttribute('aria-live','polite');
 root.innerHTML=`<div class="chapter-intro-head"><span class="chapter-intro-code"></span><h2 class="chapter-intro-title"></h2><small class="chapter-intro-english"></small></div><ol class="chapter-intro-lines"><li></li><li></li><li></li></ol><div class="chapter-intro-card" hidden><span>OBJECTIVE / 当前目标</span><strong></strong></div><button type="button" class="chapter-intro-skip" data-intro-skip hidden>跳过开场 <kbd>Space</kbd></button>`;
 doc.body.append(root);
 const $=s=>root.querySelector(s);
 $('.chapter-intro-code').textContent=data.code;$('.chapter-intro-title').textContent=data.title;$('.chapter-intro-english').textContent=data.english;
 root.style.setProperty('--intro-color',data.color);
 const lines=[...root.querySelectorAll('.chapter-intro-lines li')];lines.forEach((li,i)=>{li.textContent=data.lines[i];li.dataset.show='false';});
 const spawn=new T.Vector3(),look=new T.Vector3(),savedRotation=new T.Euler();let objective='',shownLines=0,lastFrame=null;
 function begin({objective:title=''}={}){
  objective=title;$('.chapter-intro-card strong').textContent=objective;$('.chapter-intro-card').hidden=true;$('[data-intro-skip]').hidden=true;
  spawn.copy(camera.position);savedRotation.copy(camera.rotation);shownLines=0;lines.forEach(li=>{li.dataset.show='false';});
  clock.start();root.hidden=false;doc.body.dataset.cinematic='true';place(introFrame(0,rules));
 }
 function place(f){
  const c=f.camera;camera.position.set(spawn.x+Math.sin(c.angle)*c.radius,spawn.y+c.height-c.drop*0,spawn.z+Math.cos(c.angle)*c.radius);
  look.set(spawn.x,spawn.y-c.drop,spawn.z-6);camera.lookAt(look);
 }
 function restore(){camera.position.copy(spawn);camera.rotation.copy(savedRotation);root.hidden=true;delete doc.body.dataset.cinematic;}
 function end(){restore();onFinish();}
 function step(realDt){
  if(!clock.active)return null;
  const f=clock.step(realDt);lastFrame=f;
  for(let i=shownLines;i<f.lines;i++){lines[i].dataset.show='true';}shownLines=f.lines;
  $('.chapter-intro-card').hidden=!f.card;$('[data-intro-skip]').hidden=!f.skippable;
  if(f.done){end();return f;}
  place(f);return f;
 }
 function skip(){if(!clock.skip())return false;end();return true;}
 function cancel(){if(!clock.active)return false;clock.cancel();restore();return true;}
 $('[data-intro-skip]').addEventListener('click',e=>{e.stopPropagation();skip();});
 return {begin,step,skip,cancel,data,get active(){return clock.active;},get time(){return clock.time;},get frame(){return lastFrame;},element:root};
}
