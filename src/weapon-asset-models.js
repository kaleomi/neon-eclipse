// W01–W08 / weapons-v2. Independent, DOM-free authored geometry; no arms, rules or saves.
// Metres in the original canonical coordinate system. The viewmodel adapter applies its original .65 scale.
// Rigid, single-joint weights batch moving hardware without bending the hard-surface panels.
import * as T from '../node_modules/three/build/three.module.js';
export const WEAPON_MODEL_VERSION='weapons-v2';
export const WEAPON_ASSETS=Object.freeze([
 ['W01','VG-30','vanguard','先锋突击步枪'],['W02','BR-08','breacher','破门霰弹枪'],
 ['W03','GH-15','ghost','幽灵消音手枪'],['W04','ARC-01','arcblade','电弧战刃'],
 ['W05','TM-36','tempest','风暴冲锋枪'],['W06','HL-24','halo','光环精准步枪'],
 ['W07','RS-01','railspike','磁轨穿透枪'],['W08','VT-06','volt','雷霆电弧霰弹枪']
].map(([id,code,key,name],index)=>Object.freeze({id,code,key,name,index,weaponId:index===3?'arc-blade':key,file:`weapon-${key}-${id.toLowerCase()}.glb`})));
const bindings=new WeakMap(),released=new WeakSet(),noRaycast=()=>{},V=p=>new T.Vector3(...p);
const oct=s=>{const b=Math.min(s.b??.012,s.w*.35,(s.hi-s.lo)*.23);return [[-s.w+b,s.lo],[s.w-b,s.lo],[s.w,s.lo+b],[s.w,s.hi-b],[s.w-b,s.hi],[-s.w+b,s.hi],[-s.w,s.hi-b],[-s.w,s.lo+b]];};
function loft(rows,profile=oct,smooth=false){
 const rings=rows.map(profile),n=rings[0].length,p=[],ix=[];
 for(let k=0;k<rows.length;k++)for(const [x,y] of rings[k])p.push(x,y,rows[k].z);
 for(let k=0;k<rows.length-1;k++)for(let j=0;j<n;j++){const a=k*n+j,b=k*n+(j+1)%n,c=(k+1)*n+(j+1)%n,d=(k+1)*n+j;ix.push(a,b,c,a,c,d);}
 for(const [k,front] of [[0,true],[rows.length-1,false]]){const offset=p.length/3,ring=rings[k];p.push(...ring.reduce((s,v)=>[s[0]+v[0]/n,s[1]+v[1]/n],[0,0]),rows[k].z);for(const v of ring)p.push(...v,rows[k].z);for(let j=0;j<n;j++)ix.push(offset,...(front?[offset+1+(j+1)%n,offset+1+j]:[offset+1+j,offset+1+(j+1)%n]));}
 let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);if(!smooth){const q=g.toNonIndexed();g.dispose();g=q;}g.computeVertexNormals();return g;
}
function bevel(w,h,d,b=.010){
 b=Math.min(b,w*.18,h*.18,d*.18);const sections=[[-d/2,b*.5],[-d/2+b,0],[d/2-b,0],[d/2,b*.5]];
 return loft(sections.map(([z,inset])=>({z,w:w/2-inset,lo:-h/2+inset,hi:h/2-inset,b})));
}
function prismYZ(points,width,holes=[]){
 const shape=new T.Shape(points.map(([z,y])=>new T.Vector2(-z,y)));
 for(const hole of holes)shape.holes.push(new T.Path(hole.map(([z,y])=>new T.Vector2(-z,y))));
 const g=new T.ExtrudeGeometry(shape,{depth:width,steps:1,bevelEnabled:false,curveSegments:1});g.translate(0,0,-width/2);g.rotateY(Math.PI/2);return g;
}
function plate(points,hint){
 if(V(points[1]).sub(V(points[0])).cross(V(points[2]).sub(V(points[0]))).dot(V(hint))<0)points=[...points].reverse();
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();return g;
}
function sleeve(radius,length,segments=16){
 const b=Math.min(.008,length*.22);return new T.LatheGeometry([[radius*.72,-length/2],[radius*.91,-length/2],[radius,-length/2+b],[radius,length/2-b],[radius*.91,length/2],[radius*.72,length/2],[radius*.72,-length/2]].map(p=>new T.Vector2(...p)),segments).rotateX(Math.PI/2);
}
const GLYPHS={
 V:[[0,1,.5,0],[.5,0,1,1]],G:[[1,1,0,1],[0,1,0,0],[0,0,1,0],[1,0,1,.5],[1,.5,.5,.5]],B:[[0,0,0,1],[0,1,.85,1],[.85,1,1,.75],[1,.75,.7,.52],[0,.52,.7,.52],[.7,.52,1,.25],[1,.25,.85,0],[.85,0,0,0]],R:[[0,0,0,1],[0,1,.85,1],[.85,1,1,.75],[1,.75,.7,.52],[.7,.52,0,.52],[.55,.52,1,0]],A:[[0,0,.5,1],[.5,1,1,0],[.22,.45,.78,.45]],C:[[1,1,0,1],[0,1,0,0],[0,0,1,0]],T:[[0,1,1,1],[.5,1,.5,0]],M:[[0,0,0,1],[0,1,.5,.45],[.5,.45,1,1],[1,1,1,0]],H:[[0,0,0,1],[1,0,1,1],[0,.5,1,.5]],L:[[0,1,0,0],[0,0,1,0]],S:[[1,1,0,1],[0,1,0,.5],[0,.5,1,.5],[1,.5,1,0],[1,0,0,0]],'-':[[.15,.5,.85,.5]],
 '0':[[0,0,0,1],[0,1,1,1],[1,1,1,0],[1,0,0,0]],'1':[[.3,.8,.6,1],[.6,1,.6,0]],'2':[[0,1,1,1],[1,1,1,.5],[1,.5,0,.5],[0,.5,0,0],[0,0,1,0]],'3':[[0,1,1,1],[1,1,1,0],[0,.5,1,.5],[0,0,1,0]],'4':[[0,1,0,.5],[0,.5,1,.5],[1,1,1,0]],'5':[[1,1,0,1],[0,1,0,.5],[0,.5,1,.5],[1,.5,1,0],[1,0,0,0]],'6':[[1,1,0,1],[0,1,0,0],[0,0,1,0],[1,0,1,.5],[1,.5,0,.5]],'8':[[0,0,0,1],[0,1,1,1],[1,1,1,0],[1,0,0,0],[0,.5,1,.5]]
};
function assembler(spec){
 const root=new T.Group();root.name=spec.weaponId.toUpperCase();root.userData={assetId:spec.id,weaponId:spec.weaponId,weaponIndex:spec.index,code:spec.code,version:WEAPON_MODEL_VERSION};
 const bones=[],batches=new Map(),palette=new Map();let transform=new T.Matrix4();
 const bone=(name,parent=root,p=[0,0,0])=>{const b=new T.Bone();b.name=spec.id+'_'+name;b.position.set(...p);parent.add(b);bones.push(b);return b;};
 const body=bone('Body');
 function material(key,color,metalness=.45,roughness=.48,extra={}){const m=new T.MeshStandardMaterial({name:spec.id+'_'+key,color:0xffffff,vertexColors:true,metalness,roughness,...extra});palette.set(key,{m,color});return m;}
 function put(geometry,key,p=[0,0,0],rotation=[0,0,0],joint=body,tint=null){
  const entry=palette.get(key);if(!entry)throw Error('Unknown material '+key);const bi=bones.indexOf(joint);if(bi<0)throw Error('Unknown joint');
  const m=new T.Matrix4().compose(V(p),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1));m.premultiply(transform);
  const g=geometry.index?geometry.toNonIndexed():geometry;if(g!==geometry)geometry.dispose();g.applyMatrix4(m);
  if(!batches.has(entry.m))batches.set(entry.m,[]);batches.get(entry.m).push({g,bi,color:new T.Color(tint??entry.color)});
 }
 const box=(key,w,h,d,p=[0,0,0],rotation=[0,0,0],joint=body,tint=null)=>put(new T.BoxGeometry(w,h,d),key,p,rotation,joint,tint);
 const chamfer=(key,w,h,d,p=[0,0,0],rotation=[0,0,0],joint=body,tint=null,b=.01)=>put(bevel(w,h,d,b),key,p,rotation,joint,tint);
 const cylinder=(key,r,len,p,rotation=[Math.PI/2,0,0],joint=body,tint=null,n=12)=>put(new T.CylinderGeometry(r,r,len,n),key,p,rotation,joint,tint);
 function rod(key,a,b,r=.004,joint=body,tint=null,n=6){const av=V(a),bv=V(b),delta=bv.clone().sub(av),g=new T.CylinderGeometry(r,r,delta.length(),n);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));put(g,key,av.add(bv).multiplyScalar(.5).toArray(),[0,0,0],joint,tint);}
 function pose(p,rotation,fn){const previous=transform;transform=transform.clone().multiply(new T.Matrix4().compose(V(p),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1)));fn();transform=previous;}
 function code(text,x,y,z,h=.026,joint=body){
  const direction=x>0?-1:1,advance=h*.88,origin=z-direction*text.length*advance/2;
  for(let i=0;i<text.length;i++)for(const [u,v,uu,vv] of GLYPHS[text[i]]||[]){
   const z1=origin+direction*(i*.88+u*.57)*h,z2=origin+direction*(i*.88+uu*.57)*h,y1=y+v*h,y2=y+vv*h,dz=z2-z1,dy=y2-y1,length=Math.hypot(dz,dy);
   box('Metal',.0015,.0022,length,[x,(y1+y2)/2,(z1+z2)/2],[Math.atan2(-dy,dz),0,0],joint,0xbad0ce);
  }
 }
 function finish(){
  root.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);
  for(const [material,parts] of batches){
   const count=parts.reduce((n,p)=>n+p.g.attributes.position.count,0),pos=new Float32Array(count*3),normal=new Float32Array(count*3),color=new Float32Array(count*3),skinIndex=new Uint16Array(count*4),skinWeight=new Float32Array(count*4);let at=0,radius=0;
   for(const {g,bi,color:rgb} of parts){const n=g.attributes.position.count;pos.set(g.attributes.position.array,at*3);normal.set(g.attributes.normal.array,at*3);
    for(let i=0;i<n;i++){const j=at+i;color.set(rgb.toArray(),j*3);skinIndex[j*4]=bi;skinWeight[j*4]=1;radius=Math.max(radius,Math.hypot(pos[j*3],pos[j*3+1],pos[j*3+2]));}at+=n;g.dispose();}
   const g=new T.BufferGeometry();for(const [key,array,size] of [['position',pos,3],['normal',normal,3],['color',color,3],['skinIndex',skinIndex,4],['skinWeight',skinWeight,4]])g.setAttribute(key,new T.BufferAttribute(array,size));
   g.computeBoundingBox();g.computeBoundingSphere();const mesh=new T.SkinnedMesh(g,material);mesh.name=material.name+'_Surface';mesh.bind(skeleton,new T.Matrix4());mesh.boundingSphere=new T.Sphere(new T.Vector3(),radius+.8);mesh.userData.weaponVisual=true;root.add(mesh);
  }
  for(const {m} of palette.values())if(!batches.has(m))m.dispose();root.traverse(o=>{o.raycast=noRaycast;});root.updateMatrixWorld(true);return root;
 }
 return {root,body,bone,palette,material,put,box,chamfer,cylinder,rod,pose,code,finish};
}
function palette(a,i){
 const coats=[0x59756d,0x9b7050,0x4a596a,0x3b6667,0x817d58,0x687b87,0x665b78,0x4a6974];
 a.material('Frame',0x344650,.6,.43);a.material('Panel',coats[i],.42,.55);a.material('Dark',0x17242b,.18,.77);a.material('Metal',0x8ca5ac,.8,.3);
 a.material('Warm',i===1?0xbe7050:0xc5a06a,.7,.4);a.material('Lens',0x57afa8,.22,.18,{transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide});
 a.material('Signal',i===1||i===4?0xe7bc78:0x92e8d4,.36,.33,{emissive:i===1||i===4?0x61471c:0x235b51,emissiveIntensity:1});
 if(i===6)a.material('Energy',0xeaa566,.4,.3,{emissive:0x773510,emissiveIntensity:1});
 if(i===7)a.material('Energy',0x72e7d9,.4,.2,{emissive:0x247f78,emissiveIntensity:1.2});
}
function controls(a,i){
 const {body,bone}=a,grip=i===3?[0,-.07,.11]:[.015,-.16,i===4?.24:.26];
 const right=bone('Grip_R',body,grip);right.userData.gripAnchor=true;
 const c={body,right,support:null,pumpSupport:null,pump:null,magazine:null,bolt:null,energy:null};
 if(i!==3)c.bolt=bone('Bolt',body,[0,i<3?.13:i===5?.145:i===7?.16:.14,-.01]);
 if(![1,3].includes(i))c.magazine=bone('Magazine',body);
 if(i===0||i===1)c.pump=bone('Pump',body,[0,0,-.39]);
 if(i===1){c.pumpSupport=bone('PumpSupport',c.pump,[-.025,-.125,.06]);c.pumpSupport.rotation.z=-.25;c.pumpSupport.userData.gripAnchor=true;}
 else if([0,2,4,5,7].includes(i)){c.support=bone('Support_L',body,i===2?[-.15,-.18,.22]:[-.02,-.115,-.28]);if(i!==2)c.support.rotation.z=-.25;c.support.userData.gripAnchor=true;}
 const muzzle=[[0,.055,-1.007],[0,.055,-1.007],[0,.08,-.584],[-.055,.9,-.255],[0,.055,-.594],[0,.06,-1.125],[0,.07,-.625],[0,.05,-.775]][i];
 c.muzzle=bone(i===3?'Tip':'Muzzle',body,muzzle);c.muzzle.userData.attachmentRole=i===3?'blade-tip':'muzzle-reference';
 if(i>=6)c.energy=a.palette.get('Energy').m;return c;
}
function grip(a,{width=.12,height=.27,depth=.16,y=-.17,z=.17,angle=-.28}={}){
 a.pose([0,y,z],[angle,0,0],()=>{
  a.chamfer('Dark',width,height,depth);
  for(const side of [-1,1]){
   a.chamfer('Panel',.006,height*.77,depth*.76,[side*(width/2+.002),0,.005],[0,0,0],undefined,null,.001);
   for(const q of [-.075,-.025,.025,.075])a.box('Dark',.008,.013,depth*.65,[side*(width/2+.006),q,.005]);
   for(const q of [-height*.34,height*.34])a.cylinder('Metal',.010,.012,[side*(width/2+.008),q,.007],[0,0,Math.PI/2],undefined,null,6);
  }
  a.chamfer('Frame',width+.007,.022,depth+.009,[0,-height/2+.004,0],[0,0,0],undefined,null,.004);
 });
}
function guard(a){
 a.put(prismYZ([[-.11,-.045],[-.13,-.095],[-.10,-.18],[.105,-.18],[.135,-.09],[.12,-.045]],.084,[[[-.087,-.072],[.098,-.072],[.105,-.098],[.081,-.153],[-.076,-.153],[-.103,-.098]]]),'Frame');
 a.chamfer('Metal',.026,.068,.027,[0,-.083,-.017],[.28,0,0],undefined,null,.004);
}
function stock(a,{start=.255,end=.636,width=.18,folded=false}={}){
 a.put(prismYZ([[start,.075],[end-.042,.06],[end-.035,-.11],[end-.15,-.09],[end-.22,-.015],[start,-.024]],width*.7),'Frame');
 if(!folded){a.box('Dark',width*.73,.044,.17,[0,.019,(start+end)/2]);a.chamfer('Panel',width*.8,.035,.21,[0,.076,end-.17]);}
 a.chamfer('Dark',width,.214,.041,[0,-.026,end-.020],[0,0,0],undefined,null,.009);
 for(const y of [-.09,-.04,.01,.06])a.box('Frame',width*.94,.009,.007,[0,y,end+.001]);
 for(const side of [-1,1])a.cylinder('Metal',.018,.010,[side*(width*.36),.036,start+.035],[0,0,Math.PI/2],undefined,null,8);
}
function panelHardware(a,x,y,z,n=3,spacing=.060){
 for(const side of [-1,1])for(let k=0;k<n;k++)a.cylinder('Metal',.0085,.009,[side*x,y,z+k*spacing],[0,0,Math.PI/2],undefined,null,6);
}
function magazine(a,c,{w=.14,h=.29,d=.19,y=-.21,z=-.08,angle=.18,power=false}={}){
 const joint=c.magazine;
 a.pose([0,y,z],[angle,0,0],()=>{
  a.chamfer('Dark',w,h,d,[0,0,0],[0,0,0],joint);
  for(const side of [-1,1]){
   a.chamfer('Panel',.009,h*.74,d*.78,[side*(w/2+.002),0,0],[0,0,0],joint,null,.0015);
   for(const zz of [-d*.24,0,d*.24])a.box('Frame',.011,h*.68,.010,[side*(w/2+.008),0,zz],[0,0,0],joint);
   a.box(power?'Energy':'Warm',.012,.07,.022,[side*(w/2+.009),-.036,d*.14],[0,0,0],joint);
  }
  a.chamfer('Metal',w+.021,.028,d+.022,[0,-h/2-.006,0],[0,0,0],joint,null,.005);
 });
}
function tube(a,key,r,length,p,joint){a.cylinder(key,r,length,p,[Math.PI/2,0,0],joint,null,16);}
function muzzle(a,{x=0,y=.055,z=-.972,r=.055,length=.07,energy=false,breach=false}={}){
 a.put(sleeve(r,length,16),'Metal',[x,y,z]);
 a.cylinder('Dark',r*.72,.008,[x,y,z-length/2+.006],[Math.PI/2,0,0]);
 a.put(sleeve(r*1.055,.017,16),energy?'Energy':'Frame',[x,y,z+length*.21]);
 if(breach)for(let k=0;k<4;k++){const t=k*Math.PI/2;a.box('Frame',.018,.018,.036,[x+Math.cos(t)*r*.85,y+Math.sin(t)*r*.85,z-length/2+.007],[0,0,t]);}
}
function vanguard(a,c){
 a.put(loft([{z:-.255,w:.104,lo:-.066,hi:.100},{z:-.185,w:.12,lo:-.078,hi:.106},{z:.195,w:.115,lo:-.074,hi:.106},{z:.274,w:.085,lo:-.033,hi:.091}]),'Frame');
 a.chamfer('Metal',.205,.051,.48,[0,.13,-.01],[0,0,0],c.bolt);
 for(const side of [-1,1]){a.chamfer('Panel',.018,.105,.31,[side*.117,.021,.040]);a.box('Dark',.02,.039,.122,[side*.130,.061,-.055]);a.box('Metal',.010,.017,.071,[side*.140,.053,-.050]);}
 grip(a);guard(a);stock(a);magazine(a,c);panelHardware(a,.132,-.008,-.088,4,.066);
 // Floating fore-end geometry is weighted to the original pump/fore-end transform.
 a.chamfer('Dark',.193,.147,.40,[0,-.008,-.39],[0,0,0],c.pump);
 for(const side of [-1,1]){
  a.chamfer('Panel',.018,.097,.31,[side*.101,-.012,-.40],[0,0,0],c.pump);
  for(let k=0;k<5;k++)a.box('Dark',.019,.044,.021,[side*.112,-.004,-.535+k*.064],[0,0,0],c.pump);
 }
 for(let k=0;k<8;k++)a.box('Metal',.177,.014,.020,[0,.075,-.57+k*.055],[0,0,0],c.pump);
 tube(a,'Metal',.033,.49,[0,.055,-.703]);tube(a,'Dark',.022,.46,[0,-.048,-.653]);
 a.put(sleeve(.046,.036,16),'Frame',[0,.055,-.718]);muzzle(a,{z:-.972,r:.051,length:.07});
 a.chamfer('Frame',.128,.026,.237,[0,.191,.018]);
 for(const x of [-.066,.066])a.chamfer('Metal',.022,.11,.101,[x,.265,.012]);
 a.chamfer('Metal',.150,.023,.106,[0,.326,.012]);a.box('Lens',.105,.077,.003,[0,.269,.010]);a.box('Signal',.007,.007,.004,[0,.269,.017]);
 a.box('Signal',.009,.026,.060,[-.129,.052,.12]);a.code('VG-30',-.131,-.025,.062,.022);
}
function breacher(a,c){
 a.put(loft([{z:-.245,w:.102,lo:-.064,hi:.108},{z:-.171,w:.122,lo:-.079,hi:.105},{z:.223,w:.114,lo:-.066,hi:.105},{z:.276,w:.082,lo:-.036,hi:.083}]),'Frame');
 a.chamfer('Metal',.208,.048,.464,[0,.13,-.01],[0,0,0],c.bolt);
 for(const side of [-1,1])a.chamfer('Panel',.018,.108,.285,[side*.118,.002,.055]);
 grip(a);guard(a);stock(a,{width:.186});panelHardware(a,.134,-.030,-.075,3,.083);
 a.chamfer('Panel',.209,.162,.322,[0,-.005,-.39],[0,0,0],c.pump);
 for(let k=0;k<8;k++)a.box('Dark',.222,.133,.016,[0,-.005,-.535+k*.039],[0,0,0],c.pump);
 a.box('Metal',.17,.014,.30,[0,.081,-.39],[0,0,0],c.pump);
 tube(a,'Metal',.05,.57,[0,.055,-.678]);tube(a,'Frame',.038,.52,[0,-.066,-.670]);
 a.cylinder('Warm',.039,.03,[0,-.066,-.939]);a.put(sleeve(.059,.052),'Frame',[0,.055,-.725]);muzzle(a,{z:-.969,r:.064,length:.070,breach:true});
 a.chamfer('Frame',.037,.048,.055,[0,.145,-.82]);a.box('Signal',.018,.011,.022,[0,.174,-.832]);
 // Four decorative external shell saddles, distinct from the runtime feed shell.
 // Alternating brass Signal shells keep the saddles readable against the receiver.
 for(let k=0;k<4;k++){
  const z=-.10+k*.085,brass=k%2===1;a.cylinder(brass?'Signal':'Warm',.024,.116,[-.155,.018,z],[0,0,0]);a.cylinder(brass?'Frame':'Metal',.026,.021,[-.155,-.050,z],[0,0,0]);
  a.box(brass?'Frame':'Dark',.034,.034,.062,[-.145,.041,z]);
 }
 a.code('BR-08',.131,-.023,.055,.021);a.box('Lens',.008,.022,.038,[.131,.052,.076]);
}
function ghost(a,c){
 a.chamfer('Frame',.166,.117,.319,[0,.022,.037]);a.chamfer('Frame',.141,.031,.297,[0,.086,.035]);a.chamfer('Metal',.186,.070,.394,[0,.13,-.01],[0,0,0],c.bolt);
 for(const side of [-1,1]){
  a.chamfer('Panel',.009,.044,.301,[side*.096,.125,-.018],[0,0,0],c.bolt,null,.002);
  for(let k=0;k<6;k++)a.box('Dark',.009,.043,.011,[side*.102,.128,.078+k*.020],[0,0,0],c.bolt);
  a.box('Dark',.008,.025,.088,[side*.096,.132,-.133],[0,0,0],c.bolt);
 }
 grip(a);guard(a);magazine(a,c,{w:.1,h:.215,d:.12,y:-.222,z:.207,angle:0});
 a.cylinder('Frame',.037,.103,[0,.08,-.22]);a.put(sleeve(.064,.306,20),'Frame',[0,.08,-.422]);
 for(const z of [-.293,-.339,-.486,-.543])a.put(sleeve(.066,.016,16),'Metal',[0,.08,z]);
 a.cylinder('Dark',.046,.007,[0,.08,-.576]);a.put(sleeve(.057,.012,16),'Metal',[0,.08,-.578]);
 a.chamfer('Dark',.051,.038,.033,[0,.175,.149]);for(const x of [-.016,.016])a.box('Signal',.009,.009,.008,[x,.193,.166]);
 a.chamfer('Dark',.022,.029,.026,[0,.180,-.172]);a.box('Signal',.011,.010,.006,[0,.193,-.185]);
 a.chamfer('Panel',.076,.033,.106,[0,-.048,-.136]);a.cylinder('Lens',.013,.006,[0,-.047,-.192]);a.code('GH-15',-.102,.107,-.030,.018,c.bolt);
 panelHardware(a,.093,-.010,-.060,2,.143);
}
function arcblade(a,c){
 grip(a,{width:.103,height:.263,depth:.109,y:-.02,z:.04,angle:-.2});
 a.chamfer('Frame',.147,.043,.13,[0,-.155,.044]);a.cylinder('Warm',.031,.013,[0,-.175,.044],[0,0,0]);
 a.put(prismYZ([[-.107,.144],[-.075,.181],[.066,.177],[.098,.14],[.09,.123],[-.09,.123]],.294),'Metal');
 for(const x of [-.124,.124])a.chamfer('Dark',.036,.032,.092,[x,.157,-.006]);
 a.chamfer('Frame',.167,.064,.101,[0,.198,-.026]);
 // Closed faceted spine and separate bevel faces, instead of a single flat extruded slab.
 a.pose([0,.213,-.03],[-.32,0,0],()=>{
  const outline=[[-.082,0],[.073,0],[.064,.52],[-.041,.705],[-.088,.598],[-.101,.15]];
  const shape=new T.Shape(outline.map(p=>new T.Vector2(...p))),g=new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelThickness:.007,bevelSize:.006,bevelSegments:1,steps:1,curveSegments:1});g.translate(0,0,-.0125);a.put(g,'Metal');
  for(const side of [-1,1]){
   a.put(plate([[-.041,.073,side*.0202],[.032,.073,side*.0202],[.031,.472,side*.0202],[-.026,.545,side*.0202]],[0,0,side]),'Frame');
   a.box('Signal',.010,.443,.005,[-.063,.301,side*.024]);
   for(const y of [.11,.19,.27,.35,.43])a.box('Panel',.037,.013,.006,[.004,y,side*.024]);
  }
 });
 for(const x of [-.052,.052])a.cylinder('Warm',.010,.112,[x,.198,-.03],[Math.PI/2,0,0],undefined,null,8);
 a.code('ARC',-.069,-.070,.043,.017);a.box('Lens',.02,.017,.019,[0,.21,.028]);
}
function tempest(a,c){
 a.put(loft([{z:-.22,w:.085,lo:-.041,hi:.095},{z:-.156,w:.111,lo:-.063,hi:.109},{z:.158,w:.109,lo:-.059,hi:.105},{z:.201,w:.075,lo:-.025,hi:.085}]),'Frame');
 a.chamfer('Metal',.198,.048,.316,[0,.14,-.01],[0,0,0],c.bolt);
 grip(a,{width:.115,height:.23,depth:.13,y:-.14,z:.15,angle:-.22});guard(a);stock(a,{start:.20,end:.429,width:.18,folded:true});
 for(const side of [-1,1]){
  a.chamfer('Panel',.017,.087,.249,[side*.112,.010,.014]);a.box('Dark',.02,.025,.139,[side*.124,.052,-.025]);
  for(let k=0;k<4;k++)a.box('Signal',.020,.012,.015,[side*.125,-.006,-.11+k*.065]);
 }
 a.chamfer('Panel',.177,.116,.230,[0,-.014,-.292]);for(const side of [-1,1])for(const z of [-.365,-.312,-.259,-.206])a.box('Dark',.018,.075,.018,[side*.097,-.014,z]);
 tube(a,'Metal',.031,.28,[0,.055,-.348]);muzzle(a,{z:-.551,r:.055,length:.081});
 magazine(a,c,{w:.108,h:.318,d:.12,y:-.22,z:-.10,angle:0});
 a.chamfer('Frame',.141,.022,.16,[0,.193,-.027]);a.box('Metal',.123,.017,.122,[0,.210,-.027]);
 a.chamfer('Dark',.043,.046,.024,[0,.178,.11]);a.box('Signal',.018,.008,.014,[0,.199,.12]);a.chamfer('Dark',.026,.046,.024,[0,.180,-.291]);a.box('Frame',.020,.119,.055,[0,.104,-.291]);
 a.box('Lens',.064,.028,.003,[0,.192,-.042]);a.code('TM-36',-.125,-.026,.014,.020);panelHardware(a,.127,-.020,-.078,3,.067);
}
function halo(a,c){
 a.put(loft([{z:-.28,w:.085,lo:-.051,hi:.109},{z:-.20,w:.113,lo:-.063,hi:.115},{z:.20,w:.111,lo:-.064,hi:.112},{z:.281,w:.077,lo:-.019,hi:.095}]),'Frame');
 a.chamfer('Metal',.206,.046,.482,[0,.145,-.01],[0,0,0],c.bolt);
 grip(a,{depth:.13,height:.26,y:-.16,angle:-.25});guard(a);stock(a,{start:.275,end:.548,width:.17});
 for(const side of [-1,1]){a.chamfer('Panel',.016,.10,.363,[side*.116,.026,.002]);a.box('Dark',.015,.032,.146,[side*.128,.058,-.024]);}
 a.chamfer('Frame',.179,.125,.383,[0,.004,-.410]);for(const side of [-1,1]){
  a.chamfer('Panel',.016,.086,.286,[side*.093,-.006,-.432]);for(let k=0;k<5;k++)a.box('Dark',.02,.024,.030,[side*.103,.010,-.548+k*.061]);
 }
 for(let k=0;k<8;k++)a.box('Metal',.153,.014,.019,[0,.073,-.572+k*.067]);
 tube(a,'Metal',.029,.55,[0,.06,-.813]);for(const z of [-.706,-.944])a.put(sleeve(.038,.029),'Frame',[0,.06,z]);muzzle(a,{z:-1.087,r:.054,length:.075});
 magazine(a,c,{w:.108,h:.288,d:.166,y:-.23,z:-.055,angle:0});
 for(const z of [-.109,.078]){a.chamfer('Frame',.081,.043,.067,[0,.206,z]);a.chamfer('Metal',.104,.050,.050,[0,.247,z]);}
 a.put(sleeve(.073,.303,20),'Dark',[0,.32,-.02]);for(const z of [-.16,.117])a.put(sleeve(.078,.021,16),'Metal',[0,.32,z]);
 for(const z of [-.171,.13])a.cylinder('Lens',.052,.003,[0,.32,z]);
 a.cylinder('Frame',.027,.043,[.090,.32,.023],[0,0,Math.PI/2]);a.cylinder('Panel',.031,.031,[0,.379,.023],[0,0,0]);
 a.box('Signal',.010,.012,.029,[-.080,.32,-.109]);a.box('Warm',.015,.035,.114,[-.128,.042,.047]);
 a.code('HL-24',-.126,-.022,.042,.022);panelHardware(a,.128,-.032,-.16,4,.095);
}
function railspike(a,c){
 a.put(loft([{z:-.185,w:.098,lo:-.052,hi:.099},{z:-.100,w:.108,lo:-.064,hi:.104},{z:.167,w:.102,lo:-.060,hi:.102},{z:.224,w:.072,lo:-.022,hi:.083}]),'Frame');
 a.chamfer('Metal',.194,.048,.345,[0,.14,-.01],[0,0,0],c.bolt);
 grip(a,{height:.26,depth:.15,y:-.17,angle:-.25});guard(a);magazine(a,c,{w:.11,h:.20,d:.12,y:-.24,z:.18,angle:0,power:true});
 for(const side of [-1,1]){
  a.chamfer('Panel',.011,.094,.258,[side*.110,.015,.042]);
  a.chamfer('Metal',.045,.09,.511,[side*.075,.064,-.370]);
  a.box('Dark',.048,.034,.42,[side*.075,.09,-.36]);a.box('Energy',.012,.014,.399,[side*.075,.112,-.365]);
 }
 tube(a,'Dark',.031,.47,[0,.065,-.373]);
 for(let k=0;k<4;k++){
  const z=-.174-k*.115;a.put(sleeve(.089,.028,20),'Warm',[0,.07,z]);a.put(sleeve(.092,.012,20),'Energy',[0,.07,z+.004]);
 }
 a.put(sleeve(.052,.038,16),'Frame',[0,.07,-.606]);a.cylinder('Dark',.035,.006,[0,.07,-.624]);
 a.chamfer('Dark',.096,.05,.083,[0,.204,.085]);a.box('Signal',.012,.012,.014,[0,.233,.12]);
 a.box('Lens',.052,.022,.003,[0,.211,.040]);a.code('RS-01',-.120,-.020,.028,.020);panelHardware(a,.119,-.028,-.069,3,.071);
}
function volt(a,c){
 a.put(loft([{z:-.268,w:.105,lo:-.071,hi:.113},{z:-.187,w:.14,lo:-.079,hi:.127},{z:.184,w:.135,lo:-.076,hi:.129},{z:.260,w:.095,lo:-.032,hi:.107}]),'Frame');
 a.chamfer('Metal',.223,.050,.425,[0,.16,-.01],[0,0,0],c.bolt);
 grip(a,{width:.13,height:.25,depth:.15,y:-.18,angle:-.25});guard(a);stock(a,{start:.263,end:.476,width:.197,folded:true});
 for(const side of [-1,1]){
  a.chamfer('Panel',.016,.133,.315,[side*.140,.021,.027]);
  a.box('Dark',.016,.046,.196,[side*.152,.041,-.018]);
  for(let k=0;k<4;k++)a.box('Energy',.018,.024,.023,[side*.153,.042,-.090+k*.052]);
 }
 a.chamfer('Dark',.267,.133,.235,[0,.015,-.323]);
 for(const side of [-1,1]){
  a.chamfer('Panel',.013,.092,.186,[side*.137,.015,-.33]);
  for(let k=0;k<4;k++)a.box('Energy',.017,.067,.019,[side*.147,.026,-.408+k*.049]);
 }
 for(const x of [-.09,.09]){
  tube(a,'Metal',.050,.403,[x,.05,-.492]);for(const z of [-.378,-.489,-.609])a.put(sleeve(.062,.024,16),'Warm',[x,.05,z]);
  a.put(sleeve(.070,.084,16),'Frame',[x,.05,-.732]);a.put(sleeve(.068,.014,16),'Energy',[x,.05,-.769]);a.cylinder('Dark',.046,.005,[x,.05,-.773]);
 }
 magazine(a,c,{w:.199,h:.215,d:.197,y:-.213,z:-.045,angle:0,power:true});
 a.chamfer('Dark',.12,.025,.15,[0,.182,.041]);a.box('Signal',.028,.008,.052,[0,.196,.041]);
 a.box('Lens',.018,.026,.059,[-.154,-.026,.099]);a.code('VT-06',-.152,-.030,.042,.019);panelHardware(a,.156,-.042,-.083,4,.058);
}
export function createWeaponVisual(index){
 const spec=WEAPON_ASSETS[index];if(!spec)throw new RangeError('Unknown primary weapon: '+index);
 const a=assembler(spec);palette(a,index);const c=controls(a,index);[vanguard,breacher,ghost,arcblade,tempest,halo,railspike,volt][index](a,c);
 const root=a.finish();bindings.set(root,c);return root;
}
export function getWeaponBindings(root){const found=bindings.get(root);if(!found)throw new TypeError('Not an authored weapon instance');return found;}
export function createLiveReloadShell(){
 const root=new T.Group();root.name='W02_LiveReloadShell';root.userData.transient=true;root.visible=false;
 for(const [r,h,z,color] of [[.031,.14,0,0x9b4932],[.034,.022,.07,0xd4ab62]]){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,16),new T.MeshStandardMaterial({color,metalness:.55,roughness:.4}));m.rotation.x=Math.PI/2;m.position.z=z;m.raycast=noRaycast;root.add(m);}return root;
}
export function weaponVisualStats(root){
 let meshes=0,triangles=0;const materials=new Set(),joints=new Set();root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);if(o.skeleton)o.skeleton.bones.forEach(b=>joints.add(b));});
 const box=new T.Box3().setFromObject(root,true);return {meshes,triangles,materials:materials.size,joints:joints.size,bounds:{min:box.min.toArray(),max:box.max.toArray()}};
}
export function disposeWeaponVisual(root){
 if(released.has(root))return;released.add(root);bindings.delete(root);const gs=new Set(),ms=new Set(),ss=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.skeleton)ss.add(o.skeleton);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])ms.add(m);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ss.forEach(s=>s.dispose());
}
