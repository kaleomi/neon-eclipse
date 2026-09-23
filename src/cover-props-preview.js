import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {COVER_THEMES,createCoverProps} from './cover-props.js';
// Review page for the chapter 2–9 cover dressing. Same module the chapters use; GLB prototypes are for download only.
const INFO={
 crate:{id:'CP02',name:'车站货箱',chapter:'02 地下运输站',sizes:[[2,3.8,2],[1.4,1.1,1.2],[3,1.6,1.4]],detail:'边框立柱、铆接侧板、一圈警示带与一盏状态灯；列车章的车顶货箱共用此主题。'},
 relay:{id:'CP03',name:'天穹中继柜',chapter:'03 天穹通讯枢纽',sizes:[[5,2.4,3],[4,1.6,4],[3,1.4,3]],detail:'检修门、百叶槽、天线桩与粉色路线条；高于 4.2 m 的机房体量不做处理。'},
 locker:{id:'CP04',name:'中枢服务器柜',chapter:'04 多层中枢塔',sizes:[[2,4,2],[1.2,2.4,1.2]],detail:'按宽度自动分门，门缝、把手条与三点式 LED 列。'},
 container:{id:'CP06',name:'港口集装箱',chapter:'06 风暴港口',sizes:[[4.4,3.4,3],[10,3.4,4],[3.4,3.4,3]],detail:'瓦楞肋、八角角件、双门锁杆与喷涂铭牌；长边自动判定门朝向。'},
 pod:{id:'CP07',name:'轨道配重舱',chapter:'07 轨道电梯基座',sizes:[[3,2.5,3],[2,2.5,2]],detail:'分段凹带、发光接缝、四角承垫与吊耳；保留原顶部青色掩体标识。'},
 rack:{id:'CP08',name:'数据中心机柜',chapter:'08 沉没数据中心',sizes:[[1.2,2.4,8],[8,2.4,1.2],[3,2.4,3]],detail:'刀片槽阵列、机柜立框、背面通风板，少量槽位点亮；原有红/青 LED 条保留。'},
 snowbank:{id:'CP09A',name:'极地雪堆',chapter:'09 极地雷达阵列',sizes:[[6,1.2,1.4],[3,1.2,3]],detail:'原平顶方块隐藏，改为整体雪脊加冠部雪包；碰撞体不变，仍是原方块。'},
 hut:{id:'CP09B',name:'极地暖房墙',chapter:'09 极地雷达阵列',sizes:[[5,3,.3],[.3,3,5]],detail:'木质压条、保温面板、顶部雪檐与门侧暖色横条。'}
};
const themeSelect=document.querySelector('#theme'),sizeSelect=document.querySelector('#size'),sourceSelect=document.querySelector('#source'),stats=document.querySelector('#stats'),status=document.querySelector('#status'),title=document.querySelector('#title'),detail=document.querySelector('#detail'),download=document.querySelector('#download');
for(const t of COVER_THEMES){const o=document.createElement('option');o.value=t;o.textContent=INFO[t].id+' · '+INFO[t].name;themeSelect.append(o);}
const stage=document.querySelector('#stage'),renderer=new T.WebGLRenderer({antialias:true});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;stage.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x0b141a);scene.fog=new T.FogExp2(0x0b141a,.02);
scene.add(new T.HemisphereLight(0x94e9f6,0x17232b,2.2));const sun=new T.DirectionalLight(0x9bcbd5,2.6);sun.position.set(6,10,8);scene.add(sun);const fill=new T.PointLight(0xffb347,14,18);fill.position.set(-4,3,5);scene.add(fill);
const floor=new T.Mesh(new T.CircleGeometry(9,48),new T.MeshStandardMaterial({color:0x22323b,roughness:.9}));floor.rotation.x=-Math.PI/2;scene.add(floor);scene.add(new T.GridHelper(18,18,0x2a4652,0x162630));
const camera=new T.PerspectiveCamera(46,1,.05,120);let yaw=.65,pitch=.42,dist=9,target=new T.Vector3(0,1.2,0);
function view(){camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*dist,target.y+Math.sin(pitch)*dist,target.z+Math.cos(yaw)*Math.cos(pitch)*dist);camera.lookAt(target);}
let drag=null;renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.008;pitch=Math.max(-.2,Math.min(1.4,pitch+(e.clientY-drag.y)*.006));drag={x:e.clientX,y:e.clientY};});renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(2.5,Math.min(30,dist*(1+Math.sign(e.deltaY)*.08)));},{passive:false});
document.querySelector('#front').onclick=()=>{yaw=0;pitch=.12;};document.querySelector('#back').onclick=()=>{yaw=Math.PI;pitch=.12;};document.querySelector('#reset').onclick=()=>{yaw=.65;pitch=.42;};
let current=null,props=null,bare=null,glbCache=new Map();
const loader=new GLTFLoader();
async function build(){
 if(current){scene.remove(current);current.traverse(o=>{if(o.isMesh&&o.userData.owned)o.geometry.dispose();});}if(props){props.dispose();props=null;}if(bare){scene.remove(bare);bare.geometry.dispose();bare=null;}
 const theme=themeSelect.value,info=INFO[theme],[w,h,d]=info.sizes[Number(sizeSelect.value)];title.textContent=info.id+' · '+info.name;detail.textContent=info.chapter+' · '+w+'×'+h+'×'+d+' m · '+info.detail;
 const file='./models/cover-'+theme+'-'+info.id.toLowerCase()+'.glb';download.href=file;download.textContent='下载 '+info.id+' GLB ↓';
 current=new T.Group();scene.add(current);let meshes=0,triangles=0,parts='—';
 if(sourceSelect.value==='glb'){status.textContent='读取 GLB 原型…';try{if(!glbCache.has(file))glbCache.set(file,await loader.loadAsync(file));const g=glbCache.get(file).scene.clone(true);current.add(g);}catch(e){status.textContent='GLB 未生成：请运行 node scripts/build-cover-props.mjs --write';}}
 else{props=createCoverProps(scene,theme);const body=new T.Mesh(new T.BoxGeometry(w,h,d),props.materials.body);body.position.y=h/2;body.visible=theme!=='snowbank';body.userData.owned=true;current.add(body);props.dress({w,h,d,x:0,z:0});parts=String(props.parts);for(const m of props.commit())current.add(m);}
 current.traverse(o=>{if(o.isMesh){meshes++;triangles+=o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3;o.material.wireframe=document.querySelector('#wire').checked;}});
 bare=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({color:0x84edee,wireframe:true,transparent:true,opacity:.5}));bare.position.y=h/2;bare.visible=document.querySelector('#bare').checked;scene.add(bare);
 target.set(0,h*.5,0);dist=Math.max(4,Math.hypot(w,h,d)*1.9);stats.textContent=`来源：${sourceSelect.value==='glb'?'GLB 原型':'程序模型（与游戏同源）'}\n尺寸：${w} × ${h} × ${d} m\n部件数：${parts}\n合并后网格：${meshes}\n三角形：${triangles}\n贴图：0 · 外部依赖：0`;status.textContent='碰撞体 = 青色线框；建模全部落在其内（面板外凸 ≤ 3 cm，顶部附件 ≤ 1.2 m）。';
}
themeSelect.onchange=()=>{fillSizes();build();};sizeSelect.onchange=build;sourceSelect.onchange=build;document.querySelector('#wire').onchange=build;document.querySelector('#bare').onchange=()=>{if(bare)bare.visible=document.querySelector('#bare').checked;};
function fillSizes(){sizeSelect.innerHTML='';INFO[themeSelect.value].sizes.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.join(' × ')+' m';sizeSelect.append(o);});}
function resize(){const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();fillSizes();build();
renderer.setAnimationLoop(t=>{if(document.querySelector('#spin').checked)yaw+=.004;view();renderer.render(scene,camera);});
