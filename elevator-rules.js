import {createBossFramework} from './boss-framework.js';
import {ELEVATOR,ELEVATOR_LEVELS,onElevatorPad} from './elevator-data.js';
export function elevatorReady(m,clear){return m.index===3&&m.defending===true&&m.progress>=18-1e-8&&clear;}
export function createElevatorBoss({onEvent=()=>{}}={}){
 const boss=createBossFramework({maxHp:ELEVATOR.hp,windowSeconds:ELEVATOR.window,defeatSeconds:ELEVATOR.defeat,tierThresholds:[2/3,1/3]});
 const arena={};const beam={};
 function reset(){boss.reset();Object.assign(arena,{index:0,unitHp:ELEVATOR.unitHp,mode:'dock',charge:0,latched:false});Object.assign(beam,{mode:'rest',timer:3,targetZ:null});}
 function quiet(){beam.mode='rest';beam.timer=3;beam.targetZ=null;arena.charge=0;}
 function activate(){if(boss.state.phase!=='inactive')return false;boss.reset(true);onEvent('started');return true;}
 function travel(){if(!boss.alive)return;boss.closeWindow();arena.mode='moving';quiet();onEvent('lift.moving');}
 function arrive(height){if(!boss.alive)return;arena.mode=Math.abs(height-ELEVATOR_LEVELS[arena.index])<1e-6?'dock':'boarding';quiet();onEvent('lift.docked');}
 function hit(amount,feetY){
  if(arena.mode!=='dock'||!Number.isFinite(feetY)||Math.abs(feetY-ELEVATOR_LEVELS[arena.index])>.6||!Number.isFinite(amount)||amount<=0)return {damage:0,killed:false,unitBroken:false};
  const result=boss.hit(Math.min(amount,arena.unitHp));arena.unitHp-=result.damage;let unitBroken=false;
  if(result.damage>0&&arena.unitHp<=1e-8){
   arena.unitHp=0;unitBroken=true;quiet();
   if(result.killed){onEvent('defeated');}
   else{boss.closeWindow();arena.index++;arena.unitHp=ELEVATOR.unitHp;arena.mode='boarding';arena.latched=false;onEvent('unit.broken');}
  }
  return {...result,unitBroken};
 }
 function tick(dt,{player={x:0,z:0},feetY=0,grounded=true,playing=true,visible=()=>true}={}){
  if(!playing){arena.charge=0;return 0;}
  if(!boss.blocking||!Number.isFinite(dt)||dt<=0||dt>60)return 0;
  let damage=0;
  for(let left=dt;left>1e-8&&boss.blocking;){
   const step=Math.min(.02,left);left-=step;const level=ELEVATOR_LEVELS[arena.index],onPad=onElevatorPad(player,feetY,grounded,level);
   if(!onPad){arena.latched=false;arena.charge=0;}
   if(boss.state.phase!=='shield'){
    const event=boss.tick(step);if(event==='closed'){quiet();onEvent('window.closed');}continue;
   }
   if(arena.mode!=='dock')continue;
   if(onPad&&!arena.latched){arena.charge+=step;if(arena.charge+1e-8>=ELEVATOR.padHold){arena.latched=true;arena.charge=0;boss.expose();quiet();onEvent('window.opened');continue;}}
   beam.timer-=step;
   if(beam.timer<=1e-8){
    if(beam.mode==='warning'){
     if(Math.abs(feetY-level)<.85&&player.x>=20.5&&player.x<=27&&Math.abs(player.z-beam.targetZ)<.6&&visible(player))damage+=[14,18,22][arena.index];
     beam.mode='rest';beam.timer=3;beam.targetZ=null;onEvent('beam.impact');
    }else if(Math.abs(feetY-level)<.7&&player.x>=20.5&&player.x<=27&&player.z>=-1&&player.z<=10.5){beam.mode='warning';beam.timer=ELEVATOR.warning;beam.targetZ=player.z;onEvent('beam.warning');}
    else beam.timer=.5;
   }
  }
  return damage;
 }
 reset();return {reset,activate,travel,arrive,hit,tick,arena,beam,get state(){return boss.state;},get blocking(){return boss.blocking;},get alive(){return boss.alive;},get floor(){return ELEVATOR_LEVELS[arena.index];}};
}
