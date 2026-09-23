import * as T from '../node_modules/three/build/three.module.js';
import { GLTFLoader } from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { ENVIRONMENT_PROP_ASSETS, createEnvironmentPropVisual, environmentPropStats, setEnvironmentPropState, disposeEnvironmentProp } from './environment-prop-models.js';

const $ = selector => document.querySelector(selector), stage = $('#stage');
const scene = new T.Scene(); scene.background = new T.Color(0x10191d);
const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
stage.append(renderer.domElement);
const camera = new T.PerspectiveCamera(34, 1, .01, 100);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
scene.add(new T.HemisphereLight(0xc9e2ed, 0x33433d, 2.5));
for (const [color, intensity, position] of [[0xffe9d0, 3.7, [3, 5, 4]], [0x87c9ed, 2.6, [-3, 2, -2]], [0xd7eadd, 2.0, [0, 3, -4]]]) {
  const light = new T.DirectionalLight(color, intensity); light.position.set(...position); scene.add(light);
}
const plinth = new T.Mesh(new T.CylinderGeometry(1, 1.03, .05, 64), new T.MeshStandardMaterial({ color: 0x23363b, metalness: .48, roughness: .6 }));
plinth.position.y = -.028; scene.add(plinth);
const grid = new T.GridHelper(12, 40, 0x324b50, 0x1c2e35); grid.position.y = -.06; scene.add(grid);
const holder = new T.Group(); scene.add(holder);
const details = {
  vent: '三轴倒角壳体 / 机械压力表 / 辐条手轮 / 独立状态条',
  light: '防护断路器 / 实体拨杆 / 分路保险 / 琥珀状态标识',
  nozzle: '深腔排气口 / 开放式格栅 / 环形法兰 / 加强筋与螺栓',
  node: '开放式电容框架 / 铜色线圈 / 分离核心与底座 / 耗尽状态'
};
let model = null, generation = 0, size = 1, centreY = .5;
function pose(view = 'perspective') {
  holder.rotation.y = 0; controls.target.set(0, centreY, 0);
  const position = view === 'front' ? [0, centreY + size * .25, size * 2.65]
    : view === 'back' ? [-size * 1.45, centreY + size * .7, -size * 2.1]
      : [size * 1.45, centreY + size * .8, size * 2.15];
  camera.position.set(...position); controls.update();
}
function wire() {
  model?.traverse(o => { if (o.isMesh) o.material.wireframe = $('#wire').checked; });
  requestRender();
}
function state() {
  if (!model) return;
  setEnvironmentPropState(model, $('#state').value);
  document.body.dataset.assetState = $('#state').value;
  requestRender();
}
function stateOptions(type) {
  const allowed = type === 'vent' ? ['ready', 'active', 'off'] : type === 'light' ? ['ready', 'off']
    : type === 'node' ? ['ready', 'low', 'spent'] : ['ready'];
  for (const option of $('#state').options) option.disabled = !allowed.includes(option.value);
  if (!allowed.includes($('#state').value)) $('#state').value = 'ready';
  $('#state').disabled = type === 'nozzle';
}
async function load() {
  const token = ++generation, type = $('#asset').value, source = $('#source').value, spec = ENVIRONMENT_PROP_ASSETS[type];
  document.body.dataset.assetReady = ''; document.body.dataset.assetSource = '';
  $('#status').textContent = '正在载入 ' + spec.file;
  $('#title').textContent = spec.id + ' / ' + spec.name;
  $('#detail').textContent = details[type]; $('#download').href = './models/' + spec.file;
  try {
    const next = source === 'glb' ? (await new GLTFLoader().loadAsync('./models/' + spec.file)).scene : createEnvironmentPropVisual(type);
    if (token !== generation) { disposeEnvironmentProp(next); return; }
    if (model) { holder.remove(model); disposeEnvironmentProp(model); }
    model = next; holder.add(model);
    const stats = environmentPropStats(model), bounds = new T.Box3().setFromObject(model);
    const dimensions = bounds.getSize(new T.Vector3());
    size = Math.max(dimensions.x, dimensions.y, dimensions.z); centreY = bounds.getCenter(new T.Vector3()).y;
    plinth.scale.set(size * .62, 1, size * .62);
    controls.minDistance = size * 1.05; controls.maxDistance = size * 6;
    stateOptions(type); state(); wire(); pose();
    $('#stats').textContent = `${stats.triangles.toLocaleString()} 三角面\n${stats.meshes} 网格 / ${stats.materials} 材质\n${dimensions.x.toFixed(2)} × ${dimensions.y.toFixed(2)} × ${dimensions.z.toFixed(2)} m\n${source === 'glb' ? '真实 GLB 已加载' : '游戏同源程序模型'} / 0 外部贴图`;
    $('#status').textContent = spec.file + ' · 拖动检查结构';
    renderer.render(scene, camera);
    document.body.dataset.assetReady = type; document.body.dataset.assetSource = source;
  } catch (error) {
    $('#status').textContent = '载入失败：' + error.message; document.body.dataset.assetReady = 'error';
  }
}
$('#asset').addEventListener('change', load); $('#source').addEventListener('change', load);
$('#wire').addEventListener('change', wire); $('#state').addEventListener('change', state);
$('#front').onclick = () => pose('front'); $('#back').onclick = () => pose('back'); $('#reset').onclick = () => pose();
function resize() {
  const width = Math.max(1, stage.clientWidth), height = Math.max(1, stage.clientHeight);
  renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); requestRender();
}
new ResizeObserver(resize).observe(stage); resize();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)'); let previous = performance.now();
// An idle inspector must not saturate software WebGL or the editor's shared GPU.
var renderQueued = false;
function requestRender() {
  if (renderQueued) return;
  renderQueued = true; requestAnimationFrame(renderFrame);
}
function renderFrame(now) {
  renderQueued = false;
  const dt = Math.min(.05, Math.max(0, (now - previous) / 1000)); previous = now;
  const spinning = $('#spin').checked && !reducedMotion.matches;
  if (spinning) holder.rotation.y += dt * .3;
  controls.update(); renderer.render(scene, camera);
  if (spinning) requestRender();
}
controls.addEventListener('change', requestRender);
$('#spin').addEventListener('change', requestRender);
window.__environmentPropsPreview = {
  stats: () => model ? environmentPropStats(model) : null,
  render: () => renderer.render(scene, camera)
};
load();
