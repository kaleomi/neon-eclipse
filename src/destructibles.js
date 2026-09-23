import * as T from '../node_modules/three/build/three.module.js';
import {createDurability,overlapsRestoredPlayer,PANEL_HP} from './destructible-rules.js';

// Adopts existing authored mesh/collider pairs: rail flags and dimensions stay intact.
// Shared obstacle-array identity is preserved. Reset reuses all GPU resources.
export function createDestructibles(scene,obstacles,entries,{onTopologyChange=()=>{},onBreak=()=>{},idPrefix='reactor'}={}){
 const records=[],byMesh=new Map(),owned=new T.Group();owned.name='destructible-feedback';scene.add(owned);
 function label(){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.minFilter=T.LinearFilter;texture.generateMipmaps=false;
  const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.scale.set(2.8,.7,1);owned.add(sprite);
  return {canvas,ctx,texture,sprite};
 }
 function paint(r){
  const s=r.durability.snapshot(),broken=s.broken;r.mesh.visible=r.enabled&&!broken;
  r.mesh.material.color.copy(r.baseColor).multiplyScalar(.55+.45*s.ratio);
  r.cracks.visible=r.enabled&&!broken&&s.ratio<=2/3;
  r.cracks.geometry.setDrawRange(0,s.ratio<=1/3?24:12);
  if(!r.label)return;
  const {ctx,texture}=r.label;ctx.clearRect(0,0,512,128);
  const path=()=>{ctx.beginPath();ctx.moveTo(18,3);ctx.lineTo(491,3);ctx.lineTo(509,21);ctx.lineTo(509,110);ctx.lineTo(493,125);ctx.lineTo(3,125);ctx.lineTo(3,18);ctx.closePath();};
  path();const gradient=ctx.createLinearGradient(0,0,0,128);gradient.addColorStop(0,'rgba(31,64,70,.96)');gradient.addColorStop(.45,'rgba(8,29,35,.95)');gradient.addColorStop(1,'rgba(3,14,21,.96)');ctx.fillStyle=gradient;ctx.fill();
  const accent=broken?'#7da1a5':s.ratio<=1/3?'#ff9663':'#ffc18b';ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='rgba(129,214,222,.35)';ctx.lineWidth=1;ctx.strokeRect(12,12,488,104);ctx.fillStyle='rgba(201,250,255,.16)';ctx.fillRect(22,14,451,2);
  ctx.fillStyle=accent;ctx.textAlign='center';ctx.font='bold 36px sans-serif';ctx.fillText(broken?'隔板已击碎':'可击碎检修隔板',256,49);
  ctx.font='26px sans-serif';ctx.fillStyle='#d1e8ec';ctx.fillText(broken?'通行 / 射界已打开':`${Math.ceil(s.hp)} / ${s.maxHp}  ·  磁轨可穿透`,256,96);texture.needsUpdate=true;
 }
 for(const [index,mesh] of entries.entries()){
  const collider=obstacles.find(o=>o.mesh===mesh);if(!collider||byMesh.has(mesh))throw new Error('Destructible requires a unique authored collider');
  const points=[];
  for(const path of [[[-.8,.6],[-.3,.22],[.05,.35],[.3,-.3]],[[.75,.5],[.25,.1],[.4,-.2],[-.4,-.68]]])for(const z of [-.064,.064])for(let i=1;i<path.length;i++)points.push(...path[i-1],z,...path[i],z);
  const cracks=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points,3)),new T.LineBasicMaterial({color:0xffe0b4}));mesh.add(cracks);
  const r={id:`${idPrefix}-foil-${index+1}`,mesh,collider,durability:createDurability(PANEL_HP),baseColor:mesh.material.color.clone(),cracks,label:label(),enabled:true};
  mesh.userData.destructibleId=r.id;if(r.label)r.label.sprite.position.copy(mesh.position).add(new T.Vector3(0,1.35,0));
  records.push(r);byMesh.set(mesh,r);paint(r);
 }
 const shardGeometry=new T.BoxGeometry(.075,.12,.03),shardMaterial=new T.MeshBasicMaterial({color:0xba8059});
 const shards=Array.from({length:20},()=>{const mesh=new T.Mesh(shardGeometry,shardMaterial);mesh.visible=false;owned.add(mesh);return {mesh,life:0,velocity:new T.Vector3()};});
 function removeCollider(r){const i=obstacles.indexOf(r.collider);if(i<0)return false;obstacles.splice(i,1);return true;}
 function suspend(){let changed=false;for(const r of records){changed=removeCollider(r)||changed;r.enabled=false;r.mesh.visible=false;if(r.label)r.label.sprite.visible=false;}for(const s of shards){s.life=0;s.mesh.visible=false;}if(changed)onTopologyChange();}
 function reset(player=null){
  suspend();let changed=false;
  for(const r of records){r.durability.reset();r.enabled=!overlapsRestoredPlayer(r.collider,player);if(r.enabled){obstacles.push(r.collider);changed=true;}paint(r);}
  if(changed)onTopologyChange();
 }
 function hit(mesh,damage){
  const r=byMesh.get(mesh);if(!r?.enabled)return null;
  const result=r.durability.hit(damage);if(!result.changed)return result;
  if(result.newlyBroken){
   if(removeCollider(r))onTopologyChange();
   let i=0;for(const s of shards.filter(s=>s.life<=0).slice(0,10)){
    s.life=.65;s.mesh.visible=true;s.mesh.scale.setScalar(1);s.mesh.position.copy(r.mesh.position).add(new T.Vector3(Math.sin(i*2.3)*.9,Math.cos(i*1.7)*.65,0));
    s.velocity.set(Math.sin(i*1.9)*1.4,.6+Math.sin(i)*.4,Math.cos(i*2.6)*1.2);s.mesh.rotation.set(i,i*.7,0);i++;
   }
  }
  paint(r);if(result.newlyBroken)onBreak(r.mesh,result);return result;
 }
 function step(dt){if(!Number.isFinite(dt)||dt<=0)return;for(const s of shards){if(s.life<=0)continue;s.life=Math.max(0,s.life-dt);s.mesh.visible=s.life>0;s.velocity.y-=9.8*dt;s.mesh.position.addScaledVector(s.velocity,dt);s.mesh.position.y=Math.max(.025,s.mesh.position.y);s.mesh.scale.setScalar(s.life/.65);}}
 function updateMarkers(camera,playing){for(const r of records)if(r.label)r.label.sprite.visible=playing&&r.enabled&&r.label.sprite.position.distanceTo(camera.position)<=14;}
 return {hit,reset,suspend,step,updateMarkers,isTarget:mesh=>{const r=byMesh.get(mesh);return !!r?.enabled&&!r.durability.snapshot().broken;},snapshot:()=>records.map(r=>({id:r.id,...r.durability.snapshot(),enabled:r.enabled,colliding:obstacles.includes(r.collider)}))};
}
