// Shared, DOM-free hard-surface tools for the A03/H12 batch. R07 stays unchanged.
import * as T from '../node_modules/three/build/three.module.js';
import {mergeGeometries} from '../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
export {T};
export const noRaycast = () => {};
export const material = (name,color,metalness=.6,roughness=.4,extra={}) => new T.MeshStandardMaterial({name,color,metalness,roughness,...extra});
export function node(parent,name,x=0,y=0,z=0) { const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g; }
export function mesh(parent,geometry,mat,pos=[0,0,0],rot=[0,0,0]) {
  const m=new T.Mesh(geometry,mat);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;
  m.raycast=noRaycast;m.userData.combatDecoration=true;parent.add(m);return m;
}
export const box=(p,size,pos,m,rot)=>mesh(p,new T.BoxGeometry(...size),m,pos,rot);
export const cylinder=(p,r1,r2,h,pos,m,rot=[0,0,0],segments=10)=>mesh(p,new T.CylinderGeometry(r1,r2,h,segments),m,pos,rot);
export function plate(p,points,depth,pos,m,bevel=.012,rot=[0,0,0]) {
  const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1});
  g.translate(0,0,-depth/2);return mesh(p,g,m,pos,rot);
}
export function panel(p,w,h,d,pos,m,bevel=.012,rot=[0,0,0]) {
  const x=w/2,y=h/2,c=Math.min(w,h)*.18;
  return plate(p,[[-x+c,-y],[x-c,-y],[x,-y+c],[x,y-c],[x-c,y],[-x+c,y],[-x,y-c],[-x,-y+c]],d,pos,m,bevel,rot);
}
export function strut(p,a,b,r1,r2,m) {
  const from=new T.Vector3(...a),to=new T.Vector3(...b),dir=to.clone().sub(from);
  const o=cylinder(p,r1,r2,dir.length(),from.add(to).multiplyScalar(.5).toArray(),m);
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return o;
}
export function loft(p,rings,m) {
  const positions=[],indices=[];
  for(const {y,x,z,offset=0} of rings) for(const [a,b] of [[-.65,1],[.65,1],[1,.58],[1,-.58],[.65,-1],[-.65,-1],[-1,-.58],[-1,.58]]) positions.push(a*x,y,b*z+offset);
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<8;i++){const a=j*8+i,b=j*8+(i+1)%8;indices.push(a,b,a+8,b,b+8,a+8);}
  const top=(rings.length-1)*8;for(let i=1;i<7;i++)indices.push(0,i+1,i,top,top+i,top+i+1);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);
  const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return mesh(p,flat,m);
}
export function bolt(p,x,y,z,m,r=.014) { return cylinder(p,r,r,.008,[x,y,z],m,[Math.PI/2,0,0],6); }
export function marking(p,text,[x,y,z],m,s=.012) {
  const font={'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['110','001','010','100','111'],'3':['110','001','010','001','110']};
  [...text].forEach((d,n)=>(font[d]||[]).forEach((line,j)=>[...line].forEach((c,i)=>{if(c==='1')box(p,[s*.83,s*.83,.002],[x+(n*4+i)*s,y-j*s,z],m);})));
}
export function hand(p,y,z,m,side=1) {
  panel(p,.125,.13,.12,[0,y,z],m.suit,.01);panel(p,.13,.068,.035,[0,y+.024,z+.07],m.armor,.005);
  for(let i=0;i<4;i++)cylinder(p,.013,.011,.072,[(i-1.5)*.029,y-.071,z+.012],m.suit,[.3,0,0],6);
  cylinder(p,.02,.015,.062,[-side*.073,y-.018,z],m.suit,[0,0,-side*.5],6);
}
export function optimize(root) {
  const nodes=[];root.traverse(o=>{if(o.isGroup)nodes.push(o);});
  for(const p of nodes){const batches=new Map();
    for(const o of p.children.slice())if(o.isMesh){o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);
      // No image maps in this batch: omit dead UV buffers, including from the GLB.
      for(const a of Object.keys(g.attributes))if(!['position','normal'].includes(a))g.deleteAttribute(a);
      const geos=batches.get(o.material)||[];geos.push(g);batches.set(o.material,geos);o.geometry.dispose();p.remove(o);}
    for(const [m,geos]of batches){const g=mergeGeometries(geos,false);geos.forEach(o=>o.dispose());if(!g)throw Error('Guard geometry merge failed');
      const o=mesh(p,g,m);o.name=p.name+'_'+m.name;g.computeBoundingBox();g.computeBoundingSphere();}
  }
}
export function stats(root) {
  let meshes=0,triangles=0;const materials=new Set();root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
    (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});return {meshes,triangles,materials:materials.size};
}
export function disposeVisual(v) {
  const geos=new Set();v.root.traverse(o=>{if(o.geometry)geos.add(o.geometry);});geos.forEach(g=>g.dispose());new Set(v.materials).forEach(m=>m.dispose());
}
