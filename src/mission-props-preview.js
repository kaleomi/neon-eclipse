import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import {MISSION_PROP_ASSETS,createMissionPropVisual,missionPropStats,disposeMissionProp} from './mission-prop-models.js';
const $=s=>document.querySelector(s),stage=$('#stage'),scene=new T.Scene();scene.background=new T.Color(0x10191c);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.6;stage.append(renderer.domElement);
const camera=new T.PerspectiveCamera(34,1,.01,100),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.8;controls.maxDistance=8;
scene.add(new T.HemisphereLight(0xd5ebef,0x39433a,3));
for(const [color,intensity,pos] of [[0xffead1,4,[3,5,4]],[0xa5d9ff,3,[-3,2,-2]],[0xe5ffe3,2,[0,3,-4]]]){const light=new T.DirectionalLight(color,intensity);light.position.set(...pos);scene.add(light);}
const plinth=new T.Mesh(new T.CylinderGeometry(1.65,1.70,.08,64),new T.MeshStandardMaterial({color:0x25332e,metalness:.4,roughness:.65}));plinth.position.y=-.045;scene.add(plinth);
const grid=new T.GridHelper(14,28,0x405449,0x24352e);grid.position.y=-.09;scene.add(grid);
const holder=new T.Group();scene.add(holder);let model=null,generation=0;
function pose(back=false){const tall=$('#asset').value==='terminal';controls.target.set(0,tall?.7:.22,0);camera.position.set(back?-2.7:2.4,tall?2.2:1.65,back?-3.6:3.3);controls.update();}
function wire(){model?.traverse(o=>{if(o.isMesh)o.material.wireframe=$('#wire').checked;});}
async function load(){
 const token=++generation,type=$('#asset').value,spec=MISSION_PROP_ASSETS[type],source=$('#source').value;
 $('#status').textContent='正在读取 '+spec.file;$('#title').textContent=spec.id+' / '+spec.name;
 $('#download').href='./models/'+spec.file;
 try{
  const next=source==='glb'?(await new GLTFLoader().loadAsync('./models/'+spec.file)).scene:createMissionPropVisual(type);
  if(token!==generation){disposeMissionProp(next);return;}
  if(model){holder.remove(model);disposeMissionProp(model);}model=next;holder.rotation.y=0;holder.add(model);
  const stats=missionPropStats(model);model.position.y=type==='terminal'?0:.258;pose();wire();
  $('#stats').textContent=`${stats.meshes} 网格 / ${stats.materials} 材质\n${stats.triangles.toLocaleString()} 三角面\n${source==='glb'?'GLB 文件已实际加载':'与游戏相同的构建源'}\n+Y 向上 · +Z 正面 · 米制`;
  $('#status').textContent='已载入 · '+spec.file+' · '+(source==='glb'?'GLB':'程序模型');
  document.body.dataset.assetReady=type;document.body.dataset.assetSource=source;
 }catch(error){$('#status').textContent='载入失败：'+error.message;document.body.dataset.assetReady='error';}
}
$('#asset').addEventListener('change',load);$('#source').addEventListener('change',load);$('#wire').addEventListener('change',wire);
$('#front').onclick=()=>{holder.rotation.y=0;controls.target.set(0,$('#asset').value==='terminal'?.7:.25,0);camera.position.set(0,$('#asset').value==='terminal'?1.2:.8,4);controls.update();};
$('#back').onclick=()=>{holder.rotation.y=0;pose(true);};$('#reset').onclick=()=>{holder.rotation.y=0;pose();};
function resize(){renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(stage);resize();
const reduce=matchMedia('(prefers-reduced-motion: reduce)');let previous=performance.now();
renderer.setAnimationLoop(now=>{const dt=Math.min(.05,(now-previous)/1000);previous=now;if($('#spin').checked&&!reduce.matches)holder.rotation.y+=dt*.3;controls.update();renderer.render(scene,camera);});
window.__missionPropsPreview={stats:()=>model?missionPropStats(model):null,render:()=>renderer.render(scene,camera)};
load();
