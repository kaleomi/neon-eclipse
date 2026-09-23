// Chapter 07: Orbital Tether Base. Shared by rendering, physics, navigation, mission and tests.
const v=(x,z,w,d,bottom,top,extra={})=>({x,z,w,d,bottom,top,h:top,...extra});
export const ORBITAL_ARENA={size:76,half:38,start:{x:0,z:32},reactor:{x:0,z:0},covers:[],spawns:[],zones:[{name:'BASE FLOOR / 0M',x:0,z:22},{name:'RING I / 4M',x:-9,z:-3},{name:'RING II / 9M',x:-9,z:3},{name:'TETHER',x:0,z:-16}]};
export const ORBITAL_BOUNDS={x:37.1,z:37.1};
// Gravity bands: feet height -> gravity (m/s^2). Jump 7.6 m/s -> 1.44 m / 2.22 m / 3.61 m.
export const GRAVITY_BANDS=Object.freeze([{name:'一段 / 1.0 g',min:0,gravity:20,recoil:1},{name:'二段 / 0.65 g',min:3.5,gravity:13,recoil:1.25},{name:'三段 / 0.4 g',min:7.5,gravity:8,recoil:1.5}]);
export function gravityBand(feetY){const y=Number.isFinite(feetY)?feetY:0;let band=0;for(let i=1;i<GRAVITY_BANDS.length;i++)if(y>=GRAVITY_BANDS[i].min)band=i;return band;}
export const orbitalGravity=feetY=>GRAVITY_BANDS[gravityBand(feetY)].gravity;
export const orbitalRecoilScale=feetY=>GRAVITY_BANDS[gravityBand(feetY)].recoil;
export const ORBITAL_ENTRIES=[{x:0,z:32,feetY:0},{x:0,z:19,feetY:0},{x:-24,z:0,feetY:0},{x:-9,z:-9,feetY:4},{x:0,z:28,feetY:0}];
export const ORBITAL_STAGES=[
 {id:'orbital-gate',title:'解除基座门禁',short:'基座门禁',x:0,z:22,feetY:0,facing:0,duration:2,count:4,level:3,action:'解除门禁',roles:['assault','sniper','drone','drone'],spawns:[[-14,10],{x:-9,z:0,feetY:4},[12,8],[16,18]],message:'门禁解除，一号稳定环供电柜在西侧四米环。沿西侧金色台阶登上。',radio:'港口信号把我们引到轨道电梯基座。这里的重力场分三段：越高越轻，跳得更高、后坐更大。留意四米环上的狙击守卫，紫色锁定线出现就切断视线。'},
 {id:'orbital-ring',title:'启动一号稳定环供电',short:'稳定环供电柜 / 4m',x:-9,z:-3,feetY:4,facing:0,duration:2.5,count:5,level:4,action:'启动稳定环供电',roles:['drone','drone','drone','ranged','assault'],spawns:[{x:9,z:-6,feetY:4},{x:9,z:6,feetY:4},{x:-4,z:-9,feetY:4},[-24,-14],[-24,14]],message:'一号稳定环已供电。沿南侧环东段的第二段台阶登上九米锚索平台。',radio:'四米环是 0.65 g 区，一跳两米多。蜂群无人机血量低但会成群贴上来，霰弹或近战最省事。供电柜在西段。'},
 {id:'orbital-anchor',title:'守住顶层锚索校准',short:'锚索校准台 / 9m',x:-9,z:3,feetY:9,facing:0,duration:2,count:4,level:4,action:'启动锚索校准',roles:['sniper','drone','ranged','assault'],spawns:[{x:9,z:-6,feetY:9},{x:-4,z:-9,feetY:9},{x:4,z:-9,feetY:9},{x:9,z:6,feetY:4}],defenseDuration:18,defenseRadius:8,defenseCount:3,defenseLabel:'锚索校准',defenseSpawns:[{x:9,z:-6,feetY:9},{x:-4,z:-9,feetY:9},[-24,-14]],defenseRoles:['drone','drone','sniper'],defenseWaves:[{at:9,count:2,spawns:[{x:9,z:-3,feetY:9},[24,14]],roles:['sniper','drone'],message:'第二批到场 // 顶层狙击与地面无人机'}],message:'锚索校准完成。TETHER 锚定核心已启动，返回地面，从底层稳定器开始击破。',radio:'九米平台只有 0.4 g，一跳三米六，滞空近两秒。留在校准台八米内十八秒；跳下环去会暂停进度。'},
 {id:'tether',title:'击破 TETHER 锚定核心',short:'TETHER 锚定核心',x:0,z:-16,feetY:0,duration:0,count:3,level:5,boss:true,roles:['assault','drone','sniper'],spawns:[[-14,-24],[14,-24],{x:9,z:-6,feetY:4}],message:'TETHER 已沉寂，重力场恢复稳定。返回南部升降平台撤离。',radio:'三个稳定器分别在地面北侧、四米环西段、九米环东段，全部击破后核心暴露八秒。重力脉冲会锁定你所在的高度段，预警时起跳，落地前脉冲就过去了。'},
 {id:'extract',title:'返回升降平台撤离',short:'升降平台',x:0,z:32,feetY:0,duration:3,count:4,level:4,action:'确认平台撤离',roles:['assault','ranged','drone','sniper'],spawns:[[-18,18],[18,18],[-14,10],{x:-9,z:0,feetY:4}],message:'撤离确认。轨道电梯基座行动完成。',radio:'核心已沉寂，配重着陆区重新启用，看到琥珀圈就离开。回到南部平台确认撤离。'}
];
export const ORBITAL_SUPPLIES=[
 {id:'orbital-med-south',type:'health',x:-26,z:26,feetY:0},{id:'orbital-ammo-south',type:'ammo',x:26,z:26,feetY:0},
 {id:'orbital-med-north',type:'health',x:-30,z:-8,feetY:0},{id:'orbital-ammo-north',type:'ammo',x:30,z:-8,feetY:0},
 {id:'orbital-ammo-ring1',type:'ammo',x:9,z:-9,feetY:4},{id:'orbital-med-ring1',type:'health',x:-9,z:9,feetY:4},
 {id:'orbital-med-ring2',type:'health',x:9,z:-3,feetY:9},{id:'orbital-ammo-ring2',type:'ammo',x:-9,z:-9,feetY:9}
];
export const ORBITAL_FLOORS=[v(0,0,76,76,-.3,0)];
export const ORBITAL_SHAFT=v(0,0,6,6,0,10);
// Rings hug the 6 x 6 shaft (inner edge 3 m, outer edge 13 m). Ring II leaves the south-east quarter open for flight 02.
export const ORBITAL_RINGS=[
 v(0,-9,26,8,3.75,4,{ring:1}),v(0,9,26,8,3.75,4,{ring:1}),v(-8,0,10,10,3.75,4,{ring:1}),v(8,0,10,10,3.75,4,{ring:1}),
 v(0,-9,26,8,8.75,9,{ring:2}),v(-8,0,10,10,8.75,9,{ring:2}),v(8,0,10,10,8.75,9,{ring:2}),v(-4,9,18,8,8.75,9,{ring:2})
];
// East landing of ring I feeds flight 02 (x 14.75 -> 5.25), which lands on the extended ring II south strip.
export const ORBITAL_LANDING=v(15,9,4,8,3.75,4,{ring:1});
export const ORBITAL_STAIRS=[
 ...Array.from({length:16},(_,i)=>v(-20.75+i*.5,0,.5,3,0,(i+1)*.25,{walkStep:true})),
 ...Array.from({length:20},(_,i)=>v(14.75-i*.5,9,.5,3,4,4+(i+1)*.25,{walkStep:true}))
];
export const ORBITAL_WALLS=[v(-38,0,.5,76,0,14),v(38,0,.5,76,0,14),v(0,-38,76,.5,0,14),v(0,38,76,.5,0,14)];
export const ORBITAL_COVER=[
 ...[[-22,-22],[22,-22],[-22,22],[22,22],[-30,0],[30,0],[0,-30],[-10,30],[10,30]].map(([x,z])=>v(x,z,3,3,0,2.5,{cover:true})),
 v(-9,-12.6,6,.4,4,5.2,{rail:true}),v(9,-12.6,6,.4,4,5.2,{rail:true}),v(-12.6,-4,.4,5,4,5.2,{rail:true}),v(12.6,4,.4,5,4,5.2,{rail:true}),
 v(-9,-12.6,6,.4,9,10.2,{rail:true}),v(9,-12.6,6,.4,9,10.2,{rail:true}),v(-12.6,4,.4,5,9,10.2,{rail:true}),v(12.6,-4,.4,5,9,10.2,{rail:true})
];
// Counterweight landing pads: amber warning then a short live window. Coordinates are floor level only.
export const ORBITAL_PADS=[{x:-24,z:-10},{x:24,z:-10},{x:-24,z:10},{x:24,z:10}];
export const PAD_RADIUS=3.2,PAD_WARNING=2,PAD_LIVE=.6,PAD_DAMAGE=14,PAD_PERIOD=7.5;
export const ORBITAL_STAR_PLATFORMS=[v(0,-19,1.6,1.6,0,10.2,{platform:true,hiddenArea:true,kind:'platform'}),v(0,-24,1.6,1.6,0,11.4,{platform:true,hiddenArea:true,kind:'platform'})];
export const ORBITAL_STAR={x:0,z:-24,feetY:11.4};
export function orbitalObstacles(){return [...ORBITAL_FLOORS,ORBITAL_SHAFT,...ORBITAL_RINGS,ORBITAL_LANDING,...ORBITAL_STAIRS,...ORBITAL_WALLS,...ORBITAL_COVER].map(o=>({...o}));}
// Pad hazard: pure timing. `elapsed` is stage/attempt time; returns damage for this frame or 0.
export function padPhase(elapsed,index){const t=((elapsed+index*PAD_PERIOD/ORBITAL_PADS.length)%PAD_PERIOD+PAD_PERIOD)%PAD_PERIOD;return t<PAD_WARNING?'warning':t<PAD_WARNING+PAD_LIVE?'live':'rest';}
export function padHit(elapsed,player,feetY=0){if(feetY>.65)return null;for(const [i,p] of ORBITAL_PADS.entries())if(padPhase(elapsed,i)==='live'&&Math.hypot(player.x-p.x,player.z-p.z)<=PAD_RADIUS)return {index:i,x:p.x,z:p.z};return null;}
