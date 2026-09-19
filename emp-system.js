import * as T from './node_modules/three/build/three.module.js';
import {EMP,restoreEmpCharges} from './emp-rules.js';
import {empLaunch,advanceEmp,predictEmp,applyEmp,empVisual} from './emp-world.js';
export function createEmpSystem({scene,camera,enemies,obstacles,projectiles,onEvent=()=>{}}){
 let charges=EMP.capacity,aiming=false,flight=null,preview=null,previewTimer=0;const pulses=[];
 const material=(opacity=1)=>new T.MeshBasicMaterial({color:0x96a8ff,transparent:true,opacity,depthWrite:false});
 function dispose(object){if(!object)return;scene.remove(object);object.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});}
 function sphere(point,opacity){const points=[];for(let axis=0;axis<3;axis++)for(let i=0;i<64;i++)for(const n of [i,i+1]){const a=n*Math.PI/32,c=Math.cos(a)*EMP.radius,s=Math.sin(a)*EMP.radius;points.push(new T.Vector3(axis===0?0:c,axis===1?0:axis===0?c:s,axis===2?0:s));}const mesh=new T.LineSegments(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x96a8ff,transparent:true,opacity,depthWrite:false}));mesh.position.copy(point);mesh.raycast=()=>{};return mesh;}
 function direction(){camera.updateMatrixWorld(true);return camera.getWorldDirection(new T.Vector3());}
 function refreshPreview(){dispose(preview);const predicted=predictEmp(camera.position,direction(),obstacles);preview=new T.Group();preview.name='EMP_PREVIEW';const area=sphere(predicted.point,.35),line=new T.Line(new T.BufferGeometry().setFromPoints(predicted.points),new T.LineBasicMaterial({color:0xc7d0ff,transparent:true,opacity:.8,depthWrite:false}));line.raycast=()=>{};const marker=new T.Mesh(new T.OctahedronGeometry(.16),material(.9));marker.position.copy(predicted.point);marker.raycast=()=>{};preview.add(area,line,marker);scene.add(preview);previewTimer=.12;}
 function cancelAim(){aiming=false;dispose(preview);preview=null;}
 function begin(){if(aiming||!charges||flight)return false;aiming=true;refreshPreview();return true;}
 function release(){if(!aiming)return false;cancelAim();if(!charges||flight)return false;
  const state=empLaunch(camera.position,direction(),obstacles),mesh=new T.Mesh(new T.IcosahedronGeometry(EMP.bodyRadius,1),material());mesh.name='EMP_GRENADE';mesh.raycast=()=>{};mesh.position.copy(state.position);scene.add(mesh);flight={state,mesh};charges--;onEvent('throw',0);return true;
 }
 function update(dt){
  if(!Number.isFinite(dt)||dt<0)return;
  for(const e of enemies){const was=e.empRemaining>0;e.empBlocked=was;if(was){e.empRemaining=Math.max(0,e.empRemaining-dt);empVisual(e,true);if(e.empRemaining===0){e.attack=Math.max(e.attack||0,EMP.recovery);empVisual(e,false);}}}
  for(const e of enemies){if(e.shieldDownRemaining>0){e.shieldDownRemaining=Math.max(0,e.shieldDownRemaining-dt);if(e.shieldDownRemaining===0)empVisual(e,false);}}
  if(aiming){previewTimer-=dt;if(previewTimer<=0)refreshPreview();}
  for(let i=pulses.length-1;i>=0;i--){const p=pulses[i];p.life-=dt;p.mesh.material.opacity=Math.max(0,p.life/.55)*.48;if(p.life<=0){dispose(p.mesh);pulses.splice(i,1);}}
  if(flight){advanceEmp(flight.state,dt,obstacles);flight.mesh.position.copy(flight.state.position);flight.mesh.rotation.y+=dt*5;
   if(flight.state.remaining===0){const point=flight.state.position.clone(),affected=applyEmp(point,enemies,obstacles,projectiles);affected.forEach(e=>empVisual(e,true));dispose(flight.mesh);flight=null;const mesh=sphere(point,.48);mesh.name='EMP_PULSE';scene.add(mesh);pulses.push({mesh,life:.55});onEvent('burst',affected.length);}
  }
 }
 function clear(){cancelAim();if(flight)dispose(flight.mesh);flight=null;for(const p of pulses)dispose(p.mesh);pulses.length=0;for(const e of enemies){if(e.empRemaining>0)empVisual(e,false);delete e.empRemaining;delete e.empBlocked;if(e.shieldDownRemaining>0)empVisual(e,false);delete e.shieldDownRemaining;}}
 return {begin,release,cancelAim,update,clear,reset(value){clear();charges=restoreEmpCharges(value);},checkpoint:()=>({emp:{charges}}),get charges(){return charges;},get aiming(){return aiming;},get active(){return !!flight;},get remaining(){return flight?.state.remaining??0;}};
}
