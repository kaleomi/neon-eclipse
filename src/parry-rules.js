// ARC BLADE defensive action. Simulation time only; never grants general invulnerability.
export const PARRY=Object.freeze({window:.25,cycle:.45,frontCos:.5});
export function canParryBolt({colorKey,boss,reflected,velocity},forward){
 if(colorKey!=='orange'||boss||reflected||!velocity||!forward)return false;
 const values=[velocity.x,velocity.y,velocity.z,forward.x,forward.y,forward.z];
 if(!values.every(Number.isFinite))return false;
 const v=Math.hypot(velocity.x,velocity.y,velocity.z),f=Math.hypot(forward.x,forward.y,forward.z);
 return v>1e-9&&f>1e-9&&-(velocity.x*forward.x+velocity.y*forward.y+velocity.z*forward.z)/(v*f)>=PARRY.frontCos-1e-9;
}
export function createParry(){
 let remaining=0,recovery=0,held=false,frameWindow=0,frameDt=0,feedback='',feedbackTime=0,poseEnabled=false;
 const note=(message,time=.7)=>{feedback=message;feedbackTime=time;};
 function press({ready=true}={}){
  if(held)return false;held=true;
  if(!ready||recovery>0){note('动作未就绪 · 松开右键后重试');return false;}
  poseEnabled=true;remaining=PARRY.window;recovery=PARRY.cycle;frameWindow=0;note('弹反窗口 · 仅正面普通橙弹',PARRY.window);return true;
 }
 function release(){held=false;}
 function cancel(){poseEnabled=false;remaining=0;frameWindow=0;held=false;feedback='';feedbackTime=0;}
 function reset(){cancel();recovery=0;frameDt=0;}
 function step(dt){
  if(!Number.isFinite(dt)||dt<0){frameWindow=0;return;}
  frameWindow=remaining;frameDt=dt;
  remaining=Math.max(0,remaining-dt);recovery=Math.max(0,recovery-dt);feedbackTime=Math.max(0,feedbackTime-dt);
 }
 function intercept(bolt,time,forward){
  if(!Number.isFinite(time)||time<0||time>1||frameWindow<=0||frameDt*time>=frameWindow)return false;
  if(!canParryBolt(bolt,forward)){note('未反射 · 仅限正面普通橙弹');return false;}
  note('反射成功 · 原路返回');return true;
 }
 return {press,release,cancel,reset,step,intercept,get busy(){return recovery>0;},get guard(){return poseEnabled?(remaining>0?1:Math.min(1,recovery/(PARRY.cycle-PARRY.window))):0;},get state(){return {remaining,recovery,held,feedback:feedbackTime>0?feedback:'',active:remaining>0};}};
}
