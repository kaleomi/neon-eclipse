import * as T from './node_modules/three/build/three.module.js';
import {OrbitControls} from './node_modules/three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from './node_modules/three/examples/jsm/environments/RoomEnvironment.js';
import {createRangedGuardVisual, makeRangedGuardClips, rangedGuardStats} from './characters/ranged-guard.js';

const $ = id => document.getElementById(id), mount = $('viewport');
const scene = new T.Scene(); scene.background = new T.Color(0x10181c);
scene.fog = new T.Fog(0x10181c, 10, 24);
const camera = new T.PerspectiveCamera(33, 1, .05, 50);
const renderer = new T.WebGLRenderer({antialias: true, alpha: false, preserveDrawingBuffer: true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = T.SRGBColorSpace; mount.appendChild(renderer.domElement);
const envScene = new RoomEnvironment(), pmrem = new T.PMREMGenerator(renderer);
const environment = pmrem.fromScene(envScene, .04); scene.environment = environment.texture;
scene.environmentIntensity = .65; envScene.dispose(); pmrem.dispose();
scene.add(new T.HemisphereLight(0xc1d9e7, 0x29342d, 1.35));
function light(color, intensity, position, shadows = false) {
  const l = new T.DirectionalLight(color, intensity); l.position.set(...position);
  l.castShadow = shadows;
  if (shadows) { l.shadow.mapSize.set(2048, 2048); Object.assign(l.shadow.camera, {left: -3, right: 3, top: 4, bottom: -2, near: .1, far: 20});
    l.shadow.bias = -.0004; l.shadow.normalBias = .025; l.shadow.radius = 3; }
  l.target.position.set(0, 1, 0); scene.add(l, l.target); return l;
}
light(0xffe7cd, 3.0, [-3, 6, 4], true);
light(0xadcfff, 2.1, [3, 3, -3]);
light(0xb9d9d0, .65, [-3, 1, -2]);
const floor = new T.Mesh(new T.PlaneGeometry(100, 100), new T.MeshStandardMaterial({color: 0x172227, metalness: .18, roughness: .78}));
floor.rotation.x = -Math.PI / 2; floor.position.y = -.11; floor.receiveShadow = true; scene.add(floor);
const plinth = new T.Mesh(new T.CylinderGeometry(1.11, 1.15, .1, 96), new T.MeshStandardMaterial({color: 0x263437, metalness: .7, roughness: .42}));
plinth.position.y = -.055; plinth.receiveShadow = true; scene.add(plinth);
const ring = new T.Mesh(new T.TorusGeometry(1.045, .005, 5, 96), new T.MeshBasicMaterial({color: 0x7c9d91}));
ring.rotation.x = Math.PI / 2; ring.position.y = -.001; scene.add(ring);
for (let i = 0; i < 48; i++) {
  const angle = i / 48 * Math.PI * 2, tick = new T.Mesh(new T.BoxGeometry(i % 4 ? .006 : .012, .002, i % 4 ? .025 : .043), new T.MeshBasicMaterial({color: i % 4 ? 0x435953 : 0x90a99e}));
  tick.position.set(Math.sin(angle) * 1.083, 0, Math.cos(angle) * 1.083); tick.rotation.y = angle; scene.add(tick);
}
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.17, 0); controls.enableDamping = true; controls.dampingFactor = .07;
controls.minDistance = 2.2; controls.maxDistance = 8; controls.minPolarAngle = .18;
controls.maxPolarAngle = Math.PI / 2 + .07; controls.autoRotateSpeed = .65; controls.enablePan = false;
function view(name) {
  const pos = {front: [0, 1.70, 5.7], hero: [3.10, 2.13, 4.73], back: [-3.10, 2.10, -4.73]}[name];
  camera.position.set(...pos); controls.target.set(0, 1.17, .06); controls.update();
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
}
view('hero');
const observer = new ResizeObserver(() => {
  const {width, height} = mount.getBoundingClientRect();
  renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
}); observer.observe(mount);
let model, mixer, active, clips = [], source = 'glb';
const state = {ready: false, mode: 'Idle', source, stats: null};
function motion(name) {
  if (!mixer) return;
  const clip = clips.find(c => c.name === name); if (!clip) return;
  const action = mixer.clipAction(clip); action.reset(); action.setLoop(name === 'Hit' ? T.LoopOnce : T.LoopRepeat, Infinity);
  action.clampWhenFinished = name === 'Hit'; action.fadeIn(.16).play(); if (active && active !== action) active.fadeOut(.16);
  active = action; state.mode = name; $('motion-name').textContent = name.toUpperCase();
  document.querySelectorAll('[data-motion]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.motion === name)));
}
try {
  const gltf = await new GLTFLoader().loadAsync('./models/ranged-guard-r07.glb');
  model = gltf.scene.getObjectByName('R07_Visual'); if (!model) throw new Error('R07 asset root missing');
  clips = gltf.animations;
} catch (e) {
  const fallback = createRangedGuardVisual(); model = fallback.root; clips = makeRangedGuardClips(model); source = 'procedural-fallback';
  $('error').hidden = false; $('error').textContent = 'GLB 暂不可用，正在展示同源程序模型。请先运行 node scripts/build-ranged-guard.mjs。';
  console.warn('R07 preview uses fallback:', e.message);
}
model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(model);
mixer = new T.AnimationMixer(model); mixer.addEventListener('finished', () => motion('Idle'));
state.stats = rangedGuardStats(model); state.source = source;
$('triangles').textContent = state.stats.triangles.toLocaleString('en-US'); $('materials').textContent = state.stats.materials;
$('clips').textContent = clips.length; $('asset-status').textContent = (source === 'glb' ? 'GLB 已载入' : '同源程序回退') + ` · ${state.stats.meshes} 个网格批次 · 无外链贴图`;
document.querySelectorAll('[data-motion]').forEach(b => b.addEventListener('click', () => motion(b.dataset.motion)));
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => view(b.dataset.view)));
$('rotate').addEventListener('change', e => { controls.autoRotate = e.target.checked; });
$('wireframe').addEventListener('change', e => { model.traverse(o => { if (o.isMesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.wireframe = e.target.checked; }); });
$('exposure').addEventListener('input', e => { renderer.toneMappingExposure = Number(e.target.value); $('exposure-value').textContent = Number(e.target.value).toFixed(2); });
if (matchMedia('(prefers-reduced-motion: reduce)').matches) $('pause').checked = true;
motion('Idle'); state.ready = true; document.body.dataset.ready = 'true';
window.__r07Preview = {state, motion, view, scene, model, renderer, camera, controls, mixer};
const clock = new T.Clock(); let stopped = false;
function frame() { if (stopped) return; requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .06); if (!$('pause').checked) mixer.update(dt);
  controls.update(); renderer.render(scene, camera);
}
frame();
window.addEventListener('pagehide', () => {
  stopped = true; observer.disconnect(); controls.dispose(); mixer.stopAllAction(); mixer.uncacheRoot(model);
  const materials = new Set(), geometries = new Set(); scene.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
  }); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  environment.dispose(); renderer.dispose();
}, {once: true});
