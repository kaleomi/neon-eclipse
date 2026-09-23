// V01–V04 / vehicles-v2. Metres, +Y up, -Z forward. Authored hard-surface geometry.
// Rigid skinning keeps independent moving parts in <=6 material batches, not dozens of draws.
// Only visuals live here: collision, locomotion, weapons, mission state and persistence stay outside.
import * as T from '../node_modules/three/build/three.module.js';

export const VEHICLE_VERSION = 'vehicles-v2';
export const VEHICLE_ASSETS = Object.freeze({
  rover: Object.freeze({id:'V01',name:'探索漫游车',file:'vehicle-rover-v01.glb'}),
  yacht: Object.freeze({id:'V02',name:'战斧巡逻快艇',file:'vehicle-yacht-v02.glb'}),
  aircraft: Object.freeze({id:'V03',name:'高空侦察机',file:'vehicle-aircraft-v03.glb'}),
  helicopter: Object.freeze({id:'V04',name:'战术运输直升机',file:'vehicle-helicopter-v04.glb'})
});
const noRaycast = () => {};
const released = new WeakSet();
const v2 = (x,y) => new T.Vector2(x,y);
const v3 = p => new T.Vector3(...p);

// Closed, capped longitudinal sections. Shared side vertices are optional for aerodynamic shells.
function loft(stations, ring, smooth=false) {
  const rows=stations.map(ring), n=rows[0].length, position=[], index=[];
  for(let k=0;k<rows.length;k++) for(const [x,y] of rows[k]) position.push(x,y,stations[k].z);
  for(let k=0;k<rows.length-1;k++) for(let j=0;j<n;j++) {
    const a=k*n+j,b=k*n+(j+1)%n,c=(k+1)*n+(j+1)%n,d=(k+1)*n+j;
    index.push(a,b,c,a,c,d);
  }
  for(const [k,front] of [[0,true],[rows.length-1,false]]) {
    const row=rows[k], offset=position.length/3;
    position.push(...row.reduce((a,p)=>[a[0]+p[0]/n,a[1]+p[1]/n],[0,0]),stations[k].z);
    for(const [x,y] of row) position.push(x,y,stations[k].z);
    for(let j=0;j<n;j++) {
      const a=offset+1+j,b=offset+1+(j+1)%n;
      index.push(offset,...(front?[b,a]:[a,b]));
    }
  }
  let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setIndex(index);
  if(!smooth||smooth==='longitudinal'){const flat=g.toNonIndexed();g.dispose();g=flat;}
  g.computeVertexNormals();
  if(smooth==='longitudinal'){
    // Smooth along a hull panel, but retain its hard chine against the next panel.
    const pos=g.attributes.position,norm=g.attributes.normal,limit=(rows.length-1)*n*6,sums=new Map(),keys=[];
    for(let i=0;i<limit;i++){const key=Math.floor(i/6)%n+':'+[pos.getX(i),pos.getY(i),pos.getZ(i)].join(',');keys.push(key);if(!sums.has(key))sums.set(key,new T.Vector3());sums.get(key).add(new T.Vector3().fromBufferAttribute(norm,i));}
    for(const v of sums.values())v.normalize();for(let i=0;i<limit;i++){const v=sums.get(keys[i]);norm.setXYZ(i,v.x,v.y,v.z);}
  }
  return g;
}
const oct = s => {
  const b=Math.min(s.b??.12,(s.hi-s.lo)*.25,s.w*.4);
  return [[-s.w+b,s.lo],[s.w-b,s.lo],[s.w,s.lo+b],[s.w,s.hi-b],[s.w-b,s.hi],[-s.w+b,s.hi],[-s.w,s.hi-b],[-s.w,s.lo+b]];
};
function ellipsoidSections(stations,segments=16) {
  return loft(stations,s=>Array.from({length:segments},(_,i)=>{
    const a=i*Math.PI*2/segments;return [Math.cos(a)*s.w,s.y+Math.sin(a)*s.h];
  }),true);
}
function prism(points,depth) {
  const shape=new T.Shape(points.map(p=>v2(...p)));
  const g=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:1});
  return g.translate(0,0,-depth/2);
}
function chamfer(w,h,d,b=.045) {
  return prism([[-w/2+b,-h/2],[w/2-b,-h/2],[w/2,-h/2+b],[w/2,h/2-b],[w/2-b,h/2],[-w/2+b,h/2],[-w/2,h/2-b],[-w/2,-h/2+b]],d);
}
function quad(points, hint=null) {
  if(hint){const n=v3(points[1]).sub(v3(points[0])).cross(v3(points[2]).sub(v3(points[0])));if(n.dot(v3(hint))<0)points=[...points].reverse();}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();return g;
}
function tire(radius,width,segments=16) {
  const pts=[[.56,-.5],[.83,-.5],[.98,-.33],[1,0],[.98,.33],[.83,.5],[.56,.5],[.56,-.5]];
  return new T.LatheGeometry(pts.map(([r,y])=>v2(r*radius,y*width)),segments);
}

