export function arcPhase(time){const t=(time%6+6)%6;return t<3?'safe':t<4.5?'warning':'live';}
export function createArcHazards(zones,{randomize=false,count=2,random=Math.random}={}){
 let time=0,cooldown=0,phase='safe',cycle=-1,active=[];
 function reset(){time=0;cooldown=0;phase='safe';cycle=-1;active=[];}
 function choose(){
  const ids=zones.map((_,i)=>i);
  if(!randomize){active=ids;return;}
  for(let i=ids.length-1;i>0;i--){const raw=random(),r=Number.isFinite(raw)?Math.max(0,Math.min(.999999,raw)):0,j=Math.floor(r*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  const next=ids.slice(0,Math.min(zones.length,Math.max(1,count)));
  if(next.length<ids.length&&next.length===active.length&&next.every(i=>active.includes(i)))next[0]=ids.find(i=>!active.includes(i));
  active=next;
 }
 function tick(dt,player,enabled){
  if(!enabled){reset();return null;}if(dt<=0||!Number.isFinite(dt))return null;
  time+=dt;cooldown=Math.max(0,cooldown-dt);phase=arcPhase(time);
  const nextCycle=Math.floor(time/6);if(cycle!==nextCycle){cycle=nextCycle;choose();}
  const zone=active.map(i=>zones[i]).find(z=>Math.abs(player.x-z.x)<=z.w/2&&Math.abs(player.z-z.z)<=z.d/2);
  if(phase==='live'&&zone&&(player.feetY??0)<.35&&cooldown<=0){cooldown=.6;return {damage:8,x:zone.x,z:zone.z};}return null;
 }
 return {reset,tick,get activeIndices(){return [...active];},get phase(){return phase;},get time(){return time;}};
}
