import * as T from '../node_modules/three/build/three.module.js';
import {weatherParams} from './weather-rules.js';
// Applies a resolved weather preset to the shared scene: fog density/tint, light scale, a particle sheet
// around the camera. Static per session (set once) so interaction-world light sampling stays exact.
// World-owned chapters (harbor rain, polar storm) skip the visual half; only `params.rangeScale` is exposed.
export function createWeatherWorld(scene,{lights=[],weather,camera,count=900}){
 const params=weatherParams(weather);
 const owned=Boolean(weather?.worldOwned);
 const baseFog=scene.fog?.density??0,baseColor=scene.fog?.color.clone()||null,baseBackground=scene.background?.isColor?scene.background.clone():null;
 const baseLights=lights.map(l=>l.intensity);
 let points=null,velocity=0,spread=18;
 function apply(){
  if(owned||params.intensity<=0)return;
  if(scene.fog){scene.fog.density=baseFog*params.fogScale;if(params.fogTint!==null){scene.fog.color.copy(baseColor).lerp(new T.Color(params.fogTint),params.tintMix);if(baseBackground&&scene.background?.isColor)scene.background.copy(baseBackground).lerp(new T.Color(params.fogTint),params.tintMix*.7);}}
  lights.forEach((l,i)=>{l.intensity=baseLights[i]*params.lightScale;});
  if(params.particles&&!points){
   const n=Math.max(1,Math.round(count*params.particleDensity)),pos=new Float32Array(n*3);
   for(let i=0;i<n;i++){pos[i*3]=(Math.random()-.5)*spread*2;pos[i*3+1]=Math.random()*12;pos[i*3+2]=(Math.random()-.5)*spread*2;}
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(pos,3));
   const material=new T.PointsMaterial({color:params.particles==='rain'?0x9fd8ff:params.particles==='snow'?0xe8f6ff:0xd6b27a,size:params.particles==='rain'?.06:.12,transparent:true,opacity:params.particles==='dust'?.45:.7,depthWrite:false});
   points=new T.Points(geometry,material);points.frustumCulled=false;points.userData.weather=true;points.raycast=()=>{};scene.add(points);
   velocity=params.particles==='rain'?14:params.particles==='snow'?1.6:.9;
  }
 }
 apply();
 // Move particles relative to the camera; when dt is 0 (paused) nothing moves.
 function update(dt){
  if(!points||dt<=0)return;
  const a=points.geometry.attributes.position,arr=a.array,cx=camera.position.x,cz=camera.position.z,dust=params.particles==='dust';
  for(let i=0;i<a.count;i++){
   const j=i*3;arr[j+1]-=velocity*dt;if(dust){arr[j]+=dt*3.5;}
   if(arr[j+1]<camera.position.y-3){arr[j+1]=camera.position.y+9;arr[j]=cx+(Math.random()-.5)*spread*2;arr[j+2]=cz+(Math.random()-.5)*spread*2;}
   if(Math.abs(arr[j]-cx)>spread)arr[j]=cx+(Math.random()-.5)*spread*2;
   if(Math.abs(arr[j+2]-cz)>spread)arr[j+2]=cz+(Math.random()-.5)*spread*2;
  }
  a.needsUpdate=true;
 }
 function setQuality(high){if(points)points.visible=high||params.particles==='rain';}
 // World modules' setQuality may rewrite fog density; re-apply the weathered density relative to the current base.
 function reapply(){if(owned||params.intensity<=0||!scene.fog)return;if(Math.abs(scene.fog.density-baseFog*params.fogScale)>1e-9)scene.fog.density=baseFog*params.fogScale;}
 return {params,owned,update,setQuality,reapply,get fogDensity(){return scene.fog?.density??0;},get particleCount(){return points?points.geometry.attributes.position.count:0;},get baseFog(){return baseFog;},
  snapshot(){return {id:params.id,intensity:params.intensity,owned,fog:scene.fog?.density??0,baseFog,lights:lights.map(l=>l.intensity),baseLights:[...baseLights],particles:points?points.geometry.attributes.position.count:0};}};
}
