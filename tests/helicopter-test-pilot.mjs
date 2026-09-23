// Test-only keyboard pilot. Reads telemetry and chooses keys; never edits craft or lesson state.
import {HELICOPTER_LESSONS} from '../src/helicopter-trial.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function helicopterPilotKeys(s,stage){
  const goal=HELICOPTER_LESSONS[stage];if(!goal)return [];
  if(stage===3&&s.y<5){
    if(Math.hypot(s.vx,s.vz)>.35||Math.max(Math.abs(s.pitch),Math.abs(s.roll))>.045)return ['Space'];
    return s.grounded?[]:['KeyC'];
  }
  const out=[],n=Math.sin(s.yaw),c=Math.cos(s.yaw),dx=goal.x-s.x,dz=goal.z-s.z;
  const ef=dx*n-dz*c,er=dx*c+dz*n,vf=s.vx*n-s.vz*c,vr=s.vx*c+s.vz*n;
  const af=clamp(ef*.6,-4.5,4.5)-vf,ar=clamp(er*.6,-4.5,4.5)-vr;
  if(af>.7)out.push('KeyW');if(af<-.7)out.push('KeyS');if(ar>.7)out.push('KeyD');if(ar<-.7)out.push('KeyA');
  const height=stage===0?9.5:goal.y,dy=height-s.y;
  if(dy>1.4)out.push('ShiftLeft');if(dy< -1.3)out.push('KeyC');
  return out;
}
export function helicopterInputs(keys){const held=k=>keys.includes(k);return {forward:Number(held('KeyW'))-Number(held('KeyS')),right:Number(held('KeyD'))-Number(held('KeyA')),lift:Number(held('ShiftLeft'))-Number(held('KeyC')),yaw:Number(held('KeyE'))-Number(held('KeyQ')),brake:held('Space')};}
