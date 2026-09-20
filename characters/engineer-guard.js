// E02 MENDER: original support-unit visual. +Y up, +Z forward, metres.
// Reuses the existing geometry utilities without modifying A03, H12 or R07.
import {T,material,node,mesh,box,cylinder,plate,panel,strut,loft,bolt,marking,hand,
  optimize,stats,disposeVisual,noRaycast} from './guard-geometry.js';
export const ENGINEER_ASSET = Object.freeze({id:'E02',version:'e02-v1',file:'engineer-guard-e02.glb'});
export const ENGINEER_CLIPS = Object.freeze(['Idle','Patrol','Aim','Repair','Deploy','Hit']);
const TAU=Math.PI*2;
const JOINTS=['Hips','Chest','Head','Arm_R','Arm_L','Forearm_R','Forearm_L',
  'Thigh_R','Thigh_L','Shin_R','Shin_L','Foot_R','Foot_L','AuxShoulder','AuxElbow','AuxWrist','Claw_L','Claw_R'];
function palette(accent) {
  return {
    armor:material('E02_WorkPaint',0xc69645,.38,.52),
    shell:material('E02_Frame',0x455c61,.68,.43),
    alloy:material('E02_Alloy',0x91a3a4,.83,.31),
    suit:material('E02_Suit',0x182628,.08,.85),
    weapon:material('E02_ToolHousing',0x253439,.73,.39),
    copper:material('E02_Copper',0xa9663c,.8,.43),
    accent:accent||material('E02_Indicator',0xffc36a,.25,.29,{emissive:0xffc36a,emissiveIntensity:.85}),
  };
}
function hose(parent,points,radius,mat) {
  const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  return mesh(parent,new T.TubeGeometry(c,18,radius,6,false),mat);
}
function stripe(parent,x,y,z,mat,rotation=0) {
  box(parent,[.024,.095,.008],[x,y,z],mat,[0,0,rotation]);
}
function buildHelmet(head,m) {
  loft(head,[{y:-.20,x:.219,z:.22},{y:-.075,x:.278,z:.279},
    {y:.115,x:.288,z:.27},{y:.22,x:.24,z:.22,offset:-.018}],m.shell);
  // Wide safety brim + reinforced crown: the engineer reads as a worker, not a rifleman.
  panel(head,.83,.048,.73,[0,.175,.012],m.armor,.014);
  panel(head,.76,.014,.66,[0,.14,.012],m.weapon,.004);
  loft(head,[{y:.187,x:.318,z:.268},{y:.274,x:.267,z:.24,offset:-.018},
    {y:.323,x:.195,z:.184,offset:-.028}],m.armor);
  panel(head,.056,.038,.36,[0,.32,-.023],m.shell,.006);
  panel(head,.49,.155,.064,[0,.02,.284],m.weapon,.014);
  for(const s of [-1,1]) {
    cylinder(head,.087,.087,.030,[s*.132,.035,.327],m.alloy,[Math.PI/2,0,0],12);
    cylinder(head,.064,.064,.037,[s*.132,.035,.344],m.accent,[Math.PI/2,0,0],12);
    box(head,[.105,.009,.008],[s*.132,.032,.367],m.weapon);
    panel(head,.09,.16,.13,[s*.248,-.11,.165],m.armor,.012,[0,s*.30,0]);
    cylinder(head,.086,.086,.066,[s*.29,-.053,-.025],m.weapon,[0,0,Math.PI/2],12);
    cylinder(head,.050,.050,.080,[s*.31,-.053,-.025],m.alloy,[0,0,Math.PI/2],10);
    stripe(head,s*.255,.234,.230,m.weapon,-s*.23);
  }
  panel(head,.25,.12,.095,[0,-.133,.27],m.armor,.010,[.20,0,0]);
  for(const x of [-.06,0,.06])panel(head,.031,.072,.021,[x,-.14,.329],m.weapon,.003,[.20,0,0]);
  cylinder(head,.039,.039,.04,[0,.166,.399],m.alloy,[Math.PI/2,0,0],10);
  cylinder(head,.025,.025,.05,[0,.166,.410],m.accent,[Math.PI/2,0,0],10);
  panel(head,.25,.077,.035,[0,.025,-.287],m.weapon,.008);
  for(const s of [-1,1])box(head,[.067,.012,.009],[s*.069,.025,-.310],m.accent);
  marking(head,'02',[.067,.245,.248],m.weapon,.009);
}
function buildPack(chest,m) {
  // A separate framed service pack, tank cages, reels and folded auxiliary manipulator.
  panel(chest,.88,.75,.23,[0,.285,-.51],m.weapon,.027);
  panel(chest,.94,.068,.26,[0,-.095,-.53],m.alloy,.01);
  panel(chest,.94,.074,.29,[0,.674,-.53],m.alloy,.01);
  for(const s of [-1,1]) {
    panel(chest,.073,.74,.28,[s*.445,.288,-.53],m.shell,.008);
    cylinder(chest,.121,.12,.535,[s*.274,.295,-.664],m.armor,[0,0,0],12);
    cylinder(chest,.066,.12,.094,[s*.274,.607,-.664],m.alloy);
    cylinder(chest,.057,.065,.05,[s*.274,.68,-.664],m.weapon);
    cylinder(chest,.126,.126,.052,[s*.274,.083,-.664],m.shell);
    cylinder(chest,.126,.126,.052,[s*.274,.473,-.664],m.shell);
    strut(chest,[s*.41,-.027,-.755],[s*.41,.61,-.755],.024,.024,m.alloy);
    for(let i=0;i<3;i++)box(chest,[.069,.015,.009],[s*.274,.278+i*.042,-.790],m.weapon,[0,0,s*.37]);
  }
  panel(chest,.26,.43,.13,[0,.29,-.715],m.shell,.017);
  panel(chest,.19,.107,.024,[0,.4,-.8],m.weapon,.006);
  for(let i=0;i<3;i++)box(chest,[.038,.011,.008],[-.057+i*.055,.412,-.819],m.accent);
  const tag=node(chest,'E02_BackTag',.05,.289,-.795);tag.rotation.y=Math.PI;
  marking(tag,'02',[-.043,.033,.016],m.armor,.013);
  for(let i=0;i<4;i++)box(chest,[.17,.014,.03],[0,.082+i*.032,-.795],m.alloy);
  hose(chest,[[.35,.52,-.77],[.50,.57,-.65],[.48,.23,-.38],[.34,.04,-.33]],.022,m.suit);
  hose(chest,[[-.32,.68,-.70],[-.43,.83,-.66],[-.54,.68,-.50]],.021,m.copper);
  panel(chest,.083,.15,.10,[.39,.82,-.52],m.shell,.008);
  box(chest,[.025,.046,.012],[.39,.84,-.584],m.accent);
}
function buildManipulator(chest,m,n) {
  n.AuxShoulder=node(chest,'E02_AuxShoulder',-.48,.70,-.52);
  cylinder(n.AuxShoulder,.091,.091,.17,[0,0,0],m.shell,[0,0,Math.PI/2],12);
  cylinder(n.AuxShoulder,.046,.046,.19,[0,0,0],m.copper,[0,0,Math.PI/2],10);
  panel(n.AuxShoulder,.14,.26,.095,[0,-.15,0],m.armor,.012);
  strut(n.AuxShoulder,[.082,-.035,-.03],[.082,-.25,-.03],.018,.026,m.alloy);
  box(n.AuxShoulder,[.071,.065,.012],[0,-.16,.06],m.weapon);
  n.AuxElbow=node(n.AuxShoulder,'E02_AuxElbow',0,-.30,0);
  cylinder(n.AuxElbow,.066,.066,.17,[0,0,0],m.shell,[0,0,Math.PI/2],12);
  cylinder(n.AuxElbow,.03,.03,.185,[0,0,0],m.alloy,[0,0,Math.PI/2],8);
  panel(n.AuxElbow,.094,.30,.064,[0,-.177,0],m.shell,.009);
  box(n.AuxElbow,[.023,.19,.078],[0,-.165,0],m.alloy);
  n.AuxWrist=node(n.AuxElbow,'E02_AuxWrist',0,-.345,0);
  cylinder(n.AuxWrist,.056,.056,.09,[0,-.02,0],m.copper,[0,0,0],10);
  panel(n.AuxWrist,.132,.066,.105,[0,-.09,0],m.weapon,.008);
  for(const s of [-1,1]) {
    const key=s<0?'Claw_L':'Claw_R';n[key]=node(n.AuxWrist,'E02_'+key,s*.058,-.11,0);
    plate(n[key],[[-.019,.01],[.019,.01],[.024,-.10],[-.028,-.13],[-.045,-.095],[-.015,-.071]],.031,
      [0,0,0],m.alloy,.005,[0,0,-s*.14]);
    box(n[key],[.027,.038,.04],[-s*.017,-.114,0],m.suit);
  }
}
function buildTool(fore,m) {
  const tool=node(fore,'E02_ServiceTool',0,-.36,.16);tool.rotation.x=1.10;
  panel(tool,.18,.17,.25,[0,.06,.043],m.armor,.013);
  panel(tool,.12,.09,.15,[0,.12,.014],m.shell,.008);
  panel(tool,.083,.18,.096,[0,-.085,-.035],m.suit,.008,[-.18,0,0]);
  cylinder(tool,.055,.056,.19,[0,.05,.235],m.copper,[Math.PI/2,0,0],10);
  cylinder(tool,.066,.063,.07,[0,.05,.36],m.shell,[Math.PI/2,0,0],10);
  cylinder(tool,.023,.021,.11,[0,.05,.432],m.accent,[Math.PI/2,0,0],8);
  for(const s of [-1,1])strut(tool,[s*.052,.012,.27],[s*.041,.005,.43],.013,.013,m.alloy);
  cylinder(tool,.068,.068,.16,[0,.04,-.148],m.weapon,[Math.PI/2,0,0],10);
  panel(tool,.06,.05,.065,[0,.18,.01],m.weapon,.004);
  box(tool,[.027,.013,.006],[0,.185,.047],m.accent);
  for(let i=0;i<3;i++)stripe(tool,.096,.066,.005+i*.055,m.weapon,.32);
  hose(tool,[[.075,.03,-.12],[.12,-.045,-.18],[.13,-.14,-.09],[.07,-.12,.01]],.012,m.copper);
}
function buildBody(n,m) {
  panel(n.Hips,.59,.19,.39,[0,.043,0],m.suit,.022);
  panel(n.Hips,.68,.073,.43,[0,.149,0],m.shell,.009);
  panel(n.Hips,.17,.071,.035,[0,.147,.24],m.alloy,.005);
  plate(n.Hips,[[-.195,.095],[.195,.095],[.21,-.06],[.125,-.17],[-.125,-.17],[-.21,-.06]],
    .057,[0,-.018,.225],m.armor,.012);
  for(const s of [-1,1]) {
    panel(n.Hips,.185,.22,.16,[s*.27,.028,.224],m.weapon,.012,[0,0,-s*.12]);
    box(n.Hips,[.12,.032,.026],[s*.27,.10,.319],m.armor);
    cylinder(n.Hips,.034,.034,.21,[s*.34,.047,.15],m.alloy,[0,0,s*.12],8);
  }
  panel(n.Chest,.67,.59,.46,[0,.235,-.018],m.suit,.029);
  for(const s of [-1,1]) {
    plate(n.Chest,[[s*.026,-.064],[s*.333,-.027],[s*.369,.158],[s*.273,.28],[s*.026,.236]],
      .075,[0,.27,.258],m.armor,.016,[-.06,0,0]);
    panel(n.Chest,.087,.41,.10,[s*.298,.33,.275],m.shell,.012,[0,0,-s*.16]);
    panel(n.Chest,.104,.077,.028,[s*.292,.441,.34],m.alloy,.005,[0,0,-s*.16]);
    bolt(n.Chest,s*.145,.439,.298,m.weapon,.012);
  }
  panel(n.Chest,.10,.29,.05,[0,.32,.304],m.shell,.007);
  for(let i=0;i<3;i++)panel(n.Chest,.45,.064,.047,[0,-.085+i*.079,.249],m.shell,.008);
  box(n.Chest,[.102,.017,.012],[-.16,.379,.312],m.accent);
  panel(n.Chest,.17,.12,.039,[.164,.29,.31],m.weapon,.008);
  marking(n.Chest,'02',[.125,.325,.339],m.armor,.011);
  for(let i=0;i<3;i++)box(n.Chest,[.020,.088,.027],[-.20+i*.039,.202,.306],m.alloy);
  cylinder(n.Chest,.199,.241,.063,[0,.574,0],m.shell,[0,0,0],12);
  cylinder(n.Chest,.12,.137,.158,[0,.601,0],m.suit,[0,0,0],12);
  buildPack(n.Chest,m);
}
function buildLimbs(n,m) {
  for(const s of [-1,1]) {
    const q=s>0?'R':'L',arm=n['Arm_'+q],fore=n['Forearm_'+q],thigh=n['Thigh_'+q],shin=n['Shin_'+q],foot=n['Foot_'+q];
    cylinder(arm,.111,.111,.16,[s*.055,-.025,0],m.suit,[0,0,Math.PI/2]);
    panel(arm,.28,.19,.41,[s*.067,.034,.015],m.shell,.022,[0,0,-s*.16]);
    plate(arm,[[-.12,-.059],[.12,-.059],[.142,.035],[.09,.113],[-.108,.113],[-.15,.03]],.067,
      [s*.066,.054,.25],m.armor,.01,[0,0,-s*.12]);
    for(let i=0;i<3;i++)stripe(arm,s*.066+(i-1)*.038,.055,.296,m.weapon,.30);
    cylinder(arm,.082,.074,.32,[s*.025,-.229,0],m.suit);
    panel(arm,.17,.22,.086,[s*.025,-.22,.083],m.shell,.013);
    panel(arm,.075,.17,.027,[s*.025,-.22,.14],m.armor,.004);
    cylinder(fore,.074,.074,.19,[0,0,0],m.alloy,[0,0,Math.PI/2]);
    cylinder(fore,.034,.034,.207,[0,0,0],m.weapon,[0,0,Math.PI/2],8);
    cylinder(fore,.067,.08,.265,[0,-.179,.016],m.suit);
    plate(fore,[[-.085,.074],[.085,.074],[.092,-.048],[.063,-.222],[-.059,-.222],[-.092,-.048]],
      .09,[0,-.13,.092],m.armor,.013);
    cylinder(fore,.078,.078,.05,[0,-.302,.037],m.shell);
    hand(fore,-.365,.066,m,s);
    if(s>0)buildTool(fore,m);
    else {
      panel(fore,.18,.14,.04,[0,-.13,.168],m.weapon,.007);
      panel(fore,.128,.089,.012,[0,-.125,.2],m.shell,.003);
      for(let i=0;i<3;i++)box(fore,[.074-i*.012,.006,.003],[-.012,-.101-i*.020,.211],m.accent);
      cylinder(fore,.018,.018,.022,[.068,-.154,.205],m.copper,[Math.PI/2,0,0],8);
    }
    cylinder(thigh,.102,.108,.28,[0,-.145,0],m.suit);
    plate(thigh,[[-.102,.095],[.102,.095],[.12,-.03],[.072,-.213],[-.072,-.213],[-.113,-.03]],
      .125,[0,-.12,.108],m.shell,.014);
    panel(thigh,.145,.16,.043,[0,-.102,.193],m.armor,.009,[.06,0,0]);
    strut(thigh,[s*.112,-.036,.002],[s*.092,-.294,-.034],.018,.018,m.alloy);
    cylinder(shin,.084,.084,.225,[0,0,0],m.weapon,[0,0,Math.PI/2]);
    panel(shin,.221,.175,.095,[0,-.015,.117],m.shell,.013);
    panel(shin,.161,.11,.024,[0,-.008,.183],m.suit,.006);
    for(let i=0;i<3;i++)box(shin,[.139,.01,.01],[0,-.037+i*.03,.203],m.alloy);
    cylinder(shin,.089,.065,.30,[0,-.191,-.008],m.suit);
    plate(shin,[[-.102,.094],[.102,.094],[.078,-.171],[.044,-.219],[-.055,-.219]],
      .059,[0,-.198,.101],m.armor,.013);
    panel(shin,.049,.22,.025,[0,-.186,.148],m.shell,.005);
    for(const x of [-.102,.102])strut(shin,[x,-.084,-.031],[x*.76,-.342,-.055],.018,.012,m.alloy);
    panel(foot,.274,.116,.405,[0,-.069,.078],m.suit,.014);
    panel(foot,.247,.075,.24,[0,.001,.15],m.shell,.012,[.07,0,0]);
    panel(foot,.195,.038,.104,[0,.031,.215],m.armor,.007);
    for(let i=0;i<3;i++)box(foot,[.285,.02,.032],[0,-.087,-.038+i*.122],m.weapon);
  }
}
export function createEngineerVisual({accentMaterial=null}={}) {
  const m=palette(accentMaterial),root=new T.Group();root.name='E02_Visual';
  root.userData={assetVersion:ENGINEER_ASSET.version,role:'engineer',description:'Original MENDER field engineer; articulated rigid work armor, not a skinned human.'};
  const n={};n.Hips=node(root,'E02_Hips',0,.89,0);n.Chest=node(n.Hips,'E02_Chest',0,.23,0);n.Head=node(n.Chest,'E02_Head',0,.82,0);
  for(const s of [-1,1]) {
    const q=s>0?'R':'L';n['Arm_'+q]=node(n.Chest,'E02_Arm_'+q,s*.535,.50,0);
    n['Forearm_'+q]=node(n['Arm_'+q],'E02_Forearm_'+q,s*.024,-.428,0);
    n['Thigh_'+q]=node(n.Hips,'E02_Thigh_'+q,s*.261,-.015,0);
    n['Shin_'+q]=node(n['Thigh_'+q],'E02_Shin_'+q,0,-.355,0);
    n['Foot_'+q]=node(n['Shin_'+q],'E02_Foot_'+q,0,-.37,0);
  }
  buildBody(n,m);buildHelmet(n.Head,m);buildLimbs(n,m);buildManipulator(n.Chest,m,n);optimize(root);
  const rig=bindEngineerRig(root);poseEngineer(rig);return {root,rig,materials:Object.values(m).filter(x=>x!==accentMaterial)};
}
export function bindEngineerRig(root) {
  const nodes={};for(const name of JOINTS){nodes[name]=root.getObjectByName('E02_'+name);if(!nodes[name])throw Error('Incomplete E02 rig: '+name);}
  return {root,nodes};
}
export function poseEngineer(rig,{time=0,mode='Idle',phase=0,hit=0}={}) {
  const n=rig.nodes,t=time+phase,walk=mode==='Patrol',repair=mode==='Repair',deploy=mode==='Deploy',work=repair||deploy,aim=mode==='Aim';
  const breath=Math.sin(t*TAU/2.8),stride=walk?Math.sin(t*TAU):0,service=Math.sin(t*TAU/2),recoil=Math.max(0,hit);
  n.Hips.position.y=.89+(walk?Math.cos(t*TAU*2)*.007:breath*.003);
  n.Hips.rotation.set(0,walk?stride*.022:0,walk?stride*.01:0);
  n.Chest.rotation.set((work?.085:0)+breath*.006-recoil*.12,repair?-.045:0,recoil*.07);
  n.Head.rotation.set(work?.14+service*.013:.008+breath*.006,repair?-.045:Math.sin(t*.4)*.018,0);
  for(const s of [-1,1]) {
    const q=s>0?'R':'L',angle=stride*s*.265,knee=walk?Math.max(0,-stride*s)*.32:.025;
    n['Thigh_'+q].rotation.set(angle,0,-s*.014);n['Shin_'+q].rotation.set(knee,0,0);n['Foot_'+q].rotation.set(-angle-knee,0,0);
  }
  n.Arm_R.rotation.set(work?-.62+service*.035:aim?-.50:-.35-stride*.025,work?.06:0,-.026);
  n.Forearm_R.rotation.set(repair?-.34:deploy?-.62:aim?-.69:-.77,0,0);
  n.Arm_L.rotation.set(work?-.56+service*.02:aim?-.24:-.08+stride*.14,work?-.13:0,.04);
  n.Forearm_L.rotation.set(repair?-1.02:deploy?-.83:aim?-.48:-.22,0,0);
  n.AuxShoulder.rotation.set(work?-1.25: -2.10,work?-.08:0,work?-.38:-.16);
  n.AuxElbow.rotation.set(work?-.30+service*.045:2.62,0,0);
  n.AuxWrist.rotation.set(work?-.055+service*.055:.05,0,work?service*.10:0);
  n.Claw_L.rotation.set(0,0,work?-.30-service*.025:-.06);
  n.Claw_R.rotation.set(0,0,work?.30+service*.025:.06);
}
export function makeEngineerClips(root) {
  const rig=bindEngineerRig(root),clips=[];
  for(const mode of ENGINEER_CLIPS) {
    const duration={Idle:2.8,Patrol:1,Aim:2.4,Repair:2,Deploy:2.5,Hit:.5}[mode];
    const count=Math.round(duration*30),times=Array.from({length:count+1},(_,i)=>i*duration/count);
    const rotations=new Map(Object.values(rig.nodes).map(n=>[n,[]])),positions=[],tracks=[];
    for(const time of times) {
      poseEngineer(rig,{time:time===duration&&mode!=='Hit'?0:time,mode:mode==='Hit'?'Idle':mode,
        hit:mode==='Hit'?Math.sin(time/duration*Math.PI)*Math.exp(-time*4):0});
      for(const [n,values]of rotations)values.push(...n.quaternion.toArray());positions.push(...rig.nodes.Hips.position.toArray());
    }
    for(const [n,values]of rotations)tracks.push(new T.QuaternionKeyframeTrack(n.name+'.quaternion',times,values));
    tracks.push(new T.VectorKeyframeTrack('E02_Hips.position',times,positions));clips.push(new T.AnimationClip(mode,duration,tracks));
  }
  poseEngineer(rig);return clips;
}
export function cloneEngineerVisual(template,accentMaterial) {
  const root=template.clone(true),owned=new Map();
  root.traverse(o=>{if(!o.isMesh)return;o.geometry=o.geometry.clone();o.castShadow=true;o.receiveShadow=true;o.raycast=noRaycast;o.userData.combatDecoration=true;
    const copy=m=>{if(m.name==='E02_Indicator'&&accentMaterial)return accentMaterial;if(!owned.has(m))owned.set(m,m.clone());return owned.get(m);};
    o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
  });
  return {root,rig:bindEngineerRig(root),materials:[...owned.values()]};
}
export {stats as engineerStats,disposeVisual as disposeEngineerVisual};
