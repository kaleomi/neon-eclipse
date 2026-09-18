// Chapter 09: Polar Radar Array. Shared by rendering, physics, navigation, mission and tests.
const v=(x,z,w,d,bottom,top,extra={})=>({x,z,w,d,bottom,top,h:top,...extra});
export const POLAR_ARENA={size:76,half:38,start:{x:-28,z:23},reactor:{x:0,z:0},covers:[],spawns:[],zones:[{name:'WEST TOWER / 2.4M',x:-24,z:-18},{name:'EAST TOWER / 2.4M',x:24,z:-18},{name:'NORTH TOWER / UPLINK',x:0,z:26},{name:'THIN ICE',x:0,z:0}]};
export const POLAR_BOUNDS={x:37.1,z:37.1};
// Blizzard clock: clear 18 s -> closing 5 s -> whiteout 12 s -> clearing 5 s (40 s period). Intensity 0..1.
export const STORM_CLEAR=18,STORM_CLOSE=5,STORM_WHITEOUT=12,STORM_OPEN=5;
export const STORM_PERIOD=STORM_CLEAR+STORM_CLOSE+STORM_WHITEOUT+STORM_OPEN;
export const STORM_THERMAL=.6;          // enemies switch to thermal vision at or above this intensity
export const STORM_VISIBILITY=[60,10];  // metres of visibility at intensity 0 / 1
export const THERMAL_RANGE=26;          // thermal vision: enemies see the player inside this radius through snow banks
const cycle=t=>((Number.isFinite(t)?t:0)%STORM_PERIOD+STORM_PERIOD)%STORM_PERIOD;
export function stormPhase(t){const c=cycle(t);return c<STORM_CLEAR?'clear':c<STORM_CLEAR+STORM_CLOSE?'closing':c<STORM_CLEAR+STORM_CLOSE+STORM_WHITEOUT?'whiteout':'clearing';}
export function stormIntensity(t){
 const c=cycle(t);
 if(c<STORM_CLEAR)return 0;
 if(c<STORM_CLEAR+STORM_CLOSE)return (c-STORM_CLEAR)/STORM_CLOSE;
 if(c<STORM_CLEAR+STORM_CLOSE+STORM_WHITEOUT)return 1;
 return 1-(c-STORM_CLEAR-STORM_CLOSE-STORM_WHITEOUT)/STORM_OPEN;
}
export const stormVisibility=t=>STORM_VISIBILITY[0]+(STORM_VISIBILITY[1]-STORM_VISIBILITY[0])*stormIntensity(t);
export const thermalActive=t=>stormIntensity(t)>=STORM_THERMAL;
// Seconds until the next whiteout begins (0 while a whiteout is running).
export function secondsToWhiteout(t){const c=cycle(t),start=STORM_CLEAR+STORM_CLOSE;if(c>=start&&c<start+STORM_WHITEOUT)return 0;return c<start?start-c:STORM_PERIOD-c+start;}
// Warmth: 0..100. Drains outdoors (faster in the storm), recovers inside a warm hut or on a heated tower deck.
export const WARMTH_MAX=100,WARMTH_DRAIN_CLEAR=1.2,WARMTH_DRAIN_STORM=4,WARMTH_HUT=18,WARMTH_DECK=6,WARMTH_WARN=30,FROST_DAMAGE=4;
export const WARM_HUTS=[{x:-28,z:22},{x:28,z:22},{x:0,z:-30}];
export const HUT_HALF=2.5;
export const TOWERS=[{x:-24,z:-18},{x:24,z:-18},{x:0,z:26}];
export const TOWER_DECK=2.4,TOWER_BASE_HALF=5;
export const insideHut=(x,z)=>WARM_HUTS.some(h=>Math.abs(x-h.x)<HUT_HALF-.2&&Math.abs(z-h.z)<HUT_HALF-.2);
export const onTowerDeck=(x,z,feetY)=>Math.abs(feetY-TOWER_DECK)<.05&&TOWERS.some(t=>Math.abs(x-t.x)<TOWER_BASE_HALF&&Math.abs(z-t.z)<TOWER_BASE_HALF);
// Pure: warmth rate (per second) for a position and storm intensity.
export function warmthRate(x,z,feetY,intensity){
 if(insideHut(x,z))return WARMTH_HUT;
 if(onTowerDeck(x,z,feetY))return WARMTH_DECK;
 const i=Math.max(0,Math.min(1,Number.isFinite(intensity)?intensity:0));
 return -(WARMTH_DRAIN_CLEAR+(WARMTH_DRAIN_STORM-WARMTH_DRAIN_CLEAR)*i);
}
export const stepWarmth=(warmth,rate,dt)=>Math.max(0,Math.min(WARMTH_MAX,warmth+rate*dt));
// Thin ice: a circular lake at the centre. Same height as snow; only the boss cares.
export const THIN_ICE={x:0,z:0,radius:9};
export const onThinIce=(x,z)=>Math.hypot(x-THIN_ICE.x,z-THIN_ICE.z)<THIN_ICE.radius;
export const POLAR_ENTRIES=[{x:-28,z:23,feetY:0},{x:-24,z:-6,feetY:0},{x:24,z:-6,feetY:0},{x:0,z:14,feetY:0},{x:0,z:-29,feetY:0}];
export const POLAR_STAGES=[
 {id:'pl-west',title:'接通西塔电源',short:'西塔 / 基座顶',x:-24,z:-16,feetY:2.4,facing:0,spawnFeetY:0,duration:2,count:4,level:3,action:'接通电源',roles:['assault','hound','ranged','assault'],spawns:[[-34,-30],[-12,-30],[-14,-6],[-34,-4]],message:'西塔通电。前往东塔校准阵列——暴风雪来临前找到暖房。',radio:'雪原每四十秒刮一次暴风雪：能见度只剩十米，敌人靠热成像仍然看得见你，你只能靠塔顶和暖房的信号灯。体温条见底就会冻伤，暖房里回温最快，塔基座顶也有加热板。'},
 {id:'pl-east',title:'校准东塔阵列',short:'东塔 / 基座顶',x:24,z:-16,feetY:2.4,facing:0,spawnFeetY:0,duration:2.5,count:5,level:4,action:'校准阵列',roles:['hound','hound','ranged','assault','heavy'],spawns:[[34,-22],[12,-30],[14,-6],[34,-4],{x:3,z:23,feetY:2.4}],message:'东塔校准完成，北塔信号灯已点亮。前往北塔建立上传并守住它。',radio:'猎犬机低矮、快、红眼：预警后直线突进，横移然后用霰弹或 VOLT 收掉。它们在暴风雪里照样追得到你。'},
 {id:'pl-north',title:'守住北塔上传',short:'北塔 / 上传',x:0,z:28,feetY:2.4,facing:0,spawnFeetY:0,duration:2,count:4,level:4,action:'建立上传',roles:['ranged','hound','assault','heavy'],spawns:[[-14,36],[14,36],[-10,12],[10,12]],defenseDuration:24,defenseRadius:6,defenseCount:3,defenseLabel:'北塔上传',defenseSpawns:[[-20,36],[20,36],[0,10]],defenseRoles:['hound','ranged','assault'],defenseWaves:[{at:10,count:3,spawns:[[-12,12],[12,12],[0,8]],roles:['hound','hound','hound'],message:'第二批到场 // 猎犬机从雪幕中突进'}],message:'上传完成。地面震动——重炮机甲 GLACIER 从北侧冰崖破雪而出，把它引到中央薄冰上。',radio:'守住基座顶二十四秒。基座顶有加热板，体温不会掉；猎犬机会爬台阶上来，注意四面。'},
 {id:'glacier',title:'击沉重炮机甲 GLACIER',short:'GLACIER 重炮机甲',x:0,z:0,feetY:0,duration:0,count:3,level:5,boss:true,roles:['hound','ranged','hound'],spawns:[[-16,-6],[16,-6],[0,-16]],message:'GLACIER 沉入冰湖。返回西侧暖房确认撤离。',radio:'GLACIER 装甲几乎免疫射击。它会追着你走：把它引进中央薄冰湖，压冰两秒半冰面就会碎，它陷冰八秒、装甲失效，打它胸口核心。炮击预警是脚下红圈，横移离开就行。'},
 {id:'extract',title:'返回西侧暖房撤离',short:'西侧暖房',x:-28,z:20.5,feetY:0,facing:0,duration:3,count:4,level:4,action:'确认撤离',roles:['hound','ranged','assault','hound'],spawns:[[-10,36],[-34,6],[-12,12],[-34,34]],message:'撤离确认。极地雷达阵列行动完成。',radio:'机甲已沉。回到西侧暖房，运输机在暴风雪间隙接你。'}
];
export const POLAR_SUPPLIES=[
 {id:'pl-med-west-hut',type:'health',x:-29,z:23,feetY:0},{id:'pl-ammo-east-hut',type:'ammo',x:29,z:21,feetY:0},
 {id:'pl-med-north-hut',type:'health',x:1,z:-31,feetY:0},{id:'pl-ammo-west',type:'ammo',x:-34,z:0,feetY:0},
 {id:'pl-med-east',type:'health',x:34,z:0,feetY:0},{id:'pl-ammo-south',type:'ammo',x:-10,z:34,feetY:0},
 {id:'pl-ammo-deck-w',type:'ammo',x:-27,z:-20,feetY:2.4},{id:'pl-med-deck-e',type:'health',x:27,z:-20,feetY:2.4}
];
export const POLAR_FLOORS=[v(0,0,76,76,-.3,0)];
export const POLAR_WALLS=[v(-38,0,.5,76,0,6),v(38,0,.5,76,0,6),v(0,-38,76,.5,0,6),v(0,38,76,.5,0,6)];
// Tower bases: eight concentric .3 m steps up to a 2.4 m deck (10 x 10 top), mast in the centre.
export const POLAR_TOWER_BASES=TOWERS.flatMap(t=>Array.from({length:8},(_,i)=>v(t.x,t.z,17-i,17-i,0,(i+1)*.3,{plinth:true,tier:i,walkStep:true})));
export const POLAR_MASTS=TOWERS.map((t,i)=>v(t.x,t.z,1.6,1.6,2.4,11.4,{mast:true,tower:i}));
// Warm huts: three walls + roof, opening faces south (+z). The floor is plain snow.
export const POLAR_HUTS=WARM_HUTS.flatMap((h,i)=>[
 v(h.x,h.z-2.5,5,.3,0,3,{hut:i}),v(h.x-2.5,h.z,.3,5,0,3,{hut:i}),v(h.x+2.5,h.z,.3,5,0,3,{hut:i}),
 v(h.x-1.75,h.z+2.5,1.5,.3,0,3,{hut:i}),v(h.x+1.75,h.z+2.5,1.5,.3,0,3,{hut:i}),
 v(h.x,h.z,5.3,5.3,3,3.3,{hut:i,roof:true})
]);
// Snow banks: 1.2 m cover, jumpable.
export const POLAR_BANKS=[
 v(-12,-26,6,1.4,0,1.2,{bank:true}),v(12,-26,6,1.4,0,1.2,{bank:true}),v(-12,6,1.4,6,0,1.2,{bank:true}),v(12,6,1.4,6,0,1.2,{bank:true}),
 v(-30,-4,1.4,6,0,1.2,{bank:true}),v(30,-4,1.4,6,0,1.2,{bank:true}),v(-16,32,6,1.4,0,1.2,{bank:true}),v(16,32,6,1.4,0,1.2,{bank:true}),
 v(-8,-14,4,1.4,0,1.2,{bank:true}),v(8,-14,4,1.4,0,1.2,{bank:true}),v(0,12,6,1.4,0,1.2,{bank:true}),v(-22,10,1.4,4,0,1.2,{bank:true}),
 // Star route (south-east corner): bank A 1.2 m -> bank B 2.4 m -> cliff ledge 2.4 m (star on the ledge).
 v(24,-32,3,3,0,1.2,{bank:true,starRoute:true}),v(28,-32,3,3,0,2.4,{bank:true,starRoute:true}),v(32,-30,4,4,0,2.4,{ledge:true,starRoute:true})
];
export const POLAR_STAR={x:32,z:-30,feetY:2.4};
export const HOUND_DENS=[{x:-20,z:-30},{x:20,z:-30},{x:-20,z:34},{x:20,z:34}];
export function polarObstacles(){return [...POLAR_FLOORS,...POLAR_WALLS,...POLAR_TOWER_BASES,...POLAR_MASTS,...POLAR_HUTS,...POLAR_BANKS].map(o=>({...o}));}
