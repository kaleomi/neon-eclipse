// Drop transition/warp/stale samples rather than applying them as camera rotation.
// This is a per-event guard; it deliberately does not change normal sensitivity.
export const MAX_LOOK_DELTA=160,MAX_LOOK_GAP_MS=250;
export function createLookInput(){
 let mode=null,last=null,drag=false,lastTime=null;
 function reset(){mode=null;last=null;drag=false;lastTime=null;}
 function begin(x,y){drag=true;last={x,y};mode='drag';lastTime=null;}
 function end(){drag=false;last=null;lastTime=null;}
 function transition(next){
  if(mode===next)return false;
  mode=next;last=null;lastTime=null;return true;
 }
 function stale(e){
  const time=Number(e.timeStamp);
  if(!Number.isFinite(time))return false;
  if(lastTime!==null){
   const gap=time-lastTime;lastTime=time;
   if(gap>MAX_LOOK_GAP_MS||gap<-1)return true;
  }else lastTime=time;
  return false;
 }
 function safeDelta(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>MAX_LOOK_DELTA||Math.abs(y)>MAX_LOOK_DELTA)return null;
  return {x,y};
 }
 function sample(e,locked){
  const next=locked?'locked':'drag';
  if(transition(next))return null;
  let x,y,point=null;
  if(locked){x=e.movementX;y=e.movementY;}
  else{
   if(!drag||!(e.buttons&1)){end();return null;}
   point={x:e.clientX,y:e.clientY};
   if(!Number.isFinite(point.x)||!Number.isFinite(point.y)){end();return null;}
   if(!last){last=point;stale(e);return null;}
   x=point.x-last.x;y=point.y-last.y;last=point;
  }
  if(stale(e)){if(point)last=point;return null;}
  return safeDelta(x,y);
 }
 return {reset,begin,end,sample};
}
