import * as T from './node_modules/three/build/three.module.js';
import {ORBITAL_FLOORS,ORBITAL_SHAFT,ORBITAL_RINGS,ORBITAL_LANDING,ORBITAL_STAIRS,ORBITAL_WALLS,ORBITAL_COVER,ORBITAL_PADS,PAD_RADIUS,PAD_PERIOD,PAD_DAMAGE,ORBITAL_STAR_PLATFORMS,GRAVITY_BANDS,gravityBand,orbitalGravity,orbitalRecoilScale,padPhase,padHit} from './orbital-data.js';
// Chapter 07 world: compact base under the tether, three gravity bands, counterweight landing pads.
export function createOrbitalWorld(scene,renderer,obstacles){
 scene.background=new T.Color(0x05070f);scene.fog=new T.FogExp2(0x0a0f1d,.01);renderer.toneMappingExposure=1.1;scene.add(new T.AmbientLight(0x9fb4d8,.55));
 const plate=new T.MeshStandardMaterial({color:0x4a5668,metalness:.6,roughness:.4}),ring=new T.MeshStandardMaterial({color:0x5f6f86,metalness:.55,roughness:.45}),dark=new T.MeshStandardMaterial({color:0x1b2230,metalness:.4,roughness:.7}),step=new T.MeshStandardMaterial({color:0x76889d,metalness:.5,roughness:.5});
 const gold=new T.MeshBasicMaterial({color:0xffc06f}),cyan=new T.MeshBasicMaterial({color:0x7fe9ff}),amber=new T.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false});
 function box(o,mat,solid=false){const m=new T.Mesh(new T.BoxGeometry(o.w,o.top-o.bottom,o.d),mat);m.position.set(o.x,(o.top+o.bottom)/2,o.z);scene.add(m);if(solid)obstacles.push({...o,mesh:m});return m;}
 for(const o of ORBITAL_FLOORS)box(o,dark,true);
 const grid=new T.GridHelper(76,38,0x24405c,0x121c2c);grid.position.y=.004;scene.add(grid);
 box(ORBITAL_SHAFT,plate,true);
 for(const o of [...ORBITAL_RINGS,ORBITAL_LANDING]){box(o,ring,true);box({x:o.x,z:o.z,w:o.w,d:o.d,bottom:o.top-.005,top:o.top+.02},o.ring===2?cyan:gold).scale.set(.985,1,.985);}
 for(const o of ORBITAL_STAIRS){box(o,step,true);box({x:o.x,z:o.z,w:.045,d:o.d,bottom:o.top,top:o.top+.035},gold);}
 for(const o of ORBITAL_WALLS)box(o,dark,true);
 for(const o of ORBITAL_COVER){box(o,o.rail?plate:ring,true);if(o.cover)box({x:o.x,z:o.z,w:o.w+.05,d:o.d+.05,bottom:o.top-.1,top:o.top},cyan);}
 for(const o of ORBITAL_STAR_PLATFORMS){box(o,plate,true);box({x:o.x,z:o.z,w:o.w,d:.045,bottom:o.top,top:o.top+.035},gold);}
 // Tether cable: a glowing column from the shaft up into the fog.
 const cable=new T.Mesh(new T.CylinderGeometry(.35,.55,80,10),new T.MeshStandardMaterial({color:0x8fd8ff,emissive:0x2c7fb3,emissiveIntensity:1.4,metalness:.3,roughness:.4}));cable.position.set(0,50,0);scene.add(cable);
 for(let y=14;y<70;y+=8){const r=new T.Mesh(new T.TorusGeometry(1.1,.06,6,24),cyan);r.rotation.x=Math.PI/2;r.position.set(0,y,0);scene.add(r);}
 const glow=new T.PointLight(0x62c8ff,26,30);glow.position.set(0,12,0);scene.add(glow);
 // Band beacons on the walls: three colour bars mark the 0 / 4 / 9 m gravity bands.
 for(const [i,h] of [1.6,5.6,10.6].entries())for(const [x,z,w,d] of [[-37.6,0,.2,24],[37.6,0,.2,24],[0,-37.6,24,.2],[0,37.6,24,.2]])box({x,z,w,d,bottom:h-.08,top:h+.08},[gold,cyan,new T.MeshBasicMaterial({color:0xc9a7ff})][i]);
 const pads=ORBITAL_PADS.map(p=>{const m=new T.Mesh(new T.RingGeometry(PAD_RADIUS-.35,PAD_RADIUS,48),amber.clone());m.rotation.x=-Math.PI/2;m.position.set(p.x,.05,p.z);scene.add(m);const w=new T.Mesh(new T.BoxGeometry(1.6,1.6,1.6),new T.MeshStandardMaterial({color:0x7c8899,metalness:.6,roughness:.4}));w.position.set(p.x,40,p.z);scene.add(w);return {ring:m,weight:w};});
 function sign(title,sub,x,y,z,width=7,rotation=0){const c=document.createElement('canvas');c.width=768;c.height=192;const g=c.getContext('2d');g.fillStyle='#0c1424';g.fillRect(0,0,768,192);g.fillStyle='#ffd48a';g.font='bold 48px sans-serif';g.fillText(title,24,78);g.fillStyle='#9fe3ff';g.font='26px sans-serif';g.fillText(sub,24,140);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map,side:T.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);}
 sign('07 / 轨道电梯基座','ORBITAL TETHER BASE · 三段重力场',0,5,37.3,9,Math.PI);sign('一号环 / 4M · 0.65 G','西侧金色台阶登环',-24,3,-3,6,Math.PI/2);sign('二号环 / 9M · 0.4 G','南环东段台阶登顶',16,7.2,12.9,6,Math.PI);sign('配重着陆区','琥珀圈亮起时离开',0,3,-36.5,6);
 // HUD: current gravity band.
 const notice=document.createElement('div');notice.className='hazard-notice orbital-band';notice.hidden=true;document.body.append(notice);
 let time=0,padLast=new Map();const effects=[];
 function burst(p,color){const m=new T.Mesh(new T.IcosahedronGeometry(.12),new T.MeshBasicMaterial({color,transparent:true}));m.position.copy(p);scene.add(m);effects.push({m,life:.3});}
 function clear(){for(const e of effects){scene.remove(e.m);e.m.geometry.dispose();e.m.material.dispose();}effects.length=0;time=0;padLast.clear();notice.hidden=true;}
 function update(dt,t){time+=dt;
  pads.forEach((p,i)=>{const phase=padPhase(time,i);p.ring.material.color.setHex(phase==='live'?0xff4d6a:phase==='warning'?0xffb347:0x4d6a86);p.ring.material.opacity=phase==='rest'?.18:.6;const cycle=((time+i*PAD_PERIOD/pads.length)%PAD_PERIOD+PAD_PERIOD)%PAD_PERIOD;p.weight.position.y=phase==='live'?.8:phase==='warning'?40-cycle/2*39:40;});
  cable.material.emissiveIntensity=1.2+Math.sin(t*1.7)*.3;
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.m.material.opacity=Math.max(0,e.life/.3);if(e.life<=0){scene.remove(e.m);e.m.geometry.dispose();e.m.material.dispose();effects.splice(i,1);}}
 }
 // Called every frame by app.js with the player's feet height; also drives the band HUD.
 function hazardDamage(dt,player){
  const band=gravityBand(player.feetY);notice.hidden=false;notice.dataset.band=String(band);notice.textContent='重力 '+GRAVITY_BANDS[band].name+' · 后坐 ×'+GRAVITY_BANDS[band].recoil.toFixed(2);
  const hit=padHit(time,player,player.feetY);if(!hit)return null;
  const cycle=Math.floor((time+hit.index*PAD_PERIOD/pads.length)/PAD_PERIOD);if(padLast.get(hit.index)===cycle)return null;padLast.set(hit.index,cycle);
  return {damage:PAD_DAMAGE,x:hit.x,z:hit.z};
 }
 scene.updateMatrixWorld(true);
 return {ceilings:[],update,burst,clear,hazardDamage,gravityAt:orbitalGravity,recoilScale:orbitalRecoilScale,get time(){return time;},setQuality:high=>{scene.fog.density=high?.01:.016;glow.intensity=high?26:14;}};
}
