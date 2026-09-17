// Drop transition/warp samples rather than applying them as camera rotation.
export function createLookInput(){
 let mode=null,last=null,drag=false;
 function reset(){mode=null;last=null;drag=false;}
 function begin(x,y){drag=true;last={x,y};mode='drag';}
 function end(){drag=false;last=null;}
 function sample(e,locked){
  const next=locked?'locked':'drag';
  if(mode!==next){mode=next;last=null;return null;}
  let x,y;
  if(locked){x=e.movementX;y=e.movementY;}
  else{
   if(!drag||!(e.buttons&1)){end();return null;}
   const point={x:e.clientX,y:e.clientY};
   if(!last){last=point;return null;}
   x=point.x-last.x;y=point.y-last.y;last=point;
  }
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>600||Math.abs(y)>600)return null;
  return {x,y};
 }
 return {reset,begin,end,sample};
}
