const v=(x,z,w,d,bottom,top,extra={})=>({x,z,w,d,bottom,top,h:top,...extra});
export const TRAIN_CARS=[28,14,0,-14,-28];
export const TRAIN_ARENA={size:80,half:40,start:{x:0,z:32},reactor:{x:0,z:-28},covers:[],spawns:[],zones:TRAIN_CARS.map((z,i)=>({name:['REAR','CARGO','SIGNAL','CONTROL','ENGINE'][i],x:0,z}))};
export const TRAIN_ENTRIES=[{x:0,z:32,feetY:1.5},{x:0,z:30.4,feetY:1.5},{x:0,z:16.4,feetY:1.5},{x:0,z:2.4,feetY:4.5},{x:0,z:-11.6,feetY:1.5}];
const squad=(z,y)=>[[0,z-4,y],[2,z+4,y],[0,z+4,y],[2,z-4,y]];
export const TRAIN_STAGES=[
 {id:'train-rear',title:'夺取尾车门控',short:'尾车门控',x:2.3,z:28,feetY:1.5,facing:0,duration:2,count:3,level:3,action:'解锁尾车',spawns:[[0,24],[2,24],[0,25]],roles:['assault','ranged','heavy'],message:'货运车厢已解锁，沿中间连接桥向车头推进。',radio:'中枢塔追踪到这列高速货运列车。先夺取尾车门控。车内地板高 1.5 米，车顶高 4.5 米，注意车厢之间的空隙。'},
 {id:'train-cargo',title:'解除货舱安全锁',short:'货舱安全锁',x:2.3,z:14,feetY:1.5,facing:0,duration:2.5,count:4,level:3,action:'解除货舱封锁',spawns:squad(14,1.5),roles:['heavy','assault','ranged','assault'],message:'信号车解锁，登上车顶关闭干扰器。',radio:'清理货舱守卫，解除安全锁。尾车左侧楼梯通向车顶；跨车厢时可以跳跃，或沿右侧窄检修桥移动。'},
 {id:'train-signal',title:'关闭车顶干扰器',short:'车顶干扰器 / 4.5m',x:2.3,z:0,feetY:4.5,facing:0,duration:2.5,count:4,level:4,action:'关闭干扰器',spawns:squad(0,4.5),roles:['ranged','heavy','ranged','assault'],message:'干扰解除，前方控制车已开放。',radio:'干扰器在第三节车顶，必须到同一高度操作。车顶守卫火力密集，利用通风箱换位。第四节左侧也有楼梯，可以下到控制车内部。'},
 {id:'train-control',title:'接管链路并击破 SKYHOOK',short:'机车控制链路',x:2.3,z:-14,feetY:1.5,facing:0,duration:2,count:3,level:4,action:'接管控制链路',spawns:squad(-14,1.5),roles:['heavy','ranged','assault'],defenseDuration:16,defenseRadius:7,defenseCount:3,defenseLabel:'机车接管',defenseSpawns:[[0,0],[2,3],[0,5]],message:'SKYHOOK 已停机，进入最前方驾驶舱。',radio:'从左侧楼梯下到车内，守住十六秒接管链路。离开车厢楼层会暂停接管。完成并清敌后，返回控制车顶操作牵引绞盘，击破 SKYHOOK 旋翼；再下到车内用断路器暴露控制核，之后进入驾驶舱。'},
 {id:'extract',title:'抵达驾驶舱完成接应',short:'驾驶舱接应点',x:0,z:-30,feetY:1.5,facing:0,duration:3,count:4,level:4,action:'确认列车接应',spawns:squad(-28,1.5),roles:['assault','ranged','heavy','assault'],message:'列车控制权已移交，接应队伍登车。列车行动完成，驶向接应港区。',radio:'清理驾驶舱守卫，在前端确认接应。机车车顶外侧有独立的窄平台探索路线，不影响接应。'}
];
export const TRAIN_SUPPLIES=TRAIN_CARS.slice(0,4).flatMap((z,i)=>[{id:'train-med-'+i,type:'health',x:-3,z:z-4.5,feetY:i===2?4.5:1.5},{id:'train-ammo-'+i,type:'ammo',x:3,z:z+4.5,feetY:i===2?4.5:1.5}]);
export const TRAIN_STAIR_LINKS=[28,-14].map(z=>({base:{x:-3.5,z:z+4.5},end:{x:-3.5,z:z-4}}));
export const TRAIN_STAIRS=[28,-14].flatMap(z=>Array.from({length:12},(_,i)=>v(-3.5,z+2.75-i*.5,2,.5,1.5,1.5+(i+1)*.25,{walkStep:true})));
export const TRAIN_FLOORS=TRAIN_CARS.flatMap((z,i)=>[v(0,z,10,12,1.25,1.5),...(i===0||i===3?[v(1.5,z,7,12,4.25,4.5),v(-3.5,z-4.5,3,3,4.25,4.5)]:[v(0,z,10,12,4.25,4.5)])]);
export const TRAIN_BRIDGES=[21,7,-7,-21].flatMap(z=>[v(0,z,3.2,2,1.25,1.5),v(3.6,z,1.4,2,4.25,4.5)]);
export const TRAIN_WALLS=TRAIN_CARS.flatMap(z=>[...[-5,5].flatMap(x=>[v(x,z,.3,12,1.5,2.4),v(x,z,.3,12,3.6,4.25),...[-6,-2,2,6].map(dz=>v(x,z+dz,.3,.4,2.4,3.6)),...[-4,0,4].map(dz=>v(x,z+dz,.3,3.6,2.4,3.6,{window:true}))]),...[-6,6].flatMap(dz=>[-3.3,3.3].map(x=>v(x,z+dz,3.4,.25,1.5,4.25)))]);
export const TRAIN_COVER=TRAIN_CARS.flatMap(z=>[v(2.8,z-2,1.4,1.2,1.5,2.6),...(z===28||z===-14?[]:[v(-2.8,z+2,1.4,1.2,1.5,2.6)])]).concat([v(-1,1,1.5,1.2,4.5,5.7)]);
export const TRAIN_GATES=[21,7,-7,-21].map((z,i)=>v(0,z,3.2,.25,1.5,4.2,{openAt:i+1}));
export const TRAIN_STAR_PLATFORMS=[v(7,-25,1.1,1.1,1.25,5.3,{hiddenArea:true}),v(9.7,-27,1,1,1.25,6.1,{hiddenArea:true}),v(7.5,-30,1,1,1.25,6.9,{hiddenArea:true})];
export const TRAIN_STAR={x:7.5,z:-30,feetY:6.9};
export function trainObstacles(stage=0){return [...TRAIN_FLOORS,...TRAIN_STAIRS,...TRAIN_BRIDGES,...TRAIN_WALLS,...TRAIN_COVER,...TRAIN_STAR_PLATFORMS,...TRAIN_GATES.filter(g=>stage<g.openAt)].map(o=>({...o}));}
