
const mods=['tower-data','train-data','harbor-data','orbital-data','datacenter-data','polar-data'];
for(const m of mods){
 let mod; try{mod=await import('../'+m+'.js');}catch(e){console.log(m,'IMPORT FAIL',e.message);continue;}
 console.log('== '+m);
 for(const [name,v] of Object.entries(mod)){
  let shape='?';
  if(Array.isArray(v))shape='array['+v.length+'] head='+JSON.stringify(v[0]).slice(0,140);
  else if(typeof v==='object'&&v)shape='object keys='+Object.keys(v).slice(0,8).join(',');
  else shape=typeof v+' '+String(v).slice(0,60);
  console.log('  '+name+': '+shape);
 }
}
