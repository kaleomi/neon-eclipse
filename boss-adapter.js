// One read-only view over the nine arena Boss rule modules (three shapes today):
//  - legacy state machines: overseer / tether / abyss (phase shield|exposed|dead, attack rest|warning|live)
//  - glacier (phase armored|sunk|climbing|dead, shell rest|warning)
//  - boss-framework based: switchyard (blast), elevator (beam), skyhook/leviathan (siege) (phase inactive|shield|exposed|defeated)
// The adapter never mutates arena mechanics; it only normalises status, hp, structural phase and the telegraph state,
// and owns the per-phase charge interrupt so world modules stop duplicating that wiring.
import {createBossChargeInterrupt} from './boss-charge-interrupt.js';
export const BOSS_KINDS=Object.freeze(['overseer','tether','abyss','glacier','blast','beam','siege']);
export function createBossAdapter(rules,kind,{name='',maxHp=null}={}){
 if(!rules||!rules.state||!BOSS_KINDS.includes(kind))throw new TypeError('Invalid boss adapter');
 const breaker=createBossChargeInterrupt(rules,kind);
 function telegraph(){
  const s=rules.state;
  if(kind==='glacier')return s.shell==='warning'?'warning':'rest';
  if(kind==='blast')return rules.blast?.mode||'rest';
  if(kind==='beam')return rules.beam?.mode||'rest';
  if(kind==='siege')return rules.attack?.mode||'rest';
  return s.attack||'rest';
 }
 function exposed(){const p=rules.state.phase;return kind==='glacier'?p==='sunk'||p==='climbing':p==='exposed';}
 function status(){
  const s=rules.state,p=s.phase;
  if(p==='dead'||p==='defeated')return 'defeated';
  if(!s.active)return 'inactive';
  return exposed()?'exposed':'shield';
 }
 const snapshot=()=>({name,kind,status:status(),hp:rules.state.hp,maxHp:maxHp??rules.state.maxHp??null,tier:rules.state.tier??1,phase:rules.arena?.index??rules.state.tier??1,telegraph:telegraph(),exposed:exposed(),alive:Boolean(rules.state.active&&rules.state.hp>0),blocking:Boolean(rules.blocking)});
 return {
  name,kind,rules,
  get status(){return status();},get telegraph(){return telegraph();},get exposed(){return exposed();},
  get threatening(){const t=telegraph();return t==='warning'||t==='live';},
  get alive(){return Boolean(rules.state.active&&rules.state.hp>0);},get blocking(){return Boolean(rules.blocking);},
  snapshot,interruptCharge:breaker.interrupt,resetInterrupt:breaker.reset,
 };
}
