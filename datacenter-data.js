// Chapter 08: Sunken Data Center. Shared by rendering, physics, navigation, mission and tests.
const v=(x,z,w,d,bottom,top,extra={})=>({x,z,w,d,bottom,top,h:top,...extra});
export const DATACENTER_ARENA={size:76,half:38,start:{x:0,z:32},reactor:{x:0,z:-12},covers:[],spawns:[],zones:[{name:'INTAKE / 0M',x:0,z:22},{name:'PUMP I / PLINTH',x:-20,z:-20},{name:'PUMP II / PLINTH',x:20,z:-20},{name:'ABYSS',x:0,z:-12}]};
export const DATACENTER_BOUNDS={x:37.1,z:37.1};
// Water: the hall floods on a fixed cycle. Plinth tops (1.5 m) always stay dry; the floor is under water at HIGH.
export const WATER_HIGH=1.2,WATER_SLOW=.55,WATER_LOW_PHASE=14,WATER_RISE=6,WATER_DRAIN=6;
export const WATER_HIGH_PHASE=[14,10,7]; // seconds at HIGH with 0 / 1 / 2 pumps running
export const ENERGY_WEAPONS=[5,6,7]; // HALO / RAILSPIKE / VOLT short-circuit while the muzzle is under water
export function waterPeriod(pumps=0){return WATER_LOW_PHASE+WATER_RISE+WATER_HIGH_PHASE[Math.min(2,Math.max(0,pumps))]+WATER_DRAIN;}
// Pure: water surface height at cycle time `t` (seconds since the cycle started) with `pumps` running.
export function waterLevel(t,pumps=0){
 const high=WATER_HIGH_PHASE[Math.min(2,Math.max(0,pumps))],period=WATER_LOW_PHASE+WATER_RISE+high+WATER_DRAIN;
 const c=((Number.isFinite(t)?t:0)%period+period)%period;
 if(c<WATER_LOW_PHASE)return 0;
 if(c<WATER_LOW_PHASE+WATER_RISE)return WATER_HIGH*(c-WATER_LOW_PHASE)/WATER_RISE;
 if(c<WATER_LOW_PHASE+WATER_RISE+high)return WATER_HIGH;
 return WATER_HIGH*(1-(c-WATER_LOW_PHASE-WATER_RISE-high)/WATER_DRAIN);
}
export function waterPhase(t,pumps=0){const high=WATER_HIGH_PHASE[Math.min(2,Math.max(0,pumps))],period=WATER_LOW_PHASE+WATER_RISE+high+WATER_DRAIN,c=((Number.isFinite(t)?t:0)%period+period)%period;return c<WATER_LOW_PHASE?'low':c<WATER_LOW_PHASE+WATER_RISE?'rising':c<WATER_LOW_PHASE+WATER_RISE+high?'high':'draining';}
export const submerged=(feetY,level)=>level>.05&&feetY<level-.05;
export const waterMoveScale=(feetY,level)=>submerged(feetY,level)?WATER_SLOW:1;
export const weaponShorted=(weaponIndex,feetY,level)=>ENERGY_WEAPONS.includes(weaponIndex)&&level>.05&&feetY+1.1<level;
export const DATACENTER_ENTRIES=[{x:0,z:32,feetY:0},{x:0,z:19,feetY:0},{x:-20,z:-12,feetY:0},{x:20,z:-12,feetY:0},{x:0,z:28,feetY:0}];
export const DATACENTER_STAGES=[
 {id:'dc-intake',title:'解除机房进气闸',short:'进气闸门控',x:0,z:22,feetY:0,facing:0,duration:2,count:4,level:3,action:'解除闸门',roles:['assault','stalker','ranged','shield'],spawns:[[-14,10],[14,10],[-6,4],[10,26]],message:'进气闸已打开。西侧基座顶部是一号排水泵，涨水前登上台阶。',radio:'港口传来的坐标指向这座半淹的数据中心。机房定时涨水：水里移动只有一半速度，HALO、RAILSPIKE、VOLT 在水下会短路。护盾兵正面免疫，绕到背后；潜行者在远处几乎透明，靠近才显形。'},
 {id:'dc-pump-1',title:'启动一号排水泵',short:'一号泵 / 基座',x:-20,z:-20,feetY:1.5,facing:0,duration:2.5,count:5,level:4,action:'启动排水泵',roles:['stalker','stalker','ranged','shield','assault'],spawns:[[-30,-30],[-10,-30],[-33,-14],[-6,-20],{x:20,z:20,feetY:1.5}],message:'一号泵运转，涨水时间缩短。前往东侧基座启动二号泵并守住它。',radio:'泵在基座顶端，基座四面都是台阶，站上去就在水面之上。潜行者会趁涨水从水里贴近，听脚步、看涟漪。'},
 {id:'dc-pump-2',title:'守住二号排水泵',short:'二号泵 / 基座',x:20,z:-20,feetY:1.5,facing:0,duration:2,count:4,level:4,action:'启动排水泵',roles:['shield','stalker','ranged','assault'],spawns:[[30,-30],[10,-30],[33,-14],[6,-20]],defenseDuration:20,defenseRadius:6,defenseCount:3,defenseLabel:'二号泵站',defenseSpawns:[[30,-30],[6,-28],[33,-16]],defenseRoles:['stalker','artilleryMech','ranged'],defenseWaves:[{at:10,count:2,spawns:[[10,-30],[32,-14]],roles:['stalker','stalker'],message:'第二批到场 // 潜行者从水中包抄'}],message:'两台泵全部运转。水冷主机 ABYSS 已被唤醒，前往中央机房。',radio:'守住基座顶二十秒。护盾兵正面挡子弹，让它爬台阶时从侧后方打；泵启动后涨水只剩七秒。'},
 {id:'abyss',title:'击破水冷主机 ABYSS',short:'ABYSS 水冷主机',x:0,z:-12,feetY:0,duration:0,count:3,level:5,boss:true,roles:['shield','stalker','ranged'],spawns:[[-12,-4],[12,-4],[0,4]],message:'ABYSS 已停机，水位归零。返回南侧进气闸撤离。',radio:'ABYSS 只有在排水后才露出青色核心。涨水时它放电：预警时离开水面，站到基座或机柜顶上。涨水期间它会从水里唤出潜行者。'},
 {id:'extract',title:'返回进气闸撤离',short:'进气闸',x:0,z:32,feetY:0,duration:3,count:4,level:4,action:'确认撤离',roles:['assault','ranged','shield','stalker'],spawns:[[-12,24],[12,24],[-14,10],[14,10]],message:'撤离确认。沉没数据中心行动完成。',radio:'主机停机后水泵持续排水，回到南侧进气闸确认撤离。'}
];
export const DATACENTER_SUPPLIES=[
 {id:'dc-med-south',type:'health',x:-26,z:26,feetY:0},{id:'dc-ammo-south',type:'ammo',x:26,z:26,feetY:0},
 {id:'dc-med-west',type:'health',x:-32,z:0,feetY:0},{id:'dc-ammo-east',type:'ammo',x:32,z:0,feetY:0},
 {id:'dc-med-plinth-w',type:'health',x:-20,z:20,feetY:1.5},{id:'dc-ammo-plinth-e',type:'ammo',x:20,z:20,feetY:1.5},
 {id:'dc-ammo-north',type:'ammo',x:-8,z:-30,feetY:0},{id:'dc-med-north',type:'health',x:8,z:-30,feetY:0}
];
export const DATACENTER_FLOORS=[v(0,0,76,76,-.3,0)];
export const DATACENTER_WALLS=[v(-38,0,.5,76,0,12),v(38,0,.5,76,0,12),v(0,-38,76,.5,0,12),v(0,38,76,.5,0,12)];
// Stepped plinths: six concentric tiers, climbable from every side, top 4 x 4 at 1.5 m (above WATER_HIGH).
export const PLINTH_CENTERS=[{x:-20,z:-20},{x:20,z:-20},{x:-20,z:20},{x:20,z:20}];
export const DATACENTER_PLINTHS=PLINTH_CENTERS.flatMap(p=>Array.from({length:6},(_,i)=>v(p.x,p.z,9-i,9-i,0,(i+1)*.25,{plinth:true,tier:i,walkStep:true})));
// Server racks: 2.4 m tall cover rows. Rack tops are jumpable from plinth tops (1.5 -> 2.4).
export const DATACENTER_RACKS=[
 v(-10,8,1.2,8,0,2.4,{rack:true}),v(10,8,1.2,8,0,2.4,{rack:true}),v(-10,-8,1.2,8,0,2.4,{rack:true}),v(10,-8,1.2,8,0,2.4,{rack:true}),
 v(-30,8,1.2,8,0,2.4,{rack:true}),v(30,8,1.2,8,0,2.4,{rack:true}),v(-30,-8,1.2,8,0,2.4,{rack:true}),v(30,-8,1.2,8,0,2.4,{rack:true}),
 v(0,-32,10,1.2,0,2.4,{rack:true}),v(-22,32,8,1.2,0,2.4,{rack:true}),v(22,32,8,1.2,0,2.4,{rack:true}),
 // Star route: plinth (-20,-20) top -> rack A -> rack B (star on top of B).
 v(-24.6,-20,1.2,6,0,2.4,{rack:true,starRoute:true}),v(-29,-14,1.2,6,0,2.4,{rack:true,starRoute:true})
];
export const DATACENTER_MAINFRAME=v(0,-12,6,6,0,5,{mainframe:true});
export const DATACENTER_STAR={x:-29,z:-13,feetY:2.4};
export const STALKER_POOLS=[{x:-12,z:-24},{x:12,z:-24},{x:-12,z:0},{x:12,z:0}];
export function datacenterObstacles(){return [...DATACENTER_FLOORS,...DATACENTER_WALLS,...DATACENTER_PLINTHS,...DATACENTER_RACKS,DATACENTER_MAINFRAME].map(o=>({...o}));}
