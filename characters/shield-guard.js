// B04 BASTION: original shield carrier. Metres, +Y up, +Z forward.
// Shield is a fixed projection anchor; the rear weak core never follows torso sway.
import {T,material,node,mesh,box,cylinder,plate,panel,strut,loft,bolt,hand,
  optimize,stats,disposeVisual,noRaycast} from './guard-geometry.js';
export const SHIELD_ASSET=Object.freeze({id:'B04',version:'b04-v1',file:'shield-guard-b04.glb'});
export const SHIELD_CLIPS=Object.freeze(['Idle','Patrol','Aim','Exposed','Hit']);
export const SHIELD_ANCHOR=Object.freeze([0,1.15,.72]);
export const SHIELD_CORE=Object.freeze([0,1.28,-.6]);
const JOINTS=['Hips','Chest','Head','Arm_R','Arm_L','Forearm_R','Forearm_L','Thigh_R','Thigh_L','Shin_R','Shin_L','Foot_R','Foot_L','Shield'];
const TAU=Math.PI*2;
function palette(accent,core) {
  return {armor:material('B04_CobaltArmor',0x485d75,.63,.47),
    shell:material('B04_Ceramic',0xb8c8cf,.33,.49),
    suit:material('B04_Undersuit',0x14242e,.10,.84),
    alloy:material('B04_Alloy',0x849ba5,.82,.32),
    weapon:material('B04_EmitterHousing',0x213642,.75,.40),
    accent:accent||material('B04_RoleLight',0x9fc4ff,.24,.32,{emissive:0x9fc4ff,emissiveIntensity:.9}),
    core:core||material('B04_WeakCore',0x85ffe0,.22,.32,{emissive:0x26dcae,emissiveIntensity:1.6}),
    field:material('B04_EnergyField',0x83b4ec,.15,.29,{emissive:0x244c7c,emissiveIntensity:.45,transparent:true,opacity:.23,depthWrite:false,side:T.DoubleSide})};
}
function serial(p,[x,y,z],m,s=.012){
  const glyphs=[['111','101','101','101','111'],['101','101','111','001','001']];
  glyphs.forEach((g,n)=>g.forEach((row,j)=>[...row].forEach((v,i)=>{if(v==='1')box(p,[s*.83,s*.83,.003],[x+(n*4+i)*s,y-j*s,z],m);})));
}
function helmet(h,m) {
  loft(h,[{y:-.217,x:.226,z:.221},{y:-.07,x:.294,z:.28},{y:.12,x:.3,z:.278},{y:.246,x:.245,z:.221,offset:-.023}],m.armor);
  panel(h,.54,.127,.158,[0,.142,.243],m.shell,.021,[-.11,0,0]);
  panel(h,.455,.087,.036,[0,.035,.307],m.weapon,.006);
  for(const s of [-1,1]) {
    plate(h,[[s*.018,-.013],[s*.196,.009],[s*.188,.033],[s*.022,.015]],.012,[0,.034,.334],m.accent,.003);
    plate(h,[[s*.12,.09],[s*.268,.116],[s*.276,-.086],[s*.175,-.179],[s*.104,-.11]],.073,
      [0,-.031,.248],m.shell,.012,[0,s*.09,0]);
    panel(h,.082,.183,.13,[s*.297,-.033,-.005],m.weapon,.012);
    cylinder(h,.059,.059,.058,[s*.322,-.019,-.044],m.alloy,[0,0,Math.PI/2],10);
  }
  panel(h,.14,.19,.071,[0,-.112,.277],m.armor,.012,[.1,0,0]);
  for(let i=0;i<3;i++)box(h,[.091,.013,.014],[0,-.082-i*.039,.322],m.weapon);
  panel(h,.116,.047,.31,[0,.253,-.028],m.armor,.006);
  panel(h,.19,.057,.028,[0,.014,-.291],m.weapon,.006);
  box(h,[.089,.013,.008],[0,.014,-.311],m.accent);
}
function torso(n,m) {
  panel(n.Hips,.65,.23,.43,[0,.047,0],m.suit,.023);
  panel(n.Hips,.71,.084,.465,[0,.161,0],m.armor,.012);
  panel(n.Hips,.18,.075,.036,[0,.16,.253],m.alloy,.006);
  plate(n.Hips,[[-.177,.061],[.177,.061],[.14,-.149],[0,-.202],[-.14,-.149]],.078,[0,-.021,.234],m.shell,.012);
  panel(n.Chest,.82,.615,.51,[0,.247,-.002],m.suit,.024);
  for(const s of [-1,1]) {
    plate(n.Chest,[[s*.027,-.13],[s*.353,-.10],[s*.431,.12],[s*.338,.307],[s*.026,.25]],
      .10,[0,.29,.274],m.armor,.019,[-.05,0,0]);
    plate(n.Chest,[[s*.045,.094],[s*.37,.166],[s*.334,.241],[s*.044,.173]],.025,[0,.303,.348],m.shell,.004);
    panel(n.Chest,.083,.258,.056,[s*.292,.18,.34],m.alloy,.009,[0,0,-s*.12]);
    bolt(n.Chest,s*.126,.487,.333,m.weapon,.014);
    panel(n.Hips,.175,.206,.14,[s*.294,.04,.229],m.weapon,.013,[0,0,-s*.08]);
    box(n.Hips,[.109,.03,.021],[s*.294,.101,.315],m.shell);
    strut(n.Chest,[s*.294,-.061,-.191],[s*.39,.51,-.13],.025,.028,m.alloy);
  }
  panel(n.Chest,.103,.282,.041,[0,.332,.356],m.weapon,.009);
  for(let i=0;i<3;i++)box(n.Chest,[.051,.014,.009],[0,.34+i*.041,.384],m.accent);
  serial(n.Chest,[.067,.264,.343],m.shell,.011);
  for(let i=0;i<3;i++)panel(n.Chest,.47,.06,.046,[0,-.085+i*.072,.27],m.armor,.007);
  cylinder(n.Chest,.199,.254,.07,[0,.606,0],m.shell,[0,0,0],12);
  cylinder(n.Chest,.125,.142,.15,[0,.638,0],m.suit,[0,0,0],12);
  // Side power cells leave the rear's fixed, green weak-core opening unobstructed.
  for(const s of [-1,1]) {
    panel(n.Chest,.217,.51,.245,[s*.311,.30,-.315],m.armor,.015);
    panel(n.Chest,.138,.321,.035,[s*.311,.33,-.466],m.weapon,.008);
    for(let i=0;i<5;i++)box(n.Chest,[.115,.019,.012],[s*.311,.213+i*.043,-.491],m.alloy);
    panel(n.Chest,.17,.065,.10,[s*.311,.59,-.32],m.shell,.008);
  }
  panel(n.Chest,.42,.13,.19,[0,.573,-.332],m.armor,.012);
}
function coreSocket(root,m) {
  const c=node(root,'B04_CoreSocket',...SHIELD_CORE);
  const core=mesh(c,new T.IcosahedronGeometry(.21,1),m.core);core.name='B04_VisibleCore';
  mesh(c,new T.TorusGeometry(.262,.027,8,20),m.alloy,[0,0,-.11]);
  for(const s of [-1,1]) {
    panel(c,.068,.335,.088,[s*.271,0,.023],m.weapon,.009);
    box(c,[.037,.16,.015],[s*.294,0,-.031],m.shell);
  }
  panel(c,.37,.071,.105,[0,.281,.023],m.armor,.009);
  panel(c,.37,.071,.105,[0,-.281,.023],m.armor,.009);
  return c;
}
function projection(shield,m) {
  // Same anchor as the old 1.5 x 2.1 shield. All of this projection inherits its EMP visibility.
  plate(shield,[[-.60,-1.015],[.60,-1.015],[.73,-.85],[.73,.87],[.61,1.02],[-.61,1.02],[-.73,.87],[-.73,-.85]],
    .025,[0,0,.02],m.field,0);
  for(const s of [-1,1]) {
    panel(shield,.034,1.72,.045,[s*.735,.01,.042],m.accent,.004);
    panel(shield,.024,.68,.035,[s*.686,-.39,.067],m.accent,.003);
    strut(shield,[s*.735,.874,.039],[s*.614,1.04,.039],.018,.018,m.accent);
    strut(shield,[s*.735,-.862,.039],[s*.606,-1.04,.039],.018,.018,m.accent);
    for(let i=0;i<3;i++)box(shield,[.052,.014,.016],[s*.62,-.65-i*.051,.069],m.accent);
  }
  panel(shield,1.23,.029,.037,[0,1.04,.04],m.accent,.003);
  panel(shield,1.22,.03,.037,[0,-1.04,.04],m.accent,.003);
  panel(shield,1.50,.037,.039,[0,.29,.043],m.accent,.004);
  panel(shield,.49,.032,.034,[0,-.71,.049],m.accent,.004);
  panel(shield,.022,.43,.033,[0,-.44,.05],m.accent,.003);
  serial(shield,[-.069,-.015,.057],m.accent,.02);
}
function emitterWeapon(f,m) {
  const gun=node(f,'B04_PulseEmitter',0,-.35,.16);gun.rotation.x=1.17;
  panel(gun,.194,.181,.266,[0,.068,.025],m.weapon,.012);
  panel(gun,.205,.079,.196,[0,.147,.011],m.armor,.008);
  panel(gun,.087,.161,.086,[0,-.077,-.035],m.suit,.008,[-.1,0,0]);
  for(const s of [-1,1]) {
    cylinder(gun,.031,.031,.27,[s*.049,.084,.24],m.alloy,[Math.PI/2,0,0],10);
    cylinder(gun,.042,.042,.063,[s*.049,.084,.385],m.weapon,[Math.PI/2,0,0],10);
    cylinder(gun,.021,.021,.008,[s*.049,.084,.422],m.suit,[Math.PI/2,0,0],8);
  }
  panel(gun,.075,.048,.075,[0,.212,0],m.weapon,.004);box(gun,[.032,.013,.008],[0,.213,.043],m.accent);
}
function limbs(n,m) {
  for(const s of [-1,1]) {
    const q=s>0?'R':'L',arm=n['Arm_'+q],fore=n['Forearm_'+q],thigh=n['Thigh_'+q],shin=n['Shin_'+q],foot=n['Foot_'+q];
    cylinder(arm,.113,.113,.208,[s*.046,-.02,0],m.suit,[0,0,Math.PI/2]);
    plate(arm,[[-.173,-.104],[.174,-.104],[.205,.083],[.10,.169],[-.139,.147]],.394,
      [s*.065,.035,.018],m.armor,.021,[0,0,-s*.15]);
    panel(arm,.237,.075,.045,[s*.065,.078,.248],m.shell,.007,[0,0,-s*.15]);
    box(arm,[.125,.016,.014],[s*.067,.029,.255],m.accent,[0,0,-s*.15]);
    cylinder(arm,.086,.075,.297,[0,-.234,0],m.suit);
    panel(arm,.187,.231,.108,[0,-.218,.082],m.armor,.013);
    strut(arm,[s*.092,-.086,-.052],[s*.087,-.351,-.052],.021,.024,m.alloy);
    cylinder(fore,.086,.086,.217,[0,0,0],m.alloy,[0,0,Math.PI/2]);
    cylinder(fore,.075,.085,.26,[0,-.17,.013],m.suit);
    panel(fore,.201,.259,.105,[0,-.143,.097],m.shell,.017);
    panel(fore,.112,.18,.028,[0,-.145,.167],m.armor,.006);
    cylinder(fore,.087,.087,.048,[0,-.303,.026],m.alloy);hand(fore,-.36,.037,m,s);
    if(s>0)emitterWeapon(fore,m);
    else {
      // Physical projector stays on the arm when the energy shield is disrupted.
      panel(fore,.227,.144,.102,[0,-.115,.219],m.weapon,.013);
      cylinder(fore,.065,.065,.072,[0,-.11,.289],m.alloy,[Math.PI/2,0,0],12);
      cylinder(fore,.042,.042,.082,[0,-.11,.302],m.accent,[Math.PI/2,0,0],12);
    }
    cylinder(thigh,.102,.111,.295,[0,-.155,0],m.suit);
    plate(thigh,[[-.117,.114],[.117,.114],[.132,-.024],[.085,-.213],[-.086,-.213]],.129,[0,-.137,.124],m.armor,.015);
    panel(thigh,.147,.121,.026,[0,-.106,.213],m.shell,.007);
    strut(thigh,[s*.125,-.023,-.024],[s*.104,-.313,-.034],.022,.023,m.alloy);
    cylinder(shin,.096,.096,.259,[0,0,0],m.weapon,[0,0,Math.PI/2]);
    panel(shin,.267,.211,.117,[0,-.025,.136],m.shell,.017);
    panel(shin,.127,.107,.025,[0,-.017,.208],m.armor,.007);
    cylinder(shin,.098,.071,.293,[0,-.206,-.007],m.suit);
    plate(shin,[[-.101,.095],[.109,.095],[.079,-.194],[.008,-.235],[-.072,-.187]],.077,[0,-.217,.117],m.armor,.014);
    panel(shin,.043,.22,.023,[0,-.189,.171],m.alloy,.005);
    panel(foot,.302,.116,.423,[0,-.071,.088],m.suit,.015);
    panel(foot,.261,.071,.261,[0,.001,.154],m.armor,.013,[.05,0,0]);
    panel(foot,.20,.032,.081,[0,.039,.236],m.shell,.005);
  }
}
export function createShieldVisual({accentMaterial=null,coreMaterial=null}={}) {
  const m=palette(accentMaterial,coreMaterial),root=new T.Group();root.name='B04_Visual';
  root.userData={assetVersion:SHIELD_ASSET.version,role:'shield',description:'Original BASTION shield carrier; rigid armor, anchored projection and fixed rear weak core.'};
  const n={};n.Hips=node(root,'B04_Hips',0,.91,0);n.Chest=node(n.Hips,'B04_Chest',0,.23,0);n.Head=node(n.Chest,'B04_Head',0,.8,0);
  for(const s of [-1,1]) {
    const q=s>0?'R':'L';n['Arm_'+q]=node(n.Chest,'B04_Arm_'+q,s*.585,.49,0);
    n['Forearm_'+q]=node(n['Arm_'+q],'B04_Forearm_'+q,0,-.407,0);
    n['Thigh_'+q]=node(n.Hips,'B04_Thigh_'+q,s*.276,-.035,0);
    n['Shin_'+q]=node(n['Thigh_'+q],'B04_Shin_'+q,0,-.365,0);
    n['Foot_'+q]=node(n['Shin_'+q],'B04_Foot_'+q,0,-.37,0);
  }
  n.Shield=node(root,'B04_Shield',...SHIELD_ANCHOR);
  torso(n,m);helmet(n.Head,m);limbs(n,m);projection(n.Shield,m);coreSocket(root,m);optimize(root);
  const rig=bindShieldRig(root);poseShield(rig);return {root,rig,materials:Object.values(m).filter(x=>x!==accentMaterial&&x!==coreMaterial)};
}
export function bindShieldRig(root) {
  const nodes={};for(const name of JOINTS){nodes[name]=root.getObjectByName('B04_'+name);if(!nodes[name])throw Error('Incomplete B04 rig: '+name);}
  const core=root.getObjectByName('B04_CoreSocket');if(!core)throw Error('B04 fixed weak-core anchor missing');return {root,nodes,core};
}
export function poseShield(rig,{time=0,mode='Idle',phase=0,hit=0,shieldBroken=mode==='Exposed',fieldEnabled=mode!=='Exposed'}={}) {
  const n=rig.nodes,t=time+phase,walk=mode==='Patrol',aim=mode==='Aim',breath=Math.sin(t*TAU/2.6),stride=walk?Math.sin(t*TAU/1.18):0,recoil=Math.max(0,hit);
  n.Hips.position.y=.91+(walk?Math.cos(t*TAU*2/1.18)*.005:breath*.002);
  n.Hips.rotation.set(0,stride*.012,walk?stride*.007:0);
  n.Chest.rotation.set(breath*.004-recoil*.10,0,recoil*.04);n.Head.rotation.set(breath*.005,Math.sin(t*.5)*.013,0);
  for(const s of [-1,1]) {
    const q=s>0?'R':'L',a=stride*s*.22,knee=walk?Math.max(0,-stride*s)*.25:.023;
    n['Thigh_'+q].rotation.set(a,0,-s*.016);n['Shin_'+q].rotation.set(knee,0,0);n['Foot_'+q].rotation.set(-a-knee,0,0);
  }
  n.Arm_R.rotation.set(aim?-.47:-.31-stride*.022,aim?-.02:0,-.035);n.Forearm_R.rotation.set(aim?-.70:-.86,0,0);
  n.Arm_L.rotation.set(shieldBroken?-.10+stride*.10:-.76,0,.025);n.Forearm_L.rotation.set(shieldBroken?-.27:-.67,0,0);
  // Runtime passes fieldEnabled=true: the original shield mesh's visibility is authoritative.
  n.Shield.scale.setScalar(fieldEnabled?1:0);n.Shield.rotation.set(0,0,0);
}
export function makeShieldClips(root) {
  const rig=bindShieldRig(root),clips=[];
  for(const mode of SHIELD_CLIPS) {
    const duration={Idle:2.6,Patrol:1.18,Aim:.8,Exposed:2.6,Hit:.5}[mode],count=Math.round(duration*30),times=Array.from({length:count+1},(_,i)=>i*duration/count);
    const rotations=new Map(Object.values(rig.nodes).map(n=>[n,[]])),positions=[],scales=[],tracks=[];
    for(const time of times) {
      poseShield(rig,{time:time===duration&&mode!=='Hit'?0:time,mode:mode==='Hit'?'Idle':mode,hit:mode==='Hit'?Math.sin(time/duration*Math.PI)*Math.exp(-time*4):0});
      for(const [n,a]of rotations)a.push(...n.quaternion.toArray());positions.push(...rig.nodes.Hips.position.toArray());scales.push(...rig.nodes.Shield.scale.toArray());
    }
    for(const [n,a]of rotations)tracks.push(new T.QuaternionKeyframeTrack(n.name+'.quaternion',times,a));
    tracks.push(new T.VectorKeyframeTrack('B04_Hips.position',times,positions));tracks.push(new T.VectorKeyframeTrack('B04_Shield.scale',times,scales));
    clips.push(new T.AnimationClip(mode,duration,tracks));
  }
  poseShield(rig);return clips;
}
export function cloneShieldVisual(template,{accentMaterial=null,coreMaterial=null}={}) {
  const root=template.clone(true),owned=new Map();
  root.traverse(o=>{if(!o.isMesh)return;o.geometry=o.geometry.clone();o.castShadow=true;o.receiveShadow=true;o.raycast=noRaycast;o.userData.combatDecoration=true;
    const copy=m=>{if(m.name==='B04_RoleLight'&&accentMaterial)return accentMaterial;if(m.name==='B04_WeakCore'&&coreMaterial)return coreMaterial;
      if(!owned.has(m)){const next=m.clone();if(next.transparent)next.depthWrite=false;owned.set(m,next);}return owned.get(m);};
    o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
  });
  return {root,rig:bindShieldRig(root),materials:[...owned.values()]};
}
export {stats as shieldStats,disposeVisual as disposeShieldVisual};
