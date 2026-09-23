import {createChapterSurfaces} from './chapter-surfaces.js';
import {createCoverProps} from './cover-props.js';
import * as T from '../node_modules/three/build/three.module.js';
import {POLAR_FLOORS,POLAR_WALLS,POLAR_TOWER_BASES,POLAR_MASTS,POLAR_HUTS,POLAR_BANKS,TOWERS,WARM_HUTS,THIN_ICE,WARMTH_MAX,WARMTH_WARN,FROST_DAMAGE,stormPhase,stormIntensity,stormVisibility,thermalActive,secondsToWhiteout,warmthRate,stepWarmth,insideHut,onTowerDeck} from './polar-data.js';
// Chapter 09 world: open snowfield, three radar towers, warm huts, thin-ice lake. Owns the blizzard clock and the warmth meter.
export function createPolarWorld(scene,renderer,obstacles){
 const skyClear=new T.Color(0x0b1420),skyStorm=new T.Color(0x2a3440),fogClear=new T.Color(0x14202c),fogStorm=new T.Color(0x3a4650);
 scene.background=skyClear.clone();scene.fog=new T.FogExp2(fogClear.getHex(),.012);renderer.toneMappingExposure=1.08;scene.add(new T.AmbientLight(0xbfd6e8,.7));
 const snowMat=new T.MeshStandardMaterial({color:0xcfdbe6,metalness:.05,roughness:.95}),cliffMat=new T.MeshStandardMaterial({color:0x5b6b7a,metalness:.2,roughness:.8}),baseMat=new T.MeshStandardMaterial({color:0x6d7c8c,metalness:.5,roughness:.5}),mastMat=new T.MeshStandardMaterial({color:0x2a3542,metalness:.6,roughness:.4}),hutMat=new T.MeshStandardMaterial({color:0x4a4038,metalness:.2,roughness:.8}),bankMat=new T.MeshStandardMaterial({color:0xe6eef5,metalness:0,roughness:1});
 const surfaces=createChapterSurfaces(scene,renderer,'polar');surfaces.coat(snowMat,'floor');surfaces.coat(bankMat,'floor');surfaces.coat(cliffMat,'cliff');surfaces.coat(hutMat,'wall');surfaces.coat(baseMat,'deck');
 const gold=new T.MeshBasicMaterial({color:0xffc06f}),amber=new T.MeshBasicMaterial({color:0xffb347}),red=new T.MeshBasicMaterial({color:0xff5a6a}),iceMat=new T.MeshStandardMaterial({color:0x8fd3ff,metalness:.4,roughness:.15,transparent:true,opacity:.75});
 const heatDeck=surfaces.coat(amber.clone(),'deck');
 function box(o,mat,solid=false){const m=new T.Mesh(new T.BoxGeometry(o.w,o.top-o.bottom,o.d),mat);m.position.set(o.x,(o.top+o.bottom)/2,o.z);scene.add(m);if(solid)obstacles.push({...o,mesh:m});return m;}
 for(const o of POLAR_FLOORS)box(o,snowMat,true);
 for(const o of POLAR_WALLS)box(o,cliffMat,true);
 for(const o of POLAR_TOWER_BASES){box(o,baseMat,true);if(o.tier===7)box({x:o.x,z:o.z,w:o.w,d:o.d,bottom:o.top,top:o.top+.02},heatDeck).scale.set(.97,1,.97);}
 for(const o of POLAR_MASTS)box(o,mastMat,true);
 const huts=createCoverProps(scene,'hut',{body:hutMat}),banks=createCoverProps(scene,'snowbank',{body:bankMat});
 for(const o of POLAR_HUTS){box(o,hutMat,true);if(o.w>=1&&o.d>=1)huts.dress(o);}
 for(const o of POLAR_BANKS){const m=box(o,o.ledge?cliffMat:bankMat,true);if(!o.ledge){m.visible=false;banks.dress(o);}if(o.starRoute)box({x:o.x,z:o.z,w:o.w,d:o.d,bottom:o.top,top:o.top+.02},gold);}
 huts.commit();banks.commit();
 // Thin-ice lake: flat disc with a cracked ring; not an obstacle.
 const ice=new T.Mesh(new T.CircleGeometry(THIN_ICE.radius,48),iceMat);ice.rotation.x=-Math.PI/2;ice.position.set(THIN_ICE.x,.012,THIN_ICE.z);ice.name='polar-ice';scene.add(ice);
 const iceRim=new T.Mesh(new T.RingGeometry(THIN_ICE.radius-.3,THIN_ICE.radius,48),new T.MeshBasicMaterial({color:0x62c8ff,transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}));iceRim.rotation.x=-Math.PI/2;iceRim.position.set(THIN_ICE.x,.02,THIN_ICE.z);scene.add(iceRim);
 // Antennas and signal beacons on the masts; hut lanterns. Beacons brighten in the storm (the player's landmarks).
 const beacons=TOWERS.map((t,i)=>{const dish=new T.Mesh(new T.ConeGeometry(1.6,.6,6,1,true),new T.MeshStandardMaterial({color:0x9fb4c8,metalness:.6,roughness:.4,side:T.DoubleSide}));dish.position.set(t.x,11.8,t.z);dish.rotation.x=Math.PI;scene.add(dish);const lamp=new T.Mesh(new T.SphereGeometry(.35,10,10),new T.MeshBasicMaterial({color:0xffb347}));lamp.position.set(t.x,12.4,t.z);scene.add(lamp);return {dish,lamp,index:i,lit:i<2};});
 // Hut door lanterns and tower beacons are emissive meshes only (no point lights: keeps the headless/software renderer at usable frame rates, like the other chapters).
 const lanterns=WARM_HUTS.map(h=>{const g=new T.Mesh(new T.BoxGeometry(.3,.3,.3),amber.clone());g.position.set(h.x,2.6,h.z);scene.add(g);return g;});
 const heaters=TOWERS.map(t=>{const m=new T.Mesh(new T.PlaneGeometry(9.4,9.4),new T.MeshBasicMaterial({color:0xff7a3a,transparent:true,opacity:.12,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(t.x,2.415,t.z);scene.add(m);return m;});
 // Snowfall: a particle cloud that only shows during the storm.
 const flakeCount=420,flakes=new Float32Array(flakeCount*3);for(let i=0;i<flakeCount;i++){flakes[i*3]=(Math.random()-.5)*76;flakes[i*3+1]=Math.random()*14;flakes[i*3+2]=(Math.random()-.5)*76;}
 const snow=new T.Points(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(flakes,3)),new T.PointsMaterial({color:0xffffff,size:.16,transparent:true,opacity:0,depthWrite:false}));scene.add(snow);
 function sign(title,sub,x,y,z,width=7,rotation=0){const c=document.createElement('canvas');c.width=768;c.height=192;const g=c.getContext('2d');g.fillStyle='#101a26';g.fillRect(0,0,768,192);g.fillStyle='#ffd48a';g.font='bold 48px sans-serif';g.fillText(title,24,78);g.fillStyle='#bfe3ff';g.font='26px sans-serif';g.fillText(sub,24,140);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map,side:T.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);}
 sign('09 / 极地雷达阵列','POLAR RADAR ARRAY · 暴风雪周期',0,4.5,37.3,9,Math.PI);sign('西塔 / 电源','基座顶加热板',-24,5,-27,6);sign('东塔 / 阵列校准','基座顶加热板',24,5,-27,6);sign('薄冰湖','引 GLACIER 至此压冰',0,2.6,-10,6);
 // HUD: weather + warmth.
 const notice=document.createElement('div');notice.className='hazard-notice polar-notice';notice.hidden=true;document.body.append(notice);
 let time=0,stage=-1,bossActive=false,warmth=WARMTH_MAX,frostAccum=0;const effects=[];
 const intensity=()=>stormIntensity(time),phase=()=>stormPhase(time);
 function setStage(index){if(stage===index)return false;stage=index;beacons[2].lit=index>=2;return false;}
 function burst(p,color){const m=new T.Mesh(new T.IcosahedronGeometry(.12),new T.MeshBasicMaterial({color,transparent:true}));m.position.copy(p);scene.add(m);effects.push({m,life:.3});}
 function clear(){for(const e of effects){scene.remove(e.m);e.m.geometry.dispose();e.m.material.dispose();}effects.length=0;time=0;warmth=WARMTH_MAX;frostAccum=0;notice.hidden=true;}
 function update(dt,t){time+=dt;const s=intensity();
  scene.background.copy(skyClear).lerp(skyStorm,s);scene.fog.color.copy(fogClear).lerp(fogStorm,s);scene.fog.density=(qualityHigh?.012:.018)+s*.16;
  snow.material.opacity=s*.85;if(s>0){const a=snow.geometry.attributes.position;for(let i=0;i<flakeCount;i++){let y=a.array[i*3+1]-dt*(4+s*6);let x=a.array[i*3]+dt*s*5;if(y<0){y=14;}if(x>38)x=-38;a.array[i*3+1]=y;a.array[i*3]=x;}a.needsUpdate=true;}
  for(const b of beacons){b.dish.rotation.y=t*.6+b.index;b.lamp.visible=b.lit;b.lamp.scale.setScalar(b.lit?1+s*.6:1);b.lamp.material.color.setHex(b.lit?(Math.sin(t*3+b.index)>0?0xffb347:0xffd48a):0x333333);}
  for(const l of lanterns)l.scale.setScalar(1+s*.8);
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.m.material.opacity=Math.max(0,e.life/.3);if(e.life<=0){scene.remove(e.m);e.m.geometry.dispose();e.m.material.dispose();effects.splice(i,1);}}}
 // Warmth drains / recovers here; frostbite is returned as hazard damage (4 per second, ticked in whole points).
 function hazardDamage(dt,player){
  const s=intensity(),ph=phase(),rate=warmthRate(player.x,player.z,player.feetY,s);warmth=stepWarmth(warmth,rate,dt);
  const hut=insideHut(player.x,player.z),deck=onTowerDeck(player.x,player.z,player.feetY);
  notice.hidden=false;notice.dataset.phase=warmth<=0?'live':warmth<=WARMTH_WARN||ph==='whiteout'?'warning':'rest';notice.dataset.storm=ph;
  const labels={clear:'晴',closing:'转暴',whiteout:'暴风雪',clearing:'转晴'};const next=secondsToWhiteout(time);
  notice.textContent='天气 '+labels[ph]+' · 能见度 '+Math.round(stormVisibility(time))+' m · 体温 '+Math.round(warmth)+'%'+(hut?' · 暖房回温':deck?' · 加热板':'')+(thermalActive(time)?' · 敌方热成像':'')+(next>0?' · 下次暴风雪 '+Math.ceil(next)+' s':'')+(warmth<=0?' · 冻伤！':warmth<=WARMTH_WARN?' · 体温过低，进暖房':'');
  if(warmth>0)return null;
  frostAccum+=FROST_DAMAGE*dt;if(frostAccum<1)return null;const damage=Math.floor(frostAccum);frostAccum-=damage;return {damage,x:player.x,z:player.z};
 }
 let qualityHigh=true;
 scene.updateMatrixWorld(true);
 return {ceilings:[],setStage,update,burst,clear,hazardDamage,get time(){return time;},get intensity(){return intensity();},get phase(){return phase();},get thermal(){return thermalActive(time);},get warmth(){return warmth;},get visibility(){return stormVisibility(time);},setBossActive:v=>{bossActive=v;},restoreMotion(s){time=Number.isFinite(s?.stormTime)?s.stormTime:0;warmth=Number.isFinite(s?.warmth)?Math.max(0,Math.min(WARMTH_MAX,s.warmth)):WARMTH_MAX;frostAccum=0;},advance(seconds){if(Number.isFinite(seconds)&&seconds>0)time+=seconds;},setWarmth(v){if(Number.isFinite(v))warmth=Math.max(0,Math.min(WARMTH_MAX,v));},setQuality:high=>{surfaces.quality(high);qualityHigh=high;}};
}
