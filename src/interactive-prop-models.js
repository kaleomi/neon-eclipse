// B01 compressed fuel vessel / E01 compact EMP pulse generator, authored revision 3.
// Geometry is visual only; gameplay collision, explosives and EMP rules live elsewhere.
import * as T from '../node_modules/three/build/three.module.js';

export const INTERACTIVE_PROP_ASSETS = Object.freeze({
  barrel: Object.freeze({ id: 'B01', name: '高爆压缩燃料桶', file: 'explosive-barrel-b01.glb' }),
  emp: Object.freeze({ id: 'E01', name: 'EMP 脉冲发生器', file: 'emp-node-e01.glb' })
});
const noRaycast = () => {};

function chamferBox(w, h, d, c) {
  const shape = new T.Shape();
  const points = [[-w/2+c,-h/2],[w/2-c,-h/2],[w/2,-h/2+c],[w/2,h/2-c],
    [w/2-c,h/2],[-w/2+c,h/2],[-w/2,h/2-c],[-w/2,-h/2+c]];
  points.forEach(([x,y],i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y)); shape.closePath();
  return new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,steps:1,curveSegments:1}).translate(0,0,-d/2);
}
function mergeSurfaces(root) {
  const batches = new Map();
  for (const object of [...root.children]) {
    if (!object.isMesh) continue;
    object.updateMatrix();
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrix);
    if (!batches.has(object.material)) batches.set(object.material,[]);
    batches.get(object.material).push(geometry);
    object.geometry.dispose(); root.remove(object);
  }
  for (const [material, parts] of batches) {
    const geometry = new T.BufferGeometry();
    for (const name of ['position','normal']) {
      const array = new Float32Array(parts.reduce((n,g)=>n+g.getAttribute(name).array.length,0));
      let offset = 0;
      for (const part of parts) { const source=part.getAttribute(name).array; array.set(source,offset); offset+=source.length; }
      geometry.setAttribute(name,new T.BufferAttribute(array,3));
    }
    parts.forEach(g=>g.dispose()); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new T.Mesh(geometry,material); mesh.name=material.name+'_Surface'; root.add(mesh);
  }
}
export function createInteractivePropVisual(type) {
  const spec=INTERACTIVE_PROP_ASSETS[type];
  if(!spec)throw new RangeError('Unknown interactive prop: '+type);
  const root=new T.Group(); root.name=spec.id+'_Visual';
  root.userData={interactiveProp:type,assetId:spec.id,version:'props-v3'};
  const mat=(name,color,metalness=.6,roughness=.42,emissive=0)=>new T.MeshStandardMaterial({
    name:spec.id+'_'+name,color,metalness,roughness,emissive,emissiveIntensity:1
  });
  const piece=(geometry,material,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);root.add(mesh);return mesh;
  };
  const box=(w,h,d,x,y,z,m,c=0,ry=0,rz=0)=>piece(c?chamferBox(w,h,d,c):new T.BoxGeometry(w,h,d),m,x,y,z,0,ry,rz);
  const cylinder=(rt,rb,h,x,y,z,m,n=16,rx=0)=>piece(new T.CylinderGeometry(rt,rb,h,n),m,x,y,z,rx);
  const ring=(r,t,x,y,z,m,horizontal=false,n=24)=>piece(new T.TorusGeometry(r,t,4,n),m,x,y,z,horizontal?Math.PI/2:0);
  const lathe=(profile,m,n=24)=>piece(new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x,y)),n),m);

  if(type==='barrel') {
    const hull=mat('PressureVessel',0x86382e,.62,.39,0xc73220);
    hull.emissiveIntensity=.08; hull.userData.interactiveMutable=true;
    const dark=mat('CompressionFrame',0x18262e,.78,.38);
    const yellow=mat('HazardPaint',0xe3b45b,.16,.56);
    const alloy=mat('MachinedHardware',0xa1b3ba,.86,.29);
    const label=mat('CeramicIdentification',0xc5d0c5,.08,.64);
    // Dished ends and a pressure-vessel silhouette, not a straight shipping drum.
    lathe([[0,-.85],[.37,-.85],[.475,-.775],[.512,-.62],[.512,.62],[.466,.774],[.36,.823],[0,.823]],hull,24);
    for(const sign of [-1,1]) {
      piece(new T.CylinderGeometry(.541,.541,.083,24,1,true),dark,0,sign*.842,0);
      cylinder(.492,.492,.018,0,sign*.888,0,alloy,24);
      piece(new T.CylinderGeometry(.526,.526,.054,24,1,true),dark,0,sign*.545,0);
      piece(new T.CylinderGeometry(.516,.516,.078,24,1,true),yellow,0,sign*.414,0);
      for(let i=0;i<6;i++) {
        const a=i*Math.PI/3, x=Math.sin(a), z=Math.cos(a);
        cylinder(.017,.017,.016,x*.435,sign*.897,z*.435,alloy,6);
        box(.034,.125,.014,x*.517,sign*.414,z*.517,dark,0,a,.48);
      }
    }
    // Longitudinal impact rails and distinct weld collars protect the tank wall.
    for(let i=0;i<6;i++) {
      const a=i*Math.PI/3+Math.PI/6,x=Math.sin(a),z=Math.cos(a);
      box(.041,1.43,.033,x*.506,0,z*.506,dark,0,a);
      for(const y of [-.685,.685]) box(.065,.064,.046,x*.506,y,z*.506,alloy,0,a);
    }
    // Recessed top regulator and captive cross valve, within the previous art envelope.
    cylinder(.13,.16,.036,0,.901,0,dark,16);
    cylinder(.06,.06,.026,0,.932,0,alloy,6);
    box(.20,.021,.034,0,.956,0,dark,.008);
    box(.028,.023,.135,0,.956,0,alloy,.007);
    cylinder(.032,.036,.03,.23,.913,.11,yellow,10);
    cylinder(.031,.035,.025,-.20,.910,-.14,alloy,8);
    // Folded lifting handles use open geometry instead of solid decorative blocks.
    for(const sign of [-1,1]) {
      box(.034,.075,.038,sign*.35,.843,-.16,alloy,.008);
      box(.034,.075,.038,sign*.35,.843,.16,alloy,.008);
      box(.036,.033,.36,sign*.35,.883,0,dark,.009);
    }
    // Frontal pressure instrument: dark dial, machined bezel and a readable needle.
    cylinder(.073,.073,.023,0,.285,.516,dark,20,Math.PI/2);
    cylinder(.059,.059,.009,0,.285,.532,label,20,Math.PI/2);
    ring(.066,.006,0,.285,.531,alloy,false,20);
    for(let i=0;i<5;i++) {
      const a=-1.1+i*.55;
      box(.004,.012,.003,Math.sin(a)*.048,.285+Math.cos(a)*.048,.539,dark,0,0,-a);
    }
    box(.006,.052,.003,.009,.300,.541,hull,0,0,-.53);
    box(.32,.23,.019,0,-.09,.514,dark,.023);
    // Cut-metal hazard diamond and exclamation mark are real mesh geometry.
    box(.131,.131,.006,0,-.07,.527,yellow,0,0,Math.PI/4);
    box(.018,.07,.004,0,-.055,.532,dark,.003);
    box(.02,.02,.004,0,-.108,.532,dark,.004);
    for(const x of [-.133,.133]) cylinder(.010,.010,.010,x,-.09,.528,alloy,6,Math.PI/2);
    // Identification bars and rear relief port; no raster label dependency.
    for(const [x,w] of [[-.094,.063],[0,.042],[.085,.027]]) box(w,.012,.004,x,-.248,.516,label);
    cylinder(.064,.064,.025,0,.28,-.518,dark,12,Math.PI/2);
    cylinder(.038,.038,.025,0,.28,-.534,alloy,6,Math.PI/2);
  } else {
    const dark=mat('MagneticChassis',0x15242e,.77,.41);
    const shell=mat('SegmentedArmor',0x849ba4,.79,.31);
    const copper=mat('InductionWindings',0xc4895c,.84,.32);
    const emitter=mat('PulseCapacitor',0x9adbf1,.22,.24,0x1a6489);
    const yellow=mat('ArmingInterlock',0xe1b565,.20,.52);
    // Open six-panel housing exposes the coil bank between the armored petals.
    cylinder(.037,.037,.134,0,0,0,emitter,16);
    for(const y of [-.046,0,.046]) ring(.054,.0055,0,y,0,copper,true,20);
    for(let i=0;i<6;i++) {
      const a=i*Math.PI/3;
      piece(new T.SphereGeometry(.109,4,3,a+.13,Math.PI/3-.26,.52,Math.PI-1.04),shell);
      const curve=new T.CatmullRomCurve3([.35,.8,Math.PI/2,Math.PI-.8,Math.PI-.35].map(t=>
        new T.Vector3(Math.sin(a)*Math.sin(t)*.114,Math.cos(t)*.108,Math.cos(a)*Math.sin(t)*.114)));
      piece(new T.TubeGeometry(curve,8,.004,4,false),dark);
      // Separate recessed sensors and conductive contacts on the equatorial belt.
      box(.023,.024,.011,Math.sin(a)*.109,0,Math.cos(a)*.109,dark,.004,a);
      box(.013,.011,.004,Math.sin(a)*.116,0,Math.cos(a)*.116,i%2?yellow:emitter,.002,a);
    }
    ring(.11,.006,0,0,0,dark,true,28);
    for(const sign of [-1,1]) {
      cylinder(.044,.06,.018,0,sign*.086,0,dark,12);
      cylinder(.043,.043,.012,0,sign*.099,0,shell,12);
      cylinder(.026,.026,.01,0,sign*.11,0,sign>0?yellow:dark,12);
      ring(.055,.0045,0,sign*.076,0,copper,true,16);
    }
    // Positive arming slider and flush safety markings.
    box(.029,.006,.012,0,.114,0,dark,.003);
    for(const x of [-.025,.025]) box(.008,.004,.017,x,.107,0,emitter,.002);
    // Three magnetic contact feet are contained in the old .12m sweep radius.
    for(let i=0;i<3;i++) {
      const a=i*Math.PI*2/3;
      cylinder(.011,.011,.008,Math.sin(a)*.024,-.107,Math.cos(a)*.024,copper,8);
    }
  }
  mergeSurfaces(root);
  root.traverse(object=>{object.raycast=noRaycast;if(object.isMesh){object.castShadow=true;object.receiveShadow=true;object.userData.interactivePropVisual=true;}});
  return root;
}
export function setInteractivePropState(root,state='ready') {
  root.traverse(object=>{
    if(object.isMesh&&object.material.userData.interactiveMutable) object.material.emissiveIntensity=state==='danger'?.55:.08;
  });
}
export function interactivePropStats(root) {
  let meshes=0,triangles=0;const materials=new Set();
  root.traverse(object=>{if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;materials.add(object.material);}});
  const bounds=new T.Box3().setFromObject(root);
  return {meshes,triangles,materials:materials.size,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
}
export function disposeInteractiveProp(root) {
  const geometries=new Set(),materials=new Set();
  root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material);});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
export function createInteractivePropLibrary() {
  const templates=new Map(),owned=new Set();let disposed=false;
  return {
    create(type) {
      if(disposed)throw new Error('Interactive prop library disposed');
      if(!templates.has(type))templates.set(type,createInteractivePropVisual(type));
      const root=templates.get(type).clone(true);
      root.traverse(object=>{object.raycast=noRaycast;if(object.isMesh&&object.material.userData.interactiveMutable){object.material=object.material.clone();owned.add(object.material);}});
      return root;
    },
    stats:()=>({templates:templates.size}),
    dispose(){if(disposed)return;disposed=true;owned.forEach(m=>m.dispose());owned.clear();templates.forEach(disposeInteractiveProp);templates.clear();}
  };
}
