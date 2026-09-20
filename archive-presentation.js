import {mountArchiveFilterSummary,showUnavailableArchiveMetrics} from './archive-view-state.js';
// Pure presentation adapter: delegates actions to existing controls; never touches storage.
export function mountArchivePresentation(){
 const host=document.createElement('section');host.id='archive-empty-state';host.className='archive-empty-state';host.hidden=true;host.setAttribute('aria-labelledby','archive-empty-title');
 document.getElementById('status').after(host);
 const scope=document.createElement('p');scope.id='archive-selection-summary';scope.className='archive-selection-summary';host.after(scope);
  const renderFilters=mountArchiveFilterSummary(scope);
  return ({total,count,error})=>{
    document.body.dataset.archiveState=error?'unavailable':'ready';
    renderFilters();
    if(error)showUnavailableArchiveMetrics();
  scope.textContent=error?'读取受限 · 统计不代表实际历史':`当前筛选 ${count} 条 / 本地有效 ${total} 条 · 数据只读`;
  host.hidden=!error&&count>0;host.dataset.state=error?'unavailable':total?'filtered':'empty';host.replaceChildren();
  document.getElementById('weapons').hidden=count===0;
  if(host.hidden)return;
  const mark=document.createElement('span');mark.className='archive-empty-mark';mark.setAttribute('aria-hidden','true');mark.textContent=error?'!':total?'⌕':'≡';
  const copy=document.createElement('div'),title=document.createElement('h2'),detail=document.createElement('p');title.id='archive-empty-title';
  title.textContent=error?'暂时无法读取档案':total?'没有符合条件的行动':'你的行动档案，从这里开始';
  detail.textContent=error?'这不代表没有历史记录。请查看上方原因，稍后重试；原数据未被修改。':total?'记录仍然保留。调整章节、难度或时间范围，或清除筛选后查看全部。':'在游戏设置中开启本地战斗统计，完成一次行动后回来刷新。不会补写过去的记录。';
  copy.append(title,detail);host.append(mark,copy);
  const action=document.createElement(error||total?'button':'a');action.className='button';
  if(error||total){action.type='button';action.textContent=error?'重试读取':'清除筛选';action.onclick=()=>{document.getElementById(error?'refresh':'reset').click();document.getElementById('refresh').focus();};}
  else{action.textContent='前往统计设置';action.href='./index.html?menu=settings&category=data';}
  host.append(action);
 };
}
