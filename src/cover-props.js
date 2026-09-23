import * as T from '../node_modules/three/build/three.module.js';
import {mergeGeometries} from '../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
// Chapter 2–9 cover / obstacle box dressing.
// Every dressing is generated from the box's own w×h×d, so the visual always fits the
// unchanged collision volume. Nothing here touches obstacles, gates, ceilings or rules:
// the caller keeps its original solid box (visible or not) and we only add child meshes.
// Zero textures, zero downloads. commit() merges every part into one static mesh per
// material, so a whole chapter of dressed covers costs at most ~7 extra draw calls.

export const COVER_THEMES=['crate','relay','locker','container','pod','rack','snowbank','hut'];

// Deterministic per-position variation (no Math.random: keeps QA comparisons stable).
function seedOf(x,z){let s=(Math.round(x*7)*73856093^Math.round(z*7)*19349663)>>>0;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}

// body = the chapter's own obstacle colour; frame/panel are deliberately lighter than body so the
// dressing reads at distance under the dark chapter lighting; dark = recessed slots/doors.
const PALETTES={
 crate:    {body:0x132630,frame:0x8fa3b0,panel:0x3c5563,trim:0xd6984c,light:0x84edee,dark:0x08141b},
 relay:    {body:0x273a51,frame:0xb7c9d4,panel:0x4a6480,trim:0xf5a0c5,light:0x84edee,dark:0x101d2c},
 locker:   {body:0x202839,frame:0x9aa7bf,panel:0x3a475f,trim:0xffc06f,light:0x78eadb,dark:0x0f1320},
 container:{body:0x4c677d,frame:0xa9bcc7,panel:0x60798d,trim:0xffc275,light:0x87e4e5,dark:0x1b2831},
 pod:      {body:0x5f6f86,frame:0xb5c2d3,panel:0x7d8ea4,trim:0xffc06f,light:0x7fe9ff,dark:0x1b2230},
 rack:     {body:0x1d2b3a,frame:0x7f94a5,panel:0x334a5c,trim:0xffc06f,light:0x6fe6ff,dark:0x0a141c},
 snowbank: {body:0xe6eef5,frame:0xb9c9d6,panel:0xf3f7fa,trim:0xffb347,light:0xffffff,dark:0x9fb2c2},
 hut:      {body:0x4a4038,frame:0x8a7a68,panel:0x5c5044,trim:0xffb347,light:0xffd48a,dark:0x1d1814}
};

