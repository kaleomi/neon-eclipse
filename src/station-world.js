import {createChapterSurfaces} from './chapter-surfaces.js';
import {createCoverProps} from './cover-props.js';
import {drawStationTiles,drawStationSign,refineStationMaterials} from './station-look.js';
import * as T from '../node_modules/three/build/three.module.js';
import {STATION_WALLS,STATION_COVER,STATION_GATES} from './station-data.js';
export function createStationWorld(scene,renderer,obstacles){
 scene.background=new T.Color(0x07121c);scene.fog=new T.FogExp2(0x07121c,.011);renderer.toneMappingExposure=1.12;
 const ceilings=[];
 const mat=(color,metalness=.2)=>new T.MeshStandardMaterial({color,metalness,roughness:.65});
 const wall=mat(0x506371),floor=mat(0x31444c),train=mat(0x285a68,.5),ivory=mat(0x99a79e),black=mat(0x132630),orange=mat(0xd6984c),seat=mat(0x624c4c);
 const glow=new T.MeshBasicMaterial({color:0xffba64}),white=new T.MeshBasicMaterial({color:0xa4dbe1}),glass=new T.MeshBasicMaterial({color:0x10313d});
 function box(w,h,d,x,y,z,m=wall){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);scene.add(mesh);if(h<=.2&&y-h/2>1.8)ceilings.push({x,z,w,d,bottom:y-h/2,top:y+h/2});return mesh;}
 function solid(def,m){const [w,h,d,x,z]=def,mesh=box(w,h,d,x,h/2,z,m);const o={w,h,d,x,z,mesh};obstacles.push(o);return o;}
 function sign(title,sub,x,y,z,width=7,rotation=0){
  const c=document.createElement('canvas');c.width=768;c.height=192;const g=c.getContext('2d');drawStationSign(g,title,sub);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const p=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));p.position.set(x,y,z);p.rotation.y=rotation;scene.add(p);
 }
 const tiles=document.createElement('canvas');tiles.width=tiles.height=256;drawStationTiles(tiles.getContext('2d'),256,256);const tileMap=new T.CanvasTexture(tiles);tileMap.colorSpace=T.SRGBColorSpace;tileMap.wrapS=tileMap.wrapT=T.RepeatWrapping;tileMap.repeat.set(16,19);tileMap.anisotropy=Math.min(4,renderer.capabilities?.getMaxAnisotropy?.()||1);floor.map=tileMap;
 refineStationMaterials({wall,floor,train,ivory,black,orange,seat});
 const surfaces=createChapterSurfaces(scene,renderer,'station');surfaces.coat(floor,'floor',{keepMap:true});surfaces.coat(wall,'wall');surfaces.coat(train,'wall',{mix:.14});surfaces.coat(ivory,'wall',{mix:.05});
 box(64,.3,76,0,-.2,0,floor);
 const covers=createCoverProps(scene,'crate',{body:black});
 STATION_WALLS.forEach((d,i)=>solid(d,i>=8?i>=15?ivory:train:wall));STATION_COVER.forEach((d,i)=>{
  const o=solid(d,black);if(i<5||i>=9){covers.dress({w:o.w,h:o.h,d:o.d,x:o.x,z:o.z});return;}o.mesh.userData.collisionOnly=true;o.mesh.visible=false;const x=d[3],z=d[4],outer=Math.sign(x);
  box(1,.12,2,x,.48,z,black);box(.15,.84,2,x+outer*.4,.98,z,seat);
  for(const a of [-.5,.5]){box(.78,.15,.84,x,.61,z+a,seat);box(.16,.55,.82,x+outer*.31,1.06,z+a,orange);}
  for(const a of [-.3,.3])for(const q of [-.7,.7])box(.08,.44,.08,x+a,.22,z+q,ivory);
 });
 // Low maintenance ceiling, tall platform hall, enclosed carriage and dispatch room.
 box(16,.2,22,-24,4.8,27,black);box(24,.2,34,-20,6,0,black);box(16,.2,34,0,3.6,-1,train);box(24,.2,76,20,6,0,black);box(40,.2,20,-12,5,-28,black);
 for(let z=-14;z<=14;z+=4){
  box(.2,.04,3,-10,.025,z,orange);box(.15,.04,3,10,.025,z,orange);
  for(const x of [-30,-20,16,30])box(.12,.1,2,x,4.7,z,glow);
  for(const x of [-4,4])box(.08,.06,2,x,3.42,z,white);
  // West and east station wall tile seams, not new collision volumes.
  box(.05,.045,3,-31.45,2,z,white);box(.05,.045,3,31.45,2,z,white);
 }
 for(let z=20;z<36;z+=5){box(5,.05,.12,-24,4.62,z,glow);box(.2,.03,2,-24,.025,z,orange);}
 for(let z=-14;z<16;z+=4){box(14,.025,.08,0,.025,z,black);}
 for(const x of [-6.5,6.5])box(.1,.04,33,x,.035,-1,ivory);
 for(const z of [-28,-34]){box(18,.1,.16,20,5.65,z,white);box(16,.08,.12,-22,3.42,z,white);}
 // Carriage ceiling ribs, grab rails and hanging handles.
 for(const z of [-12,-4,4,12]){box(12.8,.09,.09,0,3.34,z,ivory);for(const x of [-7.1,7.1]){const rib=box(1.6,.09,.09,x,3.14,z,ivory);rib.rotation.z=Math.sign(x)*-.28;}}
 for(const x of [-5.3,5.3]){
  const rail=new T.Mesh(new T.CylinderGeometry(.035,.035,28,8),ivory);rail.rotation.x=Math.PI/2;rail.position.set(x,2.85,0);scene.add(rail);
  for(const z of [-10,-4,2,8]){box(.025,.28,.025,x,2.71,z,orange);const handle=new T.Mesh(new T.TorusGeometry(.12,.025,5,12),orange);handle.position.set(x,2.45,z);scene.add(handle);}
 }
 // Windows, carriage ribs and benches give the train a recognisable interior.
 for(const x of [-7.65,7.65])for(const z of [-14,-6,6,12]){
  if(x<0&&Math.abs(z)<4||x>0&&z>=-16&&z<=-8)continue;
  box(.06,1,2.5,x,2.15,z,glass);box(.08,.08,2.65,x,2.73,z,ivory);
 }
 for(const [x,z,d]of [[-8.34,-11,14],[-8.34,10,12],[8.34,4,24],[8.34,-17,2]])box(.06,.14,d,x,1.1,z,ivory);
 for(const x of [-8.4,8.4]){const wheel=new T.Mesh(new T.CylinderGeometry(.43,.43,.15,16),black);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.42,10);scene.add(wheel);}
 // Station furnishings remain inside existing collision volumes.
 for(const z of [-4,10]){box(2.05,.15,2.05,-18,2.65,z,orange);sign('U-02','PLATFORM / 02',-18,2,-(0)+z+1.02,1.8);}
 sign('地下运输站','U-02 / LAST SERVICE',-24,3.2,17,9);
 sign('02  西侧站台','CLEAR PLATFORM / UNLOCK CAR',-24,4.1,-17.42,10);
 sign('TRANSIT / 04','WEST DOOR',-8.36,4.2,0,6,-Math.PI/2);
 sign('调度室  →','EAST EXIT / DISPATCH',0,2.65,-17.42,7);
 sign('道岔控制','DISPATCH / KEEP LINK ACTIVE',22,4,-37.4,10);
 sign('末班列车','LAST TRAIN / BOARD HERE',-22,3.4,-35.55,10);
 sign('←  撤离列车','ROUTE 09 / WEST GATE',8.5,3.5,-28,7,Math.PI/2);
 // Each door is both a mesh and a collision obstacle until its prerequisite is completed.
 const gates=STATION_GATES.map(g=>{const o=solid([g.w,3.3,g.d,g.x,g.z],orange);for(const y of [-1.1,-.55,0,.55,1.1]){const rib=new T.Mesh(new T.BoxGeometry(g.w>1?g.w-.1:g.w+.05,.035,g.d>1?g.d-.1:g.d+.05),black);rib.position.y=y;o.mesh.add(rib);}return {...g,o};});
 const bursts=[];let current=-1;
 function setStage(index){
  if(index===current)return false;current=index;glow.color.setHex(index===0?0xffba64:0xa4e4e3);
  for(const gate of gates){const closed=index<gate.openAt;gate.o.mesh.visible=closed;const at=obstacles.indexOf(gate.o);if(closed&&at<0)obstacles.push(gate.o);if(!closed&&at>=0)obstacles.splice(at,1);}
  return true;
 }
 function burst(position,color,count=10){
  if(bursts.length>=24)return;const data=new Float32Array(count*3),velocity=Array.from({length:count},()=>new T.Vector3((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4));const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(data,3));const mesh=new T.Points(geo,new T.PointsMaterial({color,size:.07,transparent:true,depthWrite:false}));mesh.position.copy(position);scene.add(mesh);bursts.push({mesh,velocity,life:.45});
 }
 function clear(){for(const b of bursts){scene.remove(b.mesh);b.mesh.geometry.dispose();b.mesh.material.dispose();}bursts.length=0;}
 function update(dt){for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.life-=dt;const a=b.mesh.geometry.attributes.position;b.velocity.forEach((v,j)=>{v.y-=dt*6;a.setXYZ(j,a.getX(j)+v.x*dt,a.getY(j)+v.y*dt,a.getZ(j)+v.z*dt)});a.needsUpdate=true;b.mesh.material.opacity=Math.max(0,b.life/.45);if(b.life<=0){scene.remove(b.mesh);b.mesh.geometry.dispose();b.mesh.material.dispose();bursts.splice(i,1)}}}
 // Batch static geometry; moving doors stay separate. Collision keeps the source meshes.
 covers.commit();
 scene.updateMatrixWorld(true);const batches=new Map();
 for(const m of [...scene.children]){if(!m.isMesh||m.userData.collisionOnly||m.geometry.type!=='BoxGeometry'||gates.some(g=>g.o.mesh===m))continue;if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(m);}
 for(const [material,meshes] of batches){if(meshes.length<3)continue;const b=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,meshes.length);meshes.forEach((m,i)=>{const d=m.geometry.parameters;b.setMatrixAt(i,m.matrixWorld.clone().multiply(new T.Matrix4().makeScale(d.width,d.height,d.depth)));m.visible=false});b.computeBoundingSphere();scene.add(b);}
 setStage(0);return {ceilings,setStage,update,burst,clear,setQuality:high=>surfaces.quality(high)};
}
