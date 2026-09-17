// Original U-02 station layout; all dimensions are in metres. No reactor geometry is reused.
export const STATION_ARENA={size:80,half:40,start:{x:-24,z:32},reactor:{x:0,z:0},covers:[],spawns:[],zones:[{name:'MAINTENANCE',x:-24,z:26},{name:'PLATFORM 02',x:-22,z:0},{name:'TRANSIT CAR',x:0,z:0},{name:'DISPATCH',x:22,z:-20},{name:'LAST TRAIN',x:-22,z:-28}]};
export const STATION_ENTRIES=[{x:-24,z:32},{x:-24,z:24.4},{x:-24,z:4.4},{x:0,z:-7.6},{x:22,z:-19.6}];
export const STATION_STAGES=[
 {id:'power',title:'恢复维护区供电',short:'配电柜',zone:'MAINTENANCE',x:-24,z:22,duration:2,count:0,level:1,action:'闭合供电回路',message:'供电恢复，站台隔离门已开启。',radio:'这里暂时安全。沿维修通道找到配电柜，恢复照明后，站台隔离门才能开启。'},
 {id:'platform',title:'清理站台并解锁车门',short:'站台门控',zone:'PLATFORM 02',x:-24,z:2,duration:1.5,count:5,level:2,action:'解锁停靠列车',roles:['ranged','assault','heavy','assault','ranged'],spawns:[[-24,-12],[-28,-4],[-14,-10],[-14,8],[-28,8]],message:'西侧车门已开启。进入停靠列车，穿到另一侧。',radio:'站台有远程守卫和重装。利用立柱换位，清场后解锁中间列车的西侧车门。'},
 {id:'carriage',title:'穿过车厢并释放东侧门锁',short:'车厢门锁',zone:'TRANSIT CAR',x:0,z:-10,duration:1.5,count:5,level:2,action:'释放东侧门锁',roles:['assault','assault','heavy','assault','ranged'],spawns:[[0,10],[3,4],[-3,-4],[3,-8],[0,-14]],message:'东侧门锁已释放。前往北侧调度室。',radio:'车厢内距离很近，喷子和近战适合这里。穿过座椅之间的通道，到北端释放东侧门锁。'},
 {id:'dispatch',title:'切换道岔并守住调度链路',short:'道岔控制台',zone:'DISPATCH',x:22,z:-22,duration:2,count:4,level:3,action:'启动道岔切换',defenseDuration:18,defenseRadius:10,defenseCount:3,defenseLabel:'道岔切换',roles:['heavy','ranged','assault','ranged'],spawns:[[18,-32],[28,-32],[28,-10],[20,4]],message:'道岔锁定，末班列车通道已开启。',radio:'先清理调度区。启动道岔后会有增援，在黄色十米范围内守住链路十八秒，期间可以移动射击。'},
 {id:'extract',title:'登上末班列车撤离',short:'末班列车',zone:'LAST TRAIN',x:-22,z:-28,duration:3,count:4,level:3,action:'确认登车撤离',roles:['assault','ranged','heavy','assault'],spawns:[[-6,-28],[-10,-34],[-22,-32],[-26,-24]],message:'已登上末班列车，运输站行动完成。',radio:'末班列车已就位。穿过西侧新开的闸门，清理追兵，到白色列车内的信标确认撤离。'}
];
export const STATION_SUPPLIES=[
 {id:'station-med-entry',type:'health',x:-28,z:30},{id:'station-ammo-platform',type:'ammo',x:-29,z:0},
 {id:'station-med-platform',type:'health',x:-29,z:-12},{id:'station-ammo-car',type:'ammo',x:3,z:-2},
 {id:'station-med-dispatch',type:'health',x:28,z:-4},{id:'station-ammo-dispatch',type:'ammo',x:26,z:-26},
 {id:'station-med-exit',type:'health',x:-10,z:-34},{id:'station-ammo-exit',type:'ammo',x:-25,z:-32}
];
// [width,height,depth,x,z] — shared by visuals, collision, and route tests.
export const STATION_WALLS=[
 [1,6,77,-32,0],[1,6,77,32,0],[65,6,1,0,-38],[65,6,1,0,38],
 [1,5,22,-16,27],[4,5,1,-30,16],[52,5,1,6,16],
 [24,5,1,-20,-18],[16,3.3,1,0,-18],
 [.6,3.3,14,-8,-11],[.6,3.3,12,-8,10],
 [.6,3.3,24,8,4],[.6,3.3,2,8,-17],
 [.8,5,6,8,-35],[.8,5,6,8,-21],
 [1,3.3,16,-30,-28],[1,3.3,4,-14,-34],[1,3.3,4,-14,-22],[16,3.3,.7,-22,-36],[16,3.3,.7,-22,-20]
];
export const STATION_COVER=[
 [2,3.8,2,-18,10],[2,3.8,2,-18,-4],[2,3.8,2,-28,-8],
 [3,1.1,1,-25,-14],[1,1,3,-11,10],
 [1,1.4,2,-6,-10],[1,1.4,2,6,10],[1,1.4,2,-6,4],[1,1.4,2,6,-4],
 [3,1.3,2,16,-4],[3,1.3,2,27,-16],[2,3.8,2,16,-26],
 [3,1.1,1,-3,-34]
];
export const STATION_GATES=[{w:8,d:.8,x:-24,z:16,openAt:1},{w:.8,d:8,x:-8,z:0,openAt:2},{w:.8,d:8,x:8,z:-12,openAt:3},{w:.8,d:8,x:8,z:-28,openAt:4}];
export function stationObstacles(stage=0){return [...STATION_WALLS,...STATION_COVER].map(([w,h,d,x,z])=>({w,h,d,x,z})).concat(STATION_GATES.filter(g=>stage<g.openAt).map(g=>({...g,h:3.3})));}
