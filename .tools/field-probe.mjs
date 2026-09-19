
const mods=['roof-data','tower-data','train-data','harbor-data','orbital-data','datacenter-data','polar-data','station-data'];
function rects(v){ if(!Array.isArray(v)||!v.length)return []; return v.every(r=>Array.isArray(r)&&r.length===5&&r.every(n=>typeof n==='number'))?v:[];}
for(const m of mods){
 let mod; try{mod=await import('../'+m+'.js');}catch(e){console.log(m,'IMPORT FAIL',e.message);continue;}
 let all=[];
 for(const [name,v] of Object.entries(mod)){ const r=rects(v); if(r.length)all.push([name,r]); }
 const flat=all.flatMap(([,r])=>r);
 const xs=flat.flatMap(r=>[r[3]-r[0]/2,r[3]+r[0]/2]),zs=flat.flatMap(r=>[r[4]-r[2]/2,r[4]+r[2]/2]);
 console.log('== '+m+' exports:',all.map(([n,r])=>n+'x'+r.length).join(' '),'bbox x',[Math.min(...xs),Math.max(...xs)].map(n=>n.toFixed(1)).join('-'),'z',[Math.min(...zs),Math.max(...zs)].map(n=>n.toFixed(1)).join('-'));
 const entries=mod.STAGE_ENTRIES||mod.CHAPTER_ENTRIES||null;
 if(entries)console.log('   entries:',entries.map(e=>[e.x?.toFixed(1),e.z?.toFixed(1),e.feetY??0].join(',')).join(' | '));
 const sup=mod.SUPPLIES||null;
 if(sup)console.log('   supplies:',sup.map(e=>[e.x?.toFixed(1),e.z?.toFixed(1)].join(',')).join(' | '));
}
