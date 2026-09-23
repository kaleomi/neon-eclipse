import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from '../node_modules/three/examples/jsm/environments/RoomEnvironment.js';
import {GUARD_VARIANTS,createGuardVariant,makeGuardVariantClips,guardVariantStats} from '../characters/guard-variants.js';
import {createRangedGuardVisual,makeRangedGuardClips} from '../characters/ranged-guard.js';
const $=id=>document.getElementById(id),mount=$('viewport');
const specs={
  assault:{...GUARD_VARIANTS.assault,tint:'#ffa16c',description:'更轻的分段护甲与橙色双目头盔。<br>短枪、收束肩甲、外露传动结构，<br>以更快的步态表现近距压迫。',contract:'外形与步态升级，不增加移动速度或伤害。<br>保留原身体、头部和武器命中代理。'},
  ranged:{type:'ranged',id:'R07',version:'r07-v1',code:'R–07',name:'VIGIL',label:'远程守卫',file:'ranged-guard-r07.glb',displayScale:1,tint:'#c59bff',description:'已确认的 R–07，保持原样。<br>分层陶瓷护甲与紫色面罩，<br>作为整个编队的设计基准。',contract:'本批不改 R–07 的资产与动作源文件。<br>原样加载上一批 GLB 作为对照。'},
  heavy:{...GUARD_VARIANTS.heavy,tint:'#ffd16c',description:'宽肩厚甲、内嵌单目光学组件。<br>重型发射器、前置叠层护甲，<br>背部保留可辨识的绿色核心。',contract:'正面护甲减伤，绕后命中绿色核心。<br>核心中心与旧判定精确对齐，不随呼吸漂移。'}
};
const scene=new T.Scene();scene.background=new T.Color(0x10181c);scene.fog=new T.Fog(0x10181c,20,55);
const camera=new T.PerspectiveCamera(33,1,.05,80);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.outputColorSpace=T.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;mount.appendChild(renderer.domElement);
const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(room,.04);
scene.environment=environment.texture;scene.environmentIntensity=.60;room.dispose();pmrem.dispose();
scene.add(new T.HemisphereLight(0xc7dfed,0x2c332e,1.15));
function light(color,intensity,pos,shadow=false){const l=new T.DirectionalLight(color,intensity);l.position.set(...pos);l.target.position.set(0,1,0);l.castShadow=shadow;
 if(shadow){l.shadow.mapSize.set(2048,1024);Object.assign(l.shadow.camera,{left:-5,right:5,top:4,bottom:-3,near:.1,far:24});l.shadow.bias=-.0003;l.shadow.normalBias=.025;}
 scene.add(l,l.target);}
