export function towerLiftPose(time){const t=((time%24)+24)%24;return t<3?{y:0,dock:'ground'}:t<9?{y:t-3,dock:null}:t<12?{y:6,dock:'upper'}:t<18?{y:18-t,dock:null}:{y:0,dock:'ground'};}
export function createTowerLift(volume){
 let time=0;const apply=p=>{volume.top=p.y;volume.h=p.y;volume.bottom=p.y-.25;};
 function reset(value=0){time=Number.isFinite(value)&&value>=0&&value<=86400?value:0;apply(towerLiftPose(time));}
 function tick(dt,player,motion,enemies=[]){
  if(dt<=0)return false;const old=towerLiftPose(time),next=towerLiftPose(time+dt),dy=next.y-old.y;
  const over=p=>Math.abs(p.x-volume.x)<volume.w/2+.4&&Math.abs(p.z-volume.z)<volume.d/2+.4;
  const riding=motion.state.grounded&&Math.abs(motion.state.y-old.y)<.01&&over(player);apply(next);
  const y=motion.state.y+(riding?dy:0);
  const blocked=enemies.some(e=>{const p=e.group.position;return over(p)&&p.y<volume.top-1e-5&&p.y+2.1>volume.bottom+1e-5;});
  if(blocked||(riding&&!motion.canOccupy(player.x,player.z,y))||(!riding&&over(player)&&y<volume.top-1e-5&&y+1.8>volume.bottom+1e-5)){apply(old);return false;}
  time+=dt;if(riding){motion.state.y=y;player.y=y+1.7;}return riding;
 }
 reset();return {reset,tick,get time(){return time;},get pose(){return towerLiftPose(time);}};
}
