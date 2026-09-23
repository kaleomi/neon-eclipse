// Rendering for the convoy escort: transport truck, hound drones, ground telegraph lines, route markers.
// Reads mission state only. Pooled hound meshes; nothing allocated per frame.
import * as T from '../node_modules/three/build/three.module.js';
import {terrainHeight} from './vehicle-rules.js';
import {ESCORT_ROUTE,HOUND,houndWarnings} from './escort-rules.js';
const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.7,...extra});
export function buildEscortWorld(scene,{maxHounds=12}={}){
 const group=new T.Group();group.visible=false;scene.add(group);
 // Truck
 const truck=new T.Group();group.add(truck);const paint=mat(0x6f8f93,{metalness:.3}),dark=mat(0x1b2a30),amber=mat(0xf0b860,{emissive:0x6a4410}),hitMat=mat(0xffffff,{emissive:0xffffff,emissiveIntensity:1.2});
 const part=(w,h,d,x,y,z,m=paint)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;truck.add(mesh);return mesh;};
 const cab=part(2.4,1.7,2.2,0,1.55,-2.2),cargo=part(2.5,2.3,4,0,1.85,1),chassis=part(2.2,.4,6.6,0,.6,0,dark);part(2.2,.3,.3,0,.85,-3.4,amber);
 for(const x of [-1.15,1.15])for(const z of [-2.2,.4,1.9]){const w=new T.Mesh(new T.CylinderGeometry(.55,.55,.4,14),dark);w.rotation.z=Math.PI/2;w.position.set(x,.55,z);truck.add(w);}
 const beacon=new T.Mesh(new T.SphereGeometry(.22,8,6),new T.MeshBasicMaterial({color:0xffb050}));beacon.position.set(0,3.15,1);truck.add(beacon);
 // Hounds
 const houndBody=mat(0xb44a3c,{emissive:0x4a1410,metalness:.4}),houndEye=new T.MeshBasicMaterial({color:0xff3b2f}),houndLock=mat(0xff6a3c,{emissive:0xff3b1a,emissiveIntensity:1.6,metalness:.4}),deadMat=mat(0x2b3236,{transparent:true,opacity:.35});
 const bodyGeo=new T.BoxGeometry(1.1,.6,1.9),legGeo=new T.BoxGeometry(.18,.9,.18),eyeGeo=new T.SphereGeometry(.12,6,4);
 const hounds=Array.from({length:maxHounds},()=>{const g=new T.Group();g.visible=false;group.add(g);const body=new T.Mesh(bodyGeo,houndBody);body.position.y=.95;body.castShadow=true;g.add(body);
  const legs=[];for(const x of [-.45,.45])for(const z of [-.7,.7]){const l=new T.Mesh(legGeo,dark);l.position.set(x,.45,z);g.add(l);legs.push(l);}
  for(const x of [-.25,.25]){const e=new T.Mesh(eyeGeo,houndEye);e.position.set(x,1.05,-.95);g.add(e);}
  return {g,body,legs};});
 // Telegraph lines: flat red strips from hound to lock point.
 const lineMat=new T.MeshBasicMaterial({color:0xff4a2c,transparent:true,opacity:.75,depthWrite:false,side:T.DoubleSide});
 const lines=Array.from({length:maxHounds},()=>{const m=new T.Mesh(new T.PlaneGeometry(1,1),lineMat);m.rotation.x=-Math.PI/2;m.visible=false;group.add(m);return m;});
 const lockRings=Array.from({length:maxHounds},()=>{const m=new T.Mesh(new T.RingGeometry(1.6,2.2,20),lineMat);m.rotation.x=-Math.PI/2;m.visible=false;group.add(m);return m;});
 // Route markers
 const markerMat=new T.MeshStandardMaterial({color:0x9fe3c7,emissive:0x1f5a44,transparent:true,opacity:.85});
 const markers=ESCORT_ROUTE.map(g=>{const m=new T.Mesh(new T.CylinderGeometry(.35,.35,4,10),markerMat.clone());m.position.set(g.x,2,g.z);group.add(m);return m;});
 const outpost=new T.Mesh(new T.CylinderGeometry(9,9,.3,28,1,true),new T.MeshBasicMaterial({color:0x9fe3c7,transparent:true,opacity:.35,side:T.DoubleSide}));outpost.position.set(ESCORT_ROUTE.at(-1).x,.5,ESCORT_ROUTE.at(-1).z);group.add(outpost);
 return {group,update(m,time){
  group.visible=m.status!=='idle';if(!group.visible)return;
  const t=m.truck;truck.position.set(t.x,terrainHeight(t.x,t.z),t.z);truck.rotation.y=-t.yaw;const flash=t.hitFlash>0;cab.material=flash?hitMat:paint;cargo.material=flash?hitMat:paint;beacon.material.color.setHex(t.waiting?0xff6a3c:0xffb050);beacon.visible=Math.sin(time*8)>-.2;
  const live=m.hounds;let i=0;
  for(;i<live.length&&i<hounds.length;i++){const h=live[i],v=hounds[i];v.g.visible=h.alive||h.flash>0;if(!v.g.visible)continue;v.g.position.set(h.x,terrainHeight(h.x,h.z),h.z);v.g.rotation.y=-h.yaw;
   v.body.material=!h.alive?deadMat:h.flash>0?hitMat:h.mode==='telegraph'?houndLock:houndBody;const run=h.mode==='lunge'?26:h.mode==='approach'?14:4;v.legs.forEach((l,k)=>{l.rotation.x=Math.sin(time*run+k*1.6)*.5;});v.body.position.y=.95+(h.mode==='telegraph'?Math.sin(time*30)*.05:0);}
  for(;i<hounds.length;i++)hounds[i].g.visible=false;
  const warnings=houndWarnings(m);let w=0;
  for(;w<warnings.length&&w<lines.length;w++){const {from,to,remaining}=warnings[w],l=lines[w],dx=to.x-from.x,dz=to.z-from.z,len=Math.hypot(dx,dz)||.01;l.visible=true;l.position.set((from.x+to.x)/2,terrainHeight((from.x+to.x)/2,(from.z+to.z)/2)+.08,(from.z+to.z)/2);l.rotation.z=-Math.atan2(dx,-dz);l.scale.set(.5+(1-Math.min(1,remaining))*.6,len,1);const r=lockRings[w];r.visible=true;r.position.set(to.x,terrainHeight(to.x,to.z)+.09,to.z);r.scale.setScalar(1+Math.sin(time*18)*.08);}
  for(;w<lines.length;w++){lines[w].visible=false;lockRings[w].visible=false;}
  markers.forEach((mk,k)=>{const active=k===t.index&&!t.arrived;mk.material.opacity=active?.95:k<t.index?.25:.55;mk.material.emissive.setHex(active?0x2c8a66:0x1f5a44);mk.position.y=2+(active?Math.sin(time*3)*.3:0);});
  outpost.visible=t.index>=ESCORT_ROUTE.length-1||t.arrived;
 }};
}
export function drawEscortOnRadar(ctx,co,m){
 if(m.status==='idle')return;const t=m.truck;ctx.save();ctx.translate(co(t.x),co(t.z));ctx.rotate(t.yaw);ctx.fillStyle=t.waiting?'#ff9a6a':'#ffd27a';ctx.fillRect(-3,-5,6,10);ctx.restore();ctx.fillText('T',co(t.x)+5,co(t.z)+2);
 for(const h of m.hounds){if(!h.alive)continue;ctx.fillStyle=h.mode==='telegraph'||h.mode==='lunge'?'#ff4a2c':'#d07a6a';ctx.beginPath();ctx.arc(co(h.x),co(h.z),h.mode==='telegraph'?4:2.5,0,Math.PI*2);ctx.fill();}
 const g=ESCORT_ROUTE.at(-1);ctx.strokeStyle='#9fe3c7';ctx.beginPath();ctx.arc(co(g.x),co(g.z),5,0,Math.PI*2);ctx.stroke();
}
