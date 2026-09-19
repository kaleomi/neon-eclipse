// Global simultaneous-attack budget shared by every telegraphed threat source:
// enemy projectiles (normal + sentry + swarm), artillery mortars and the arena Boss.
// Sources register a live counter; a source may start a new attack only while the total stays under `max`.
// The Boss is never denied (its telegraph is the fight) but its telegraph occupies a slot for everyone else,
// so with max=3 a Boss warning leaves two slots for regular attackers.
export const ATTACK_BUDGET=Object.freeze({max:3});
export function createAttackBudget({max=ATTACK_BUDGET.max}={}){
 if(!Number.isInteger(max)||max<=0)throw new TypeError('Invalid attack budget');
 const sources=new Map();
 function register(key,count){if(typeof key!=='string'||!key||typeof count!=='function')throw new TypeError('Invalid budget source');sources.set(key,count);return ()=>sources.delete(key);}
 function count(key){const c=sources.get(key);const n=c?Number(c()):0;return Number.isFinite(n)&&n>0?Math.floor(n):0;}
 function external(exclude){let n=0;for(const key of sources.keys())if(key!==exclude)n+=count(key);return n;}
 function total(){return external(null);}
 function allow(key,own=count(key)){return own+external(key)<max;}
 return {max,register,count,external,total,allow,get sources(){return [...sources.keys()];}};
}
