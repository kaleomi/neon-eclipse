// Nine remaining ENEMY_TYPES: eight ordinary units plus WARDEN.
import {T,node,mesh,box,cylinder,plate,panel,strut,loft,bolt,hand} from './guard-geometry.js';
import {artKit,finishArt,resetArt,artClips} from './art-kit.js';
const spec=(type,id,name,color,colors,clips,more={})=>({type,id,name,color,colors,clips,version:id.toLowerCase()+'-v1',file:type+'-'+id.toLowerCase()+'.glb',...more});
export const ROSTER_UNITS=Object.freeze({
 stalker:spec('stalker','L05','VEIL · 潜行者',0x7fd7c8,[0x293f44,0x5c7979,0x92aca7],['Idle','Patrol','Aim','Cloak','Hit']),
 rusher:spec('rusher','R11','FUSE · 自爆奔袭者',0xff3b3b,[0x813f38,0xc6a688,0x92999a],['Idle','Sprint','Armed','Hit']),
 harborElite:spec('harborElite','H18','BREAKWATER · 港务镇压者',0x8fe3ec,[0x405761,0xc7a85f,0x95bcc0],['Idle','Patrol','Aim','Vent','Hit'],{coreColor:0xe4aa55}),
 hound:spec('hound','K06','TRACKER · 猎犬机',0xff5a5a,[0x4b5159,0xbdc1b6,0x8fa2a9],['Idle','Run','Pounce','Hit']),
 artilleryMech:spec('artilleryMech','M20','SIEGEBREAK · 重炮机甲',0xff8a3d,[0x59626b,0xc2a06c,0x9bacb6],['Idle','Patrol','Aim','Vent','Hit'],{coreColor:0xffb060}),
 drone:spec('drone','D08','VECTOR POD · 普通无人机',0xffa050,[0x455f66,0xc2b58e,0x91a9af],['Hover','Advance','Aim','Hit']),
 swarmDrone:spec('swarmDrone','D02','MOTE · 编队无人机',0x63cfff,[0x284c62,0x88b8c5,0xb1ced4],['Hover','Formation','Aim','Hit']),
 sentry:spec('sentry','T03','WATCHTOWER · 哨兵炮塔',0x6affb6,[0x405d58,0xadbf9f,0x8faea7],['Scan','Aim','Disabled','Hit']),
 warden:spec('warden','W01','THE WARDEN · 典狱长',0xff668d,[0x35434f,0xcac2a7,0x9c9fac],['Idle','Patrol','Aim','Overload','Hit'],{coreColor:0xff648c})
});
function rim(p,r,z,m,thick=.035){const q=mesh(p,new T.TorusGeometry(r,thick,6,28),m,[0,0,z]);return q;}
function vent(p,[x,y,z],w,h,m,vertical=false){for(let i=0;i<4;i++)box(p,vertical?[w/8,h,.013]:[w,h/9,.013],[x+(vertical?(i-1.5)*w/4:0),y+(!vertical?(i-1.5)*h/4:0),z],m);}
function cell(p,x,y,z,m,color){cylinder(p,.07,.07,.28,[x,y,z],m);cylinder(p,.074,.074,.035,[x,y+.15,z],color);}
function core(a,position,r=.21,detail=1){const g=a.joint('Core',a.root,position);mesh(g,new T.IcosahedronGeometry(r,detail),a.m.Core);return g;}
function humanoid(a,{bulk=1,legs=true}={}){
 const {joint:j,root,m}=a,n=a.joints;const hips=j('Hips',root,[0,.90,0]),chest=j('Chest',hips,[0,.225,0]);j('Head',chest,[0,.815,0]);
 panel(hips,.59*bulk,.21,.4,[0,.04,0],m.Dark,.02);panel(hips,.67*bulk,.075,.43,[0,.15,0],m.Armor,.009);panel(hips,.14,.065,.033,[0,.15,.24],m.Metal,.006);
 panel(chest,.66*bulk,.58,.43,[0,.25,0],m.Dark,.024);
 for(const s of [-1,1]){
  plate(chest,[[s*.03,-.09],[s*.29*bulk,-.075],[s*.35*bulk,.14],[s*.245*bulk,.28],[s*.03,.20]],.095,[0,.29,.25],m.Armor,.017);
  panel(chest,.095,.30,.039,[s*.245*bulk,.28,.32],m.Shell,.008,[0,0,-s*.16]);
  const q=s>0?'R':'L',arm=j('Arm_'+q,chest,[s*.55*bulk,.50,0]),fore=j('Fore_'+q,arm,[0,-.40,0]);
  cylinder(arm,.105,.105,.17,[s*.04,-.02,0],m.Dark,[0,0,Math.PI/2]);panel(arm,.30,.18,.40,[s*.04,.04,0],m.Armor,.02,[0,0,-s*.12]);
  cylinder(arm,.074,.073,.31,[0,-.215,0],m.Dark);panel(arm,.16,.21,.08,[0,-.23,.085],m.Armor,.01);
  cylinder(fore,.073,.073,.20,[0,0,0],m.Metal,[0,0,Math.PI/2]);cylinder(fore,.066,.077,.26,[0,-.18,0],m.Dark);
  panel(fore,.16,.24,.095,[0,-.16,.09],m.Armor,.012);panel(fore,.095,.13,.019,[0,-.12,.149],m.Shell,.005);
  hand(fore,-.35,.03,{suit:m.Dark,armor:m.Armor},s);
  if(legs){const thigh=j('Thigh_'+q,hips,[s*.27,-.025,0]),shin=j('Shin_'+q,thigh,[0,-.355,0]),foot=j('Foot_'+q,shin,[0,-.37,0]);
   cylinder(thigh,.10,.10,.30,[0,-.14,0],m.Dark);panel(thigh,.195,.26,.11,[0,-.12,.115],m.Armor,.014);
   strut(thigh,[s*.095,-.025,-.035],[s*.08,-.30,-.035],.017,.024,m.Metal);
   cylinder(shin,.081,.081,.23,[0,0,0],m.Dark,[0,0,Math.PI/2]);panel(shin,.22,.17,.10,[0,0,.12],m.Shell,.012);
   cylinder(shin,.08,.06,.29,[0,-.20,0],m.Dark);panel(shin,.16,.28,.065,[0,-.21,.1],m.Armor,.01);
   strut(shin,[s*.085,-.08,-.035],[s*.07,-.34,-.035],.018,.012,m.Metal);
   panel(foot,.27,.12,.40,[0,-.073,.08],m.Dark,.014);panel(foot,.23,.069,.23,[0,0,.15],m.Armor,.01);box(foot,[.15,.016,.07],[0,.033,.21],m.Shell);
  }
 }
 for(let i=0;i<3;i++)panel(chest,.35,.045,.035,[0,-.08+i*.071,.235],m.Metal,.006);
 cylinder(chest,.12,.14,.17,[0,.62,0],m.Dark);
 return n;
}
function helm(a,kind='visor'){
 const {m}=a,h=a.joints.Head;
 loft(h,[{y:-.2,x:.22,z:.22},{y:-.07,x:.29,z:.27},{y:.11,x:.29,z:.26},{y:.24,x:.215,z:.18}],m.Armor);
 panel(h,.49,.11,.12,[0,.15,.235],m.Shell,.015,[-.12,0,0]);panel(h,.43,.145,.048,[0,.015,.282],m.Dark,.01);
 if(kind==='cyclops'){cylinder(h,.095,.095,.067,[0,.023,.317],m.Metal,[Math.PI/2,0,0],12);cylinder(h,.07,.07,.08,[0,.023,.333],m.Signal,[Math.PI/2,0,0],12);}
 else if(kind==='slits'){for(const s of [-1,1])plate(h,[[s*.03,-.025],[s*.19,.039],[s*.18,.066],[s*.05,.025]],.012,[0,.015,.315],m.Signal,.003);}
 else panel(h,.36,.038,.015,[0,.033,.313],m.Signal,.003);
 plate(h,[[-.11,.03],[.11,.03],[.06,-.13],[-.07,-.13]],.063,[0,-.11,.255],m.Shell,.009);vent(h,[0,-.13,.292],.12,.08,m.Dark);
 for(const s of [-1,1]){panel(h,.073,.17,.13,[s*.27,-.05,.05],m.Armor,.012);cylinder(h,.063,.063,.05,[s*.30,-.03,-.02],m.Metal,[0,0,Math.PI/2],10);}
}
function gun(parent,m,{long=false,double=false}={}){
 const g=node(parent,parent.name+'_Weapon',0,-.34,.17);g.rotation.x=1.12;
 panel(g,.15,.15,long?.43:.28,[0,.07,.035],m.Dark,.012);panel(g,.16,.054,.24,[0,.15,.025],m.Armor,.007);
 panel(g,.075,.17,.09,[0,-.06,-.018],m.Dark,.006);panel(g,.09,.18,.13,[0,-.06,.12],m.Metal,.007,[.1,0,0]);
 for(const x of double?[-.053,.053]:[0]){cylinder(g,.03,.034,long?.45:.24,[x,.08,long?.40:.29],m.Metal,[Math.PI/2,0,0]);cylinder(g,.045,.047,.07,[x,.08,long?.64:.43],m.Dark,[Math.PI/2,0,0]);}
 box(g,[.021,.023,.19],[.087,.095,.04],m.Signal);return g;
}
function specialist(a){const {type}=a.spec,{m,joint:j}=a,n=humanoid(a,{bulk:type==='harborElite'?1.12:type==='warden'?1.05:1});helm(a,type==='rusher'?'cyclops':'slits');
 if(type==='stalker'){
  for(const s of [-1,1]){plate(n.Chest,[[-.07,-.25],[.07,-.25],[.10,.18],[0,.39],[-.085,.19]],.20,[s*.36,.39,-.25],m.Armor,.014,[0,0,-s*.16]);
   const fin=j('Fin_'+(s>0?'R':'L'),n.Chest,[s*.38,.22,-.29]);plate(fin,[[-.06,.25],[.075,.15],[.13,-.44],[-.026,-.51]],.13,[0,0,0],m.Armor,.012,[0,0,s*.13]);
   panel(n.Head,.055,.37,.18,[s*.15,.20,-.03],m.Dark,.009,[0,0,-s*.06]);}
  panel(n.Chest,.33,.41,.16,[0,.28,-.29],m.Dark,.014);vent(n.Chest,[0,.28,-.383],.24,.23,m.Metal);gun(n.Fore_R,m);
 }else if(type==='rusher'){
  panel(n.Chest,.49,.57,.28,[0,.20,-.39],m.Dark,.02);
  const payload=j('Payload',n.Chest,[0,.33,-.54]);cylinder(payload,.22,.23,.58,[0,0,0],m.Armor,[0,0,0],12);
  mesh(payload,new T.IcosahedronGeometry(.20,1),m.Signal,[0,.34,0]);
  for(const s of [-1,1]){cell(n.Chest,s*.29,.23,-.37,m.Metal,m.Signal);panel(n.Chest,.09,.43,.042,[s*.24,.31,.31],m.Shell,.006,[0,0,-s*.2]);}
  for(let i=0;i<4;i++)box(payload,[.07,.018,.014],[-.11+i*.07,.08,-.238],m.Signal);
  for(const s of [-1,1]){panel(n.Fore_R,.09,.21,.035,[s*.08,-.14,.105],m.Metal,.006);panel(n.Hips,.14,.18,.13,[s*.30,.02,.19],m.Dark,.009);}
 }else if(type==='harborElite'){
  gun(n.Fore_L,m,{double:true});gun(n.Fore_R,m,{double:true});
  for(const s of [-1,1]){panel(n.Chest,.22,.48,.24,[s*.39,.28,-.29],m.Shell,.015);cell(n.Chest,s*.29,.35,-.45,m.Metal,m.Signal);}
  const c=core(a,[0,1.28,.63]);rim(c,.27,-.055,m.Dark,.04);rim(c,.315,-.08,m.Metal,.026);
  for(const s of [-1,1]){const p=j('Vent_'+(s>0?'R':'L'),a.root,[s*.31,1.28,.57]);panel(p,.145,.43,.10,[0,0,0],m.Shell,.01);box(p,[.043,.18,.016],[0,0,.062],m.Dark);}
  panel(n.Head,.12,.14,.15,[0,.30,0],m.Signal,.012);panel(n.Chest,.55,.45,.17,[0,.29,-.42],m.Armor,.016);vent(n.Chest,[0,.3,-.52],.4,.23,m.Dark);
 }else{
  gun(n.Fore_R,m,{long:true,double:true});gun(n.Fore_L,m,{double:true});
  for(const s of [-1,1]){const p=j('Pylon_'+(s>0?'R':'L'),a.root,[s*.8,1.85,0]);panel(p,.28,.86,.38,[0,.12,0],m.Dark,.023);panel(p,.20,.46,.07,[0,.14,.24],m.Shell,.01);box(p,[.10,.058,.015],[0,.33,.288],m.Signal);
   panel(n.Chest,.11,.40,.11,[s*.34,.34,.28],m.Shell,.01);}
  const crown=j('Crown',a.root,[0,2.18,0]);mesh(crown,new T.TorusGeometry(.44,.042,6,32),m.Signal,[0,0,0],[Math.PI/2,0,0]);
  for(let i=0;i<6;i++){const t=i*Math.PI/3;panel(crown,.095,.16,.085,[Math.sin(t)*.44,.08,Math.cos(t)*.44],m.Shell,.008,[0,t,0]);}
  const c=core(a,[0,1.32,.54],.22,0);rim(c,.30,-.05,m.Metal,.035);rim(c,.36,-.07,m.Dark,.04);
  for(const s of [-1,1]){const t=j('Tabard_'+(s>0?'R':'L'),n.Hips,[s*.17,.02,.25]);plate(t,[[-.12,.02],[.12,.02],[.15,-.37],[0,-.49],[-.1,-.42]],.05,[0,0,0],m.Armor,.012);box(t,[.03,.3,.016],[0,-.2,.04],m.Shell);}
 }
}
function quadruped(a){const {m,joint:j,root}=a,b=j('Body',root,[0,.75,0]),h=j('Head',root,[0,.9,.75]);
 panel(b,.79,.41,1.20,[0,0,0],m.Dark,.045);panel(b,.63,.22,.87,[0,.20,-.08],m.Armor,.026);
 for(const s of [-1,1]){panel(b,.16,.28,1.02,[s*.4,.03,-.025],m.Shell,.017);vent(b,[s*.41,.035,.512],.10,.13,m.Dark);}
 panel(h,.38,.27,.47,[0,0,0],m.Armor,.025);panel(h,.29,.14,.20,[0,-.11,.245],m.Dark,.018);panel(h,.24,.047,.024,[0,.052,.252],m.Signal,.006);
 for(const s of [-1,1]){plate(h,[[-.036,0],[.036,0],[.047,.18],[-.031,.22]],.083,[s*.145,.13,-.09],m.Shell,.007);cylinder(h,.046,.046,.024,[s*.21,0,.12],m.Metal,[0,0,Math.PI/2]);}
 for(let i=0;i<4;i++){const x=i%2?.35:-.35,z=i<2?.45:-.45,leg=j('Leg'+i,root,[x,.55,z]),paw=j('Paw'+i,leg,[0,-.42,0]);
  cylinder(leg,.078,.078,.16,[0,0,0],m.Metal,[0,0,Math.PI/2]);panel(leg,.17,.35,.18,[0,-.21,0],m.Armor,.017);strut(leg,[-.07,-.055,-.07],[-.055,-.40,.035],.021,.015,m.Metal);
  panel(paw,.24,.13,.30,[0,-.055,.057],m.Dark,.015);for(const dx of [-.07,0,.07])panel(paw,.043,.034,.145,[dx,-.056,.192],m.Shell,.004);}
 const spine=j('Spine',root,[0,1.05,-.3]);panel(spine,.10,.31,.11,[0,.1,0],m.Dark,.01);panel(spine,.13,.08,.13,[0,.34,0],m.Signal,.008);
}
function artillery(a){const {m,joint:j,root}=a,b=j('Body',root,[0,1.7,0]);panel(b,1.48,1.06,.95,[0,0,0],m.Dark,.04);panel(b,1.31,.26,.98,[0,.60,0],m.Armor,.027);
 for(const s of [-1,1]){
  panel(b,.30,.82,1.01,[s*.62,.03,0],m.Armor,.025);panel(b,.21,.38,.10,[s*.63,.18,.58],m.Shell,.014);
  const gun=j('Mortar_'+(s>0?'R':'L'),root,[s*.42,2.60,-.2]);cylinder(gun,.115,.14,.82,[0,0,0],m.Dark,[Math.PI/2,0,0],12);cylinder(gun,.15,.15,.18,[0,0,.45],m.Armor,[Math.PI/2,0,0]);cylinder(gun,.082,.082,.012,[0,0,.55],m.Dark,[Math.PI/2,0,0]);
  for(const z of [-.30,0,.23])panel(gun,.19,.21,.058,[0,0,z],m.Metal,.007);box(gun,[.095,.019,.22],[0,.133,.1],m.Signal);
  const l=j('Leg_'+(s>0?'R':'L'),root,[s*.55,.94,0]);panel(l,.32,.78,.41,[0,-.42,0],m.Dark,.025);panel(l,.29,.45,.14,[0,-.45,.21],m.Armor,.019);strut(l,[s*.13,-.15,-.12],[s*.13,-.70,-.12],.029,.026,m.Metal);panel(l,.49,.15,.60,[0,-.84,.095],m.Armor,.02);
  const k=j('Knee_'+(s>0?'R':'L'),root,[s*.55,.98,.05]);panel(k,.38,.22,.45,[0,0,0],m.Shell,.025);box(k,[.22,.039,.02],[0,0,.251],m.Signal);
 }
 const head=j('Head',root,[0,1.85,.62]);panel(head,.58,.38,.29,[0,0,0],m.Armor,.025);panel(head,.35,.051,.02,[0,.04,.172],m.Signal,.004);
 core(a,[0,1.6,-.62],.26);const hatch=j('Hatch',root,[0,1.6,-.56]);panel(hatch,.90,.8,.13,[0,0,0],m.Armor,.021);vent(hatch,[0,0,-.084],.62,.51,m.Dark);
}
function aerial(a,swarm){const {m,joint:j,root}=a;
 if(swarm){const b=j('Body',root);panel(b,.65,.25,.48,[0,0,0],m.Dark,.026);panel(b,.4,.08,.34,[0,.165,0],m.Shell,.018);panel(b,.22,.12,.062,[0,0,.27],m.Signal,.011);
  for(let i=0;i<4;i++){const x=i%2?.49:-.49,z=i<2?.33:-.33;strut(b,[x*.28,0,z*.25],[x,.04,z],.035,.037,m.Metal);
   const p=j('Rotor'+i,root,[x,.04,z]);mesh(p,new T.TorusGeometry(.19,.03,6,24),m.Armor,[0,0,0],[Math.PI/2,0,0]);cylinder(p,.033,.033,.075,[0,0,0],m.Metal);
   for(const t of [0,Math.PI/2])panel(p,.35,.022,.052,[0,0,0],m.Signal,.003,[0,t,0]);}
 }else{const b=j('Body',root,[0,1.16,0]);panel(b,.77,.93,.58,[0,0,0],m.Dark,.035);panel(b,.61,.71,.10,[0,.02,.32],m.Armor,.02);vent(b,[0,-.15,.381],.34,.35,m.Metal);
  const h=j('Head',root,[0,1.94,0]);panel(h,.62,.36,.56,[0,0,0],m.Armor,.03);panel(h,.40,.085,.026,[0,.035,.308],m.Signal,.007);
  for(const s of [-1,1]){const f=j('Thruster_'+(s>0?'R':'L'),root,[s*.65,1.2,0]);cylinder(f,.13,.15,.70,[0,0,0],m.Armor,[0,0,0],12);cylinder(f,.115,.14,.16,[0,-.39,0],m.Metal);cylinder(f,.07,.07,.025,[0,-.48,0],m.Signal);panel(f,.10,.33,.08,[0,0,.15],m.Shell,.012);
   const l=j('Landing_'+(s>0?'R':'L'),root,[s*.27,.73,0]);strut(l,[0,0,0],[0,-.61,.03],.055,.035,m.Metal);panel(l,.23,.10,.32,[0,-.66,.07],m.Dark,.012);}
  for(let i=0;i<4;i++){const x=i%2?.55:-.55,z=i<2?.35:-.35;strut(b,[x*.2,.52,0],[x,.86,z],.03,.03,m.Metal);const r=j('Rotor'+i,root,[x,2.05,z]);mesh(r,new T.TorusGeometry(.17,.029,6,24),m.Armor,[0,0,0],[Math.PI/2,0,0]);panel(r,.30,.03,.065,[0,0,0],m.Signal,.004);}
 }
}
function sentry(a){const {m,joint:j,root}=a,base=j('Base',root);cylinder(base,.57,.6,.45,[0,.225,0],m.Dark,[0,0,0],16);
 for(let i=0;i<4;i++){const t=i*Math.PI/2;panel(base,.23,.11,.58,[Math.sin(t)*.36,.10,Math.cos(t)*.36],m.Armor,.017,[0,t,0]);}
 cylinder(base,.22,.30,.57,[0,.70,0],m.Metal,[0,0,0],12);panel(base,.38,.40,.35,[0,.79,0],m.Armor,.019);
 const turret=j('Turret',root,[0,1.35,0]);panel(turret,.91,.47,.99,[0,0,0],m.Dark,.029);
 for(const s of [-1,1]){panel(turret,.2,.49,.76,[s*.4,.02,.035],m.Armor,.019);panel(turret,.21,.13,.12,[s*.3,.26,.25],m.Shell,.01);
  const gun=j('Barrel_'+(s>0?'R':'L'),turret,[s*.18,.07,.65]);cylinder(gun,.083,.083,.7,[0,0,.19],m.Metal,[Math.PI/2,0,0],12);cylinder(gun,.105,.10,.16,[0,0,.59],m.Armor,[Math.PI/2,0,0]);cylinder(gun,.053,.053,.012,[0,0,.68],m.Dark,[Math.PI/2,0,0]);}
 panel(turret,.91,.48,.08,[0,.01,.545],m.Armor,.019);box(turret,[.69,.035,.015],[0,.20,.60],m.Signal);panel(turret,.18,.14,.16,[0,.39,.12],m.Signal,.012);
 const c=core(a,[0,1.35,-.66],.19);rim(c,.24,.035,m.Metal,.029);vent(turret,[0,.06,-.518],.55,.16,m.Metal);
}
export function createRosterUnit(type){const s=ROSTER_UNITS[type];if(!s)throw Error('Unknown roster unit '+type);const a=artKit(s);
 if(['stalker','rusher','harborElite','warden'].includes(type))specialist(a);else if(type==='hound')quadruped(a);else if(type==='artilleryMech')artillery(a);else if(type==='sentry')sentry(a);else aerial(a,type==='swarmDrone');
 return finishArt(a,poseRosterUnit);
}
export function poseRosterUnit(rig,type,{time=0,mode=ROSTER_UNITS[type]?.clips[0],phase=0,hit=0,runtime=false}={}){
 resetArt(rig);const n=rig.nodes,t=time+phase,walk=/Patrol|Run|Sprint|Advance|Formation/.test(mode),aim=mode==='Aim'||mode==='Armed'||mode==='Pounce',open=mode==='Vent'||mode==='Overload',stride=walk?Math.sin(t*Math.PI*2/1.2):0;
 if(n.Hips){n.Hips.position.y+=walk?Math.cos(t*10)*.006:Math.sin(t*2.6)*.003;n.Chest.rotation.x=(type==='rusher'?.10:0)-hit*.12;n.Head.rotation.x=hit*.08;
  for(const s of [-1,1]){const q=s>0?'R':'L';if(n['Thigh_'+q]){n['Thigh_'+q].rotation.x=stride*s*.27;n['Shin_'+q].rotation.x=Math.max(0,-stride*s)*.30;n['Foot_'+q].rotation.x=-n['Thigh_'+q].rotation.x-n['Shin_'+q].rotation.x;}
   n['Arm_'+q].rotation.x=type==='rusher'?(aim?-.7:stride*s*.32):aim?-.5:-.26+stride*s*.025;n['Fore_'+q].rotation.x=type==='rusher'?-.3:aim?-.64:-.85;
   if(n['Vent_'+q])n['Vent_'+q].rotation.y=open?s*.55:0;if(n['Fin_'+q])n['Fin_'+q].rotation.x=.08+Math.abs(stride)*.05;if(n['Tabard_'+q])n['Tabard_'+q].rotation.x=-.06-Math.max(0,-stride*s)*.28;
  }
 }
 if(type==='hound'){n.Head.rotation.x=aim?-.13:Math.sin(t*2)*.025;n.Body.rotation.x=hit*.1;for(let i=0;i<4;i++){n['Leg'+i].rotation.x=stride*(i%3?1:-1)*.36;n['Paw'+i].rotation.x=-n['Leg'+i].rotation.x;}}
 if(type==='artilleryMech'){for(const q of ['L','R']){n['Leg_'+q].rotation.x=stride*(q==='L'?1:-1)*.14;n['Mortar_'+q].rotation.x=aim?-.23:0;}n.Hatch.scale.setScalar(open?.001:1);}
 for(let i=0;i<4;i++)if(n['Rotor'+i])n['Rotor'+i].rotation.y=t*24*(i%2?1:-1);
 if(n.Crown)n.Crown.rotation.y=t*.22;if(n.Core)n.Core.scale.setScalar(open?1.35:1);
 if(type==='sentry'){n.Turret.rotation.y=runtime?0:aim?0:Math.sin(t*1.1)*.25;for(const q of ['L','R'])n['Barrel_'+q].rotation.x=aim?-.035:0;}
}
export const makeRosterUnitClips=(root,type)=>artClips(root,ROSTER_UNITS[type],poseRosterUnit);
export function styleRosterUnit(rig,type,mode){const m=rig.materials;for(const v of new Set(Object.values(m))){if(type==='stalker'){v.transparent=true;v.opacity=mode==='Cloak'?.12:1;v.depthWrite=false;}}
 if(m.Signal)m.Signal.emissiveIntensity=/Aim|Armed/.test(mode)?2:1;
 if(m.Core){const open=/Vent|Overload/.test(mode);m.Core.color.setHex(open?0x72ffe0:ROSTER_UNITS[type].coreColor||0x70ffdf);m.Core.emissive.copy(m.Core.color);m.Core.emissiveIntensity=open?1.6:.8;}
}
