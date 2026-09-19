export const ACHIEVEMENT_KEY='neon-eclipse.chapter-achievements.v1';
export const CHALLENGE_MAPS=['reactor','station','roof','tower','train','harbor','orbital','datacenter','polar'];
export const ACHIEVEMENTS=[
 {id:'blade',name:'一刃破军',rule:'单章从头一命通关；不发射枪械、不挥击重锤、不主动爆炸伤敌，并至少用刀击破一个目标。'},
 {id:'untouched',name:'毫发无伤',rule:'单章从头一命通关，实际承伤为零；补血不能抵消承伤记录。'},
 {id:'survivor',name:'不落战旗',rule:'单章从头一命通关，武器不限。'},
 {id:'arsenal',name:'全武装制霸',rule:'单章从头一命通关，步枪、霰弹枪、手枪和刀各至少击破一个目标。'},
 {id:'counter',name:'破核猎手',rule:'风暴港口从头一命通关，至少三名港务镇压者被暴露期的胸核攻击击破。'}
];
export function createChapterAttempt(){
 let run=null;
 return {begin({map,stage=0,snapshot=false,replay=false}){run={map,eligible:CHALLENGE_MAPS.includes(map)&&stage===0&&!snapshot&&!replay,reason:snapshot?'读取检查点：本轮不计单章挑战':replay?'阶段训练：不计完整单章挑战':stage!==0?'从中途开始：不计单章挑战':'本章从头挑战进行中',alive:true,finished:false,complete:false,shots:0,bladeDisqualified:false,environmentDamage:0,damage:0,kills:[0,0,0,0],counter:0};},shot(weapon){if(run&&!run.finished&&weapon!==3)run.shots++;},nonBlade(reason='重锤'){if(run&&!run.finished){run.bladeDisqualified=true;run.nonBladeReason=reason;if(run.eligible&&run.alive)run.reason='使用'+reason+'：纯刀资格失效；其他挑战继续';}},hurt(n){if(run&&!run.finished)run.damage+=Math.max(0,n);},hit(weapon,kills){if(run&&!run.finished&&Number.isInteger(weapon)&&weapon>=0&&weapon<=3)run.kills[weapon]+=Math.max(0,kills);},environmentHit(n){if(run&&!run.finished&&Number.isFinite(n)&&n>0){run.environmentDamage+=n;if(run.eligible&&run.alive)run.reason='爆炸命中敌人：纯刀资格失效；其他挑战继续';}},counter(){if(run&&!run.finished)run.counter++;},die(){if(run){run.alive=false;run.reason='本轮已阵亡：必须重新从本章起点挑战';}},finish(complete){if(!run||run.finished)return [];run.finished=true;run.complete=Boolean(complete);if(complete&&run.eligible&&run.alive)run.reason='本章挑战已完成';if(!complete||!run.eligible||!run.alive)return [];return ACHIEVEMENTS.filter(a=>a.id==='blade'?!run.bladeDisqualified&&run.shots===0&&run.environmentDamage===0&&run.kills[3]>0:a.id==='untouched'?run.damage===0:a.id==='survivor'?true:a.id==='arsenal'?run.kills.every(n=>n>0):run.map==='harbor'&&run.counter>=3).map(a=>a.id);},get state(){return run?{...run,kills:[...run.kills]}:null;}};
}
export function createAchievementStore(storage){
 if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
 const allowed=new Set(ACHIEVEMENTS.map(a=>a.id));
 function read(){try{if(!storage)return {error:true,awards:[]};const text=storage.getItem(ACHIEVEMENT_KEY);if(text===null)return {awards:[]};const s=JSON.parse(text);if(!s||s.version!==1||!Array.isArray(s.awards)||s.awards.length>30||s.awards.some(a=>!a||!allowed.has(a.id)||!CHALLENGE_MAPS.includes(a.map)))return {error:true,awards:[]};const awards=[...new Map(s.awards.map(a=>[a.id+':'+a.map,{id:a.id,map:a.map}])).values()];return {awards};}catch{return {error:true,awards:[]};}}
 return {read,unlock(ids,map){const previous=read();if(previous.error||!CHALLENGE_MAPS.includes(map)||ids.some(id=>!allowed.has(id)))return {error:true,added:[]};const added=ids.filter((id,i)=>ids.indexOf(id)===i&&!previous.awards.some(a=>a.id===id&&a.map===map)).map(id=>({id,map}));if(!added.length)return {added:[]};try{storage.setItem(ACHIEVEMENT_KEY,JSON.stringify({version:1,awards:[...previous.awards,...added]}));return {added};}catch{return {error:true,added:[]};}}};
}
