import {createExpeditionBackup,EXPEDITION_BACKUP_LIMIT,expeditionArchiveSummary} from './expedition-backup.js';
const ERRORS={invalid:'文件类型、版本或档案内容无效，未导入','too-large':'文件超过 4 MiB，未读取',corrupt:'当前档案损坏或版本未知，原数据保留',
  unavailable:'此环境无法使用 IndexedDB',denied:'浏览器拒绝本地存储',blocked:'数据库被旧页面占用',quota:'空间不足；本次替换未提交，可重试同一确认',
  conflict:'预览后档案已变化，拒绝覆盖。请取消并重新预览',failed:'操作未确认完成，可重试同一确认；不自动覆盖',busy:'请先退出本关并处理未保存操作','no-backup':'没有可撤销的导入 / 恢复副本'};
export function bindExpeditionBackup(root,{manager=createExpeditionBackup(),isLocked=()=>false,mutate=work=>work(),download=defaultDownload}={}){
  if(!document.getElementById('expedition-backup-style')){
    const style=document.createElement('style');style.id='expedition-backup-style';style.textContent=`
.expedition-backup{margin:14px 0;padding:12px;border:1px solid #98c8bb55;border-radius:8px;color:#d1e5dc;text-align:left;min-width:0;font-size:12px}
.expedition-backup summary{cursor:pointer;line-height:1.6;color:#cbe9da}.expedition-backup p{font-size:12px;line-height:1.7;overflow-wrap:anywhere;margin:9px 0}
.expedition-backup-actions{display:flex;gap:7px;flex-wrap:wrap}.expedition-backup button,.expedition-backup label{padding:9px 11px;margin:0;font:inherit;white-space:normal;border:1px solid #8ab7ae66;border-radius:5px;background:#223f43;color:#e4eee9;cursor:pointer;min-width:0;max-width:100%;box-sizing:border-box}
.expedition-backup button:disabled,.expedition-backup label:has(input:disabled){opacity:.45;cursor:not-allowed}.expedition-backup [hidden]{display:none!important}
.expedition-backup [data-exp-backup-error=true]{color:#ffd4a8}.expedition-backup-preview{padding:10px;background:#172c33;border-radius:5px;margin:10px 0}
@media(max-width:480px){.expedition-backup-actions>*{flex:1 1 120px}.expedition-backup{padding:9px}}`;
    document.head.append(style);
  }
  const panel=document.createElement('details');panel.className='expedition-backup';panel.dataset.expBackup='';
  panel.innerHTML=`<summary>先遣队档案 · 独立备份 / 恢复</summary>
    <p>专用 JSON：包含关间进度、通关记录和本战役安全节点。不包含 FPS、原单项检查点或撤销副本；与 FPS 存档的合并 / 替换操作相互独立。请先关闭其他载具页面。</p>
    <p data-exp-backup-health>展开后读取档案状态。</p>
    <div class="expedition-backup-actions"><button type="button" data-exp-backup-export>导出先遣队备份</button><button type="button" data-exp-backup-select>选择先遣队备份</button><input type="file" accept="application/json,.json" data-exp-backup-file hidden><button type="button" data-exp-backup-undo>预览撤销上次替换</button><button type="button" data-exp-backup-refresh>读取状态</button></div>
    <div class="expedition-backup-preview" data-exp-backup-preview hidden><p data-exp-backup-diff></p><p>确认后替换整个先遣队档案，不合并历史。当前档案与替换结果在同一个事务提交；保留一份可撤销副本。再次替换会更新该副本。</p><div class="expedition-backup-actions"><button type="button" data-exp-backup-apply>确认替换先遣队档案</button><button type="button" data-exp-backup-cancel>取消</button></div></div>
    <p data-exp-backup-status role="status" aria-live="polite"></p>`;
  root.append(panel);const $=s=>panel.querySelector(s);let busy=false,plan=null,hasUndo=false;
  const summary=s=>`${s.completed}/${s.total} 关 · ${s.next} · 可选关${s.difficulty} · 完整一命 ${s.qualified} 条 / 检查点继续 ${s.resumed} 条 · ${s.checkpoint}`;
  const status=(text,error=false)=>{const el=$('[data-exp-backup-status]');el.textContent=text;el.dataset.expBackupError=String(error);};
  function sync(){
    const locked=isLocked();panel.dataset.busy=String(busy);panel.dataset.locked=String(locked);
    panel.querySelectorAll('button,input').forEach(el=>el.disabled=busy||locked);
    $('[data-exp-backup-undo]').disabled=busy||locked||!hasUndo;
    $('[data-exp-backup-apply]').disabled=busy||locked||!plan;
    $('[data-exp-backup-cancel]').disabled=busy||!plan;
  }
  function show(view){
    plan=view?.ok?view:null;$('[data-exp-backup-preview]').hidden=!plan;
    if(plan){$('[data-exp-backup-diff]').textContent='当前：'+summary(plan.before)+'。替换为：'+summary(plan.after)+'。';
      $('[data-exp-backup-apply]').textContent=plan.unchanged?'内容一致 · 确认保持当前档案':plan.reason==='restore'?'确认撤销上次替换':'确认替换先遣队档案';}
    sync();
  }
  function health(r){
    hasUndo=!!r.archive?.undo;
    $('[data-exp-backup-health]').textContent=r.ok?summary(expeditionArchiveSummary(r.archive))+(hasUndo?' · 有可撤销副本':' · 尚无撤销副本'):'状态未知 · '+(ERRORS[r.code]||ERRORS.failed);
  }
  async function run(work){
    if(busy||isLocked()){status(ERRORS.busy,true);return;}
    busy=true;sync();try{await work();}catch{status(ERRORS.failed,true);}finally{busy=false;sync();}
  }
  const refresh=()=>run(async()=>health(await manager.read()));
  $('[data-exp-backup-export]').addEventListener('click',()=>run(async()=>{
    const r=await manager.exportBundle();if(!r.ok){status(ERRORS[r.code]||ERRORS.failed,true);return;}
    await download('neon-expedition-'+r.bundle.exportedAt.slice(0,19).replace(/[:T]/g,'-')+'.json',JSON.stringify(r.bundle,null,2));
    status('已请求下载当前已提交的先遣队档案；请保管好 JSON 文件。未上传任何数据。');
  }));
  $('[data-exp-backup-select]').addEventListener('click',()=>{if(!busy&&!isLocked())$('[data-exp-backup-file]').click();});
  $('[data-exp-backup-file]').addEventListener('change',event=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    run(async()=>{
      show(null);if(file.size>EXPEDITION_BACKUP_LIMIT){status(ERRORS['too-large'],true);return;}
      const view=await manager.previewImport(await file.text());show(view);
      status(view.ok?'预览不会写入；核对后再确认替换。':ERRORS[view.code]||ERRORS.failed,!view.ok);
    });
  });
  $('[data-exp-backup-undo]').addEventListener('click',()=>run(async()=>{
    const view=await manager.previewRestore();show(view);status(view.ok?'将恢复替换前的档案；当前档案会成为新的撤销副本。':ERRORS[view.code]||ERRORS.failed,!view.ok);
  }));
  $('[data-exp-backup-apply]').addEventListener('click',()=>run(async()=>{
    if(!plan)return;const selected=plan,r=await mutate(()=>manager.apply(selected));
    if(r.ok){show(null);status(r.unchanged?'内容一致，没有写入；已有撤销副本保持不变。':'先遣队档案替换已提交，并已保留一份可撤销副本。载具菜单将读取新档案。');}
    else status(ERRORS[r.code]||ERRORS.failed,true); // Retain the exact plan for idempotent retries; never regenerate it silently.
    health(await manager.read());
  }));
  $('[data-exp-backup-cancel]').addEventListener('click',()=>{if(busy)return;show(null);status('已取消，没有写入。');});
  $('[data-exp-backup-refresh]').addEventListener('click',refresh);
  panel.addEventListener('toggle',()=>{if(panel.open)refresh();});sync();return {sync,refresh,panel};
}
function defaultDownload(name,text){
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
