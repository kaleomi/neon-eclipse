import {createBossFramework} from './boss-framework.js';
export function siegeReady(config,m,clear){return m.index===3&&m.defending===true&&m.progress>=config.defense-1e-8&&clear;}
export function createSiegeBoss(config,{onEvent=()=>{}}={}){
 const boss=createBossFramework({maxHp:config.hp,windowSeconds:config.window,defeatSeconds:.8,tierThresholds:Array.from({length:config.units-1},(_,i)=>(config.units-i-1)/config.units)});
 const arena={},attack={};
 function quiet(){Object.assign(attack,{mode:'rest',timer:3,target:null});}
 function cancel(){arena.hold=0;}
 function reset(){boss.reset();Object.assign(arena,{index:0,unitHp:config.unitHp,mode:'ready',timer:0,hold:0});quiet();}
 function activate(){if(boss.state.phase!=='inactive')return false;boss.reset(true);onEvent('started');return true;}
 function interact(dt,{id=-1,allowed=false,held=false,playing=true}={}){
  if(!playing||!allowed||!held||id!==arena.index||!boss.alive||boss.state.phase!=='shield'||arena.mode!=='ready'||!Number.isFinite(dt)||dt<=0||dt>1){cancel();return false;}
  arena.hold+=dt;if(arena.hold+1e-8<.6)return false;
  cancel();quiet();arena.mode='operation';arena.timer=config.operation;onEvent('mechanic.started');return true;
 }
 function hit(amount,feetY){
  if(arena.mode!=='ready'||!Number.isFinite(feetY)||Math.abs(feetY-config.floors[arena.index])>.6||!Number.isFinite(amount)||amount<=0)return {damage:0,killed:false,unitBroken:false};
  const result=boss.hit(Math.min(amount,arena.unitHp));arena.unitHp-=result.damage;let unitBroken=false;
  if(result.damage>0&&arena.unitHp<=1e-8){unitBroken=true;cancel();quiet();
   if(result.killed)onEvent('defeated');
   else{boss.closeWindow();arena.index++;arena.unitHp=config.unitHp;arena.mode=config.transition?'transition':'ready';arena.timer=config.transition;onEvent('unit.broken');}
  }return {...result,unitBroken};
 }
 function tick(dt,{player={x:99,z:99},feetY=0,playing=true,visible=()=>true}={}){
  if(!playing){cancel();return 0;}if(!boss.blocking||!Number.isFinite(dt)||dt<=0||dt>60)return 0;let damage=0;
  for(let left=dt;left>1e-8&&boss.blocking;){const step=Math.min(.02,left);left-=step;
   if(boss.state.phase==='exposed'||boss.state.phase==='defeated'){const event=boss.tick(step);if(event==='closed'){quiet();onEvent('window.closed');}continue;}
   if(arena.mode!=='ready'){arena.timer=Math.max(0,arena.timer-step);if(arena.timer<=1e-8){const opened=arena.mode==='operation';arena.mode='ready';quiet();if(opened){boss.expose();onEvent('window.opened');}else onEvent('phase.ready');}continue;}
   attack.timer-=step;if(attack.timer>1e-8)continue;
   const level=config.floors[arena.index];
   if(attack.mode==='warning'){
    if(Math.abs(feetY-level)<.85&&Math.hypot(player.x-attack.target.x,player.z-attack.target.z)<1.7&&visible(player))damage+=20+arena.index*4;
    quiet();onEvent('attack.impact');
   }else if(Math.abs(feetY-level)<.7&&config.inArena(player)){attack.mode='warning';attack.timer=1.4;attack.target={x:player.x,z:player.z};onEvent('attack.warning');}
   else attack.timer=.5;
  }return damage;
 }
 reset();return {reset,activate,interact,cancel,hit,tick,arena,attack,get state(){return boss.state;},get floor(){return config.floors[arena.index];},get alive(){return boss.alive;},get blocking(){return boss.blocking;}};
}
