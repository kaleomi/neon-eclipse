export const ENGINEER=Object.freeze({warning:2.5,retry:3,initial:2,maxTurrets:1,playerClearance:4});
export function engineerSiteSafe(site,engineer,player,obstacles,enemies=[],protectedPoints=[]){
 if(!site||![site.x,site.y,site.z].every(Number.isFinite)||site.y!==0||Math.abs(site.x)>36||Math.abs(site.z)>36)return false;
 const origin=engineer.group.position,d=Math.hypot(site.x-origin.x,site.z-origin.z);
 if(Math.abs(origin.y)>.1||d<2||d>4||Math.hypot(site.x-player.x,site.z-player.z)<ENGINEER.playerClearance)return false;
 if(obstacles.some(o=>Math.abs(site.x-o.x)<o.w/2+.95&&Math.abs(site.z-o.z)<o.d/2+.95&&(o.bottom??0)<2&&(o.top??o.h??Infinity)>0))return false;
 if(enemies.some(e=>e.hp>0&&Math.hypot(site.x-e.group.position.x,site.z-e.group.position.z)<(e.radius||.65)+1.1))return false;
 return !protectedPoints.some(p=>Math.hypot(site.x-p.x,site.z-p.z)<2.5);
}
export function chooseEngineerSite(engineer,player,obstacles,enemies,protectedPoints=[],visible=()=>true){
 const origin=engineer.group.position;
 for(const radius of [2.5,3.5])for(let i=0;i<16;i++){const a=engineer.group.rotation.y+i*Math.PI/8,site={x:origin.x+Math.sin(a)*radius,y:0,z:origin.z+Math.cos(a)*radius};if(engineerSiteSafe(site,engineer,player,obstacles,enemies,protectedPoints)&&visible(site))return site;}
 return null;
}
