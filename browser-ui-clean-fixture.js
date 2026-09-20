// Served only by test-ui-clean-browser.mjs in place of app.js. No WebGL renderer/game loop.
import * as T from '/node_modules/three/build/three.module.js';
import {createGameMenu} from '/menu-ui.js';
import {createCombatUI} from '/combat-ui.js';
import {createPresentation} from '/presentation.js';
import {bindPresentationFx} from '/presentation-fx-ui.js';
import {createGameAudio} from '/audio/game-audio.js';
import {createBindings,createGamepadInput} from '/input-bindings.js';
import {createAccessibility} from '/accessibility.js';
import {createI18n} from '/i18n/index.js';
import {createTelemetry} from '/telemetry.js';
import {createLoadoutState} from '/loadout-rules.js';
import {createLoadoutWorld} from '/loadout-world.js';
import {createWeaponWorkshop} from '/weapon-mods-ui.js';
import {createRuntimeWeapons} from '/weapons/runtime.js';
import {createTypedAmmo} from '/typed-ammo.js';
import {createTypedAmmoUI} from '/typed-ammo-ui.js';
import {createEquippedWeaponHUD} from '/weapon-hud.js';
export function mountCleanFixture(overlayMarkup){
let state='ready',held=0;const counts={restart:0,newGame:0,resume:0,equipment:0},campaign={checkpoint:null,unlocked:0,persistent:true},journey={data:null,persistent:true};
const overlay=document.createElement('section');overlay.className='mission-overlay';overlay.innerHTML=overlayMarkup;document.body.append(overlay);
const card=overlay.querySelector('.mission-card');
for(const [tag,cls]of [['div','level-menu'],['section','campaign-menu'],['details','achievement-panel']]){const n=document.createElement(tag);n.className=cls;if(tag==='details')n.innerHTML='<summary>荣誉</summary><p>本回归不授予成就。</p>';card.append(n);}
for(const id of ['star-collection','boss-battle-record']){const n=document.createElement('div');n.id=id;n.textContent=id==='star-collection'?'0 / 9 · 本地收藏':'暂无战斗记录';card.append(n);}
createCombatUI();const quality=document.createElement('button');quality.id='quality';quality.type='button';card.append(quality);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(),sun=new T.DirectionalLight();scene.add(sun);
const presentation=createPresentation({scene,camera,sun,art:{setQuality(){}},renderer:{setPixelRatio(){},shadowMap:{}},qualityButton:quality,record:{records:[{stage:0,seconds:42,damage:10,shots:8,usedWindows:0,windows:0}]}});
const fxKey='neon-eclipse.presentation-fx.v1';let fx={slowmo:true,dissolve:true,intro:true};try{fx={...fx,...JSON.parse(localStorage.getItem(fxKey)||'{}')};}catch{}
bindPresentationFx(card.querySelector('.presentation-controls'),fx,()=>localStorage.setItem(fxKey,JSON.stringify(fx)),{weather:{id:'clear',intensity:0}});
window.neonAudio=createGameAudio({storage:localStorage});window.neonInput={bindings:createBindings({storage:localStorage}),gamepad:createGamepadInput({getGamepads:()=>[]})};window.neonA11y=createAccessibility({storage:localStorage});window.neonI18n=createI18n({storage:localStorage,languages:['zh-CN']});window.neonTelemetry=createTelemetry();
const weapons=createRuntimeWeapons(),loadout=createLoadoutState(),rounds=weapons.map(w=>w.cap),reserves=weapons.map(w=>w.reserve),typed=createTypedAmmo();typed.reset(undefined,reserves);
const loadoutWorld=createLoadoutWorld({scene,camera,entries:[{x:0,z:0,feetY:0}],loadout,weapons,getState:()=>state,hasSight:()=>true,onEquip:()=>{held=loadout.first();counts.equipment++;hud.render();},getThrowableStock:()=>({emp:2,pulse:2,decoy:2,smoke:2})});
const workshop=createWeaponWorkshop({weapons,base:createRuntimeWeapons(),getUnlocks:()=>({stars:3,awards:1}),onRestart:()=>{counts.restart++;return true;}});workshop.reset();
const emp=document.createElement('section');emp.className='emp-status';emp.innerHTML='<b>电磁脉冲手雷 · 2</b><span>G 按住预览</span>';document.body.append(emp);
createTypedAmmoUI(typed);const hud=createEquippedWeaponHUD({weapons,loadout,typedAmmo:typed,getAmmo:()=>({rounds,reserves}),getSelected:()=>held});hud.render();
const field=document.createElement('section');field.className='field-kit-panel';field.hidden=true;field.innerHTML='<h2>战地整备试点</h2><p>测试响应保留此入口，不启动真实场景。</p><button data-close>关闭</button>';field.querySelector('button').onclick=()=>field.hidden=true;document.body.append(field);
const session=()=>({state,map:'reactor',mode:'campaign',stage:0,stageCount:5,stageTitle:'启动冷却装置',time:42,kills:3,checkpoint:campaign.checkpoint,pending:false,navigating:false});
let menu;function setState(next){state=next;document.body.dataset.playState=state;overlay.hidden=state==='playing';presentation.update(0,0,0,state);menu.update(state);}
menu=createGameMenu({overlay,campaign,journey,getSession:session,actions:{
 newGame(){counts.newGame++;setState('playing');return true;},startSingle(){setState('playing');return true;},continueSingle(){setState('playing');return true;},continueJourney(){setState('playing');return true;},resume(){counts.resume++;setState('playing');return true;},retry(){return true;},openChapter(){return true;},
 equipment(){loadoutWorld.show();},fieldKitEnabled:true,fieldKit(){field.hidden=false;},quality(value){for(let i=0;i<3&&Number(document.body.dataset.renderQuality)!==value;i++)presentation.toggleQuality();}
}});
card.querySelector('#deploy').addEventListener('click',()=>menu.activatePrimary());
document.addEventListener('keydown',e=>{if(e.code==='Escape'&&(loadoutWorld.open||!field.hidden)){e.preventDefault();e.stopPropagation();loadoutWorld.hide();field.hidden=true;return;}},true);
setState('ready');
window.__cleanUI={setState,counts,loadout,workshop,rounds,reserves,fx,overlay,menu,originalControls:{sensitivity:document.querySelector('.sensitivity-setting input'),motion:document.getElementById('motion-strength')},snapshot(){return {counts:{...counts},state,loadout:loadout.state,workshop:workshop.snapshot(),rounds:rounds.map(v=>Number.isFinite(v)?v:null),reserves:reserves.map(v=>Number.isFinite(v)?v:null),keys:window.neonInput.bindings.codesFor('reload'),quality:document.body.dataset.renderQuality};}};

return window.__cleanUI;
}
