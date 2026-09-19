
const chapters=[['roof','../roof-data.js',80],['tower','../tower-data.js',64],['train','../train-data.js',80],['harbor','../harbor-data.js',80],['orbital','../orbital-data.js',76],['datacenter','../datacenter-data.js',76],['polar','../polar-data.js',76]];
function rectDist(px,pz,r){const dx=Math.max(Math.abs(px-r.x)-(r.w/2),0),dz=Math.max(Math.abs(pz-r.z)-(r.d/2),0);return Math.hypot(dx,dz);}
function norm(o){ if(Array.isArray(o)&&o.length===5){const [w,h,d,x,z]=o;return {x,z,w,d,bottom:0,top:h,h};} if(o&&o.x!==undefined&&o.w!==undefined)return o; return null;}
for(const [id,modpath,hs] of chapters){
 const mod=await import(modpath);
 const U=id.toUpperCase();
 const fn=mod[id+'Obstacles'];
 const rects=fn?fn().map(norm).filter(Boolean):[];
 const bounds=(mod[U+'_BOUNDS']||{x:hs/2-.9,z:hs/2-.9});
 const arena=mod[U+'_ARENA'];const core=arena?.reactor||null;
 const stages=(mod[U+'_STAGES']||[]).map(s=>({x:s.x,z:s.z}));
 const sup=(mod[U+'_SUPPLIES']||[]).map(s=>({x:s.x,z:s.z}));
 const entries=(mod[U+'_ENTRIES']||[]);const e0=entries[0];
 const deck = id==='train' ? 1.5 : 0;
 const relevant = deck>0 ? rects.filter(r=>(r.bottom??0)<=deck+0.25&&(r.top??r.h)>=deck-0.05) : rects.filter(r=>(r.bottom??0)<0.6);
 const cands=[];
 for(let x=Math.ceil(-bounds.x);x<=bounds.x;x+=2)for(let z=Math.ceil(-bounds.z);z<=bounds.z;z+=2){
  let minc=Infinity;
  for(const r of relevant)minc=Math.min(minc,rectDist(x,z,r)-(id==='train'?0.7:0.8));
  if(minc<0.3)continue;
  if(Math.hypot(x-e0.x,z-e0.z)>22)continue;
  if(sup.some(s=>Math.hypot(x-s.x,z-s.z)<2.6))continue;
  if(stages.some(s=>Math.hypot(x-s.x,z-s.z)<2.8))continue;
  if(core&&Math.hypot(x-core.x,z-core.z)<10)continue;
  cands.push({x,z,c:+minc.toFixed(1)});
 }
 cands.sort((a,b)=>b.c-a.c);
 console.log('== '+id+' deck='+deck+' entry='+e0.x+','+e0.z+' core='+(core?core.x+','+core.z:'-'));
 console.log('   ',cands.slice(0,14).map(c=>c.x+','+c.z+'(c'+c.c+')').join(' '));
}
