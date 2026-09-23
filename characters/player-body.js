// P01 SENTINEL full-body combat armor (Third-Person / Vehicle driver / Shadow).
// Built on the canonical P01 upper assembly, adding tactical pelvis, thighs, greaves, boots and standing pose.
import * as T from '../node_modules/three/build/three.module.js';
import {createPlayerArmsVisual} from './player-arms.js';

export const PLAYER_BODY_ASSET = Object.freeze({
  id: 'P01_BODY',
  name: 'SENTINEL_FULLBODY',
  label: '哨兵全身战术装甲',
  version: 'p01-body-v1',
  file: 'player-sentinel-p01.glb'
});

function node(parent, name, x = 0, y = 0, z = 0) {
  const g = new T.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g;
}
function mesh(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new T.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot);
  m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; parent.add(m); return m;
}

export function createPlayerFullBodyVisual() {
  const armsRig = createPlayerArmsVisual();
  const root = armsRig.root;
  root.name = 'P01_Sentinel_FullBody';

  const m = {
    suit: root.getObjectByName('P01_Undersuit_Merged')?.material || new T.MeshStandardMaterial({name: 'P01_Undersuit', color: 0x142127, roughness: .9}),
    armor: root.getObjectByName('P01_Armor_Merged')?.material || new T.MeshStandardMaterial({name: 'P01_Armor', color: 0x50646b, metalness: .68, roughness: .41}),
    shell: root.getObjectByName('P01_Shell_Merged')?.material || new T.MeshStandardMaterial({name: 'P01_Shell', color: 0xb8c6c3, metalness: .42, roughness: .4}),
    alloy: root.getObjectByName('P01_Alloy_Merged')?.material || new T.MeshStandardMaterial({name: 'P01_Alloy', color: 0x8fa3a6, metalness: .82, roughness: .3}),
    accent: root.getObjectByName('P01_Indicator_Merged')?.material || new T.MeshStandardMaterial({name: 'P01_Indicator', color: 0x8ee8ff, emissive: 0x8ee8ff, emissiveIntensity: 1.1})
  };

  // Pelvis / Hips below Chest
  const hips = node(root, 'P01_Hips', 0, 0.95, 0);
  mesh(hips, new T.BoxGeometry(0.38, 0.22, 0.28), m.armor, [0, 0, 0]);
  mesh(hips, new T.BoxGeometry(0.42, 0.08, 0.32), m.suit, [0, 0.08, 0]);
  mesh(hips, new T.BoxGeometry(0.18, 0.16, 0.30), m.shell, [0, -0.04, 0.02]);

  // Legs
  for (const s of [-1, 1]) {
    const q = s > 0 ? 'R' : 'L';
    const hipJoint = node(hips, 'P01_Hip_' + q, s * 0.16, -0.12, 0);
    mesh(hipJoint, new T.CylinderGeometry(0.06, 0.06, 0.14, 12), m.alloy, [0, 0, 0], [0, 0, Math.PI / 2]);

    const thigh = node(hipJoint, 'P01_Thigh_' + q, 0, -0.22, 0);
    mesh(thigh, new T.BoxGeometry(0.16, 0.40, 0.18), m.armor, [0, 0, 0]);
    mesh(thigh, new T.BoxGeometry(0.18, 0.28, 0.06), m.shell, [0, 0, 0.08]);

    const knee = node(thigh, 'P01_Knee_' + q, 0, -0.24, 0.02);
    mesh(knee, new T.CylinderGeometry(0.065, 0.065, 0.14, 12), m.alloy, [0, 0, 0], [0, 0, Math.PI / 2]);
    mesh(knee, new T.BoxGeometry(0.14, 0.12, 0.08), m.shell, [0, 0, 0.05]);

    const shin = node(knee, 'P01_Shin_' + q, 0, -0.22, -0.02);
    mesh(shin, new T.BoxGeometry(0.15, 0.38, 0.16), m.armor, [0, 0, 0]);
    mesh(shin, new T.BoxGeometry(0.12, 0.30, 0.06), m.shell, [0, 0.02, 0.07]);
    mesh(shin, new T.CylinderGeometry(0.015, 0.015, 0.06, 8), m.accent, [s * 0.07, 0.05, 0], [0, 0, Math.PI / 2]);

    const foot = node(shin, 'P01_Foot_' + q, 0, -0.22, 0.06);
    mesh(foot, new T.BoxGeometry(0.15, 0.10, 0.28), m.armor, [0, 0, 0]);
    mesh(foot, new T.BoxGeometry(0.16, 0.04, 0.30), m.suit, [0, -0.04, 0]);
  }

  return { root, hips };
}
