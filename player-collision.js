// Axis-separated AABB slide against the shared obstacle list. Extracted from app.js unchanged in behaviour.
export function createCollision(obstacles){
 const blocked=(x,z,r)=>obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);
 const move=(pos,dx,dz,r)=>{if(!blocked(pos.x+dx,pos.z,r))pos.x+=dx;if(!blocked(pos.x,pos.z+dz,r))pos.z+=dz;return pos;};
 return {blocked,move};
}
