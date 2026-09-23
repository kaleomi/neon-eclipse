// Cancels one telegraphed attack per structural phase, never an already live hazard.
// Mechanical objectives, exposure windows, health and difficulty remain owned by each boss.
export function createBossChargeInterrupt(rules,kind){
 const used=new Set();
 function interrupt(){
  const s=rules.state;if(!rules.blocking||!s.active||s.hp<=0)return false;
  const phase=rules.arena?.index??s.tier,part=kind==='blast'?rules.blast:kind==='beam'?rules.beam:kind==='siege'?rules.attack:s;
  const mode=kind==='glacier'?'shell':['blast','beam','siege'].includes(kind)?'mode':'attack';
  if(!part||part[mode]!=='warning'||used.has(phase))return false;
  used.add(phase);part[mode]='rest';
  if(mode==='mode'){part.timer=kind==='blast'?(s.tier===2?3:4):3;if('target'in part)part.target=null;if('targetZ'in part)part.targetZ=null;}
  else if(kind==='glacier'){s.shellTime=s.tier===2?3:4;s.target=null;}
  else{s.attackTime=kind==='abyss'?(s.tier===2?2.5:6):(s.tier===2?1.4:2);if('bands'in s)s.bands=[];s.hit=true;}
  return true;
 }
 return {interrupt,reset:()=>used.clear()};
}
