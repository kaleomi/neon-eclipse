// Map registry: the single ordered list of playable chapters.
// Phase 0 scope: pure data + resolution helpers. level.js, journey.js, menu-state.js and radar.js
// derive their constants from here instead of hard-coding six URL checks. World/data modules are
// still imported statically by their owners; the `modules` block only names them so later phases
// can move to lazy loading without editing every consumer again.
export const MAP_REGISTRY=Object.freeze([
 {id:'reactor',order:1,code:'K-19',title:'反应堆设施',english:'REACTOR COMPLEX',brief:'突破封锁，夺回反应堆。',features:'冷却装置 · 权限上传 · Warden',color:'#a2f5da',
  radarLabel:'K-19 / 80 × 80',saveKey:'neon-eclipse.campaign.v1',boss:'warden',
  traits:{multiLevel:false,movingFrame:false,water:false,weather:null},
  modules:{data:'./mission.js',world:'./mission-world.js',navigation:null}},
 {id:'station',order:2,code:'U-02',title:'地下运输站',english:'UNDERGROUND TRANSIT',brief:'穿过停靠列车，接通撤离线路。',features:'维护通道 · 站台交火 · 调度防守',color:'#8ed8ff',
  radarLabel:'U-02 / 地下运输站',saveKey:'neon-eclipse.station.v1',boss:null,
  traits:{multiLevel:false,movingFrame:false,water:false,weather:null},
  modules:{data:'./station-data.js',world:'./station-world.js',navigation:null}},
 {id:'roof',order:3,code:'A-03',title:'天穹通讯枢纽',english:'SKYLINK ARRAY',brief:'登上天穹枢纽，让信号重返城市。',features:'双中继 · 随机高压 · 枢纽监察者',color:'#d1b8ff',
  radarLabel:'A-03 / 天穹枢纽',saveKey:'neon-eclipse.roof.v1',boss:'overseer',
  traits:{multiLevel:true,movingFrame:false,water:false,weather:null},
  modules:{data:'./roof-data.js',world:'./roof-world.js',navigation:'./roof-enemy-navigation.js'}},
 {id:'tower',order:4,code:'C-04',title:'多层中枢塔',english:'CONTROL SPIRE',brief:'逐层突破中枢塔，切断核心控制。',features:'三层空间 · 核心防守 · 升降机',color:'#f1d39d',
  radarLabel:'C-04 / 多层中枢塔',saveKey:'neon-eclipse.tower.v1',boss:null,
  traits:{multiLevel:true,movingFrame:false,water:false,weather:null},
  modules:{data:'./tower-data.js',world:'./tower-world.js',navigation:'./tower-navigation.js'}},
 {id:'train',order:5,code:'T-05',title:'疾驰货运列车',english:'RUNAWAY FREIGHT',brief:'登上疾驰列车，夺取最后的数据。',features:'五节车厢 · 车顶交火 · 控制链路',color:'#ffa684',
  radarLabel:'T-05 / 疾驰列车',saveKey:'neon-eclipse.train.v1',boss:null,
  traits:{multiLevel:true,movingFrame:true,water:false,weather:null},
  modules:{data:'./train-data.js',world:'./train-world.js',navigation:'./train-navigation.js'}},
 {id:'harbor',order:6,code:'H-06',title:'风暴港口',english:'STORM HARBOR',brief:'穿越风暴港口，为小队点亮信标。',features:'集装箱堆场 · 港务精英 · 登船撤离',color:'#83e4e7',
  radarLabel:'H-06 / 风暴港口',saveKey:'neon-eclipse.harbor.v1',boss:null,
  traits:{multiLevel:true,movingFrame:false,water:true,weather:'rain'},
  modules:{data:'./harbor-data.js',world:'./harbor-world.js',navigation:'./harbor-navigation.js'}},
 {id:'orbital',order:7,code:'O-07',title:'轨道电梯基座',english:'ORBITAL TETHER BASE',brief:'登上轨道电梯基座，切断天空的锚索。',features:'三段重力 · 蜂群与狙击 · TETHER 锚定核心',color:'#9fd2ff',
  radarLabel:'O-07 / 轨道电梯基座',saveKey:'neon-eclipse.orbital.v1',boss:'tether',
  traits:{multiLevel:true,movingFrame:false,water:false,weather:null},
  modules:{data:'./orbital-data.js',world:'./orbital-world.js',navigation:'./orbital-navigation.js'}},
 {id:'datacenter',order:8,code:'D-08',title:'沉没数据中心',english:'SUNKEN DATA CENTER',brief:'潜入半淹没的机房，趁排水窗口击破 ABYSS。',features:'定时涨水 · 双排水泵 · 潜行者与盾卫 · ABYSS 水冷核心',color:'#6fe6ff',
  radarLabel:'D-08 / 沉没数据中心',saveKey:'neon-eclipse.datacenter.v1',boss:'abyss',
  traits:{multiLevel:true,movingFrame:false,water:true,weather:null},
  modules:{data:'./datacenter-data.js',world:'./datacenter-world.js',navigation:'./datacenter-navigation.js'}}
].map(Object.freeze));
export const MAP_IDS=Object.freeze(MAP_REGISTRY.map(m=>m.id));
export const DEFAULT_MAP_ID=MAP_REGISTRY[0].id;
export const mapById=id=>MAP_REGISTRY.find(m=>m.id===id)||null;
export const mapIndex=id=>MAP_REGISTRY.findIndex(m=>m.id===id);
export const nextMap=id=>MAP_REGISTRY[mapIndex(id)+1]||null;
// Resolve the requested map from a query string. Unknown or missing values fall back to chapter 1,
// which matches the historical behaviour of level.js.
export function resolveMapId(search){
 const requested=new URLSearchParams(search||'').get('map');
 return MAP_IDS.includes(requested)?requested:DEFAULT_MAP_ID;
}
export const isJourneyMode=search=>new URLSearchParams(search||'').get('mode')==='journey';
export const chapterNumber=id=>String(mapIndex(id)+1).padStart(2,'0');
// Pick a per-map value from a table; missing entries fall back to `fallback` so a new chapter
// that does not override something inherits sensible defaults instead of throwing.
export function pick(table,id,fallback){return Object.hasOwn(table,id)?table[id]:fallback;}
