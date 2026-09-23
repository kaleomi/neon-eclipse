import {ELEVATOR,ELEVATOR_LEVELS} from './elevator-data.js';
// Collision-aware demand lift. Time/position is advanced only when the caller is playing.
export function createElevatorLift(volume){
 let y=0,target=0,blocked=false;
 const apply=height=>{volume.top=height;volume.h=height;volume.bottom=height-.25;};
 const over=(p,r=.4)=>Math.abs(p.x-volume.x)<volume.w/2+r-1e-6&&Math.abs(p.z-volume.z)<volume.d/2+r-1e-6;
 function reset(height=0){y=target=ELEVATOR_LEVELS.includes(height)?height:0;blocked=false;apply(y);}
 function request(height){if(!ELEVATOR_LEVELS.includes(height)||Math.abs(target-y)>1e-6||Math.abs(height-y)<1e-6)return false;target=height;blocked=false;return true;}
 function aboard(player,motion){return motion.state.grounded&&Math.abs(motion.state.y-y)<.02&&Math.abs(player.x-volume.x)<volume.w/2-.45&&Math.abs(player.z-volume.z)<volume.d/2-.45;}
 function tick(dt,player,motion,enemies=[]){
  if(!Number.isFinite(dt)||dt<=0||dt>10)return false;
  let carried=false;blocked=false;
  for(let left=dt;left>1e-8&&Math.abs(target-y)>1e-6;){
   const h=Math.min(.02,left);left-=h;
   const next=y+Math.sign(target-y)*Math.min(Math.abs(target-y),ELEVATOR.speed*h);
   const riding=motion.state.grounded&&Math.abs(motion.state.y-y)<.02&&over(player);
   const nextFeet=motion.state.y+(riding?next-y:0);apply(next);
   const crush=enemies.some(e=>{const p=e.group.position;return over(p,e.radius??.65)&&p.y<volume.top-1e-6&&p.y+2.1>volume.bottom+1e-6;});
   if(crush||(riding&&!motion.canOccupy(player.x,player.z,nextFeet))||(!riding&&over(player)&&nextFeet<volume.top-1e-6&&nextFeet+1.8>volume.bottom+1e-6)){
    apply(y);blocked=true;break;
   }
   if(riding){motion.state.y=nextFeet;player.y=nextFeet+1.7;carried=true;}y=next;
  }
  return carried;
 }
 reset();return {reset,request,tick,aboard,get y(){return y;},get target(){return target;},get moving(){return Math.abs(target-y)>1e-6;},get blocked(){return blocked;}};
}
