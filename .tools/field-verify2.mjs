
const pick={
 roof:{deck:0,barrels:[[-6,20],[6,12]],panels:[[-17,30],[1,13]]},
 tower:{deck:0,barrels:[[-3,10],[-14,20]],panels:[[-8,12],[-6,14]]},
 train:{deck:1.5,barrels:[[-1,12,1.5],[0,-11,1.5]],panels:[[-1,-2,1.5]]},
 harbor:{deck:0,barrels:[[-10,28],[10,28]],panels:[[-16,28],[16,28]]},
 orbital:{deck:0,barrels:[[-6,17],[6,16]],panels:[[-8,15],[4,17]]},
 datacenter:{deck:0,barrels:[[-6,25],[6,25]],panels:[[-10,26],[10,26]]},
 polar:{deck:0,barrels:[[-17,20],[-12,14]],panels:[[-16,18],[-22,16]]}
};
function rectDist(px,pz,r){const dx=Math.max(Math.abs(px-r.x)-(r.w/2),0),dz=Math.max(Math.abs(pz-r.z)-(r.d/2),0);return Math.hypot(dx,dz);}
let fail=0;
for(const [id,cfg] of Object.entries(pick)){
 const mod=await import('../'+id+'-data.js');const U=id.toUpperCase();
 const rects=mod[id+'Obstacles']().filter(o=>o&&o.x!==undefined&&o.w!==undefined);
 const deck=cfg.deck;
 const solids=rects.filter(r=>((r.top??r.h)-deck)>0.25&&((r.bottom??0)<deck+1.7));
 const e0=mod[U+'_ENTRIES'][0];const sup=(mod[U+'_SUPPLIES']||[]).map(s=>({x:s.x,z:s.z}));const st=(mod[U+'_STAGES']||[]).map(s=>({x:s.x,z:s.z}));const core=mod[U+'_ARENA']?.reactor||null;const star=mod[U+'_STAR'];
 console.log('== '+id);
 for(const [kind,pts] of [['barrel',cfg.barrels],['panel',cfg.panels]])
  for(const p of pts){const x=p[0],z=p[1];
   let minc=Infinity;
   for(const r of solids)minc=Math.min(minc,rectDist(x,z,r));
   const de=Math.hypot(x-e0.x,z-e0.z),dsup=Math.min(...sup.map(s=>Math.hypot(x-s.x,z-s.z))),dst=Math.min(...st.map(s=>Math.hypot(x-s.x,z-s.z))),dcore=core?Math.hypot(x-core.x,z-core.z):99,dstar=star?Math.hypot(x-star.x,z-star.z):99;
   const ok=minc>=1.1&&de>=2.6&&dsup>=2.6&&dst>=3&&dcore>=10&&dstar>=3;
   if(!ok)fail++;
   console.log(`  ${kind} [${x},${z}] clear=${minc.toFixed(2)} entry=${de.toFixed(1)} supply=${dsup.toFixed(1)} stage=${dst.toFixed(1)} core=${dcore.toFixed(1)} star=${dstar.toFixed(1)} ${ok?'OK':'FAIL'}`);
  }
}
console.log(fail===0?'ALL POSITIONS OK':'FAILURES: '+fail);
