
for(const id of ['orbital','datacenter','polar']){
 const mod=await import('../'+id+'-data.js');
 const rects=mod[id+'Obstacles']().map(o=>o&&o.x!==undefined&&o.w!==undefined?o:null).filter(Boolean);
 const grounds=rects.filter(r=>(r.bottom??0)<0.6);
 console.log('== '+id, 'total',rects.length,'ground',grounds.length);
 const e=mod[id.toUpperCase()+'_ENTRIES'][0];
 // coarse occupancy: mark grid cells inside any ground rect (expanded .9)
 const m=new Map();
 for(let x=e.x-16;x<=e.x+16;x+=4)for(let z=e.z-20;z<=e.z+8;z+=4){
  let hit=null;
  for(const r of grounds){const ex=r.x-r.w/2-.9,xx=r.x+r.w/2+.9,ez=r.z-r.d/2-.9,xz=r.z+r.d/2+.9;if(x>=ex&&x<=xx&&z>=ez&&z<=xz){hit=r;break;}}
  m.set(x+','+z,hit?1:0);
 }
 for(let z=e.z+8;z>=e.z-20;z-=4){let row='';for(let x=e.x-16;x<=e.x+16;x+=4)row+=m.get(x+','+z);console.log(String(z).padStart(3),' '+row);}
}
