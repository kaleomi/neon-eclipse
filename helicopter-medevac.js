// Helicopter medevac (plan B): unlocked when the supply run is complete. A casualty pod waits on the lighthouse
// island and must reach the shore medical zone before the clock runs out; swinging the load hurts the patient.
// Pure rules (no DOM/three). Reuses the sling cargo/zone state; the app calls stepMedevac right after stepSling.
import {SLING,SLING_ZONES,zoneAt,resetCargo,slingSummary} from './helicopter-sling.js';
import {LIGHTHOUSE_ISLAND} from './maritime-rules.js';
export const MEDEVAC=Object.freeze({
 cargo:Object.freeze({id:'casualty',kind:'casualty',x:LIGHTHOUSE_ISLAND.x+4,z:LIGHTHOUSE_ISLAND.z-10,name:'伤员吊舱'}),
 zone:'medical',timeLimit:90,health:100,
 swingSafe:2.5,       // m of load lag tolerated without harm
 swingDamage:6,       // hp per second per metre beyond swingSafe
 retryAfter:8,
 grades:Object.freeze([{id:'S',time:.5,health:.8},{id:'A',time:.25,health:.5},{id:'B',time:0,health:0}])
});
export function createMedevac(){return {status:'locked',timer:0,health:MEDEVAC.health,retry:0,failReason:null,grade:null,attempts:0,best:null};}
export function medevacZone(s){return s.zones.find(z=>z.id===MEDEVAC.zone)||null;}
export function startMedevac(m,s,groundAt=()=>0){
 m.status='active';m.timer=MEDEVAC.timeLimit;m.health=MEDEVAC.health;m.retry=0;m.failReason=null;m.grade=null;m.attempts++;
 resetCargo(s,MEDEVAC.cargo,groundAt);return 'start';
}
export function medevacGrade(m){
 const t=m.timer/MEDEVAC.timeLimit,h=m.health/MEDEVAC.health;
 return (MEDEVAC.grades.find(g=>t>=g.time&&h>=g.health)||MEDEVAC.grades[MEDEVAC.grades.length-1]).id;
}
function fail(m,reason){m.status='failed';m.failReason=reason;m.retry=MEDEVAC.retryAfter;return 'fail';}
// Feed the stepSling event each physics frame. Returns 'start' | 'fail' | 'complete' | 'retry' | null.
export function stepMedevac(m,s,h,ev,dt,groundAt=()=>0){
 if(!Number.isFinite(dt)||dt<=0)return null;
 if(m.status==='failed'){m.retry=Math.max(0,m.retry-dt);if(m.retry===0){startMedevac(m,s,groundAt);return 'retry';}return null;}
 if(m.status!=='active')return null;
 m.timer=Math.max(0,m.timer-dt);
 if(s.hooked){const over=slingSummary(s,h).swing-MEDEVAC.swingSafe;if(over>0)m.health=Math.max(0,m.health-over*MEDEVAC.swingDamage*dt);}
 if(m.health<=0)return fail(m,'casualty');
 if(ev==='delivered'){const z=zoneAt(s,s.cargo.x,s.cargo.z);if(z&&z.id===MEDEVAC.zone){m.status='done';m.grade=medevacGrade(m);if(!m.best||rank(m.grade)<rank(m.best))m.best=m.grade;return 'complete';}return fail(m,'wrongZone');}
 if(ev==='damaged')return fail(m,'damaged');
 if(ev==='dropped')return fail(m,'dropped');
 if(m.timer<=0)return fail(m,'timeout');
 return null;
}
const rank=g=>MEDEVAC.grades.findIndex(x=>x.id===g);
export function medevacSummary(m){return {status:m.status,timer:m.timer,health:m.health,grade:m.grade,failReason:m.failReason,retry:m.retry,attempts:m.attempts,best:m.best};}
const REASONS={casualty:'伤员伤势恶化',wrongZone:'投错区域',damaged:'吊舱摔坏',dropped:'落在医疗区外',timeout:'超时'};
export function medevacHint(m){
 if(m.status==='active')return '急救 · 剩余 '+Math.ceil(m.timer)+' s · 伤员 '+Math.round(m.health)+'% · 送往岸边医疗区，避免大幅摆动';
 if(m.status==='failed')return '急救失败：'+(REASONS[m.failReason]||m.failReason)+' · '+Math.ceil(m.retry)+' s 后重新开始';
 if(m.status==='done')return '急救完成 · 评级 '+m.grade+(m.best&&m.best!==m.grade?'（最佳 '+m.best+'）':'');
 return '';
}
