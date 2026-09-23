export const DIFFICULTY_KEY='neon-eclipse.combat-difficulty.v1';
export const DIFFICULTIES=Object.freeze({
 easy:Object.freeze({id:'easy',label:'简单',incoming:.65,outgoing:1.25,cooldown:1.25,description:'受到战斗伤害 65% · 对敌伤害 125% · 常规攻击间隔 125%'}),
 normal:Object.freeze({id:'normal',label:'普通',incoming:1,outgoing:1,cooldown:1,description:'保持原版战斗数值，推荐首次体验'}),
 hard:Object.freeze({id:'hard',label:'困难',incoming:1.35,outgoing:.9,cooldown:.85,description:'受到战斗伤害 135% · 对敌伤害 90% · 常规攻击间隔 85%'}),
 nightmare:Object.freeze({id:'nightmare',label:'噩梦',incoming:2,outgoing:.5,cooldown:.5,spawns:2,description:'受到战斗伤害 200% · 对敌伤害 50% · 常规攻击间隔 50% · 刷怪数量 200%'})
});
export const normalizeDifficulty=value=>Object.hasOwn(DIFFICULTIES,value)?value:'normal';
export function readDifficulty(storage){try{return normalizeDifficulty((storage??globalThis.localStorage)?.getItem(DIFFICULTY_KEY));}catch{return 'normal';}}
export function writeDifficulty(value,storage){try{const target=storage??globalThis.localStorage;if(!target)return false;target.setItem(DIFFICULTY_KEY,normalizeDifficulty(value));return true;}catch{return false;}}
let selected=readDifficulty();
export const currentDifficulty=()=>DIFFICULTIES[selected];
export const incomingDamage=(damage,id=selected)=>damage*DIFFICULTIES[normalizeDifficulty(id)].incoming;
export const outgoingDamage=(damage,id=selected)=>damage*DIFFICULTIES[normalizeDifficulty(id)].outgoing;
export const attackCooldown=(seconds,id=selected)=>seconds*DIFFICULTIES[normalizeDifficulty(id)].cooldown;
export const spawnScale=(id=selected)=>DIFFICULTIES[normalizeDifficulty(id)].spawns??1;
const renders=new Set();let bound=0;export function bindCombatDifficulty(container){
 const uid='combat-difficulty-select-'+(++bound);
 container.innerHTML='<label style="display:block;margin:12px 0 8px" for="'+uid+'">主线战斗难度</label><select id="'+uid+'" style="width:100%;padding:12px;background:#10272e;color:#effaf6;border:1px solid #628d8e;font:inherit"><option value="easy">简单 · 轻松体验剧情</option><option value="normal">普通 · 标准战斗</option><option value="hard">困难 · 更强战斗压力</option><option value="nightmare">噩梦 · 双倍敌人与双倍伤害</option></select><p data-difficulty-description role="status" style="font-size:12px;line-height:1.7"></p><p style="font-size:12px;line-height:1.7;opacity:.8">选择对下一次新行动生效；当前尝试难度锁定。继续检查点标记为续局。载具与环境机关不变；无难度标签的旧成就标为早期，P4 新徽章记录难度。</p>';
 const input=container.querySelector('select'),description=container.querySelector('[data-difficulty-description]');
 const render=(saved=true)=>{input.value=selected;description.textContent=currentDifficulty().description+(saved?'':' · 无法保存，当前页面仍生效');};renders.add(render);
 input.addEventListener('change',()=>{selected=normalizeDifficulty(input.value);const saved=writeDifficulty(selected);for(const r of [...renders])r(saved);});
 globalThis.addEventListener?.('storage',event=>{if(event.key===DIFFICULTY_KEY||event.key===null){selected=readDifficulty();render();}});
 render();
}
