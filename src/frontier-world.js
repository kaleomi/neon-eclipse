// Rendering for expedition missions 6–8: wind turbines, control tower, offshore platform, radar station, hostiles (drones / turrets / dishes / mech)
// and the three extra helipads. Reads mission state only; pooled meshes, nothing allocated per frame.
import * as T from '../node_modules/three/build/three.module.js';
import {TURBINES,WIND_GATES,CONTROL_TOWER,FARM_HELIPAD,AIRFIELD_HELIPAD,PLATFORM,PLATFORM_HELIPAD,PLATFORM_CORE,PLATFORM_MOORING,PLATFORM_TURRETS,RADAR_STATION,RADAR_DISHES,MECH_SPAWN} from './frontier-site.js';
import {FRONTIER_POINTS,FRONTIER_SITES,hostileDamageFraction} from './frontier-missions.js';
const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.8,...extra});
function box(parent,w,h,d,x,y,z,m){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function pad(parent,p,label){const g=new T.Group();g.position.set(p.x,p.y+.03,p.z);const disc=new T.Mesh(new T.CylinderGeometry(p.r,p.r,.06,28),mat(0x2a3438));disc.receiveShadow=true;g.add(disc);const ring=new T.Mesh(new T.RingGeometry(p.r-.5,p.r,32),new T.MeshBasicMaterial({color:0xe6a7d6,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.05;g.add(ring);const white=new T.MeshBasicMaterial({color:0xf2e9f0});for(const [w,d,x] of [[.6,4,-1.3],[.6,4,1.3],[2.6,.6,0]]){const bar=new T.Mesh(new T.BoxGeometry(w,.02,d),white);bar.position.set(x,.06,0);g.add(bar);}const beacon=new T.Mesh(new T.SphereGeometry(.45,10,8),new T.MeshBasicMaterial({color:0x9df5e0}));beacon.position.y=1.2;beacon.visible=false;g.add(beacon);parent.add(g);return {group:g,beacon,label};}
export function buildFrontierWorld(scene){
 const root=new T.Group();scene.add(root);
 const steel=mat(0x9aa4a8,{metalness:.4,roughness:.5}),dark=mat(0x263238),deck=mat(0x4b5a60,{roughness:.9}),warn=mat(0xd9903b,{emissive:0x3b230a}),white=mat(0xe8ecee);
 // Wind turbines: tower + nacelle + three blades rotating slowly.
 const rotors=[];
 for(const t of TURBINES){const g=new T.Group();g.position.set(t.x,0,t.z);const tower=new T.Mesh(new T.CylinderGeometry(1.2,2,t.hub,12),white);tower.position.y=t.hub/2;tower.castShadow=true;g.add(tower);box(g,3.5,2.4,5,0,t.hub+1,-1,steel);const hub=new T.Group();hub.position.set(0,t.hub+1,-3.8);for(let i=0;i<3;i++){const blade=new T.Mesh(new T.BoxGeometry(.9,16,.25),white);blade.position.y=8;const arm=new T.Group();arm.rotation.z=i*Math.PI*2/3;arm.add(blade);hub.add(arm);}g.add(hub);rotors.push(hub);root.add(g);}
 // Wind gates: two orange posts each.
 for(const gate of WIND_GATES){for(const x of [-7,7])box(root,.5,7,.5,gate.x+x,3.5,gate.z,warn);}
 // Control tower + ramp.
 {const c=CONTROL_TOWER;box(root,c.half*2,c.h,c.half*2,c.x,c.h/2,c.z,dark);box(root,c.half*2+.6,.3,c.half*2+.6,c.x,c.h+.15,c.z,deck);for(const [dx,dz] of [[-1,0],[1,0],[0,1]])box(root,dx?.2:c.half*2,1.1,dz?.2:c.half*2,c.x+dx*c.half,c.h+.85,c.z+dz*c.half,steel);
  const rp=c.ramp,len=rp.maxZ-rp.minZ,ramp=new T.Mesh(new T.BoxGeometry(rp.maxX-rp.minX,.3,Math.hypot(len,c.h)),deck);ramp.position.set((rp.minX+rp.maxX)/2,c.h/2,(rp.minZ+rp.maxZ)/2);ramp.rotation.x=Math.atan2(c.h,len);ramp.receiveShadow=true;root.add(ramp);}
 // Offshore platform: deck on four legs, railing, core pedestal, mooring bollards.
 {const p=PLATFORM,w=p.maxX-p.minX,d=p.maxZ-p.minZ,cx=(p.minX+p.maxX)/2,cz=(p.minZ+p.maxZ)/2;box(root,w,.8,d,cx,p.h-.4,cz,deck);for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const leg=new T.Mesh(new T.CylinderGeometry(1.6,2,p.h,10),steel);leg.position.set(cx+sx*(w/2-4),p.h/2-.5,cz+sz*(d/2-4));root.add(leg);}
  for(const [dx,dz] of [[0,-1],[0,1],[1,0]])box(root,dx?.2:w,1,dz?.2:d,cx+dx*w/2,p.h+.5,cz+dz*d/2,steel);
  const core=new T.Mesh(new T.CylinderGeometry(1.4,1.8,3,12),warn);core.position.set(PLATFORM_CORE.x,p.h+1.5,PLATFORM_CORE.z);root.add(core);
  for(const z of [PLATFORM_MOORING.z-5,PLATFORM_MOORING.z+5])box(root,.6,1.2,.6,p.minX+.6,p.h+.6,z,dark);}
 // Radar station: fence posts on a square perimeter, gate arch, dish masts.
 {const r=RADAR_STATION,h=r.perimeter;for(let i=-h;i<=h;i+=10){for(const [x,z] of [[r.x+i,r.z-h],[r.x+i,r.z+h],[r.x-h,r.z+i],[r.x+h,r.z+i]])if(!(Math.abs(x-r.gate.x)<12&&Math.abs(z-r.gate.z)<3))box(root,.3,3,.3,x,1.5,z,steel);}
  box(root,14,.6,1,r.gate.x,6,r.gate.z,warn);for(const x of [-7,7])box(root,.6,6,.6,r.gate.x+x,3,r.gate.z,warn);}
 // Pads.
 const pads={farm:pad(root,FARM_HELIPAD,'farm'),airfield:pad(root,AIRFIELD_HELIPAD,'airfield'),platform:pad(root,PLATFORM_HELIPAD,'platform')};
 // Hostile pools.
 const droneMat=mat(0xff6b57,{emissive:0x5a1d10,metalness:.3}),turretMat=mat(0x6b7b83,{metalness:.5}),dishMat=mat(0xdde5e8,{metalness:.2}),mechMat=mat(0x3d4a52,{metalness:.6,roughness:.4}),hitMat=mat(0xffffff,{emissive:0xffffff,emissiveIntensity:1.2}),deadMat=mat(0x2d3a3f,{transparent:true,opacity:.35});
 const drones=Array.from({length:6},()=>{const m=new T.Mesh(new T.OctahedronGeometry(2,0),droneMat);m.visible=false;root.add(m);return m;});
 const turrets=PLATFORM_TURRETS.map(t=>{const g=new T.Group();g.position.set(t.x,PLATFORM.h,t.z);const base=new T.Mesh(new T.CylinderGeometry(1.7,1.9,1.4,12),turretMat);base.position.y=.7;g.add(base);const barrel=new T.Mesh(new T.BoxGeometry(.4,.4,3.2),turretMat);barrel.position.set(0,1.8,1.6);g.add(barrel);g.visible=false;root.add(g);return {g,base,barrel};});
 const dishes=RADAR_DISHES.map(d=>{const g=new T.Group();g.position.set(d.x,0,d.z);const mast=new T.Mesh(new T.CylinderGeometry(.6,.9,d.h,10),steel);mast.position.y=d.h/2;g.add(mast);const dish=new T.Mesh(new T.SphereGeometry(d.r,16,10,0,Math.PI*2,0,Math.PI/2),dishMat);dish.position.y=d.h+2;dish.rotation.x=Math.PI*.7;g.add(dish);root.add(g);return {g,dish,dishY:d.h+2};});
 const mech=new T.Group();{box(mech,4.4,3,5,0,4.5,0,mechMat);box(mech,2.2,1.6,2,0,6.6,.8,mechMat);for(const x of [-1.6,1.6]){box(mech,1.2,3.4,1.4,x,1.7,0,mechMat);box(mech,2,.8,2.6,x,.4,0,mechMat);}const gun=box(mech,1,1,5,1.4,5.2,3,turretMat);gun.name='gun';const eye=new T.Mesh(new T.SphereGeometry(.35,8,6),new T.MeshBasicMaterial({color:0xff3b2f}));eye.position.set(0,6.6,1.9);mech.add(eye);}mech.visible=false;root.add(mech);const mechParts=mech.children.filter(o=>o.isMesh&&o.geometry.type==='BoxGeometry');
 const mechFlash=new T.Mesh(new T.SphereGeometry(1,8,6),new T.MeshBasicMaterial({color:0xfff1b0,transparent:true,opacity:.8}));mechFlash.visible=false;root.add(mechFlash);
 // Effect pool: explosions (expanding orange sphere), collapse smoke (grey), mech footstep dust (small tan puff).
 const fxMats={explode:new T.MeshBasicMaterial({color:0xffa54a,transparent:true,opacity:.85}),collapse:new T.MeshBasicMaterial({color:0x6d7377,transparent:true,opacity:.6}),step:new T.MeshBasicMaterial({color:0xb9a98a,transparent:true,opacity:.5})};
 const fx=Array.from({length:24},()=>{const m=new T.Mesh(new T.SphereGeometry(1,10,8),fxMats.explode);m.visible=false;root.add(m);return m;});
 const scorch=new T.MeshBasicMaterial({color:0x1b1d1f});
 // Stage markers.
 const markerMat=new T.MeshBasicMaterial({color:0x9df5e0,transparent:true,opacity:.55,side:T.DoubleSide});const markers=new Map();
 for(const [mid,points] of Object.entries(FRONTIER_POINTS))for(const [stage,p] of Object.entries(points)){const ring=new T.Mesh(new T.TorusGeometry(stage==='fly'||stage==='escape'?9:4,.3,6,48),markerMat);ring.rotation.x=Math.PI/2;ring.position.set(p.x,p.y,p.z);ring.visible=false;root.add(ring);markers.set(mid+':'+stage,ring);}
 return {root,pads,update(m,time){
  for(const r of rotors)r.rotation.z=time*.9;
  for(const [key,ring] of markers)ring.visible=m.status==='active'&&key===m.id+':'+m.stage;
  for(const [key,p] of Object.entries(pads)){const active=m.status==='active'&&((m.id==='windfarm'&&((key==='farm'&&['heli','lift'].includes(m.stage))||(key==='airfield'&&['fly','touchdown'].includes(m.stage))))||(m.id==='platform'&&key==='platform'&&['fly','land'].includes(m.stage)));p.beacon.visible=active;if(active)p.beacon.position.y=1.2+Math.sin(time*4)*.4;}
  const list=m.status==='idle'?[]:m.hostiles;
  let di=0;for(const h of list){if(h.type!=='drone')continue;const mesh=drones[di++];if(!mesh)break;const y=h.alive?h.y:(h.wreckY??h.y);mesh.visible=h.alive||h.wreck<6;mesh.position.set(h.x,y,h.z);mesh.rotation.y=h.alive?time*2:h.wreck*5;mesh.rotation.x=h.alive?0:Math.min(1.2,h.wreck*2);mesh.scale.setScalar(h.alive?1:.7);mesh.material=h.alive?(h.flash>0?hitMat:droneMat):deadMat;}
  for(;di<drones.length;di++)drones[di].visible=false;
  turrets.forEach((t,i)=>{const h=list.find(h=>h.type==='turret'&&h.id==='turret-'+i);t.g.visible=!!h;if(h){t.base.material=t.barrel.material=h.alive?(h.flash>0?hitMat:turretMat):deadMat;const k=h.alive?0:Math.min(1,h.wreck/1.2);t.barrel.rotation.x=-.35*k;t.g.rotation.z=.18*k;t.base.material=h.alive?t.base.material:(k>=1?scorch:deadMat);}});
  dishes.forEach((d,i)=>{const h=list.find(h=>h.type==='dish'&&h.id==='dish-'+i);const dead=h&&!h.alive,k=dead?Math.min(1,h.wreck/1.6):0;d.dish.material=dead?deadMat:h&&h.flash>0?hitMat:dishMat;d.dish.rotation.y=dead?d.dish.rotation.y:time*.4;d.dish.rotation.z=1.3*k;d.dish.position.y=d.dishY-(d.dishY*.55)*k;});
  const b=m.mech;mech.visible=!!b&&m.status!=='idle';if(b){mech.position.set(b.x,0,b.z);mech.rotation.y=b.yaw||0;const dmg=hostileDamageFraction(b);mechMat.emissive.setRGB(dmg*.35,dmg*.08,0);for(const o of mechParts)o.material=!b.alive?deadMat:b.flash>0?hitMat:(o.name==='gun'?turretMat:mechMat);mech.rotation.z=b.alive?0:Math.min(.5,(b.wreck||0)*.4);mech.position.y=b.alive?0:-Math.min(1.6,(b.wreck||0)*1.2);mechFlash.visible=b.alive&&(b.flashTimer||0)>0;if(mechFlash.visible){mechFlash.position.set(b.x+Math.sin(b.yaw||0)*5.5+Math.cos(b.yaw||0)*1.4,5.2,b.z-Math.cos(b.yaw||0)*5.5+Math.sin(b.yaw||0)*1.4);}}
  const list2=m.status==='idle'?[]:(m.effects||[]);let fi=0;
  for(const e of list2){const mesh=fx[fi++];if(!mesh)break;const k=e.age/e.ttl;mesh.visible=true;mesh.material=fxMats[e.type];mesh.position.set(e.x,e.y+(e.type==='step'?.4:e.type==='collapse'?2+k*3:1+k*2),e.z);const r=e.type==='step'?.6+k*1.4:e.type==='collapse'?2+k*4:1.5+k*5;mesh.scale.setScalar(r);mesh.material.opacity=(1-k)*(e.type==='explode'?.85:e.type==='collapse'?.6:.5);}
  for(;fi<fx.length;fi++)fx[fi].visible=false;
 }};
}
export function drawFrontierOnRadar(ctx,co,m){
 if(m.status==='idle')return;
 for(const h of m.hostiles){if(!h.alive)continue;ctx.fillStyle=h.type==='mech'?'#ff3b2f':h.type==='turret'?'#ffb14a':'#ff6b57';ctx.beginPath();ctx.arc(co(h.x),co(h.z),h.type==='mech'?4:2.5,0,Math.PI*2);ctx.fill();}
}
export {FRONTIER_SITES};
