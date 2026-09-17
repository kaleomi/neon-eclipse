import {reloadPose} from './action-poses.js';
import * as T from './node_modules/three/build/three.module.js';
const material=(color,metalness=.35,roughness=.48)=>new T.MeshStandardMaterial({color,metalness,roughness});
const steel=material(0x728893,.7,.32),body=material(0x344a58),dark=material(0x13232d),rubber=material(0x17252b,.05,.85),glove=material(0x50646d,.1,.8);
const casing=material(0x9b4932,.15,.65),brass=material(0xc69e59,.65,.35);
const glass=new T.MeshBasicMaterial({color:0x53bfae,transparent:true,opacity:.18,depthWrite:false});
const cyan=new T.MeshStandardMaterial({color:0x72e7d9,emissive:0x247f78,emissiveIntensity:.5});
const amber=new T.MeshStandardMaterial({color:0xeaa566,emissive:0x773510,emissiveIntensity:.3});
function box(g,w,h,d,x,y,z,m=body,bevel=false){
 let geo;
 if(bevel){const s=new T.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2);s.lineTo(-w/2,h/2);s.closePath();geo=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1,steps:1});geo.translate(0,0,-d/2);}
 else geo=new T.BoxGeometry(w,h,d);
 const mesh=new T.Mesh(geo,m);mesh.position.set(x,y,z);g.add(mesh);return mesh;
}
function tube(g,r,len,x,y,z,m=steel){const mesh=new T.Mesh(new T.CylinderGeometry(r,r,len,16),m);mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);g.add(mesh);return mesh;}
function ring(g,r,x,y,z){const mesh=new T.Mesh(new T.TorusGeometry(r,.012,6,20),steel);mesh.position.set(x,y,z);g.add(mesh);}
function hand(parent,x,y,z){
 const h=new T.Group();h.position.set(x,y,z);parent.add(h);
 const palm=new T.Mesh(new T.SphereGeometry(1,12,8),glove);palm.scale.set(.088,.075,.105);h.add(palm);
 for(let i=0;i<4;i++){const finger=new T.Mesh(new T.CapsuleGeometry(.018,.065,3,7),dark);finger.rotation.x=Math.PI/2;finger.position.set(-.058+i*.038,-.052,-.055);h.add(finger);}
 const thumb=new T.Mesh(new T.CapsuleGeometry(.025,.065,3,7),glove);thumb.rotation.z=-.55;thumb.position.set(.075,-.01,-.03);h.add(thumb);
 tube(h,.085,.045,0,0,.12,dark);
 const sleeve=new T.Mesh(new T.CylinderGeometry(.085,.105,.33,12),body);sleeve.rotation.x=Math.PI/2-.18;sleeve.position.set(0,-.03,.30);h.add(sleeve);
 return h;
}
function label(g,text,color){const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#152833';ctx.fillRect(0,0,256,64);ctx.fillStyle=color;ctx.font='bold 26px monospace';ctx.fillText(text,10,29);ctx.fillStyle='#8c9ca3';ctx.font='13px monospace';ctx.fillText('K-19 / FIELD SYSTEM',10,51);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(.28,.07),new T.MeshBasicMaterial({map}));mesh.position.set(-.126,.022,.03);mesh.rotation.y=-Math.PI/2;g.add(mesh);}
export function createWeapons(camera){
 const gun=new T.Group();camera.add(gun);const models=[],pumps=[],hands=[],shells=[],magazines=[],supports=[],bolts=[];
 for(let i=0;i<4;i++){
  const g=new T.Group();g.scale.setScalar(.65);gun.add(g);models.push(g);
  if(i===3){
   const grip=box(g,.105,.27,.11,0,-.02,.04,rubber,true);grip.rotation.x=-.2;
   for(let k=0;k<5;k++)box(g,.12,.018,.12,0,-.12+k*.045,.04,dark);
   box(g,.3,.045,.15,0,.15,0,steel,true);box(g,.18,.065,.11,0,.2,-.02,body,true);
   const shape=new T.Shape();shape.moveTo(-.085,0);shape.lineTo(.075,0);shape.lineTo(.06,.56);shape.lineTo(-.055,.72);shape.lineTo(-.105,.52);shape.closePath();
   const geo=new T.ExtrudeGeometry(shape,{depth:.028,bevelEnabled:true,bevelThickness:.009,bevelSize:.006,bevelSegments:1,steps:1});
   const blade=new T.Mesh(geo,steel);blade.position.set(0,.21,-.03);blade.rotation.x=-.32;g.add(blade);
   box(blade,.014,.5,.012,-.07,.28,.047,cyan);box(blade,.036,.27,.008,.013,.21,.049,dark);
   hand(g,0,-.07,.11);continue;
  }
  const shotgun=i===1,pistol=i===2;
  box(g,pistol?.17:.24,pistol?.13:.2,pistol?.34:.46,0,.025,.035,body,true);
  bolts[i]=box(g,pistol?.18:.2,.055,pistol?.4:.52,0,.13,-.01,steel,true);
  const grip=box(g,.12,.27,.16,0,-.17,.17,rubber,true);grip.rotation.x=-.28;
  for(let k=0;k<4;k++)box(g,.126,.016,.16,0,-.08-k*.043,.17,dark);
  box(g,.1,.035,.15,0,-.17,-.015,dark);box(g,.03,.11,.026,0,-.11,-.085,steel);box(g,.035,.06,.018,0,-.065,-.005,steel).rotation.x=.4;
  box(g,.012,.065,.15,-.13,.04,-.025,dark);box(g,.016,.018,.085,-.137,.025,-.035,steel);
  const rearHand=hand(g,.015,-.16,.26);hands[i]=rearHand;
  if(pistol){
   tube(g,.041,.15,0,.08,-.23,dark);tube(g,.065,.3,0,.08,-.42,steel);tube(g,.07,.018,0,.08,-.575,dark);ring(g,.056,0,.08,-.584);
   for(let k=0;k<6;k++)box(g,.187,.07,.012,0,.04,.09+k*.018,dark);
   box(g,.045,.045,.025,0,.18,.14,dark);box(g,.018,.012,.008,0,.195,.157,cyan);box(g,.023,.035,.025,0,.18,-.17,dark);
   const mag=new T.Group();g.add(mag);magazines[i]=mag;box(mag,.1,.22,.12,0,-.23,.21,dark);box(mag,.13,.035,.15,0,-.325,.21,steel,true);supports[i]=hand(g,-.15,-.18,.22);
  }else{
   box(g,.12,.1,.22,0,.025,.39,dark,true);box(g,.19,.22,.12,0,-.015,.54,body,true);box(g,.2,.23,.04,0,-.015,.62,rubber,true);
   const fore=new T.Group();fore.position.z=-.39;g.add(fore);pumps[i]=fore;
   box(fore,shotgun?.21:.19,shotgun?.16:.15,shotgun?.32:.42,0,-.005,0,dark,true);
   for(let k=0;k<7;k++)box(fore,.215,.02,.018,0,.045,-.16+k*.05,steel);
   tube(g,shotgun?.054:.035,.48,0,.055,-.67,steel);tube(g,shotgun?.04:.024,.43,0,-.065,-.61,dark);
   tube(g,shotgun?.068:.052,.1,0,.055,-.95,dark);ring(g,shotgun?.056:.043,0,.055,-1.005);tube(g,shotgun?.041:.028,.003,0,.055,-1.007,rubber);
   for(let k=0;k<7;k++)box(g,.17,.022,.016,0,.176,-.3+k*.068,dark);
   if(shotgun){
    for(let k=0;k<4;k++){tube(g,.024,.13,-.157,.025,-.1+k*.085,casing).rotation.x=0;tube(g,.027,.02,-.157,-.044,-.1+k*.085,brass).rotation.x=0;}
    box(g,.035,.055,.035,0,.15,-.82,dark);box(g,.02,.015,.015,0,.185,-.82,amber);
    const shell=new T.Group();g.add(shell);tube(shell,.031,.14,0,0,0,casing);tube(shell,.034,.022,0,0,.07,brass);shell.visible=false;shells[i]=shell;
    const support=hand(fore,-.025,-.125,.06);support.rotation.z=-.25;hands[4]=support;
   }else{
    const mag=new T.Group();g.add(mag);magazines[i]=mag;box(mag,.14,.29,.19,0,-.21,-.08,dark,true).rotation.x=.18;box(mag,.16,.035,.2,0,-.365,-.045,steel,true);
    box(g,.13,.035,.22,0,.205,.02,dark);for(const x of [-.07,.07])box(g,.025,.12,.1,x,.27,.015,steel,true);box(g,.16,.023,.1,0,.33,.015,steel,true);
    box(g,.10,.072,.012,0,.27,.005,glass);box(g,.009,.009,.013,0,.27,.006,cyan);supports[i]=hand(g,-.02,-.115,-.28);supports[i].rotation.z=-.25;
   }
  }
  label(g,['VG-30','BR-08','GH-15'][i],shotgun?'#edb477':'#7bdacb');
 }
 const flash=new T.Mesh(new T.IcosahedronGeometry(.09,0),new T.MeshBasicMaterial({color:0xffd79c,transparent:true,opacity:.9}));gun.add(flash);flash.visible=false;
 function select(index){models.forEach((m,i)=>m.visible=i===index);flash.position.set(0,.036,index===2?-.38:-.66);}
 function animate(index,recoil,reloadProgress){
  const p=reloadPose(reloadProgress,index===1);
  if(pumps[1])pumps[1].position.z=-.39+(index===1?recoil*.1:0);
  if(shells[1]){shells[1].visible=index===1&&reloadProgress>0&&reloadProgress<.82;shells[1].position.set(-.16*(1-p.hand*.6),-.4+p.hand*.32,.18-p.hand*.14);shells[1].rotation.x=p.hand*.8;}
  if(hands[4]){const feed=index===1?p.hand:0;hands[4].position.set(-.025-feed*.1,-.125-feed*.1,.06+feed*.35);hands[4].rotation.x=-feed*.7;}
  magazines.forEach((mag,i)=>{const n=i===index?p.mag:0;mag.position.set(-.1*n,-.38*n,.12*n);mag.rotation.z=-.25*n;});
  supports.forEach((h,i)=>{const n=i===index?p.hand:0;h.position.set((i===2?-.15:-.02)-.06*n,(i===2?-.18:-.115)-.3*n,(i===2?.22:-.28)+.22*n);h.rotation.x=-.8*n;});
  bolts.forEach((b,i)=>{b.position.z=-.01+(i===index?recoil*.035+p.bolt*.065:0);});
 }
 select(0);return {gun,flash,select,animate};
}
