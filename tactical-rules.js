export const THROWABLES=Object.freeze(['emp','pulse','decoy','smoke']);
export const TACTICAL=Object.freeze({pulse:Object.freeze({name:'脉冲手雷',radius:6,duration:2,color:0xffd894}),decoy:Object.freeze({name:'诱饵信标',radius:16,duration:4,color:0x66f4de}),smoke:Object.freeze({name:'烟雾弹',radius:4,duration:5,color:0xa4bbcb})});
export const freshTactical=(count=2)=>({version:1,charges:{pulse:count,decoy:count,smoke:count}});
export function validTactical(v){return !!v&&!Array.isArray(v)&&v.version===1&&!!v.charges&&!Array.isArray(v.charges)&&Object.keys(TACTICAL).every(k=>Number.isInteger(v.charges[k])&&v.charges[k]>=0&&v.charges[k]<=2);}
export function validTacticalEnvelope(v){return v===undefined||validTactical(v)||!!v&&!Array.isArray(v)&&Number.isSafeInteger(v.version)&&v.version>1;}
export function segmentInSmoke(a,b,c,r=4){
 if(![a?.x,a?.y,a?.z,b?.x,b?.y,b?.z,c?.x,c?.y,c?.z,r].every(Number.isFinite)||r<=0)return false;
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=dx*dx+dy*dy+dz*dz,t=len?Math.max(0,Math.min(1,((c.x-a.x)*dx+(c.y-a.y)*dy+(c.z-a.z)*dz)/len)):0;
 return Math.hypot(a.x+dx*t-c.x,a.y+dy*t-c.y,a.z+dz*t-c.z)<=r;
}
export function tacticalFalloff(distance,radius=6,damage=70){return Number.isFinite(distance)&&distance>=0&&distance<radius?damage*(1-distance/radius):0;}
