
const mods=[['roof','../roof-data.js'],['tower','../tower-data.js'],['train','../train-data.js'],['harbor','../harbor-data.js'],['orbital','../orbital-data.js'],['datacenter','../datacenter-data.js'],['polar','../polar-data.js']];
for(const [id,p] of mods){const m=await import(p);
 console.log('== '+id);
 const a=m[id.toUpperCase()+'_ARENA'];
 if(a)console.log('  arena:',JSON.stringify(a).slice(0,400));
 const st=m[id.toUpperCase()+'_STAGES'];
 if(st)console.log('  stages:',st.map(s=>[s.id?.slice(0,12),s.x?.toFixed(1),s.z?.toFixed(1),s.feetY??0].join(',')).join(' | '));
 const b=m[id.toUpperCase()+'_BOUNDS'];
 if(b)console.log('  bounds:',JSON.stringify(b));
}
