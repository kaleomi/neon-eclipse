// Pure cinematic rules: chapter intro timeline (fly-by + three lines + objective card) and the data-driven
// between-chapter briefing. No DOM, no three.js: app/menu modules render whatever these functions return.
import {MAP_REGISTRY} from './maps/registry.js';
import {formatPlayTime} from './menu-state.js';
export const INTRO=Object.freeze({duration:10,lineAt:Object.freeze([.6,3.2,5.8]),cardAt:8,minSkipDelay:.4,orbit:Object.freeze({radius:7,height:5.5,drop:1.2})});
// Third line per chapter; the first two come from the registry so a new chapter needs no edit here.
const CHAPTER_LINES=Object.freeze({
 reactor:'守卫已切断冷却回路，Warden 在核心层等待。',station:'末班列车停靠中，道岔仍由 SWITCHYARD 控制。',roof:'两座中继塔暴露在高压之下，监察者在楼顶巡视。',
 tower:'三层大厅只剩战斗升降台还在运行。',train:'列车全速前进，SKYHOOK 已锁定车顶。',harbor:'风暴中的港口，三台吊机是唯一的通路。',
 orbital:'重力分段失稳，TETHER 锚定核心仍在运转。',datacenter:'排水泵停机，水位每分钟都在上涨。',polar:'暴风雪周期逼近，GLACIER 潜伏在薄冰之下。'
});
export function chapterIntro(mapId){
 const entry=MAP_REGISTRY.find(m=>m.id===mapId)||MAP_REGISTRY[0];
 return Object.freeze({map:entry.id,code:entry.code,title:entry.title,english:entry.english,lines:Object.freeze([entry.brief,entry.features.replace(/ · /g,' / '),CHAPTER_LINES[entry.id]||'保持警惕，完成目标后撤离。']),color:entry.color});
}
// Frame state at `t` seconds: which lines are visible, whether the card shows, camera orbit parameters (0→1 progress).
export function introFrame(t,rules=INTRO){
 t=Number.isFinite(t)?Math.max(0,t):0;
 const progress=Math.min(1,t/rules.duration),eased=1-Math.pow(1-progress,3);
 return {t,progress,done:t>=rules.duration,lines:rules.lineAt.filter(at=>t>=at).length,card:t>=rules.cardAt,skippable:t>=rules.minSkipDelay,
  camera:{angle:Math.PI*.9*(1-eased),radius:rules.orbit.radius*(1-eased)+.01,height:rules.orbit.height*(1-eased),drop:rules.orbit.drop*(1-eased)}};
}
// Intro clock: advances with real dt, `skip()` ends early (only after minSkipDelay), `finished` reports once.
export function createIntroClock(rules=INTRO){
 let t=0,ended=false,active=false;
 return {
  start(){t=0;ended=false;active=true;},
  step(dt){if(!active)return null;t+=Math.max(0,dt);const f=introFrame(t,rules);if(f.done){active=false;ended=true;}return f;},
  skip(){if(!active||t<rules.minSkipDelay)return false;active=false;ended=true;return true;},
  cancel(){active=false;ended=false;},
  get active(){return active;},get ended(){return ended;},get time(){return t;}
 };
}
// Decide whether a chapter start plays the intro: only fresh starts (stage 0, no checkpoint), setting on,
// not under an automation driver unless `?intro=1` forces it (existing browser tests click deploy hundreds
// of times and expect play immediately). `?intro=0` always disables.
export function shouldPlayIntro({stageIndex=0,checkpoint=null,setting=true,webdriver=false,search=''}={}){
 const params=new URLSearchParams(search),flag=params.get('intro');
 if(flag==='0')return false;
 if(stageIndex!==0||checkpoint)return false;
 if(!setting)return false;
 if(webdriver&&flag!=='1')return false;
 return true;
}
// Between-chapter briefing: last chapter report + next chapter threat preview, built from journey data.
export function briefing({mode='campaign',journey=null,current=null,next=null,result=null}={}){
 if(!next)return null;
 const report=result&&Number.isFinite(result.time)?{title:'上章战报',map:current?.map||null,text:`${current?.name||'上一章'} · 用时 ${formatPlayTime(result.time)} · 击破 ${Math.max(0,result.kills|0)} 个目标`}:null;
 const entry=MAP_REGISTRY.find(m=>m.id===next.map);
 const threat={title:'下章威胁',map:next.map,text:`${next.name} · ${entry?entry.features:''}`,boss:entry?entry.boss.toUpperCase():null,weather:entry?.traits?.weather||null};
 const totals=mode==='journey'&&Array.isArray(journey?.results)&&journey.results.length?{time:journey.results.reduce((s,r)=>s+r.time,0),kills:journey.results.reduce((s,r)=>s+r.kills,0),chapters:journey.results.length}:null;
 return {report,threat,totals};
}
