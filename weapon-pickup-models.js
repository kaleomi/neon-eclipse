import * as T from './node_modules/three/build/three.module.js';
import {weaponDisplay} from './weapon-display.js';
// Low-poly, side-readable silhouettes. Templates own geometry/materials; pooled clones only own transforms.
// Do not dispose a clone's shared geometry when a drop is picked up or its pool slot is reused.
export const PICKUP_WEAPONS=Object.freeze([0,1,4,5,6,7,9,10,11]);
export function createWeaponPickupModels(){
 const templates=new Map(),geometries=new Map(),materials=[];
 function material(color,glow=false){const m=glow?new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.85,metalness:.25,roughness:.35}):new T.MeshStandardMaterial({color,metalness:.65,roughness:.4});materials.push(m);return m;}
 const metal=material(0xa6bec8),body=material(0x52717e),dark=material(0x172b37),grip=material(0x354347);
 function geo(key,create){if(!geometries.has(key))geometries.set(key,create());return geometries.get(key);}
 function build(index){
  if(!PICKUP_WEAPONS.includes(index))throw new RangeError('Unsupported dropped primary: '+index);
  const info=weaponDisplay(index),accent=material(info.color,true),g=new T.Group();g.name='PICKUP_'+info.id;g.userData.weaponId=info.id;g.userData.weaponIndex=index;
  function box(w,h,d,x,y,z,m=body,tilt=0){const mesh=new T.Mesh(geo(['b',w,h,d].join(':'),()=>new T.BoxGeometry(w,h,d)),m);mesh.position.set(x,y,z);mesh.rotation.z=tilt;g.add(mesh);return mesh;}
  function tube(radius,length,x,y,z,m=metal){const mesh=new T.Mesh(geo(['c',radius,length].join(':'),()=>new T.CylinderGeometry(radius,radius,length,8)),m);mesh.position.set(x,y,z);mesh.rotation.z=-Math.PI/2;g.add(mesh);return mesh;}
  function coil(radius,x,y,z){const mesh=new T.Mesh(geo('t:'+radius,()=>new T.TorusGeometry(radius,.016,4,12)),accent);mesh.rotation.y=Math.PI/2;mesh.position.set(x,y,z);g.add(mesh);return mesh;}
  if(index===0){ // assault rifle: full stock, curved/slanted magazine, long ventilated handguard
   box(.55,.15,.16,-.03,.04,0);box(.28,.18,.15,-.47,.015,0,dark);box(.12,.2,.11,-.22,-.14,0,grip,.18);box(.13,.27,.115,.015,-.18,0,dark,-.15);
   box(.33,.12,.17,.29,.055,0);tube(.03,.34,.6,.06,0);box(.18,.035,.095,-.02,.15,0,metal);
   for(const x of [.2,.28,.36])box(.035,.045,.185,x,.09,0,dark);
   box(.23,.025,.175,.21,.123,0,accent);box(.035,.12,.045,.52,.13,0,metal);
  }else if(index===1){ // shotgun: thick barrel, parallel tube and conspicuous ribbed pump
   box(.42,.16,.16,-.09,.035,0);box(.32,.18,.14,-.46,.01,0,dark,-.1);box(.105,.18,.115,-.22,-.13,0,grip,.25);
   tube(.052,.69,.44,.07,0);tube(.033,.61,.39,-.03,0,dark);box(.27,.115,.18,.26,-.065,0);
   for(const x of [.16,.22,.28,.34])box(.018,.12,.19,x,-.06,0,accent);
   tube(.064,.075,.79,.07,0,metal);box(.12,.025,.16,-.05,.14,0,accent);
  }else if(index===4){ // compact SMG: short receiver, wire stock and long straight magazine
   box(.43,.16,.16,-.015,.055,0);box(.24,.035,.04,-.35,.11,.055,metal);box(.24,.035,.04,-.35,-.025,.055,metal);box(.04,.17,.1,-.48,.045,0,dark);
   tube(.026,.23,.31,.07,0);box(.09,.21,.12,-.12,-.13,0,grip,.2);box(.085,.31,.1,.08,-.185,0,dark);
   box(.24,.023,.17,.035,.15,0,accent);box(.035,.25,.112,.085,-.18,0,accent);box(.045,.06,.07,.17,.17,0,metal);
  }else if(index===5){ // precision burst rifle: long straight barrel, shoulder stock and raised optic
   box(.52,.14,.15,-.03,.035,0);box(.34,.14,.15,-.49,-.025,0,dark,-.13);box(.13,.2,.1,-.21,-.13,0,grip,.15);box(.145,.21,.125,.065,-.15,0,dark);
   tube(.025,.63,.52,.06,0);box(.38,.095,.14,.3,.06,0);box(.16,.08,.09,-.03,.15,0,dark);tube(.062,.22,-.025,.215,0,dark);coil(.06,.075,.215,0);
   for(const x of [.27,.35,.43])box(.025,.035,.165,x,.12,0,accent);
  }else if(index===6){ // rail weapon: exposed long twin rails and four full-sized induction coils
   box(.34,.17,.19,-.25,.04,0);box(.12,.27,.13,-.33,-.14,0,grip,.2);box(.88,.043,.04,.34,.055,.067,metal);box(.88,.043,.04,.34,.055,-.067,metal);
   box(.7,.032,.07,.33,.025,0,dark);for(const x of [.045,.255,.465,.675])coil(.092,x,.055,0);
   box(.17,.06,.1,-.24,.155,0,dark);box(.09,.03,.19,-.31,.145,0,accent);box(.075,.1,.2,.81,.055,0,metal);
  }else if(index===7){ // arc shotgun: forked muzzle, split emitters, round battery pack
   box(.49,.16,.2,-.045,.035,0);box(.22,.15,.15,-.4,.015,0,dark);box(.105,.2,.115,-.2,-.14,0,grip,.18);
   tube(.045,.46,.37,.07,.115);tube(.045,.46,.37,.07,-.115);coil(.064,.63,.07,.115);coil(.064,.63,.07,-.115);
   const drum=new T.Mesh(geo('battery',()=>new T.CylinderGeometry(.145,.145,.23,12)),dark);drum.rotation.x=Math.PI/2;drum.position.set(.005,-.14,0);g.add(drum);
   box(.19,.055,.22,.08,.16,0,accent);for(const x of [-.015,.075,.165])box(.023,.19,.25,x,.035,0,accent);
  }else if(index===9){ // grenade launcher: large cylinder magazine and a short, wide muzzle
   box(.52,.19,.23,-.06,.065,0);box(.22,.16,.18,-.44,.02,0,dark);box(.1,.22,.13,-.22,-.13,0,grip,.18);tube(.095,.35,.36,.085,0);
   const drum=new T.Mesh(geo('grenade-drum',()=>new T.CylinderGeometry(.18,.18,.25,12)),metal);drum.rotation.x=Math.PI/2;drum.position.set(.04,-.08,0);g.add(drum);coil(.114,.55,.085,0);box(.18,.03,.25,-.01,.185,0,accent);
  }else if(index===10){ // armor-piercing lance: shoulder stock, optic, long thick rail barrel
   box(.5,.2,.24,-.12,.065,0);box(.28,.18,.2,-.52,.025,0,dark);box(.12,.21,.14,-.25,-.145,0,grip,.1);tube(.065,.85,.44,.085,0);
   for(const x of [.17,.37,.57])coil(.092,x,.085,0);box(.2,.085,.11,-.12,.22,0,dark);box(.07,.11,.12,-.08,.225,0,accent);box(.22,.1,.2,.1,-.08,0,dark);
  }else{ // hammer cache: broad transverse head and unmistakable long handle, no firearm barrel
   tube(.038,.86,-.14,.07,0,dark);box(.14,.37,.27,.33,.08,0,metal);box(.17,.04,.3,.33,.285,0,accent);box(.17,.04,.3,.33,-.125,0,accent);
   for(const x of [-.51,-.42,-.33])tube(.047,.06,x,.07,0,grip);
  }
  g.position.y=.36;g.rotation.z=.025;
  g.traverse(o=>{o.raycast=()=>{};o.userData.pickupVisual=true;});return g;
 }
 function create(index){if(!templates.has(index))templates.set(index,build(index));const model=templates.get(index).clone(true);model.traverse(o=>{o.raycast=()=>{};});return model;}
 return {create,stats:()=>({templates:templates.size,geometries:geometries.size,materials:materials.length}),dispose(){for(const g of geometries.values())g.dispose();for(const m of materials)m.dispose();templates.clear();geometries.clear();materials.length=0;}};
}
