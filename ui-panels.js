import {createViewDeck,trapDialogFocus,watchDialog} from './ui-navigation.js';
const box=(className='')=>{const n=document.createElement('div');n.className=className;return n;};
const text=(tag,value,className='')=>{const n=document.createElement(tag);n.className=className;n.textContent=value;return n;};
const append=(host,...nodes)=>nodes.flat().filter(Boolean).forEach(n=>host.append(n));

export function organizeEquipmentPanel(panel,workshop){
 if(!panel||!workshop||panel.dataset.uiOrganized)return;panel.dataset.uiOrganized='equipment';
 const heading=panel.querySelector('.carry-heading'),actions=panel.querySelector('.carry-actions'),status=panel.querySelector(':scope > output');
 const loadout=box('ui-equipment-grid'),help=box('ui-reading'),mods=box('ui-workshop-page'),paragraphs=[...panel.querySelectorAll(':scope > p')];
 append(loadout,paragraphs.shift(),[...panel.querySelectorAll(':scope > label')],panel.querySelector('.carry-fixed'));
 append(help,text('h3','换装与行动规则'),paragraphs);append(mods,workshop);workshop.classList.add('ui-workshop');workshop.open=false;
 const host=box('ui-equipment-deck');heading.after(host);
 const apply=actions.querySelector('[data-equip]');
 const deck=createViewDeck({host,id:'equipment',label:'装备终端页面',items:[{id:'carry',label:'携带配置',content:loadout},{id:'mods',label:'改装工坊',content:mods},{id:'guide',label:'使用说明',content:help}],
  beforeChange:(_next,previous)=>{if(previous==='mods')workshop.dispatchEvent(new Event('ui-workshop-leave'));},
  onChange:key=>{apply.hidden=key!=='carry';if(status)status.hidden=key!=='carry';if(key==='mods')workshop.open=true;}});
 append(panel,status,actions);actions.classList.add('ui-dialog-actions');
 panel.addEventListener('ui-open',()=>{deck.select('carry');workshop.open=false;});
 trapDialogFocus(panel);watchDialog(panel);
 // Keep every original select in the workshop for validation/saving, but show one gun at a time.
 const regular=workshop.querySelector('[data-mod-grid]'),heavy=workshop.querySelector('[data-heavy-grid]'),heavySupported=heavy&&!heavy.hidden;
 const fields=[...regular.querySelectorAll('fieldset'),...(heavySupported?[...heavy.querySelectorAll('fieldset')]:[])];
 const picker=document.createElement('label');picker.className='ui-mod-picker';picker.append(text('span','选择改装武器'));
 const select=document.createElement('select');select.dataset.uiModWeapon='';select.setAttribute('aria-label','选择改装武器');
 fields.forEach(field=>{const key=field.querySelector('[data-weapon-mod]').dataset.weaponMod.split(':')[0];field.dataset.uiModField=key;select.add(new Option(field.querySelector('legend').textContent,key));});picker.append(select);regular.before(picker);
 function choose(){for(const field of fields){field.hidden=field.dataset.uiModField!==select.value;field.inert=field.hidden;}regular.hidden=select.value.startsWith('h');if(heavy)heavy.hidden=!heavySupported||!select.value.startsWith('h');}
 select.addEventListener('change',choose);choose();
 const descriptions=[];
 for(const control of workshop.querySelectorAll('[data-weapon-mod]')){const note=document.createElement('small');note.className='ui-mod-effect';note.id='ui-mod-effect-'+control.dataset.weaponMod.replace(':','-');control.setAttribute('aria-describedby',note.id);control.after(note);const update=()=>{note.textContent=control.selectedOptions[0]?.textContent||'';control.title=note.textContent;};control.addEventListener('change',update);descriptions.push(update);update();}
 workshop.addEventListener('toggle',()=>{if(workshop.open)descriptions.forEach(update=>update());});
 const rules=document.createElement('details');rules.className='ui-reading ui-workshop-rules';rules.append(text('summary','改装生效与解锁说明'));
 workshop.querySelectorAll(':scope > p:not([data-mod-unlocks]):not([data-mod-current])').forEach(p=>rules.append(p));workshop.append(rules);
 const modActions=box('ui-workshop-actions');append(modActions,workshop.querySelector('[data-save-mods]'),workshop.querySelector('[data-start-mods]'));workshop.append(modActions,workshop.querySelector('[data-mod-status]'));
 return deck;
}

