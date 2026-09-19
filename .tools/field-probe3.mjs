
const mods=['tower-data','train-data','harbor-data'];
for(const m of mods){
 let mod; try{mod=await import('../'+m+'.js');}catch(e){console.log(m,'IMPORT FAIL',e.message);continue;}
 console.log('== '+m);
 for(const [name,v] of Object.entries(mod)){
  let shape='?';
  if(Array.isArray(v))shape='array['+v.length+'] head='+JSON.stringify(v[0]).slice(0,110);
  else if(typeof v==='function')shape='function';
  else if(typeof v==='object'&&v)shape='object keys='+Object.keys(v).slice(0,10).join(',');
  else shape=typeof v+' '+String(v).slice(0,50);
  console.log('  '+name+': '+shape);
 }
}
