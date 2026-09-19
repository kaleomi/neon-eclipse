// H-01: isolated, assisted rotorcraft prototype. Metres / seconds / radians.
// No persistence, renderer, old vehicle rules, campaign state or global input dependencies.
export const HELICOPTER = Object.freeze({
  step:1/120, maxFrame:.1, gravity:9.81, lift:20, tilt:Math.PI/10, yawRate:1.05,
  climb:4, descent:3, landingDescent:1, landingVertical:1.65, landingHorizontal:2.4,
  landingTilt:Math.PI/15, radius:6.4, height:5.5
});
export const HELICOPTER_SITE = Object.freeze({
  bounds:110, ceiling:65,
  pads:Object.freeze([Object.freeze({id:'A',x:-22,z:32,radius:11}),Object.freeze({id:'B',x:28,z:-32,radius:11})]),
  obstacles:Object.freeze([
    Object.freeze({id:'hangar',minX:-84,maxX:-52,minZ:-16,maxZ:20,minY:0,maxY:15}),
    Object.freeze({id:'tower',minX:61,maxX:70,minZ:-4,maxZ:5,minY:0,maxY:34}),
    Object.freeze({id:'cargo',minX:-20,maxX:-9,minZ:-72,maxZ:-62,minY:0,maxY:3})
  ])
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const axis=n=>typeof n==='number'&&Number.isFinite(n)?clamp(n,-1,1):0;
const smooth=(a,b,k,h)=>a+(b-a)*(1-Math.exp(-k*h));
export const helicopterSpeed=s=>Math.hypot(s.vx,s.vz);
// Optional site.ground(x,z) gives a world ground height (default 0) so the same craft flies over the vehicle field's island / terrain.
export const siteGround=(site,x,z)=>typeof site?.ground==='function'?site.ground(x,z):0;
export function createHelicopter(spawn=null){
  const pad=spawn||HELICOPTER_SITE.pads[0];
  return {x:pad.x,y:pad.y||0,z:pad.z,vx:0,vy:0,vz:0,yaw:0,yawRate:0,pitch:0,roll:0,
    rpm:0,collective:0,rotorAngle:0,powered:false,grounded:true,status:'ready',reason:'',
    elapsed:0,distance:0,landings:0,remainder:0};
}
export function startHelicopter(s){if(s.status==='crashed')return false;s.powered=true;s.status='running';return true;}
function fail(s,reason){s.status='crashed';s.reason=reason;s.powered=false;s.vx=s.vy=s.vz=s.yawRate=0;s.remainder=0;}
function obstructed(s,site){
  const r=HELICOPTER.radius;
  if(Math.abs(s.x)+r>site.bounds||Math.abs(s.z)+r>site.bounds)return '越出试飞边界';
  if(s.y+HELICOPTER.height>site.ceiling)return '触及 '+site.ceiling+' m 安全空域上限';
  return site.obstacles.find(b=>s.x+r>b.minX&&s.x-r<b.maxX&&s.z+r>b.minZ&&s.z-r<b.maxZ&&
    s.y+HELICOPTER.height>b.minY&&s.y-helicopterSkidClearance(s)<b.maxY)?.id||null;
}
export function helicopterContact(s,site=HELICOPTER_SITE){return obstructed(s,site);}
export const helicopterSkidClearance=s=>1.4*Math.abs(Math.sin(s.roll))*Math.cos(s.pitch)+2.4*Math.abs(Math.sin(s.pitch));
function integrate(s,input,h,site){
  const wasGrounded=s.grounded,old={x:s.x,y:s.y,z:s.z};
  const forward=axis(input.forward),right=axis(input.right),turn=axis(input.yaw),lift=axis(input.lift),brake=input.brake===true;
  s.rpm=smooth(s.rpm,s.powered?1:0,1.4,h);
  let pitchTarget=forward*HELICOPTER.tilt,rollTarget=right*HELICOPTER.tilt;
  const c=Math.cos(s.yaw),n=Math.sin(s.yaw);
  if(brake){
    const vf=s.vx*n-s.vz*c,vr=s.vx*c+s.vz*n;
    pitchTarget=clamp(-vf*.065,-HELICOPTER.tilt,HELICOPTER.tilt);
    rollTarget=clamp(-vr*.065,-HELICOPTER.tilt,HELICOPTER.tilt);
  }
  s.pitch=smooth(s.pitch,wasGrounded?0:pitchTarget,5,h);
  s.roll=smooth(s.roll,wasGrounded?0:rollTarget,5,h);
  s.yawRate=smooth(s.yawRate,wasGrounded?0:turn*HELICOPTER.yawRate,5,h);
  s.yaw=Math.atan2(Math.sin(s.yaw+s.yawRate*h),Math.cos(s.yaw+s.yawRate*h));
  let verticalTarget=brake?0:lift*(lift>=0?HELICOPTER.climb:HELICOPTER.descent);
  // Beginner landing assist is a velocity target, not teleportation or a ground snap from the air.
  const groundBefore=siteGround(site,s.x,s.z);
  if(s.y-groundBefore<4&&verticalTarget<0)verticalTarget=Math.max(verticalTarget,-HELICOPTER.landingDescent);
  const up=Math.cos(s.pitch)*Math.cos(s.roll);
  const desired=(HELICOPTER.gravity+(verticalTarget-s.vy)*3.5)/(HELICOPTER.lift*Math.max(.01,s.rpm*s.rpm)*up);
  const collective=wasGrounded&&(lift<=0||brake)?0:clamp(desired,0,1);
  s.collective=smooth(s.collective,s.powered?collective:0,9,h);
  const thrust=HELICOPTER.lift*s.collective*s.rpm*s.rpm;
  const f=thrust*Math.sin(s.pitch)*Math.cos(s.roll),r=thrust*Math.sin(s.roll);
  const drag=brake?2.8:(Math.abs(forward)+Math.abs(right)<.01?1.55:.42);
  s.vx+=(f*Math.sin(s.yaw)+r*Math.cos(s.yaw)-s.vx*drag)*h;
  s.vz+=(-f*Math.cos(s.yaw)+r*Math.sin(s.yaw)-s.vz*drag)*h;
  s.vy+=(thrust*up-HELICOPTER.gravity-.12*s.vy)*h;
  s.x+=s.vx*h;s.z+=s.vz*h;s.y+=s.vy*h;
  const skidClearance=helicopterSkidClearance(s),ground=siteGround(site,s.x,s.z);
  if(s.y-ground<=skidClearance){
    const hard=!wasGrounded&&(s.vy< -HELICOPTER.landingVertical||helicopterSpeed(s)>HELICOPTER.landingHorizontal||
      Math.max(Math.abs(s.pitch),Math.abs(s.roll))>HELICOPTER.landingTilt);
    s.y=ground+skidClearance;s.grounded=true;
    if(hard){fail(s,'硬着陆：需先稳定姿态、降低水平与下降速度');return;}
    if(!wasGrounded){const bad=typeof site.forbidden==='function'?site.forbidden(s.x,s.z):null;if(bad){fail(s,bad);return;}s.landings++;}
    s.y=ground;s.vx=s.vy=s.vz=0;s.pitch=s.roll=s.yawRate=0;
  }else s.grounded=false;
  const contact=obstructed(s,site);
  if(contact){s.x=old.x;s.y=Math.max(siteGround(site,old.x,old.z),old.y);s.z=old.z;fail(s,['hangar','tower','cargo'].includes(contact)?'机体 / 旋翼安全包络碰撞：'+({hangar:'维修库',tower:'观察塔',cargo:'货箱'}[contact]):contact);return;}
  s.distance+=Math.hypot(s.x-old.x,s.y-old.y,s.z-old.z);
  s.rotorAngle=(s.rotorAngle+s.rpm*42*h)%(Math.PI*2);
}
// Fixed substeps keep the same input timeline consistent at 30/60/120/144 Hz.
// Excess wall time after a stall is deliberately discarded; pause never accumulates catch-up work.
export function stepHelicopter(s,input={},dt,site=HELICOPTER_SITE,onStep){
  if(s.status!=='running'||input?.paused===true||!Number.isFinite(dt)||dt<=0)return 0;
  input=input||{};s.remainder+=Math.min(dt,HELICOPTER.maxFrame);let advanced=0;
  while(s.remainder+1e-10>=HELICOPTER.step){
    s.remainder=Math.max(0,s.remainder-HELICOPTER.step);
    integrate(s,input,HELICOPTER.step,site);s.elapsed+=HELICOPTER.step;advanced+=HELICOPTER.step;
    onStep?.(s,HELICOPTER.step);
    if(s.status==='crashed')break;
  }
  return advanced;
}