export function organizeVehicleUI(){
 const panel=document.querySelector('.drive-panel'),overlay=document.querySelector('#drive-overlay');if(!panel||panel.dataset.uiOrganized)return null;
 panel.dataset.uiOrganized='vehicle';panel.classList.add('ui-vehicle-menu');
 const title=document.querySelector('#drive-overlay-title'),copy=document.querySelector('#drive-overlay-copy'),resume=document.querySelector('#resume-drive'),oldResumeParent=resume.parentElement;
 const header=box('ui-surface-heading');append(header,text('small','NEON ECLIPSE / 海陆空行动'),title,copy);
 const overview=box('ui-vehicle-overview'),campaign=box('ui-reading'),missions=box('ui-mission-library'),settings=box('ui-reading'),records=box('ui-reading');
 const features=panel.querySelector('.drive-features'),score=document.querySelector('#flight-score-feedback'),expedition=document.querySelector('#expedition-panel');
 append(overview,score,features,panel.querySelector('.armament-brief'));
 append(campaign,expedition);if(!expedition)append(campaign,text('p','先遣队面板尚未就绪，请确认场景已成功载入。'));
 const missionItems=[];
 for(const [id,label,extra]of [['escort','车队护送'],['chase','南湾突围','#naval-checkpoint-panel'],['recon','低空侦察'],['joint','海空接力','#joint-checkpoint-panel'],['lighthouse','灯塔岛登陆'],['windfarm','边境三关'],['flight','归航试炼']]){
  const button=document.getElementById('start-'+id),brief=button?.closest('section');if(!brief)continue;const content=box('ui-mission-detail');append(content,brief,extra?document.querySelector(extra):null);missionItems.push({id,label,content});
 }
 const missionDeck=createViewDeck({host:missions,id:'vehicle-mission',orientation:'vertical',label:'独立任务',items:missionItems});
 append(settings,text('h3','载具操作'),document.querySelector('#vehicle-flight-pitch'));
 append(settings,text('p','任务难度在对应任务页选择，开始后沿用原有锁定规则。声音与画质未提供的项目不会显示为可调选项。','ui-muted'));
 const manual=box('ui-reading');manual.append(text('h3','驾驶与返回'));
 // General notes/settings are not mixed with mission launch controls.
 [...panel.querySelectorAll(':scope > p')].filter(p=>p!==copy).forEach(p=>manual.append(p));settings.append(manual);
 const flightRecords=document.querySelector('#flight-records-panel');append(records,text('h3','成绩与备份'),flightRecords);
 const backup=expedition?.querySelector('.expedition-backup');if(backup)records.append(backup);
 append(records,text('p','单项安全检查点位于对应任务页；先遣队关间进度与恢复入口位于「先遣队战役」。','ui-muted'));
 const dispatch=box('ui-dispatch');dispatch.append(text('h3','自由试驾调度'));
 const recovery=document.querySelector('#recover-drive');append(dispatch,recovery,...panel.querySelectorAll('[data-dispatch]'));if(dispatch.children.length>1)overview.append(dispatch);
 // Buttons may share an old flex wrapper: move the controls themselves, never duplicate handlers.
 for(const button of [...panel.querySelectorAll('button')]){
  if(button===resume||button.closest('.ui-vehicle-overview,.ui-reading,.ui-mission-library,#expedition-panel'))continue;
  if(button.hasAttribute('data-location')||button.hasAttribute('data-spawn')||button.hasAttribute('data-destination')||button.textContent.includes('试验调度'))dispatch.append(button);
 }
 if(dispatch.children.length>1&&!dispatch.isConnected)overview.append(dispatch);
 const remaining=[...panel.children].filter(n=>n!==header&&!n.contains(resume)&&!n.contains(title)&&!n.contains(copy));
 // Empty layout wrappers and the old decorative kicker have no interaction state.
 for(const n of remaining){if(n.matches('.drive-actions,.drive-start-actions,.drive-footer,.drive-note'))settings.append(n);else if(!n.querySelector('button,input,select,[role="status"]')&&!n.matches('style'))n.remove();else overview.append(n);}
 panel.prepend(header);const host=box('ui-vehicle-deck');header.after(host);
 const deck=createViewDeck({host,id:'vehicle',label:'海陆空菜单',items:[{id:'overview',label:'开始 / 继续',content:overview},{id:'campaign',label:'先遣队战役',content:campaign},{id:'missions',label:'独立任务',content:missions},{id:'settings',label:'设置与说明',content:settings},{id:'records',label:'成绩与备份',content:records}]});
 const footer=box('ui-dialog-actions');append(footer,text('span','各模式沿用原有独立存档与确认规则。','ui-muted'),resume);panel.append(footer);if(oldResumeParent!==panel&&!oldResumeParent.children.length)oldResumeParent.remove();
 const campaignLink=document.createElement('button');campaignLink.type='button';campaignLink.className='ui-secondary';campaignLink.textContent='查看先遣队进度 / 处理保存';campaignLink.onclick=()=>deck.select('campaign');overview.append(campaignLink);
 const missionsLink=document.createElement('button');missionsLink.type='button';missionsLink.className='ui-secondary';missionsLink.textContent='选择独立任务 / 从检查点继续';missionsLink.onclick=()=>deck.select('missions');overview.append(missionsLink);
 document.getElementById('show-flight-records')?.addEventListener('click',()=>deck.select('records'));
 const observer=new MutationObserver(()=>{if(!overlay.hidden){deck.select('overview');(resume.hidden?deck.buttons.get('overview'):resume).focus({preventScroll:true});}});observer.observe(overlay,{attributes:true,attributeFilter:['hidden']});
 panel.addEventListener('keydown',e=>{if(!overlay.hidden&&e.key==='Escape'&&deck.active!=='overview'){e.preventDefault();e.stopPropagation();deck.select('overview',{focus:true});}},true);
 trapDialogFocus(panel);if(!overlay.hidden&&!resume.hidden)resume.focus({preventScroll:true});return {deck,missionDeck};
}

