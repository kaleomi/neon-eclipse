import * as T from './node_modules/three/build/three.module.js';
import {TOWER_FLOORS,TOWER_STAIRS,TOWER_WALLS,TOWER_RAILS,TOWER_GATES} from './tower-data.js';
import {createTowerLift} from './tower-lift.js';
import {mayCloseBoardingGate} from './boarding-rules.js';
export function createTowerWorld(scene,renderer,obstacles){
 scene.add(new T.AmbientLight(0xb8c4dd,.45));
 scene.background=new T.Color(0x111323);scene.fog=new T.FogExp2(0x161b31,.009);renderer.toneMappingExposure=1.15;
 const floorMat=new T.MeshStandardMaterial({color:0x667181,metalness:.55,roughness:.42}),wallMat=new T.MeshStandardMaterial({color:0x202839,metalness:.4,roughness:.65}),stepMat=new T.MeshStandardMaterial({color:0x708794,metalness:.5,roughness:.5});
 const cyan=new T.MeshBasicMaterial({color:0x78eadb}),gold=new T.MeshBasicMaterial({color:0xffc06f}),purple=new T.MeshBasicMaterial({color:0xb198ff});
 function box(o,mat=wallMat,solid=false){const m=new T.Mesh(new T.BoxGeometry(o.w,o.top-o.bottom,o.d),mat);m.position.set(o.x,(o.top+o.bottom)/2,o.z);scene.add(m);if(solid){o.h=o.top;o.mesh=m;obstacles.push(o);}return m;}
 for(const def of [...TOWER_FLOORS,...TOWER_STAIRS,...TOWER_WALLS,...TOWER_RAILS]){const o={...def};box(o,TOWER_FLOORS.includes(def)?floorMat:def.walkStep?stepMat:wallMat,true);}
 for(const o of TOWER_STAIRS)box({x:o.x-.22,z:o.z,w:.045,d:o.d,bottom:o.top,top:o.top+.035},gold);
 for(const o of TOWER_FLOORS.slice(1))for(const z of [-1,1])box({x:o.x,z:o.z+z*(o.d/2-.2),w:o.w-.4,d:.06,bottom:o.top+.02,top:o.top+.05},o.top===3?cyan:purple);
 for(let x=-28;x<=28;x+=4)box({x,z:0,w:.025,d:46,bottom:.005,top:.015},new T.MeshBasicMaterial({color:0x30475c}));
 for(let z=-22;z<=22;z+=4)box({x:0,z,w:58,d:.025,bottom:.005,top:.015},new T.MeshBasicMaterial({color:0x30475c}));
 for(const z of [-23.7,23.7])for(let x=-26;x<=26;x+=8){box({x,z,w:.15,d:.12,bottom:0,top:11},purple);for(let y=2;y<11;y+=3)box({x,z,w:5,d:.08,bottom:y,top:y+.12},cyan);}
 for(const x of [-29.7,29.7])for(let z=-20;z<=20;z+=8){box({x,z,w:.12,d:.15,bottom:0,top:11},gold);}
 const core=new T.Group();core.position.set(8,8,0);scene.add(core);const orb=new T.Mesh(new T.IcosahedronGeometry(.85,1),purple);core.add(orb);for(const y of [-1.3,1.3]){const ring=new T.Mesh(new T.TorusGeometry(1.3,.055,8,48),gold);ring.rotation.x=Math.PI/2;ring.position.y=y;core.add(ring);}
 const lamp=new T.PointLight(0xa597ff,35,16);lamp.position.set(8,8.8,0);scene.add(lamp);
 function sign(text,sub,x,y,z,rotation=0){const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#121b2e';ctx.fillRect(0,0,768,192);ctx.fillStyle='#f3c382';ctx.font='bold 44px sans-serif';ctx.fillText(text,24,74);ctx.fillStyle='#95e5e0';ctx.font='25px monospace';ctx.fillText(sub,24,140);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(8,2),new T.MeshBasicMaterial({map,side:T.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);}
 sign('第四章 / 多层中枢塔','04 / THE CONTROL SPIRE',-24,5,-23.6);sign('设备层 / 3 METRES','STAIRS 01 > SERVICE',-8,5,9.8,Math.PI);sign('核心层 / 6 METRES','STAIRS 02 > CORE',6,8,9.8,Math.PI);sign('返回大厅 / LIFT','UNLOCK AFTER CORE ACCESS',18,5,6,-Math.PI/2);
 const gates=TOWER_GATES.map(d=>{const o={...d};box(o,gold,true);return o;});
 const liftVolume={x:13.5,z:6,w:3,d:3.6,bottom:-.25,top:0,dynamic:true};box(liftVolume,stepMat,true);const lift=createTowerLift(liftVolume);
 const rim=new T.Mesh(new T.BoxGeometry(2.85,.05,3.45),new T.MeshBasicMaterial({color:0x77ffdc,wireframe:true}));liftVolume.mesh.add(rim);rim.position.y=.15;
 const entryGate={x:12.08,z:6,w:.12,d:3.8,bottom:6,top:7.2};entryGate.mesh=box(entryGate,gold);const ceilings=[entryGate];
 const hint=document.createElement('div');hint.className='tower-status';hint.style.cssText='position:fixed;left:24px;top:190px;max-width:290px;padding:10px 14px;border:1px solid #ab9bd8;color:#dcd5f7;background:#171b30e8;font:12px/1.6 sans-serif;pointer-events:none;z-index:7';document.body.append(hint);
 let stage=-1,feet=0;const bursts=[];
 function setStage(index){if(index===stage)return false;stage=index;for(const g of gates){const closed=index<g.openAt;g.mesh.visible=closed;const i=obstacles.indexOf(g);if(closed&&i<0)obstacles.push(g);if(!closed&&i>=0)obstacles.splice(i,1);}return true;}
 function syncLift(){liftVolume.mesh.position.y=(liftVolume.top+liftVolume.bottom)/2;liftVolume.mesh.updateMatrixWorld(true);}
 function beforeMotion(dt,player,motion,enemies){if(stage>=3)lift.tick(dt,player,motion,enemies);feet=motion.state.y;const closed=(stage<3||lift.pose.dock!=='upper')&&mayCloseBoardingGate(player,feet,entryGate);entryGate.mesh.visible=closed;const i=ceilings.indexOf(entryGate);if(closed&&i<0)ceilings.push(entryGate);if(!closed&&i>=0)ceilings.splice(i,1);syncLift();}
 function restoreMotion(snapshot){lift.reset(snapshot?.towerLiftTime||0);syncLift();}
 function burst(position,color,count=10){if(bursts.length>24)return;const m=new T.Mesh(new T.IcosahedronGeometry(.11,0),new T.MeshBasicMaterial({color,transparent:true}));m.position.copy(position);scene.add(m);bursts.push({m,life:.25});}
 function clear(){for(const b of bursts){scene.remove(b.m);b.m.geometry.dispose();b.m.material.dispose();}bursts.length=0;}
 function update(dt,time){core.rotation.y=time*.4;orb.rotation.x=time*.2;hint.textContent='中枢塔 / 当前高度 '+feet.toFixed(1)+' m · 0 / 3 / 6 米三层\n'+(stage<3?'沿金色台阶逐层推进；核心授权后开启东侧升降机':lift.pose.dock==='upper'?'升降机已到核心层 / 可以登车':lift.pose.dock==='ground'?'升降机停靠大厅 / 可等待下一趟':'升降机运行中 / 请在安全门后等待');hint.style.whiteSpace='pre-line';for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.life-=dt;b.m.scale.multiplyScalar(1+dt*6);b.m.material.opacity=Math.max(0,b.life/.25);if(b.life<=0){scene.remove(b.m);b.m.geometry.dispose();b.m.material.dispose();bursts.splice(i,1);}}}
 setStage(0);scene.updateMatrixWorld(true);return {ceilings,setStage,update,clear,burst,beforeMotion,restoreMotion,get liftTime(){return lift.time;},setQuality:high=>{lamp.visible=high;scene.fog.density=high?.009:.014;}};
}
