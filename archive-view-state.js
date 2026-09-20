// Presentation-only. Filter changes reuse the original controls and their handlers.
const FILTERS = [['map','章节'],['difficulty','难度'],['mode','行动模式'],['origin','恢复标记'],['days','时间']];
export function mountArchiveFilterSummary(anchor) {
  const group=document.createElement('div');group.className='archive-filter-chips';
  group.setAttribute('role','group');group.setAttribute('aria-label','当前筛选条件');anchor.after(group);
  return ()=>{
    group.replaceChildren();
    for(const [id,label] of FILTERS){
      const control=document.getElementById(id);if(!control||control.value==='all')continue;
      const button=document.createElement('button');button.type='button';button.dataset.clearFilter=id;
      const value=control.selectedOptions[0]?.textContent||control.value;
      button.setAttribute('aria-label',`清除${label}筛选：${value}`);
      const copy=document.createElement('span');copy.textContent=`${label} · ${value}`;
      const close=document.createElement('span');close.textContent='×';close.setAttribute('aria-hidden','true');button.append(copy,close);
      button.addEventListener('click',()=>{
        control.value='all';control.dispatchEvent(new Event('change',{bubbles:true}));
        // Rendering replaces the chip: put focus on a surviving, visible control.
        (group.querySelector('button')||document.querySelector('.ui-filter-drawer>summary')||document.getElementById('refresh')).focus();
      });group.append(button);
    }
    group.hidden=!group.children.length;
  };
}
export function showUnavailableArchiveMetrics() {
  for(const id of ['attempts','outcomes','time','shots','perf-fps','perf-p95','perf-worst'])document.getElementById(id).textContent='—';
  for(const [id,text] of [
    ['rate','读取失败，暂不计算胜率'],['perf-samples','样本暂不可读取'],
    ['perf-quality','尚未读取到帧时序，不能判断是否存在历史样本。'],
    ['weapon-note','武器分布暂不可读取；这不代表没有射击记录。'],
    ['count','记录暂不可读取'],['page','—']
  ])document.getElementById(id).textContent=text;
  for(const id of ['chapters','records']){
    const cell=document.querySelector(`#${id} .empty`);if(cell)cell.textContent='暂时无法读取，重试后再查看历史记录。';
  }
}
