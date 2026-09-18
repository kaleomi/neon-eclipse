import * as T from 'three';
import {HELICOPTER_SITE} from './helicopter-rules.js';

export function createHelicopterModel(){
  const root=new T.Group();root.name='H-01';const attitude=new T.Group();root.add(attitude);
  const paint=new T.MeshStandardMaterial({color:0x586d67,roughness:.58,metalness:.28});
  const dark=new T.MeshStandardMaterial({color:0x182d32,roughness:.42,metalness:.3});
  const glass=new T.MeshStandardMaterial({color:0x123c49,roughness:.16,metalness:.65});
  const amber=new T.MeshStandardMaterial({color:0xf0bc70,roughness:.4,metalness:.25});
  const steel=new T.MeshStandardMaterial({color:0x91a49e,metalness:.7,roughness:.36});
  const black=new T.MeshStandardMaterial({color:0x142326,roughness:.58});
  function mesh(geo,mat,x,y,z,parent=attitude){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;}
  const body=mesh(new T.SphereGeometry(1,16,12),paint,0,1.55,-.1);body.scale.set(1.22,1.13,2.08);
  const nose=mesh(new T.SphereGeometry(1,16,10),glass,0,1.6,-1.14);nose.scale.set(1.09,.95,1.12);
  mesh(new T.BoxGeometry(.1,1.56,1.68),dark,0,1.9,-1.62).rotation.x=.15;
  const brow=mesh(new T.BoxGeometry(2.1,.13,.22),amber,0,2.35,-1.38);brow.rotation.x=.15;
  mesh(new T.BoxGeometry(1.35,.58,1.55),dark,0,2.56,.55);
  for(const side of [-1,1]){
    mesh(new T.BoxGeometry(.14,.6,.68),glass,side*1.19,1.64,.03);
    mesh(new T.BoxGeometry(.12,.1,.45),amber,side*1.21,1.16,.09);
    mesh(new T.BoxGeometry(.2,.28,.75),dark,side*.82,2.52,.85);
    for(const z of [-1.03,1.02]){
      const strut=mesh(new T.CylinderGeometry(.064,.064,1.12,6),steel,side*.96,.69,z);strut.rotation.z=side*.45;
    }
    const skid=mesh(new T.CylinderGeometry(.077,.077,4.0,8),steel,side*1.32,.078,.1);skid.rotation.x=Math.PI/2;
    const toe=mesh(new T.CylinderGeometry(.077,.077,.65,8),steel,side*1.32,.19,-2.07);toe.rotation.x=-1.15;
    mesh(new T.BoxGeometry(.11,.19,1.4),amber,side*1.15,.8,-.06);
  }
  const boom=mesh(new T.CylinderGeometry(.22,.43,3.38,10),paint,0,1.85,3.37);boom.rotation.x=Math.PI/2;
  mesh(new T.BoxGeometry(2.24,.12,.47),amber,0,1.99,4.44);
  const fin=mesh(new T.BoxGeometry(.15,1.55,.72),paint,0,2.48,5.02);fin.rotation.x=-.22;
  mesh(new T.BoxGeometry(.16,.14,.65),amber,0,3.23,4.86);
  mesh(new T.CylinderGeometry(.12,.16,.62,10),steel,0,3,.14);
  const rotor=new T.Group();rotor.position.set(0,3.29,.14);attitude.add(rotor);
  const blades=new T.Group();rotor.add(blades);
  for(let i=0;i<4;i++){
    const arm=new T.Group();arm.rotation.y=i*Math.PI/2;blades.add(arm);
    mesh(new T.BoxGeometry(.24,.055,4.65),black,0,0,2.33,arm);
    mesh(new T.BoxGeometry(.24,.06,.42),amber,0,0,4.42,arm);
  }
  const disc=new T.Mesh(new T.CircleGeometry(4.8,48),new T.MeshBasicMaterial({color:0xced8ce,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));
  disc.rotation.x=-Math.PI/2;rotor.add(disc);mesh(new T.CylinderGeometry(.31,.31,.17,10),dark,0,3.36,.14);
  const tail=new T.Group();tail.position.set(.23,2.34,5.07);attitude.add(tail);
  for(let i=0;i<3;i++){const b=mesh(new T.BoxGeometry(.05,.16,1.34),black,0,0,0,tail);b.rotation.x=i*Math.PI/3;}
  const lamps=[];
  for(const [x,color] of [[-1.18,0xff765a],[1.18,0x80f6cc]]){
    const material=new T.MeshBasicMaterial({color});lamps.push(mesh(new T.SphereGeometry(.085,8,6),material,x,1.1,-.28));
  }
  return {root,attitude,rotor,tail,disc,update(s){
    root.position.set(s.x,s.y,s.z);root.rotation.y=-s.yaw;attitude.rotation.set(-s.pitch,0,-s.roll,'YXZ');
    blades.rotation.y=-s.rotorAngle;tail.rotation.x=s.rotorAngle*3;
    disc.material.opacity=s.rpm>.5?.13*(s.rpm-.5)*2:0;
    blades.visible=s.rpm<.84;root.userData.rpm=s.rpm;
  }};
}

export function createHelicopterSite({makeLabel=null}={}){
  const root=new T.Group();root.name='RotorLabSite';
  const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.86,...extra});
  const concrete=material(0x707e7c),ground=material(0x536860),dark=material(0x253e43),stripe=new T.MeshBasicMaterial({color:0xe5c485});
  const teal=new T.MeshBasicMaterial({color:0x92daca}),red=new T.MeshBasicMaterial({color:0xd98263});
  function put(geo,mat,x,y,z){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);root.add(m);return m;}
  function line(points,color=0xb9cec6,opacity=.25){const g=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));const l=new T.Line(g,new T.LineBasicMaterial({color,transparent:true,opacity}));root.add(l);return l;}
  const floor=put(new T.PlaneGeometry(270,270),ground,0,-.025,0);floor.rotation.x=-Math.PI/2;
  const apron=put(new T.PlaneGeometry(136,174),concrete,1,0,0);apron.rotation.x=-Math.PI/2;
  const grid=new T.GridHelper(220,22,0x93b0a4,0x718e81);grid.position.y=.014;grid.material.transparent=true;grid.material.opacity=.2;root.add(grid);
  const pads=[];
  for(const pad of HELICOPTER_SITE.pads){
    const plate=put(new T.CylinderGeometry(pad.radius+1,pad.radius+1,.11,8),dark,pad.x,.055,pad.z);plate.userData.pad=pad.id;
    const ring=put(new T.RingGeometry(pad.radius-.18,pad.radius+.04,64),stripe,pad.x,.12,pad.z);ring.rotation.x=-Math.PI/2;
    for(const dx of [-2.3,2.3]){const bar=put(new T.PlaneGeometry(.65,6),stripe,pad.x+dx,.13,pad.z);bar.rotation.x=-Math.PI/2;}
    const h=put(new T.PlaneGeometry(4.6,.65),stripe,pad.x,.135,pad.z);h.rotation.x=-Math.PI/2;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;put(new T.BoxGeometry(.32,.14,.32),teal,pad.x+Math.cos(a)*11.4,.19,pad.z+Math.sin(a)*11.4);}
    if(makeLabel){const label=makeLabel('PAD '+pad.id,'#d5d9c0');label.position.set(pad.x,2,pad.z+13.5);root.add(label);}
    pads.push(plate);
  }
  // Training corridor: painted lines, not invisible physical walls.
  line([[-22,.17,20],[-22,.17,-32],[15,.17,-32]],0xdec997,.65);
  for(const b of HELICOPTER_SITE.obstacles){
    const x=(b.minX+b.maxX)/2,z=(b.minZ+b.maxZ)/2,w=b.maxX-b.minX,d=b.maxZ-b.minZ,h=b.id==='tower'?b.maxY-5:b.maxY;
    const box=put(new T.BoxGeometry(w,h,d),material(b.id==='cargo'?0x8e694c:0x43565a),x,h/2,z);box.userData.obstacle=b.id;
    put(new T.BoxGeometry(w+.4,.35,d+.4),material(0x283f44),x,h-.175,z);
    if(b.id==='hangar'){
      put(new T.BoxGeometry(w*.76,h*.74,.15),dark,x,h*.38,b.maxZ+.09);
      for(let i=-3;i<=3;i++)put(new T.BoxGeometry(.1,h*.74,.2),concrete,x+i*3,h*.38,b.maxZ+.2);
      put(new T.BoxGeometry(w*.78,.18,.2),teal,x,h*.81,b.maxZ+.2);
    }else if(b.id==='tower'){
      put(new T.BoxGeometry(w+.7,3.4,d+.7),material(0x8db3b0,{metalness:.2,roughness:.3}),x,h-3,z);
      put(new T.CylinderGeometry(.12,.12,5,6),dark,x,h+2.5,z);
      put(new T.SphereGeometry(.28,8,6),red,x,h+5,z);
    }else for(let i=0;i<4;i++)put(new T.BoxGeometry(.1,h+.08,d+.1),dark,b.minX+i*3,.5*h,z);
  }
  for(let i=0;i<28;i++){
    const a=i*Math.PI*2/28,r=180+(i%3)*25;
    const hill=put(new T.ConeGeometry(17+(i%4)*7,15+(i%5)*8,5),material(i%2?0x425c57:0x61766c),Math.cos(a)*r,4,Math.sin(a)*r);hill.rotation.y=a;
  }
  for(const z of [-108,108])for(let x=-100;x<=100;x+=20)put(new T.BoxGeometry(.3,1.4,.3),stripe,x,.7,z);
  for(const x of [-108,108])for(let z=-100;z<=100;z+=20)put(new T.BoxGeometry(.3,1.4,.3),stripe,x,.7,z);
  line([[-110,.08,-110],[110,.08,-110],[110,.08,110],[-110,.08,110],[-110,.08,-110]],0xe4b376,.75);
  const shadow=put(new T.CircleGeometry(4.2,32),new T.MeshBasicMaterial({color:0x152c2c,transparent:true,opacity:.22,depthWrite:false}),-22,.15,32);shadow.rotation.x=-Math.PI/2;
  const guide=new T.Group();root.add(guide);
  const ring=new T.Mesh(new T.TorusGeometry(6,.07,6,64),new T.MeshBasicMaterial({color:0x9ce6d6,transparent:true,opacity:.7,depthWrite:false}));ring.rotation.x=Math.PI/2;guide.add(ring);
  const stem=new T.Mesh(new T.CylinderGeometry(.035,.035,1,6),new T.MeshBasicMaterial({color:0x9ce6d6,transparent:true,opacity:.35,depthWrite:false}));guide.add(stem);
  const floorRing=new T.Mesh(new T.RingGeometry(5.8,6.05,48),ring.material);floorRing.rotation.x=-Math.PI/2;guide.add(floorRing);
  return {root,pads,guide,update(s,goal){
    shadow.position.set(s.x,.155,s.z);shadow.scale.setScalar(1+s.y*.025);shadow.material.opacity=Math.max(.035,.22-s.y*.01);
    guide.visible=!!goal;
    if(goal){guide.position.set(goal.x,.17,goal.z);ring.position.y=Math.max(.2,goal.y);ring.scale.setScalar(goal.radius/6);stem.scale.y=Math.max(.1,goal.y);stem.position.y=goal.y/2;floorRing.scale.setScalar(goal.radius/6);}
  }};
}
export function makeHelicopterLabel(text,color='#d7e6db'){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(18,40,42,.84)';ctx.fillRect(0,0,256,64);ctx.fillStyle=color;ctx.font='600 30px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,34);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.scale.set(7.6,1.9,1);return sprite;
}
export function disposeHelicopterObject(root){
  const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){materials.add(m);if(m.map)textures.add(m.map);}});
  for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
}
