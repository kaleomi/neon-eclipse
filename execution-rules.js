export const EXECUTION=Object.freeze({range:2.2,ratio:.15,contact:.3,duration:.6,protection:.3,heal:8,stagger:1,cooldown:.85});
const humans=new Set(['assault','ranged','shield','heavy','stalker','sniper','engineer','commander','harborElite']);
export function executionWounded(e){return !!e&&!e.boss&&humans.has(e.type)&&Number.isFinite(e.hp)&&Number.isFinite(e.maxHp)&&e.maxHp>0&&e.hp>0&&e.hp<e.maxHp*EXECUTION.ratio;}
export function executable(e){return executionWounded(e)&&Number.isFinite(e.staggerRemaining)&&e.staggerRemaining>0;}
// Only an actual health decrease into the wounded band arms one window per actor.
// Weak bookkeeping is transient; saves never carry an invulnerability/stagger token.
export function createExecutionStagger(onStagger=()=>{}){
 let previous=new WeakMap(),spent=new WeakSet();
 return {update(enemies,dt){if(!Number.isFinite(dt)||dt<0)return;for(const e of enemies){e.staggerRemaining=Math.max(0,(e.staggerRemaining||0)-dt);const hp=previous.get(e);if(Number.isFinite(hp)&&e.hp<hp&&executionWounded(e)&&!spent.has(e)){spent.add(e);e.staggerRemaining=EXECUTION.stagger;onStagger(e);}previous.set(e,e.hp);}},clear(enemies=[]){for(const e of enemies)delete e.staggerRemaining;previous=new WeakMap();spent=new WeakSet();}};
}
export function createExecution(){
 let target=null,time=0,contacted=false;
 return {begin(e){if(target||!executable(e))return false;target=e;time=0;contacted=false;e.staggerRemaining=Math.max(e.staggerRemaining,EXECUTION.duration+.01);return true;},cancel(){target=null;time=0;contacted=false;},step(dt,resolve,finish){if(!target||!Number.isFinite(dt)||dt<0)return;time+=dt;if(!contacted&&time>=EXECUTION.contact){contacted=true;if(executable(target)&&resolve()===target)finish(target);}if(time>=EXECUTION.duration)target=null;},get active(){return !!target;},get invulnerable(){return !!target&&time<EXECUTION.protection;},get phase(){return target?Math.min(1,time/EXECUTION.duration):0;}};
}
