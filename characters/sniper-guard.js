// S09 KESTREL: original two-handed reconnaissance marksman. Metres, +Y up / +Z forward.
// Rigid node articulation with analytic arm posing, not a skinned human or gameplay IK.
import {T,material,node,box,cylinder,plate,panel,strut,loft,bolt,hand,
  optimize,stats,disposeVisual,noRaycast} from './guard-geometry.js';
export const SNIPER_ASSET=Object.freeze({id:'S09',version:'s09-v1',file:'sniper-guard-s09.glb'});
export const SNIPER_CLIPS=Object.freeze(['Idle','Patrol','Aim','Hit']);
export const SNIPER_ARM=Object.freeze({upper:.44,lower:.44});
export const SNIPER_GRIPS=Object.freeze({R:Object.freeze([.02,-.068,-.03]),L:Object.freeze([-.025,-.035,.205])});
const JOINTS=['Hips','Chest','Head','Arm_R','Arm_L','Forearm_R','Forearm_L',
  'Thigh_R','Thigh_L','Shin_R','Shin_L','Foot_R','Foot_L','Weapon','Sensor'];
const TAU=Math.PI*2;
function palette(accent) {
  return {armor:material('S09_FieldArmor',0x566960,.49,.55),
    shell:material('S09_SandCeramic',0xb7b7a3,.29,.57),
    suit:material('S09_Undersuit',0x1a2829,.08,.87),
    alloy:material('S09_Alloy',0x809193,.81,.32),
    weapon:material('S09_RifleHousing',0x263634,.75,.42),
    accent:accent||material('S09_Optics',0xb98cff,.2,.32,{emissive:0xb98cff,emissiveIntensity:.8})};
}
function serial(p,[x,y,z],m,s=.011){
  const glyphs=[['111','101','101','101','111'],['111','101','111','001','111']];
  glyphs.forEach((g,n)=>g.forEach((row,j)=>[...row].forEach((v,i)=>{if(v==='1')box(p,[s*.83,s*.83,.004],[x+(n*4+i)*s,y-j*s,z],m);})));
}
function helmet(n,m) {
  const h=n.Head;
  loft(h,[{y:-.20,x:.207,z:.215},{y:-.067,x:.267,z:.255},{y:.13,x:.279,z:.248},
    {y:.235,x:.223,z:.193,offset:-.025}],m.armor);
  panel(h,.51,.094,.12,[0,.157,.229],m.shell,.014,[-.15,0,0]);
  panel(h,.42,.12,.06,[0,.029,.28],m.weapon,.009);
  // One offset range-finding monocular and a smaller secondary optical slit.
  cylinder(h,.089,.089,.09,[.103,.036,.323],m.alloy,[Math.PI/2,0,0],12);
  cylinder(h,.068,.073,.10,[.103,.036,.35],m.weapon,[Math.PI/2,0,0],12);
  cylinder(h,.045,.045,.112,[.103,.036,.367],m.accent,[Math.PI/2,0,0],12);
  panel(h,.131,.026,.012,[-.125,.039,.319],m.accent,.003,[0,0,-.045]);
  plate(h,[[-.112,.044],[.107,.044],[.083,-.105],[0,-.15],[-.087,-.10]],.072,[0,-.092,.244],m.shell,.011);
  for(let i=0;i<3;i++)box(h,[.12,.014,.016],[0,-.09-i*.033,.29],m.weapon);
  for(const s of [-1,1]) {
    panel(h,.08,.18,.17,[s*.247,-.067,.093],m.armor,.014,[0,s*.14,0]);
    cylinder(h,.065,.065,.04,[s*.284,-.033,-.042],m.alloy,[0,0,Math.PI/2],10);
    panel(h,.077,.133,.072,[s*.29,-.057,-.021],m.weapon,.01);
    bolt(h,s*.192,.142,.29,m.weapon,.01);
  }
  // Compact raised reconnaissance sensor, not a new laser/telegraph source.
  n.Sensor=node(h,'S09_Sensor',-.075,.232,-.018);
  panel(n.Sensor,.092,.255,.085,[0,.122,-.007],m.weapon,.009);
  panel(n.Sensor,.175,.10,.14,[0,.251,.007],m.armor,.012);
  panel(n.Sensor,.103,.037,.011,[0,.26,.09],m.accent,.003);
  box(n.Sensor,[.042,.15,.012],[0,.109,.04],m.alloy);
  panel(h,.17,.08,.032,[0,.015,-.267],m.weapon,.007);
  box(h,[.07,.011,.009],[0,.015,-.289],m.accent);
}
function body(n,m) {
  panel(n.Hips,.55,.20,.36,[0,.04,0],m.suit,.019);
  panel(n.Hips,.63,.07,.39,[0,.145,0],m.armor,.008);
  panel(n.Hips,.143,.063,.031,[0,.145,.22],m.alloy,.005);
  plate(n.Hips,[[-.12,.06],[.12,.06],[.09,-.10],[0,-.147],[-.09,-.10]],.065,[0,-.026,.19],m.armor,.009);
  panel(n.Chest,.57,.56,.37,[0,.222,0],m.suit,.021);
  for(const s of [-1,1]) {
    plate(n.Chest,[[s*.025,-.09],[s*.25,-.06],[s*.317,.117],[s*.233,.269],[s*.025,.209]],
      .075,[0,.276,.22],m.armor,.014,[-.05,0,0]);
    plate(n.Chest,[[s*.046,.05],[s*.28,.143],[s*.233,.201],[s*.043,.115]],.019,[0,.335,.268],m.shell,.004);
    panel(n.Chest,.067,.33,.055,[s*.235,.238,.286],m.weapon,.008,[0,0,-s*.14]);
    panel(n.Chest,.08,.068,.025,[s*.237,.357,.324],m.alloy,.005);
    for(let j=0;j<3;j++)panel(n.Chest,.068,.024,.24,[s*.275,.019+j*.048,0],m.alloy,.004);
    panel(n.Hips,.157,.203,.12,[s*.249,.043,.182],m.weapon,.012,[0,0,-s*.08]);
    box(n.Hips,[.095,.029,.015],[s*.249,.102,.255],m.shell);
  }
  for(let i=0;i<3;i++)panel(n.Chest,.32,.051,.041,[0,-.076+i*.067,.214],m.armor,.006);
  serial(n.Chest,[.057,.275,.274],m.shell,.01);
  box(n.Chest,[.038,.07,.012],[-.074,.29,.269],m.accent);
  cylinder(n.Chest,.175,.205,.07,[0,.57,0],m.armor,[0,0,0],12);
  cylinder(n.Chest,.114,.129,.14,[0,.605,0],m.suit,[0,0,0],12);
  // Slim cooling pack and asymmetrical spare power cells, not the commander's antenna frame.
  panel(n.Chest,.43,.51,.21,[0,.282,-.29],m.armor,.02);
  panel(n.Chest,.285,.37,.039,[0,.317,-.42],m.weapon,.01);
  for(let i=0;i<6;i++)box(n.Chest,[.213,.02,.018],[0,.201+i*.041,-.451],m.alloy);
  panel(n.Chest,.19,.072,.025,[0,.552,-.392],m.shell,.006);
  for(const s of [-1,1]) {
    cylinder(n.Chest,.069,.07,.42,[s*.286,.233,-.323],m.weapon,[0,0,0],10);
    cylinder(n.Chest,.072,.072,.04,[s*.286,.452,-.323],m.shell);
    box(n.Chest,[.055,.022,.013],[s*.286,.318,-.394],m.accent);
  }
}
function rifle(g,m) {
  panel(g,.135,.15,.41,[0,.063,.062],m.weapon,.013);
  panel(g,.145,.047,.385,[0,.153,.082],m.alloy,.006);
  panel(g,.146,.093,.215,[0,.103,.054],m.armor,.006);
  panel(g,.077,.172,.09,[.02,-.06,-.032],m.suit,.008,[-.17,0,0]);
  panel(g,.093,.183,.137,[0,-.086,.13],m.weapon,.008,[.16,0,0]);
  box(g,[.1,.027,.14],[0,-.18,.136],m.shell);
  // Offset stock seats against the right shoulder while keeping the sight near the eye.
  strut(g,[.036,.10,-.137],[.177,.121,-.344],.025,.025,m.alloy);
  strut(g,[.031,.031,-.137],[.167,.025,-.344],.019,.02,m.weapon);
  panel(g,.083,.18,.043,[.177,.067,-.359],m.suit,.009);
  panel(g,.098,.05,.128,[.103,.129,-.239],m.shell,.007,[0,-.54,0]);
  panel(g,.136,.112,.325,[0,.084,.354],m.shell,.01);
  for(const s of [-1,1])for(let i=0;i<4;i++)box(g,[.009,.039,.028],[s*.074,.092,.25+i*.062],m.weapon);
  cylinder(g,.033,.035,.36,[0,.086,.682],m.alloy,[Math.PI/2,0,0],12);
  cylinder(g,.055,.043,.097,[0,.086,.508],m.weapon,[Math.PI/2,0,0],12);
  cylinder(g,.052,.052,.135,[0,.086,.901],m.weapon,[Math.PI/2,0,0],12);
  cylinder(g,.026,.026,.008,[0,.086,.974],m.suit,[Math.PI/2,0,0],10);
  for(const s of [-1,1]) {
    box(g,[.009,.025,.082],[s*.053,.086,.9],m.alloy);
    // Folded stabilizer legs are carried equipment, not deployable collision objects.
    strut(g,[s*.052,.002,.31],[s*.061,-.038,.555],.014,.013,m.weapon);
    box(g,[.044,.018,.034],[s*.063,-.04,.556],m.alloy);
  }
  for(const z of [-.055,.146])panel(g,.043,.094,.04,[0,.2,z],m.alloy,.004);
  cylinder(g,.064,.057,.31,[0,.267,.047],m.weapon,[Math.PI/2,0,0],12);
  cylinder(g,.075,.07,.07,[0,.267,.232],m.shell,[Math.PI/2,0,0],12);
  cylinder(g,.05,.05,.009,[0,.267,.272],m.accent,[Math.PI/2,0,0],12);
  cylinder(g,.069,.061,.051,[0,.267,-.134],m.suit,[Math.PI/2,0,0],12);
  cylinder(g,.037,.037,.064,[0,.337,.065],m.alloy,[0,0,0],10);
  cylinder(g,.027,.027,.048,[.075,.267,.05],m.alloy,[0,0,Math.PI/2],10);
  box(g,[.01,.019,.117],[.077,.105,.047],m.accent);
}
function limbs(n,m) {
  for(const s of [-1,1]) {
    const q=s>0?'R':'L',a=n['Arm_'+q],f=n['Forearm_'+q],thigh=n['Thigh_'+q],shin=n['Shin_'+q],foot=n['Foot_'+q];
    cylinder(a,.086,.086,.17,[s*.044,-.011,0],m.suit,[0,0,Math.PI/2]);
    plate(a,[[-.12,-.071],[.12,-.071],[.15,.077],[.055,.148],[-.109,.10]],.265,[s*.051,.026,.021],m.armor,.016,[0,0,-s*.17]);
    panel(a,.133,.052,.024,[s*.055,.082,.178],m.shell,.005,[0,0,-s*.17]);
    cylinder(a,.069,.062,.32,[0,-.234,0],m.suit);
    panel(a,.139,.253,.077,[0,-.217,.071],m.armor,.011);
    strut(a,[s*.07,-.079,-.04],[s*.067,-.383,-.039],.015,.018,m.alloy);
    cylinder(f,.065,.065,.183,[0,0,0],m.alloy,[0,0,Math.PI/2]);
    cylinder(f,.061,.07,.295,[0,-.185,0],m.suit);
    plate(f,[[-.074,.078],[.078,.078],[.084,-.06],[.055,-.255],[-.054,-.255]],.067,[0,-.154,.067],m.armor,.012);
    panel(f,.081,.177,.018,[0,-.165,.113],m.shell,.005);
    cylinder(f,.063,.063,.04,[0,-.359,0],m.alloy);hand(f,-.44,0,m,s);
    cylinder(thigh,.081,.09,.284,[0,-.14,0],m.suit);
    plate(thigh,[[-.092,.097],[.092,.097],[.105,-.047],[.056,-.205],[-.067,-.205]],.093,[0,-.118,.105],m.armor,.012);
    panel(thigh,.103,.106,.021,[0,-.09,.167],m.shell,.006);
    strut(thigh,[s*.092,-.035,-.027],[s*.068,-.305,-.029],.016,.018,m.alloy);
    cylinder(shin,.074,.074,.198,[0,0,0],m.weapon,[0,0,Math.PI/2]);
    panel(shin,.188,.143,.09,[0,-.012,.111],m.shell,.014);
    box(shin,[.098,.024,.012],[0,-.009,.166],m.weapon);
    cylinder(shin,.077,.056,.30,[0,-.195,-.005],m.suit);
    plate(shin,[[-.072,.101],[.071,.101],[.068,-.172],[.016,-.227],[-.053,-.188]],.058,[0,-.198,.087],m.armor,.011);
    panel(shin,.033,.207,.018,[0,-.184,.127],m.alloy,.004);
    panel(foot,.258,.119,.394,[0,-.073,.076],m.suit,.013);
    panel(foot,.22,.065,.228,[0,-.001,.149],m.armor,.011,[.05,0,0]);
    box(foot,[.166,.014,.052],[0,.033,.21],m.shell);
  }
}
export function createSniperVisual({accentMaterial=null}={}) {
  const m=palette(accentMaterial),root=new T.Group();root.name='S09_Visual';
  root.userData={assetVersion:SNIPER_ASSET.version,role:'sniper',description:'Original KESTREL marksman; long optic rifle and analytic two-handed rigid-node posing.'};
  const n={};n.Hips=node(root,'S09_Hips',0,.90,0);n.Chest=node(n.Hips,'S09_Chest',0,.225,0);n.Head=node(n.Chest,'S09_Head',0,.815,0);
  for(const s of [-1,1]) {
    const q=s>0?'R':'L';n['Arm_'+q]=node(n.Chest,'S09_Arm_'+q,s*.515,.50,0);
    n['Forearm_'+q]=node(n['Arm_'+q],'S09_Forearm_'+q,0,-SNIPER_ARM.upper,0);
    n['Thigh_'+q]=node(n.Hips,'S09_Thigh_'+q,s*.256,-.025,0);
    n['Shin_'+q]=node(n['Thigh_'+q],'S09_Shin_'+q,0,-.355,0);
    n['Foot_'+q]=node(n['Shin_'+q],'S09_Foot_'+q,0,-.37,0);
  }
  n.Weapon=node(n.Chest,'S09_Weapon');body(n,m);helmet(n,m);limbs(n,m);rifle(n.Weapon,m);optimize(root);
  const rig=bindSniperRig(root);poseSniper(rig);return {root,rig,materials:Object.values(m).filter(x=>x!==accentMaterial)};
}
export function bindSniperRig(root) {
  const nodes={};for(const name of JOINTS){nodes[name]=root.getObjectByName('S09_'+name);if(!nodes[name])throw Error('Incomplete S09 rig: '+name);}
  const scratch={};for(const k of ['grip','direction','pole','elbow','segment'])scratch[k]=new T.Vector3();
  scratch.down=new T.Vector3(0,-1,0);scratch.upper=new T.Quaternion();scratch.lower=new T.Quaternion();scratch.inverse=new T.Quaternion();
  return {root,nodes,scratch};
}
function solveArm(rig,side) {
  const n=rig.nodes,k=rig.scratch,q=side>0?'R':'L',arm=n['Arm_'+q],fore=n['Forearm_'+q];
  k.grip.fromArray(SNIPER_GRIPS[q]).applyEuler(n.Weapon.rotation).add(n.Weapon.position);
  k.direction.copy(k.grip).sub(arm.position);const raw=k.direction.length();k.direction.multiplyScalar(1/Math.max(raw,1e-8));
  const {upper:l1,lower:l2}=SNIPER_ARM,d=Math.min(l1+l2-.0001,Math.max(.0001,raw));
  const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  k.pole.set(side*.80,.025,.095).sub(arm.position);k.pole.addScaledVector(k.direction,-k.pole.dot(k.direction));
  if(k.pole.lengthSq()<1e-10)k.pole.set(0,0,1);k.pole.normalize();
  k.elbow.copy(arm.position).addScaledVector(k.direction,along).addScaledVector(k.pole,height);
  k.segment.copy(k.elbow).sub(arm.position).normalize();k.upper.setFromUnitVectors(k.down,k.segment);arm.quaternion.copy(k.upper);
  k.segment.copy(k.grip).sub(k.elbow).normalize();k.lower.setFromUnitVectors(k.down,k.segment);
  fore.quaternion.copy(k.inverse.copy(k.upper).invert().multiply(k.lower));
}
export function poseSniper(rig,{time=0,mode='Idle',phase=0,hit=0}={}) {
  const n=rig.nodes,t=time+phase,walk=mode==='Patrol',aim=mode==='Aim',b=Math.sin(t*TAU/2.8),stride=walk?Math.sin(t*TAU/1.12):0,recoil=Math.max(0,hit);
  n.Hips.position.y=.90+(walk?Math.cos(t*TAU*2/1.12)*.005:b*.002);
  n.Hips.rotation.set(0,stride*.017,walk?stride*.008:0);
  n.Chest.rotation.set((aim?.018:0)+b*.003-recoil*.11,0,recoil*.055);
  n.Head.position.set(aim?.045:0,aim?.8:.815,aim?.015:0);
  n.Head.rotation.set(aim?.22:b*.009,aim?.015:Math.sin(t*.55)*.026,0);
  n.Sensor.rotation.set(aim?-.08:.14+Math.sin(t*.6)*.035,0,0);
  for(const s of [-1,1]) {
    const q=s>0?'R':'L',a=stride*s*.255,knee=walk?Math.max(0,-stride*s)*.29:.025;
    n['Thigh_'+q].rotation.set(a,0,-s*.012);n['Shin_'+q].rotation.set(knee,0,0);n['Foot_'+q].rotation.set(-a-knee,0,0);
  }
  n.Weapon.position.set(aim?.16:.10+stride*.006,aim?.455:.22+b*.003,.31+(aim?.05:0));
  n.Weapon.rotation.set((aim?0:.10+stride*.008)-recoil*.08,0,stride*.016+recoil*.045);
  solveArm(rig,1);solveArm(rig,-1);
}
export function makeSniperClips(root) {
  const rig=bindSniperRig(root),clips=[];
  for(const mode of SNIPER_CLIPS) {
    const duration={Idle:2.8,Patrol:1.12,Aim:1.6,Hit:.5}[mode],count=Math.round(duration*30);
    const times=Array.from({length:count+1},(_,i)=>i*duration/count),rotations=new Map(Object.values(rig.nodes).map(n=>[n,[]]));
    const positions=new Map(['Hips','Head','Weapon'].map(k=>[rig.nodes[k],[]])),tracks=[];
    for(const time of times) {
      poseSniper(rig,{time:time===duration&&mode!=='Hit'?0:time,mode:mode==='Hit'?'Idle':mode,hit:mode==='Hit'?Math.sin(time/duration*Math.PI)*Math.exp(-time*4):0});
      for(const [n,a]of rotations)a.push(...n.quaternion.toArray());for(const [n,a]of positions)a.push(...n.position.toArray());
    }
    for(const [n,a]of rotations)tracks.push(new T.QuaternionKeyframeTrack(n.name+'.quaternion',times,a));
    for(const [n,a]of positions)tracks.push(new T.VectorKeyframeTrack(n.name+'.position',times,a));
    clips.push(new T.AnimationClip(mode,duration,tracks));
  }
  poseSniper(rig);return clips;
}
export function cloneSniperVisual(template,accentMaterial) {
  const root=template.clone(true),owned=new Map();
  root.traverse(o=>{if(!o.isMesh)return;o.geometry=o.geometry.clone();o.castShadow=true;o.receiveShadow=true;o.raycast=noRaycast;o.userData.combatDecoration=true;
    const copy=m=>{if(m.name==='S09_Optics'&&accentMaterial)return accentMaterial;if(!owned.has(m))owned.set(m,m.clone());return owned.get(m);};
    o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
  });
  return {root,rig:bindSniperRig(root),materials:[...owned.values()]};
}
export {stats as sniperStats,disposeVisual as disposeSniperVisual};
