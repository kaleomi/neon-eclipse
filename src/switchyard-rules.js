import {createBossFramework} from './boss-framework.js';
export const SWITCHYARD=Object.freeze({name:'SWITCHYARD 调度核心',hp:1200,window:6,defeat:.8,warning:4,travel:2.4,hold:.6,range:2.2,blastWarning:1.2,blastRadius:2.2});
export const SWITCHYARD_CORE=Object.freeze({x:22,y:1.9,z:-25});
export const SWITCHYARD_LANES=Object.freeze([-29,-32,-35]);
export const SWITCHYARD_SWITCHES=Object.freeze([-25,-29,-35].map((z,i)=>Object.freeze({id:i,x:30,y:1.15,z})));
export const SWITCHYARD_SOLIDS=Object.freeze([
 Object.freeze({x:22,z:-25,w:1.8,d:1.8,h:1}),
 ...SWITCHYARD_SWITCHES.map(p=>Object.freeze({x:p.x,z:p.z,w:.7,d:.65,h:1.05}))
]);
export function switchyardReady(mission,guardsClear){return mission.index===3&&mission.defending===true&&mission.progress>=18-1e-8&&guardsClear;}
export function trainPoint(lane,progress,diverted){
 const z=SWITCHYARD_LANES[lane],t=Math.max(0,Math.min(1,progress));
 if(!diverted)return {x:10+18.4*t,z};
 if(t<=.6)return {x:10+8*t/.6,z};
 const u=(t-.6)/.4;return {x:18+4*u,z:z+(SWITCHYARD_CORE.z-z)*u};
}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz,t=den?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/den)):0;return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
export function createSwitchyard({onEvent=()=>{}}={}){
 const boss=createBossFramework({maxHp:SWITCHYARD.hp,windowSeconds:SWITCHYARD.window,defeatSeconds:SWITCHYARD.defeat});
 const rail={};const blast={};
 function reset(active=false){boss.reset(active);Object.assign(rail,{lane:0,mode:'warning',timer:SWITCHYARD.warning,armed:false,hold:0,hit:false,passes:0});Object.assign(blast,{mode:'rest',timer:3.2,target:null});}
 function nextTrain(){rail.lane=(rail.lane+1)%3;rail.mode='warning';rail.timer=SWITCHYARD.warning;rail.armed=false;rail.hold=0;rail.hit=false;onEvent('train.warning');}
 function activate(){if(boss.state.phase!=='inactive')return false;reset(true);onEvent('started');return true;}
 function cancelInteraction(){rail.hold=0;}
 function interact(dt,{id=-1,held=false,allowed=false}={}){
  if(!boss.alive||boss.state.phase!=='shield'||rail.mode!=='warning'||rail.armed||id!==rail.lane||!held||!allowed||!Number.isFinite(dt)||dt<=0){cancelInteraction();return false;}
  rail.hold=Math.min(SWITCHYARD.hold,rail.hold+dt);
  if(rail.hold+1e-8<SWITCHYARD.hold)return false;
  rail.armed=true;rail.hold=0;onEvent('switch.armed');return true;
 }
 function hit(amount){const result=boss.hit(amount);if(result.killed){rail.mode='idle';cancelInteraction();blast.mode='rest';blast.target=null;onEvent('defeated');}return result;}
 function tick(dt,{player={x:0,z:0},feetY=0,playing=true,blastVisible=()=>true}={}){
  if(!playing){cancelInteraction();return 0;}
  if(!boss.blocking||!Number.isFinite(dt)||dt<=0||dt>60)return 0;
  let damage=0;
  // Small deterministic slices: no skipped warning or train tunnelling on a slow frame.
  for(let left=dt;left>1e-8&&boss.blocking;){
   const step=Math.min(.02,left);left-=step;
   if(boss.state.phase!=='shield'){
    const event=boss.tick(step);
    if(event==='closed'){nextTrain();blast.mode='rest';blast.timer=3.2;blast.target=null;onEvent('window.closed');}
    continue;
   }
   if(rail.mode==='warning'){
    rail.timer=Math.max(0,rail.timer-step);
    if(rail.timer<=1e-8){rail.mode='moving';rail.timer=SWITCHYARD.travel;rail.hold=0;onEvent('train.moving');}
   }else if(rail.mode==='moving'){
    const a=trainPoint(rail.lane,1-rail.timer/SWITCHYARD.travel,rail.armed);
    rail.timer=Math.max(0,rail.timer-step);
    const b=trainPoint(rail.lane,1-rail.timer/SWITCHYARD.travel,rail.armed);
    if(!rail.hit&&feetY<1.3&&segmentDistance(player,a,b)<1.05){rail.hit=true;damage+=24;}
    if(rail.timer<=1e-8){
     rail.passes++;
     if(rail.armed){boss.expose();rail.mode='idle';blast.mode='rest';blast.target=null;onEvent('window.opened');}
     else nextTrain();
    }
   }
   if(boss.state.phase!=='shield')continue;
   blast.timer-=step;
   if(blast.timer<=1e-8){
    if(blast.mode==='warning'){
     if(blast.target&&feetY<1&&Math.hypot(player.x-blast.target.x,player.z-blast.target.z)<SWITCHYARD.blastRadius&&blastVisible(blast.target,player))damage+=boss.state.tier===2?18:14;
     blast.mode='rest';blast.timer=boss.state.tier===2?3:4;blast.target=null;onEvent('blast.impact');
    }else if(player.x>=9&&player.x<=31&&player.z>=-37&&player.z<=-18){
     blast.mode='warning';blast.timer=SWITCHYARD.blastWarning;blast.target={x:player.x,z:player.z};onEvent('blast.warning');
    }else blast.timer=.5;
   }
  }
  return damage;
 }
 reset();return {activate,reset,hit,tick,interact,cancelInteraction,rail,blast,get state(){return boss.state;},get blocking(){return boss.blocking;},get alive(){return boss.alive;}};
}
