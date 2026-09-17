// Harbor-only elite combat state. All time advances through the playing update.
export function stepHarborElite(enemy,dt,attackFinished=true){
 const s=enemy.eliteState||(enemy.eliteState={ventRemaining:0,ventQueued:false});
 if(dt<=0)return {opened:false,closed:false};
 const was=s.ventRemaining>0;s.ventRemaining=Math.max(0,s.ventRemaining-dt);let opened=false;
 if(s.ventQueued&&enemy.charge===0&&attackFinished){s.ventQueued=false;s.ventRemaining=2.4;opened=true;enemy.attack=Math.max(enemy.attack,s.ventRemaining+.25);}
 return {opened,closed:was&&s.ventRemaining===0};
}
export function queueHarborVent(enemy){const s=enemy.eliteState||(enemy.eliteState={ventRemaining:0,ventQueued:false});s.ventQueued=true;}
export function harborEliteDamage(enemy,zone,front){
 if(enemy.eliteState?.ventRemaining>0)return {multiplier:zone==='core'?2.5:1.35,armored:false,weak:true};
 return {multiplier:front?.35:1,armored:front,weak:false};
}
