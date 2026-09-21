// Game-runtime copy of P01 SENTINEL arms (build pipeline: characters/player-arms/player-arms.js).
// P01 SENTINEL: original first-person arm/forearm assembly, +Y up / -Z camera forward.
// Rigid joint groups only, not a skinned human; pure Three.js, no DOM, gameplay, storage or textures.
import * as T from '../node_modules/three/build/three.module.js';
import {mergeGeometries} from '../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
export const PLAYER_ARMS_ASSET=Object.freeze({id:'P01',name:'SENTINEL',label:'哨兵第一人称手臂',version:'p01-v1',file:'player-arms-p01.glb'});
export const PLAYER_ARMS_CLIPS=Object.freeze(['Idle','Sprint','Reload','Melee','Hit']);
const TAU=Math.PI*2,noop=()=>{};
function material(name,color,metalness,roughness,extra={}){return new T.MeshStandardMaterial({name,color,metalness,roughness,...extra});}
function palette(accent){return {
  suit:material('P01_Undersuit',0x142127,.08,.9),
  glove:material('P01_Glove',0x2e3c42,.18,.74),
  armor:material('P01_Armor',0x50646b,.68,.41),
  shell:material('P01_Shell',0xb8c6c3,.42,.4),
  alloy:material('P01_Alloy',0x8fa3a6,.82,.3),
  accent:accent||material('P01_Indicator',0x8ee8ff,.24,.3,{emissive:0x8ee8ff,emissiveIntensity:1.1})
};}
function node(parent,name,x=0,y=0,z=0){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
function mesh(parent,geo,mat,pos=[0,0,0],rot=[0,0,0]){const m=new T.Mesh(geo,mat);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;m.raycast=noop;m.userData.combatDecoration=true;parent.add(m);return m;}
function box(parent,size,pos,mat,rot=[0,0,0]){return mesh(parent,new T.BoxGeometry(...size),mat,pos,rot);}
function cylinder(parent,r1,r2,length,pos,mat,rot=[0,0,0],segments=12){return mesh(parent,new T.CylinderGeometry(r1,r2,length,segments),mat,pos,rot);}
function plate(parent,points,depth,pos,mat,bevel=.012,rot=[0,0,0]){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,steps:1,curveSegments:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1});g.translate(0,0,-depth/2);return mesh(parent,g,mat,pos,rot);}
function panel(parent,w,h,d,pos,mat,bevel=.012,rot=[0,0,0]){const x=w/2,y=h/2,c=Math.min(w,h)*.17;return plate(parent,[[-x+c,-y],[x-c,-y],[x,-y+c],[x,y-c],[x-c,y],[-x+c,y],[-x,y-c],[-x,-y+c]],d,pos,mat,bevel,rot);}
function strut(parent,a,b,r1,r2,m){const from=new T.Vector3(...a),to=new T.Vector3(...b),dir=to.clone().sub(from);const o=cylinder(parent,r1,r2,dir.length(),from.add(to).multiplyScalar(.5).toArray(),m);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return o;}
function loft(parent,rings,mat){const pos=[],idx=[];for(const {y,x,z,offset=0}of rings)for(const [a,b]of[[-.65,1],[.65,1],[1,.58],[1,-.58],[.65,-1],[-.65,-1],[-1,-.58],[-1,.58]])pos.push(a*x,y,b*z+offset);for(let j=0;j<rings.length-1;j++)for(let i=0;i<8;i++){const a=j*8+i,b=j*8+(i+1)%8;idx.push(a,b,a+8,b,b+8,a+8);}const top=(rings.length-1)*8;for(let i=1;i<7;i++)idx.push(0,i+1,i,top,top+i,top+i+1);let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return mesh(parent,flat,mat);}
function bolt(parent,x,y,z,m,r=.014){return cylinder(parent,r,r,.008,[x,y,z],m,[Math.PI/2,0,0],6);}
function digitMark(parent,text,offset,scale,mat){
  const font={'0':['111','101','101','101','111'],'1':['010','110','010','010','111']};
  [...text].forEach((d,n)=>{
    const rows=font[d]||[];
    rows.forEach((row,j)=>[...row].forEach((v,i)=>{if(v==='1')box(parent,[scale*.83,scale*.83,.003],[offset[0]+(n*4+i)*scale,offset[1]-j*scale,offset[2]],mat);}));
  });
}
function forearmShell(fore,n,m,side){
  const fx=side>0?'R':'L',sign=side>0?1:-1;
  panel(fore,.13,.18,.16,[0,-.06,.01],m.suit,.018);
  panel(fore,.15,.22,.19,[0,-.025,.02],m.glove,.020);
  plate(fore,[[-.04,-.12],[.04,-.12],[.055,.065],[.035,.16],[0,.18],[-.035,.16],[-.055,.065]],.038,[0,-.125,.01],m.armor,.008);
  panel(fore,.18,.052,.19,[0,-.128,.01],m.armor,.012);
  panel(fore,.135,.09,.155,[0,-.205,.02],m.suit,.012);
  for(let i=0;i<5;i++)box(fore,[.015,.01,.12],[-.062+i*.031,-.188,.032],m.suit);
  panel(fore,.03,.09,.17,[.088,-.05,.0],m.armor,.006,[0,0,sign*.18]);
  cylinder(fore,.062,.062,.034,[0,.055,.02],m.alloy,[0,0,0]);
  cylinder(fore,.048,.048,.040,[0,.058,.02],m.armor,[0,0,0]);
  n['Elbow_'+fx]=node(fore,'P01_Elbow_'+fx,0,-.395,.02);
  const elbow=n['Elbow_'+fx];
  cylinder(elbow,.072,.072,.032,[0,0,0],m.alloy,[0,0,0]);
  cylinder(elbow,.052,.052,.036,[0,0,0],m.armor,[0,0,0]);
  cylinder(elbow,.032,.032,.040,[0,0,0],m.accent,[0,0,0]);
}
function buildHand(handRoot,m,side){
  const sign=side>0?1:-1;
  panel(handRoot,.115,.13,.105,[0,.05,.0],m.glove,.014);
  panel(handRoot,.12,.17,.11,[0,-.015,-.025],m.suit,.014);
  panel(handRoot,.118,.08,.115,[0,.03,-.07],m.armor,.010);
  strut(handRoot,[-sign*.055,-.035,.08],[-sign*.13,-.095,.15],.028,.035,m.glove);
  panel(handRoot,.12,.075,.045,[0,.115,-.02],m.armor,.008);
  for(let i=0;i<4;i++){
    const fx=(i-1.5)*.028;
    cylinder(handRoot,.014,.012,.055,[fx,.115,.0],m.glove,[.22,0,0],6);
    cylinder(handRoot,.012,.010,.045,[fx,.153,.038],m.glove,[.42,0,0],6);
    panel(handRoot,.02,.032,.022,[fx,.128,.014],m.armor,.003,[.22,0,0]);
    panel(handRoot,.016,.028,.018,[fx,.158,.047],m.glove,.002,[.42,0,0]);
  }
  cylinder(handRoot,.020,.015,.075,[sign*.077,.035,-.015],m.glove,[0,0,sign*-.55],6);
  plate(handRoot,[[-.045,-.03],[.045,-.03],[.059,.055],[.043,.075],[0,.09],[-.043,.075],[-.059,.055]],.018,[0,.008,.048],m.armor,.004,[0,0,sign*.16]);
}
function optimize(root){const nodes=[];root.traverse(o=>{if(o.isGroup)nodes.push(o);});
  for(const p of nodes){const batches=new Map();
    for(const o of p.children.slice())if(o.isMesh){o.updateMatrix();let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));const list=batches.get(o.material)||[];list.push(g);batches.set(o.material,list);o.geometry.dispose();p.remove(o);}  
    for(const [mat,geos]of batches){const g=mergeGeometries(geos,false);geos.forEach(x=>x.dispose());if(!g)throw Error('P01 geometry merge failed');const obj=mesh(p,g,mat);obj.name=p.name+'_'+mat.name;g.computeBoundingBox();g.computeBoundingSphere();}
  }
}
function breath(t){return Math.sin(t*TAU/2.1)}
function setPose(nodes,t,mode,hit){handPose(nodes,t,mode,Math.max(0,Math.min(1,hit)))}
export function posePlayerArms(rig,{time=0,mode='Idle',hit=0}={}){setPose(rig.nodes,time,mode,hit)}
function handPose(nodes,t,mode,hit=0){
  // Camera convention: -Z is forward. Arms bind along -Y, so large +X rotations
  // swing them toward the weapon receiver forward of the shooter.
  const b=v=>v?1:0;
  const recoil=hit>0?Math.sin(hit*Math.PI)*(1-hit):0,sprint=b(mode==='Sprint'),reload=b(mode==='Reload'),melee=b(mode==='Melee');
  const bob=Math.sin(t*TAU/.95)*.008+breath(t)*.003;
  nodes.Shoulders.position.set(0,1.235+bob*.35,sprint?-.013:0);
  nodes.Shoulders.rotation.set(bob*.22+sprint*.06,sprint?Math.sin(t*TAU/.28)*.028:0,reload?-.07:(melee?.05:0));
  nodes.Head.rotation.set(recoil*.15,-(sprint*.10)+recoil*.05,0);
  for(const side of [1,-1]){
    const q=side>0?'R':'L';
    const pump=sprint?Math.sin(t*TAU/.28+side*1.57):0;
    const m=(melee&&side>0)?1:0;
    const reach=(side<0&&reload)?.14:0;
    const leftDip=(side<0)?1:0;
    nodes['Shoulder_'+q].rotation.set(
      0.84+pump*.14-recoil*.12-m*.85-leftDip*sprint*.08,
      side*(.10-reload*.08)+(leftDip?.06:0)+m*.35,
      side*(.10-leftDip*.12)+m*.5);
    nodes['Forearm_'+q].rotation.set(
      .32+pump*.07-recoil*.06+leftDip*.04+(((reload&&!m&&side<0)?-.45:0))+reach,
      side*(.16+leftDip*.04)+m*.25,
      m?1.25*(1-hit):side*.03*sprint);
    nodes['Elbow_'+q].rotation.x=-.05+recoil*.05;
    nodes['Hand_'+q].rotation.set(
      -.74+leftDip*.10+pump*.05+recoil*.03,
      side*(.34-leftDip*.14),
      side*(.10+sprint*.06)+m*.4);
  }
}
export function createPlayerArmsVisual({accentMaterial=null}={}) {
  const m=palette(accentMaterial),root=new T.Group();root.name='P01_Visual';root.userData.assetVersion=PLAYER_ARMS_ASSET.version;
  root.userData.description='Original SENTINEL first-person arm assembly; rigid joints, +Y up, visual only.';
  const shoulders=node(root,'P01_Shoulders',0,1.235,0),head=node(shoulders,'P01_Head',0,.12,-.02),chest=node(shoulders,'P01_Chest',0,-.245,0);
  const rig={root,nodes:{Shoulders:shoulders,Head:head,Chest:chest}};const nodes=rig.nodes;
  node(root,'P01_BaseOffset',0,0,0);
  panel(head,.34,.12,.25,[0,.07,.08],m.armor,.015);panel(head,.30,.08,.18,[0,.015,.103],m.suit,.008);
  panel(chest,.62,.22,.36,[0,-.345,.015],m.suit,.020);panel(chest,.57,.10,.30,[0,-.30,.035],m.armor,.012);
  panel(chest,.17,.25,.09,[0,-.19,.18],m.armor,.010);panel(chest,.16,.07,.02,[0,-.205,.225],m.shell,.006);
  digitMark(chest,'01',[.055,-.13,.249],.010,m.shell);
  for(const s of [-1,1]){const q=s>0?'R':'L';nodes['Shoulder_'+q]=node(shoulders,'P01_Shoulder_'+q,s*.335,-.015,0);
    panel(nodes['Shoulder_'+q],.22,.30,.25,[0,0,0],m.armor,.018);plate(nodes['Shoulder_'+q],[[-.08,-.10],[.08,-.10],[.093,.11],[.065,.17],[0,.19],[-.065,.17],[-.093,.11]],.06,[0,.14,.02],m.shell,.012);
    panel(nodes['Shoulder_'+q],.24,.035,.28,[0,.155,.03],m.alloy,.006);for(let i=0;i<3;i++)box(nodes['Shoulder_'+q],[.02,.08,.02],[-.075+i*.075,.04,.145],m.suit);
    cylinder(nodes['Shoulder_'+q],.055,.055,.032,[0,.135,.16],m.accent,[0,0,0]);bolt(nodes['Shoulder_'+q],0,.155,.16,m.alloy,.012);
    nodes['Arm_'+q]=node(nodes['Shoulder_'+q],'P01_Arm_'+q,s*.03,-.015,.012);panel(nodes['Arm_'+q],.10,.34,.12,[0,-.08,.0],m.suit,.012);panel(nodes['Arm_'+q],.125,.19,.15,[0,-.045,.01],m.glove,.014);plate(nodes['Arm_'+q],[[-.05,-.15],[.05,-.15],[.06,.18],[.035,.26],[0,.28],[-.035,.26],[-.06,.18]],.04,[0,-.14,.01],m.armor,.008);
    nodes['Forearm_'+q]=node(nodes['Arm_'+q],'P01_Forearm_'+q,s*.016,-.41,0);forearmShell(nodes['Forearm_'+q],nodes,m,s);
    nodes['Hand_'+q]=node(nodes['Forearm_'+q],'P01_Hand_'+q,s*.012,-.425,.02);buildHand(nodes['Hand_'+q],m,s);
  }
  optimize(root);rig.materials=Object.values(m);return rig;
}
export function bindPlayerArmsRig(root){const names=['Shoulders','Head','Chest','Shoulder_R','Shoulder_L','Arm_R','Arm_L','Forearm_R','Forearm_L','Elbow_R','Elbow_L','Hand_R','Hand_L'];const nodes=Object.fromEntries(names.map(n=>[n,root.getObjectByName('P01_'+n)]));for(const [n,v]of Object.entries(nodes))if(!v)throw Error('Incomplete P01 rig: '+n);return {root,nodes};}
export function makePlayerArmsClips(root){
  const rig=bindPlayerArmsRig(root),clips=[],base=new Map();
  const snapshot=()=>{for(const n of Object.values(rig.nodes))base.set(n.uuid,{pos:n.position.clone(),quat:n.quaternion.clone(),scale:n.scale.clone()});};
  const restore=()=>{for(const n of Object.values(rig.nodes)){const b=base.get(n.uuid);n.position.copy(b.pos);n.quaternion.copy(b.quat);n.scale.copy(b.scale);}};
  snapshot();
  const writeClip=(name,duration,mode)=>{
    const frames=Math.max(2,Math.ceil(duration*30)),times=[],pos={},quat={};
    for(const n of Object.values(rig.nodes)){pos[n.uuid]=[];quat[n.uuid]=[];}
    for(let i=0;i<=frames;i++){const tsec=i/frames*duration;times.push(tsec);setPose(rig.nodes,tsec,mode,mode==='Hit'?1-(tsec/duration):0);for(const n of Object.values(rig.nodes)){pos[n.uuid].push(n.position.x,n.position.y,n.position.z);quat[n.uuid].push(n.quaternion.x,n.quaternion.y,n.quaternion.z,n.quaternion.w);}}
    const tracks=[];for(const n of Object.values(rig.nodes)){tracks.push(new T.VectorKeyframeTrack(n.name+'.position',times.slice(),pos[n.uuid].slice()));tracks.push(new T.QuaternionKeyframeTrack(n.name+'.quaternion',times.slice(),quat[n.uuid].slice()));}
    restore();return new T.AnimationClip(name,duration,tracks);
  };
  for(const mode of PLAYER_ARMS_CLIPS)clips.push(writeClip(mode,mode==='Sprint'||mode==='Melee'? .55:mode==='Hit'?.35:2.4,mode));
  restore();return clips;
}
export function playerArmsStats(root){let meshes=0,triangles=0;const mats=new Set();root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;(Array.isArray(o.material)?o.material:[o.material]).forEach(x=>mats.add(x));}});return {meshes,triangles,materials:mats.size};}
export function clonePlayerArmsVisual(template,accentMaterial=null){const clone=template.clone(true),rig=bindPlayerArmsRig(clone),mats=[];clone.traverse(o=>{if(o.isMesh){const src=Array.isArray(o.material)?o.material:[o.material];const out=src.map(mm=>mm.name==='P01_Indicator'&&accentMaterial?accentMaterial:mm.clone());o.material=Array.isArray(o.material)?out:out[0];mats.push(...out);}});return {root:clone,nodes:rig.nodes,materials:[...new Set(mats)]};}
export function disposePlayerArmsVisual(visual){const geoms=new Set();visual.root.traverse(o=>{if(o.geometry)geoms.add(o.geometry);});geoms.forEach(g=>g.dispose());new Set(visual.materials||[]).forEach(m=>m.dispose());}
