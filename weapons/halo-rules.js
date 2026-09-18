import halo from './halo.js';
export const HALO_MARK=Object.freeze({stacks:3,duration:6,multiplier:1.2});
export function registerHaloWeakHit(target){
 const old=target.haloMark,stacks=old?.remaining>0?old.stacks:0;
 target.haloMark={stacks:Math.min(HALO_MARK.stacks,stacks+1),remaining:stacks<2&&old?.remaining>0?old.remaining:HALO_MARK.duration};
 return stacks<3&&target.haloMark.stacks===3;
}
export function stepHaloMark(target,dt){if(!target.haloMark||!Number.isFinite(dt)||dt<=0)return;target.haloMark.remaining=Math.max(0,target.haloMark.remaining-dt);if(target.haloMark.remaining===0)delete target.haloMark;}
export function haloDamageMultiplier(target){return target.haloMark?.remaining>0&&target.haloMark.stacks>=3?HALO_MARK.multiplier:1;}
export function haloMarkText(target){const m=target.haloMark;return !m||m.remaining<=0?'':m.stacks<3?`HALO 标记 ${m.stacks}/3 · ${m.remaining.toFixed(1)}s`:`HALO 易伤 +20% · ${m.remaining.toFixed(1)}s`;}
// Captures ammunition count, not a target: every emitted round uses current aim and LOS.
// Pending rounds spend ammo only when emit succeeds. Pause is implemented by not ticking.
export function createHaloBurst(){
 let remaining=0,wait=0;
 function cancel(){remaining=0;wait=0;}
 return {get active(){return remaining>0;},get remaining(){return remaining;},begin(ammo){if(remaining||!Number.isInteger(ammo)||ammo<=0)return false;remaining=Math.min(halo.combat.burstSize,ammo);wait=0;return true;},tick(dt,emit){if(!Number.isFinite(dt)||dt<0)return 0;wait-=dt;let emitted=0;while(remaining>0&&wait<=1e-8){if(!emit()){cancel();break;}remaining--;emitted++;wait+=halo.combat.burstInterval;}if(!remaining)wait=0;return emitted;},cancel};
}
