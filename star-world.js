import * as T from './node_modules/three/build/three.module.js';
import {STAR_SITES,STAR_MAPS,createStarStore,nearStar} from './collectibles.js';
export function createStarWorld(scene,map,notify){
 const store=createStarStore(),site=STAR_SITES[map],root=new T.Group();root.name='collectible-star';root.position.set(site.x,site.feetY+1.2,site.z);scene.add(root);
 const shape=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.28:.65,x=Math.cos(a)*r,y=Math.sin(a)*r;i?shape.lineTo(x,y):shape.moveTo(x,y);}shape.closePath();
 const star=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:1,steps:1}),new T.MeshBasicMaterial({color:0xffd45c}));root.add(star);
 const ring=new T.Mesh(new T.TorusGeometry(.8,.025,6,48),new T.MeshBasicMaterial({color:0xffedac}));ring.rotation.x=Math.PI/2;ring.position.y=-1.1;root.add(ring);
 const panel=document.createElement('div');panel.id='star-collection';panel.style.cssText='margin:10px 0;padding:10px 12px;border:1px solid #806b38;background:#171b24;color:#ffdf8c;font:12px sans-serif;line-height:1.7';panel.setAttribute('aria-live','polite');document.querySelector('.mission-card').append(panel);
 const badge=document.createElement('div');badge.id='star-badge';badge.style.cssText='position:fixed;top:76px;left:28px;padding:7px 11px;border:1px solid #806b38;background:#101822df;color:#ffdf8c;font:12px sans-serif;z-index:4;pointer-events:none';badge.hidden=true;document.body.append(badge);
 let retry=0,last='';
 function sync(){root.visible=!store.collected.includes(map);const ids=store.collected,text=ids.join(',');if(text===last&&panel.textContent)return;last=text;panel.textContent=`⭐ 星星收集 ${ids.length}/${STAR_MAPS.length} · ${STAR_MAPS.map((m,i)=>`${i+1}章${ids.includes(m)?'★':'☆'}`).join('　')}\n${store.unlocked?(store.legacyUnlocked&&ids.length<STAR_MAPS.length?'旧版成就保留：「群星归航」':'隐藏成就已解锁：「群星归航」'):'隐藏成就：??? · 每关找到一颗星星'} · 靠近自动拾取，跨重玩保存`;badge.textContent=`⭐ ${ids.length}/${STAR_MAPS.length} · 本关${root.visible?'未收集':'已收集'}${store.unlocked?' · 群星归航':''}`;}
 sync();window.addEventListener('storage',()=>{store.refresh();sync();});
 function update(dt,time,player,playing){badge.hidden=!playing;root.rotation.y=time;star.position.y=Math.sin(time*2)*.12;retry=Math.max(0,retry-dt);if(!playing||!root.visible||retry||!nearStar(map,player))return;
  const result=store.collect(map);sync();if(result.error){retry=5;notify('星星保存失败，请允许浏览器存储后重试；星星仍保留在原处。');}else if(result.added){notify(store.collected.length===STAR_MAPS.length?'⭐ 隐藏成就解锁：群星归航 // 六章星星全部收集！':`⭐ 获得本关星星 // ${store.collected.length}/${STAR_MAPS.length} · 已保存`);}
 }
 return {update,store,root};
}
