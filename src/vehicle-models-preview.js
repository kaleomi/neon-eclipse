import * as T from '../node_modules/three/build/three.module.js';
import {OrbitControls} from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {VEHICLE_ASSETS,createVehicleVisual,vehicleStats,vehicleRigStats,disposeVehicle} from './vehicle-models.js';
const $=id=>document.getElementById(id),stage=$('stage');
const descriptions={rover:'斜面装甲舱 / 独立悬挂轮组 / 散热格栅与拖曳环 / 顶部火力挂点保持',yacht:'折角深 V 船体 / 连续舷侧护条 / 倾斜驾驶舱 / 护栏、绞盘与双喷水推进器',aircraft:'渐缩翼型与后掠翼尖 / 整流机身 / 四叶螺旋桨 / 独立起落架与侦察光电舱',helicopter:'运输机舱与侧滑门 / 双涡轮进排气 / 主、尾旋翼 / 加强滑橇与观测传感器'};
const scene=new T.Scene();scene.background=new T.Color(0x101a1e);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;stage.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(42,1,.01,500),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.maxPolarAngle=Math.PI*.49;controls.autoRotateSpeed=.85;
scene.add(new T.HemisphereLight(0xd4f0ee,0x31484b,2.7));
const sun=new T.DirectionalLight(0xffe7c0,3.3);sun.position.set(-10,15,-10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.025;Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:60});scene.add(sun,sun.target);
const rim=new T.DirectionalLight(0x8fc6ef,2.4);rim.position.set(7,7,10);scene.add(rim);
let active=null,platform=null,grid=null,token=0,pending=false,view='perspective',distance=8,elapsed=0,last=0,catalog=null;
const center=new T.Vector3();
function schedule(){if(!pending&&!document.hidden){pending=true;requestAnimationFrame(render);}}
function rigPose(root,type,t=0){
  const joint=name=>root.getObjectByName(name);
  if(type==='rover'){
    const body=joint('V01_Body');body.rotation.z=Math.sin(t)*.025;
    for(const id of ['FL','FR','RL','RR']){joint('V01_Wheel_'+id).rotation.x=-t*1.5;joint('V01_Steer_'+id).rotation.y=id[0]==='F'?Math.sin(t)*.34:0;}
  }else if(type==='aircraft')joint('V03_Propeller').rotation.z=t*3;
  else if(type==='helicopter'){joint('V04_RotorBlades').rotation.y=-t*2;joint('V04_TailRotor').rotation.x=t*6;}
}
function render(now){
  pending=false;const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  if(active&&$('rig').checked){elapsed+=dt;rigPose(active,$('asset').value,elapsed);}
  controls.autoRotate=$('rotate').checked;controls.update();renderer.render(scene,camera);
  document.body.dataset.rendered='true';
  if($('rotate').checked||$('rig').checked)schedule();
}
function cleanup(object){if(!object)return;scene.remove(object);disposeVehicle(object);}
function wireframe(){if(active)active.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.wireframe=$('wire').checked;});schedule();}
function fit(which=view){
  view=which;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  const direction=view==='front'?new T.Vector3(0,.17,-1):view==='back'?new T.Vector3(.30,.35,1):new T.Vector3(-.85,.53,-1.12);
  camera.position.copy(center).addScaledVector(direction.normalize(),distance);controls.target.copy(center);controls.minDistance=distance*.32;controls.maxDistance=distance*3.5;controls.update();schedule();
}
function frameAsset(){
  const bounds=new T.Box3().setFromObject(active,true),size=bounds.getSize(new T.Vector3());bounds.getCenter(center);center.y-=size.y*.03;
  const radius=size.length()/2;distance=radius/Math.tan(T.MathUtils.degToRad(camera.fov*.5))*1.08*Math.max(1,1/camera.aspect);
  cleanup(platform);cleanup(grid);
  const groundY=bounds.min.y-.06,r=Math.max(size.x,size.z)*.61;
  platform=new T.Mesh(new T.CylinderGeometry(r,r*1.015,.12,64),new T.MeshStandardMaterial({color:0x3e5358,roughness:.85,metalness:.12}));platform.position.set(center.x,groundY-.06,center.z);platform.receiveShadow=true;scene.add(platform);
  const span=Math.max(14,Math.ceil(r*4));grid=new T.GridHelper(span,48,0x38555a,0x203940);grid.position.set(center.x,groundY-.125,center.z);grid.material.transparent=true;grid.material.opacity=.64;scene.add(grid);
  sun.target.position.copy(center);sun.position.copy(center).add(new T.Vector3(-r*1.3,r*2.7,-r*1.4));fit();
}
async function load(){
  const current=++token,type=$('asset').value,source=$('source').value,spec=VEHICLE_ASSETS[type];
  document.body.dataset.ready='';document.body.dataset.loadError='';document.body.dataset.rendered='false';$('error').hidden=true;$('stats').textContent='正在加载 '+spec.id+'…';
  $('title').textContent=spec.id+' / '+spec.name;$('description').textContent=descriptions[type];$('download').href='./models/'+spec.file;$('download').download=spec.file;$('file').textContent=spec.file+' · 拖动检查结构';
  $('rig').disabled=type==='yacht';if(type==='yacht')$('rig').checked=false;
  let next=null;
  try{
    if(source==='glb')next=(await new GLTFLoader().loadAsync('./models/'+spec.file)).scene;else next=createVehicleVisual(type);
    if(current!==token){disposeVehicle(next);return;}
    cleanup(active);active=next;scene.add(active);active.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    elapsed=0;const stats=vehicleStats(active),rig=vehicleRigStats(active),size=stats.bounds.max.map((n,i)=>n-stats.bounds.min[i]);
    const stored=catalog.assets.find(a=>a.type===type);if(stats.triangles!==stored.triangles||stats.meshes!==stored.meshes)throw Error('资产/清单几何不一致');
    $('stats').innerHTML=`${stats.triangles.toLocaleString('en-US')} 三角面<br>${stats.meshes} 网格 / ${stats.materials} 材质 / ${rig.joints} 关节<br>${size.map(n=>n.toFixed(2)).join(' × ')} m<br>${source==='glb'?'真实 GLB 已加载':'同源程序模型'} / 0 外部贴图`;
    $('badge').textContent=source==='glb'?'INDEPENDENT GLB':'SHARED SOURCE';frameAsset();wireframe();document.body.dataset.ready=type+':'+source;schedule();
  }catch(error){if(current!==token)return;document.body.dataset.loadError=String(error.message||error);$('error').textContent='模型加载失败：'+document.body.dataset.loadError;$('error').hidden=false;$('stats').textContent='加载未完成';console.error(error);}
}
function resize(){const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(active)frameAsset();else schedule();}
$('asset').addEventListener('change',load);$('source').addEventListener('change',load);$('wire').addEventListener('change',wireframe);$('rotate').addEventListener('change',()=>{last=0;schedule();});
$('rig').addEventListener('change',()=>{elapsed=0;last=0;if(active)rigPose(active,$('asset').value,0);schedule();});
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>fit(button.dataset.view));
controls.addEventListener('change',schedule);new ResizeObserver(resize).observe(stage);document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)schedule();});
window.__vehiclePreview={snapshot:()=>({ready:document.body.dataset.ready,error:document.body.dataset.loadError,stats:active?vehicleStats(active):null,rig:active?vehicleRigStats(active):null,joints:active?(()=>{const out={};active.traverse(o=>{if(o.isBone)out[o.name]=o.rotation.toArray().slice(0,3);});return out;})():{},memory:{...renderer.info.memory},wire:active?(()=>{const flags=[];active.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])flags.push(m.wireframe);});return flags.length>0&&flags.every(Boolean);})():false})};
try{const response=await fetch('./models/vehicles.manifest.json');if(!response.ok)throw Error('清单 HTTP '+response.status);catalog=await response.json();resize();await load();}catch(error){document.body.dataset.loadError=String(error.message||error);$('error').textContent='清单加载失败：'+error.message;$('error').hidden=false;}
window.addEventListener('pagehide',()=>{token++;cleanup(active);cleanup(platform);cleanup(grid);controls.dispose();renderer.dispose();});
