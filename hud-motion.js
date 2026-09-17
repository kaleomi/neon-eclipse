const clamp=(v,n)=>Math.max(-n,Math.min(n,v));
export function createHUDMotion(){
 let previous=null,x=0,y=0;
 return {step(dt,yaw,pitch,active=true,strength=1){
  if(!active||!Number.isFinite(yaw+pitch)||dt<=0){previous=null;x=y=0;return {x,y};}
  const d=previous?{x:Math.atan2(Math.sin(yaw-previous.yaw),Math.cos(yaw-previous.yaw)),y:pitch-previous.pitch}:{x:0,y:0};previous={yaw,pitch};
  const warp=Math.abs(d.x)>.4||Math.abs(d.y)>.4,rate=1-Math.exp(-Math.min(dt,.05)*14);
  x+=(warp? -x:clamp(-d.x/Math.max(dt,.001)*1.8,5)-x)*rate;
  y+=(warp? -y:clamp(d.y/Math.max(dt,.001)*1.4,3)-y)*rate;
  const gain=Number.isFinite(strength)?Math.max(0,Math.min(3,strength)):1;return {x:clamp(x,5)*gain,y:clamp(y,3)*gain};
 }};
}
