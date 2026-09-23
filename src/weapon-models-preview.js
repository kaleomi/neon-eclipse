import * as T from '../node_modules/three/build/three.module.js';
import {OrbitControls} from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {WEAPON_ASSETS,createWeaponVisual,weaponVisualStats,disposeWeaponVisual} from './weapon-asset-models.js';
import {reloadPose} from './action-poses.js';
const $=id=>document.getElementById(id),stage=$('stage');
const descriptions=['分层机匣 / 可见换弹接口 / 护木散热槽 / 框架反射瞄具','加固机匣 / 泵动护木 / 双管轮廓 / 破门枪口与外置弹架','分体滑套 / 多段消音筒 / 嵌入式照门 / 防滑握柄','切面刀脊 / 内嵌能量槽 / 双面刃材 / 分段护手与柄尾','紧凑机匣 / 通风短护木 / 短托与长直弹匣 / 黄色识别条','延长护木 / 分段长枪管 / 双支座光学镜组 / 精确步枪轮廓','开放磁轨 / 四组电感线圈 / 可变琥珀能量材质 / 握柄电池匣','双发射器 / 可见冷却与电容组 / 可变青色能量材质 / 重型电池匣'];
const scene=new T.Scene();scene.background=new T.Color(0x101a1e);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;stage.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(40,1,.005,100),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.maxPolarAngle=Math.PI*.495;controls.autoRotateSpeed=.8;
scene.add(new T.HemisphereLight(0xdaefed,0x324952,3.0));const sun=new T.DirectionalLight(0xffe6bf,3.3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.0008;sun.shadow.bias=-.00003;Object.assign(sun.shadow.camera,{left:-2,right:2,top:2,bottom:-2,near:.01,far:12});scene.add(sun,sun.target);
const rim=new T.DirectionalLight(0xa3d9fa,2.4);rim.position.set(2,2,2);scene.add(rim);
let active=null,platform=null,grid=null,skeleton=null,catalog=null,token=0,pending=false,last=0,time=0,view='perspective',distance=2;
const center=new T.Vector3();
function schedule(){if(!pending&&!document.hidden){pending=true;requestAnimationFrame(render);}}
function cleanup(o){if(o){o.removeFromParent();disposeWeaponVisual(o);}}
function applyPose(){
 if(!active)return;const i=Number($('asset').value),spec=WEAPON_ASSETS[i],mode=$('pose').value,animated=$('rig').checked;
 const recoil=mode==='recoil'?(animated?(.5+.5*Math.sin(time*7))*.85:.85):0,reload=mode==='reload'?(animated?(time*.27)%1:.45):0,charge=mode==='charge'?(animated?.5+.5*Math.sin(time*2):1):0,p=reloadPose(reload,i===1);
 const joint=name=>active.getObjectByName(spec.id+'_'+name),bolt=joint('Bolt'),mag=joint('Magazine'),pump=joint('Pump'),support=joint('Support_L'),feed=joint('PumpSupport');
 if(bolt)bolt.position.z=-.01+recoil*.035+p.bolt*.065;if(mag){mag.position.set(-.1*p.mag,-.38*p.mag,.12*p.mag);mag.rotation.z=-.25*p.mag;}
 if(pump)pump.position.z=-.39+(i===1?recoil*.1:0);
 if(support){support.position.set((i===2?-.15:-.02)-.06*p.hand,(i===2?-.18:-.115)-.3*p.hand,(i===2?.22:-.28)+.22*p.hand);support.rotation.x=-.8*p.hand;}
 if(feed){feed.position.set(-.025-p.hand*.1,-.125-p.hand*.1,.06+p.hand*.35);feed.rotation.x=-p.hand*.7;}
 active.traverse(o=>{if(o.isMesh&&o.material.name===spec.id+'_Energy')o.material.emissiveIntensity=i===6?.3+charge*3:.5+(mode==='charge'?charge:recoil)*2;});
 active.updateMatrixWorld(true);
}
function render(now){pending=false;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if($('rig').checked){time+=dt;applyPose();}controls.autoRotate=$('rotate').checked;controls.update();renderer.render(scene,camera);document.body.dataset.rendered='true';if($('rotate').checked||$('rig').checked)schedule();}
function fit(which=view){
 view=which;const blade=Number($('asset').value)===3,direction=view==='front'?new T.Vector3(0,.12,-1):view==='back'?new T.Vector3(.65,.29,.9):blade?new T.Vector3(-.37,.20,-1.2):new T.Vector3(-1,.40,-.40);
 camera.position.copy(center).addScaledVector(direction.normalize(),distance);controls.target.copy(center);controls.minDistance=distance*.27;controls.maxDistance=distance*3.5;controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));schedule();
}
function frameAsset(){
 const box=new T.Box3().setFromObject(active,true),size=box.getSize(new T.Vector3());box.getCenter(center);center.y-=size.y*.015;
 distance=size.length()/2/Math.tan(T.MathUtils.degToRad(camera.fov*.5))*1.08*Math.max(1,1/camera.aspect);
 cleanup(platform);cleanup(grid);const radius=Math.max(size.x,size.z,.6)*.63,y=box.min.y-.023;
 platform=new T.Mesh(new T.CylinderGeometry(radius,radius*1.015,.033,64),new T.MeshStandardMaterial({color:0x3d5359,roughness:.83,metalness:.15}));platform.position.set(center.x,y-.0165,center.z);platform.receiveShadow=true;scene.add(platform);
 grid=new T.GridHelper(5,60,0x3a575c,0x213a41);grid.position.set(center.x,y-.036,center.z);grid.material.transparent=true;grid.material.opacity=.56;scene.add(grid);
 sun.target.position.copy(center);sun.position.copy(center).add(new T.Vector3(-2.5,3.6,-1.5));fit();
}
function wire(){active?.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});schedule();}
function showAnchors(){if(skeleton)skeleton.visible=$('anchors').checked;schedule();}
async function load(){
 const n=++token,index=Number($('asset').value),spec=WEAPON_ASSETS[index],source=$('source').value;
 document.body.dataset.ready='';document.body.dataset.loadError='';document.body.dataset.rendered='false';$('error').hidden=true;$('stats').textContent='正在加载 '+spec.code+'…';
 $('title').textContent=spec.id+' / '+spec.code+' '+spec.name;$('description').textContent=descriptions[index];$('file').textContent=spec.file+' · 原点与挂点保持';$('download').href='./models/'+spec.file;$('download').download=spec.file;
 $('pose').value='idle';$('pose').disabled=index===3;$('rig').disabled=index===3;$('rig').checked=false;$('pose').querySelector('[value=charge]').disabled=index<6;
 let next;
 try{
  next=source==='glb'?(await new GLTFLoader().loadAsync('./models/'+spec.file)).scene:createWeaponVisual(index);
  if(n!==token){disposeWeaponVisual(next);return;}cleanup(skeleton);cleanup(active);active=next;scene.add(active);active.traverse(o=>{if(o.isMesh){o.castShadow=!o.material.transparent;o.receiveShadow=true;}});
  const stats=weaponVisualStats(active),expected=catalog.assets[index];if(stats.triangles!==expected.triangles||stats.meshes!==expected.meshes)throw Error('GLB / 清单几何不一致');
  const size=stats.bounds.max.map((v,i)=>v-stats.bounds.min[i]);$('stats').innerHTML=`${stats.triangles.toLocaleString('en-US')} 三角面<br>${stats.meshes} 网格 / ${stats.materials} 材质 / ${stats.joints} 关节<br>${size.map(v=>v.toFixed(3)).join(' × ')} m<br>${source==='glb'?'真实 GLB 已加载':'同源程序模型'} / 0 外部贴图`;
  time=0;applyPose();frameAsset();skeleton=new T.SkeletonHelper(active);skeleton.material.depthTest=false;skeleton.renderOrder=3;skeleton.visible=$('anchors').checked;scene.add(skeleton);wire();$('badge').textContent=source==='glb'?'INDEPENDENT GLB':'SHARED SOURCE';document.body.dataset.ready=index+':'+source;schedule();
 }catch(e){if(n!==token)return;document.body.dataset.loadError=String(e.message||e);$('error').textContent='模型加载失败：'+document.body.dataset.loadError;$('error').hidden=false;console.error(e);}
}
function resize(){const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(active)frameAsset();else schedule();}
$('asset').addEventListener('change',load);$('source').addEventListener('change',load);$('wire').addEventListener('change',wire);$('anchors').addEventListener('change',showAnchors);
for(const id of ['pose','rig'])$(id).addEventListener('change',()=>{time=0;last=0;applyPose();schedule();});$('rotate').addEventListener('change',()=>{last=0;schedule();});
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>fit(b.dataset.view));controls.addEventListener('change',schedule);new ResizeObserver(resize).observe(stage);document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)schedule();});
window.__weaponPreview={snapshot:()=>{const joints={},materials=[];active?.traverse(o=>{if(o.isBone)joints[o.name]={position:o.position.toArray(),rotation:o.rotation.toArray().slice(0,3)};if(o.isMesh)materials.push({name:o.material.name,wire:!!o.material.wireframe,intensity:o.material.emissiveIntensity});});return {ready:document.body.dataset.ready,error:document.body.dataset.loadError,stats:active?weaponVisualStats(active):null,pose:$('pose').value,joints,materials,anchors:!!skeleton?.visible,memory:{...renderer.info.memory}};}};
try{const response=await fetch('./models/player-weapons.manifest.json');if(!response.ok)throw Error('清单 HTTP '+response.status);catalog=await response.json();resize();await load();}catch(e){document.body.dataset.loadError=e.message;$('error').hidden=false;$('error').textContent='清单加载失败：'+e.message;}
window.addEventListener('pagehide',()=>{token++;cleanup(skeleton);cleanup(active);cleanup(platform);cleanup(grid);controls.dispose();renderer.dispose();});
