export const NAVAL_KEY='neon-eclipse.naval-difficulty.v1';
export const NAVAL_PROFILES=Object.freeze({
 easy:Object.freeze({id:'easy',label:'简单',count:1,timeLimit:210,enemyDamage:5,windup:1.7,cooldown:5.8,fireGap:1.4,speed:25,interceptSpeed:26,loseDistance:110,loseSeconds:3,reacquire:75,headStart:4,collision:.65,description:'单艘追击艇 · 210 秒 · 较低火力 · 脱离 110 米 / 3 秒'}),
 normal:Object.freeze({id:'normal',label:'普通',count:2,timeLimit:180,enemyDamage:6,windup:1.5,cooldown:5.8,fireGap:1.2,speed:27,interceptSpeed:28,loseDistance:125,loseSeconds:4,reacquire:85,headStart:3,collision:.85,description:'追击艇 + 拦截艇 · 180 秒 · 错开齐射 · 脱离 125 米 / 4 秒'}),
 hard:Object.freeze({id:'hard',label:'困难',count:2,timeLimit:180,enemyDamage:8,windup:1.5,cooldown:4.8,fireGap:1,speed:28,interceptSpeed:29,loseDistance:140,loseSeconds:5,reacquire:95,headStart:3,collision:1,description:'双艇更积极 · 180 秒 · 保留完整预警 · 脱离 140 米 / 5 秒'})
});
export const normalizeNaval=value=>Object.hasOwn(NAVAL_PROFILES,value)?value:'normal';
export function readNavalDifficulty(storage){try{return normalizeNaval((storage??globalThis.localStorage)?.getItem(NAVAL_KEY));}catch{return 'normal';}}
export function writeNavalDifficulty(value,storage){try{const target=storage??globalThis.localStorage;if(!target)return false;target.setItem(NAVAL_KEY,normalizeNaval(value));return true;}catch{return false;}}
let selected=readNavalDifficulty();
export const selectedNavalDifficulty=()=>selected;
export function bindNavalDifficulty(container){
 container.innerHTML='<label for="naval-difficulty-select">海上任务难度</label><select id="naval-difficulty-select"><option value="easy">简单 · 单艇追逐</option><option value="normal">普通 · 双艇协同</option><option value="hard">困难 · 双艇强化</option></select><p id="naval-difficulty-copy" role="status"></p>';
 const select=container.querySelector('select'),copy=container.querySelector('p');
 const render=(saved=true)=>{select.value=selected;copy.textContent=NAVAL_PROFILES[selected].description+'。下次开始 / 重试生效，当前任务难度不变。'+(saved?'':' 无法保存，当前页面仍可使用。');};
 select.addEventListener('change',()=>{selected=normalizeNaval(select.value);render(writeNavalDifficulty(selected));});
 globalThis.addEventListener?.('storage',e=>{if(e.key===NAVAL_KEY||e.key===null){selected=readNavalDifficulty();render();}});render();
}
