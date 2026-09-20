import {resolveMusicState} from './music-director.js';
import {createRecordedLoops} from './recorded-audio.js';
export const MUSIC_TRACKS=Object.freeze({explore:'music-explore',combat:'music-combat'});
// Two licensed orchestral excerpts; retain combat for eight quiet seconds to avoid rapid track changes.
export function createRecordedMusicDirector(bus){
 const loops=createRecordedLoops(bus,{busName:'music',fade:.7,settle:.9});
 let state='idle',running=false,combatHold=0;
 const isCombat=s=>['combat','boss','extract'].includes(s);
 function sync(){if(running)loops.update({[isCombat(state)?MUSIC_TRACKS.combat:MUSIC_TRACKS.explore]:{gain:state==='lost'?.18:isCombat(state)?.48:.34}});}
 function start(){running=true;void loops.bank.preload(Object.values(MUSIC_TRACKS));sync();return true;}
 function stop(){running=false;loops.reset();}
 function reset(){loops.reset();state='idle';combatHold=0;}
 return {start,stop,reset,get state(){return state;},get running(){return running;},stats:()=>({state,running,...loops.stats()}),
  setState(next){const changed=state!==next;state=next;sync();return changed;},
  update(dt,facts){
   let next=resolveMusicState(facts);
   if(isCombat(next))combatHold=8;
   else if(next==='explore'&&combatHold>0){combatHold=Math.max(0,combatHold-Math.max(0,dt));if(combatHold>0)next='combat';}
   else combatHold=0;
   const changed=state!==next;state=next;sync();return changed;
  }
 };
}