function assembler(type) {
  const spec=VEHICLE_ASSETS[type],root=new T.Group(),bones=[],buckets=new Map(),palette=new Map();
  root.name=spec.id+'_Visual';root.userData={assetId:spec.id,vehicleType:type,version:VEHICLE_VERSION,axis:'+Y up, -Z front'};
  let bindBone=null;
  const bone=(name,parent=root,p=[0,0,0])=>{const b=new T.Bone();b.name=spec.id+'_'+name;b.position.set(...p);parent.add(b);bones.push(b);if(!bindBone&&name!=='RigRoot')bindBone=b;return b;};
  function material(key,color,metalness=.4,roughness=.5,emissive=0) {
    const m=new T.MeshStandardMaterial({name:spec.id+'_'+key,color:0xffffff,vertexColors:true,metalness,roughness,emissive,emissiveIntensity:emissive?.65:1});
    if(key==='Glass')m.side=T.DoubleSide;
    palette.set(key,{material:m,color});return m;
  }
  function put(g,key,p=[0,0,0],rotation=[0,0,0],joint=bindBone,color=null) {
    const {material:m,color:base}=palette.get(key),index=bones.indexOf(joint);
    if(index<0)throw Error('Unregistered rigid joint');
    const matrix=new T.Matrix4().compose(v3(p),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1));
    const geometry=g.index?g.toNonIndexed():g;if(geometry!==g)g.dispose();geometry.applyMatrix4(matrix);
    if(!buckets.has(m))buckets.set(m,[]);
    buckets.get(m).push({geometry,index,color:new T.Color(color??base)});
  }
  const box=(key,w,h,d,p,rotation=[0,0,0],joint=bindBone,color=null)=>put(new T.BoxGeometry(w,h,d),key,p,rotation,joint,color);
  function rod(key,a,b,r=.04,joint=bindBone,color=null,segments=6) {
    const av=v3(a),bv=v3(b),delta=bv.clone().sub(av),g=new T.CylinderGeometry(r,r,delta.length(),segments);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));
    put(g,key,av.add(bv).multiplyScalar(.5).toArray(),[0,0,0],joint,color);
  }
  function finish() {
    root.updateMatrixWorld(true);
    const articulated=bones.length>1,skeleton=articulated?new T.Skeleton(bones):null;
    if(!articulated)for(const b of bones)root.remove(b);
    for(const [material,parts] of buckets) {
      const count=parts.reduce((n,p)=>n+p.geometry.attributes.position.count,0);
      const position=new Float32Array(count*3),normal=new Float32Array(count*3),color=new Float32Array(count*3);
      const joints=articulated?new Uint16Array(count*4):null,weights=articulated?new Float32Array(count*4):null;
      let cursor=0,radius=0;
      for(const part of parts) {
        const g=part.geometry,n=g.attributes.position.count;
        position.set(g.attributes.position.array,cursor*3);normal.set(g.attributes.normal.array,cursor*3);
        for(let i=0;i<n;i++) {
          const j=cursor+i;color.set(part.color.toArray(),j*3);
          if(articulated){joints[j*4]=part.index;weights[j*4]=1;}
          radius=Math.max(radius,Math.hypot(...position.subarray(j*3,j*3+3)));
        }
        cursor+=n;g.dispose();
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(position,3));g.setAttribute('normal',new T.BufferAttribute(normal,3));g.setAttribute('color',new T.BufferAttribute(color,3));
      let mesh;
      if(articulated){g.setAttribute('skinIndex',new T.BufferAttribute(joints,4));g.setAttribute('skinWeight',new T.BufferAttribute(weights,4));mesh=new T.SkinnedMesh(g,material);mesh.bind(skeleton,new T.Matrix4());mesh.boundingSphere=new T.Sphere(new T.Vector3(),radius+.65);}
      else mesh=new T.Mesh(g,material);
      mesh.name=material.name+'_Surface';mesh.castShadow=mesh.receiveShadow=true;mesh.userData.vehicleVisual=true;root.add(mesh);
      g.computeBoundingBox();g.computeBoundingSphere();
    }
    root.traverse(o=>{o.raycast=noRaycast;});root.updateMatrixWorld(true);return root;
  }
  return {root,bone,material,put,box,rod,finish};
}

