
for(const id of ['roof','tower','harbor','orbital','datacenter','polar','train']){
 const mod=await import('../'+id+'-data.js');
 const stars=Object.entries(mod).filter(([n,v])=>/STAR/i.test(n));
 for(const [n,v] of stars)console.log(id,n,JSON.stringify(v).slice(0,120));
}
const hid=await import('../hidden-data.js');
console.log('hidden:',Object.keys(hid).join(','));