export function createCoverProps(scene,theme,options={}){
 if(!COVER_THEMES.includes(theme))throw new RangeError('Unknown cover theme: '+theme);
 const p=PALETTES[theme],mk=(color,metalness,roughness)=>new T.MeshStandardMaterial({color,metalness,roughness});
 const m={
  body:options.body||mk(p.body,theme==='snowbank'?0:.55,theme==='snowbank'?1:.5),
  frame:mk(p.frame,theme==='snowbank'?0:.7,theme==='snowbank'?.95:.35),
  panel:mk(p.panel,theme==='snowbank'?0:.45,theme==='snowbank'?1:.6),
  trim:mk(p.trim,.4,.5),
  dark:mk(p.dark,.4,.7),
  light:new T.MeshBasicMaterial({color:p.light}),
  glow:new T.MeshBasicMaterial({color:p.trim}),
  snowcap:mk(0xe6eef5,0,1)
 };
 const roots=[];let parts=0;
 const box=(parent,w,h,d,x,y,z,mat)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);parent.add(mesh);parts++;return mesh;};
 const cyl=(parent,r,len,x,y,z,mat,axis='y')=>{const mesh=new T.Mesh(new T.CylinderGeometry(r,r,len,8),mat);if(axis==='z')mesh.rotation.x=Math.PI/2;if(axis==='x')mesh.rotation.z=Math.PI/2;mesh.position.set(x,y,z);parent.add(mesh);parts++;return mesh;};
 const E=theme==='container'||theme==='rack'?.03:.012; // outset past the collision face (and past host-world LED/rib details) so nothing z-fights

 const builders={
  // Station: black cargo crates — frame corners, riveted side panels, one hazard band, one status lamp.
  crate(g,w,h,d,r){
   const f=Math.min(.09,w*.08,d*.08);
   for(const sx of[-1,1])for(const sz of[-1,1])box(g,f,h+E,f,sx*(w/2-f/2+E),h/2,sz*(d/2-f/2+E),m.frame);
   for(const sy of[0,1])for(const sx of[-1,1])box(g,f,f,d+E*2,sx*(w/2-f/2+E),sy?h-f/2:f/2,0,m.frame);
   for(const sy of[0,1])for(const sz of[-1,1])box(g,w+E*2,f,f,0,sy?h-f/2:f/2,sz*(d/2-f/2+E),m.frame);
   const bandY=h*.42;box(g,w+E*1.5,Math.min(.14,h*.08),d+E*1.5,0,bandY,0,m.trim);
   const side=r()<.5?1:-1;box(g,.08,.05,.05,side*(w/2+E*2),h-f-.12,d*.25,m.light);
   for(const sz of[-1,1]){box(g,w*.7,h*.34,E*1.2,0,h*.7,sz*(d/2+E*1.5),m.panel);box(g,w*.7,h*.22,E*1.2,0,h*.2,sz*(d/2+E*1.5),m.panel);}for(const sx of[-1,1])box(g,E*1.2,h*.34,d*.7,sx*(w/2+E*1.5),h*.7,0,m.panel);
  },
  // Roof: relay cabinets — sloped-looking service door, louvre slots, antenna stub, pink route stripe.
  relay(g,w,h,d,r){
   box(g,w+E*2,.06,d+E*2,0,h-.03,0,m.frame);box(g,w+E*2,.05,d+E*2,0,.025,0,m.frame);
   for(const sx of[-1,1])box(g,E*1.5,h*.7,d*.6,sx*(w/2+E),h*.5,0,m.panel);box(g,w*.72,h*.7,E*1.2,0,h*.52,d/2+E*.6,m.panel);
   const n=Math.max(3,Math.min(7,Math.round(h*2.2)));for(let i=0;i<n;i++)box(g,w*.55,.025,E*1.4,0,h*.25+i*(h*.55)/n,d/2+E,m.frame);
   box(g,w*.7,.03,E*1.6,0,h*.16,d/2+E,m.trim);box(g,.02,h*.6,.02,-w/2+.12,h*.6,-d/2+.12,m.frame);
   cyl(g,.025,Math.min(1.1,h*.5),w/2-.1,h+Math.min(1.1,h*.5)/2,-d/2+.1,m.frame);
   if(r()<.6)box(g,.06,.06,.04,w*.28,h*.88,d/2+E*2,m.light);
  },
  // Tower: server lockers — vertical door seams, handle bars, status LED column.
  locker(g,w,h,d,r){
   const cols=Math.max(1,Math.round(w/.9));const cw=w/cols;
   for(let i=0;i<cols;i++){const x=-w/2+cw*(i+.5);for(const sz of[-1,1]){box(g,cw-.08,h-.16,E*1.2,x,h/2,sz*(d/2+E),m.panel);box(g,.025,h-.3,E*1.6,x-cw*.05,h/2,sz*(d/2+E*1.2),m.dark);box(g,.02,h*.5,.03,x+cw*.35,h*.55,sz*(d/2+E*2.5),m.frame);}
    for(let k=0;k<3;k++)box(g,.04,.04,.03,x-cw*.35,h*.8-k*.1,d/2+E*2.5,(k===0&&r()<.4)?m.glow:m.light);}
   box(g,w+E*2,.06,d+E*2,0,h-.03,0,m.frame);box(g,w+E*2,.06,d+E*2,0,.03,0,m.frame);
   box(g,w+E*3,.03,d+E*3,0,h*.08,0,m.trim);
  },
  // Harbor: shipping containers — corrugated ribs, corner castings, door bars, stencil plate.
  container(g,w,h,d,r){
   const long=w>=d,L=long?w:d,S=long?d:w;const ribs=Math.max(3,Math.floor(L/.6));
   for(let i=0;i<ribs;i++){const t=-L/2+L*(i+.5)/ribs;for(const s of[-1,1]){if(long)box(g,.12,h-.4,E*1.6,t,h/2,s*(d/2+E),m.frame);else box(g,E*1.6,h-.4,.12,s*(w/2+E),h/2,t,m.frame);}}
   const c=.22;for(const sx of[-1,1])for(const sz of[-1,1])for(const sy of[0,1])box(g,c,c,c,sx*(w/2-c/2+E),sy?h-c/2:c/2,sz*(d/2-c/2+E),m.dark);
   for(const s of[-1,1]){if(long){box(g,E*2,h*.8,d*.7,s*(w/2+E),h/2,0,m.panel);for(const k of[-.25,.25])cyl(g,.03,h*.75,s*(w/2+E*3),h/2,k*d,m.frame);}else{box(g,w*.7,h*.8,E*2,0,h/2,s*(d/2+E),m.panel);for(const k of[-.25,.25])cyl(g,.03,h*.75,k*w,h/2,s*(d/2+E*3),m.frame);}}
   if(long)box(g,Math.min(1.4,L*.3),h*.22,E*1.8,-L*.15,h*.62,d/2+E*1.8,m.trim);else box(g,E*1.8,h*.22,Math.min(1.4,L*.3),w/2+E*1.8,h*.62,-L*.15,m.trim);
   if(r()<.5)box(g,w+E*2,.05,d+E*2,0,h-.025,0,m.frame);
  },
  // Orbital: ballast pods — recessed bands, tie-down eyes, glowing seam, corner pads.
  pod(g,w,h,d,r){
   const n=Math.max(2,Math.round(h/.7));for(let i=1;i<n;i++)box(g,w+E*1.5,.05,d+E*1.5,0,h*i/n,0,m.dark);
   box(g,w*.5,.03,d+E*3,0,h*.5,0,m.light);box(g,w+E*3,.03,d*.5,0,h*.5,0,m.light);
   for(const sx of[-1,1])for(const sz of[-1,1]){box(g,.28,.12,.28,sx*(w/2-.14),.06,sz*(d/2-.14),m.frame);cyl(g,.05,.16,sx*(w/2-.2),h+.06,sz*(d/2-.2),m.frame);}
   for(const s of[-1,1])box(g,w*.28,h*.32,E*1.6,s*w*.22,h*.5,d/2+E,m.frame);
   if(r()<.7)box(g,.1,.1,.03,-w*.3,h*.85,d/2+E*2,m.glow);
  },
  // Datacenter: server racks — front bezel grid, blade slots, vertical cable duct, rear vents.
  rack(g,w,h,d,r){
   // Front face: one recessed bezel panel per bay, then sparse blade slots (every ~0.45 m) with a few lit.
   const long=w>=d,L=long?w:d;const bays=Math.max(1,Math.round(L/1.2));const rows=Math.max(2,Math.min(5,Math.floor(h/.45)));
   for(let b=0;b<bays;b++){const t=-L/2+L*(b+.5)/bays;if(long)box(g,L/bays-.12,h-.3,E*1.2,t,h/2,d/2+E,m.panel);else box(g,E*1.2,h-.3,L/bays-.12,w/2+E,h/2,t,m.panel);
    for(let k=0;k<rows;k++){const y=.3+k*(h-.5)/rows;const lit=r()<.2;
     if(long)box(g,L/bays-.3,.12,E*1.8,t,y,d/2+E,lit?m.glow:m.dark);else box(g,E*1.8,.12,L/bays-.3,w/2+E,y,t,lit?m.glow:m.dark);}}
   if(long){box(g,w+E*2,.05,d+E*2,0,h-.025,0,m.frame);for(const s of[-1,1])box(g,.06,h-.1,E*2,s*(w/2-.03),h/2,d/2+E,m.frame);box(g,w*.9,h*.6,E*1.4,0,h*.5,-(d/2+E),m.dark);}
   else{box(g,w+E*2,.05,d+E*2,0,h-.025,0,m.frame);for(const s of[-1,1])box(g,E*2,h-.1,.06,w/2+E,h/2,s*(d/2-.03),m.frame);box(g,E*1.4,h*.6,d*.9,-(w/2+E),h*.5,0,m.dark);}
  },
  // Polar: snowbanks — soft irregular drift lumps (spheres), no hard frame; ledge variant gets rock crust.
  snowbank(g,w,h,d,r){
   // Base drift: one ellipsoid scaled to the whole footprint (caller hides the flat cube), then crest lumps.
   const base=new T.Mesh(new T.SphereGeometry(1,14,9),m.body);base.scale.set(w*.52,h*.5,d*.52);base.position.y=h*.5;g.add(base);parts++;
   const lumps=Math.max(2,Math.min(5,Math.round((w+d)/1.5)));
   for(let i=0;i<lumps;i++){const rad=Math.min(w,d,h)*(.25+r()*.18);const s=new T.Mesh(new T.SphereGeometry(rad,10,7),i%2?m.panel:m.body);s.position.set((r()-.5)*Math.max(0,w-rad*2),h-rad*.7,(r()-.5)*Math.max(0,d-rad*2));s.scale.set(1,.6+r()*.3,1);g.add(s);parts++;}
   if(r()<.5)box(g,w*.3,.08,.08,(r()-.5)*w*.5,h+.04,(r()-.5)*d*.5,m.frame);
  },
  // Polar: warm huts — timber battens, insulated panel seams, snow cap lip, door lantern.
  hut(g,w,h,d,r){
   const long=w>=d,L=long?w:d;const n=Math.max(2,Math.floor(L/1.1));
   for(let i=0;i<=n;i++){const t=-L/2+L*i/n;for(const s of[-1,1]){if(long)box(g,.1,h-.15,E*2,t,h/2,s*(d/2+E),m.frame);else box(g,E*2,h-.15,.1,s*(w/2+E),h/2,t,m.frame);}}
   for(const s of[-1,1]){if(long)box(g,L-.2,h*.5,E*1.2,0,h*.62,s*(d/2+E*.5),m.panel);else box(g,E*1.2,h*.5,L-.2,s*(w/2+E*.5),h*.62,0,m.panel);}
   box(g,w+.1,.12,d+.1,0,h-.06,0,m.frame);box(g,w+.14,.06,d+.14,0,h+.02,0,m.snowcap);
   if(long)box(g,L*.9,.05,E*2,0,h*.32,d/2+E*1.5,m.trim);else box(g,E*2,.05,L*.9,w/2+E*1.5,h*.32,0,m.trim);
  }
 };

 // dress(spec): spec is {w,h,d,x,z,bottom?} in the same units as the obstacle. Returns the group.
 function dress(spec){
  const w=spec.w,d=spec.d,bottom=spec.bottom??0,h=(spec.top??(bottom+spec.h))-bottom;
  if(!(w>0&&d>0&&h>0))throw new RangeError('cover spec needs positive w/h/d');
  const g=new T.Group();g.name='cover-'+theme;g.position.set(spec.x,bottom,spec.z);
  builders[theme](g,w,h,d,seedOf(spec.x,spec.z));
  scene.add(g);roots.push(g);return g;
 }
 // commit(): bake all dressed groups into one merged static mesh per material (world space).
 // Idempotent; call once after the last dress(). Returns the merged meshes.
 const merged=[];
 function commit(){
  if(!roots.length)return merged;
  scene.updateMatrixWorld(true);const buckets=new Map();
  for(const g of roots){g.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(geo);});}
  for(const g of roots){scene.remove(g);g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
  roots.length=0;
  for(const [material,geos] of buckets){const geo=mergeGeometries(geos,false);for(const x of geos)x.dispose();if(!geo)continue;geo.computeBoundingSphere();const mesh=new T.Mesh(geo,material);mesh.name='cover-'+theme+'-merged';mesh.matrixAutoUpdate=false;mesh.userData.coverProps=theme;scene.add(mesh);merged.push(mesh);}
  return merged;
 }
 function dispose(){for(const g of roots){scene.remove(g);g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}roots.length=0;for(const mesh of merged){scene.remove(mesh);mesh.geometry.dispose();}merged.length=0;for(const mat of Object.values(m))if(!options.body||mat!==options.body)mat.dispose();}
 return {dress,commit,dispose,materials:m,theme,get count(){return roots.length+merged.length;},get parts(){return parts;}};
}
