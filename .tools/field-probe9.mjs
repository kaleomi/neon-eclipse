
const mod=await import('../train-data.js');
const rects=mod.trainObstacles().filter(o=>o&&o.x!==undefined&&o.w!==undefined);
const deck=rects.filter(r=>Math.abs((r.top??0)-1.5)<0.3&&(r.bottom??0)<1.55&&r.w>3);
console.log('deck slabs (top~1.5, w>3): '+deck.length);
for(const r of deck)console.log('  x',r.x.toFixed(1),'z',r.z.toFixed(1),'w',r.w,'d',r.d,'top',(r.top??0).toFixed(2),'bottom',(r.bottom??0).toFixed(2));
const walls=rects.filter(r=>((r.top??0)-1.5)>0.3&&(r.bottom??0)<3.2);
console.log('deck-level solids:',walls.length);
function rectDist(px,pz,r){const dx=Math.max(Math.abs(px-r.x)-(r.w/2),0),dz=Math.max(Math.abs(pz-r.z)-(r.d/2),0);return Math.hypot(dx,dz);}
const sup=(mod.TRAIN_SUPPLIES||[]).map(s=>({x:s.x,z:s.z}));
const st=(mod.TRAIN_STAGES||[]).map(s=>({x:s.x,z:s.z}));
const cands=[];
for(let x=-12;x<=12;x+=1)for(let z=-26;z<=36;z+=1){
 let minc=Infinity;
 for(const r of walls)minc=Math.min(minc,rectDist(x,z,r)-0.85);
 if(minc<0.4)continue;
 if(!deck.some(d=>Math.abs(x-d.x)<=d.w/2-0.7&&Math.abs(z-d.z)<=d.d/2-0.7))continue;
 if(sup.some(s=>Math.hypot(x-s.x,z-s.z)<2.6))continue;
 if(st.some(s=>Math.hypot(x-s.x,z-s.z)<3))continue;
 if(Math.hypot(x-0,z+28)<10)continue;
 cands.push({x,z,c:+minc.toFixed(1)});
}
cands.sort((a,b)=>b.c-a.c);
console.log('deck cands:',cands.slice(0,20).map(c=>c.x+','+c.z+'(c'+c.c+')').join(' '));
