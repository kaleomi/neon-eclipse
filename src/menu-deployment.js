import {mountDeploymentPreview} from './deployment-preview.js';
import {DEFAULT_LOADOUT, PRIMARY_SLOTS} from './loadout-rules.js';
import {THROWABLES, TACTICAL} from './tactical-rules.js';
import {createRuntimeWeapons} from '../weapons/runtime.js';
// A new campaign starts without chapter pickups. Never grant later ordnance here.
export const DEPLOYMENT_PRIMARIES = Object.freeze(PRIMARY_SLOTS.filter(index => index < 8));
export function validDeployment(value) {
  return !!value && DEPLOYMENT_PRIMARIES.includes(value.primary) && THROWABLES.includes(value.throwable);
}
export function deploymentLoadout(value) {
  if (!validDeployment(value)) throw new Error('Invalid deployment');
  return {...DEFAULT_LOADOUT, primary: value.primary, throwable: value.throwable};
}
export function deploymentURL(value) {
  if (!validDeployment(value)) throw new Error('Invalid deployment');
  const query = new URLSearchParams({map:'reactor', mode:'journey', menu:'deploy', primary:String(value.primary), throwable:value.throwable});
  return '?' + query;
}
export function deploymentFromSearch(search) {
  const query = new URLSearchParams(search);
  if (query.get('menu') !== 'deploy' || !query.has('primary')) return null;
  const value = {primary:Number(query.get('primary')), throwable:query.get('throwable')};
  return validDeployment(value) ? value : null;
}
export function mountDeployment(host) {
  const weapons = createRuntimeWeapons();
  host.innerHTML = `<div class="deployment-console">
    <article class="deployment-weapon" aria-label="主武器预览">
      <div class="deployment-meta"><span>PRIMARY / 主武器</span><span data-deploy-preview="role"></span></div>
      <h3 data-deploy-preview="name"></h3><div class="deployment-art" data-deploy-preview="art"></div>
      <p class="deployment-description" data-deploy-preview="description"></p>
      <dl class="deployment-stats"><div><dt>弹匣容量</dt><dd data-deploy-preview="capacity"></dd></div><div><dt>最大射程</dt><dd data-deploy-preview="range"></dd></div><div><dt data-deploy-preview="reload-label"></dt><dd data-deploy-preview="reload"></dd></div></dl>
      <p class="deployment-base-note">基础配置参数 · 图形为武器类型示意</p>
    </article>
    <div class="deployment-selectors">
      <label class="deployment-field"><span>主武器 <small>01 / PRIMARY</small></span><select id="menu-deploy-primary" aria-describedby="menu-deploy-note">${DEPLOYMENT_PRIMARIES.map(i=>`<option value="${i}">${weapons[i].name}</option>`).join('')}</select></label>
      <label class="deployment-field"><span>投掷物 <small>02 / TACTICAL</small></span><select id="menu-deploy-throwable" aria-describedby="menu-tactical-description">${THROWABLES.map(id=>`<option value="${id}">${id==='emp'?'EMP · 电磁脉冲':TACTICAL[id].name}</option>`).join('')}</select><span id="menu-tactical-description" data-deploy-preview="tactical"></span></label>
      <div class="deployment-fixed-strip"><div><span>副武器 · 固定随队携带</span><strong>${weapons[2].name}</strong></div><div><span>近战 · 固定随队携带</span><strong>${weapons[3].name}</strong></div></div>
      <p class="deployment-draft" data-deploy-preview="status" role="status" aria-live="polite" aria-atomic="true"></p>
    </div>
  </div>
  <p id="menu-deploy-note" class="ui-muted">仅选择新战役的出发配置，不改动当前行动。特殊重武器与重锤仍需在章节内获取。</p>`;
  mountDeploymentPreview(host, weapons);
  return {value:()=>({primary:Number(host.querySelector('#menu-deploy-primary').value),throwable:host.querySelector('#menu-deploy-throwable').value})};
}
