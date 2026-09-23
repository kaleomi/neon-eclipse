import {createTechPoster} from './reactor-posters.js';
import {surfaceMaps} from './environment-surfaces.js';
import * as THREE from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { ARENA } from './arena.js';

// All visual assets are generated locally: no image/font/CDN dependency.
function texture(draw, w=512, h=512) {
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 draw(canvas.getContext('2d'),w,h);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}
function cube(parent,w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;}
function tube(parent,r,len,x,y,z,mat){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,12),mat);m.position.set(x,y,z);parent.add(m);return m;}
const metal=new THREE.MeshStandardMaterial({color:0x6b8291,metalness:.58,roughness:.38});
const black=new THREE.MeshStandardMaterial({color:0x1b2832,metalness:.42,roughness:.52});
const light=new THREE.MeshStandardMaterial({color:0x8deff3,emissive:0x21dbe8,emissiveIntensity:2});
const amber=new THREE.MeshStandardMaterial({color:0xffad62,emissive:0xff5722,emissiveIntensity:1.6});
const hazardMap=texture((c,w,h)=>{c.fillStyle='#18242b';c.fillRect(0,0,w,h);c.fillStyle='#db963f';for(let x=-h;x<w;x+=100){c.beginPath();c.moveTo(x,0);c.lineTo(x+48,0);c.lineTo(x+h+48,h);c.lineTo(x+h,h);c.fill();}},512,128);
const hazard=new THREE.MeshStandardMaterial({map:hazardMap,roughness:.75,metalness:.25});
const glowMap=texture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#ffffff');g.addColorStop(.12,'#ffffffa0');g.addColorStop(.45,'#ffffff25');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,w,h);},128,128);
function glow(parent,x,y,z,size,color=0x32deff){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.6}));m.position.set(x,y,z);m.scale.setScalar(size);parent.add(m);return m;}
function sign(parent,text,sub,x,y,z,w=6,rotation=0){
 const map=texture((c,W,H)=>{c.fillStyle='#07191f';c.fillRect(0,0,W,H);c.strokeStyle='#46c5cb';c.lineWidth=3;c.strokeRect(12,12,W-24,H-24);c.fillStyle='#7bffff';c.font='bold 68px monospace';c.fillText(text,30,100);c.fillStyle='#9db7bb';c.font='22px monospace';c.fillText(sub,32,156);c.fillStyle='#f7904a';c.fillRect(32,184,90,6);},768,224);
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w*224/768),new THREE.MeshBasicMaterial({map}));m.position.set(x,y,z);m.rotation.y=rotation;parent.add(m);return m;
}
export function createArt(scene,renderer,reactor,obstacles){
 renderer.toneMappingExposure=1.1;
 scene.children.filter(o=>o.isHemisphereLight).forEach(o=>o.intensity=3.2);
 // Broad architectural bays, with no lettering baked into the repeating surface.
 const wallMap=texture((c,w,h)=>{
  const wash=c.createLinearGradient(0,0,0,h);wash.addColorStop(0,'#677780');wash.addColorStop(.72,'#53656e');wash.addColorStop(1,'#394d57');
  c.fillStyle=wash;c.fillRect(0,0,w,h);
  let seed=73;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<14000;i++){c.fillStyle=i%2?'rgba(225,235,239,.025)':'rgba(9,26,36,.035)';c.fillRect(rand()*w,rand()*h,1+rand()*3,1+rand()*3);}
  // Sparse recessed joints and a dark service plinth instead of banks of tiny vents.
  for(const x of [0,342,684]){c.fillStyle='#314650';c.fillRect(x,0,3,h);c.fillStyle='rgba(205,223,230,.18)';c.fillRect(x+3,0,1,h);}
  c.fillStyle='#243944';c.fillRect(0,h*.77,w,h*.23);
  c.fillStyle='#748993';c.fillRect(0,h*.77,w,2);
  c.fillStyle='#354e58';c.fillRect(0,h*.89,w,9);
 },1024,512);wallMap.wrapS=wallMap.wrapT=THREE.RepeatWrapping;wallMap.repeat.set(4,1);
 wallMap.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const wall=new THREE.MeshStandardMaterial({map:wallMap,color:0xb5c6cb,metalness:.12,roughness:.88});
 obstacles.slice(0,4).forEach(o=>o.mesh.material=wall);
 const floorMap=texture((c,w,h)=>{
  c.fillStyle='#1c272e';c.fillRect(0,0,w,h);
  for(let i=0;i<2200;i++){const sx=(i*131)%w,sy=(i*173)%h;c.fillStyle=(i%5===0)?'#10171c':'#2b3840';c.fillRect(sx,sy,2,2);}
  c.strokeStyle='#091014';c.lineWidth=12;c.strokeRect(6,6,w-12,h-12);
  c.strokeStyle='#3f505a';c.lineWidth=3;c.strokeRect(16,16,w-32,h-32);
  c.fillStyle='#2c3a42';
  for(const cx of [20,w-48])for(const cy of [20,h-48]){c.fillRect(cx,cy,28,28);c.fillStyle='#788c96';c.beginPath();c.arc(cx+14,cy+14,5,0,Math.PI*2);c.fill();c.fillStyle='#2c3a42';}
  for(let y=36;y<480;y+=20){
   c.fillStyle=(y%40===0)?'#131d23':'#26353d';
   for(let x=36;x<480;x+=32){
    c.fillRect(x,y,20,4);
    c.fillStyle='#3b4c56';c.fillRect(x+1,y,18,1);
    c.fillStyle=(y%40===0)?'#131d23':'#26353d';
   }
  }
  c.strokeStyle='rgba(26,180,196,0.22)';c.lineWidth=4;c.beginPath();c.moveTo(32,h/2);c.lineTo(w-32,h/2);c.stroke();
  c.strokeStyle='rgba(26,180,196,0.14)';c.lineWidth=2;c.strokeRect(40,40,w-80,h-80);
  c.fillStyle='rgba(219,150,63,0.35)';c.fillRect(w/2-30,h/2-4,60,8);
 });
 floorMap.wrapS=floorMap.wrapT=THREE.RepeatWrapping;floorMap.repeat.set(ARENA.size/3,ARENA.size/3);floorMap.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const floor=scene.children.find(m=>m.isMesh&&m.userData.floor);
 if(floor)floor.material=new THREE.MeshStandardMaterial({map:floorMap,bumpMap:surfaceMaps('metal',ARENA.size/3,ARENA.size/3).bumpMap,bumpScale:.022,roughness:.63,metalness:.45});
 // Sparse service bays: alternate solid cladding, pipe recesses, and ventilation.
 // All details remain within the old wall decoration envelope.
 const cladding=new THREE.MeshStandardMaterial({color:0x657984,metalness:.22,roughness:.76});
 const trim=new THREE.MeshStandardMaterial({color:0x344d59,metalness:.45,roughness:.55});
 const softLight=new THREE.MeshStandardMaterial({color:0xb2d7dd,emissive:0x5699a7,emissiveIntensity:.55});
 for(const side of [-1,1])for(let i=0;i<5;i++){
  const z=-32+i*16,g=new THREE.Group();g.name=`reactor-service-bay-${side}-${i}`;
  g.position.set(side*(ARENA.half-.65),0,z);g.rotation.y=side===-1?Math.PI/2:-Math.PI/2;scene.add(g);
  for(const x of [-3.5,3.5])cube(g,.18,7.6,.16,x,3.8,0,trim);
  const variant=(i+(side===1?1:0))%3;
  if(i===1||i===3){
   const poster=createTechPoster((side===-1?0:2)+(i===3?1:0));poster.position.set(0,3.9,.16);g.add(poster);
  }else if(variant===0){
   cube(g,5,3.5,.12,0,3,.02,cladding);
   cube(g,.035,3.1,.14,0,3,.08,trim);
   cube(g,.3,.07,.17,.45,3,.09,metal);
  }else if(variant===1){
   cube(g,3.6,4.8,.1,0,3.4,0,black);
   for(const x of [-1,0,1]){tube(g,.12,4.4,x,3.4,.14,metal);for(const y of [1.8,4.8])tube(g,.17,.12,x,y,.14,trim);}
  }else{
   cube(g,4.8,2.4,.12,0,3.5,0,black);
   for(let n=0;n<5;n++)cube(g,4.4,.10,.18,0,2.65+n*.4,.1,cladding);
  }
  cube(g,2.8,.055,.17,0,6.9,.08,softLight);
  // Four distinct research posters replace the repeated wall labels.
 }
 for(let x=-30;x<=30;x+=20){
  const pipe=tube(scene,.26,ARENA.size-2,x,8.5,0,metal);pipe.rotation.x=Math.PI/2;
  for(let z=-32;z<=32;z+=16){const collar=tube(scene,.34,.2,x,8.5,z,black);collar.rotation.x=Math.PI/2;}
 }
 sign(scene,'REACTOR 07','NEON ECLIPSE / CONTAINMENT CHAMBER',0,7.6,-ARENA.half+.65,16);
 sign(scene,'LOCKDOWN','NO EXIT / CLEAR ALL HOSTILES',0,5,ARENA.half-.65,12,Math.PI);
 for(const o of obstacles.filter(o=>o.cover)){
  const placeholder = new THREE.Group();
  placeholder.position.set(o.x, 0, o.z);
  scene.add(placeholder);
  cube(placeholder,o.w+.04,.27,o.d+.04,0,.4,0,hazard);
  for(const s of [-1,1])for(const t of [-1,1])cube(placeholder,.14,2.6,.14,s*1.42,1.3,t*1.42,metal);
  sign(placeholder,'CAUTION','HIGH VOLTAGE',0,1.4,1.515,2.5);
  if(typeof window !== 'undefined'){
   if(!createArt._coverGltfPromise){
    const loader = new GLTFLoader();
    createArt._coverGltfPromise = loader.loadAsync('./models/heavy-cover.glb').catch(()=>null);
   }
   createArt._coverGltfPromise.then(gltf=>{
    if(!gltf) return;
    placeholder.visible = false;
    const cloned = gltf.scene.clone(true);
    cloned.position.set(o.x, 0, o.z);
    scene.add(cloned);
   });
  }
 }
 for(const zone of ARENA.zones){
  const plate=sign(scene,zone.name,zone.sub,zone.x,.09,zone.z,10);plate.rotation.x=-Math.PI/2;
 }
 // Radial containment cage and animated plasma loops.
 const loops=[];
 for(let i=0;i<8;i++){
  const angle=i*Math.PI/4,x=Math.sin(angle)*2.5,z=Math.cos(angle)*2.5;
  tube(reactor,.13,7,x,4,z,metal);tube(reactor,.045,5.2,x,4,z,light);
 }
 for(let i=0;i<3;i++){
  const r=new THREE.Mesh(new THREE.TorusGeometry(2.8+i*.2,.045,6,80,Math.PI*1.65),light);r.position.y=2+i*2;r.rotation.x=Math.PI/2;reactor.add(r);loops.push(r);
 }
 glow(reactor,0,4,2.9,7);glow(reactor,0,6,2.9,4);
 const ring=new THREE.Mesh(new THREE.RingGeometry(3.1,3.25,80),new THREE.MeshBasicMaterial({color:0x29dbe5,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(0,.065,-16);scene.add(ring);
 const dustGeo=new THREE.BufferGeometry(),positions=new Float32Array(240*3);
 for(let i=0;i<240;i++){positions[i*3]=(Math.random()-.5)*(ARENA.size-4);positions[i*3+1]=Math.random()*8;positions[i*3+2]=(Math.random()-.5)*(ARENA.size-4);}
 dustGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0x76c5d7,size:.055,transparent:true,opacity:.45,depthWrite:false}));scene.add(dust);
 const bursts=[];
 function burst(position,color=0xff9a50,count=14){
  if(bursts.length>=24)return;
  const points=new Float32Array(count*3),velocity=[];
  for(let i=0;i<count;i++)velocity.push(new THREE.Vector3((Math.random()-.5)*6,Math.random()*5,(Math.random()-.5)*6));
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(points,3));
  const mesh=new THREE.Points(geometry,new THREE.PointsMaterial({color,size:.085,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));mesh.position.copy(position);scene.add(mesh);bursts.push({mesh,velocity,life:.6});
 }
 function clear(){for(const b of bursts){scene.remove(b.mesh);b.mesh.geometry.dispose();b.mesh.material.dispose();}bursts.length=0;}
 function update(dt,time){
  loops.forEach((r,i)=>{r.rotation.z=time*(i%2?-.7:.5);r.rotation.y=Math.sin(time*.6+i)*.14;});
  dust.rotation.y=time*.006;
  for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.life-=dt;const a=b.mesh.geometry.attributes.position;
   b.velocity.forEach((v,j)=>{v.y-=dt*7;a.setXYZ(j,a.getX(j)+v.x*dt,a.getY(j)+v.y*dt,a.getZ(j)+v.z*dt);});a.needsUpdate=true;b.mesh.material.opacity=Math.max(0,b.life/.6);
   if(b.life<=0){scene.remove(b.mesh);b.mesh.geometry.dispose();b.mesh.material.dispose();bursts.splice(i,1);}
  }
 }
 // Batch static box geometry by material; retain source meshes for collision raycasts.
 scene.updateMatrixWorld(true);
 const batches=new Map();
 for(const root of [...scene.children]){
  if(root===reactor||root.isCamera)continue;
  root.traverse(m=>{
   if(!m.isMesh||m.geometry.type!=='BoxGeometry'||Array.isArray(m.material))return;
   if(!batches.has(m.material))batches.set(m.material,[]);
   batches.get(m.material).push(m);
  });
 }
 for(const [material,meshes] of batches){
  if(meshes.length<3)continue;
  const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,meshes.length);
  meshes.forEach((mesh,i)=>{const p=mesh.geometry.parameters;
   batch.setMatrixAt(i,mesh.matrixWorld.clone().multiply(new THREE.Matrix4().makeScale(p.width,p.height,p.depth)));mesh.visible=false;
  });
  batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();scene.add(batch);
 }
 return {update,burst,clear,setQuality:high=>{dust.visible=high;}};
}
export function createWeapons(camera){
 const gun=new THREE.Group();camera.add(gun);gun.position.set(.32,-.28,-.6);
 const models=[];
 for(let i=0;i<4;i++){
  const g=new THREE.Group();gun.add(g);g.scale.setScalar(.65);models.push(g);const accent=i===1?amber:light;
  if(i===3){
   cube(g,.12,.13,.26,0,-.04,.2,black);cube(g,.32,.06,.08,0,.02,.06,metal);
   const blade=new THREE.Mesh(new THREE.ConeGeometry(.095,.85,3),light);blade.rotation.x=-Math.PI/2;blade.position.set(0,.02,-.36);g.add(blade);
   cube(g,.025,.045,.65,0,.02,-.27,metal);continue;
  }
  cube(g,.2,.19,i===2?.35:.62,0,0,.04,metal);
  cube(g,.14,.11,i===2?.3:.56,0,.06,-.18,black);
  cube(g,.13,.27,.15,0,-.18,.16,black).rotation.x=-.2;
  cube(g,.17,.11,.24,0,-.04,.34,black);
  cube(g,.03,.045,.23,.11,.025,.03,accent);
  for(let k=0;k<5;k++)cube(g,.23,.014,.022,0,.13,-.1+k*.045,black);
  const barrels=i===1?[-.06,.06]:[0];
  for(const x of barrels){const barrel=tube(g,i===1?.042:.033,i===2?.22:.4,x,.035,i===2?-.24:-.43,black);barrel.rotation.x=Math.PI/2;
   const rim=tube(g,.044,.04,x,.035,i===2?-.36:-.65,metal);rim.rotation.x=Math.PI/2;}
  if(i===0){cube(g,.12,.075,.19,0,.2,.06,black);cube(g,.07,.035,.01,0,.21,.16,light);cube(g,.12,.26,.2,0,-.2,-.1,metal).rotation.x=.15;}
  if(i===1){cube(g,.23,.12,.24,0,-.06,-.3,black);for(let k=0;k<4;k++)cube(g,.24,.025,.026,0,-.1,-.37+k*.05,amber);}
  if(i===2){cube(g,.12,.022,.18,0,.11,-.01,light);}
 }
 const flash=new THREE.Mesh(new THREE.IcosahedronGeometry(.13,0),new THREE.MeshBasicMaterial({color:0xffdf9a,transparent:true,opacity:.9}));gun.add(flash);flash.visible=false;
 function select(index){models.forEach((m,i)=>m.visible=i===index);flash.position.set(0,.026,index===2?-.25:-.45);}
 select(0);return {gun,flash,select};
}
export function dressEnemy(group,boss){
 for(const s of [-1,1]){
  const shoulder=cube(group,.42,.31,.68,s*.61,1.66,0,metal);shoulder.rotation.z=s*-.17;
  cube(group,.29,.08,.71,s*.63,1.76,0,boss?light:amber);
  cube(group,.29,.3,.13,s*.25,.4,.19,black);
  const joint=new THREE.Mesh(new THREE.SphereGeometry(.15,8,6),metal);joint.position.set(s*.52,1.27,0);group.add(joint);
 }
 cube(group,.58,.11,.08,0,1.74,.34,metal);
 cube(group,.09,.3,.08,-.18,1.27,.37,amber);cube(group,.09,.3,.08,.18,1.27,.37,amber);
 cube(group,.6,.8,.27,0,1.15,-.42,black);
 if(boss){
  for(const s of [-1,1]){cube(group,.25,.8,.32,s*.8,1.95,0,black);cube(group,.28,.08,.35,s*.8,2.26,0,amber);}
  const crown=new THREE.Mesh(new THREE.TorusGeometry(.44,.055,6,24),amber);crown.position.set(0,2.15,0);crown.rotation.x=Math.PI/2;group.add(crown);
 }
}
