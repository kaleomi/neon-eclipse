// P4 descriptors are data. Runtime owns all outcomes; URL parameters cannot submit scores.
export const P4_VERSION=1;
export const P4_MAPS=['reactor','station','roof','tower','train','harbor','orbital','datacenter','polar'];
export const P4_MODES=Object.freeze({
 survival:{name:'生存 · 潮汐',brief:'20波 · 每5波精英 · 波间30秒积分整备',scene:'fps'},
 raid:{name:'突袭 · 倒计时',brief:'随机三章阶段 · 8分钟 · 一命到底',scene:'fps'},
 modifiers:{name:'修饰符挑战',brief:'20种参数规则中抽取3种 · 完整单章',scene:'fps'},
 ghost:{name:'竞速 · 幽灵',brief:'完整章节计时 · 输入及位置轨迹记录 · 与自己竞速',scene:'fps'},
 range:{name:'靶场 · 训练',brief:'60秒 · 移动/弱点靶 · DPS与近战范围显示',scene:'fps'},
 vehicle:{name:'载具计时赛',brief:'越野/摩托/游艇/飞机 · 有序检查门 · 自己的幽灵',scene:'vehicle'},
 bossrush:{name:'Boss 冲刺',brief:'九章原Boss连战 · 战间15秒补给 · 一命',scene:'fps'},
 tower:{name:'无尽塔',brief:'中枢塔模板轮换 · 每5层选择增益 · 撤离结算',scene:'fps'}
});
export const MODIFIERS=Object.freeze([
 {id:'runner',name:'极速薄甲',values:{move:2,health:.5}},
 {id:'bulwark',name:'重甲步伐',values:{move:.8,health:1.35}},
 {id:'glass',name:'玻璃火力',values:{health:.55,damage:1.4}},
 {id:'precision',name:'精密校准',values:{spread:.55,reload:1.15}},
 {id:'scatter',name:'躁动枪口',values:{spread:1.6,damage:1.15}},
 {id:'quickload',name:'快速装填',values:{reload:.7,ammo:.8}},
 {id:'dry',name:'补给紧缺',values:{ammo:.55,damage:1.2}},
 {id:'stocked',name:'弹药储备',values:{ammo:1.5,move:.9}},
 {id:'haste',name:'急袭敌群',values:{enemySpeed:1.6,enemyHp:.7}},
 {id:'plated',name:'厚甲敌群',values:{enemyHp:1.5,enemySpeed:.75}},
 {id:'pressure',name:'火力压力',values:{enemyCooldown:.8,enemyHp:.85}},
 {id:'deliberate',name:'沉重打击',values:{incoming:1.3,enemyCooldown:1.25}},
 {id:'frail',name:'脆弱协议',values:{incoming:1.4,damage:1.3}},
 {id:'mercy',name:'反射修复',values:{parryHeal:8,incoming:1.15}},
 {id:'fog',name:'夜幕浓雾',values:{fog:.045,light:.45,enemyCooldown:1.2}},
 {id:'night',name:'暗夜',values:{light:.45,enemySpeed:.85}},
 {id:'bare',name:'无 HUD',values:{hud:0,damage:1.1}},
 {id:'recoil',name:'强后坐',values:{recoil:1.6,spread:.8}},
 {id:'steady',name:'低后坐',values:{recoil:.55,move:.85}},
 {id:'endurance',name:'弱点协议',values:{headshotsOnly:1,damage:1.5}}
]);
export const DEFAULT_PARAMS=Object.freeze({move:1,health:1,damage:1,incoming:1,spread:1,reload:1,ammo:1,enemySpeed:1,enemyHp:1,enemyCooldown:1,recoil:1,fog:.014,light:1,hud:1,headshotsOnly:0,parryHeal:0});
export function hashSeed(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function seeded(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function shuffled(list,seed){const a=[...list],r=seeded(seed);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function localDay(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function weekDay(date=new Date()){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);d.setDate(d.getDate()-(d.getDay()+6)%7);return localDay(d);}
export function dailyChallenge(kind='daily',date=new Date()){
 const day=kind==='weekly'?weekDay(date):localDay(date),seed=hashSeed(kind+':'+day),modes=['survival','raid','modifiers','ghost','bossrush','tower'];
 const mode=modes[seed%modes.length],map=mode==='tower'?'tower':mode==='bossrush'?'reactor':mode==='raid'?shuffled(P4_MAPS,seed)[0]:P4_MAPS[Math.floor(seed/7)%9];return {kind,day,seed,mode,map,mods:shuffled(MODIFIERS.map(m=>m.id),seed).slice(0,3)};
}
export function parameters(ids=[]){const result={...DEFAULT_PARAMS};for(const id of [...new Set(ids)]){const m=MODIFIERS.find(m=>m.id===id);if(!m)continue;for(const [k,v] of Object.entries(m.values))result[k]=['fog','hud','headshotsOnly','parryHeal'].includes(k)?v:result[k]*v;}return result;}
export function validConfig(c){return !!c&&(Object.hasOwn(P4_MODES,c.mode)||c.mode==='story')&&P4_MAPS.includes(c.map)&&['easy','normal','hard'].includes(c.difficulty)&&Number.isInteger(c.seed)&&c.seed>=0&&c.seed<=4294967295&&Array.isArray(c.mods)&&c.mods.length<=3&&new Set(c.mods).size===c.mods.length&&c.mods.every(id=>MODIFIERS.some(m=>m.id===id))&&['rover','bike','yacht','plane'].includes(c.vehicle)&&[0,1,4,5,6,7].includes(c.weapon)&&(!c.challenge||(['daily','weekly'].includes(c.challenge.kind)&&typeof c.challenge.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(c.challenge.day)));}
export function makeConfig(input={}){const seed=Number.isInteger(input.seed)?input.seed>>>0:hashSeed(String(Date.now()));const mode=Object.hasOwn(P4_MODES,input.mode)?input.mode:'survival';const c={mode,map:P4_MAPS.includes(input.map)?input.map:'reactor',difficulty:['easy','normal','hard'].includes(input.difficulty)?input.difficulty:'normal',seed,mods:mode==='modifiers'?shuffled(MODIFIERS.map(m=>m.id),seed).slice(0,3):[],vehicle:['rover','bike','yacht','plane'].includes(input.vehicle)?input.vehicle:'rover',weapon:[0,1,4,5,6,7].includes(Number(input.weapon))?Number(input.weapon):0};if(input.challenge&&['daily','weekly'].includes(input.challenge.kind)){const x=dailyChallenge(input.challenge.kind);Object.assign(c,{mode:x.mode,map:x.map,seed:x.seed,mods:x.mods,challenge:{kind:x.kind,day:x.day}});}return c;}
export function routeFor(c){if(c.mode==='bossrush')return P4_MAPS.map(map=>({map,stage:3}));if(c.mode==='raid')return shuffled(P4_MAPS,c.seed).slice(0,3).map((map,i)=>({map,stage:(c.seed+i)%3}));return [{map:c.mode==='tower'?'tower':c.map,stage:0}];}
export function difficultyBadge(id){return {easy:'青铜',normal:'银辉',hard:'金曜'}[id]||'早期';}

export function modifierDescription(id){const m=MODIFIERS.find(m=>m.id===id);if(!m)return '';const labels={move:'移动',health:'有效生命',damage:'伤害',incoming:'受伤',spread:'散布',reload:'装填耗时',ammo:'备弹',enemySpeed:'守卫移速',enemyHp:'守卫生命',enemyCooldown:'常规攻击间隔',recoil:'后坐',fog:'雾密度',light:'照明',hud:'HUD'};return m.name+'（'+Object.entries(m.values).map(([k,v])=>k==='hud'?'关闭 HUD':k==='headshotsOnly'?'仅头部/弱点/机关伤害有效':k==='parryHeal'?'成功弹反回复'+v+'生命':labels[k]+(k==='fog'?'=':'×')+v).join('，')+'）';}

export function modifierDamage(damage,params={},zone=null){return params.headshotsOnly&&zone==='body'?0:damage*(params.damage??1);}
