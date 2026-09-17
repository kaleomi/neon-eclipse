// Rendering-independent first-pass ground vehicle. Coordinates are metres, seconds, radians.
export const ROVER = Object.freeze({maxSpeed:29,reverseSpeed:9,acceleration:9,braking:19,wheelbase:2.9,radius:1.23,halfLength:1.25,maxSteer:.52});
export const TEST_SPAWN = Object.freeze({x:-105,z:105,yaw:0});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const forward=yaw=>({x:Math.sin(yaw),z:-Math.cos(yaw)});
export const right=yaw=>({x:Math.cos(yaw),z:Math.sin(yaw)});
export function terrainHeight(x,z){
  // A low undulating strip, not a rigid-body ramp or an airborne vehicle simulation.
  if(x<35||x>85||z< -65||z>65)return 0;
  const edge=Math.sin((x-35)/50*Math.PI)**2;
  return edge*(Math.sin((z+65)/130*Math.PI)**2)*(.65+.5*Math.sin(z*.22));
}
export class CollisionGrid {
  constructor(boxes=[],cellSize=24,bounds=180){
    this.cellSize=cellSize;this.bounds=bounds;this.cells=new Map();this.boxes=boxes;
    for(const box of boxes){
      for(let x=Math.floor(box.minX/cellSize);x<=Math.floor(box.maxX/cellSize);x++)
      for(let z=Math.floor(box.minZ/cellSize);z<=Math.floor(box.maxZ/cellSize);z++){
        const key=x+','+z;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(box);
      }
    }
  }
  query(x,z,radius){
    const found=new Set(),s=this.cellSize;
    for(let cx=Math.floor((x-radius)/s);cx<=Math.floor((x+radius)/s);cx++)
    for(let cz=Math.floor((z-radius)/s);cz<=Math.floor((z+radius)/s);cz++)
    for(const box of this.cells.get(cx+','+cz)||[])found.add(box);
    return found;
  }
  free(x,z,radius){
    if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)+radius>this.bounds||Math.abs(z)+radius>this.bounds)return false;
    for(const b of this.query(x,z,radius)){
      const dx=x-clamp(x,b.minX,b.maxX),dz=z-clamp(z,b.minZ,b.maxZ);
      if(dx*dx+dz*dz<radius*radius)return false;
    }
    return true;
  }
  clearSegment(a,b,radius=.4){
    const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.2));
    for(let i=0;i<=count;i++)if(!this.free(a.x+(b.x-a.x)*i/count,a.z+(b.z-a.z)*i/count,radius))return false;
    return true;
  }
}
export function roverFree(state,world){
  const f=forward(state.yaw);
  return [-ROVER.halfLength,0,ROVER.halfLength].every(d=>world.free(state.x+f.x*d,state.z+f.z*d,ROVER.radius));
}
export function createRover(spawn=TEST_SPAWN){return {...spawn,speed:0,steer:0,distance:0,impacts:0,impactCooldown:0};}
export function stepRover(state,input,dt,world){
  if(!Number.isFinite(dt)||dt<=0||input.paused)return;
  // Bounded substeps plus short displacement sweeps prevent tunnelling at top speed.
  const total=Math.min(dt,.25),count=Math.ceil(total/(1/120)),h=total/count;
  for(let i=0;i<count;i++){
    state.impactCooldown=Math.max(0,state.impactCooldown-h);
    const throttle=clamp(Number(input.throttle)||0,-1,1),steer=clamp(Number(input.steer)||0,-1,1);
    state.steer+=(steer-state.steer)*(1-Math.exp(-8*h));
    let acceleration=0;
    if(input.brake)acceleration=-Math.sign(state.speed)*ROVER.braking;
    else if(throttle){acceleration=throttle*(state.speed*throttle<-.1?ROVER.braking:ROVER.acceleration);}
    else acceleration=-Math.sign(state.speed)*(1.6+.014*state.speed*state.speed);
    const oldSpeed=state.speed;
    state.speed=clamp(state.speed+acceleration*h,-ROVER.reverseSpeed,ROVER.maxSpeed);
    if((input.brake||!throttle)&&oldSpeed*state.speed<0)state.speed=0;
    const f=forward(state.yaw),slope=(terrainHeight(state.x+f.x,state.z+f.z)-terrainHeight(state.x-f.x,state.z-f.z))/2;
    if(Math.abs(state.speed)>.05)state.speed=clamp(state.speed-slope*5*h,-ROVER.reverseSpeed,ROVER.maxSpeed);
    const angle=state.steer*ROVER.maxSteer/(1+Math.abs(state.speed)*.045);
    const targetYaw=state.yaw+state.speed/ROVER.wheelbase*Math.tan(angle)*h;
    const direction=forward((state.yaw+targetYaw)/2),dx=direction.x*state.speed*h,dz=direction.z*state.speed*h;
    const old={x:state.x,z:state.z,yaw:state.yaw};
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));let blocked=false;
    for(let j=1;j<=steps;j++){
      const candidate={x:old.x+dx*j/steps,z:old.z+dz*j/steps,yaw:old.yaw+(targetYaw-old.yaw)*j/steps};
      if(!roverFree(candidate,world)){blocked=true;break;}
      state.distance+=Math.hypot(candidate.x-state.x,candidate.z-state.z);Object.assign(state,candidate);
    }
    if(blocked){if(Math.abs(state.speed)>2&&state.impactCooldown===0){state.impacts++;state.impactCooldown=.7;}state.speed=0;}
    state.yaw=Math.atan2(Math.sin(state.yaw),Math.cos(state.yaw));
  }
}
export function canEnterRover(player,rover,world){return Math.hypot(player.x-rover.x,player.z-rover.z)<=4&&Math.abs(rover.speed)<1.2&&world.clearSegment(player,rover,.35);}
export function exitRover(rover,world){
  if(Math.abs(rover.speed)>=1.2)return {ok:false,reason:'请先刹停车辆，再下车。'};
  const f=forward(rover.yaw),r=right(rover.yaw);
  for(const [side,length] of [[-2.8,0],[2.8,0],[-2.8,-1.6],[2.8,-1.6],[0,-3.7]]){
    const p={x:rover.x+r.x*side+f.x*length,z:rover.z+r.z*side+f.z*length};
    if(world.free(p.x,p.z,.4)&&world.clearSegment(rover,p,.4))return {ok:true,...p};
  }
  return {ok:false,reason:'车门周围没有安全落脚点，请移动车辆。'};
}
export function walkPlayer(player,input,dt,world,rover){
  if(input.paused||!Number.isFinite(dt)||dt<=0)return;
  const f=forward(player.yaw),r=right(player.yaw),length=Math.hypot(input.forward||0,input.side||0)||1,speed=input.sprint?6.5:3.6;
  const dx=(f.x*(input.forward||0)+r.x*(input.side||0))/length*speed*Math.min(dt,.1),dz=(f.z*(input.forward||0)+r.z*(input.side||0))/length*speed*Math.min(dt,.1);
  const rf=forward(rover.yaw);
  const free=(x,z)=>world.free(x,z,.4)&&[-1.25,0,1.25].every(d=>Math.hypot(x-rover.x-rf.x*d,z-rover.z-rf.z*d)>ROVER.radius+.4);
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
  for(let i=0;i<count;i++){if(free(player.x+dx/count,player.z))player.x+=dx/count;if(free(player.x,player.z+dz/count))player.z+=dz/count;}
}
export const DRIVE_GATES=Object.freeze([
  {x:-105,z:65,yaw:0,name:'启动直道'}, {x:-105,z:-95,yaw:0,name:'北侧制动区'},
  {x:85,z:-105,yaw:Math.PI/2,name:'高速转向区'}, {x:105,z:70,yaw:Math.PI,name:'东侧直道'},
  {x:0,z:105,yaw:-Math.PI/2,name:'返航弯道'}, {x:-65,z:105,yaw:-Math.PI/2,name:'车库终点'}
]);
export function createDriveTrial(){return {index:0,elapsed:0,started:false,complete:false};}
export function stepDriveTrial(trial,from,to,dt,occupied){
  if(trial.complete)return false;
  if(trial.started)trial.elapsed+=Math.max(0,Math.min(Number(dt)||0,.25));
  if(!occupied)return false;
  const g=DRIVE_GATES[trial.index],dx=to.x-from.x,dz=to.z-from.z,len=dx*dx+dz*dz;
  const t=len?clamp(((g.x-from.x)*dx+(g.z-from.z)*dz)/len,0,1):0;
  if(Math.hypot(from.x+dx*t-g.x,from.z+dz*t-g.z)>8)return false;
  trial.started=true;trial.index++;if(trial.index===DRIVE_GATES.length)trial.complete=true;return true;
}
