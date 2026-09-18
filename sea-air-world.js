import * as T from './node_modules/three/build/three.module.js';
import {FIELD,DOCK,ISLANDS,FIELD_BUILDINGS,WATER_GATES} from './maritime-rules.js';
import {FLIGHT_GATES} from './flight-rules.js';
const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.68,...extra});
function block(parent,w,h,d,x,y,z,material){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function sign(scene,text,x,y,z,width=12){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#12323b';c.fillRect(0,0,512,128);c.strokeStyle='#bdded1';c.lineWidth=5;c.strokeRect(4,4,504,120);c.fillStyle='#e8efda';c.font='bold 40px sans-serif';c.textAlign='center';c.fillText(text,256,82);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:true}));s.position.set(x,y,z);s.scale.set(width,width/4,1);scene.add(s);return s;}
export function buildSeaAirField(scene,{provingGroundPresent=false}={}){
 const ground=mat(0x7a7968),road=mat(0x2c3d45),white=mat(0xe1ded0),mint=mat(0x93e4cb,{emissive:0x185d49}),steel=mat(0x2b4854),wood=mat(0x9b8869);
 // Tile around the existing [-220,220] proving terrain instead of putting a near-coplanar slab below it.
 // One upward-facing surface per area also avoids a thin ground box casting onto itself.
 const landTiles=provingGroundPresent?[[380,1200,-410,0],[440,380,0,-410],[440,380,0,410]]:[[820,1200,-190,0]];
 for(const [width,depth,x,z] of landTiles){const geometry=new T.PlaneGeometry(width,depth);geometry.rotateX(-Math.PI/2);const surface=new T.Mesh(geometry,ground);surface.position.set(x,-.025,z);surface.receiveShadow=true;scene.add(surface);}
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
 const root=new T.Group();root.rotation.order='YXZ';scene.add(root);const ivory=mat(0xd9d9bd),navy=mat(0x244652),glass=mat(0x304d58,{metalness:.65,roughness:.15}),amber=mat(0xefb861),rubber=mat(0x172c33);
 const fuselage=new T.Mesh(new T.CapsuleGeometry(.72,6.5,6,12),ivory);fuselage.rotation.x=Math.PI/2;root.add(fuselage);
 block(root,12.4,.15,2.1,0,.18,.05,ivory);block(root,2,.18,2.15,-5.2,.19,.05,navy);block(root,2,.18,2.15,5.2,.19,.05,navy);
 block(root,4.4,.12,1.05,0,.45,3.6,ivory);block(root,.17,1.6,1.2,0,1.1,3.6,navy);
 const canopy=new T.Mesh(new T.SphereGeometry(1,16,10),glass);canopy.scale.set(.66,.55,1.2);canopy.position.set(0,.62,-.8);root.add(canopy);
 for(const x of [-1,1]){block(root,.08,.75,.08,x,-.65,.2,navy);const wheel=new T.Mesh(new T.CylinderGeometry(.32,.32,.25,12),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x,-.98,.2);root.add(wheel);}
 const tailWheel=new T.Mesh(new T.SphereGeometry(.19,10,8),rubber);tailWheel.position.set(0,-1.1,3.1);root.add(tailWheel);
 const prop=new T.Group();prop.position.z=-4.03;block(prop,.14,3,.08,0,0,0,rubber);block(prop,3,.14,.08,0,0,0,rubber);root.add(prop);
 const nose=new T.Mesh(new T.ConeGeometry(.45,.8,12),amber);nose.rotation.x=-Math.PI/2;nose.position.z=-4.15;root.add(nose);
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 return {root,update(s,time){root.position.set(s.x,s.y,s.z);root.rotation.set(s.pitch,-s.yaw,-s.roll,'YXZ');prop.rotation.z=time*(s.crashed?0:10+s.throttle*95);}};
}
export function createYachtModel(scene,{hostile=false}={}){
 const root=new T.Group();scene.add(root);const ivory=mat(hostile?0x38454b:0xe5e0c9),navy=mat(hostile?0xd7775c:0x214753),deck=mat(hostile?0x584a46:0xab9373),glass=mat(0x325564,{metalness:.55,roughness:.12}),chrome=mat(0x9dada4,{metalness:.75,roughness:.3});
 const shape=new T.Shape();shape.moveTo(-2.25,4.7);shape.lineTo(-2.4,-2);shape.quadraticCurveTo(-2.2,-5.2,0,-6.3);shape.quadraticCurveTo(2.2,-5.2,2.4,-2);shape.lineTo(2.25,4.7);shape.closePath();
 const hullGeo=new T.ExtrudeGeometry(shape,{depth:1.4,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.22,bevelThickness:.2});hullGeo.rotateX(Math.PI/2);const hull=new T.Mesh(hullGeo,ivory);hull.position.y=1.15;root.add(hull);
 // Extrusion is rotated into the horizontal plane; local bow points toward -Z.
 block(root,4,.18,7.2,0,1.4,.35,deck);block(root,3.3,1.05,3.7,0,2.02,-.2,glass);block(root,3.55,.2,4,0,2.62,-.2,ivory);
 block(root,3.5,.6,1.6,0,1.83,3.05,ivory);block(root,2.7,.2,1,0,2.15,3.1,deck);
 for(const x of [-2.1,2.1]){for(const z of [-3.7,-2,0,2,4])block(root,.05,.9,.05,x,1.8,z,chrome);block(root,.055,.055,8,x,2.25,.15,chrome);}
 block(root,.07,1.1,.07,0,3.15,.4,chrome);block(root,1.6,.12,.3,0,3.7,.4,ivory);
 block(root,3,.15,.25,0,1.42,4.98,navy);
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 if(hostile){block(root,3.6,.16,1,0,2.78,0,mat(0xe77d5f));block(root,1.5,.22,.35,0,3.82,.4,mat(0xff5a43,{emissive:0xff3218,emissiveIntensity:2}));}
 // Preserve the old visibility handle for chase-world, but remove the untextured rectangular wake mesh.
 const wake=new T.Group();
 return {root,wake,update(s,time){root.position.set(s.x,.08+Math.sin(time*1.2)*.08,s.z);root.rotation.set(Math.sin(time*.9)*.013,-s.yaw,Math.sin(time*.7)*.018+s.steer*s.speed*.003,'YXZ');}};
}
