
const chapters=[['roof','../roof-data.js'],['tower','../tower-data.js'],['train','../train-data.js'],['harbor','../harbor-data.js'],['orbital','../orbital-data.js'],['datacenter','../datacenter-data.js'],['polar','../polar-data.js']];
function rectDist(px,pz,r){const dx=Math.max(Math.abs(px-r.x)-(r.w/2),0),dz=Math.max(Math.abs(pz-r.z)-(r.d/2),0);return Math.hypot(dx,dz);}
function norm(o){ if(Array.isArray(o)&&o.length===5){const [w,h,d,x,z]=o;return {x,z,w,d,bottom:0,top:h,h};} if(o&&o.x!==undefined&&o.w!==undefined)return o; return null;}
for(const [id,modpath] of chapters){
 const mod=await import(modpath);
 const fn=mod[id[0].toUpperCase()+'OBSTACLES']||mod[id+'Obstacles']||Object.values(mod).find(v=>typeof v==='function'&&v.name===id+'Obstacles');
 let rects=[];
 if(typeof fn==='function'){ try{rects=fn().map(norm).filter(Boolean);}catch(e){console.log(id,'fn fail',e.message);continue;} }
 else { for(const [n,v] of Object.entries(mod)){ if(/(WALLS|COVER|GATES|BANKS|HUTS|TOWER_BASES|PLINTHS|RACKS|RINGS|STAIRS|PADDING|PIERS|CRANES|CONTAINERS|TRAIN|DECKS|PILLARS|COLUMNS|CARGO|CARS)/.test(n)&&Array.isArray(v)) rects=rects.concat(v.map(norm).filter(Boolean)); } }
 const grounds=rects.filter(r=>(r.bottom??0)<0.6);
 const entries=mod[id.toUpperCase()+'_ENTRIES']||[];const sup=(mod[id.toUpperCase()+'_SUPPLIES']||[]).map(s=>({x:s.x,z:s.z}));const arena=mod[id.toUpperCase()+'_ARENA'];
 const e0=entries[0]||{x:0,z:28};
 console.log('== '+id+' obstacles='+rects.length+' ground='+grounds.length+' arena.start='+(arena&&arena.start?JSON.stringify(arena.start):'?')+' entry0='+e0.x+','+e0.z);
 const cands=[];
 for(let x=Math.floor(e0.x)-14;x<=Math.ceil(e0.x)+14;x+=2)for(let z=Math.floor(e0.z)-14;z<=Math.ceil(e0.z)+14;z+=2){
  let minc=Infinity;
  for(const r of grounds)minc=Math.min(minc,rectDist(x,z,r)-0.8);
  if(minc<0.25)continue;
  if(Math.hypot(x-e0.x,z-e0.z)<2.5)continue;
  if(sup.some(s=>Math.hypot(x-s.x,z-s.z)<2.5))continue;
  if(arena&&arena.start&&Math.hypot(x-arena.start.x,z-arena.start.z)<9)continue;
  cands.push({x,z,c:+minc.toFixed(1)});
 }
 cands.sort((a,b)=>b.c-a.c);
 console.log('   top:',cands.slice(0,10).map(c=>c.x+','+c.z+'(c'+c.c+')').join(' '));
}
