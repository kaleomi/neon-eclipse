// Chapter-specific geometry, not a replacement for the existing train or harbor campaign data.
const solid=(x,z,w,d,bottom,top)=>({x,z,w,d,bottom,top,h:top});
export const SKYHOOK=Object.freeze({id:'skyhook',name:'SKYHOOK 追击直升机',hp:1600,units:2,unitHp:800,defense:16,operation:1.2,transition:2,window:6,
 floors:[4.5,1.5],core:{x:0,z:-16.3,height:1.25,front:1.7},
 controls:[{x:2.3,z:-10,feetY:4.5,label:'车顶牵引绞盘'},{x:-1.4,z:-12,feetY:1.5,label:'车内断路器'}],
 decks:[],bases:[solid(0,-16.3,1.5,1.4,4.5,5.15),solid(0,-16.3,1.5,1.4,1.5,2.15)],
 inArena:p=>Math.abs(p.x)<=5&&p.z>=-20&&p.z<=-8,
 objective:['车顶绞盘 · 拉低旋翼','返回车内 · 断路器'],damageLabel:'探照锁定 / 舱内脉冲'});
export const LEVIATHAN=Object.freeze({id:'leviathan',name:'LEVIATHAN 港务旗舰炮台',hp:1800,units:3,unitHp:600,defense:24,operation:2,transition:0,window:6,
 floors:[3,3,3],core:{x:18,z:-23,height:1.25,front:1.6},
 controls:[{x:-3,z:-18.5,feetY:3,label:'1号吊机'},{x:10,z:-19,feetY:3,label:'2号吊机'},{x:19,z:-26,feetY:3,label:'3号吊机'}],
 // The 1.2m gap between catwalks needs a jump; falling returns to the original west stairs.
 decks:[solid(1.7,-19,7.4,2.8,2.75,3),solid(12.3,-19,11.4,2.8,2.75,3),solid(17,-23,8,10,2.75,3)],
 bases:[solid(18,-23,3,3,3,3.65)],inArena:p=>p.x>=-12&&p.x<=23&&p.z>=-29&&p.z<=-12,
 objective:['1号吊机 · 吊箱破甲','2号吊机 · 吊箱破甲','3号吊机 · 吊箱破甲'],damageLabel:'炮台锁定轰击'});
export const siegeSolids=c=>[...c.decks,...c.controls.map(p=>solid(p.x,p.z,.55,.55,p.feetY,p.feetY+.8))];