function rover(a) {
  const {bone,material,put,box,rod}=a,chassis=bone('RigRoot'),body=bone('Body',chassis);
  material('Paint',0xc5ad7d,.46,.52);material('Trim',0x283a40,.55,.48);material('Glass',0x305e6a,.5,.19);
  material('Rubber',0x172026,.1,.87);material('Lamp',0xd0fff0,.25,.24,0x41665b);material('Signal',0xe99960,.35,.48,0x49200c);
  // Armoured lower tub and a distinct sloped, framed two-seat cab.
  put(loft([{z:-2.02,w:.79,lo:.67,hi:1.02},{z:-1.65,w:.94,lo:.63,hi:1.28},{z:1.53,w:.94,lo:.63,hi:1.27},{z:1.94,w:.81,lo:.74,hi:1.16}],oct),'Paint');
  put(loft([{z:-.73,w:.87,lo:1.15,hi:1.40},{z:-.40,w:.86,lo:1.15,hi:2.02},{z:.92,w:.86,lo:1.15,hi:2.02},{z:1.30,w:.87,lo:1.15,hi:1.66}],oct),'Trim');
  put(quad([[-.75,1.42,-.747],[-.70,1.94,-.458],[.70,1.94,-.458],[.75,1.42,-.747]]),'Glass');
  rod('Paint',[0,1.40,-.760],[0,1.97,-.440],.028);
  box('Trim',1.5,.04,.06,[0,1.40,-.745]);
  put(chamfer(1.82,.10,1.40,.04),'Paint',[0,2.045,.25]);
  for(const side of [-1,1]) {
    const x=side*.867;
    put(quad([[x,1.46,-.37],[x,1.94,-.29],[x,1.94,.73],[x,1.46,.85]]),'Glass');
    box('Paint',.044,.47,1.29,[side*.943,1.27,.29]);
    box('Paint',.04,.58,.05,[side*.875,1.69,.26]);
    box('Trim',.055,.045,.24,[side*.98,1.37,.49]);
    box('Paint',.06,.03,.11,[side*1.013,1.37,.49],[0,0,0],body,0x9cadab);
    rod('Trim',[side*.80,1.68,-.42],[side*1.04,1.60,-.53],.035);
    put(chamfer(.17,.23,.10,.035),'Trim',[side*1.06,1.62,-.53]);
    box('Glass',.126,.15,.012,[side*1.06,1.63,-.587]);
    box('Trim',.16,.13,2.7,[side*.97,.68,.04]);
    for(const z of [-.63,.15,.85])box('Paint',.18,.015,.055,[side*.98,.754,z],[0,0,0],body,0x8fa2a0);
  }
  // Bonnet, recessed grille, towing eyes and inset lamps.
  put(loft([{z:-1.97,w:.72,lo:1.00,hi:1.10},{z:-.79,w:.79,lo:1.16,hi:1.29}],oct),'Paint');
  box('Trim',1.12,.25,.06,[0,.96,-2.031]);
  for(const x of [-.44,-.22,0,.22,.44])box('Paint',.075,.19,.022,[x,.97,-2.069]);
  for(const side of [-1,1]) {
    put(chamfer(.45,.24,.09,.045),'Trim',[side*.68,1.12,-1.976]);
    for(const x of [-.105,.105])put(new T.CylinderGeometry(.068,.068,.035,10),'Lamp',[side*.68+x,1.12,-2.04],[Math.PI/2,0,0]);
    box('Signal',.21,.08,.045,[side*.71,1.15,1.983]);
    rod('Signal',[side*.63,.77,-2.17],[side*.63,.89,-2.17],.032);
    box('Trim',.075,.08,.32,[side*.63,.80,-2.035]);
  }
  put(chamfer(1.99,.20,.23,.06),'Trim',[0,.70,-2.045]);
  put(chamfer(1.99,.18,.22,.06),'Trim',[0,.73,1.99]);
  for(const x of [-.37,.37])for(const z of [-1.76,-1.60,-1.44])box('Trim',.32,.014,.045,[x,1.182+(z+1.76)*.16,z]);
  // Low-profile luggage rails leave the existing roof turret's mount clear.
  for(const side of [-1,1])rod('Trim',[side*.77,2.17,-.37],[side*.77,2.17,.93],.036);
  for(const x of [-.72,.72])for(const z of [-.31,.85])box('Trim',.055,.13,.06,[x,2.10,z]);
  box('Trim',1.38,.08,.15,[0,2.15,-.37]);
  for(const x of [-.48,-.24,0,.24,.48])box('Lamp',.16,.075,.03,[x,2.16,-.454]);
  for(const side of [-1,1])put(chamfer(.38,.30,.48,.055),'Paint',[side*.47,1.40,1.52],[0,0,0],body,0x778b80);
  // Four articulated wheel assemblies: suspension/steering and axle rotation are separate bones.
  for(const x of [-1.02,1.02])for(const z of [-1.35,1.35]) {
    const id=(z<0?'F':'R')+(x<0?'L':'R'),steer=bone('Steer_'+id,chassis,[x,.57,z]),roll=bone('Wheel_'+id,steer);
    put(tire(.56,.4),'Rubber',[x,.57,z],[0,0,Math.PI/2],roll);
    put(new T.CylinderGeometry(.30,.30,.411,12),'Paint',[x,.57,z],[0,0,Math.PI/2],roll,0x90a29d);
    put(new T.CylinderGeometry(.105,.105,.42,10),'Trim',[x,.57,z],[0,0,Math.PI/2],roll);
    for(let i=0;i<16;i++) {
      const t=i*Math.PI/8;box('Rubber',.34,.032,.11,[x,.57+Math.cos(t)*.541,z+Math.sin(t)*.541],[t,0,0],roll,0x263238);
    }
    for(let i=0;i<6;i++) {
      const t=i*Math.PI/3;put(new T.CylinderGeometry(.029,.029,.014,6),'Trim',[x+Math.sign(x)*.199,.57+Math.cos(t)*.195,z+Math.sin(t)*.195],[0,0,Math.PI/2],roll);
    }
    const outer=[],inner=[];
    for(let i=0;i<=8;i++){const t=i*Math.PI/8;outer.push([Math.cos(t)*.72,.57+Math.sin(t)*.72]);inner.unshift([Math.cos(t)*.625,.57+Math.sin(t)*.625]);}
    const g=prism([...outer,...inner],.27);g.rotateY(Math.PI/2);put(g,'Paint',[Math.sign(x)*1.045,0,z]);
    rod('Trim',[x*.65,.71,z],[x*.86,1.12,z],.045);
  }
  put(tire(.40,.22,12),'Rubber',[0,1.26,2.04],[Math.PI/2,0,0]);
  put(new T.CylinderGeometry(.22,.22,.233,12),'Paint',[0,1.26,2.04],[Math.PI/2,0,0],body,0x90a29d);
  rod('Trim',[-.43,1.27,2.11],[.43,1.27,2.11],.035);
}

