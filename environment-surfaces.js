import * as T from './node_modules/three/build/three.module.js';

// Small, shared, deterministic surface tiles; no downloads or per-frame painting.
const tiles=new Map(),maps=new Map();
function tile(kind){
 if(tiles.has(kind))return tiles.get(kind);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const c=canvas.getContext('2d');let seed=kind.split('').reduce((a,v)=>a+v.charCodeAt(0),19);
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 c.fillStyle=kind==='earth'?'#ddd8c7':kind==='asphalt'?'#c9cecf':'#d6dde0';c.fillRect(0,0,512,512);
 // Wrapped mottling avoids a bright border at the repetition seam.
 for(let i=0;i<95;i++){
  const x=rand()*512,y=rand()*512,r=12+rand()*65;
  for(const dx of [-512,0,512])for(const dy of [-512,0,512]){
   const g=c.createRadialGradient(x+dx,y+dy,0,x+dx,y+dy,r);
   g.addColorStop(0,i%2?'rgba(40,48,42,.07)':'rgba(255,255,245,.09)');g.addColorStop(1,'rgba(100,110,100,0)');
   c.fillStyle=g;c.fillRect(x+dx-r,y+dy-r,r*2,r*2);
  }
 }
 for(let i=0;i<18000;i++){
  const x=rand()*512,y=rand()*512,s=rand()*(kind==='earth'?2.7:1.5)+.4;
  c.fillStyle=i%3?'rgba(27,38,40,.10)':'rgba(255,255,255,.22)';c.fillRect(x,y,s,s);
 }
 if(kind==='metal'||kind==='concrete'){
  const size=kind==='metal'?256:512;
  for(let x=0;x<512;x+=size)for(let y=0;y<512;y+=size){
   c.fillStyle='rgba(25,38,46,.55)';c.fillRect(x,y,size,3);c.fillRect(x,y,3,size);
   c.fillStyle='rgba(255,255,255,.35)';c.fillRect(x+3,y+3,size-3,1);c.fillRect(x+3,y+3,1,size-3);
   if(kind==='metal')for(const ox of [12,size-12])for(const oy of [12,size-12]){
    c.fillStyle='#717f86';c.beginPath();c.arc(x+ox,y+oy,2.5,0,Math.PI*2);c.fill();
   }
  }
  for(let i=0;i<90;i++){
   const x=rand()*512,y=rand()*512;c.strokeStyle='rgba(247,250,250,.16)';c.lineWidth=.6;
   c.beginPath();c.moveTo(x,y);c.lineTo(x+rand()*28,y+rand()*3);c.stroke();
  }
 }
 tiles.set(kind,canvas);return canvas;
}
export function surfaceMaps(kind,repeatX=1,repeatY=repeatX){
 const key=`${kind}:${repeatX}:${repeatY}`;
 if(maps.has(key))return maps.get(key);
 const color=new T.CanvasTexture(tile(kind));color.colorSpace=T.SRGBColorSpace;
 color.wrapS=color.wrapT=T.RepeatWrapping;color.repeat.set(repeatX,repeatY);color.anisotropy=4;
 const bump=color.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;
 const result={map:color,bumpMap:bump,bumpScale:kind==='earth'?.12:kind==='asphalt'?.045:.025};
 maps.set(key,result);return result;
}
// Ground UVs use world metres, so differently sized slabs keep the same texel density.
export function groundUV(geometry,x=0,z=0,metres=8){
 const p=geometry.attributes.position,uv=geometry.attributes.uv;
 for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+x)/metres,(p.getZ(i)+z)/metres);
 uv.needsUpdate=true;return geometry;
}

export function addFieldSky(scene){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const c=canvas.getContext('2d'),g=c.createLinearGradient(0,0,0,512);
 g.addColorStop(0,'#34566f');g.addColorStop(.35,'#789cae');g.addColorStop(.52,'#acbab9');g.addColorStop(.65,'#879da3');g.addColorStop(1,'#879da3');
 c.fillStyle=g;c.fillRect(0,0,1024,512);
 for(let i=0;i<45;i++){
  const x=(i*173)%1024,y=155+(i*31)%65,rx=45+(i*13)%85,ry=5+(i%5)*2;
  for(const dx of [-1024,0,1024]){
   c.save();c.translate(x+dx,y);c.scale(rx,ry);
   const cloud=c.createRadialGradient(0,0,0,0,0,1);cloud.addColorStop(0,'rgba(234,231,214,.18)');cloud.addColorStop(1,'rgba(234,231,214,0)');c.fillStyle=cloud;c.fillRect(-1,-1,2,2);c.restore();
  }
 }
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const sky=new T.Mesh(new T.SphereGeometry(1500,32,16),new T.MeshBasicMaterial({map,side:T.BackSide,fog:false,depthWrite:false,toneMapped:false}));
 sky.name='field-atmosphere';sky.frustumCulled=false;sky.renderOrder=-10;
 sky.onBeforeRender=(_renderer,_scene,camera)=>{sky.position.setFromMatrixPosition(camera.matrixWorld);sky.updateMatrixWorld();};
 scene.add(sky);return sky;
}
