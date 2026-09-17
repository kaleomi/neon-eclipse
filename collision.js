// Segment intersections return the earliest normalized time [0,1], or null.
// Sweeps prevent fast projectiles crossing a wall/player between rendered frames.
export function segmentBox(a,b,min,max){
 let enter=0,exit=1;
 for(const key of ['x','y','z']){
  const d=b[key]-a[key];
  if(Math.abs(d)<1e-9){if(a[key]<min[key]||a[key]>max[key])return null;continue;}
  let t0=(min[key]-a[key])/d,t1=(max[key]-a[key])/d;
  if(t0>t1)[t0,t1]=[t1,t0];enter=Math.max(enter,t0);exit=Math.min(exit,t1);
  if(enter>exit)return null;
 }
 return enter;
}
export function segmentSphere(a,b,center,radius){
 const x=a.x-center.x,y=a.y-center.y,z=a.z-center.z;
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
 const c=x*x+y*y+z*z-radius*radius;
 if(c<=0)return 0;
 const aa=dx*dx+dy*dy+dz*dz;if(aa<1e-12)return null;
 const bb=x*dx+y*dy+z*dz,disc=bb*bb-aa*c;if(disc<0)return null;
 const t=(-bb-Math.sqrt(disc))/aa;return t>=0&&t<=1?t:null;
}