function yacht(a,hostile) {
  const {bone,material,put,box,rod}=a;bone('Hull');
  material('Paint',hostile?0x43545a:0xcfd6c4,.38,.42);material('Trim',hostile?0xbf7257:0x285361,.5,.47);
  material('Deck',hostile?0x63514b:0x8d8971,.22,.76);material('Glass',0x284e5d,.5,.17);
  material('Steel',0x9eb5ad,.77,.32);material('Lamp',hostile?0xff986a:0xc3f5d8,.25,.25,hostile?0x651c0b:0x335245);
  const stations=[{z:-6.30,w:.045,lo:.17,hi:1.46},{z:-5.45,w:1.08,lo:-.14,hi:1.46},{z:-3.9,w:2.08,lo:-.39,hi:1.39},{z:-1.8,w:2.41,lo:-.44,hi:1.32},{z:3.9,w:2.24,lo:-.39,hi:1.30},{z:4.65,w:2.12,lo:-.25,hi:1.28}];
  const hullRing=s=>[[0,s.lo],[s.w*.67,s.lo+.14],[s.w,s.hi-.24],[s.w*.97,s.hi],[-s.w*.97,s.hi],[-s.w,s.hi-.24],[-s.w*.67,s.lo+.14]];
  put(loft(stations,hullRing,'longitudinal'),'Paint');
  // Separate continuous sheer strake follows the bow rather than a rectangular slab.
  for(const side of [-1,1])for(let i=0;i<stations.length-1;i++) {
    const s=stations[i],t=stations[i+1];
    put(quad([[side*s.w*1.001,s.hi-.35,s.z],[side*s.w*1.001,s.hi-.20,s.z],[side*t.w*1.001,t.hi-.20,t.z],[side*t.w*1.001,t.hi-.35,t.z]],[side,0,0]),'Trim');
  }
  put(loft(stations.map(s=>({...s,w:s.w*.90,lo:s.hi+.012,hi:s.hi+.052,b:.015})),oct),'Deck');
  const deckY=z=>{const i=Math.max(0,stations.findIndex((s,j)=>j<stations.length-1&&z<=stations[j+1].z)),s=stations[i],t=stations[i+1];return s.hi+(t.hi-s.hi)*(z-s.z)/(t.z-s.z)+.059;};
  for(const x of [-1.65,-1.1,-.55,0,.55,1.1,1.65])for(const [z,t] of [[-3.50,-1.80],[-1.80,3.90],[3.90,4.40]])rod('Trim',[x,deckY(z),z],[x,deckY(t),t],.005,undefined,null,4);
  // Armoured wheelhouse; the swept front window and brow define the new silhouette.
  put(loft([{z:-1.93,w:1.38,lo:1.37,hi:1.95},{z:-1.33,w:1.48,lo:1.37,hi:2.58},{z:1.47,w:1.47,lo:1.37,hi:2.53}],oct),'Paint');
  put(quad([[-1.23,1.98,-1.919],[-1.25,2.45,-1.46],[1.25,2.45,-1.46],[1.23,1.98,-1.919]]),'Glass');
  for(const x of [-.44,.44])rod('Trim',[x,1.98,-1.923],[x,2.49,-1.43],.04);
  for(const side of [-1,1]) {
    for(const z of [-.86,.01,.88])put(quad([[side*1.493,1.91,z-.34],[side*1.493,2.39,z-.34],[side*1.493,2.39,z+.33],[side*1.493,1.91,z+.33]]),'Glass');
    box('Trim',.045,.033,2.72,[side*1.494,1.87,.05]);
    rod('Steel',[side*1.50,1.54,1.01],[side*1.50,1.78,1.01],.022);
  }
  put(chamfer(3.17,.12,3.17,.065),'Paint',[0,2.60,.04]);
  box('Trim',3.20,.075,.22,[0,2.585,-1.57]);
  // Aft access deck, engine hatch and twin waterjet housings.
  put(chamfer(2.92,.48,1.62,.12),'Paint',[0,1.59,3.08]);
  box('Trim',2.49,.045,1.10,[0,1.85,3.08]);
  for(const x of [-1,-.75,-.5,-.25,0,.25,.5,.75,1])box('Deck',.14,.018,.91,[x,1.882,3.08]);
  for(const x of [-.86,.86]) {
    put(new T.CylinderGeometry(.32,.37,.53,12),'Trim',[x,.42,4.64],[Math.PI/2,0,0]);
    put(new T.CylinderGeometry(.24,.24,.03,12),'Steel',[x,.42,4.92],[Math.PI/2,0,0]);
    put(new T.CylinderGeometry(.16,.16,.035,10),'Trim',[x,.42,4.941],[Math.PI/2,0,0]);
  }
  box('Trim',3.50,.14,.46,[0,1.12,4.74]);
  for(const x of [-1.08,1.08])box('Steel',.62,.018,.40,[x,1.20,4.77]);
  // Bow follows a segmented handrail, with cleats and a low winch.
  const path=[[-2.03,2.19,4.11],[-2.10,2.19,1.8],[-2.16,2.19,-1.8],[-1.84,2.27,-3.70],[-.94,2.33,-5.02],[0,2.35,-5.87]];
  for(const side of [-1,1])for(let i=0;i<path.length;i++) {
    const p=[path[i][0]*side,path[i][1],path[i][2]];
    rod('Steel',[p[0],1.40,p[2]],p,.027);
    if(i){const q=[path[i-1][0]*side,path[i-1][1],path[i-1][2]];rod('Steel',q,p,.027);}
  }
  for(const x of [-1.82,1.82])for(const z of [-2.75,3.84]){box('Steel',.31,.07,.20,[x,1.46,z]);rod('Steel',[x-.12,1.56,z],[x+.12,1.56,z],.032);}
  put(new T.CylinderGeometry(.25,.30,.19,12),'Trim',[0,1.50,-4.80]);rod('Steel',[-.28,1.64,-4.8],[.28,1.64,-4.8],.037);
  for(const x of [-.64,.64])put(chamfer(.57,.15,.69,.06),'Trim',[x,1.50,-3.30]);
  // Radar arch sits low and aft so the helm forward sightline stays clear (J01).
  for(const x of [-.75,.75])rod('Steel',[x,2.66,.57],[x*.63,3.02,.85],.045);
  box('Trim',1.14,.09,.33,[0,3.05,.85]);
  put(chamfer(1.53,.14,.30,.06),'Paint',[0,3.20,.85]);
  rod('Steel',[.45,2.67,1.46],[.45,3.26,1.46],.016);
  for(const side of [-1,1])box('Lamp',.20,.11,.17,[side*1.58,2.64,-.58],[0,0,0],undefined,side<0?0xf49073:0xb4f1d2);
  box('Lamp',.53,.09,.04,[0,2.62,-1.701]);
}

