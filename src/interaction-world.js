import * as T from '../node_modules/three/build/three.module.js';
import {createVentConsole,createLightSwitch} from './interaction-rules.js';
import {createEnvironmentPropLibrary,getEnvironmentPropParts} from './environment-prop-models.js';
// Meshes, colliders and visuals for the two shared chapter interactions. Rules live in interaction-rules.js.
export function createInteractionWorld(scene,obstacles,layout,{lights=[],onTopologyChange=()=>{},onEvent=()=>{}}={}){
 if(!layout)return null;
 const group=new T.Group();scene.add(group);const propLibrary=createEnvironmentPropLibrary();let disposed=false;
 const consoleMat=new T.MeshStandardMaterial({color:0x2c3a44,metalness:.55,roughness:.45,emissive:0x0f2a2f,emissiveIntensity:.5});
 function pedestal(x,z,y,accent,type){const m=new T.Mesh(new T.BoxGeometry(.6,1.1,.6),consoleMat.clone());m.position.set(x,y+.55,z);m.userData.interactionConsole=true;m.material.visible=false;group.add(m);
  const visual=propLibrary.create(type);visual.position.y=-.55;m.add(visual);const top=getEnvironmentPropParts(visual).status;
  const ring=new T.Mesh(new T.TorusGeometry(.42,.03,6,24),new T.MeshBasicMaterial({color:accent,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.y=-.54;m.add(ring);
  obstacles.push({x,z,w:.6,h:1.1,d:.6,bottom:y,top:y+1.1,mesh:m,cover:false,interaction:true});return {mesh:m,top,ring};}
 const vent=createVentConsole(layout.vent),light=createLightSwitch(layout.light);
 const ventProps=pedestal(vent.x,vent.z,vent.y,0x6ff2d4,'vent'),lightProps=pedestal(light.x,light.z,light.y,0xffd36a,'light');
 // Steam cloud: translucent cylinder + rising sprites, only visible while active.
 const zoneY=layout.vent.zone.y??vent.y;
 const cloud=new T.Mesh(new T.CylinderGeometry(vent.rules.radius,vent.rules.radius*.8,2.4,20,1,true),new T.MeshBasicMaterial({color:0xbff7ff,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));cloud.position.set(vent.zone.x,zoneY+1.2,vent.zone.z);cloud.visible=false;group.add(cloud);
 const floorRing=new T.Mesh(new T.RingGeometry(vent.rules.radius-.1,vent.rules.radius,32),new T.MeshBasicMaterial({color:0x6ff2d4,transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide}));floorRing.rotation.x=-Math.PI/2;floorRing.position.set(vent.zone.x,zoneY+.03,vent.zone.z);group.add(floorRing);
 const nozzle=propLibrary.create('nozzle');nozzle.position.set(vent.zone.x,zoneY,vent.zone.z);group.add(nozzle);
 // Base intensities are sampled when the lights go dark (quality presets may rescale them after construction) and restored exactly.
 let baseIntensity=null,time=0;
 function applyLights(){const lit=light.lit;if(!lit&&!baseIntensity)baseIntensity=lights.map(l=>l.intensity);if(!lit)lights.forEach((l,i)=>{l.intensity=baseIntensity[i]*.28;});else if(baseIntensity){lights.forEach((l,i)=>{l.intensity=baseIntensity[i];});baseIntensity=null;}lightProps.top.material.color.setHex(lit?0xffd36a:0x5a4a2a);}
 function update(dt,ctx){
  time+=dt;
  const v=vent.tick(dt,ctx);if(v==='started')onEvent({type:'vent',x:vent.zone.x,z:vent.zone.z,seconds:vent.rules.duration});
  const l=light.tick(dt,ctx);if(l==='lit'||l==='dark'){applyLights();onEvent({type:l,x:light.x,z:light.z});}
  const active=vent.state.active>0;cloud.visible=active;if(active){cloud.material.opacity=.18+.08*Math.sin(time*6);cloud.rotation.y+=dt*.4;cloud.scale.y=1+.05*Math.sin(time*3);}
  floorRing.material.opacity=active?.6:vent.ready?.35:.12;ventProps.top.material.color.setHex(active?0xffffff:vent.ready?0x6ff2d4:0x3a5c58);
  ventProps.ring.scale.setScalar(1+.4*vent.progress);lightProps.ring.scale.setScalar(1+.4*light.progress);
 }
 function reset(){vent.reset();light.reset();applyLights();cloud.visible=false;}
 function prompt(player,feetY){if(vent.inReach(player,feetY))return vent.hint;if(light.inReach(player,feetY))return light.hint;return '';}
 function dispose(){
  if(disposed)return;disposed=true;
  for(let i=obstacles.length-1;i>=0;i--)if(obstacles[i].interaction)obstacles.splice(i,1);
  const geometries=new Set(),materials=new Set();
  group.traverse(o=>{if(o.userData.environmentPropVisual)return;if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());consoleMat.dispose();propLibrary.dispose();
  scene.remove(group);onTopologyChange();
 }
 applyLights();
 return {vent,light,update,reset,prompt,dispose,theme:layout.theme,get snapshot(){return {vent:{...vent.state},light:{...light.state}};}};
}
