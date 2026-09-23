import {createVehicleVisual} from './vehicle-models.js';
import {surfaceMaps,groundUV} from './environment-surfaces.js';
import * as T from '../node_modules/three/build/three.module.js';
import {terrainHeight,DRIVE_GATES} from './vehicle-rules.js';

export const TEST_OBSTACLES = [
  {x:-141,z:108,w:25,d:34,h:8,color:0x35484e}, {x:-141,z:67,w:25,d:27,h:6,color:0x526365},
  {x:-38,z:-22,w:23,d:16,h:6,color:0x647275}, {x:0,z:-22,w:15,d:16,h:4,color:0x9a7252},
  {x:-35,z:48,w:32,d:15,h:5,color:0x42585e}, {x:4,z:52,w:16,d:15,h:4,color:0x697777},
  {x:135,z:-90,w:12,d:42,h:7,color:0x525f69}, {x:145,z:15,w:20,d:30,h:5,color:0x6b6a63},
  ...[-60,-35,-10,15,40].map((z,i)=>({x:i%2?-65:-78,z,w:2,d:2,h:2.4,color:0xe2a347}))
];
export const TEST_POLES=[[-120,123],[-122,-118],[119,-120],[120,118],[-30,10]];
export const collisionBoxes=()=>[...TEST_OBSTACLES.map(b=>({minX:b.x-b.w/2,maxX:b.x+b.w/2,minZ:b.z-b.d/2,maxZ:b.z+b.d/2})),...TEST_POLES.map(([x,z])=>({minX:x-.25,maxX:x+.25,minZ:z-.25,maxZ:z+.25}))];
export function buildProvingGround(scene,{extended=false}={}){
  const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.85,...extra});
  const asphalt=material(0x34434a,{...surfaceMaps('asphalt'),roughness:.94}),sand=material(0x6b695b,{...surfaceMaps('earth')}),stripe=material(0xe7bd71),dark=material(0x172b33),mint=material(0x7edbce,{emissive:0x224b43});
  function box(x,y,z,w,h,d,mat){const mesh=new T.Mesh((mat===asphalt?groundUV(new T.BoxGeometry(w,h,d),x,z):new T.BoxGeometry(w,h,d)),mat);mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.castShadow=true;scene.add(mesh);return mesh;}
  const terrain=new T.PlaneGeometry(440,440,160,160);terrain.rotateX(-Math.PI/2);
  const positions=terrain.attributes.position,colors=[];const base=new T.Color();
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i);positions.setY(i,terrainHeight(x,z)-.025);
    const noise=Math.sin(x*1.79+z*5.21)*Math.sin(x*.29-z*.93)*.035;
    base.setRGB(.27+noise,.30+noise,.28+noise);colors.push(base.r,base.g,base.b);
  }
  groundUV(terrain);
  terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();
  const ground=new T.Mesh(terrain,new T.MeshStandardMaterial({vertexColors:true,roughness:1,...surfaceMaps('earth')}));ground.receiveShadow=true;scene.add(ground);
  for(const x of [-105,105])box(x,0,0,18,.06,228,asphalt);
  for(const z of [-105,105])box(0,.015,z,228,.06,18,asphalt);
  for(const x of [-114,114,-96,96])box(x,.06,0,.18,.03,227,stripe);
  for(const z of [-114,114,-96,96])box(0,.07,z,227,.03,.18,stripe);
  const dashes=[];
  for(let i=-85;i<=85;i+=13){dashes.push([i,105,6,.16],[i,-105,6,.16],[-105,i,.16,6],[105,i,.16,6]);}
  for(const [x,z,w,d] of dashes)box(x,.09,z,w,.025,d,mint);
  box(-122,.025,105,18,.06,22,asphalt);
  for(const b of TEST_OBSTACLES){
    const m=material(b.color,{...surfaceMaps('concrete',2,1)});box(b.x,b.h/2,b.z,b.w,b.h,b.d,m);
    box(b.x,b.h+.12,b.z,b.w+.2,.24,b.d+.2,dark);
    if(b.w>5){
      for(let x=b.x-b.w/2+2;x<b.x+b.w/2;x+=4)box(x,b.h*.6,b.z+b.d/2+.02,2,.9,.05,mint);
      box(b.x,.6,b.z+b.d/2+.03,b.w,.18,.07,stripe);
    }
  }
  for(const x of extended?[]:[-180,180])box(x,.75,0,.35,1.5,360,dark);
  for(const z of extended?[]:[-180,180])box(0,.75,z,360,1.5,.35,dark);
  // Repeated distant rocks use one instanced draw call; static collision uses a separate grid.
  const rocks=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),sand,85),dummy=new T.Object3D();
  for(let i=0;i<85;i++){
    const angle=i*2.399963,rad=218+(i%5)*12;
    dummy.position.set(Math.cos(angle)*rad,3+ i%4,Math.sin(angle)*rad);
    dummy.scale.set(8+i%9,10+i%17,10+i%11);dummy.rotation.set(i*.2,i*.7,i*.04);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
  }if(!extended)scene.add(rocks);
  for(const [x,z] of TEST_POLES){
    box(x,6,z,.3,12,.3,dark);box(x+1.6,12,z,3.5,.25,.45,mint);
  }
  const gates=DRIVE_GATES.map((g,i)=>{
    const group=new T.Group();group.position.set(g.x,0,g.z);group.rotation.y=-g.yaw;
    const active=new T.MeshStandardMaterial({color:0x67dcc6,emissive:0x123a30,transparent:true,opacity:.9});
    for(const x of [-8,8]){const p=new T.Mesh(new T.BoxGeometry(.55,5,.55),active);p.position.set(x,2.5,0);group.add(p);}
    const cross=new T.Mesh(new T.BoxGeometry(16.5,.28,.28),active);cross.position.y=5;group.add(cross);
    const floor=new T.Mesh(new T.PlaneGeometry(16,2),new T.MeshBasicMaterial({color:0x74dfc6,transparent:true,opacity:.13,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.y=.13;group.add(floor);
    const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=128;
    const text=labelCanvas.getContext('2d');text.fillStyle='#102a32';text.fillRect(0,0,256,128);text.strokeStyle='#8adeca';text.lineWidth=5;text.strokeRect(4,4,248,120);
    text.fillStyle='#d6eee0';text.font='bold 60px sans-serif';text.textAlign='center';text.fillText(String(i+1).padStart(2,'0'),128,72);text.font='14px sans-serif';text.fillText(i===5?'FINISH / 终点':'CHECKPOINT / 路线',128,104);
    const texture=new T.CanvasTexture(labelCanvas);texture.colorSpace=T.SRGBColorSpace;
    const label=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:true}));label.position.y=6.1;label.scale.set(3.6,1.8,1);group.add(label);
    group.userData.material=active;group.userData.floor=floor;scene.add(group);return group;
  });
  return {gates,update(index,time){gates.forEach((gate,i)=>{
    const active=i===index;gate.userData.material.color.setHex(i<index?0x466f66:active?0x86ffe0:0x617277);
    gate.userData.material.emissive.setHex(active?0x226650:0x000000);gate.userData.material.opacity=active?.95:.35;
    gate.userData.floor.material.opacity=active?.13+Math.sin(time*3)*.035:.025;
  });}};
}
export function createRoverModel(scene){
  const root=createVehicleVisual('rover'),body=root.getObjectByName('V01_Body');scene.add(root);
  const wheels=[];
  for(const x of [-1.02,1.02])for(const z of [-1.35,1.35]){
    const id=(z<0?'F':'R')+(x<0?'L':'R'),pivot=root.getObjectByName('V01_Steer_'+id),wheel=root.getObjectByName('V01_Wheel_'+id);
    wheels.push({pivot,wheel,hub:wheel,front:z<0});
  }
  return {root,body,update(state,time){
    root.position.set(state.x,terrainHeight(state.x,state.z),state.z);root.rotation.y=-state.yaw;
    const f={x:Math.sin(state.yaw),z:-Math.cos(state.yaw)},r={x:Math.cos(state.yaw),z:Math.sin(state.yaw)};
    body.rotation.x=-(terrainHeight(state.x+f.x*1.4,state.z+f.z*1.4)-terrainHeight(state.x-f.x*1.4,state.z-f.z*1.4))/2.8;
    body.rotation.z=(terrainHeight(state.x+r.x,state.z+r.z)-terrainHeight(state.x-r.x,state.z-r.z))/2;
    body.position.y=Math.sin(time*18)*Math.min(Math.abs(state.speed)*.0008,.025);
    for(const w of wheels){
      const wheelGround=terrainHeight(state.x+r.x*w.pivot.position.x-f.x*w.pivot.position.z,state.z+r.z*w.pivot.position.x-f.z*w.pivot.position.z);
      w.pivot.position.y=.57+Math.max(-.4,Math.min(.4,wheelGround-root.position.y));
      w.pivot.rotation.y=w.front?-state.steer*.4:0;w.wheel.rotation.x=-state.distance/.56;w.hub.rotation.x=-state.distance/.56;}
  }};
}
