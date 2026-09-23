import {boardingStatus,mayCloseBoardingGate} from './boarding-rules.js';
import * as T from '../node_modules/three/build/three.module.js';
import {SERVICE_STAIRS,SERVICE_DECKS,createTransport} from './transport-rules.js';
export function createTransportWorld(scene,volumes,obstacles){
 const mat=new T.MeshStandardMaterial({color:0x648491,metalness:.6,roughness:.4}),light=new T.MeshBasicMaterial({color:0xffc16c});
 function box(o,material=mat){const m=new T.Mesh(new T.BoxGeometry(o.w,o.top-o.bottom,o.d),material);m.position.set(o.x,(o.top+o.bottom)/2,o.z);scene.add(m);return m;}
 for(const def of [...SERVICE_STAIRS,...SERVICE_DECKS]){const o={...def};volumes.push(o);const mesh=box(o);obstacles.push({...o,h:o.top,mesh});box({x:o.x,z:o.z,w:o.w,d:.045,bottom:o.top,top:o.top+.025},light);}
 const volume={x:35,z:5,w:2,d:3,bottom:-.25,top:0};volumes.push(volume);const mesh=box(volume);const transport=createTransport(volume);
 const ring=new T.Mesh(new T.BoxGeometry(1.85,.035,2.85),new T.MeshBasicMaterial({color:0x79ffea,wireframe:true}));mesh.add(ring);ring.position.y=.15;
 // The two rails show the actual horizontal transport route, not a moving background.
 for(const x of [34.2,35.8])box({x,z:10.5,w:.08,d:11,bottom:2.55,top:2.65},light);
 const gates=[{x:34.05,z:5,w:.12,d:3,bottom:3,top:4.15,dock:'upper'},{x:34.05,z:16,w:.12,d:3,bottom:3,top:4.15,dock:'far'}].map(def=>({...def,mesh:box(def,new T.MeshBasicMaterial({color:0xffa24c,transparent:true,opacity:.6})),closed:false}));
 function updateGates(player,feet){
  const status=boardingStatus(transport.time);
  for(const g of gates){const close=status.dock!==g.dock&&mayCloseBoardingGate(player,feet,g);g.mesh.visible=close;const i=volumes.indexOf(g);if(close&&i<0)volumes.push(g);if(!close&&i>=0)volumes.splice(i,1);g.closed=close;}
 }
 const hint=document.createElement('div');hint.style.cssText='position:fixed;left:24px;top:220px;max-width:270px;padding:10px;background:#092637df;border:1px solid #73cdd3;color:#d5fffb;font:12px sans-serif;pointer-events:none;z-index:8';document.body.append(hint);
 function sync(player,playing){
  mesh.position.set(volume.x,(volume.top+volume.bottom)/2,volume.z);hint.hidden=!playing||Math.hypot(player.x-30,player.z-8)>18;
  const status=boardingStatus(transport.time);
  hint.textContent='可选星星挑战 / 远端泊位 → 窄平台跳跃\n升降运输车：'+transport.pose.label+(status.dock?' · '+Math.ceil(status.remaining)+' 秒后出发':' · 请在橙色安全门后等待')+'\n青色车台停靠后上车；门口有人时安全门不会强行关闭';hint.style.whiteSpace='pre-line';
 }
 function tick(dt,player,motion){if(dt<=0)return false;const riding=transport.tick(dt,player,motion);updateGates(player,motion.state.y);mesh.position.set(volume.x,(volume.top+volume.bottom)/2,volume.z);mesh.updateMatrixWorld(true);return riding;}
 function reset(time=0,completed=false){transport.reset(time,completed);for(const g of gates){const i=volumes.indexOf(g);if(i>=0)volumes.splice(i,1);g.mesh.visible=false;g.closed=false;}}
 return {reset,tick,sync,get tripCompleted(){return transport.tripCompleted;},get time(){return transport.time;}};
}
