import * as T from './node_modules/three/build/three.module.js';
import {TRAIN_CARS,TRAIN_FLOORS,TRAIN_STAIRS,TRAIN_BRIDGES,TRAIN_WALLS,TRAIN_COVER,TRAIN_GATES,TRAIN_STAR_PLATFORMS} from './train-data.js';
export function createTrainWorld(scene,renderer,obstacles){
 scene.background=new T.Color(0x18212e);scene.fog=new T.FogExp2(0x243345,.012);renderer.toneMappingExposure=1.15;scene.add(new T.AmbientLight(0xb5c5d7,.7));
 const steel=new T.MeshStandardMaterial({color:0x405d70,metalness:.6,roughness:.45}),dark=new T.MeshStandardMaterial({color:0x203242,roughness:.7}),roof=new T.MeshStandardMaterial({color:0x69808a,metalness:.5,roughness:.55}),gold=new T.MeshBasicMaterial({color:0xf2b76a}),cyan=new T.MeshBasicMaterial({color:0x78e6e3});
 const glass=new T.MeshStandardMaterial({color:0x7bc5d1,transparent:true,opacity:.22,roughness:.15,metalness:.15,depthWrite:false});
 const box=(o,mat,solid=false)=>{const m=new T.Mesh(new T.BoxGeometry(o.w,o.top-o.bottom,o.d),mat);m.position.set(o.x,(o.top+o.bottom)/2,o.z);scene.add(m);if(solid)obstacles.push({...o,mesh:m});return m;};
 for(const o of [...TRAIN_FLOORS,...TRAIN_STAIRS,...TRAIN_BRIDGES,...TRAIN_WALLS,...TRAIN_COVER,...TRAIN_STAR_PLATFORMS]){box(o,o.window?glass:TRAIN_WALLS.includes(o)?steel:TRAIN_COVER.includes(o)?dark:roof,true);if(o.walkStep||TRAIN_BRIDGES.includes(o)||o.hiddenArea)box({...o,w:o.w,d:.045,bottom:o.top,top:o.top+.035},gold);}
 for(const z of TRAIN_CARS){for(const x of [-5.17,5.17]){box({x,z,w:.04,d:11,bottom:2.2,top:2.32},gold);}
  for(const x of [-3.8,3.8])for(const dz of [-4,4]){const wheel=new T.Mesh(new T.CylinderGeometry(.65,.65,.35,12),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.6,z+dz);scene.add(wheel);}
  box({x:0,z,w:.09,d:10,bottom:4.05,top:4.1},cyan);
 }
 for(const [i,z] of TRAIN_CARS.entries()){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#132532';ctx.fillRect(0,0,512,96);ctx.fillStyle='#f2c785';ctx.font='bold 40px sans-serif';ctx.fillText('0'+(i+1)+' / '+['尾车','货舱','信号车','控制车','驾驶舱'][i],24,62);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(3,.56),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));sign.position.set(0,3.78,z+5.84);scene.add(sign);}
 const gates=TRAIN_GATES.map(o=>({def:o,mesh:box(o,gold),obstacle:{...o}}));for(const g of gates){g.obstacle.mesh=g.mesh;obstacles.push(g.obstacle);}
 for(const o of TRAIN_FLOORS.filter(o=>o.top===4.5))for(const sign of [-1,1])box({x:o.x+sign*(o.w/2-.12),z:o.z,w:.035,d:o.d-.2,bottom:4.5,top:4.52},gold);
 const facade=document.createElement('canvas');facade.width=128;facade.height=256;const fc=facade.getContext('2d');fc.fillStyle='#172b3b';fc.fillRect(0,0,128,256);for(let row=0;row<12;row++)for(let col=0;col<4;col++){fc.fillStyle=(row*3+col)%5<2?'#ae986b':'#324653';fc.fillRect(8+col*30,8+row*20,12,5);}const facadeMap=new T.CanvasTexture(facade);facadeMap.colorSpace=T.SRGBColorSpace;const facadeMat=new T.MeshBasicMaterial({map:facadeMap});
 const land=box({x:0,z:0,w:180,d:300,bottom:-.5,top:-.15},dark);const scenery=[];
 for(let i=0;i<36;i++){const x=(i%2?-1:1)*(20+(i*13%45)),z=-120+(i*29%240),height=7+i*7%27;const m=box({x,z,w:6+i%4,d:8,bottom:0,top:height},steel);const panel=new T.Mesh(new T.PlaneGeometry(8,height),facadeMat);panel.rotation.y=x>0?-Math.PI/2:Math.PI/2;panel.position.x=-Math.sign(x)*((6+i%4)/2+.015);m.add(panel);m.name='train-scenery';scenery.push({m,z});}
 const ties=[];for(let i=0;i<48;i++){const z=-100+i*4.5;ties.push({m:box({x:0,z,w:10,d:.3,bottom:-.12,top:0},roof),z});}
 for(const x of [-3.7,3.7])box({x,z:0,w:.13,d:260,bottom:0,top:.12},roof);
 const hint=document.createElement('div');hint.className='train-status';hint.style.cssText='position:fixed;top:114px;left:50%;transform:translateX(-50%);max-width:min(390px,calc(100vw - 32px));padding:10px 12px;background:#102434e8;border:1px solid #b18c55;color:#d4e8ee;font:12px/1.6 sans-serif;z-index:7;white-space:pre-line;pointer-events:none';document.body.append(hint);
 let time=0,stage=-1,feet=1.5;const bursts=[];
 function setStage(index){if(stage===index)return false;stage=index;for(const g of gates){const closed=index<g.def.openAt;g.mesh.visible=closed;const i=obstacles.indexOf(g.obstacle);if(closed&&i<0)obstacles.push(g.obstacle);if(!closed&&i>=0)obstacles.splice(i,1);}return true;}
 function update(dt){for(const a of scenery)a.m.position.z=((a.z+time*18+120)%240)-120;for(const a of ties)a.m.position.z=((a.z+time*18+108)%216)-108;hint.textContent='行驶 65 km/h · 当前高度 '+feet.toFixed(1)+' m\n车内 1.5 / 车顶 4.5 · 右侧窄桥可步行';for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.life-=dt;b.m.material.opacity=Math.max(0,b.life/.3);if(b.life<=0){scene.remove(b.m);b.m.geometry.dispose();b.m.material.dispose();bursts.splice(i,1);}}}
 function burst(position,color){const m=new T.Mesh(new T.IcosahedronGeometry(.12),new T.MeshBasicMaterial({color,transparent:true}));m.position.copy(position);scene.add(m);bursts.push({m,life:.3});}
 function clear(){for(const b of bursts){scene.remove(b.m);b.m.geometry.dispose();b.m.material.dispose();}bursts.length=0;}
 setStage(0);scene.updateMatrixWorld(true);return {ceilings:[],setStage,update,burst,clear,setBossActive:active=>{hint.hidden=active;},beforeMotion(dt,p,motion){time+=dt;feet=motion.state.y;},restoreMotion(s){time=s?.trainTime||0;},get trainTime(){return time;},setQuality:high=>{scene.fog.density=high?.012:.02;}};
}
