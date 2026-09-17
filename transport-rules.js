export const SERVICE_STAIRS=Array.from({length:12},(_,i)=>({x:20.25+i*.5,z:5,w:.5,d:2,bottom:0,top:(i+1)*.25,walkStep:true}));
export const SERVICE_DECKS=[{x:30,z:5,w:8,d:8,bottom:2.75,top:3},{x:32.5,z:16,w:3,d:4,bottom:2.75,top:3}];
export function transportPose(time){
 const t=((time%36)+36)%36;
 if(t<3)return {x:35,z:5,y:0,label:'地面停靠'};
 if(t<7)return {x:35,z:5,y:(t-3)*.75,label:'上升'};
 if(t<10)return {x:35,z:5,y:3,label:'高架停靠'};
 if(t<18)return {x:35,z:5+(t-10)*11/8,y:3,label:'驶向检修泊位'};
 if(t<21)return {x:35,z:16,y:3,label:'检修泊位停靠'};
 if(t<29)return {x:35,z:16-(t-21)*11/8,y:3,label:'返回高架'};
 if(t<33)return {x:35,z:5,y:3-(t-29)*.75,label:'下降'};
 return {x:35,z:5,y:0,label:'地面停靠'};
}
export function createTransport(volume){
 let time=0,tripCompleted=false,rideDistance=0;
 const assign=p=>Object.assign(volume,{x:p.x,z:p.z,top:p.y,bottom:p.y-.25});
 function reset(value=0,completed=false){tripCompleted=completed===true;rideDistance=0;time=Number.isFinite(value)&&value>=0&&value<=86400?value:0;assign(transportPose(time));}
 function tick(dt,player,motion){
  if(dt<=0)return false;
  const old=transportPose(time),next=transportPose(time+dt),dx=next.x-old.x,dz=next.z-old.z,dy=next.y-old.y;
  const overlap=(x,z)=>Math.abs(x-volume.x)<volume.w/2+.4&&Math.abs(z-volume.z)<volume.d/2+.4;
  const riding=motion.state.grounded&&Math.abs(motion.state.y-old.y)<.01&&overlap(player.x,player.z);
  assign(next);
  const x=player.x+(riding?dx:0),z=player.z+(riding?dz:0),y=motion.state.y+(riding?dy:0);
  if((riding&&!motion.canOccupy(x,z,y))||(!riding&&overlap(x,z)&&y<volume.top-1e-5&&y+1.8>volume.bottom+1e-5)){assign(old);return false;}
  time+=dt;
  if(riding){rideDistance+=Math.max(0,dz);if(rideDistance>=8&&next.z>=15.9&&Math.abs(next.y-3)<.01)tripCompleted=true;}else rideDistance=0;
  if(riding){player.x=x;player.z=z;motion.state.y=y;player.y=y+1.7;}
  return riding;
 }
 reset();return {reset,tick,get tripCompleted(){return tripCompleted;},get time(){return time;},get pose(){return transportPose(time);}};
}
