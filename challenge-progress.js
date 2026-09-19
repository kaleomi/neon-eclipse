import {ACHIEVEMENTS} from './chapter-achievements.js';

const WEAPON_NAMES = ['步枪','霰弹枪','手枪','刀'];
const count = value => Number.isFinite(value) ? Math.max(0,value) : 0;
const rounded = value => Math.round(value*10)/10;

// This is presentation only. Unlocking still belongs to createChapterAttempt.finish().
export function deriveChallengeProgress(state,map) {
  const current=Boolean(state&&state.map===map),run=current?state:null;
  const invalid=current&&(!Array.isArray(run.kills)||run.kills.length!==4||![run.shots,run.damage,run.counter,...run.kills].every(value=>Number.isFinite(value)&&value>=0));
  const kills=WEAPON_NAMES.map((_,index)=>count(run?.kills?.[index]));
  const shots=count(run?.shots),damage=count(run?.damage),coreKills=count(run?.counter);
  const arsenal=kills.filter(value=>value>0).length;
  return ACHIEVEMENTS.map(achievement=>{
    const id=achievement.id,applicable=id!=='counter'||map==='harbor';
    const met=id==='blade'?!run?.bladeDisqualified&&shots===0&&count(run?.environmentDamage)===0&&kills[3]>0:id==='untouched'?damage===0:id==='survivor'?true:id==='arsenal'?arsenal===4:coreKills>=3;
    let status='active',label='进行中';
    if(!applicable){status='unavailable';label='仅限港口';}
    else if(!current){status='idle';label='待开始';}
    else if(invalid){status='blocked';label='进度暂不可用';}
    else if(!run.eligible){status='blocked';label='本轮不计挑战';}
    else if(!run.alive){status='failed';label='已阵亡 · 本轮失效';}
    else if(run.finished&&!run.complete){status='blocked';label='未完成整章';}
    else if((id==='blade'&&(run?.bladeDisqualified||shots>0||count(run?.environmentDamage)>0))||(id==='untouched'&&damage>0)){status='failed';label=id==='blade'?(run?.bladeDisqualified?(run.nonBladeReason||'非刀攻击')+' · 纯刀失效':shots>0?'已开枪 · 本轮失效':'爆炸命中 · 纯刀失效'):'已承伤 · 本轮失效';}
    else if(run.finished){status=met?'completed':'failed';label=met?'本轮达成':'本轮未达成';}
    else if(met&&id!=='survivor'){status='ready';label='条件满足 · 待通关';}
    const detail=id==='blade'?`刀击破 ${kills[3]} · 枪械开火 ${shots} 发 · 爆炸伤敌 ${rounded(count(run?.environmentDamage))}`:
      id==='untouched'?`累计承伤 ${rounded(damage)} · 补血不清除承伤历史`:
      id==='survivor'?'从章首一命完成；读档、阶段训练不计挑战':
      id==='arsenal'?`已用 ${arsenal}/4 种武器击破目标`:
      applicable?`暴露胸核击破 ${Math.min(coreKills,3)}/3 · 按击破计数，不是命中次数`:'在风暴港口挑战三次暴露胸核击破';
    return {id,status,label,detail,applicable,
      value:id==='arsenal'?arsenal:id==='counter'?Math.min(coreKills,3):null,
      max:id==='arsenal'?4:id==='counter'?3:null,
      weapons:id==='arsenal'?WEAPON_NAMES.map((name,index)=>({name,kills:kills[index],met:kills[index]>0})):null};
  });
}
