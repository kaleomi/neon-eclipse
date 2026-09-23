// P1.1 keeps the existing one-contact cap and damage rules. Only the sampling
// window changes: an empty early sample no longer spends the entire swing.
export const MELEE_STRIKE = Object.freeze({duration:.42,start:.28,end:.58,maxTargets:1});
export function overlapsMeleeStrike(before,after) {
  return Number.isFinite(before)&&Number.isFinite(after)&&before>after&&after>=0&&
    before>=MELEE_STRIKE.duration*(1-MELEE_STRIKE.end)&&after<=MELEE_STRIKE.duration*(1-MELEE_STRIKE.start);
}
export function createMeleeStrike() {
  let active=false;
  const hitSet=new Set();
  function begin(){hitSet.clear();active=true;}
  function cancel(){active=false;hitSet.clear();}
  function step(before,after,probe,{playing=true}={}) {
    if(!active||!playing||!Number.isFinite(before)||!Number.isFinite(after)||before<=after||after<0)return null;
    if(overlapsMeleeStrike(before,after)) {
      const impact=probe();
      if(impact) {
        const key=impact.object?.parent||impact.object;
        if(key&&!hitSet.has(key)) {
          hitSet.add(key);active=false;
          return {impact,miss:false};
        }
      }
    }
    if(after<=MELEE_STRIKE.duration*(1-MELEE_STRIKE.end)) {
      active=false;return {impact:null,miss:true};
    }
    return null;
  }
  return {begin,cancel,step,get active(){return active;}};
}
