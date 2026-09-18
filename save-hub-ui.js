// Settings-page widget for SaveHub: slot health, export, import preview/apply, restore last backup.
// Distinct from the per-battle report export. Uses only local files; nothing leaves the browser.
import {createSaveHub,GROUP_TITLES,bundleFileName,BUNDLE_LIMIT} from './save-hub.js';
import {bindExpeditionBackup} from './expedition-backup-ui.js';
const STATUS_LABEL={ok:'正常',empty:'无数据',unknown:'版本未知',corrupt:'已损坏',unavailable:'不可用'};
const REASON_LABEL={'unknown-key':'未识别的存档键，跳过',corrupt:'内容损坏，跳过','unknown-version':'版本未知，将原样写入'};
const ACTION_LABEL={add:'新增',overwrite:'覆盖',same:'相同',skip:'跳过'};
const CODE_LABEL={invalid:'不是 NEON ECLIPSE 的备份文件',unavailable:'当前浏览器无法访问本地存储','too-large':'备份文件过大','backup-failed':'无法完整读取或保存导入前备份，已取消导入',busy:'另一个存档操作尚未完成，请稍后重试',partial:'部分槽位或飞行成绩未完成，请检查失败项','no-backup':'没有可恢复的导入前备份',done:'完成'};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function bindSaveHub(container,{hub=null,records=null,onChanged=()=>{},download=defaultDownload}={}){
 if(!container)return null;
 hub=hub||createSaveHub({records});
 container.innerHTML=`<h4>存档备份</h4><p class="menu-setting-hint">这里导出 FPS 战役 / 检查点、星星、成就、偏好设置和已接入的飞行成绩，与单场战报不同。先遣队使用下方独立备份；这里的合并 / 替换 / 撤销不会改动先遣队档案。</p>
 <div class="menu-save-hub-health" data-save-health></div>
 <div class="menu-save-hub-actions"><button type="button" class="menu-secondary" data-save-export>导出备份</button><label class="menu-secondary menu-save-hub-import">导入备份<input type="file" accept="application/json,.json" data-save-file hidden></label><button type="button" class="menu-secondary" data-save-restore>恢复导入前备份</button></div>
 <div class="menu-save-hub-preview" data-save-preview hidden></div>
 <p class="menu-setting-hint" data-save-status aria-live="polite"></p>`;
 const $=s=>container.querySelector(s);
 const status=(text,error=false)=>{const el=$('[data-save-status]');el.textContent=text;el.dataset.error=String(error);};
 let pendingBundle=null;
 function renderHealth(){
  const rows=hub.health().filter(r=>!(r.legacy&&r.status==='empty'));
  const groups=new Map();for(const r of rows){if(!groups.has(r.group))groups.set(r.group,[]);groups.get(r.group).push(r);}
  $('[data-save-health]').innerHTML=[...groups].map(([g,items])=>`<div class="menu-save-hub-group"><b>${esc(GROUP_TITLES[g]||g)}</b>${items.map(r=>`<span data-status="${r.status}">${esc(r.title)} · ${STATUS_LABEL[r.status]}</span>`).join('')}</div>`).join('');
  const backup=hub.readBackup();
  $('[data-save-restore]').disabled=!backup;
  $('[data-save-restore]').title=backup?`导入前备份创建于 ${backup.createdAt}`:'尚无导入前备份';
 }
 function renderPreview(preview){
  const box=$('[data-save-preview]');
  if(!preview){box.hidden=true;box.innerHTML='';pendingBundle=null;return;}
  const lines=preview.entries.map(e=>`<li data-action="${e.action}">${esc(e.title)} — ${ACTION_LABEL[e.action]}${e.reason?`（${REASON_LABEL[e.reason]||e.reason}）`:''}</li>`).join('');
  const missing=preview.missing.length?`<p>备份中不包含、当前存在的槽位（合并模式保留，替换模式删除）：${preview.missing.map(m=>esc(m.title)).join('、')}</p>`:'';
  box.innerHTML=`<p>备份导出时间：${esc(preview.exportedAt||'未知')}；飞行成绩 ${preview.flightRecords} 条。</p><ul>${lines}</ul>${missing}<p>导入前会自动保存一份当前存档，可用「恢复导入前备份」撤销。</p><div class="menu-save-hub-actions"><button type="button" class="menu-secondary" data-save-apply="merge">合并导入</button><button type="button" class="menu-secondary" data-save-apply="replace">替换导入</button><button type="button" class="menu-text-button" data-save-cancel>取消</button></div>`;
  box.hidden=false;
  box.querySelectorAll('[data-save-apply]').forEach(b=>b.addEventListener('click',()=>apply(b.dataset.saveApply)));
  box.querySelector('[data-save-cancel]').addEventListener('click',()=>{renderPreview(null);status('已取消导入。');});
 }
 async function doExport(){
  try{
   const bundle=await hub.exportBundle();
   const text=JSON.stringify(bundle,null,1);
   download(bundleFileName(bundle),text);
   const n=Object.keys(bundle.slots).length;
   status(`已导出 ${n} 个存档槽位${bundle.flightRecords?`，飞行成绩 ${bundle.flightRecords.length} 条`:bundle.flightRecordsError?'；飞行成绩读取失败，未包含':''}。`);
  }catch{status('导出失败。',true);}
 }
 function onFile(event){
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  if(file.size>BUNDLE_LIMIT){status(CODE_LABEL['too-large'],true);return;}
  const reader=new FileReader();
  reader.onerror=()=>status('无法读取文件。',true);
  reader.onload=()=>{
   let bundle;try{bundle=JSON.parse(String(reader.result));}catch{status('文件不是有效的 JSON。',true);return;}
   const preview=hub.previewImport(bundle);
   if(!preview.ok){status(CODE_LABEL[preview.code]||'无法预览。',true);renderPreview(null);return;}
   pendingBundle=bundle;renderPreview(preview);status('请确认导入方式。合并只写入备份中的槽位；替换会同时清除备份中没有的槽位。');
  };
  reader.readAsText(file);
 }
 async function apply(mode){
  if(!pendingBundle)return;
  const result=await hub.importBundle(pendingBundle,{mode});
  renderPreview(null);renderHealth();
  if(!result.ok&&result.code!=='partial'){status(CODE_LABEL[result.code]||'导入失败。',true);return;}
  const flight=Object.values(result.flight).some(n=>n>0)?`；飞行成绩新增 ${result.flight.saved} 条、重复 ${result.flight.duplicates} 条、跳过 ${result.flight.skipped} 条、失败 ${result.flight.failed} 条`:'';
  status(`${result.code==='partial'?CODE_LABEL.partial:'导入完成'}：写入 ${result.written.length} 个槽位${result.removed.length?`，清除 ${result.removed.length} 个`:''}${flight}。刷新页面后生效。`,result.code==='partial');
  onChanged(result);
 }
 function restore(){
  const result=hub.restoreBackup();
  renderHealth();
  if(!result.ok&&result.code!=='partial'){status(CODE_LABEL[result.code]||'恢复失败。',true);return;}
  status(`${result.code==='partial'?'恢复或撤销备份保存未全部完成；原恢复目标仍保留。已处理':'已恢复'} ${result.createdAt} 的导入前备份：写入 ${result.written.length} 个槽位${result.removed.length?`，清除 ${result.removed.length} 个`:''}。刷新页面后生效。`,result.code==='partial');
  onChanged(result);
 }
 $('[data-save-export]').addEventListener('click',doExport);
 $('[data-save-file]').addEventListener('change',onFile);
 $('[data-save-restore]').addEventListener('click',restore);
 renderHealth();
 const expeditionBackup=bindExpeditionBackup(container);
 return {refresh:()=>{renderHealth();if(expeditionBackup.panel.open)expeditionBackup.refresh();},hub};
}
function defaultDownload(name,text){
 const blob=new Blob([text],{type:'application/json'});const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
