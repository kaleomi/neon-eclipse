// Shared, storage-free navigation. Reparent the original controls; never clone their state/listeners.
const blockedMenus=new WeakMap();
function syncDialogBackgrounds(){
 const open=[...document.querySelectorAll('.carry-panel,.field-kit-panel')].some(n=>!n.hidden);
 for(const menu of document.querySelectorAll('.menu-shell')){
  if(open){if(!blockedMenus.has(menu))blockedMenus.set(menu,menu.inert);menu.inert=true;}
  else if(blockedMenus.has(menu)){menu.inert=blockedMenus.get(menu);blockedMenus.delete(menu);}
 }
}
export function createViewDeck({host,id,items,initial=items[0]?.id,label='分类导航',orientation='horizontal',beforeChange=()=>{},onChange=()=>{}}){
 const nav=document.createElement('nav');nav.className='ui-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label',label);nav.setAttribute('aria-orientation',orientation);
 const body=document.createElement('div');body.className='ui-deck-body';const panels=new Map(),buttons=new Map();let active=null;
 for(const item of items){
  const button=document.createElement('button');button.type='button';button.className='ui-tab';button.dataset.uiTab=item.id;button.id=id+'-tab-'+item.id;button.setAttribute('role','tab');button.setAttribute('aria-controls',id+'-page-'+item.id);
  const title=document.createElement('span');title.textContent=item.label;button.append(title);if(item.hint){const hint=document.createElement('small');hint.textContent=item.hint;button.append(hint);}
  const page=document.createElement('section');page.className='ui-tab-page';page.id=id+'-page-'+item.id;page.dataset.uiPage=item.id;page.setAttribute('role','tabpanel');page.setAttribute('aria-labelledby',button.id);
  for(const node of [item.content].flat().filter(Boolean))page.append(node);
  nav.append(button);body.append(page);panels.set(item.id,page);buttons.set(item.id,button);
  button.addEventListener('click',()=>select(item.id));
 }
 host.append(nav,body);host.classList.add('ui-deck');host.dataset.uiDeck=id;
 function select(key,{focus=false,notify=true}={}){
  if(!panels.has(key))return false;const previous=active;
  if(key!==active)beforeChange(key,previous);
  active=key;host.dataset.activePage=key;
  for(const [name,page]of panels){const selected=name===key;page.hidden=!selected;page.inert=!selected;const b=buttons.get(name);b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;}
  body.scrollTop=0;if(focus)buttons.get(key).focus();if(notify&&key!==previous)onChange(key,previous);return true;
 }
 nav.addEventListener('keydown',event=>{
  const button=event.target.closest('[role="tab"]');if(!button||!nav.contains(button))return;
  const keys=[...buttons.keys()],i=keys.indexOf(button.dataset.uiTab);let next;
  if(event.key==='ArrowRight'||event.key==='ArrowDown')next=keys[(i+1)%keys.length];
  else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=keys[(i-1+keys.length)%keys.length];
  else if(event.key==='Home')next=keys[0];else if(event.key==='End')next=keys.at(-1);else return;
  event.preventDefault();event.stopPropagation();select(next,{focus:true});
 });
 select(panels.has(initial)?initial:items[0]?.id,{notify:false});
 return {host,nav,body,panels,buttons,select,get active(){return active;}};
}
export function trapDialogFocus(panel){
 if(panel.dataset.uiFocus==='true')return;panel.dataset.uiFocus='true';panel.setAttribute('aria-modal','true');
 panel.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const nodes=[...panel.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary')].filter(n=>n.tabIndex!==-1&&!n.closest('[hidden],[inert]')&&n.getClientRects().length);
  if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);
  if(event.shiftKey&&(document.activeElement===first||!nodes.includes(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!nodes.includes(document.activeElement))){event.preventDefault();first.focus();}
 });
}
export function watchDialog(panel,{onOpen=()=>{}}={}){
 let wasHidden=panel.hidden,previous=document.activeElement;
 const remember=e=>{if(!panel.contains(e.target)&&!e.target.closest('.ui-dialog-backdrop'))previous=e.target;};document.addEventListener('focusin',remember);const backdrop=document.createElement('div');backdrop.className='ui-dialog-backdrop';backdrop.hidden=wasHidden;backdrop.setAttribute('aria-hidden','true');panel.before(backdrop);
 function sync(){const opening=wasHidden&&!panel.hidden,closing=!wasHidden&&panel.hidden;backdrop.hidden=panel.hidden;syncDialogBackgrounds();
  if(opening){onOpen();}
  if(closing&&previous?.isConnected&&!previous.closest('[hidden],[inert]'))previous.focus({preventScroll:true});
  wasHidden=panel.hidden;
 }
 const observer=new MutationObserver(sync);observer.observe(panel,{attributes:true,attributeFilter:['hidden']});trapDialogFocus(panel);return {sync,disconnect(){observer.disconnect();document.removeEventListener('focusin',remember);backdrop.remove();}};
}
