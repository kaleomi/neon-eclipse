import {segmentBox} from './collision.js';
export const RECON=Object.freeze({holdSeconds:1.5,uploadSeconds:2,radius:90,maxBank:.5,maxVerticalSpeed:6,minSpeed:22,maxSpeed:50,headingTolerance:.65});
export const RECON_TARGETS=Object.freeze([
 {id:'north-relay',name:'北侧中继站',x:-300,y:45,z:-280,yaw:0,minHeight:30,maxHeight:60},
 {id:'sea-beacon',name:'近海信标',x:270,y:75,z:-180,yaw:Math.atan2(570,-100),minHeight:60,maxHeight:90},
 {id:'airfield-terminal',name:'机场南侧终端',x:-200,y:45,z:80,yaw:Math.atan2(-470,-260),minHeight:30,maxHeight:60}
].map(Object.freeze));
export const RECON_REASONS=Object.freeze({airborne:'需要在空中扫描',range:'进入目标 90 米范围',altitude:'调整至目标高度带',heading:'对正提示航向',bank:'机翼放平，减小滚转',speed:'保持 79–180 km/h',vertical:'减小升降率',blocked:'目标被实体遮挡',hold:'条件就绪 · 按住 F 扫描',ready:'扫描中 · 保持稳定'});
export function createRecon(){return {progress:0,reason:'range',records:[],uploadTime:0};}
export function reconCondition(p,g,boxes=[]){
 if(!p||!g||p.onGround||p.crashed||!['x','y','z','yaw','roll','speed','verticalSpeed'].every(k=>Number.isFinite(p[k])))return 'airborne';
 if(Math.hypot(p.x-g.x,p.z-g.z)>RECON.radius)return 'range';
 const altitude=p.y-1.3;if(altitude<g.minHeight||altitude>g.maxHeight)return 'altitude';
 if(Math.abs(Math.atan2(Math.sin(p.yaw-g.yaw),Math.cos(p.yaw-g.yaw)))>RECON.headingTolerance)return 'heading';
 if(Math.abs(p.roll)>RECON.maxBank)return 'bank';
 if(p.speed<RECON.minSpeed||p.speed>RECON.maxSpeed)return 'speed';
 if(Math.abs(p.verticalSpeed)>RECON.maxVerticalSpeed)return 'vertical';
 for(const b of boxes)if(segmentBox(p,{x:g.x,y:6,z:g.z},{x:b.minX,y:0,z:b.minZ},{x:b.maxX,y:b.h||8,z:b.maxZ})!==null)return 'blocked';
 return 'ready';
}
export function stepRecon(r,g,p,from,dt,{scan=false,boxes=[]}={}){
 if(!Number.isFinite(dt)||dt<=0||!g)return false;
 const condition=reconCondition(p,g,boxes),prior=reconCondition(from,g,boxes);
 r.reason=condition==='ready'&&!scan?'hold':condition;
 if(!scan||condition!=='ready'||prior!=='ready'){r.progress=0;return false;}
 r.progress=Math.min(RECON.holdSeconds,r.progress+Math.min(dt,.25));
 if(r.progress+1e-8<RECON.holdSeconds)return false;
 if(r.records.some(record=>record.id===g.id))return false;
 r.records.push(Object.freeze({id:g.id,name:g.name,height:+(p.y-1.3).toFixed(2),heading:+p.yaw.toFixed(4)}));r.progress=0;return true;
}