function aircraft(a) {
  const {bone,material,put,box,rod}=a,body=bone('Airframe'),prop=bone('Propeller',body,[0,0,-4.03]);
  material('Paint',0xc8cebd,.43,.46);material('Trim',0x305263,.55,.43);material('Glass',0x325a68,.54,.16);
  material('Steel',0xa3b5ac,.78,.33);material('Rubber',0x213039,.18,.73);material('Signal',0xf0c177,.38,.44,0x332207);
  put(ellipsoidSections([{z:-4.04,w:.35,h:.37,y:0},{z:-3.38,w:.53,h:.54,y:.02},{z:-1.87,w:.67,h:.66,y:.02},{z:-.40,w:.66,h:.63,y:0},{z:1.18,w:.49,h:.48,y:0},{z:2.98,w:.23,h:.25,y:.12},{z:3.76,w:.12,h:.17,y:.19}],16),'Paint');
  put(loft([{z:-2.08,w:.46,lo:.42,hi:.66},{z:-1.48,w:.57,lo:.49,hi:1.12},{z:-.33,w:.49,lo:.53,hi:1.05},{z:.14,w:.24,lo:.53,hi:.62}],oct),'Glass');
  for(const side of [-1,1])rod('Trim',[side*.48,.59,-1.97],[side*.50,1.06,-1.40],.028);
  rod('Trim',[-.50,1.072,-1.40],[.50,1.072,-1.40],.024);
  rod('Trim',[0,.67,-2.08],[0,1.14,-1.44],.022);
  // Cambered, tapered wings with actual swept tips, not full-span boxes.
  for(const side of [-1,1]) {
    const rows=[{z:side*.51,lead:-.99,trail:1.26,y:.16,t:.12},{z:side*2.18,lead:-.76,trail:1.17,y:.24,t:.095},{z:side*4.72,lead:-.4051,trail:.9891,y:.3722,t:.07065},{z:side*5.83,lead:-.25,trail:.91,y:.43,t:.06},{z:side*6.17,lead:-.06,trail:.77,y:.47,t:.032}];
    const profile=s=>[[-s.trail,s.y],[-(s.lead*.34+s.trail*.66),s.y-s.t*.4],[-s.lead,s.y],[-(s.lead*.76+s.trail*.24),s.y+s.t],[-(s.lead*.3+s.trail*.7),s.y+s.t*.5]];
    // Split solid spans at the colour boundary: no near-coplanar wingtip overlay.
    for(const [sections,key] of [[rows.slice(0,3),'Paint'],[rows.slice(2),'Trim']]){
      const wing=loft(sections.sort((a,b)=>a.z-b.z),profile);wing.rotateY(Math.PI/2);put(wing,key);
    }
    rod('Trim',[side*2.13,.308,.83],[side*5.65,.475,.74],.012);
    box('Signal',.13,.02,.72,[side*5.95,.51,.30],[0,side*.04,0]);
    rod('Steel',[side*.46,-.12,.30],[side*1.02,-.96,.23],.055);
    rod('Trim',[side*.42,-.33,.71],[side*1.02,-.86,.23],.037);
    put(tire(.32,.24,12),'Rubber',[side*1.02,-.98,.23],[0,0,Math.PI/2]);
    put(new T.CylinderGeometry(.155,.155,.253,10),'Steel',[side*1.02,-.98,.23],[0,0,Math.PI/2]);
    put(new T.SphereGeometry(.066,8,6),'Signal',[side*6.13,.50,.28],[0,0,0],body,side<0?0xf19279:0xb9eed8);
    // Cooling gills and flush engine access fasteners.
    for(const z of [-3.43,-3.16,-2.89])box('Trim',.026,.18,.08,[side*.508,.02,z],[0,0,side*.08]);
    for(const z of [-3.52,-2.28])put(new T.CylinderGeometry(.025,.025,.023,6),'Steel',[side*.542,.17,z],[0,0,Math.PI/2]);
    const tail=prism([[.19,2.95],[1.99,3.35],[2.16,3.78],[.17,4.02]],.075);tail.rotateX(Math.PI/2);
    if(side<0){tail.scale(-1,1,1);const pos=tail.attributes.position,norm=tail.attributes.normal;for(let i=0;i<pos.count;i+=3)for(const attr of [pos,norm])for(let c=0;c<3;c++){const k=(i+1)*3+c,j=(i+2)*3+c,t=attr.array[k];attr.array[k]=attr.array[j];attr.array[j]=t;}}
    put(tail,'Paint',[0,.46,0]);
  }
  // Fin and rudder are a closed swept profile.
  const fin=prism([[-2.62,.22],[-3.23,1.80],[-3.60,1.87],[-4.09,.39],[-3.99,.20]],.14);fin.rotateY(Math.PI/2);put(fin,'Trim');
  box('Signal',.15,.105,.49,[0,1.60,3.38],[.29,0,0]);
  rod('Steel',[0,-.02,2.89],[0,-.99,3.13],.041);
  put(tire(.18,.15,10),'Rubber',[0,-1.105,3.13],[0,0,Math.PI/2]);
  rod('Steel',[0,.47,.70],[0,1.16,.96],.014);
  // Under-fuselage reconnaissance optics and service pod.
  put(new T.SphereGeometry(.225,10,7),'Trim',[0,-.60,-.63]);
  put(new T.CylinderGeometry(.10,.12,.05,10),'Glass',[0,-.60,-.864],[Math.PI/2,0,0]);
  put(chamfer(.40,.17,.85,.05),'Trim',[0,-.54,.50]);
  for(let i=0;i<4;i++) {
    const blade=prism([[.035,.15],[.12,.72],[.055,1.20],[-.12,1.235],[-.20,.79],[-.12,.22]],.058);blade.rotateZ(i*Math.PI/2);put(blade,'Rubber',[0,0,-4.03],[0,0,0],prop);
    const tip=prism([[.06,1.06],[.055,1.20],[-.12,1.235],[-.15,1.07]],.061);tip.rotateZ(i*Math.PI/2);put(tip,'Signal',[0,0,-4.03],[0,0,0],prop);
  }
  put(new T.CylinderGeometry(.30,.30,.13,12),'Steel',[0,0,-4.016],[Math.PI/2,0,0],prop);
  put(new T.ConeGeometry(.29,.48,16),'Signal',[0,0,-4.22],[-Math.PI/2,0,0],prop);
}

