// C01 VECTOR: original tactical commander, +Y up / +Z forward, metres.
// Articulated hard-surface armor and rigid mantle panels; not simulated cloth or a skinned human.
import {T,material,node,box,cylinder,plate,panel,strut,loft,bolt,marking,hand,
  optimize,stats,disposeVisual,noRaycast} from './guard-geometry.js';
export const COMMANDER_ASSET=Object.freeze({id:'C01',version:'c01-v1',file:'commander-guard-c01.glb'});
export const COMMANDER_CLIPS=Object.freeze(['Idle','Patrol','Aim','Command','Hit']);
const JOINTS=['Hips','Chest','Head','Arm_R','Arm_L','Forearm_R','Forearm_L','Thigh_R','Thigh_L',
  'Shin_R','Shin_L','Foot_R','Foot_L','Front_R','Front_L','Tail_R','Tail_L','Terminal'];
const TAU=Math.PI*2;
function palette(accent) {
  return {armor:material('C01_SlateArmor',0x46576e,.65,.43),
    shell:material('C01_Ceramic',0xc4cbc8,.36,.48),
    suit:material('C01_Undersuit',0x172031,.10,.82),
    alloy:material('C01_Alloy',0x82929d,.84,.29),
    weapon:material('C01_Housing',0x263040,.74,.38),
    trim:material('C01_RankTrim',0x9e85a3,.67,.38),
    accent:accent||material('C01_CommandOptics',0xeb9bff,.24,.3,{emissive:0xeb9bff,emissiveIntensity:.8})};
}
function helmet(h,m) {
  loft(h,[{y:-.205,x:.20,z:.211},{y:-.09,x:.272,z:.27},{y:.105,x:.287,z:.268},
    {y:.235,x:.215,z:.206,offset:-.016}],m.armor);
  panel(h,.49,.108,.13,[0,.155,.237],m.shell,.015,[-.15,0,0]);
  plate(h,[[-.236,.056],[-.084,.038],[0,-.015],[.084,.038],[.236,.056],[.22,-.07],[0,-.114],[-.22,-.07]],
    .058,[0,.027,.285],m.weapon,.008);
  for(const s of [-1,1]) {
    plate(h,[[s*.025,-.011],[s*.206,.036],[s*.203,.068],[s*.066,.047]],.013,[0,.012,.325],m.accent,.003);
    plate(h,[[s*.09,.022],[s*.237,.085],[s*.249,-.057],[s*.155,-.169],[s*.086,-.091]],
      .08,[0,-.027,.231],m.shell,.01,[0,s*.08,0]);
    panel(h,.08,.18,.115,[s*.273,-.029,-.003],m.weapon,.01);
    cylinder(h,.07,.07,.042,[s*.31,-.025,-.048],m.alloy,[0,0,Math.PI/2],10);
    cylinder(h,.033,.033,.05,[s*.317,-.025,-.048],m.trim,[0,0,Math.PI/2],8);
    bolt(h,s*.182,.15,.309,m.weapon,.011);
  }
  plate(h,[[-.067,.044],[.067,.044],[.05,-.112],[0,-.146],[-.05,-.112]],.052,[0,-.09,.286],m.armor,.007);
  for(const x of [-.033,0,.033])box(h,[.015,.048,.013],[x,-.169,.319],m.weapon,[.12,0,0]);
  plate(h,[[-.079,-.031],[.079,-.031],[.058,.055],[0,.074],[-.058,.055]],.31,[0,.248,-.021],m.shell,.011);
  box(h,[.022,.046,.027],[0,.267,.162],m.accent);
  panel(h,.18,.078,.024,[0,.04,-.282],m.weapon,.006);
  for(const s of [-1,1])box(h,[.055,.013,.01],[s*.047,.04,-.3],m.accent);
}
function communications(chest,m) {
  panel(chest,.68,.52,.22,[0,.32,-.365],m.weapon,.02);
  panel(chest,.48,.41,.068,[0,.34,-.508],m.armor,.015);
  panel(chest,.20,.23,.031,[0,.40,-.558],m.alloy,.009);
  for(let i=0;i<5;i++)box(chest,[.16,.013,.012],[0,.323+i*.035,-.582],m.weapon);
  panel(chest,.24,.087,.02,[0,.19,-.562],m.trim,.006);
  for(const s of [-1,1]) {
    // Dual angled communications blades retain the commander's tall rear signature.
    cylinder(chest,.057,.057,.22,[s*.34,.56,-.46],m.alloy);
    panel(chest,.104,.24,.15,[s*.34,.62,-.452],m.armor,.011);
    plate(chest,[[-.037,-.39],[.037,-.39],[.056,.31],[.026,.42],[-.028,.42],[-.044,.20]],
      .078,[s*.34,1.035,-.455],m.armor,.008,[0,0,-s*.025]);
    panel(chest,.048,.52,.016,[s*.349,1.00,-.403],m.alloy,.004,[0,0,-s*.025]);
    panel(chest,.108,.097,.10,[s*.351,1.455,-.454],m.trim,.009);
    box(chest,[.071,.038,.014],[s*.351,1.469,-.391],m.accent);
    panel(chest,.08,.11,.036,[s*.253,.302,-.544],m.shell,.006);
    strut(chest,[s*.30,.56,-.344],[s*.23,.15,-.318],.02,.02,m.trim);
  }
  const label=node(chest,'C01_BackMark',0,.067,-.49);label.rotation.y=Math.PI;
  marking(label,'01',[-.04,.023,.02],m.shell,.012);
}
function torso(n,m) {
  panel(n.Hips,.59,.21,.39,[0,.047,0],m.suit,.02);
  panel(n.Hips,.66,.072,.43,[0,.157,0],m.armor,.01);
  panel(n.Hips,.16,.065,.039,[0,.155,.237],m.trim,.005);
  box(n.Hips,[.041,.027,.009],[0,.155,.264],m.accent);
  panel(n.Chest,.63,.56,.42,[0,.226,-.015],m.suit,.022);
  for(const s of [-1,1]) {
    plate(n.Chest,[[s*.028,-.116],[s*.262,-.084],[s*.345,.123],[s*.257,.268],[s*.033,.211]],
      .08,[0,.297,.237],m.armor,.016,[-.06,0,0]);
    plate(n.Chest,[[s*.032,.03],[s*.29,.15],[s*.251,.211],[s*.03,.10]],.024,[0,.327,.291],m.shell,.004);
    panel(n.Chest,.072,.11,.041,[s*.265,.146,.298],m.trim,.006,[0,0,-s*.14]);
    strut(n.Chest,[s*.18,-.08,-.15],[s*.28,.49,-.13],.023,.025,m.alloy);
    // High, split gorget, distinct from a broad-brim helmet or exposed heavy core.
    plate(n.Chest,[[s*.13,-.04],[s*.28,-.021],[s*.31,.19],[s*.19,.225],[s*.15,.13]],.24,
      [0,.495,.03],m.shell,.012,[0,0,-s*.06]);
    panel(n.Hips,.16,.17,.12,[s*.29,.034,.181],m.weapon,.012,[0,0,-s*.10]);
  }
  for(let i=0;i<3;i++)panel(n.Chest,.37-i*.025,.061,.04,[0,-.089+i*.079,.223],m.alloy,.006);
  panel(n.Chest,.088,.35,.035,[0,.335,.305],m.weapon,.007);
  for(let i=0;i<3;i++)box(n.Chest,[.04,.014,.009],[0,.387+i*.037,.33],m.accent);
  marking(n.Chest,'01',[.084,.304,.296],m.shell,.010);
  for(let i=0;i<3;i++)plate(n.Chest,[[-.048,.02],[0,-.011],[.048,.02],[.048,.041],[0,.01],[-.048,.041]],
    .009,[-.14,.24-i*.038,.294],m.trim,.002);
  cylinder(n.Chest,.128,.157,.153,[0,.605,0],m.suit,[0,0,0],12);
  communications(n.Chest,m);
}
function mantle(n,m) {
  for(const s of [-1,1]) {
    const q=s>0?'R':'L',front=n['Front_'+q],tail=n['Tail_'+q];
    plate(front,[[-.109,.012],[.109,.012],[.122,-.32],[.062,-.43],[-.104,-.382]],.048,[0,0,0],m.armor,.011);
    plate(front,[[-.092,-.01],[-.048,-.01],[-.04,-.29],[-.083,-.34]],.012,[0,0,.033],m.shell,.003);
    box(front,[.095,.018,.012],[.025,-.34,.037],m.trim,[0,0,-.22]);
    plate(tail,[[-.17,.02],[.15,.02],[.155,-.38],[.054,-.525],[-.12,-.475]],.05,[0,0,0],m.armor,.012);
    plate(tail,[[-.15,-.01],[-.11,-.01],[-.075,-.453],[-.113,-.46]],.012,[0,0,-.035],m.shell,.003);
    for(let i=0;i<2;i++)box(tail,[.068,.02,.012],[.005,-.355-i*.047,-.037],m.trim);
  }
}
function carbine(fore,m) {
  const gun=node(fore,'C01_Carbine',0,-.348,.17);gun.rotation.x=1.12;
  panel(gun,.15,.15,.38,[0,.069,.045],m.weapon,.011);
  panel(gun,.158,.053,.22,[0,.137,.018],m.armor,.006);
  panel(gun,.073,.18,.087,[0,-.079,-.035],m.suit,.007,[-.13,0,0]);
  panel(gun,.084,.19,.12,[0,-.08,.12],m.weapon,.008,[.16,0,0]);
  box(gun,[.092,.034,.13],[0,-.174,.125],m.alloy);
  panel(gun,.067,.075,.235,[0,.092,-.24],m.alloy,.006);
  panel(gun,.095,.148,.035,[0,.06,-.366],m.suit,.006);
  cylinder(gun,.032,.032,.21,[0,.081,.322],m.alloy,[Math.PI/2,0,0],10);
  cylinder(gun,.046,.043,.066,[0,.081,.455],m.weapon,[Math.PI/2,0,0],10);
  cylinder(gun,.024,.024,.008,[0,.081,.493],m.suit,[Math.PI/2,0,0],10);
  panel(gun,.063,.05,.10,[0,.193,.018],m.weapon,.004);
  box(gun,[.027,.016,.005],[0,.192,.073],m.accent);
  box(gun,[.01,.02,.125],[.081,.095,.065],m.accent);
}
function limbs(n,m) {
  for(const s of [-1,1]) {
    const q=s>0?'R':'L',arm=n['Arm_'+q],fore=n['Forearm_'+q],thigh=n['Thigh_'+q],shin=n['Shin_'+q],foot=n['Foot_'+q];
    cylinder(arm,.09,.09,.165,[s*.05,-.015,0],m.suit,[0,0,Math.PI/2]);
    const broad=s<0;
    plate(arm,[[-.146,-.086],[.148,-.086],[.187,.09],[.06,.167],[-.123,.129]],broad?.43:.31,
      [s*.053,.028,.011],broad?m.shell:m.armor,.019,[0,0,-s*.15]);
    panel(arm,broad?.215:.13,.046,.037,[s*.05,.092,broad?.254:.193],m.trim,.006,[0,0,-s*.15]);
    if(broad)for(let i=0;i<3;i++)box(arm,[.073,.014,.01],[s*.05,.068-i*.026,.255],m.weapon,[0,0,.15]);
    cylinder(arm,.073,.067,.305,[s*.017,-.222,0],m.suit);
    panel(arm,.155,.22,.085,[s*.017,-.213,.085],m.armor,.012);
    strut(arm,[s*.08,-.075,-.048],[s*.078,-.356,-.036],.014,.019,m.alloy);
    cylinder(fore,.068,.068,.184,[0,0,0],m.alloy,[0,0,Math.PI/2]);
    cylinder(fore,.055,.07,.257,[0,-.174,.011],m.suit);
    plate(fore,[[-.086,.07],[.086,.07],[.08,-.076],[.054,-.222],[-.065,-.222]],
      .086,[0,-.12,.078],m.armor,.012);
    panel(fore,.106,.126,.022,[0,-.116,.136],m.shell,.006);
    cylinder(fore,.068,.068,.04,[0,-.301,.029],m.alloy);hand(fore,-.356,.052,m,s);
    if(s>0)carbine(fore,m);
    else {
      // A hinged map/command screen. Its geometry is decorative, never a new aura.
      n.Terminal=node(fore,'C01_Terminal',0,-.13,.18);
      panel(n.Terminal,.199,.218,.025,[0,.052,0],m.weapon,.007);
      panel(n.Terminal,.162,.169,.007,[0,.054,.02],m.trim,.002);
      for(let i=0;i<3;i++)box(n.Terminal,[.102-i*.017,.005,.004],[-.013,.094-i*.037,.027],m.accent);
      for(const [x,y]of [[-.049,.026],[.04,.068],[.044,.122]])box(n.Terminal,[.014,.014,.004],[x,y,.028],m.accent);
    }
    cylinder(thigh,.089,.092,.284,[0,-.139,0],m.suit);
    plate(thigh,[[-.103,.102],[.104,.102],[.114,-.044],[.065,-.214],[-.079,-.199]],
      .11,[0,-.118,.112],m.armor,.012);
    strut(thigh,[s*.10,-.018,-.027],[s*.089,-.3,-.031],.017,.02,m.alloy);
    cylinder(shin,.074,.074,.211,[0,0,0],m.weapon,[0,0,Math.PI/2]);
    plate(shin,[[-.10,.077],[.10,.077],[.12,-.022],[0,-.12],[-.12,-.022]],.10,[0,-.012,.106],m.shell,.012);
    cylinder(shin,.077,.06,.29,[0,-.191,-.007],m.suit);
    plate(shin,[[-.079,.089],[.079,.089],[.068,-.184],[.024,-.217],[-.06,-.19]],.06,[0,-.198,.096],m.armor,.011);
    panel(shin,.042,.211,.019,[0,-.174,.138],m.alloy,.004);
    panel(foot,.265,.107,.39,[0,-.071,.073],m.suit,.014);
    panel(foot,.221,.069,.23,[0,.0,.15],m.armor,.011,[.055,0,0]);
    box(foot,[.16,.017,.075],[0,.034,.2],m.shell);
  }
}
export function createCommanderVisual({accentMaterial=null}={}) {
  const m=palette(accentMaterial),root=new T.Group();root.name='C01_Visual';
  root.userData={assetVersion:COMMANDER_ASSET.version,role:'commander',description:'Original VECTOR commander: rigid segmented mantle, communications blades and hinged tactical terminal.'};
  const n={};n.Hips=node(root,'C01_Hips',0,.90,0);n.Chest=node(n.Hips,'C01_Chest',0,.225,0);n.Head=node(n.Chest,'C01_Head',0,.815,0);
  for(const s of [-1,1]) {
    const q=s>0?'R':'L';n['Arm_'+q]=node(n.Chest,'C01_Arm_'+q,s*.527,.505,0);
    n['Forearm_'+q]=node(n['Arm_'+q],'C01_Forearm_'+q,s*.023,-.425,0);
    n['Thigh_'+q]=node(n.Hips,'C01_Thigh_'+q,s*.263,-.025,0);
    n['Shin_'+q]=node(n['Thigh_'+q],'C01_Shin_'+q,0,-.355,0);
    n['Foot_'+q]=node(n['Shin_'+q],'C01_Foot_'+q,0,-.37,0);
    n['Front_'+q]=node(n.Hips,'C01_Front_'+q,s*.184,.045,.264);
    n['Tail_'+q]=node(n.Hips,'C01_Tail_'+q,s*.168,.038,-.249);
  }
  torso(n,m);helmet(n.Head,m);limbs(n,m);mantle(n,m);optimize(root);
  const rig=bindCommanderRig(root);poseCommander(rig);return {root,rig,materials:Object.values(m).filter(x=>x!==accentMaterial)};
}
export function bindCommanderRig(root) {
  const nodes={};for(const name of JOINTS){nodes[name]=root.getObjectByName('C01_'+name);if(!nodes[name])throw Error('Incomplete C01 rig: '+name);}
  return {root,nodes};
}
export function poseCommander(rig,{time=0,mode='Idle',phase=0,hit=0,broadcast=false}={}) {
  const n=rig.nodes,t=time+phase,walk=mode==='Patrol',aim=mode==='Aim',command=!aim&&(mode==='Command'||broadcast);
  const breath=Math.sin(t*TAU/2.6),stride=walk?Math.sin(t*TAU/1.05):0,recoil=Math.max(0,hit);
  n.Hips.position.y=.90+(walk?Math.cos(t*TAU*2/1.05)*.006:breath*.0025);
  n.Hips.rotation.set(0,stride*.018,walk?stride*.009:0);
  n.Chest.rotation.set(.003+breath*.004-recoil*.11,command?-.045:0,recoil*.06);
  n.Head.rotation.set(command?.07+.012*Math.sin(t*2):breath*.006,command?-.065:Math.sin(t*.5)*.015,0);
  for(const s of [-1,1]) {
    const q=s>0?'R':'L',a=stride*s*.26,knee=walk?Math.max(0,-stride*s)*.30:.022;
    n['Thigh_'+q].rotation.set(a,0,-s*.012);n['Shin_'+q].rotation.set(knee,0,0);n['Foot_'+q].rotation.set(-a-knee,0,0);
    n['Front_'+q].rotation.set(-.06-Math.max(0,-stride*s)*.27,s*.07,0);
    n['Tail_'+q].rotation.set(.09+Math.max(0,stride*s)*.30,-s*.06,0);
  }
  n.Arm_R.rotation.set(aim?-.54:-.34-stride*.025,aim?-.035:0,-.025);
  n.Forearm_R.rotation.set(aim?-.68:-.77,0,0);
  n.Arm_L.rotation.set(command?-.55+.028*Math.sin(t*2.2):aim?-.26:-.045+stride*.15,command?-.07:0,.035);
  n.Forearm_L.rotation.set(command?-1.02:aim?-.53:-.22,0,0);
  n.Terminal.rotation.set(command?.42:0,0,0);
}
export function makeCommanderClips(root) {
  const rig=bindCommanderRig(root),clips=[];
  for(const mode of COMMANDER_CLIPS) {
    const duration={Idle:2.6,Patrol:1.05,Aim:2.4,Command:2.6,Hit:.5}[mode],count=Math.round(duration*30);
    const times=Array.from({length:count+1},(_,i)=>i*duration/count),rotations=new Map(Object.values(rig.nodes).map(n=>[n,[]])),positions=[],tracks=[];
    for(const time of times) {
      poseCommander(rig,{time:time===duration&&mode!=='Hit'?0:time,mode:mode==='Hit'?'Idle':mode,
        hit:mode==='Hit'?Math.sin(time/duration*Math.PI)*Math.exp(-time*4):0});
      for(const [n,a]of rotations)a.push(...n.quaternion.toArray());positions.push(...rig.nodes.Hips.position.toArray());
    }
    for(const [n,a]of rotations)tracks.push(new T.QuaternionKeyframeTrack(n.name+'.quaternion',times,a));
    tracks.push(new T.VectorKeyframeTrack('C01_Hips.position',times,positions));clips.push(new T.AnimationClip(mode,duration,tracks));
  }
  poseCommander(rig);return clips;
}
export function cloneCommanderVisual(template,accentMaterial) {
  const root=template.clone(true),owned=new Map();
  root.traverse(o=>{if(!o.isMesh)return;o.geometry=o.geometry.clone();o.castShadow=true;o.receiveShadow=true;o.raycast=noRaycast;o.userData.combatDecoration=true;
    const copy=m=>{if(m.name==='C01_CommandOptics'&&accentMaterial)return accentMaterial;if(!owned.has(m))owned.set(m,m.clone());return owned.get(m);};
    o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
  });
  return {root,rig:bindCommanderRig(root),materials:[...owned.values()]};
}
export {stats as commanderStats,disposeVisual as disposeCommanderVisual};
