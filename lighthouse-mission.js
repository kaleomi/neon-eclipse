// Expedition mission 5 "灯塔岛登陆": yacht → island pier → foot survey → yacht back to port.
// Pure rules, no rendering. Helicopter evacuation from the plan is not wired yet (documented; return leg is by yacht).
import {LIGHTHOUSE_ISLAND,LIGHTHOUSE_LANDING,ISLAND_PIER,YACHT_SPAWN} from './maritime-rules.js';
export const LIGHTHOUSE_PROFILES=Object.freeze({
 easy:Object.freeze({id:'easy',label:'简单',timeLimit:480,surveyHold:1,description:'8 分钟内完成登岛清点并返港。'}),
 normal:Object.freeze({id:'normal',label:'普通',timeLimit:360,surveyHold:1.5,description:'6 分钟内完成登岛清点并返港。'}),
 hard:Object.freeze({id:'hard',label:'困难',timeLimit:270,surveyHold:2,description:'4 分半内完成登岛清点并返港，清点保持更久。'})
});
export const normalizeLighthouse=id=>Object.hasOwn(LIGHTHOUSE_PROFILES,id)?id:'normal';
const island=LIGHTHOUSE_ISLAND,top=island.h;
export const LIGHTHOUSE_POINTS=Object.freeze({
 board:Object.freeze({...YACHT_SPAWN,y:2,name:'游艇 · 沿栈桥靠近按 E 上船'}),
 sail:Object.freeze({...LIGHTHOUSE_LANDING,y:2,name:'灯塔岛浮桥 · 在浮桥旁停稳游艇'}),
 land:Object.freeze({x:island.x,z:island.z-14,y:top+1,name:'登岛 · 停稳后按 E 下船，沿浮桥步行上岛'}),
 'survey-1':Object.freeze({x:island.x-12,z:island.z-6,y:top+1,name:'清点点 1 · 灯塔西北物资箱，按住 F'}),
 'survey-2':Object.freeze({x:island.x+11,z:island.z+9,y:top+1,name:'清点点 2 · 东南信号灯，按住 F'}),
 'survey-3':Object.freeze({x:island.x-9,z:island.z+11,y:top+1,name:'清点点 3 · 西南储油罐，按住 F'}),
 reboard:Object.freeze({...LIGHTHOUSE_LANDING,y:2,name:'返回浮桥 · 靠近游艇按 E 登船'}),
 return:Object.freeze({...YACHT_SPAWN,y:2,name:'返港泊位 · 停稳后按 E 下船'})
});
export const LIGHTHOUSE_STAGES=Object.freeze(['board','sail','land','survey-1','survey-2','survey-3','reboard','return']);
export const LIGHTHOUSE_LABELS=Object.freeze({board:'码头登船',sail:'驶向灯塔岛',land:'浮桥登岛','survey-1':'清点 1/3','survey-2':'清点 2/3','survey-3':'清点 3/3',reboard:'返回游艇',return:'返港下船',complete:'登陆任务完成'});
export const LIGHTHOUSE_SURVEYS=3;
let runSerial=0;
export function createLighthouseMission(difficulty='normal',active=false){
 const profile=LIGHTHOUSE_PROFILES[normalizeLighthouse(difficulty)];
 return {runId:active?(globalThis.crypto?.randomUUID?.()||`lighthouse-${Date.now()}-${++runSerial}-${Math.random().toString(36).slice(2).padEnd(10,'0')}`):null,
  recovered:false,status:active?'active':'idle',stage:'board',profile,elapsed:0,hold:0,surveys:0,reason:'',completed:[]};
}
const near=(p,g,r)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.hypot(p.x-g.x,p.z-g.z)<=r;
const stopped=p=>!!p&&Number.isFinite(p.speed)&&Math.abs(p.speed)<=.6;
export const onIslandTop=(x,z)=>Math.hypot(x-island.x,z-island.z)<=island.r*.78;
export const onPier=(x,z)=>x>=ISLAND_PIER.minX&&x<=ISLAND_PIER.maxX&&z>=ISLAND_PIER.minZ&&z<=ISLAND_PIER.maxZ;
export function lighthouseGoal(m,{yacht,player,kind}={}){
 const g=LIGHTHOUSE_POINTS[m.stage]||LIGHTHOUSE_POINTS.return;
 if(m.stage==='board'){if(player&&player.x<216)return {x:218,z:180,y:2,name:'前往栈桥入口，再沿栈桥按 E 登船'};return yacht?{x:yacht.x,z:yacht.z,y:2,name:g.name}:g;}
 if(m.stage==='reboard')return yacht?{x:yacht.x,z:yacht.z,y:2,name:g.name}:g;
 if(m.stage==='land'&&kind==='yacht')return {...LIGHTHOUSE_POINTS.sail,name:'停稳后按 E 下船到浮桥'};
 return g;
}
function advance(m){
 m.completed.push(m.stage);m.hold=0;if(m.stage.startsWith('survey-'))m.surveys++;
 const i=LIGHTHOUSE_STAGES.indexOf(m.stage);m.stage=LIGHTHOUSE_STAGES[i+1]||'complete';
 if(m.stage==='complete'){m.status='won';m.reason='登岛清点三处并安全返港';}
 return true;
}
export function stepLighthouseMission(m,s,dt){
 if(m.status!=='active'||!Number.isFinite(dt)||dt<=0||s.paused)return false;
 const step=Math.min(dt,.25);m.elapsed+=step;
 if(m.elapsed>=m.profile.timeLimit){m.status='lost';m.reason='超出 '+m.profile.label+' 时限 '+m.profile.timeLimit+' 秒';m.hold=0;return true;}
 const {kind,player,yacht,action=false}=s;let ready=false,seconds=0;
 switch(m.stage){
  case 'board':ready=kind==='yacht';break;
  case 'sail':ready=kind==='yacht'&&near(yacht,LIGHTHOUSE_LANDING,12)&&stopped(yacht);seconds=1;break;
  case 'land':ready=!kind&&near(yacht,LIGHTHOUSE_LANDING,16)&&stopped(yacht)&&(onIslandTop(player?.x,player?.z)||onPier(player?.x,player?.z));break;
  case 'survey-1':case 'survey-2':case 'survey-3':ready=!kind&&near(player,LIGHTHOUSE_POINTS[m.stage],4)&&onIslandTop(player.x,player.z)&&action;seconds=m.profile.surveyHold;break;
  case 'reboard':ready=kind==='yacht'&&m.surveys===LIGHTHOUSE_SURVEYS;break;
  case 'return':ready=!kind&&near(player,{x:272,z:180},8)&&near(yacht,YACHT_SPAWN,8)&&stopped(yacht);break;
 }
 m.hold=ready?m.hold+step:0;
 return ready&&m.hold+1e-8>=seconds?advance(m):false;
}
export function lighthouseBoardAllowed(m,kind){return m.status!=='active'||kind==='yacht';}
export function lighthouseSummary(m){return {label:m.profile.label,remaining:Math.max(0,m.profile.timeLimit-m.elapsed),stageIndex:m.completed.length,stages:LIGHTHOUSE_STAGES.length,surveys:m.surveys,total:LIGHTHOUSE_SURVEYS};}
