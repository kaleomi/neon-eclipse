
const chapters=[['roof','../roof-data.js',80],['tower','../tower-data.js',64],['train','../train-data.js',80],['harbor','../harbor-data.js',80],['orbital','../orbital-data.js',76],['datacenter','../datacenter-data.js',76],['polar','../polar-data.js',76]];
function rectDist(px,pz,r){const dx=Math.max(Math.abs(px-r.x)-(r.w/2),0),dz=Math.max(Math.abs(pz-r.z)-(r.d/2),0);return Math.hypot(dx,dz);}
function norm(o){ if(Array.isArray(o)&&o.length===5){const [w,h,d,x,z]=o;return {x,z,w,d,bottom:0,top:h,h};} if(o&&o.x!==undefined&&o.w!==undefined)return o; return null;}
for(const [id,modpath,hs] of chapters){
 const mod=await import(modpath);const U=id.toUpperCase();
 const rects=mod[id+'Obstacles']().map(norm).filter(Boolean);
 const bounds=(mod[U+'_BOUNDS']||{x:hs/2-.9,z:hs/2-.9});
 const core=mod[U+'_ARENA']?.reactor||null;
 const stages=(mod[U+'_STAGES']||[]).map(s=>({x:s.x,z:s.z}));
 const sup=(mod[U+'_SUPPLIES']||[]).map(s=>({x:s.x,z:s.z}));
 const e0=mod[U+'_ENTRIES'][0];
 const deck=id==='train'?1.5:0;
 const solids=rects.filter(r=>((r.top??r.h)-deck)>0.25&&((r.bottom??0)<deck+1.7));
 const cands=[];
 for(let x=Math.ceil(-bounds.x);x<=bounds.x;x+=1)for(let z=Math.ceil(-bounds.z);z<=bounds.z;z+=1){
  let minc=Infinity;
  for(const r of solids)minc=Math.min(minc,rectDist(x,z,r)-0.85);
  if(minc<0.25)continue;
  if(Math.hypot(x-e0.x,z-e0.z)>24)continue;
  if(sup.some(s=>Math.hypot(x-s.x,z-s.z)<2.6))continue;
  if(stages.some(s=>Math.hypot(x-s.x,z-s.z)<3))continue;
  if(core&&Math.hypot(x-core.x,z-core.z)<10)continue;
  cands.push({x,z,c:+minc.toFixed(1)});
 }
 cands.sort((a,b)=>b.c-a.c);
 console.log('== '+id+' deck='+deck+' entry='+e0.x+','+e0.z+' core='+(core?core.x+','+core.z:'-')+' solids='+solids.length);
 console.log('   ',cands.slice(0,16).map(c=>c.x+','+c.z+'(c'+c.c+')').join(' '));
}
