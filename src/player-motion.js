// Upright player AABB with small integration steps; enemy movement remains unchanged.
export const PLAYER={radius:.4,height:1.8,eye:1.7,gravity:20,jumpSpeed:7.6};
export function createPlayerMotion(obstacles,ceilings=[],bounds={x:39.1,z:39.1},{gravityAt=null}={}){
 const state={y:0,velocity:0,grounded:true};const eps=1e-5;
 // Optional per-height gravity (chapter 07 bands). Without the hook behaviour is byte-for-byte the original.
 const gravity=()=>gravityAt?gravityAt(state.y):PLAYER.gravity;
 const overlap=(x,z,o)=>Math.abs(x-o.x)<o.w/2+PLAYER.radius-eps&&Math.abs(z-o.z)<o.d/2+PLAYER.radius-eps;
 const bottom=o=>o.bottom??0,top=o=>o.top??o.h;
 function volumes(){return obstacles.concat(ceilings);}
 function canOccupy(x,z,y){return Math.abs(x)<=bounds.x&&Math.abs(z)<=bounds.z&&!volumes().some(o=>overlap(x,z,o)&&y<top(o)-eps&&y+PLAYER.height>bottom(o)+eps);}
 function supported(p,y){return y<=eps||volumes().some(o=>overlap(p.x,p.z,o)&&Math.abs(y-top(o))<.003);}
 function reset(p,y=0){state.y=y;state.velocity=0;state.grounded=supported(p,y);p.y=y+PLAYER.eye;}
 function horizontal(p,x,z){
  if(canOccupy(x,z,state.y)){p.x=x;p.z=z;return;}
  if(!state.grounded)return;
  const steps=volumes().filter(o=>o.walkStep&&overlap(x,z,o)&&top(o)>state.y+eps&&top(o)-state.y<=.3+eps).sort((a,b)=>top(a)-top(b));
  for(const o of steps)if(canOccupy(x,z,top(o))){state.y=top(o);p.x=x;p.z=z;return;}
 }
 function step(dt,p,dx,dz,jump=false){
  if(dt<=0)return {jumped:false,landed:false};
  if(state.grounded&&!supported(p,state.y))state.grounded=false;
  const jumped=jump&&state.grounded;if(jumped){state.velocity=PLAYER.jumpSpeed;state.grounded=false;}
  let landed=false;const count=Math.max(1,Math.ceil(dt/.01),Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.1)),h=dt/count;
  for(let i=0;i<count;i++){
   horizontal(p,p.x+dx/count,p.z);
   horizontal(p,p.x,p.z+dz/count);
   if(state.grounded&&!supported(p,state.y))state.grounded=false;
   if(!state.grounded){
    const old=state.y;state.velocity-=gravity()*h;let next=old+state.velocity*h;
    if(state.velocity>0){for(const o of volumes())if(overlap(p.x,p.z,o)&&old+PLAYER.height<=bottom(o)+eps&&next+PLAYER.height>=bottom(o)){next=Math.min(next,bottom(o)-PLAYER.height);state.velocity=0;}}
    else{
     let floor=0;for(const o of volumes())if(overlap(p.x,p.z,o)&&old>=top(o)-eps&&next<=top(o)+eps)floor=Math.max(floor,top(o));
     if(next<=floor){next=floor;state.velocity=0;state.grounded=true;landed=true;}
    }
    state.y=Math.max(0,next);
   }
  }
  p.y=state.y+PLAYER.eye;return {jumped,landed};
 }
 return {state,reset,step,canOccupy};
}
