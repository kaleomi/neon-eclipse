class FakeFileReader {
  constructor() {
    this.result = null;
    this.onloadend = null;
    this.onload = null;
  }
  async readAsArrayBuffer(blob) {
    const buf = await blob.arrayBuffer();
    this.result = buf;
    if (this.onload) this.onload({ target: { result: buf } });
    if (this.onloadend) this.onloadend({ target: { result: buf } });
  }
  async readAsDataURL(blob) {
    const buf = await blob.arrayBuffer();
    const b64 = Buffer.from(buf).toString('base64');
    const url = 'data:application/octet-stream;base64,' + b64;
    this.result = url;
    if (this.onload) this.onload({ target: { result: url } });
    if (this.onloadend) this.onloadend({ target: { result: url } });
  }
}
globalThis.FileReader = globalThis.FileReader || FakeFileReader;
import * as THREE from '../node_modules/three/build/three.module.js';
import { GLTFExporter } from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'node:fs';

const root = new THREE.Group();
root.name = 'SciFi_Reactor_Core';

// Materials
const darkArmor = new THREE.MeshStandardMaterial({
  color: 0x1a2630,
  metalness: 0.85,
  roughness: 0.32,
  name: 'Armor_Plating'
});
const polishedSteel = new THREE.MeshStandardMaterial({
  color: 0x7c919d,
  metalness: 0.9,
  roughness: 0.22,
  name: 'Polished_Alloy'
});
const glowingPlasma = new THREE.MeshStandardMaterial({
  color: 0x2af4ff,
  emissive: 0x12dce8,
  emissiveIntensity: 2.8,
  roughness: 0.15,
  metalness: 0.1,
  name: 'Plasma_Core'
});
const hazardAccent = new THREE.MeshStandardMaterial({
  color: 0xdf8c36,
  metalness: 0.4,
  roughness: 0.45,
  name: 'Hazard_Trim'
});

// 1. Heavy Octagonal Base Assembly (Y: 0 to 1.5)
const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.2, 1.2, 8), darkArmor);
basePlinth.position.y = 0.6;
root.add(basePlinth);

// Hydraulic feet at corners
for(let i=0; i<8; i++){
  const angle = i * Math.PI / 4;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 1.1), polishedSteel);
  foot.position.set(Math.sin(angle)*3.1, 0.4, Math.cos(angle)*3.1);
  foot.rotation.y = angle;
  root.add(foot);
}

// 2. Central Core Column: Inner pulsing crystal / plasma conduit
const innerCore = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 6.2, 24), glowingPlasma);
innerCore.position.y = 4.2;
root.add(innerCore);

// 3. Magnetic Containment Ring Pillars (4 heavy vertical columns with cooling fins)
for(let i=0; i<4; i++){
  const angle = i * Math.PI / 2 + Math.PI/4;
  const colX = Math.sin(angle) * 2.3;
  const colZ = Math.cos(angle) * 2.3;

  const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, 6.8, 0.55), darkArmor);
  col.position.set(colX, 4.3, colZ);
  col.rotation.y = angle;
  root.add(col);

  // High-pressure coolant piping attached to each column
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.4, 12), polishedSteel);
  pipe.position.set(colX * 0.72, 4.3, colZ * 0.72);
  root.add(pipe);

  // Status beacons
  const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.18), hazardAccent);
  beacon.position.set(colX * 1.12, 6.5, colZ * 1.12);
  root.add(beacon);
}

// 4. Toroidal Magnetic Induction Rings with Beveled Details
for(let y of [2.2, 4.0, 5.8]) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.22, 12, 48), polishedSteel);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  root.add(ring);

  // Glowing energy couplers on each ring
  for(let j=0; j<8; j++){
    const a = j * Math.PI / 4;
    const coupler = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.35), glowingPlasma);
    coupler.position.set(Math.sin(a)*2.35, y, Math.cos(a)*2.35);
    coupler.rotation.y = a;
    root.add(coupler);
  }
}

// 5. Crown Containment Cap Assembly (Y: 7.2 to 8.2)
const crown = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 0.9, 8), darkArmor);
crown.position.y = 7.6;
root.add(crown);

const crownVent = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.5, 16), polishedSteel);
crownVent.position.y = 8.1;
root.add(crownVent);

// Export to GLB binary
const exporter = new GLTFExporter();
console.log('Starting export parse...');
const result = await exporter.parseAsync(
  root,
  { binary: true }
);
fs.mkdirSync('./models', { recursive: true });
fs.writeFileSync('./models/reactor-core.glb', Buffer.from(result));
console.log('SUCCESS: Generated ./models/reactor-core.glb, size: ' + result.byteLength + ' bytes');
