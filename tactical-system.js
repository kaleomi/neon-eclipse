import * as T from './node_modules/three/build/three.module.js';
import {createEmpSystem} from './emp-system.js';
import {empLaunch,advanceEmp,predictEmp} from './emp-world.js';
import {voltAnchor,voltClearPath} from './volt-world.js';
import {TACTICAL,freshTactical,validTactical,segmentInSmoke} from './tactical-rules.js';
const copy=v=>JSON.parse(JSON.stringify(v));
// EMP keeps its original implementation and save field; utility payloads are a separate extension.
export function createTacticalThrowables({scene,camera,enemies,obstacles,projectiles,getKind=()=> 'emp',onEvent=()=>{},onUtility=()=>{},onPulse=()=>{}}){
 const emp=createEmpSystem({scene,camera,enemies,obstacles,projectiles,onEvent});
 let state=freshTactical(),opaque,aim=null,preview=null,previewTime=0,flight=null;const fields=[];
 function dispose(o){if(!o)return;scene.remove(o);o.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});}
 function direction(){camera.updateMatrixWorld(true);return camera.getWorldDirection(new T.Vector3());}
 function clearPath(a,b,owner){const meshes=obstacles.filter(o=>o.owner!==owner).map(o=>o.mesh);meshes.forEach(m=>m.updateWorldMatrix(true,false));return voltClearPath(a,b,meshes);}
 function ring(point,kind){const g=new T.Group(),cfg=TACTICAL[kind],m=new T.LineBasicMaterial({color:cfg.color,transparent:true,opacity:.6,depthWrite:false});const points=[];for(let j=0;j<64;j++)for(const i of [j,j+1])points.push(new T.Vector3(Math.cos(i*Math.PI/32)*cfg.radius,0,Math.sin(i*Math.PI/32)*cfg.radius));g.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(points),m));g.position.copy(point);g.traverse(o=>o.raycast=()=>{});return g;}
 function refresh(){dispose(preview);const prediction=predictEmp(camera.position,direction(),obstacles);preview=ring(prediction.point,aim);preview.name='TACTICAL_PREVIEW';const line=new T.Line(new T.BufferGeometry().setFromPoints(prediction.points),new T.LineBasicMaterial({color:TACTICAL[aim].color,transparent:true,opacity:.6}));line.position.copy(prediction.point).negate();line.raycast=()=>{};preview.add(line);scene.add(preview);previewTime=.12;}
 function cancelAim(){emp.cancelAim();aim=null;dispose(preview);preview=null;}
 function charges(){return getKind()==='emp'?emp.charges:opaque===undefined?(state.charges[getKind()]??0):0;}
 function begin(){if(emp.active||flight||emp.aiming||aim)return false;if(getKind()==='emp')return emp.begin();if(!TACTICAL[getKind()]||charges()<=0)return false;aim=getKind();refresh();return true;}
 function release(){if(emp.aiming)return emp.release();if(!aim)return false;const kind=aim;cancelAim();if(flight||emp.active||opaque!==undefined||state.charges[kind]<=0)return false;state.charges[kind]--;
  const mesh=new T.Mesh(new T.IcosahedronGeometry(.12,1),new T.MeshBasicMaterial({color:TACTICAL[kind].color}));mesh.name='TACTICAL_GRENADE';mesh.raycast=()=>{};const body=empLaunch(camera.position,direction(),obstacles);mesh.position.copy(body.position);scene.add(mesh);flight={kind,body,mesh};onUtility('throw',kind,0);return true;
 }
 function detonate(kind,point){const cfg=TACTICAL[kind];let affected=0;
  if(kind==='pulse'){
   for(const e of enemies){if(e.hp<=0||e.boss)continue;const p=voltAnchor(e);if(p.distanceTo(point)<=cfg.radius&&clearPath(point,p,e.group)){e.blindRemaining=cfg.duration;projectiles.cancelOwner(e.group);e.charge=0;affected++;}}
   onPulse(point);
  }
  const position=point.clone().add(new T.Vector3(0,kind==='decoy'?1.1:kind==='smoke'?1.2:0,0)),visual=ring(position,kind);visual.name='TACTICAL_'+kind.toUpperCase();
  if(kind==='smoke'){for(const r of [1,.78,.5]){const cloud=new T.Mesh(new T.SphereGeometry(cfg.radius*r,16,10),new T.MeshBasicMaterial({color:cfg.color,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide}));cloud.raycast=()=>{};visual.add(cloud);}}
  if(kind==='decoy'){const beacon=new T.Mesh(new T.OctahedronGeometry(.22),new T.MeshBasicMaterial({color:cfg.color}));beacon.raycast=()=>{};visual.add(beacon);}
  scene.add(visual);fields.push({kind,position,visual,remaining:kind==='pulse'?.4:cfg.duration});onUtility('burst',kind,affected);
 }
 function smokeBlocked(origin,target){return origin.distanceTo(target)>3&&fields.some(f=>f.kind==='smoke'&&segmentInSmoke(origin,target,f.position,4));}
 function allowPending(origin,target,boss,owner){if(boss)return true;const e=enemies.find(e=>e.group===owner);return !(e?.blindRemaining>0)&&!smokeBlocked(origin,target);}
 function attackTarget(origin,target,boss,owner){if(boss)return target;const e=enemies.find(e=>e.group===owner);if(e?.blindRemaining>0)return null;
  const decoys=fields.filter(f=>f.kind==='decoy'&&Math.abs(origin.y-f.position.y)<=2&&origin.distanceTo(f.position)<=16&&clearPath(origin,f.position,owner)&&!smokeBlocked(origin,f.position)).sort((a,b)=>origin.distanceToSquared(a.position)-origin.distanceToSquared(b.position));
  const result=decoys[0]?.position||target;return smokeBlocked(origin,result)?null:result;
 }
 function update(dt){if(!Number.isFinite(dt)||dt<0)return;emp.update(dt);for(const e of enemies)e.blindRemaining=Math.max(0,(e.blindRemaining||0)-dt);
  if(aim){previewTime-=dt;if(previewTime<=0)refresh();}
  for(let i=fields.length-1;i>=0;i--){const f=fields[i];f.remaining-=dt;if(f.remaining<=0){dispose(f.visual);fields.splice(i,1);}else{f.visual.rotation.y+=dt;f.visual.children[0].material.opacity=Math.min(.6,f.remaining*.6);}}
  if(flight){advanceEmp(flight.body,dt,obstacles);flight.mesh.position.copy(flight.body.position);if(flight.body.remaining===0){const {kind,body,mesh}=flight;flight=null;dispose(mesh);detonate(kind,body.position.clone());}}
 }
 function clear(){emp.clear();cancelAim();if(flight)dispose(flight.mesh);flight=null;fields.forEach(f=>dispose(f.visual));fields.length=0;for(const e of enemies)delete e.blindRemaining;}
 return {begin,release,cancelAim,update,clear,attackTarget,allowPending,reset(empValue,value,{checkpoint=false}={}){clear();emp.reset(empValue);opaque=value!==undefined&&!validTactical(value)?copy(value):undefined;state=validTactical(value)?copy(value):freshTactical(checkpoint||opaque!==undefined?0:2);},checkpoint:()=>({...emp.checkpoint(),tactical:copy(opaque===undefined?state:opaque)}),get kind(){return getKind();},get charges(){return charges();},get aiming(){return emp.aiming||!!aim;},get active(){return emp.active||!!flight;},get remaining(){return flight?.body.remaining??emp.remaining;},snapshot:()=>({kind:getKind(),charges:copy(state.charges),unsupported:opaque!==undefined,fields:fields.map(f=>({kind:f.kind,remaining:f.remaining,position:f.position.toArray()}))})};
}
