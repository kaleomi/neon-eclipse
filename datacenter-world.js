import * as T from './node_modules/three/build/three.module.js';
import {DATACENTER_FLOORS,DATACENTER_WALLS,DATACENTER_PLINTHS,DATACENTER_RACKS,DATACENTER_MAINFRAME,WATER_HIGH,waterLevel,waterPhase,waterPeriod,submerged,waterMoveScale,weaponShorted} from './datacenter-data.js';
// Chapter 08 world: a half-sunken server hall. Owns the tide clock; exposes level / phase for boss and app.
export function createDatacenterWorld(scene,renderer,obstacles){
 scene.background=new T.Color(0x04101a);scene.fog=new T.FogExp2(0x07202c,.016);renderer.toneMappingExposure=1.05;scene.add(new T.AmbientLight(0x8fc4d0,.6));
 const floorMat=new T.MeshStandardMaterial({color:0x2c3e4a,metalness:.35,roughness:.6}),wallMat=new T.MeshStandardMaterial({color:0x162430,metalness:.3,roughness:.7}),plinthMat=new T.MeshStandardMaterial({color:0x5a6b78,metalness:.5,roughness:.45}),rackMat=new T.MeshStandardMaterial({color:0x1d2b3a,metalness:.6,roughness:.4});
 const gold=new T.MeshBasicMaterial({color:0xffc06f}),cyan=new T.MeshBasicMaterial({color:0x6fe6ff}),red=new T.MeshBasicMaterial({color:0xff5a6a});
 function box(o,mat,solid=false){const m=new T.Mesh(new T.BoxGeometry(o.w,o.top-o.bottom,o.d),mat);m.position.set(o.x,(o.top+o.bottom)/2,o.z);scene.add(m);if(solid)obstacles.push({...o,mesh:m});return m;}
 for(const o of DATACENTER_FLOORS)box(o,floorMat,true);
 const grid=new T.GridHelper(76,38,0x1e4a55,0x0f2630);grid.position.y=.004;scene.add(grid);
 for(const o of DATACENTER_WALLS)box(o,wallMat,true);
 for(const o of DATACENTER_PLINTHS){box(o,plinthMat,true);if(o.tier===5)box({x:o.x,z:o.z,w:o.w,d:o.d,bottom:o.top,top:o.top+.02},gold).scale.set(.97,1,.97);}
 for(const o of DATACENTER_RACKS){box(o,rackMat,true);for(let y=.3;y<2.2;y+=.35)box({x:o.x,z:o.z,w:o.w>o.d?o.w:.06,d:o.w>o.d?.06:o.d,bottom:y,top:y+.05},Math.random()<.3?red:cyan).position[o.w>o.d?'z':'x']+=(o.w>o.d?o.d:o.w)/2+.01;if(o.starRoute)box({x:o.x,z:o.z,w:o.w,d:o.d,bottom:o.top,top:o.top+.02},gold);}
 box(DATACENTER_MAINFRAME,rackMat,true);
 // Water plane: rises and falls; opacity hints depth. Not an obstacle.
 const water=new T.Mesh(new T.PlaneGeometry(75,75),new T.MeshStandardMaterial({color:0x0f5a70,roughness:.15,metalness:.6,transparent:true,opacity:.62,depthWrite:false}));water.rotation.x=-Math.PI/2;water.position.y=.01;water.name='datacenter-water';scene.add(water);
 // Water-line marks on walls at HIGH.
 for(const [x,z,w,d] of [[-37.6,0,.2,74],[37.6,0,.2,74],[0,-37.6,74,.2],[0,37.6,74,.2]])box({x,z,w,d,bottom:WATER_HIGH-.03,top:WATER_HIGH+.03},cyan);
 const pumps=[{x:-20,z:-20},{x:20,z:-20}].map(p=>{const m=new T.Mesh(new T.CylinderGeometry(.5,.6,1.2,10),new T.MeshStandardMaterial({color:0x7a8a99,emissive:0x1e3a55,emissiveIntensity:.4}));m.position.set(p.x+1.4,2.1,p.z-1.4);scene.add(m);return m;});
 function sign(title,sub,x,y,z,width=7,rotation=0){const c=document.createElement('canvas');c.width=768;c.height=192;const g=c.getContext('2d');g.fillStyle='#071722';g.fillRect(0,0,768,192);g.fillStyle='#ffd48a';g.font='bold 48px sans-serif';g.fillText(title,24,78);g.fillStyle='#8fe0ff';g.font='26px sans-serif';g.fillText(sub,24,140);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map,side:T.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);}
 sign('08 / 沉没数据中心','SUNKEN DATA CENTER · 涨水周期',0,5,37.3,9,Math.PI);sign('一号排水泵','西侧基座顶 · 1.5m 高于水面',-20,4,-25,6);sign('二号排水泵','东侧基座顶 · 守住二十秒',20,4,-25,6);sign('水冷主机 ABYSS','排水后核心露出',0,6.2,-8.9,6);
 const notice=document.createElement('div');notice.className='hazard-notice water-notice';notice.hidden=true;document.body.append(notice);
 let time=0,pumpsOn=0,paused=false,stage=-1,bossActive=false;const effects=[];
 const level=()=>waterLevel(time,pumpsOn),phase=()=>waterPhase(time,pumpsOn);
 function setStage(index){if(stage===index)return false;stage=index;pumpsOn=index>=3?2:index>=2?1:0;pumps.forEach((m,i)=>{m.material.emissive.setHex(i<pumpsOn?0x3ad0ff:0x1e3a55);m.material.emissiveIntensity=i<pumpsOn?1.4:.4;});return false;}
 function burst(p,color){const m=new T.Mesh(new T.IcosahedronGeometry(.12),new T.MeshBasicMaterial({color,transparent:true}));m.position.copy(p);scene.add(m);effects.push({m,life:.3});}
 function clear(){for(const e of effects){scene.remove(e.m);e.m.geometry.dispose();e.m.material.dispose();}effects.length=0;time=0;notice.hidden=true;}
 function update(dt,t){if(!paused)time+=dt;const l=level();water.position.y=Math.max(.01,l);water.material.opacity=.35+l/WATER_HIGH*.35;water.visible=l>.005||true;water.material.color.setHex(phase()==='rising'?0x136a80:0x0f5a70);
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.m.material.opacity=Math.max(0,e.life/.3);if(e.life<=0){scene.remove(e.m);e.m.geometry.dispose();e.m.material.dispose();effects.splice(i,1);}}}
 // Water shows on the HUD, slows the player and shorts energy weapons; no direct damage (ABYSS handles that).
 function hazardDamage(dt,player){
  const l=level(),ph=phase(),inWater=submerged(player.feetY,l);notice.hidden=false;notice.dataset.phase=ph==='rising'?'warning':ph==='high'?'live':'rest';
  const labels={low:'低水位',rising:'涨水中',high:'高水位',draining:'排水中'};notice.textContent='水位 '+labels[ph]+' '+l.toFixed(2)+' m · 泵 '+pumpsOn+'/2 · 周期 '+waterPeriod(pumpsOn)+'s'+(inWater?' · 水中：移速 55%，能量武器短路':'');
  return null;
 }
 // Called from app.js before motion so the slow applies to this frame's step.
 function moveScale(feetY){return waterMoveScale(feetY,level());}
 function shorted(weaponIndex,feetY){return weaponShorted(weaponIndex,feetY,level());}
 scene.updateMatrixWorld(true);
 return {ceilings:[],setStage,update,burst,clear,hazardDamage,moveScale,shorted,get level(){return level();},get phase(){return phase();},get pumps(){return pumpsOn;},get time(){return time;},setBossActive:v=>{bossActive=v;},restoreMotion(s){time=Number.isFinite(s?.waterTime)?s.waterTime:0;},advance(seconds){if(Number.isFinite(seconds)&&seconds>0)time+=seconds;},setQuality:high=>{scene.fog.density=high?.016:.024;}};
}