light(0xffe6cd,3.1,[-5,7,5],true);light(0xb8d8ff,1.9,[4,4,-5]);light(0xc5e0cf,.6,[-5,2,-3]);
const floor=new T.Mesh(new T.PlaneGeometry(120,120),new T.MeshStandardMaterial({color:0x172227,roughness:.77,metalness:.16}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.112;floor.receiveShadow=true;scene.add(floor);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=false;
controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI/2+.06;controls.autoRotateSpeed=.48;
let dirty=true;controls.addEventListener('change',()=>{dirty=true;});
const state={ready:false,selected:'lineup',view:'hero',motion:'Idle',units:{}},units={},failures=[];
function platform(parent,radius){
 const mat=new T.MeshStandardMaterial({color:0x2b3a3d,metalness:.68,roughness:.46});
 const p=new T.Mesh(new T.CylinderGeometry(radius,radius+.035,.1,64),mat);p.position.y=-.06;p.receiveShadow=true;parent.add(p);
 const ring=new T.Mesh(new T.TorusGeometry(radius-.064,.005,5,64),new T.MeshBasicMaterial({color:0x809e8e}));ring.rotation.x=Math.PI/2;ring.position.y=-.006;parent.add(ring);
}
await Promise.all(Object.entries(specs).map(async([type,spec],index)=>{
 const holder=new T.Group();holder.name='Roster_'+type;holder.position.x=(index-1)*2.14;scene.add(holder);
 let model,clips,source='glb';
 try{const gltf=await new GLTFLoader().loadAsync('./models/'+spec.file);model=gltf.scene.getObjectByName(spec.id+'_Visual');if(!model)throw Error('Missing rig root');clips=gltf.animations;}
 catch(e){const fallback=type==='ranged'?createRangedGuardVisual():createGuardVariant(type);model=fallback.root;clips=type==='ranged'?makeRangedGuardClips(model):makeGuardVariantClips(model,type);source='procedural-fallback';failures.push(spec.code);}
 model.scale.setScalar(spec.displayScale);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});holder.add(model);platform(holder,type==='heavy'?1.12:type==='ranged'?1.01:.94);
 const mixer=new T.AnimationMixer(model),unit={type,spec,holder,model,mixer,clips,active:null,source};units[type]=unit;
 state.units[type]={source,...guardVariantStats(model),clips:clips.map(c=>c.name)};
 mixer.addEventListener('finished',()=>{if(state.motion==='Hit')setMotion('Idle');});
}));
function activeUnits(){return state.selected==='lineup'?Object.values(units):[units[state.selected]];}
function fitCamera(){
 if(!state.ready)return;const bounds=new T.Box3();for(const u of activeUnits())bounds.union(new T.Box3().setFromObject(u.holder));
 const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());center.y+=.035;
 const tan=Math.tan(T.MathUtils.degToRad(camera.fov/2));
 const distance=Math.max(size.y/(2*tan),size.x/(2*tan*camera.aspect))*1.28;
 const direction=new T.Vector3(...({front:[0,.075,1],hero:[.30,.14,1],back:[-.26,.12,-1]}[state.view])).normalize();
 controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance);
 controls.minDistance=state.selected==='lineup'?3.8:2.2;controls.maxDistance=state.selected==='lineup'?25:10;controls.update();dirty=true;
}
function setView(view){if(!['front','hero','back'].includes(view))return;state.view=view;fitCamera();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));}
function updateInspector(){
 const lineup=state.selected==='lineup',spec=specs[state.selected],s=state.units[state.selected];
 document.documentElement.style.setProperty('--unit',lineup?'#c1d8ca':spec.tint);
 $('chip').textContent=lineup?'TWO NEW ASSETS / BATCH 02':state.selected==='ranged'?'ACCEPTED BASELINE / UNCHANGED':'NEW ASSET / BATCH 02';
 $('code').textContent=lineup?'UNITS':spec.code;$('codename').textContent=lineup?'FIELD FORMATION':spec.name;
 $('unit-name').textContent=lineup?'步兵编队':spec.label;
 $('description').innerHTML=lineup?'从轻装突击到重装压制。<br>独立轮廓与装备，延续同一设计语言。<br>R–07 保持原样，作为已确认的基准。':spec.description;
 $('contract').innerHTML=lineup?'保留原命中代理、碰撞与战斗数值。<br>重装兵正面减伤、背部核心规则不变。<br>刚性装甲动画，非真人蒙皮。':spec.contract+'<br>刚性关节动画，非真人蒙皮。';
 const labels=lineup?['新增模型','编队成员','独立动作','资源格式']:['三角面','PBR 材质','刚性关节','网格批次'];
 const values=lineup?['2','3','4 / UNIT','GLB']:[s.triangles.toLocaleString('en-US'),s.materials,13,s.meshes];
 ['a','b','c','d'].forEach((id,i)=>{$('metric-'+id+'-label').textContent=labels[i];$('metric-'+id).textContent=values[i];});
 $('asset-status').textContent=lineup?`${Object.values(state.units).filter(x=>x.source==='glb').length}/3 GLB 已载入 · 无外链贴图`:(s.source==='glb'?'GLB 已载入':'同源程序回退')+' · '+spec.version;
}
function selectUnit(type){if(type!=='lineup'&&!units[type])return;state.selected=type;
 for(const [key,u]of Object.entries(units))u.holder.visible=type==='lineup'||key===type;
 document.querySelectorAll('[data-unit]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.unit===type)));updateInspector();fitCamera();dirty=true;
}
function setMotion(name){if(!['Idle','Patrol','Aim','Hit'].includes(name))return;state.motion=name;
 for(const u of Object.values(units)){const action=u.mixer.clipAction(u.clips.find(c=>c.name===name));action.reset();action.setLoop(name==='Hit'?T.LoopOnce:T.LoopRepeat,Infinity);action.clampWhenFinished=name==='Hit';action.fadeIn(.15).play();if(u.active&&u.active!==action)u.active.fadeOut(.15);u.active=action;}
 $('motion-name').textContent=name.toUpperCase();document.querySelectorAll('[data-motion]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.motion===name)));dirty=true;
}
function renderOnce(){renderer.render(scene,camera);dirty=false;}
const observer=new ResizeObserver(()=>{const {width,height}=mount.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();fitCamera();dirty=true;});observer.observe(mount);
document.querySelectorAll('[data-unit]').forEach(b=>b.addEventListener('click',()=>selectUnit(b.dataset.unit)));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-motion]').forEach(b=>b.addEventListener('click',()=>setMotion(b.dataset.motion)));
$('rotate').addEventListener('change',e=>{controls.autoRotate=e.target.checked;dirty=true;});
$('wireframe').addEventListener('change',e=>{for(const u of Object.values(units))u.model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.wireframe=e.target.checked;});dirty=true;});
$('pause').addEventListener('change',()=>{dirty=true;});
if(matchMedia('(prefers-reduced-motion:reduce)').matches)$('pause').checked=true;
if(failures.length){$('notice').hidden=false;$('notice').textContent=failures.join('、')+' 的 GLB 暂不可用，当前展示同源程序模型。请重建对应资产。';}
state.ready=true;selectUnit(matchMedia('(max-width:600px)').matches?'assault':'lineup');setMotion('Idle');document.body.dataset.ready='true';
window.__guardRoster={state,units,scene,camera,renderer,controls,selectUnit,setMotion,setView,renderOnce,
 pauseAt(time){$('pause').checked=true;for(const u of Object.values(units))u.mixer.setTime(time);renderOnce();}};
const clock=new T.Clock();let stopped=false;
function frame(){if(stopped)return;requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);
 if(!$('pause').checked){for(const u of activeUnits())u.mixer.update(dt);dirty=true;}controls.update();if(dirty)renderOnce();}
frame();
window.addEventListener('pagehide',()=>{stopped=true;observer.disconnect();controls.dispose();const geos=new Set(),mats=new Set();
 for(const u of Object.values(units)){u.mixer.stopAllAction();u.mixer.uncacheRoot(u.model);}
 scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);});
 geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());environment.dispose();renderer.dispose();},{once:true});
