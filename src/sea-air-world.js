import {createVehicleVisual} from './vehicle-models.js';
import {surfaceMaps,groundUV} from './environment-surfaces.js';
import * as T from '../node_modules/three/build/three.module.js';
import {FIELD,DOCK,ISLANDS,FIELD_BUILDINGS,WATER_GATES} from './maritime-rules.js';
import {FLIGHT_GATES} from './flight-rules.js';
const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.68,...extra});
function block(parent,w,h,d,x,y,z,material){const mesh=new T.Mesh((material.userData.groundSurface?groundUV(new T.BoxGeometry(w,h,d),x,z):new T.BoxGeometry(w,h,d)),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function sign(scene,text,x,y,z,width=12){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#12323b';c.fillRect(0,0,512,128);c.strokeStyle='#bdded1';c.lineWidth=5;c.strokeRect(4,4,504,120);c.fillStyle='#e8efda';c.font='bold 40px sans-serif';c.textAlign='center';c.fillText(text,256,82);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:true}));s.position.set(x,y,z);s.scale.set(width,width/4,1);scene.add(s);return s;}
export function buildSeaAirField(scene,{provingGroundPresent=false}={}){
 const ground=mat(0x7a7968,{...surfaceMaps('earth')}),road=mat(0x36464d,{...surfaceMaps('asphalt'),roughness:.94}),white=mat(0xe1ded0),mint=mat(0x93e4cb,{emissive:0x185d49}),steel=mat(0x2b4854,{...surfaceMaps('metal',3,1)}),wood=mat(0x9b8869);
 road.userData.groundSurface=true;
 // Tile around the existing [-220,220] proving terrain instead of putting a near-coplanar slab below it.
 // One upward-facing surface per area also avoids a thin ground box casting onto itself.
 const landTiles=provingGroundPresent?[[380,1200,-410,0],[440,380,0,-410],[440,380,0,410]]:[[820,1200,-190,0]];
 for(const [width,depth,x,z] of landTiles){const geometry=new T.PlaneGeometry(width,depth);geometry.rotateX(-Math.PI/2);groundUV(geometry,x,z);const surface=new T.Mesh(geometry,ground);surface.position.set(x,-.025,z);surface.receiveShadow=true;scene.add(surface);}
 block(scene,44,.1,760,-300,.02,-100,road);
 for(const x of [-320,-280])block(scene,.6,.04,745,x,.09,-100,white);
 for(let z=-450;z<275;z+=25)block(scene,1.2,.05,12,-300,.11,z,white);
 for(const z of [-460,260])for(let x=-316;x<-283;x+=5)block(scene,2.6,.04,15,x,.12,z,white);
 block(scene,205,.07,14,-203,.02,130,road);block(scene,16,.07,150,-105,.02,160,road);
 block(scene,320,.07,13,57,.015,205,road);block(scene,14,.07,100,202,.02,160,road);
 for(const b of FIELD_BUILDINGS){block(scene,b.maxX-b.minX,b.h,b.maxZ-b.minZ,(b.minX+b.maxX)/2,b.h/2,(b.minZ+b.maxZ)/2,steel);block(scene,b.maxX-b.minX+.2,.35,b.maxZ-b.minZ+.2,(b.minX+b.maxX)/2,b.h,(b.minZ+b.maxZ)/2,white);}
 block(scene,67,.8,12,238.5,.4,180,wood);block(scene,5,.2,3,272.5,.72,180,white);
 for(let x=210;x<273;x+=8)for(const z of [174.5,185.5])block(scene,.55,2,.55,x,0,z,steel);
 sign(scene,'AIRFIELD / 飞行基地',-300,8,255,20);sign(scene,'MARINA / 游艇码头',210,6,180,16);
 for(let z=-460;z<=265;z+=30)for(const x of [-322, -278])block(scene,.5,.35,.5,x,.3,z,mint);
 const waterGeo=new T.PlaneGeometry(380,1200,38,120);waterGeo.rotateX(-Math.PI/2);
 const waterMaterial=new T.ShaderMaterial({uniforms:{time:{value:0},fogColor:{value:new T.Color(0x879da3)}},vertexShader:`uniform float time; varying vec3 world; void main(){vec3 p=position;p.y+=sin(p.x*.05+time)*.10+cos(p.z*.075+time*.8)*.08;vec4 w=modelMatrix*vec4(p,1.);world=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`uniform float time;uniform vec3 fogColor;varying vec3 world;void main(){float rip=pow(max(0.,sin(world.x*.3+world.z*.4+time*1.6)),16.);vec3 col=mix(vec3(.035,.21,.26),vec3(.19,.45,.48),.35+.2*sin(world.z*.02));col+=rip*.09;float fog=smoothstep(180.,1300.,distance(cameraPosition,world));gl_FragColor=vec4(mix(col,fogColor,fog),1.);}`});
 const water=new T.Mesh(waterGeo,waterMaterial);water.position.set(410,-.1,0);scene.add(water);
 for(const island of ISLANDS){const mesh=new T.Mesh(new T.CylinderGeometry(island.r*.85,island.r, island.h,14),ground);mesh.position.set(island.x,island.h/2-.1,island.z);mesh.receiveShadow=true;scene.add(mesh);}
 // Distant terrain is outside the playable boundary, never invisible in-world obstacles.
 const rocks=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),ground,65),d=new T.Object3D();for(let i=0;i<65;i++){const t=i/64*Math.PI*1.5+Math.PI/4;d.position.set(Math.cos(t)*740,7,Math.sin(t)*740);d.scale.set(30+i%40,35+i%60,30+i%35);d.rotation.set(0,i,0);d.updateMatrix();rocks.setMatrixAt(i,d.matrix);}scene.add(rocks);
 const airRings=FLIGHT_GATES.map((g,i)=>{const ring=new T.Mesh(new T.TorusGeometry(20,.65,8,48),mat(0x9dd5e6,{emissive:0x286679}));ring.position.set(g.x,g.y,g.z);scene.add(ring);ring.userData.label=sign(scene,'AIR '+(i+1),g.x,g.y+26,g.z,18);return ring;});
 const buoys=WATER_GATES.map((g,i)=>{const group=new T.Group();for(const x of [-10,10]){const b=new T.Mesh(new T.CylinderGeometry(.7,1.6,3,8),mat(0xffc778,{emissive:0x684715}));b.position.set(x,1,0);group.add(b);}group.position.set(g.x,0,g.z);scene.add(group);sign(scene,'SEA '+(i+1),g.x,5,g.z,10);return group;});
 return {update(time,airIndex,seaIndex,showAir=true){waterMaterial.uniforms.time.value=time;airRings.forEach((r,i)=>{r.visible=r.userData.label.visible=showAir;r.material.color.setHex(i<airIndex?0x416c65:i===airIndex?0xc1fff0:0x668b98);r.material.emissiveIntensity=i===airIndex?1.3:.15;r.rotation.y=Math.sin(time*.12)*.12;});buoys.forEach((b,i)=>{b.position.y=Math.sin(time*1.3+i)*.14;b.children.forEach(c=>c.material.emissiveIntensity=i===seaIndex?1.2:.1);});}};
}
export function createAircraftModel(scene){
 const root=createVehicleVisual('aircraft'),prop=root.getObjectByName('V03_Propeller');root.rotation.order='YXZ';scene.add(root);
 return {root,update(s,time){root.position.set(s.x,s.y,s.z);root.rotation.set(s.pitch,-s.yaw,-s.roll,'YXZ');prop.rotation.z=time*(s.crashed?0:10+s.throttle*95);}};
}
export function createYachtModel(scene,{hostile=false}={}){
 const root=createVehicleVisual('yacht',{hostile});scene.add(root);
 // Preserve chase-world's visibility handle; the old untextured rectangle stays absent.
 const wake=new T.Group();
 return {root,wake,update(s,time){root.position.set(s.x,.08+Math.sin(time*1.2)*.08,s.z);root.rotation.set(Math.sin(time*.9)*.013,-s.yaw,Math.sin(time*.7)*.018+s.steer*s.speed*.003,'YXZ');}};
}
