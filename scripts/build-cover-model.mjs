import * as THREE from '../node_modules/three/build/three.module.js';
import { GLTFExporter } from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'node:fs';

class FakeFileReader {
  constructor() { this.result = null; this.onloadend = null; this.onload = null; }
  async readAsArrayBuffer(blob) {
    const buf = await blob.arrayBuffer();
    this.result = buf;
    if (this.onload) this.onload({ target: { result: buf } });
    if (this.onloadend) this.onloadend({ target: { result: buf } });
  }
}
globalThis.FileReader = globalThis.FileReader || FakeFileReader;

const root = new THREE.Group();
root.name = 'SciFi_Heavy_Cover';

// Materials
const armor = new THREE.MeshStandardMaterial({
  color: 0x22303a,
  metalness: 0.82,
  roughness: 0.35,
  name: 'Heavy_Armor'
});
const frameMat = new THREE.MeshStandardMaterial({
  color: 0x5a6e7c,
  metalness: 0.88,
  roughness: 0.25,
  name: 'Reinforced_Frame'
});
const hazardTrim = new THREE.MeshStandardMaterial({
  color: 0xdf8428,
  metalness: 0.35,
  roughness: 0.45,
  name: 'Hazard_Trim'
});
const screenMat = new THREE.MeshStandardMaterial({
  color: 0x0a1c24,
  emissive: 0x14889c,
  emissiveIntensity: 0.8,
  roughness: 0.2,
  metalness: 0.7,
  name: 'Terminal_Screen'
});
const rubberGasket = new THREE.MeshStandardMaterial({
  color: 0x101518,
  roughness: 0.85,
  metalness: 0.1,
  name: 'Rubber_Gasket'
});

// Dimensions fit within bounding box ~ (w: 3.0, h: 2.5, d: 3.0)
// Base sub-plinth (Y: 0 to 0.4)
const base = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.4, 2.95), armor);
base.position.y = 0.2;
root.add(base);

// Hazard footing trim
const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(3.02, 0.12, 3.02), hazardTrim);
baseTrim.position.y = 0.35;
root.add(baseTrim);

// Main defensive chassis body (Y: 0.4 to 2.1)
const mainBody = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.7, 2.7), armor);
mainBody.position.y = 1.25;
root.add(mainBody);

// Chamfered corner armor reinforcement struts (4 corners)
for(let sx of [-1, 1]) {
  for(let sz of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.3, 8), frameMat);
    strut.position.set(sx * 1.36, 1.15, sz * 1.36);
    root.add(strut);

    // Bolted footings
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.25, 0.42), frameMat);
    foot.position.set(sx * 1.36, 0.12, sz * 1.36);
    root.add(foot);
  }
}

// Slanted terminal console on North face (+Z)
const consoleGroup = new THREE.Group();
consoleGroup.position.set(0, 1.3, 1.38);
const consoleBezel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.18), frameMat);
consoleBezel.rotation.x = -0.25;
consoleGroup.add(consoleBezel);

const screen = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.52, 0.05), screenMat);
screen.position.set(0, 0.02, 0.08);
screen.rotation.x = -0.25;
consoleGroup.add(screen);
root.add(consoleGroup);

// Heavy side vent recessed louvers (East & West faces: +/- X)
for(let sx of [-1, 1]) {
  const ventBox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 1.8), rubberGasket);
  ventBox.position.set(sx * 1.38, 1.3, 0);
  root.add(ventBox);

  for(let k = 0; k < 5; k++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 1.6), frameMat);
    fin.position.set(sx * 1.39, 1.0 + k * 0.14, 0);
    root.add(fin);
  }
}

// Reinforced top armor cap & deployment handle bars (Y: 2.1 to 2.5)
const topCap = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.22, 2.85), frameMat);
topCap.position.y = 2.21;
root.add(topCap);

const topCore = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 2.4), armor);
topCore.position.y = 2.4;
root.add(topCore);

// Top tie-down rings
for(let sx of [-0.9, 0.9]) {
  for(let sz of [-0.9, 0.9]) {
    const tieRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 16), frameMat);
    tieRing.position.set(sx, 2.52, sz);
    tieRing.rotation.x = Math.PI / 2;
    root.add(tieRing);
  }
}

const exporter = new GLTFExporter();
const result = await exporter.parseAsync(root, { binary: true });
fs.writeFileSync('./models/heavy-cover.glb', Buffer.from(result));
console.log('SUCCESS: Generated ./models/heavy-cover.glb, size: ' + result.byteLength + ' bytes');
