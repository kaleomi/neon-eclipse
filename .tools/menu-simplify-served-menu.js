import {mountDeployment, deploymentFromSearch} from './menu-deployment.js';
import {createViewDeck} from './ui-navigation.js';
import {bindCombatDifficulty} from './combat-difficulty.js';
import {bindFlightPitchSetting} from './flight-settings.js';
import {bindSaveHub} from './save-hub-ui.js';
import {bindTelemetrySetting} from './telemetry.js';
import {bindAudioSettings} from './audio/audio-settings-ui.js';
import {bindKeyBindings, bindGamepadStatus, bindAccessibilitySettings, bindLanguageSetting} from './input-settings-ui.js';
import {createFlightRecordStore} from './flight-records-store.js';
import {vehicleEntryDecision} from './vehicle-entry.js';
import {HOME_MENU_ITEMS, MENU_CHAPTERS, chapterInfo, chapterURL, readSingleSlots, continueTarget, primaryAction, formatPlayTime} from './menu-state.js';
import {menuIcon, eclipseMark, chapterArtwork} from './menu-art.js';
import {briefing} from './cinematic-rules.js';

export function createGameMenu({overlay, journey, campaign, getSession, actions}) {
  const card = overlay.querySelector('.mission-card');
  let bindingEditor=null,settingsDeck=null;
  const cancelListening=()=>{if(bindingEditor?.listening)bindingEditor.cancel();};
  const find = selector => card.querySelector(selector);
  const original = {
    title: find('#session-title'), eyebrow: find('#session-eyebrow'), brief: find('#brief'), note: find('#lock-note'),
    deploy: find('#deploy'), controls: find('.controls'), levels: find('.level-menu'), campaign: find('.campaign-menu'),
    sensitivity: find('.sensitivity-setting'), aimMode: find('.aim-mode-setting'), quality: find('#quality'), motion: find('#hud-motion'),
    presentation: find('.presentation-controls'), report: find('.field-report'),
    achievements: find('.achievement-panel'), stars: find('#star-collection'), boss: find('#boss-battle-record')
  };
  overlay.classList.add('menu-shell');
  card.classList.add('menu-card');
  // All stateful components already hold their DOM references. Retire the old CSS layout hook.
  card.classList.remove('mission-card');
  card.replaceChildren();
  card.innerHTML = `
    <header class="menu-header">
      <div class="menu-brand">${eclipseMark}<span>NEON ECLIPSE<small>战术行动 · 本地进度</small></span></div>
      <div class="menu-header-meta"><span class="menu-status-dot"></span> <span class="menu-header-divider">/</span> ${MENU_CHAPTERS.length} 章战役</div>
    </header>
    <aside class="menu-rail" aria-label="菜单目录"><p class="ui-nav-caption">行动终端</p>
      <button type="button" data-open="home">${menuIcon('resume')}<span>总览</span></button>
      <button type="button" data-open="levels">${menuIcon('levels')}<span>章节行动</span></button>
      <button type="button" data-open="prepare">${menuIcon('play')}<span>新游戏 / 战备</span></button>
      <button type="button" data-open="settings">${menuIcon('settings')}<span>设置</span></button>
      <button type="button" data-open="achievements">${menuIcon('star')}<span>成就与收藏</span></button>
    </aside>
    <div class="menu-toolbar" hidden><button type="button" id="menu-back">${menuIcon('back')}<span>返回主菜单</span></button><span class="menu-breadcrumb"></span></div>
    <main class="menu-views">
    <div id="menu-notice" role="alert" hidden></div>
      <section class="menu-view menu-home" data-view="home" aria-label="主菜单">
        <div class="menu-home-copy">
          <p class="menu-eyebrow"><span></span> NEON ECLIPSE / 九章战役</p>
          <h1>穿越长夜，<br><span>让信号重返黎明。</span></h1>
          <p class="menu-home-intro">穿过失联的工业前线，重新接通信号。</p>
          <nav class="menu-home-actions" aria-label="游戏主菜单">
            ${HOME_MENU_ITEMS.map(item => `<button type="button" id="${item.id}" aria-label="${item.label}">${menuIcon(item.icon)}<span><b>${item.label}</b><small${item.id === 'menu-continue' ? ' id="menu-resume-description"' : ''}>${item.hint}</small></span>${menuIcon('arrow')}</button>`).join('')}
          </nav>
        </div>
        <div class="menu-home-scene" aria-hidden="true" data-map="${getSession().map}">
          <div class="menu-home-art" data-map="${getSession().map}">${chapterArtwork(getSession().map)}</div>
          <div class="menu-scene-caption"><span>THE CAMPAIGN</span><strong>长夜未尽，行动继续。</strong><p>从反应堆到极地前线 · 九个独立战场</p></div>
        </div>
      </section>
      <section class="menu-view menu-subpage menu-prepare" data-view="prepare" aria-labelledby="menu-prepare-title" hidden>
        <div class="menu-page-heading"><div><p class="menu-eyebrow">PREPARE / 01</p><h2 id="menu-prepare-title" tabindex="-1">准备出发</h2></div><p>先选战备，再开始。返回不会覆盖任何战役进度。</p></div>
        <div class="menu-deployment-brief"><span>九章连续战役</span><strong>从反应堆开始，穿越整条前线。</strong><p>主武器与投掷物由你选择，副武器和近战随队携带。</p></div>
        <div id="menu-deployment"></div>
        <div class="menu-deployment-actions"><button type="button" id="menu-begin" class="menu-primary">开始游戏 ${menuIcon('arrow')}</button><button type="button" id="menu-levels" class="menu-secondary">选择关卡 ${menuIcon('levels')}</button></div>
        <p class="ui-muted">选择关卡：独立章节、海陆空先遣与行动中枢。战备选择用于上方的新战役。</p>
      </section>
      <section class="menu-view menu-subpage" data-view="levels" aria-labelledby="menu-levels-title" hidden>
        <div class="menu-page-heading"><div><p class="menu-eyebrow">CHAPTER SELECT</p><h2 id="menu-levels-title" tabindex="-1">选择关卡</h2></div><p>选择一章开始。单章模式与连续战役分别保存。</p></div>
        <div class="menu-mode-grid" aria-label="其他行动模式"><button type="button" id="menu-rover" class="menu-mode-card"><small>FRONTIER / 海陆空</small><strong>海陆空先遣 ${menuIcon('arrow')}</strong><span>先遣队战役 · 独立任务 · 自由试驾</span></button><button type="button" data-menu-route="p4" class="menu-mode-card"><small>OPERATIONS / 挑战</small><strong>行动中枢 ${menuIcon('arrow')}</strong><span>重玩模式 · 挑战与个人档案</span></button></div>
        <h3 class="menu-section-label">主线战役 <span>九个独立章节</span></h3><div id="menu-level-grid"></div>
        <div class="menu-level-footer"><p>隐藏星星与荣誉跨重玩保留。探索路线不会阻挡主线。</p><button type="button" data-open="achievements" class="menu-text-button">${menuIcon('star')} 收藏与单章挑战</button></div>
        <details class="menu-training"><summary>当前关卡的阶段训练 <span>独立训练，不覆盖战役</span></summary><div id="menu-training-slot"></div></details>
      </section>
      <section class="menu-view menu-subpage" data-view="settings" aria-labelledby="menu-settings-title" hidden>
        <div class="menu-page-heading"><div><p class="menu-eyebrow">PREFERENCES</p><h2 id="menu-settings-title" tabindex="-1" data-i18n="settings.title">设置</h2></div><p>选择左侧分类，只查看当前需要的选项。</p></div>
        <div id="menu-settings-deck" class="ui-settings-deck">
          <section class="menu-settings-panel" data-settings-content="graphics"><h3>画面</h3><p class="ui-muted">渲染品质与场景表现。</p>
            <fieldset class="menu-quality"><legend>渲染质量</legend><div class="menu-quality-options">
              <label><input type="radio" name="menu-quality" value="0"><span>性能<small>更低渲染负载</small></span></label>
              <label><input type="radio" name="menu-quality" value="1"><span>均衡<small>推荐默认</small></span></label>
              <label><input type="radio" name="menu-quality" value="2"><span>精细<small>环境阴影</small></span></label>
            </div></fieldset><div class="menu-effects-slot"></div>
          </section>
          <section class="menu-settings-panel menu-audio-panel" data-settings-content="audio"><h3 data-i18n="settings.audio">声音</h3><p class="ui-muted">分开调整音乐、战斗与界面音效。</p><div id="menu-audio"></div></section>
          <section class="menu-settings-panel" data-settings-content="controls"><h3 data-i18n="settings.controls">操作</h3><div class="menu-sensitivity-slot"></div><div id="menu-flight-pitch"></div><div id="menu-gamepad"></div><details class="ui-control-guide"><summary>默认键位与鼠标锁定</summary><div class="menu-controls-slot"></div><p class="menu-setting-hint">进入战斗后锁定鼠标。Esc 暂停；无法锁定时可按住左键拖动瞄准。</p></details><div id="menu-bindings"></div></section>
          <section class="menu-settings-panel" data-settings-content="interface"><h3>界面与语言</h3><p class="ui-muted">HUD 大小、信息密度与动态效果。</p><div class="menu-motion-slot"></div><div class="menu-presentation-slot"></div><div id="menu-language"></div></section>
          <section class="menu-settings-panel" data-settings-content="accessibility"><div class="menu-a11y-panel" id="menu-a11y"></div></section>
          <section class="menu-settings-panel" data-settings-content="gameplay"><h3>游戏与难度</h3><div id="menu-combat-difficulty"></div><div class="ui-gameplay-links"><button type="button" data-menu-gear>装备管理 · U</button><button type="button" id="menu-field-kit">试点战地整备 · T</button></div><p class="menu-setting-hint">携带与正式改装在装备面板中分别管理，不混入画面或声音设置。</p></section>
          <section class="menu-settings-panel" data-settings-content="data"><h3>存档与数据</h3><p class="ui-muted">导入、导出与本地统计。危险操作沿用原有确认和校验。</p><div class="menu-save-hub" id="menu-save-hub"></div><details class="ui-telemetry-disclosure"><summary>本地战斗统计与清理</summary><div id="menu-telemetry"></div></details></section>
        </div>
        <div class="menu-page-bottom"><span data-i18n="settings.live">设置在当前界面直接生效</span><button type="button" data-back class="menu-secondary">完成设置 ${menuIcon('check')}</button></div>
      </section>
      <section class="menu-view menu-context" data-view="context" aria-labelledby="menu-context-title" hidden>
        <div class="menu-context-copy"><p id="menu-context-kicker" class="menu-eyebrow"></p><h2 id="menu-context-title" tabindex="-1"></h2><p id="menu-context-description"></p><div id="menu-result-stats" class="menu-result-stats"></div><div id="menu-briefing" class="menu-briefing" hidden></div><ol id="menu-chapter-track" class="menu-chapter-track" aria-label="战役章节进度"></ol></div>
        <div class="menu-context-preview"><div id="menu-context-art"></div><div class="menu-preview-label"><span id="menu-preview-tag"></span><strong id="menu-preview-name"></strong><small id="menu-preview-features"></small></div></div>
        <div class="menu-context-action"><div id="menu-primary-slot"></div><p id="menu-primary-note"></p><div class="menu-context-links">
          <button type="button" id="menu-context-restart" class="menu-text-button" hidden>从头重玩本关</button>
          <button type="button" id="menu-exit-training" class="menu-text-button" hidden>返回主行动</button>
          <button type="button" data-open="settings" class="menu-text-button">${menuIcon('settings')} 设置</button>
          <button type="button" data-open="records" class="menu-text-button">${menuIcon('resume')} 战斗记录</button>
          <button type="button" data-open="achievements" class="menu-text-button">${menuIcon('star')} 成就</button>
        </div></div>
      </section>
      <section class="menu-view menu-subpage" data-view="records" aria-labelledby="menu-records-title" hidden>
        <div class="menu-page-heading"><div><p class="menu-eyebrow">FIELD ARCHIVE</p><h2 id="menu-records-title" tabindex="-1">战斗记录</h2></div><p>查看本页行动记录，或导出 JSON 留作复盘。</p></div>
        <div class="menu-records-grid menu-records-only"><section><h3>本页战斗记录</h3><p class="menu-empty-report">开始一场行动后，可在暂停或结算时查看并导出本页报告。</p><div id="menu-field-slot"></div><div id="menu-boss-slot"></div></section></div>
        <div class="menu-page-bottom"><span>战斗报告与成就分别展示，原有数据不变。</span><button type="button" data-open="achievements" class="menu-secondary">${menuIcon('star')} 查看成就与收藏</button></div>
      </section>
      <section class="menu-view menu-subpage" data-view="achievements" aria-labelledby="menu-achievements-title" hidden>
        <div class="menu-page-heading"><div><p class="menu-eyebrow">HONORS & COLLECTIBLES</p><h2 id="menu-achievements-title" tabindex="-1">成就</h2></div><p>记录每一次突破。已获得的荣誉与星星跨重玩保留。</p></div>
        <div class="menu-archive-links"><button type="button" data-menu-route="archive" class="menu-secondary">行动档案 ${menuIcon('arrow')}</button><button type="button" data-open="records" class="menu-text-button">本次战斗记录 ${menuIcon('resume')}</button></div>
        <div class="menu-achievements-grid">
          <section class="menu-achievements-overview"><div class="menu-achievements-emblem" aria-hidden="true">${menuIcon('star')}</div><h3>星星收藏</h3><p class="menu-achievements-intro">每章寻找一颗隐藏星星，点亮「群星归航」。原有四星、五星版本已经获得的荣誉仍保留。</p><div id="menu-stars-slot"></div><div class="menu-challenge-map"><span>当前挑战关卡</span><strong id="menu-achievements-map"></strong><p>从本章起点一命完成，才计入单章挑战。选择其他章节不会清除已获得的荣誉。</p><button type="button" data-open="levels" class="menu-secondary">选择挑战关卡 ${menuIcon('arrow')}</button></div></section>
          <section class="menu-achievements-challenges"><h3>单章挑战</h3><div id="menu-achievements-slot"></div></section>
        </div>
      </section>
      <section class="menu-view menu-subpage menu-saves" data-view="saves" aria-labelledby="menu-saves-title" hidden>
        <div class="menu-page-heading"><div><p class="menu-eyebrow">RESUME OPERATION</p><h2 id="menu-saves-title" tabindex="-1">继续单章进度</h2></div><p>找到多个独立检查点。请选择要继续的关卡，不会重置其他记录。</p></div><div id="menu-save-list"></div>
      </section>
    </main>
    <footer class="menu-footer"><span><i></i> LOCAL PROGRESS <b>阶段入口自动保存</b></span><span class="menu-key-hints"><kbd>Tab</kbd> 选择 <kbd>Enter</kbd> 确认 <kbd>Esc</kbd> 返回</span></footer>
    <div class="menu-confirm" role="alertdialog" aria-modal="true" aria-labelledby="menu-confirm-title" aria-describedby="menu-confirm-description" hidden><div class="menu-confirm-card"><p class="menu-eyebrow">PLEASE CONFIRM</p><h2 id="menu-confirm-title"></h2><p id="menu-confirm-description"></p><p class="menu-confirm-error" role="alert" hidden></p><div><button type="button" id="menu-confirm-cancel" class="menu-secondary">取消</button><button type="button" id="menu-confirm-ok" class="menu-primary">确认继续 ${menuIcon('arrow')}</button></div></div></div>
    <div id="menu-legacy" hidden></div>`;

  const $ = selector => card.querySelector(selector);
  const mount = (selector, node) => { if (node) $(selector).append(node); };
  for (const node of [original.title, original.eyebrow, original.brief, original.note, original.quality]) mount('#menu-legacy', node);
  mount('#menu-primary-slot', original.deploy);
  original.deploy.className = 'menu-primary';
  original.deploy.type = 'button';
  mount('.menu-motion-slot', original.motion); mount('.menu-presentation-slot', original.presentation);
  mount('.menu-sensitivity-slot', original.sensitivity); mount('.menu-sensitivity-slot', original.aimMode); mount('.menu-controls-slot', original.controls);
  mount('#menu-training-slot', original.campaign); mount('#menu-field-slot', original.report);
  mount('#menu-stars-slot', original.stars); mount('#menu-achievements-slot', original.achievements); mount('#menu-boss-slot', original.boss);
  if (original.achievements) original.achievements.open = true;
  mount('#menu-level-grid', original.levels);
  original.levels.classList.add('menu-chapter-grid'); original.levels.replaceChildren();
  const map = getSession().map;
  for (const chapter of MENU_CHAPTERS) {
    const link = document.createElement('a'); link.href = chapterURL(chapter.map); link.dataset.map = chapter.map;
    link.style.setProperty('--chapter-color', chapter.color);
    link.setAttribute('aria-label', '第' + chapter.number + '章 ' + chapter.name);
    if (chapter.map === map) link.setAttribute('aria-current', 'page');
    link.innerHTML = `<div class="menu-level-art">${chapterArtwork(chapter.map)}<span>${chapter.sector}</span></div><div class="menu-level-copy"><small>CHAPTER ${chapter.number}${chapter.map === map ? '<em>当前关卡</em>' : ''}</small><strong>${chapter.name}</strong><p>${chapter.features}</p>${menuIcon('arrow')}</div>`;
    link.addEventListener('click', event => { event.preventDefault(); openChapter(chapter.map); });
    original.levels.append(link);
  }

  let view = 'home', history = [], intent = null, previousState = null, busy = false, resume = null;
  let slots = [], confirmation = null, previousFocus = null, previousQuality = null, artMap = null;
  let storage; try { storage = globalThis.localStorage; } catch { storage = null; }
  const views = [...card.querySelectorAll('[data-view]')];
  const deployment = mountDeployment($('#menu-deployment'));
  const labels = {home: '主菜单', prepare: '新游戏 / 战备', levels: '选择关卡', settings: '设置', context: '行动界面', records: '战斗记录', achievements: '成就', saves: '继续游戏'};
  function snapshot() {
    const session = {...getSession(), journey: journey.data};
    if (intent === 'single') return {...session, state: 'ready', mode: 'campaign', checkpoint: campaign.checkpoint};
    if (intent === 'journey') return {...session, state: 'ready', mode: 'journey', checkpoint: journey.data?.checkpoint || null};
    return session;
  }
  function show(next, options = {}) {
    if (next !== view && options.remember !== false) history.push({view, intent, focus: document.activeElement});
    if (options.intent !== undefined) intent = options.intent;
    view = next;
    if (next === 'home') { history = []; intent = null; }
    cancelListening(); clearError(); refresh(); overlay.scrollTop = 0; $('.menu-views').scrollTop=0;
    const focus = next === 'home' ? (resume ? $('#menu-continue') : $('#menu-new')) : next === 'context' ? original.deploy : $('[data-view="' + next + '"] h2');
    if(!document.querySelector('.carry-panel:not([hidden]),.field-kit-panel:not([hidden])'))focus?.focus({preventScroll:true});
  }
  function back() {
    cancelListening();
    const previous = history.pop();
    if (!previous) { show('home', {remember: false}); return; }
    intent = previous.intent; view = previous.view; clearError(); refresh();
    if (previous.focus?.isConnected && previous.focus.getClientRects().length) previous.focus.focus();
    else (view === 'context' ? original.deploy : $('#menu-new')).focus();
  }
  function error(message) {
    $('#menu-notice').textContent = message; $('#menu-notice').hidden = false;
    if (!$('.menu-confirm').hidden) { $('.menu-confirm-error').textContent = message; $('.menu-confirm-error').hidden = false; }
  }
  function clearError() { $('#menu-notice').hidden = true; $('.menu-confirm-error').hidden = true; }
  async function perform(action) {
    if (busy || getSession().navigating) return;
    busy = true; card.setAttribute('aria-busy', 'true'); original.deploy.disabled = true;
    try {
      const result = await action();
      if (result === false) return false;
      return true;
    } catch { error('操作未能完成，请重试。现有存档不会在这里被清除。'); return false; }
    finally { busy = false; card.removeAttribute('aria-busy'); refresh(); }
  }
  function closeConfirm() {
    $('.menu-confirm').hidden = true; confirmation = null;
    $('.menu-views').inert = false; $('.menu-header').inert = false; $('.menu-toolbar').inert = false; $('.menu-rail').inert=false;
    previousFocus?.focus();
  }
  function confirm(title, description, action, label = '确认继续') {
    cancelListening(); previousFocus = document.activeElement; confirmation = action;
    $('#menu-confirm-title').textContent = title; $('#menu-confirm-description').textContent = description;
    $('#menu-confirm-ok').innerHTML = label + menuIcon('arrow'); $('.menu-confirm-error').hidden = true;
    $('.menu-confirm').hidden = false; $('.menu-views').inert = true; $('.menu-header').inert = true; $('.menu-toolbar').inert = true; $('.menu-rail').inert=true;
    $('#menu-confirm-cancel').focus();
  }
  function requestNewGame() {
    if (getSession().pending) { show('context', {intent:null}); error('请先保存当前章节结果，再开始新游戏。'); return; }
    const choice = deployment.value();
    const start = () => perform(() => actions.newGame(choice));
    if (journey.data || getSession().pending || hasJourneyRecord()) {
      confirm('开始新的战役？', '这会替换当前九章战役进度。各关独立检查点、隐藏星星和已获得的荣誉不会重置。', start, '开始新游戏');
    } else start();
  }
  function hasJourneyRecord() {
    try { return [7, 6, 5, 4, 3, 2, 1].some(version => storage?.getItem('neon-eclipse.journey.v' + version) != null); }
    catch { return false; }
  }
  function openChapter(target, entry = 'chapter') {
    const action = () => {
      if (target === map) { show('context', {intent: 'single'}); return true; }
      return actions.openChapter(target, 'campaign', entry);
    };
    const session = getSession();
    if (session.pending) { show('context', {intent: null}); error('请先保存本章结果，再切换关卡。'); return; }
    if (target !== map && session.state === 'paused') {
      confirm('切换关卡？', session.pending ? '本章结果尚未保存。切换页面会丢失本页待保存结果，建议先返回结算重试保存。' : '切换后，当前战斗只能从最近的阶段入口恢复；星星、荣誉和已保存战役进度会保留。', () => perform(action), '确认切换');
    } else action();
  }
  function continueGame() {
    if (!resume) return;
    if (resume.kind === 'pending') { show('context', {intent: null}); return; }
    if (resume.kind === 'session') { perform(actions.resume); return; }
    if (resume.kind === 'slots') { show('saves'); return; }
    if (resume.kind === 'single') {
      if (resume.map === map) perform(actions.continueSingle);
      else openChapter(resume.map, 'continue');
      return;
    }
    if (journey.data?.status === 'between') { show('context', {intent: 'journey'}); return; }
    perform(actions.continueJourney);
  }
  function requestRestart() {
    const session = getSession();
    if (session.state === 'paused' && intent === null) {
      confirm('重试当前阶段？', '当前战斗会回到阶段入口。读档重试不会恢复本轮一命或纯刀挑战资格。', () => perform(actions.retry), '重试本阶段');
    } else confirm('从头重玩本关？', '这会替换本关独立检查点；连续战役、星星与荣誉记录不受影响。', () => perform(actions.startSingle), '从头开始本关');
  }
  function activatePrimary() {
    if (!$('.menu-confirm').hidden || view !== 'context') {
      if (view === 'home') continueGame();
      return;
    }
    const action = primaryAction(snapshot(), intent === 'single');
    if (action.kind === 'home') { show('home'); return; }
    if (action.kind === 'new-game') { show('prepare'); return; }
    if (action.kind === 'start-single') { perform(actions.startSingle); return; }
    if (action.kind === 'next-single') { perform(() => actions.openChapter(action.map, 'campaign', 'chapter')); return; }
    if (action.kind === 'restart') { perform(() => getSession().mode === 'journey' ? actions.continueJourney() : actions.startSingle()); return; }
    const callback = {
      resume: actions.resume, retry: actions.retry, 'continue-single': actions.continueSingle,
      'continue-journey': actions.continueJourney, advance: actions.continueJourney, 'save-result': actions.continueJourney
    }[action.kind];
    if (callback) perform(callback);
  }

  function renderContext() {
    const s = snapshot(), action = primaryAction(s, intent === 'single');
    const current = chapterInfo(s.map), target = chapterInfo(action.map);
    const advancing = ['advance', 'next-single'].includes(action.kind);
    const complete = s.mode === 'journey' && s.journey?.status === 'complete' && !s.pending;
    const paused = s.state === 'paused', lost = s.state === 'lost', training = s.mode === 'replay';
    const finished = advancing || complete || s.state === 'won';
    let kicker = (s.mode === 'journey' ? '连续战役' : '独立关卡') + ' / CHAPTER ' + target.number;
    let title = target.name, description = target.brief;
    if (advancing) {
      kicker = '第 ' + (s.mode === 'journey' ? String(s.journey.chapter + 1).padStart(2, '0') : current.number) + ' 章已完成 / NEXT CHAPTER';
      description = '下一站：' + target.name + '。' + target.brief + ' 进入后生命与弹药重新整备。';
    } else if (complete) { kicker = 'MISSION ACCOMPLISHED'; title = '九章战役完成'; description = '信号已送达，小队成功撤离。你的战役成绩、收藏和荣誉已保留。'; }
    else if (s.pending) { kicker = 'SAVE REQUIRED / 结果待保存'; title = '先保存，再继续'; description = '本章已完成，但战役结果尚未成功写入。请点击下方按钮重试；保存成功前不会进入下一关。'; }
    else if (paused) { kicker = 'OPERATION PAUSED / 行动暂停'; title = '行动已暂停'; description = '当前关卡：' + current.name + '。当前目标：' + s.stageTitle + '。'; }
    else if (lost) { kicker = 'SIGNAL LOST / 行动中断'; title = '重新集结，再次出发'; description = '从最近的阶段入口继续。读档重试不计本轮一命挑战，星星与已有荣誉保留。'; }
    else if (training && s.state === 'won') { kicker = 'TRAINING COMPLETE'; title = '阶段训练完成'; description = '训练不会覆盖主行动检查点，也不计完整单章挑战。'; }
    else if (s.state === 'won') { kicker = 'CHAPTER COMPLETE'; title = current.name + '完成'; description = '本次单章行动已结束。可返回主菜单，继续探索或挑战其他关卡。'; }
    $('#menu-context-kicker').textContent = kicker;
    $('#menu-context-title').textContent = title;
    $('#menu-context-description').textContent = description;
    const result = advancing && s.mode === 'journey' ? s.journey.results[s.journey.chapter] : null;
    let time = result?.time ?? s.time, kills = result?.kills ?? s.kills;
    if (complete) { time = s.journey.results.reduce((sum, item) => sum + item.time, 0); kills = s.journey.results.reduce((sum, item) => sum + item.kills, 0); }
    const stats = $('#menu-result-stats'); stats.hidden = !finished && !paused && !lost;
    stats.innerHTML = `<div><span>${complete ? '总行动用时' : '行动用时'}</span><strong>${formatPlayTime(time)}</strong></div><div><span>击破目标</span><strong>${Math.max(0, kills || 0)}<small>个</small></strong></div><div><span>${paused || lost ? '当前阶段' : '行动状态'}</span><strong class="menu-status-value">${paused || lost ? String(s.stage + 1).padStart(2, '0') + ' / ' + String(s.stageCount||5).padStart(2,'0') : complete ? MENU_CHAPTERS.length+' / '+MENU_CHAPTERS.length : training ? '训练完成' : '已完成'}</strong></div>`;
    const brief = $('#menu-briefing'), briefData = advancing ? briefing({mode: s.mode, journey: s.journey, current, next: target, result: result || {time: s.time, kills: s.kills}}) : null;
    brief.hidden = !briefData;
    if (briefData) {
      brief.innerHTML = `${briefData.report ? `<section data-briefing="report"><h4>${briefData.report.title}</h4><p>${briefData.report.text}</p></section>` : ''}<section data-briefing="threat"><h4>${briefData.threat.title}</h4><p>${briefData.threat.text}</p>${briefData.threat.boss ? `<small>BOSS · ${briefData.threat.boss}${briefData.threat.weather ? ' · 天气 ' + briefData.threat.weather : ''}</small>` : ''}</section>${briefData.totals ? `<section data-briefing="totals"><h4>战役累计</h4><p>${briefData.totals.chapters} 章 · ${formatPlayTime(briefData.totals.time)} · 击破 ${briefData.totals.kills}</p></section>` : ''}`;
    }
    const track = $('#menu-chapter-track'); track.hidden = s.mode !== 'journey' || training;
    track.replaceChildren();
    MENU_CHAPTERS.forEach(chapter => {
      const li = document.createElement('li'); li.textContent = chapter.number;
      li.dataset.status = complete || chapter.index < target.index ? 'done' : chapter.index === target.index ? 'current' : 'pending';
      li.setAttribute('aria-label', '第' + chapter.number + '章 ' + chapter.name + ' ' + ({done: '已完成', current: '当前目标', pending: '待进行'}[li.dataset.status]));
      if (chapter.index === target.index && !complete) li.setAttribute('aria-current', 'step');
      track.append(li);
    });
    if (artMap !== target.map) { $('#menu-context-art').innerHTML = chapterArtwork(target.map); artMap = target.map; }
    $('.menu-context-preview').style.setProperty('--chapter-color', target.color);
    $('.menu-context-preview').dataset.map = target.map;
    $('#menu-preview-tag').textContent = (advancing ? 'UP NEXT' : paused || lost ? 'CURRENT OPERATION' : complete ? 'CAMPAIGN COMPLETE' : 'OPERATION BRIEF') + ' / ' + target.sector;
    $('#menu-preview-name').textContent = target.name;
    $('#menu-preview-features').textContent = target.features;
    const loading = getSession().navigating;
    original.deploy.disabled = busy || loading;
    $('#menu-back').hidden = action.kind === 'home';
    original.deploy.setAttribute('aria-label', action.label);
    original.deploy.innerHTML = `<span>${loading ? '正在载入…' : action.label}<small>${advancing ? '第 ' + target.number + ' 章 · ' + target.name : paused ? '保留当前状态，原地继续' : complete ? '继续探索，或开启新的行动' : '点击此处继续'}</small></span>${menuIcon(complete ? 'back' : 'arrow')}`;
    $('#menu-primary-note').textContent = advancing ? '点击上方按钮直接前往下一关，无需再确认过场。' : s.pending ? '请勿关闭或刷新页面；也可在记录页导出本页战斗报告。' : paused ? '战场已冻结，返回设置不会重置当前战斗。' : complete ? '也可以在「选择关卡」中重玩，继续收集星星。' : s.mode === 'journey' ? '连续战役 · 在阶段入口保存进度' : '单章模式 · 不覆盖连续战役存档';
    $('#menu-context-restart').hidden = !(paused && s.checkpoint) && !(intent === 'single' && campaign.checkpoint);
    $('#menu-context-restart').textContent = paused ? '重试本阶段' : '从头重玩本关';
    $('#menu-exit-training').hidden = !training;
    $('.menu-context').dataset.outcome = complete || finished ? 'success' : lost || s.pending ? 'warning' : 'ready';
    $('.menu-context').dataset.context=paused?'paused':finished||lost||s.pending?'result':'brief';
  }
  function renderSaves() {
    const list = $('#menu-save-list'); list.replaceChildren();
    for (const slot of slots) {
      const chapter = chapterInfo(slot.map), button = document.createElement('button'); button.type = 'button'; button.className = 'menu-save-row';
      button.innerHTML = `<span class="menu-save-number">${chapter.number}</span><span><strong>${chapter.name}</strong><small>单章检查点 · 阶段 ${slot.stage + 1} / 5</small></span>${menuIcon('arrow')}`;
      button.addEventListener('click', () => slot.map === map ? perform(actions.continueSingle) : openChapter(slot.map, 'continue'));
      list.append(button);
    }
    if (!slots.length) list.textContent = '没有可读取的单章检查点。可以返回主菜单开始新游戏。';
  }
  function refresh() {
    const session = getSession();
    const discovered = readSingleSlots(storage); slots = discovered.slots;
    if (campaign.checkpoint && !slots.some(slot => slot.map === map)) slots.unshift({map, stage: campaign.checkpoint.stageIndex});
    resume = continueTarget({...session, journey: journey.data, checkpoint: campaign.checkpoint, slots});
    $('#menu-continue').disabled = !resume;
    $('#menu-resume-description').textContent = resume?.label || (discovered.error || !journey.persistent ? '存档暂不可读取 · 可先选择独立关卡' : journey.data?.status === 'complete' ? '战役已完成 · 可选择关卡重玩' : '暂无存档 · 请先开始新游戏');
    const homeActions = $('.menu-home-actions');
    homeActions.dataset.hasSave = String(!!resume);
    for (const button of homeActions.querySelectorAll('button')) button.dataset.homePrimary = String(button.id === (resume ? 'menu-continue' : 'menu-new'));
    $('#menu-begin').disabled = busy || !!session.navigating;
    views.forEach(section => { section.hidden = section.dataset.view !== view; section.inert = section.hidden; });
    $('.menu-toolbar').hidden = view === 'home';
    $('#menu-back').hidden = false;
    $('#menu-back span').textContent = '返回' + labels[history.at(-1)?.view || 'home'];
    $('.menu-breadcrumb').textContent = '主菜单 / ' + labels[view];
    overlay.dataset.menuView = view;
    card.querySelectorAll('.menu-rail [data-open]').forEach(b=>{const selected=b.dataset.open===view;b.setAttribute('aria-current',selected?'page':'false');});
    document.body.dataset.menuOpen = String(session.state !== 'playing');
    if (view === 'context') renderContext();
    if (view === 'saves') renderSaves();
    if (view === 'levels' && original.campaign) original.campaign.hidden = false;
    if (view === 'achievements') {
      const chapter = chapterInfo(map);
      $('#menu-achievements-map').textContent = '第 ' + chapter.number + ' 章 · ' + chapter.name;
    }
    if (view === 'records') {
      $('.menu-empty-report').hidden = !!original.report && !original.report.hidden;
      if (original.report) original.report.open = true;
    }
    syncQuality();
  }
  function syncQuality() {
    const quality = document.body.dataset.renderQuality;
    if (quality === previousQuality) return;
    previousQuality = quality;
    card.querySelectorAll('[name="menu-quality"]').forEach(input => { input.checked = input.value === quality; });
  }
  function update(state) {
    syncQuality();
    if (state === previousState) return;
    const first = previousState === null; previousState = state;
    document.body.dataset.menuOpen = String(state !== 'playing');
    if (state === 'playing') { cancelListening(); intent = null; closeConfirm(); return; }
    if (!first) { history = []; show('context', {intent: null, remember: false}); }
    else refresh();
  }

  $('#menu-new').addEventListener('click', () => show('prepare'));
  $('#menu-begin').addEventListener('click', requestNewGame);
  $('#menu-continue').addEventListener('click', continueGame);
  $('#menu-levels').addEventListener('click', () => show('levels'));
  $('#menu-rover').addEventListener('click', () => {
    const decision = vehicleEntryDecision(getSession());
    if (!decision.allowed) { show('context', {intent: null}); error(decision.message); return; }
    confirm(decision.title, decision.description, () => perform(() => { location.href = 'vehicle.html'; return true; }), '进入试验区');
  });
  $('#menu-achievements').addEventListener('click', () => show('achievements'));
  bindFlightPitchSetting($('#menu-flight-pitch'));
  bindCombatDifficulty($('#menu-combat-difficulty'));
  bindSaveHub($('#menu-save-hub'), {records: createFlightRecordStore(), onChanged: () => { if (getSession().state !== 'playing') refresh(); }});
  bindTelemetrySetting($('#menu-telemetry'), window.neonTelemetry);
  bindAudioSettings($('#menu-audio'), window.neonAudio);
  const t = (key, vars) => window.neonI18n ? window.neonI18n.t(key, vars) : key;
  bindingEditor=bindKeyBindings($('#menu-bindings'), window.neonInput?.bindings, {t});
  bindGamepadStatus($('#menu-gamepad'), window.neonInput?.gamepad, {t});
  bindAccessibilitySettings($('#menu-a11y'), window.neonA11y, {t});
  bindLanguageSetting($('#menu-language'), window.neonI18n);
  const health=$('[data-save-health]');if(health){const disclosure=document.createElement('details');disclosure.className='ui-save-health-disclosure';const summary=document.createElement('summary');summary.textContent='查看各存档槽位状态';health.before(disclosure);disclosure.append(summary,health);}
  const effects=original.presentation?.querySelector('.presentation-fx');if(effects)mount('.menu-effects-slot',effects);
  settingsDeck=createViewDeck({host:$('#menu-settings-deck'),id:'settings',orientation:'vertical',label:'设置分类',beforeChange:cancelListening,items:[
    ['graphics','画面','质量与场景表现'],['audio','声音','音乐与音效'],['controls','操作','鼠标、键位与手柄'],['interface','界面与语言','HUD 与显示语言'],['accessibility','辅助功能','色彩、形状与字幕'],['gameplay','游戏','难度与装备'],['data','存档与数据','备份与本地记录']
  ].map(([id,label,hint])=>({id,label,hint,content:$('[data-settings-content="'+id+'"]')}))});
  const equipment=()=>{cancelListening();actions.equipment?.();};card.querySelectorAll('#menu-equipment, [data-open-gear], [data-menu-gear]').forEach(btn=>btn.addEventListener('click',equipment));
  $('#menu-field-kit').disabled=!actions.fieldKitEnabled;$('#menu-field-kit').title=actions.fieldKitEnabled?'旧版战地整备试点，沿用原有生效规则':'本章未提供该试点';$('#menu-field-kit').addEventListener('click',()=>{cancelListening();actions.fieldKit?.();});
  card.querySelectorAll('[data-menu-route]').forEach(button=>button.addEventListener('click',()=>{
    cancelListening();if(button.dataset.menuRoute==='vehicle'){$('#menu-rover').click();return;}
    const dest=button.dataset.menuRoute==='p4'?['行动中枢','p4-hub.html']:['行动档案','operations-archive.html'];
    const session=getSession();if(session.pending){show('context',{intent:null});error('请先保存当前结果，再离开此页。');return;}
    const go=()=>{location.href=dest[1];return true;};if(session.state==='paused')confirm('前往'+dest[0]+'？','离开后只能从最近的已保存阶段继续，当前未保存战斗不会保留。',()=>perform(go),'确认前往');else go();
  }));
  window.neonI18n?.apply(card); window.neonI18n?.onChange(() => window.neonI18n.apply(card));
  $('#menu-settings').addEventListener('click', () => show('settings'));
  $('#menu-back').addEventListener('click', back);
  card.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', back));
  card.querySelectorAll('[data-home]').forEach(button => button.addEventListener('click', () => show('home')));
  card.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => show(button.dataset.open)));
  $('#menu-context-restart').addEventListener('click', requestRestart);
  $('#menu-exit-training').addEventListener('click', () => perform(actions.continueSingle));
  $('#menu-confirm-cancel').addEventListener('click', closeConfirm);
  $('#menu-confirm-ok').addEventListener('click', async () => {
    if (busy || !confirmation) return;
    const action = confirmation; const success = await action();
    if (success !== false) closeConfirm();
  });
  card.querySelectorAll('[name="menu-quality"]').forEach(input => input.addEventListener('change', () => actions.quality(Number(input.value))));
  overlay.addEventListener('keydown', event => {
    if (getSession().state === 'playing') return;
    event.stopPropagation();
    const dialogOpen = !$('.menu-confirm').hidden;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (dialogOpen) closeConfirm();
      else if (view === 'context' && getSession().state === 'paused' && intent === null) perform(actions.resume);
      else if (view !== 'home') back();
      return;
    }
    if (event.key === 'Tab') {
      const scope = dialogOpen ? $('.menu-confirm') : card;
      const focusable = [...scope.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),summary')].filter(node => node.getClientRects().length && !node.closest('[hidden],[inert]'));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('storage', () => { if (getSession().state !== 'playing') refresh(); });
  const entry = new URLSearchParams(location.search).get('menu');
  if (entry === 'chapter' || entry === 'continue') {
    view = 'context'; intent = getSession().mode === 'journey' ? 'journey' : 'single';
  }
  if(entry==='settings'){view='settings';intent=null;settingsDeck.select(new URLSearchParams(location.search).get('category')||'graphics');}
  if (entry === 'levels' || entry === 'achievements') view = entry;
  if (entry === 'prepare') view = 'prepare';
  const arrivingDeployment = entry === 'deploy' && deploymentFromSearch(location.search);
  if (arrivingDeployment && map === 'reactor' && journey.data?.chapter === 0 && journey.data?.status === 'active' && !journey.data?.checkpoint) { view = 'context'; intent = 'journey'; }
  refresh();
  if (arrivingDeployment && view === 'context') queueMicrotask(() => perform(actions.continueJourney));
  (view === 'context' ? original.deploy : view==='settings'?$('#menu-settings-title'):resume ? $('#menu-continue') : $('#menu-new')).focus({preventScroll: true});
  return {refresh, update, error, activatePrimary, home: () => show('home')};
}