function helicopter(a) {
  const {bone,material,put,box,rod}=a,body=bone('Attitude'),rotor=bone('Rotor',body,[0,3.29,.14]),blades=bone('RotorBlades',rotor),tail=bone('TailRotor',body,[.23,2.34,5.07]);
  material('Paint',0x677d72,.38,.57);material('Trim',0x233a41,.52,.46);material('Glass',0x2b5764,.53,.18);
  material('Steel',0x9cafa7,.75,.34);material('Rubber',0x223137,.28,.68);material('Signal',0xe1b476,.35,.46);
  put(loft([{z:-2.23,w:.46,lo:.96,hi:1.76},{z:-1.54,w:1.08,lo:.59,hi:2.47},{z:-.55,w:1.19,lo:.53,hi:2.50},{z:1.20,w:1.12,lo:.57,hi:2.38},{z:1.81,w:.58,lo:1.16,hi:2.10}],oct),'Paint');
  put(quad([[-.33,1.80,-2.228],[-.80,2.41,-1.618],[.80,2.41,-1.618],[.33,1.80,-2.228]]),'Glass');
  rod('Trim',[0,1.77,-2.251],[0,2.44,-1.603],.04);
  rod('Signal',[-.85,2.445,-1.600],[.85,2.445,-1.600],.042);
  for(const side of [-1,1]) {
    put(quad([[side*1.108,1.39,-1.46],[side*1.119,2.27,-1.35],[side*1.201,2.29,-.61],[side*1.200,1.39,-.62]],[side,0,0]),'Glass');
    box('Trim',.024,1.16,1.24,[side*1.20,1.52,.30]);
    put(chamfer(.025,1.07,1.16,.009),'Paint',[side*1.218,1.52,.30]);
    box('Glass',.032,.46,.75,[side*1.236,1.76,.25]);
    rod('Steel',[side*1.25,2.15,-.42],[side*1.25,2.15,1.21],.022);
    rod('Signal',[side*1.255,1.22,-.09],[side*1.255,1.22,.19],.025);
    for(const z of [-1.03,1.02])rod('Steel',[side*.72,1.12,z],[side*1.31,.10,z],.064);
    rod('Steel',[side*1.32,.078,-1.88],[side*1.32,.078,2.11],.077,body,null,8);
    rod('Steel',[side*1.32,.078,-1.88],[side*1.32,.36,-2.33],.077,body,null,8);
    rod('Signal',[side*1.18,.78,-.68],[side*1.18,.78,.75],.056);
    rod('Trim',[side*.96,1.06,-.59],[side*1.18,.78,-.59],.044);
    rod('Trim',[side*.96,1.06,.65],[side*1.18,.78,.65],.044);
    // Paired turbine cowlings, separate intake lip and exhaust bore.
    put(ellipsoidSections([{z:-.08,w:.25,h:.18,y:2.65},{z:.18,w:.29,h:.25,y:2.70},{z:1.12,w:.24,h:.22,y:2.65},{z:1.41,w:.18,h:.17,y:2.56}],12).translate(side*.61,0,0),'Trim');
    put(new T.CylinderGeometry(.19,.21,.12,12),'Steel',[side*.61,2.68,-.10],[Math.PI/2,0,0]);
    put(new T.CylinderGeometry(.142,.142,.015,12),'Rubber',[side*.61,2.68,-.17],[Math.PI/2,0,0]);
    put(new T.CylinderGeometry(.15,.18,.29,12),'Steel',[side*.61,2.59,1.40],[Math.PI/2,0,0]);
    put(new T.CylinderGeometry(.117,.117,.017,12),'Rubber',[side*.61,2.59,1.56],[Math.PI/2,0,0]);
    for(const z of [.3,.51,.72,.93])box('Paint',.033,.17,.058,[side*.91,2.68,z]);
    put(new T.SphereGeometry(.066,8,6),'Signal',[side*1.23,1.07,-.45],[0,0,0],body,side<0?0xe79577:0xa4dec4);
  }
  put(ellipsoidSections([{z:1.49,w:.39,h:.32,y:1.76},{z:2.13,w:.34,h:.30,y:1.93},{z:4.98,w:.15,h:.18,y:2.31}],12),'Paint');
  put(chamfer(2.18,.09,.51,.035),'Signal',[0,2.04,4.36]);
  const fin=prism([[-4.63,2.03],[-4.48,3.27],[-4.86,3.31],[-5.32,2.24],[-5.28,1.94]],.15);fin.rotateY(Math.PI/2);put(fin,'Paint');
  box('Signal',.157,.14,.35,[0,3.19,4.73],[.24,0,0]);
  for(const z of [2.39,2.62,2.85])box('Trim',.017,.075,.075,[.304,2.08,z]);
  // Mast, pitch links and four closed swept blades retain the original 3.29m pivot.
  put(new T.CylinderGeometry(.115,.16,.62,12),'Steel',[0,3.00,.14]);
  put(new T.CylinderGeometry(.28,.28,.14,12),'Trim',[0,3.30,.14]);
  for(let i=0;i<4;i++) {
    const t=i*Math.PI/2;
    const blade=prism([[-.10,.23],[.13,.26],[.17,3.69],[.05,4.61],[-.16,4.62],[-.24,3.69]],.052);blade.rotateX(Math.PI/2);blade.rotateY(t);put(blade,'Rubber',[0,3.29,.14],[0,0,0],blades);
    const tip=prism([[-.16,4.18],[.103,4.18],[.05,4.61],[-.16,4.62]],.055);tip.rotateX(Math.PI/2);tip.rotateY(t);put(tip,'Signal',[0,3.29,.14],[0,0,0],blades);
    const ax=Math.sin(t),az=Math.cos(t);rod('Steel',[ax*.11,3.10,.14+az*.11],[ax*.45,3.30,.14+az*.45],.026,blades);
  }
  // Anti-torque rotor: newly present in the delivered GLB as well as in the game.
  put(new T.CylinderGeometry(.125,.125,.19,10),'Steel',[.25,2.34,5.07],[0,0,Math.PI/2],tail);
  for(let i=0;i<3;i++) {
    const t=i*Math.PI*2/3;box('Rubber',.051,.115,1.30,[.23,2.34,5.07],[t,0,0],tail);
    for(const sign of [-1,1])box('Signal',.054,.118,.12,[.23,2.34-Math.sin(t)*sign*.56,5.07+Math.cos(t)*sign*.56],[t,0,0],tail);
  }
  // Compact observation sensor; no new weapon or muzzle contract is introduced here.
  put(new T.SphereGeometry(.19,10,7),'Trim',[0,.77,-1.69]);
  put(new T.CylinderGeometry(.085,.085,.04,10),'Glass',[0,.75,-1.875],[Math.PI/2,0,0]);
  rod('Steel',[.14,2.45,-.36],[.14,2.90,-.63],.014);
}

export function createVehicleVisual(type,{hostile=false}={}) {
  if(!VEHICLE_ASSETS[type])throw new RangeError('Unknown vehicle: '+type);
  const a=assembler(type);
  if(type==='rover')rover(a);else if(type==='yacht')yacht(a,hostile);else if(type==='aircraft')aircraft(a);else helicopter(a);
  const root=a.finish();if(hostile)root.userData.variant='hostile';return root;
}

export function vehicleStats(root) {
  let meshes=0,triangles=0;const materials=new Set();root.updateMatrixWorld(true);
  root.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
  const bounds=new T.Box3().setFromObject(root,true);
  return {meshes,triangles,materials:materials.size,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
}
export function vehicleRigStats(root) {
  const skeletons=new Set();root.traverse(o=>{if(o.skeleton)skeletons.add(o.skeleton);});
  const joints=new Set([...skeletons].flatMap(s=>s.bones));
  return {skins:skeletons.size,joints:joints.size,rigidSkinning:skeletons.size>0};
}
export function disposeVehicle(root) {
  if(released.has(root))return;released.add(root);
  const geometries=new Set(),materials=new Set(),skeletons=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});
  for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const s of skeletons)s.dispose();
}