export function organizeArchiveUI(){
 const main=document.querySelector('main');if(!main||main.dataset.uiOrganized)return;main.dataset.uiOrganized='archive';
 const overview=box('ui-archive-overview'),logs=box('ui-reading'),performance=box('ui-reading'),guide=box('ui-reading');
 append(overview,main.querySelector('.metrics'),main.querySelector('.columns'));
 const log=document.getElementById('records')?.closest('section'),perf=document.getElementById('perf-samples')?.closest('section');append(logs,log);append(performance,perf);append(guide,main.querySelector('footer'));
 const host=box('ui-archive-deck');main.append(host);createViewDeck({host,id:'archive',label:'行动档案页面',items:[{id:'overview',label:'行动概览',content:overview},{id:'records',label:'逐条记录',content:logs},{id:'performance',label:'帧时序',content:performance},{id:'guide',label:'数据说明',content:guide}]});
 const filters=main.querySelector('.filters');if(filters){const disclosure=document.createElement('details');disclosure.className='ui-filter-drawer';disclosure.append(text('summary','筛选记录 · 章节 / 难度 / 时间'));filters.before(disclosure);disclosure.append(filters);}
}

export function enhanceExistingTabs(root,buttonSelector,lookup){
 if(!root)return;root.setAttribute('role','tablist');const buttons=[...root.querySelectorAll(buttonSelector)];
 function sync(){for(const [i,b]of buttons.entries()){const page=lookup(b);if(!page)continue;const selected=!page.hidden;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;b.id||='ui-page-tab-'+i;b.setAttribute('aria-controls',page.id);page.setAttribute('role','tabpanel');page.setAttribute('aria-labelledby',b.id);page.inert=!selected;}}
 buttons.forEach(b=>b.addEventListener('click',()=>queueMicrotask(sync)));
 root.addEventListener('keydown',e=>{const i=buttons.indexOf(e.target);if(i<0)return;let n;if(e.key==='ArrowRight')n=(i+1)%buttons.length;else if(e.key==='ArrowLeft')n=(i-1+buttons.length)%buttons.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=buttons.length-1;else return;e.preventDefault();buttons[n].click();buttons[n].focus();});sync();
}

export function organizeHelicopterUI(){
 const overlay=document.getElementById('heli-overlay'),panel=overlay?.querySelector('.briefing');if(!panel||panel.dataset.uiOrganized)return;panel.dataset.uiOrganized='helicopter';
 const overview=box('ui-heli-overview'),controls=box('ui-reading'),scope=box('ui-reading');
 append(overview,panel.querySelector('.briefing-spec'),document.getElementById('heli-mode-link'));
 append(controls,text('h3','飞行操作'),panel.querySelector('.briefing-controls'),text('p','旋翼声音可在飞行界面右上角开关；本独立原型未提供额外音量或画质滑块。','ui-muted'));
 append(scope,text('h3','试验范围'),panel.querySelector('.scope-note'));
 const host=box('ui-heli-deck'),copy=document.getElementById('heli-overlay-copy');copy.after(host);
 const deck=createViewDeck({host,id:'helicopter',label:'旋翼试飞菜单',items:[{id:'overview',label:'试飞概览',content:overview},{id:'controls',label:'操作指南',content:controls},{id:'scope',label:'试验说明',content:scope}]});
 const footer=box('ui-dialog-actions'),resume=document.getElementById('heli-resume');append(footer,resume,document.getElementById('heli-overlay-reset'));panel.append(footer);
 const observer=new MutationObserver(()=>{if(!overlay.hidden){deck.select('overview');resume.focus({preventScroll:true});}});observer.observe(overlay,{attributes:true,attributeFilter:['hidden']});
 panel.addEventListener('keydown',event=>{if(!overlay.hidden&&event.key==='Escape'&&deck.active!=='overview'){event.preventDefault();event.stopPropagation();deck.select('overview',{focus:true});}},true);trapDialogFocus(panel);return deck;
}
