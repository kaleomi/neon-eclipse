import * as THREE from './node_modules/three/build/three.module.js';
import {SUPPLY_SYMBOLS} from './supply-symbols.js';

const geometries = new Map();
const materials = new Map();
const plateGeometry = new THREE.PlaneGeometry(1.02, .82);
const plateMaterial = new THREE.MeshBasicMaterial({color:0x071822,transparent:true,opacity:.3,side:THREE.DoubleSide,depthTest:true,depthWrite:false});
function geometryFor(type) {
  if (!geometries.has(type)) {
    const symbol = SUPPLY_SYMBOLS[type];
    if (!symbol) throw new Error('Unknown supply symbol');
    const shapes = symbol.contours.map(points => {
      const shape = new THREE.Shape();
      points.forEach(([x,y], index) => {
        const px = (x - symbol.width / 2) / symbol.width;
        const py = (symbol.height / 2 - y) / symbol.width;
        index ? shape.lineTo(px, py) : shape.moveTo(px, py);
      });
      shape.closePath();
      return shape;
    });
    geometries.set(type, new THREE.ShapeGeometry(shapes));
    materials.set(type, new THREE.MeshBasicMaterial({color:symbol.color,side:THREE.DoubleSide,transparent:true,opacity:1,depthTest:true,depthWrite:false,toneMapped:false}));
  }
  return geometries.get(type);
}
export function createSupplyMark(type, size = 1) {
  const mesh = new THREE.Mesh(geometryFor(type), materials.get(type));
  mesh.name = 'supply-symbol-' + type;
  mesh.userData.supplySymbol = type;
  mesh.scale.setScalar(size);
  return mesh;
}
export function createSupplyBadge(type) {
  const root = new THREE.Group();
  root.name = 'supply-badge-' + type;
  root.userData.supplySymbol = type;
  const plate = new THREE.Mesh(plateGeometry, plateMaterial);
  plate.name = 'supply-badge-plate';
  root.add(plate);
  const mark = createSupplyMark(type, .85);
  mark.position.z = .008;
  mark.renderOrder = 1;
  root.add(mark);
  // Depth tests remain enabled: these signs never reveal pickups through walls.
  return root;
}
