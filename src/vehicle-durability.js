// Vehicle wear for the proving ground: three readable tiers plus automatic berth repair.
// Pure rules, no rendering. Coordinates metres, seconds. Never writes storage.
// The sea chase keeps its own mission hull; callers skip this module while that task is active.
import {clamp} from './maritime-rules.js';
export const DURABILITY=Object.freeze({
 max:100,smokingBelow:60,disabledBelow:25,repairSeconds:5,repairStopSpeed:.6,
 smokingSpeedFactor:.8,limpSpeed:4,
 rover:Object.freeze({base:6,perSpeed:.9,min:8,max:30}),
 yacht:Object.freeze({base:8,perSpeed:.8,min:10,max:34})
});
// Repair berths. A vehicle parked inside its own berth for repairSeconds is fully restored.
export const REPAIR_STATIONS=Object.freeze({
 rover:Object.freeze({id:'garage',x:-105,z:105,radius:16,name:'车库维修位'}),
 yacht:Object.freeze({id:'marina',x:278,z:180,radius:14,name:'码头维修泊位'}),
 plane:Object.freeze({id:'hangar',x:-300,z:220,radius:18,name:'机库维修位'})
});
export const TIER_LABELS=Object.freeze({normal:'正常',smoking:'冒烟 · 操控 -20%',disabled:'失效 · 跛行回站'});
export function createDurability(kind='rover'){return {kind,hull:DURABILITY.max,lastImpacts:0,repair:0,repairs:0,damageTaken:0,lastDamage:0,repairing:false};}
export function durabilityTier(state){return state.hull<DURABILITY.disabledBelow?'disabled':state.hull<DURABILITY.smokingBelow?'smoking':'normal';}
export function impactDamage(kind,speed){const p=DURABILITY[kind]||DURABILITY.rover;return clamp(p.base+Math.abs(Number(speed)||0)*p.perSpeed,p.min,p.max);}
export function applyDamage(state,amount){const value=Math.max(0,Number(amount)||0);if(!value)return 0;const before=state.hull;state.hull=clamp(state.hull-value,0,DURABILITY.max);state.damageTaken+=before-state.hull;state.lastDamage=before-state.hull;state.repair=0;return before-state.hull;}
// Called once per physics step with the vehicle state after stepping and the speed it had before.
export function stepImpactDamage(state,vehicle,speedBefore){
 if(!vehicle||!Number.isFinite(vehicle.impacts))return 0;
 if(vehicle.impacts<=state.lastImpacts){state.lastImpacts=vehicle.impacts;return 0;}
 state.lastImpacts=vehicle.impacts;return applyDamage(state,impactDamage(state.kind,speedBefore));
}
// Driving limits by tier. Callers apply the returned input before stepping and the speed cap after.
export function limitInput(state,input={}){
 const tier=durabilityTier(state);if(tier==='normal')return {...input,tier};
 const throttle=clamp(Number(input.throttle)||0,-1,1);
 if(tier==='smoking')return {...input,tier,throttle:throttle*DURABILITY.smokingSpeedFactor,steer:(Number(input.steer)||0)*DURABILITY.smokingSpeedFactor};
 return {...input,tier,throttle:Math.max(0,throttle)*.5,steer:(Number(input.steer)||0)*.6};
}
export function speedCap(state,maxSpeed){const tier=durabilityTier(state);return tier==='normal'?maxSpeed:tier==='smoking'?maxSpeed*DURABILITY.smokingSpeedFactor:DURABILITY.limpSpeed;}
export function clampSpeed(state,vehicle,maxSpeed,reverseSpeed=maxSpeed){
 const cap=speedCap(state,maxSpeed),reverseCap=durabilityTier(state)==='disabled'?0:Math.min(reverseSpeed,cap);
 vehicle.speed=clamp(vehicle.speed,-reverseCap,cap)||0;return vehicle.speed;
}
export function inStation(vehicle,station){return !!station&&Math.hypot(vehicle.x-station.x,vehicle.z-station.z)<=station.radius;}
// Automatic repair: stopped inside the berth for repairSeconds. Moving or leaving resets progress.
export function stepRepair(state,vehicle,dt,station=REPAIR_STATIONS[state.kind],{paused=false}={}){
 if(paused||!Number.isFinite(dt)||dt<=0)return false;
 const parked=inStation(vehicle,station)&&Math.abs(Number(vehicle.speed)||0)<=DURABILITY.repairStopSpeed;
 if(!parked||state.hull>=DURABILITY.max){state.repair=0;state.repairing=false;return false;}
 state.repairing=true;state.repair+=Math.min(dt,.25);
 if(state.repair+1e-9<DURABILITY.repairSeconds)return false;
 state.hull=DURABILITY.max;state.repair=0;state.repairing=false;state.repairs++;return true;
}
export function durabilitySummary(state,station=REPAIR_STATIONS[state.kind]){
 const tier=durabilityTier(state);
 return {tier,label:TIER_LABELS[tier],hull:Math.ceil(state.hull),repairing:state.repairing,repairPercent:Math.min(100,Math.round(state.repair/DURABILITY.repairSeconds*100)),station};
}
