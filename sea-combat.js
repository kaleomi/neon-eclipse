import {waterFree,clamp} from './maritime-rules.js';
import {forward} from './vehicle-rules.js';
export const SEA_GUN=Object.freeze({playerRange:180,playerSpeed:90,playerDamage:20,playerCooldown:1.6,enemyRange:145,enemyMinRange:25,enemySpeed:65,enemyDamage:8,enemyWindup:1.35,enemyCooldown:4.8,burstCount:3,burstGap:.18,maxProjectiles:24});
export function createSeaCombat(enabled=false){return {enabled,enemyHull:100,enemySunk:false,sunkTime:0,playerCooldown:0,enemyCooldown:4,warning:null,projectiles:[],effects:[],serial:0,playerFlash:0,enemyFlash:0,hitFlash:0,enemyHitFlash:0,shots:0,hits:0,enemyShots:0,enemyHits:0,blocked:0,provoked:false};}
export function clearSeaCombat(state){state.projectiles=[];state.effects=[];state.warning=null;state.playerFlash=0;state.enemyFlash=0;state.hitFlash=0;state.enemyHitFlash=0;}
function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
export function waterImpact(a,b){
 const count=Math.max(1,Math.ceil(dist(a,b)));
 for(let i=0;i<=count;i++)if(!waterFree(a.x+(b.x-a.x)*i/count,a.z+(b.z-a.z)*i/count,.3))return i/count;
 return null;
}
export function gunTargetStatus(player,enemy,state){if(state.enemySunk)return 'destroyed';const range=dist(player,enemy);if(range>SEA_GUN.playerRange)return 'range';if(range<12)return 'close';if(waterImpact(player,enemy)!==null)return 'blocked';return 'ready';}
// Analytic swept-circle contact in relative space; the hull is three moving circles, not an endpoint-only check.
function circleHit(a,b,r){const dx=b.x-a.x,dz=b.z-a.z,c=a.x*a.x+a.z*a.z-r*r;if(c<=0)return 0;const aa=dx*dx+dz*dz;if(aa<1e-12)return null;const bb=2*(a.x*dx+a.z*dz),dis=bb*bb-4*aa*c;if(dis<0)return null;const t=(-bb-Math.sqrt(dis))/(2*aa);return t>=0&&t<=1?t:null;}
export function sweptBoatHit(a,b,previous,current){
 const fa=forward(previous.yaw),fb=forward(current.yaw);let first=null;
 for(const offset of [-3.5,0,3.5]){const t=circleHit({x:a.x-previous.x-fa.x*offset,z:a.z-previous.z-fa.z*offset},{x:b.x-current.x-fb.x*offset,z:b.z-current.z-fb.z*offset},3);if(t!==null&&(first===null||t<first))first=t;}
 return first;
}
function splash(state,x,z,kind){state.effects.push({x,z,kind,life:.45});if(state.effects.length>16)state.effects.shift();}
function emit(state,owner,ship,target){
 if(state.projectiles.length>=SEA_GUN.maxProjectiles)return false;
 const length=dist(ship,target);if(length<1)return false;const dx=(target.x-ship.x)/length,dz=(target.z-ship.z)/length,speed=owner==='player'?SEA_GUN.playerSpeed:SEA_GUN.enemySpeed;
 state.projectiles.push({id:++state.serial,owner,x:ship.x+dx*5,z:ship.z+dz*5,vx:dx*speed,vz:dz*speed,life:3.2,travel:0});
 if(owner==='player'){state.shots++;state.playerFlash=.12;}else{state.enemyShots++;state.enemyFlash=.12;}return true;
}
function predict(ship,seconds){const f=forward(ship.yaw);return {x:ship.x+f.x*ship.speed*seconds,z:ship.z+f.z*ship.speed*seconds};}
export function stepSeaCombat(task,player,previousPlayer,previousEnemy,dt,{fire=false,paused=false,enemyMayStart=true,targets=null,aimPoint=null,playerOnly=false}={}){
 const s=task.combat;if(!s?.enabled||paused||task.status!=='active'||!Number.isFinite(dt)||dt<=0)return;
 const h=Math.min(dt,.25);if(!targets)s.provoked=false;
 for(const key of ['playerCooldown','enemyCooldown','playerFlash','enemyFlash','hitFlash','enemyHitFlash'])s[key]=Math.max(0,s[key]-h);
 s.effects=s.effects.filter(e=>(e.life-=h)>0);
 if(s.enemySunk&&!playerOnly){s.sunkTime+=h;return;}
 const survivors=[];
 for(const p of s.projectiles){
  const a={x:p.x,z:p.z},b={x:p.x+p.vx*h,z:p.z+p.vz*h},target=p.owner==='player'?task.enemy:player,previous=p.owner==='player'?previousEnemy:previousPlayer;
  let hit=null,hitTask=task;
  if(p.owner==='player'&&targets){for(const other of targets){if(other.task.combat.enemySunk||other.task.combat.enemyHull<=0)continue;const t=sweptBoatHit(a,b,other.previous,other.task.enemy);if(t!==null&&(hit===null||t<hit)){hit=t;hitTask=other.task;}}}else hit=sweptBoatHit(a,b,previous,target);
  const wall=waterImpact(a,b);
  if(wall!==null&&(hit===null||wall<=hit)){s.blocked++;splash(s,a.x+(b.x-a.x)*wall,a.z+(b.z-a.z)*wall,'water');continue;}
  if(hit!==null){
   if(p.owner==='player'){hitTask.combat.enemyHull=Math.max(0,hitTask.combat.enemyHull-SEA_GUN.playerDamage);s.hits++;hitTask.combat.enemyHitFlash=.25;hitTask.combat.provoked=true;}else{task.hull=Math.max(0,task.hull-(s.tuning?.enemyDamage??SEA_GUN.enemyDamage));s.enemyHits++;s.hitFlash=.25;}
   splash(s,a.x+(b.x-a.x)*hit,a.z+(b.z-a.z)*hit,'hit');continue;
  }
  p.x=b.x;p.z=b.z;p.life-=h;p.travel+=Math.hypot(p.vx,p.vz)*h;
  if(p.life>0&&p.travel<220)survivors.push(p);else splash(s,p.x,p.z,'water');
 }
 s.projectiles=survivors;
 if(s.enemyHull<=0&&!playerOnly){s.enemySunk=true;task.enemy.speed=0;s.warning=null;s.projectiles=[];splash(s,task.enemy.x,task.enemy.z,'sunk');return;}
 if(task.hull<=0){clearSeaCombat(s);return;}
 // Explicit aim is manual, including empty sea; omitted aim preserves legacy rule callers.
 const manual=aimPoint!==null,validAim=manual&&Number.isFinite(aimPoint?.x)&&Number.isFinite(aimPoint?.z)&&dist(player,aimPoint)>=1&&dist(player,aimPoint)<=SEA_GUN.playerRange+1e-6;
 if(fire&&s.playerCooldown===0&&(manual?validAim:!playerOnly&&gunTargetStatus(player,task.enemy,s)==='ready')){
  const target=manual?aimPoint:predict(task.enemy,clamp(dist(player,task.enemy)/SEA_GUN.playerSpeed,0,2));
  if(emit(s,'player',player,target))s.playerCooldown=SEA_GUN.playerCooldown;
 }
 if(playerOnly)return;
 const range=dist(player,task.enemy),canAttack=!task.escaped&&range>=SEA_GUN.enemyMinRange&&range<=SEA_GUN.enemyRange&&waterImpact(task.enemy,player)===null;
 if(s.warning){
  if(!canAttack){s.warning=null;s.enemyCooldown=Math.max(s.enemyCooldown,2);return;}
  const warning=s.warning;warning.remaining-=h;
  if(warning.remaining<=0){
   emit(s,'enemy',task.enemy,warning.target);warning.shotsLeft--;warning.remaining=SEA_GUN.burstGap;
   if(warning.shotsLeft<=0){s.warning=null;s.enemyCooldown=s.tuning?.cooldown??SEA_GUN.enemyCooldown;}else warning.phase='burst';
  }
 }else if(enemyMayStart&&canAttack&&s.enemyCooldown===0&&task.elapsed>=4){
  s.warning={target:predict(player,clamp((s.tuning?.windup??SEA_GUN.enemyWindup)+range/SEA_GUN.enemySpeed,0,2.8)),remaining:s.tuning?.windup??SEA_GUN.enemyWindup,shotsLeft:SEA_GUN.burstCount,phase:'aim'};
 }
}
