// Original A-03 RIFT / H-12 BASTION assets. Rigid armor rigs, +Z forward, metres.
import {T,material,node,mesh,box,cylinder,plate,panel,strut,loft,bolt,marking,hand,optimize,stats,disposeVisual,noRaycast} from './guard-geometry.js';
export {stats as guardVariantStats,disposeVisual as disposeGuardVariant};
export const GUARD_VARIANTS=Object.freeze({
  assault:Object.freeze({type:'assault',id:'A03',code:'A–03',name:'RIFT',label:'突击守卫',version:'a03-v1',file:'assault-guard-a03.glb',color:0xff8f50,displayScale:1,period:.65}),
  heavy:Object.freeze({type:'heavy',id:'H12',code:'H–12',name:'BASTION',label:'重装守卫',version:'h12-v1',file:'heavy-guard-h12.glb',color:0xffd16c,displayScale:1.12,period:1.25})
});
export const VARIANT_CLIPS=Object.freeze(['Idle','Patrol','Aim','Hit']);
function palette(spec,accent,core){const heavy=spec.type==='heavy';return {
  armor:material(spec.id+'_Armor',heavy?0x71644e:0x354954,.68,.43),
  shell:material(spec.id+'_Shell',heavy?0xb7a387:0xaebdbc,.42,.42),
  alloy:material(spec.id+'_Alloy',0x7b8b8d,.83,.3),
  suit:material(spec.id+'_Suit',0x141e24,.08,.86),
  weapon:material(spec.id+'_Weapon',0x243037,.72,.37),
  accent:accent||material(spec.id+'_Indicator',spec.color,.3,.28,{emissive:spec.color,emissiveIntensity:1}),
  ...(heavy?{core:core||material('H12_CoreLight',0x85ffe0,.3,.24,{emissive:0x26dcae,emissiveIntensity:1.6})}:{})
};}
function skeleton(root,spec){
  const heavy=spec.type==='heavy',id=spec.id,n={};
  n.Hips=node(root,id+'_Hips',0,.88,0);n.Chest=node(n.Hips,id+'_Chest',0,.24,0);n.Head=node(n.Chest,id+'_Head',0,.82,0);
  for(const s of [-1,1]){const q=s>0?'R':'L';
    n['Arm_'+q]=node(n.Chest,id+'_Arm_'+q,s*(heavy?.605:.53),heavy?.55:.50,0);
    n['Forearm_'+q]=node(n['Arm_'+q],id+'_Forearm_'+q,s*.02,-.39,0);
    n['Thigh_'+q]=node(n.Hips,id+'_Thigh_'+q,s*(heavy?.285:.265),-.01,0);
    n['Shin_'+q]=node(n['Thigh_'+q],id+'_Shin_'+q,0,-.355,0);
    n['Foot_'+q]=node(n['Shin_'+q],id+'_Foot_'+q,0,-.375,0);
  }return n;
}
function assaultHead(head,m){
  loft(head,[{y:-.20,x:.20,z:.22},{y:-.09,x:.27,z:.27},{y:.11,x:.275,z:.253,offset:-.02},{y:.21,x:.16,z:.19,offset:-.055}],m.armor);
  // Two angular optics, separate brow and respirator, not the R07 horizontal visor.
  panel(head,.50,.135,.055,[0,.012,.271],m.weapon,.009);
  for(const s of [-1,1]){
    plate(head,[[s*.018,-.003],[s*.205,-.027],[s*.231,.042],[s*.027,.052]],.016,[0,.005,.315],m.accent,.003);
    panel(head,.07,.18,.13,[s*.242,-.043,.04],m.shell,.01,[0,0,-s*.1]);
    cylinder(head,.065,.065,.035,[s*.28,-.05,.008],m.alloy,[0,0,Math.PI/2]);
    panel(head,.08,.13,.1,[s*.19,-.155,.225],m.shell,.008,[0,s*.32,0]);
    bolt(head,s*.21,.12,.229,m.alloy,.011);
  }
  plate(head,[[-.11,.065],[.11,.065],[.065,-.08],[-.065,-.08]],.07,[0,-.12,.248],m.weapon,.008);
  cylinder(head,.036,.036,.028,[-.052,-.126,.296],m.alloy,[Math.PI/2,0,0],8);
  cylinder(head,.036,.036,.028,[.052,-.126,.296],m.alloy,[Math.PI/2,0,0],8);
  panel(head,.05,.075,.3,[0,.18,-.018],m.shell,.006,[-.13,0,0]);
  panel(head,.16,.09,.045,[0,-.03,-.28],m.weapon,.006);
  box(head,[.09,.013,.012],[0,-.03,-.307],m.accent);
}
function compactWeapon(fore,m){
  const gun=node(fore,'A03_CompactWeapon',0,-.337,.165);gun.rotation.x=1.17;
  panel(gun,.16,.15,.30,[0,.065,.04],m.weapon,.01);panel(gun,.171,.065,.205,[0,.134,.025],m.armor,.005);
  panel(gun,.078,.20,.095,[0,-.06,-.022],m.suit,.006,[-.16,0,0]);
  panel(gun,.09,.19,.14,[0,-.075,.12],m.weapon,.007,[.12,0,0]);box(gun,[.11,.027,.14],[0,-.18,.13],m.alloy);
  strut(gun,[-.048,.04,-.12],[-.048,.026,-.28],.018,.018,m.alloy);
  strut(gun,[.048,.04,-.12],[.048,.026,-.28],.018,.018,m.alloy);
  panel(gun,.11,.12,.05,[0,.04,-.29],m.suit,.006);
  cylinder(gun,.029,.029,.20,[0,.084,.267],m.alloy,[Math.PI/2,0,0],10);
  cylinder(gun,.049,.045,.09,[0,.084,.38],m.weapon,[Math.PI/2,0,0],8);
  cylinder(gun,.026,.026,.006,[0,.084,.429],m.suit,[Math.PI/2,0,0],8);
  panel(gun,.058,.05,.08,[0,.188,-.035],m.alloy,.003);box(gun,[.021,.014,.005],[0,.188,.009],m.accent);
  box(gun,[.01,.025,.096],[.088,.10,.093],m.accent);
}
function assaultBody(n,m){
  panel(n.Hips,.55,.19,.34,[0,.048,0],m.suit,.019);panel(n.Hips,.61,.073,.37,[0,.145,0],m.armor,.009);
  panel(n.Hips,.115,.06,.025,[0,.15,.204],m.alloy,.004);
  plate(n.Hips,[[-.12,.06],[.12,.06],[.08,-.12],[-.08,-.12]],.07,[0,-.019,.19],m.armor,.009);
  panel(n.Chest,.58,.57,.37,[0,.235,0],m.suit,.019);
  for(const s of [-1,1]){
    plate(n.Chest,[[s*.025,-.095],[s*.30,-.045],[s*.355,.15],[s*.255,.29],[s*.025,.22]],.085,[0,.276,.224],m.armor,.014,[-.08,0,0]);
    panel(n.Chest,.077,.19,.045,[s*.232,.354,.292],m.shell,.007,[0,0,-s*.27]);
    plate(n.Chest,[[s*.035,.028],[s*.246,-.024],[s*.26,.018],[s*.04,.065]],.018,[0,.32,.284],m.accent,.003);
    for(let j=0;j<4;j++)panel(n.Chest,.088,.028,.28,[s*.294,.008+j*.058,-.005],m.alloy,.004,[0,0,s*.12]);
    strut(n.Chest,[s*.2,-.105,-.09],[s*.31,.40,-.125],.02,.023,m.armor);
    panel(n.Hips,.17,.18,.10,[s*.234,.04,.19],m.weapon,.01,[0,0,-s*.1]);
    box(n.Hips,[.094,.019,.015],[s*.234,.076,.25],m.shell);
  }
  for(let j=0;j<3;j++)panel(n.Chest,.34+j*.018,.054,.047,[0,-.08+j*.07,.228],m.armor,.007);
  marking(n.Chest,'03',[.073,.224,.286],m.shell,.009);
  cylinder(n.Chest,.18,.225,.065,[0,.57,0],m.armor,[0,0,0],10);
  cylinder(n.Chest,.115,.13,.17,[0,.60,0],m.suit,[0,0,0],10);
  // Flat, light powerpack and two separated exhaust outlets; no tall antenna.
  panel(n.Chest,.40,.43,.18,[0,.255,-.287],m.armor,.015);
  panel(n.Chest,.17,.32,.02,[0,.26,-.39],m.weapon,.006);
  for(const s of [-1,1]){
    cylinder(n.Chest,.053,.061,.20,[s*.155,.435,-.307],m.alloy);
    box(n.Chest,[.048,.04,.014],[s*.12,.15,-.398],m.accent);
  }
}
function assaultLimbs(n,m){
  for(const s of [-1,1]){const q=s>0?'R':'L',arm=n['Arm_'+q],fore=n['Forearm_'+q],thigh=n['Thigh_'+q],shin=n['Shin_'+q],foot=n['Foot_'+q];
    cylinder(arm,.092,.092,.17,[s*.045,-.025,0],m.suit,[0,0,Math.PI/2]);
    // Asymmetrical shoulder shells: one swept pauldron, one lighter split cap.
    plate(arm,[[-.125,-.065],[.125,-.065],[.15,.10],[.045,.168],[-.11,.10]],s>0?.27:.21,[s*.055,.04,.023],m.armor,.016,[0,0,-s*.23]);
    panel(arm,.12,.07,.029,[s*.055,.077,.186],s>0?m.accent:m.shell,.004,[0,0,-s*.23]);
    cylinder(arm,.07,.061,.30,[0,-.225,0],m.suit);
    panel(arm,.14,.225,.085,[0,-.218,.068],m.armor,.012,[0,0,-s*.055]);
    strut(arm,[s*.06,-.08,-.048],[s*.065,-.35,-.048],.014,.02,m.alloy);
    cylinder(fore,.062,.062,.166,[0,0,0],m.alloy,[0,0,Math.PI/2]);
    cylinder(fore,.039,.039,.18,[0,0,0],m.weapon,[0,0,Math.PI/2],8);
    cylinder(fore,.060,.067,.26,[0,-.175,.015],m.suit);
    plate(fore,[[-.077,.08],[.077,.08],[.083,-.055],[.052,-.20],[-.052,-.20]],.085,[0,-.12,.077],m.armor,.01);
    panel(fore,.055,.18,.018,[0,-.14,.134],m.shell,.004);
    cylinder(fore,.065,.065,.041,[0,-.302,.028],m.alloy);hand(fore,-.36,.048,m,s);
    if(s>0)compactWeapon(fore,m);
    else{panel(fore,.125,.083,.021,[0,-.088,.145],m.weapon,.005);box(fore,[.063,.013,.004],[0,-.088,.16],m.accent);}
    cylinder(thigh,.08,.091,.275,[0,-.145,0],m.suit);
    plate(thigh,[[-.095,.10],[.095,.10],[.105,-.027],[.066,-.21],[-.066,-.21],[-.10,-.027]],.092,[0,-.123,.10],m.armor,.013);
    panel(thigh,.115,.075,.018,[0,-.056,.169],m.shell,.005);
    strut(thigh,[s*.095,-.034,-.005],[s*.073,-.297,-.028],.016,.021,m.alloy);
    cylinder(shin,.074,.074,.212,[0,0,0],m.weapon,[0,0,Math.PI/2]);
    plate(shin,[[-.086,.072],[.086,.072],[.12,-.02],[0,-.118],[-.12,-.02]],.09,[0,-.015,.102],m.shell,.009);
    box(shin,[.064,.018,.013],[0,-.005,.16],m.accent);
    cylinder(shin,.077,.057,.28,[0,-.212,-.005],m.suit);
    plate(shin,[[-.081,.1],[.075,.1],[.07,-.18],[0,-.225],[-.045,-.19]],.043,[0,-.205,.087],m.armor,.009);
    strut(shin,[s*.07,-.068,-.038],[s*.044,-.34,-.034],.015,.01,m.alloy);
    panel(foot,.257,.105,.37,[0,-.062,.072],m.suit,.013);panel(foot,.208,.068,.245,[0,.005,.108],m.armor,.012,[.055,0,0]);
    box(foot,[.21,.019,.035],[0,.027,.194],m.shell);
    for(let j=0;j<3;j++)box(foot,[.264,.018,.025],[0,-.084,-.035+j*.12],m.weapon);
  }
}
function heavyHead(head,m){
  loft(head,[{y:-.205,x:.235,z:.23},{y:-.08,x:.30,z:.282},{y:.11,x:.315,z:.275},{y:.23,x:.22,z:.195,offset:-.025}],m.armor);
  panel(head,.60,.128,.17,[0,.127,.255],m.shell,.021,[-.10,0,0]);
  panel(head,.36,.215,.065,[0,-.038,.282],m.weapon,.017);
  // Recessed cyclopean optical assembly; visibly distinct from both other helmets.
  cylinder(head,.089,.089,.07,[0,.023,.332],m.alloy,[Math.PI/2,0,0],14);
  cylinder(head,.064,.064,.081,[0,.023,.339],m.accent,[Math.PI/2,0,0],14);
  cylinder(head,.031,.031,.086,[0,.023,.344],m.weapon,[Math.PI/2,0,0],10);
  panel(head,.27,.085,.075,[0,-.154,.273],m.shell,.009,[.22,0,0]);
  for(const s of [-1,1]){
    panel(head,.106,.206,.12,[s*.259,-.055,.064],m.shell,.012);
    cylinder(head,.08,.08,.055,[s*.314,-.034,-.031],m.weapon,[0,0,Math.PI/2]);
    cylinder(head,.039,.039,.068,[s*.318,-.034,-.031],m.alloy,[0,0,Math.PI/2],8);
    panel(head,.065,.075,.022,[s*.125,-.146,.32],m.weapon,.003);
  }
  panel(head,.21,.06,.31,[0,.236,-.028],m.armor,.01);
  marking(head,'12',[-.044,.199,.229],m.weapon,.009);
}
function heavyCannon(fore,m){
  const gun=node(fore,'H12_TripleEmitter',0,-.30,.158);gun.rotation.x=.80;
  panel(gun,.29,.26,.32,[0,.017,.035],m.weapon,.018);
  panel(gun,.305,.14,.225,[0,.077,.036],m.armor,.012);
  cylinder(gun,.139,.147,.17,[0,.02,.261],m.alloy,[Math.PI/2,0,0],12);
  cylinder(gun,.117,.125,.18,[0,.02,.265],m.weapon,[Math.PI/2,0,0],12);
  for(const [x,y]of [[-.053,.047],[.053,.047],[0,-.047]]){
    cylinder(gun,.036,.041,.23,[x,y+.02,.408],m.alloy,[Math.PI/2,0,0],8);
    cylinder(gun,.045,.041,.071,[x,y+.02,.528],m.weapon,[Math.PI/2,0,0],8);
    cylinder(gun,.025,.025,.008,[x,y+.02,.568],m.suit,[Math.PI/2,0,0],8);
  }
  panel(gun,.15,.31,.18,[-.12,-.103,.03],m.armor,.014,[0,0,-.17]);
  for(let j=0;j<4;j++)box(gun,[.016,.13,.016],[.155,.0,-.07+j*.055],m.alloy);
  box(gun,[.018,.027,.18],[.169,.088,.051],m.accent);
  panel(gun,.1,.07,.13,[0,.175,-.004],m.weapon,.006);
}
function heavyBody(root,n,m){
  panel(n.Hips,.76,.20,.43,[0,.04,0],m.suit,.023);panel(n.Hips,.80,.13,.48,[0,.14,0],m.armor,.02);
  panel(n.Hips,.23,.108,.04,[0,.143,.266],m.alloy,.01);
  plate(n.Hips,[[-.16,.084],[.16,.084],[.125,-.145],[-.125,-.145]],.12,[0,-.031,.235],m.armor,.014);
  panel(n.Chest,.94,.59,.60,[0,.235,-.006],m.suit,.025);
  // Shield-like chest plates are worn armor, not a handheld immunity shield.
  plate(n.Chest,[[-.385,-.39],[.385,-.39],[.48,-.22],[.50,.18],[.34,.36],[-.34,.36],[-.50,.18],[-.48,-.22]],
    .13,[0,.131,.435],m.armor,.025);
  for(const s of [-1,1]){
    plate(n.Chest,[[s*.035,-.08],[s*.38,-.05],[s*.415,.10],[s*.30,.22],[s*.035,.20]],.075,[0,.303,.514],m.shell,.014,[-.06,0,0]);
    panel(n.Chest,.058,.29,.061,[s*.431,.097,.532],m.weapon,.008,[0,0,-s*.08]);
    bolt(n.Chest,s*.369,.17,.542,m.alloy,.019);bolt(n.Chest,s*.328,-.12,.533,m.alloy,.016);
    panel(n.Hips,.22,.245,.12,[s*.31,.035,.19],m.armor,.02,[0,0,-s*.11]);
    box(n.Hips,[.127,.035,.018],[s*.31,.079,.267],m.shell);
    // Collar/shoulder frame wraps around the head but leaves the rear weak point clear.
    panel(n.Chest,.17,.30,.52,[s*.398,.561,-.01],m.armor,.02,[0,0,-s*.13]);
    panel(n.Chest,.084,.13,.05,[s*.333,.577,.304],m.accent,.007);
  }
  for(let j=0;j<3;j++)panel(n.Chest,.59-j*.06,.087,.075,[0,-.17+j*.10,.509],j===1?m.shell:m.armor,.011);
  panel(n.Chest,.075,.37,.043,[0,.297,.56],m.weapon,.006);
  box(n.Chest,[.22,.022,.018],[0,.47,.548],m.accent);
  marking(n.Chest,'12',[.158,.347,.565],m.weapon,.010);
  cylinder(n.Chest,.205,.25,.09,[0,.59,0],m.armor,[0,0,0],12);cylinder(n.Chest,.13,.14,.12,[0,.655,0],m.suit);
  for(const s of [-1,1]){
    panel(n.Chest,.23,.57,.19,[s*.347,.21,-.387],m.armor,.018);
    cylinder(n.Chest,.075,.075,.39,[s*.43,.286,-.393],m.alloy,[0,0,0],10);
    panel(n.Chest,.16,.18,.023,[s*.347,.346,-.50],m.shell,.006);
  }
  // Static socket is intentionally NOT under the breathing torso joint: its centre
  // remains exactly (0,1.28,-.6), the original heavy enemy's authoritative core.
  const core=node(root,'H12_CoreSocket',0,1.28,-.6);
  mesh(core,new T.IcosahedronGeometry(.21,1),m.core);
  mesh(core,new T.TorusGeometry(.258,.045,6,20),m.weapon,[0,0,-.026]);
  mesh(core,new T.TorusGeometry(.297,.012,5,24),m.alloy,[0,0,-.018]);
  for(const s of [-1,1]){
    panel(core,.065,.46,.095,[s*.32,0,.01],m.armor,.008);
    bolt(core,s*.25,.18,-.041,m.alloy,.018);bolt(core,s*.25,-.18,-.041,m.alloy,.018);
  }
  panel(core,.44,.083,.11,[0,.354,.06],m.armor,.01);panel(core,.44,.063,.11,[0,-.317,.07],m.armor,.01);
}
function heavyLimbs(n,m){
  for(const s of [-1,1]){const q=s>0?'R':'L',arm=n['Arm_'+q],fore=n['Forearm_'+q],thigh=n['Thigh_'+q],shin=n['Shin_'+q],foot=n['Foot_'+q];
    cylinder(arm,.14,.14,.20,[s*.036,-.035,0],m.suit,[0,0,Math.PI/2]);
    plate(arm,[[-.19,-.12],[.19,-.12],[.235,.045],[.145,.225],[-.16,.225],[-.245,.06]],.49,[s*.056,.075,0],m.armor,.023,[0,0,-s*.13]);
    plate(arm,[[-.155,-.055],[.15,-.055],[.18,.06],[.115,.158],[-.12,.158],[-.185,.056]],.034,[s*.056,.101,.281],m.shell,.010,[0,0,-s*.13]);
    panel(arm,.16,.027,.024,[s*.065,.169,.318],m.accent,.003,[0,0,-s*.13]);
    cylinder(arm,.105,.096,.30,[0,-.244,0],m.suit);
    panel(arm,.225,.257,.14,[0,-.232,.095],m.armor,.02);panel(arm,.10,.126,.023,[0,-.222,.18],m.alloy,.006);
    cylinder(fore,.10,.10,.26,[0,0,0],m.weapon,[0,0,Math.PI/2]);cylinder(fore,.057,.057,.28,[0,0,0],m.alloy,[0,0,Math.PI/2],10);
    cylinder(fore,.088,.10,.245,[0,-.17,.025],m.suit);
    panel(fore,.265,.29,.19,[0,-.18,.064],m.armor,.022,[-.08,0,0]);
    for(let j=0;j<3;j++)panel(fore,.214,.067,.029,[0,-.082-j*.077,.188],j===0?m.shell:m.armor,.006);
    cylinder(fore,.091,.091,.048,[0,-.336,.03],m.alloy);hand(fore,-.389,.06,m,s);
    if(s>0)heavyCannon(fore,m);
    cylinder(thigh,.116,.127,.28,[0,-.167,0],m.suit);
    plate(thigh,[[-.138,.10],[.138,.10],[.15,-.06],[.106,-.215],[-.106,-.215]],.20,[0,-.12,.09],m.armor,.018);
    panel(thigh,.17,.14,.025,[0,-.085,.214],m.shell,.008);
    cylinder(shin,.105,.105,.30,[0,0,0],m.weapon,[0,0,Math.PI/2]);
    panel(shin,.30,.218,.17,[0,-.036,.098],m.armor,.017);panel(shin,.22,.082,.025,[0,.005,.201],m.shell,.006);
    bolt(shin,-.092,-.052,.194,m.alloy,.016);bolt(shin,.092,-.052,.194,m.alloy,.016);
    cylinder(shin,.12,.098,.30,[0,-.21,0],m.suit);
    plate(shin,[[-.139,.09],[.139,.09],[.117,-.20],[-.113,-.20]],.084,[0,-.223,.11],m.armor,.017);
    panel(shin,.081,.25,.025,[0,-.212,.175],m.shell,.006);
    for(const x of [-.14,.14])strut(shin,[x,-.084,-.062],[x*.78,-.347,-.079],.028,.019,m.alloy);
    panel(foot,.338,.12,.44,[0,-.063,.075],m.suit,.016);panel(foot,.299,.104,.278,[0,.019,.13],m.armor,.016);
    panel(foot,.223,.03,.126,[0,.074,.18],m.shell,.006);
    for(let j=0;j<3;j++)box(foot,[.347,.028,.039],[0,-.081,-.049+j*.136],m.weapon);
  }
}
export function createGuardVariant(type,{accentMaterial=null,coreMaterial=null}={}){
  const spec=GUARD_VARIANTS[type];if(!spec)throw Error('Unsupported guard variant: '+type);
  const root=new T.Group();root.name=spec.id+'_Visual';root.userData.assetVersion=spec.version;root.userData.enemyType=type;
  root.userData.description=spec.name+' original rigid armor; visual-only asset, +Z forward.';
  const m=palette(spec,accentMaterial,coreMaterial),n=skeleton(root,spec);
  if(type==='assault'){assaultHead(n.Head,m);assaultBody(n,m);assaultLimbs(n,m);}
  else{heavyHead(n.Head,m);heavyBody(root,n,m);heavyLimbs(n,m);}
  optimize(root);const rig=bindGuardVariant(root,type);poseGuardVariant(rig,{time:0});
  return {root,rig,materials:Object.values(m).filter(x=>x!==accentMaterial&&x!==coreMaterial)};
}
export function bindGuardVariant(root,type){
  const spec=GUARD_VARIANTS[type];if(!spec)throw Error('Unsupported variant rig');const n={};
  for(const name of ['Hips','Chest','Head','Arm_R','Arm_L','Forearm_R','Forearm_L','Thigh_R','Thigh_L','Shin_R','Shin_L','Foot_R','Foot_L']){
    n[name]=root.getObjectByName(spec.id+'_'+name);if(!n[name])throw Error('Incomplete '+spec.id+' rig: '+name);
  }return {root,n,type};
}
export function poseGuardVariant(rig,{time=0,mode='Idle',phase=0,hit=0}={}){
  const {n,type}=rig,heavy=type==='heavy',walking=mode==='Patrol',aiming=mode==='Aim',t=time+phase;
  const stride=walking?Math.sin(t*Math.PI*2/GUARD_VARIANTS[type].period):0,breath=Math.sin(t*Math.PI*2/2.4),recoil=Math.max(0,hit);
  n.Hips.position.y=.88+(walking?Math.cos(t*Math.PI*4/GUARD_VARIANTS[type].period)*(heavy?.004:.007):breath*.002);
  n.Hips.rotation.set(0,stride*(heavy?.016:.034),stride*(heavy?.01:.019));
  n.Chest.rotation.set((heavy?-.004:-.027)+breath*.004-recoil*(heavy?.055:.11),aiming?-.025:stride*-.015,recoil*.035);
  n.Head.rotation.set(breath*.004+recoil*.07,aiming?0:Math.sin(t*.5)*.018,0);
  for(const s of [-1,1]){const q=s>0?'R':'L',step=stride*s,hip=step*(heavy?.19:.40),knee=walking?Math.max(0,-step)*(heavy?.23:.43):.018;
    n['Thigh_'+q].rotation.set(hip,0,-s*.009);n['Shin_'+q].rotation.set(knee,0,0);n['Foot_'+q].rotation.set(-hip-knee,0,0);}
  if(heavy){n.Arm_R.rotation.set(aiming?-.35:-.28-stride*.012,0,-.014);n.Forearm_R.rotation.set(aiming?-.45-recoil*.06:-.52,0,0);
    n.Arm_L.rotation.set(-.12+stride*.07,0,.024);n.Forearm_L.rotation.set(-.28,0,0);}
  else{n.Arm_R.rotation.set(aiming?-.59:-.42-stride*.028,0,-.013);n.Forearm_R.rotation.set(aiming?-.61-recoil*.10:-.75,0,0);
    n.Arm_L.rotation.set(aiming?-.46:-.12+stride*.23,aiming?-.12:0,.04);n.Forearm_L.rotation.set(aiming?-.65:-.17,0,0);}
}
export function makeGuardVariantClips(root,type){
  const rig=bindGuardVariant(root,type),clips=[];
  for(const name of VARIANT_CLIPS){const duration=name==='Patrol'?GUARD_VARIANTS[type].period:name==='Hit'?.5:2.4;
    const count=Math.round(duration*30),times=Array.from({length:count+1},(_,i)=>i/count*duration),rotations=new Map(Object.values(rig.n).map(o=>[o,[]])),positions=[];
    for(const time of times){poseGuardVariant(rig,{time:time===duration&&name!=='Hit'?0:time,mode:name==='Hit'?'Idle':name,
      hit:name==='Hit'?Math.sin(time/duration*Math.PI)*Math.exp(-time*4):0});
      for(const [o,values]of rotations)values.push(...o.quaternion.toArray());positions.push(...rig.n.Hips.position.toArray());}
    const tracks=[...rotations].map(([o,values])=>new T.QuaternionKeyframeTrack(o.name+'.quaternion',times,values));
    tracks.push(new T.VectorKeyframeTrack(GUARD_VARIANTS[type].id+'_Hips.position',times,positions));clips.push(new T.AnimationClip(name,duration,tracks));
  }poseGuardVariant(rig,{});return clips;
}
export function cloneGuardVariant(template,type,{accentMaterial,coreMaterial}={}){
  const root=template.clone(true),materials=new Map(),id=GUARD_VARIANTS[type].id;
  const copy=m=>{if(m.name===id+'_Indicator'&&accentMaterial)return accentMaterial;if(m.name==='H12_CoreLight'&&coreMaterial)return coreMaterial;
    if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};
  root.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
    o.castShadow=true;o.receiveShadow=true;o.raycast=noRaycast;o.userData.combatDecoration=true;}});
  return {root,rig:bindGuardVariant(root,type),materials:[...materials.values()]};
}
