import {readArchive} from './archive-reader.js';
import {prepareArchive,filterArchive,summarizeArchive,exportArchive,duration,WEAPON_LABELS} from './archive-summary.js';
import {MAP_REGISTRY} from './maps/registry.js';
const $=id=>document.getElementById(id),names=new Map(MAP_REGISTRY.map(m=>[m.id,m.title]));
const difficulty={easy:'简单',normal:'普通',hard:'困难'},modes={campaign:'单章',journey:'战役',replay:'阶段训练'};
let prepared={records:[],rejected:0,duplicates:0,truncated:false},page=0,selected=[],loading=false;
const ids=['map','difficulty','mode','origin','days'],filters=()=>Object.fromEntries(ids.map(id=>[id,$(id).value]));
function cell(row,text,cls){const e=document.createElement('td');e.textContent=text;if(cls)e.className=cls;row.append(e);return e;}
function empty(tbody,span,text){const row=document.createElement('tr'),c=cell(row,text,'empty');c.colSpan=span;tbody.append(row);}
function render(){
 selected=filterArchive(prepared.records,filters());const summary=summarizeArchive(selected);
 $('attempts').textContent=String(summary.attempts);$('outcomes').textContent=summary.wins+' / '+summary.losses;$('rate').textContent=summary.winRate===null?'无样本，不计算胜率':`记录胜率 ${(summary.winRate*100).toFixed(1)}%`;$('time').textContent=duration(summary.stageSeconds);$('shots').textContent=String(summary.shots);
 const chapters=$('chapters');chapters.replaceChildren();for(const m of summary.maps){const row=document.createElement('tr');cell(row,names.get(m.map)||m.map);cell(row,`${m.attempts} / ${m.wins}`);cell(row,duration(m.best));cell(row,m.deaths.length?`阶段 ${m.deaths[0][0]+1} · ${m.deaths[0][1]} 次`:'—');chapters.append(row);}if(!summary.maps.length)empty(chapters,4,'没有符合筛选条件的行动');
 const weapons=$('weapons');weapons.replaceChildren();const counts=[...summary.weapons,summary.unclassified],total=counts.reduce((n,v)=>n+v,0);for(let i=0;i<counts.length;i++){const row=document.createElement('div');row.className='weapon-row';const title=document.createElement('div');title.className='weapon-title';const label=document.createElement('span'),value=document.createElement('span');label.textContent=i<8?WEAPON_LABELS[i]:'未分类 / 未记录分枪';value.textContent=String(counts[i]);title.append(label,value);const track=document.createElement('div');track.className='track';const fill=document.createElement('div');fill.className='fill';fill.style.width=(total?counts[i]/total*100:0)+'%';track.append(fill);row.append(title,track);weapons.append(row);}
 $('weapon-note').textContent=`仅按已有射击字段统计。${summary.missingWeaponRecords} 条记录缺少分枪数据；重武器可能归入未分类。刀的零射击不表示零使用。`;
 const pages=Math.max(1,Math.ceil(selected.length/20));page=Math.max(0,Math.min(page,pages-1));const body=$('records');body.replaceChildren();for(const r of selected.slice(page*20,page*20+20)){const row=document.createElement('tr');cell(row,new Date(r.finishedAt).toLocaleString('zh-CN',{hour12:false}));cell(row,`${names.get(r.map)||r.map} / ${difficulty[r.difficulty]}`);cell(row,r.won?'胜利':'失败',r.won?'win':'');cell(row,`${modes[r.mode]} / ${r.fromCheckpoint?'检查点恢复':r.startStage===0?'章首开始':'中途阶段开始'}`);cell(row,duration(r.time));cell(row,`${r.kills} / ${r.shots}`);body.append(row);}if(!selected.length)empty(body,6,prepared.records.length?'没有符合筛选条件的记录。可重置筛选。':'暂无可用战斗记录。请在游戏设置开启本地统计，并完成一次行动。');
 $('count').textContent=`${selected.length} 条 / 本地有效 ${prepared.records.length} 条`;$('page').textContent=`${page+1} / ${pages}`;$('previous').disabled=page===0;$('next').disabled=page>=pages-1;$('export').disabled=loading||selected.length===0;
}
async function refresh(){
 if(loading)return;loading=true;$('refresh').disabled=true;$('export').disabled=true;$('status').dataset.error='false';$('status').textContent='正在只读读取本地档案…';
 const result=await readArchive();loading=false;$('refresh').disabled=false;
 if(!result.ok){prepared=prepareArchive([]);const messages={unavailable:'浏览器不支持 IndexedDB。',denied:'浏览器拒绝访问本地存储。',blocked:'数据库正在被其他页面升级，请稍后刷新。',timeout:'本地存储读取超时，可稍后重试。',unsupported:'数据库版本或结构暂不支持，原数据未修改。',changed:'数据库在读取期间发生版本变化，请刷新。'};$('status').dataset.error='true';$('status').textContent=(messages[result.code]||'读取失败，请稍后重试。')+' 未写入或清理任何存档。';}
 else{prepared=prepareArchive(result.records);$('status').textContent=`本地有效记录 ${prepared.records.length} 条 · 跳过无效/未知 ${prepared.rejected} 条 · 去重 ${prepared.duplicates} 条${prepared.truncated?' · 超过2000条，仅显示读取范围内的前2000条':''} · 只读快照，新增行动后请刷新`;}
 const old=$('map').value;$('map').replaceChildren(new Option('全部章节','all'));for(const id of [...new Set(prepared.records.map(r=>r.map))].sort())$('map').add(new Option(names.get(id)||id,id));if([...$('map').options].some(o=>o.value===old))$('map').value=old;page=0;render();
}
ids.forEach(id=>$(id).addEventListener('change',()=>{page=0;render();}));$('reset').onclick=()=>{ids.forEach(id=>$(id).value='all');page=0;render();};$('refresh').onclick=refresh;$('previous').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};
$('export').onclick=()=>{if(loading||!selected.length)return;try{const blob=new Blob([exportArchive(selected,filters())],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='neon-operations-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('status').textContent='已生成筛选结果导出；这是战斗统计，不是可恢复的游戏存档。';}catch{$('status').textContent='导出失败；本地记录未被修改。';}};
refresh();
