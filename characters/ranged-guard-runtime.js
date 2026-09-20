// Visual-only adapter. Existing root-level meshes remain the authoritative hit proxies.
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {createRangedGuardVisual, cloneRangedGuardVisual, poseRangedGuard,
  disposeRangedGuardVisual, bindRangedGuardRig, GUARD_ASSET_VERSION} from './ranged-guard.js';

let assetPromise;
export function loadRangedGuardAsset() {
  if (!assetPromise) assetPromise = new GLTFLoader().loadAsync(new URL('../models/ranged-guard-r07.glb', import.meta.url).href)
    .then(gltf => {
      const root = gltf.scene.getObjectByName('R07_Visual');
      if (!root || root.userData.assetVersion !== GUARD_ASSET_VERSION) throw new Error('R07 asset version mismatch');
      bindRangedGuardRig(root); return root;
    });
  return assetPromise;
}
function replaceVisual(group, state, next) {
  const old = state.visual;
  group.remove(old.root);
  // Never dispose the existing per-enemy role/attack material, which is reused.
  disposeRangedGuardVisual(old);
  const oldMaterials = new Set(old.materials);
  group.userData.ownedMaterials = group.userData.ownedMaterials.filter(m => !oldMaterials.has(m));
  group.userData.ownedMaterials.push(...next.materials);
  state.visual = next;
  group.add(next.root);
  poseRangedGuard(next.rig, state.pose);
}
export function attachRangedGuard(group, {loadAsset = typeof document !== 'undefined'} = {}) {
  const parts = group.userData.parts;
  if (!parts || parts.guard) return;
  // Mesh.visible only controls rendering. Mesh.raycast still intersects these exact
  // legacy geometries; the parity test verifies all sampled rays and animation poses.
  const proxies = group.children.filter(o => o.isMesh);
  proxies.forEach(o => { o.visible = false; o.userData.rangedGuardProxy = true; });
  const visual = createRangedGuardVisual({accentMaterial: parts.accent});
  const state = {visual, proxies, lastHp: null, hitAt: -Infinity, pose: {time: 0, mode: 'Idle'}};
  parts.guard = state;
  group.name = 'R07_RANGED_GUARD';
  group.userData.rangedGuardSource = 'procedural';
  group.userData.ownedMaterials.push(...visual.materials);
  group.add(visual.root);
  if (loadAsset) loadRangedGuardAsset().then(template => {
    // The game's disposer removes groups from the scene. Do not resurrect dead,
    // reset or superseded instances if the shared GLB request completes later.
    if (!group.parent || group.userData.parts?.guard !== state) return;
    replaceVisual(group, state, cloneRangedGuardVisual(template, parts.accent));
    group.userData.rangedGuardSource = 'glb';
  }).catch(() => {
    // A missing/offline/corrupt GLB keeps the identical source-built visual and all
    // hit proxies working. No unhandled rejection and no gameplay load dependency.
    if (group.userData.parts?.guard === state) group.userData.rangedGuardSource = 'procedural-fallback';
  });
}
export function animateRangedGuard(enemy, time, walking) {
  const state = enemy.group.userData.parts?.guard;
  if (!state) return;
  if (state.lastHp !== null && enemy.hp < state.lastHp) state.hitAt = time;
  state.lastHp = enemy.hp;
  const age = Math.max(0, time - state.hitAt);
  state.pose = {time, phase: Number.isFinite(enemy.seed) ? enemy.seed : 0,
    mode: enemy.charge > 0 ? 'Aim' : walking ? 'Patrol' : 'Idle',
    hit: age < .5 ? Math.sin(age / .5 * Math.PI) * Math.exp(-age * 4) : 0};
  poseRangedGuard(state.visual.rig, state.pose);
}
