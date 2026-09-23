export const OVERSEER_MAX_HP=1920;
export const OVERSEER_POSITION={x:0,z:-21};
export const OVERSEER_NODES=[{x:-9,z:-29},{x:9,z:-29}];
export function createOverseer(){
 const state={active:false,hp:OVERSEER_MAX_HP,nodes:[65,65],phase:'shield',tier:1,timer:0,attack:'rest',attackTime:2,aim:0,hit:false};
 function reset(active=false){Object.assign(state,{active,hp:OVERSEER_MAX_HP,nodes:[65,65],phase:'shield',tier:1,timer:0,attack:'rest',attackTime:2,aim:0,hit:false});}
 function damage(part,amount){
  if(!state.active||state.hp<=0||!Number.isFinite(amount)||amount<=0)return 0;
  if(part==='core'){
   if(state.phase!=='exposed')return 0;
   const dealt=Math.min(state.hp,amount);state.hp-=dealt;if(state.hp>0&&state.hp<=OVERSEER_MAX_HP/2)state.tier=2;
   if(state.hp===0){state.phase='dead';state.attack='rest';state.active=false;}return dealt;
  }
  if(!Number.isInteger(part)||part<0||part>1||state.nodes[part]<=0)return 0;
  const dealt=Math.min(state.nodes[part],amount);state.nodes[part]-=dealt;
  if(state.nodes.every(h=>h===0)){state.phase='exposed';state.timer=8;state.attack='rest';state.attackTime=2;}
  return dealt;
 }
 function tick(dt,player){
  if(!state.active||dt<=0||!Number.isFinite(dt))return 0;
  if(state.phase==='exposed'){
   state.timer=Math.max(0,state.timer-dt);
   if(state.timer===0){state.phase='shield';state.nodes=[65,65];state.attack='rest';state.attackTime=2;}return 0;
  }
  state.attackTime-=dt;
  if(state.attackTime<=0){
   if(state.attack==='rest'){state.attack='warning';state.attackTime=1.5;state.aim=Math.atan2(player.x-OVERSEER_POSITION.x,player.z-OVERSEER_POSITION.z);state.hit=false;}
   else if(state.attack==='warning'){state.attack='live';state.attackTime=.55;}
   else{state.attack='rest';state.attackTime=state.tier===2?1.4:2;}
  }
  const dx=player.x-OVERSEER_POSITION.x,dz=player.z-OVERSEER_POSITION.z;
  const angles=overseerAngles(state);
  const inside=angles.some(angle=>{const forward=dx*Math.sin(angle)+dz*Math.cos(angle),side=dx*Math.cos(angle)-dz*Math.sin(angle);return forward>=0&&forward<=34&&Math.abs(side)<1.4;});
  if(state.attack==='live'&&!state.hit&&inside&&(player.feetY??0)<.65&&!player.blocked){state.hit=true;return state.tier===2?22:18;}return 0;
 }
 return {state,reset,damage,tick,get blocking(){return state.active&&state.hp>0;}};
}

export function overseerAngles(state){return state.tier===2?[state.aim,state.aim+Math.PI/2,state.aim+Math.PI,state.aim-Math.PI/2]:[state.aim];}
