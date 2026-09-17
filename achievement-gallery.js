import {ACHIEVEMENTS, CHALLENGE_MAPS} from './chapter-achievements.js';

export const CHAPTER_NAMES = ['反应堆设施','地下运输站','天穹通讯枢纽','多层中枢塔','疾驰货运列车','风暴港口'];
export const HONORS = {
  blade: {mark:'Ⅰ', title:'孤刃先锋'}, untouched: {mark:'◇', title:'无痕行者'},
  survivor: {mark:'⚑', title:'不屈战士'}, arsenal: {mark:'Ⅳ', title:'军械大师'},
  counter: {mark:'◎', title:'核心追猎者'}
};
export const ACHIEVEMENT_NOTICE_KEY = 'neon-eclipse.achievement-notices.v1';

// Gallery filters only inspect saved awards; live attempts never grant a badge.
export function selectAchievementGallery(awards, {chapter='all', status='all', currentMap='reactor'}={}) {
  const scope=chapter==='current'?currentMap:chapter;
  const selected=CHALLENGE_MAPS.includes(scope)?scope:null;
  return ACHIEVEMENTS.filter(a=>a.id!=='counter'||!selected||selected==='harbor').map(a=>{
    const maps=CHALLENGE_MAPS.filter(map=>awards.some(v=>v.id===a.id&&v.map===map));
    const unlocked=selected?maps.includes(selected):maps.length>0;
    return {...a, ...HONORS[a.id], maps, unlocked, selected};
  }).filter(a=>status==='unlocked'?a.unlocked:status==='locked'?!a.unlocked:true);
}

export function createAchievementNotices(storage) {
  if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
  let enabled=true;
  try{enabled=storage?.getItem(ACHIEVEMENT_NOTICE_KEY)!=='off';}catch{}
  return {
    get enabled(){return enabled;},
    setEnabled(value){enabled=Boolean(value);try{if(!storage)throw Error('unavailable');storage.setItem(ACHIEVEMENT_NOTICE_KEY,enabled?'on':'off');return true;}catch{return false;}}
  };
}

export function createAchievementToast(preferences) {
  const root=document.createElement('div');root.className='achievement-toast';root.hidden=true;
  root.setAttribute('role','status');root.setAttribute('aria-live','polite');root.setAttribute('aria-atomic','true');
  const text=document.createElement('span'),close=document.createElement('button');
  close.type='button';close.textContent='×';close.setAttribute('aria-label','关闭荣誉提示');
  root.append(text,close);document.body.append(root);
  let timer;
  function hide(){clearTimeout(timer);root.hidden=true;text.textContent='';}
  close.addEventListener('click',hide);
  return {hide,show(added){
    if(!preferences.enabled||!added.length)return;
    clearTimeout(timer);
    text.textContent='荣誉已保存 · '+added.map(a=>ACHIEVEMENTS.find(d=>d.id===a.id)?.name).filter(Boolean).join(' / ');
    root.hidden=false;timer=setTimeout(hide,6500);
  }};
}
