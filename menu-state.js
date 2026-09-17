import {CHAPTERS} from './journey.js';
import {validCheckpoint} from './campaign.js';

export const HOME_MENU_ITEMS = Object.freeze([
  {id: 'menu-new', label: '新游戏', hint: '从第一章开始完整战役', icon: 'play'},
  {id: 'menu-continue', label: '继续游戏', hint: '暂无可继续的进度', icon: 'resume'},
  {id: 'menu-levels', label: '选择关卡', hint: '六个战场，独立探索', icon: 'levels'},
  {id: 'menu-achievements', label: '成就', hint: '单章挑战 · 星星收藏', icon: 'star'},
  {id: 'menu-settings', label: '设置', hint: '画面、界面与操作', icon: 'settings'}
].map(Object.freeze));

const themes = [
  ['K-19', 'REACTOR COMPLEX', '突破封锁，夺回反应堆。', '冷却装置 · 权限上传 · Warden', '#a2f5da'],
  ['U-02', 'UNDERGROUND TRANSIT', '穿过停靠列车，接通撤离线路。', '维护通道 · 站台交火 · 调度防守', '#8ed8ff'],
  ['A-03', 'SKYLINK ARRAY', '登上天穹枢纽，让信号重返城市。', '双中继 · 随机高压 · 枢纽监察者', '#d1b8ff'],
  ['C-04', 'CONTROL SPIRE', '逐层突破中枢塔，切断核心控制。', '三层空间 · 核心防守 · 升降机', '#f1d39d'],
  ['T-05', 'RUNAWAY FREIGHT', '登上疾驰列车，夺取最后的数据。', '五节车厢 · 车顶交火 · 控制链路', '#ffa684'],
  ['H-06', 'STORM HARBOR', '穿越风暴港口，为小队点亮信标。', '集装箱堆场 · 港务精英 · 登船撤离', '#83e4e7']
];
export const MENU_CHAPTERS = CHAPTERS.map((chapter, index) => Object.freeze({
  map: chapter.map, name: chapter.name, index, number: String(index + 1).padStart(2, '0'),
  sector: themes[index][0], english: themes[index][1], brief: themes[index][2],
  features: themes[index][3], color: themes[index][4]
}));
export const chapterInfo = map => MENU_CHAPTERS.find(chapter => chapter.map === map) || MENU_CHAPTERS[0];
export const nextChapter = map => MENU_CHAPTERS[chapterInfo(map).index + 1] || null;
export const chapterURL = (map, mode = 'campaign', entry = 'chapter') => {
  const chapter = MENU_CHAPTERS.find(item => item.map === map);
  if (!chapter) throw new Error('Unknown chapter');
  return '?map=' + chapter.map + (mode === 'journey' ? '&mode=journey' : '') + '&menu=' + entry;
};
export function formatPlayTime(seconds) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
}

const SINGLE_KEYS = ['campaign', 'station', 'roof', 'tower', 'train', 'harbor'].map(name => 'neon-eclipse.' + name + '.v1');
// Menu discovery is read-only. Never repair, migrate or delete a save while displaying it.
export function readSingleSlots(storage) {
  const slots = [];
  let error = false;
  if (!storage) return {slots, error: true};
  CHAPTERS.forEach((chapter, index) => {
    try {
      const text = storage.getItem(SINGLE_KEYS[index]);
      if (text == null) return;
      if (text.length >= 16384) { error = true; return; }
      const data = JSON.parse(text);
      if (!data || data.version !== 1 || !Number.isInteger(data.unlocked) || data.unlocked < 0 || data.unlocked > 4 ||
          (data.checkpoint !== null && !validCheckpoint(data.checkpoint, chapter.supplies))) {
        error = true; return;
      }
      if (data.checkpoint) slots.push({map: chapter.map, stage: data.checkpoint.stageIndex});
    } catch { error = true; }
  });
  return {slots, error};
}

export function continueTarget({state, mode, map, journey, checkpoint, slots = [], pending = false}) {
  if (pending) return {kind: 'pending', map, label: '章节结果待保存 · 点击重试'};
  if (state === 'paused') return {kind: 'session', map, label: '当前战斗已暂停 · 原地继续'};
  if (journey && journey.status !== 'complete') {
    const index = journey.status === 'between' ? journey.chapter + 1 : journey.chapter;
    return {kind: 'journey', map: MENU_CHAPTERS[index].map,
      label: (journey.status === 'between' ? '下一关 · ' : '战役 · ') + MENU_CHAPTERS[index].number + ' / ' + MENU_CHAPTERS[index].name};
  }
  const candidates = slots.map(slot => ({...slot}));
  if (checkpoint && !candidates.some(slot => slot.map === map)) candidates.unshift({map, stage: checkpoint.stageIndex});
  if (!candidates.length) return null;
  if (candidates.length > 1) return {kind: 'slots', label: candidates.length + ' 个单章检查点 · 选择继续'};
  const slot = candidates[0];
  return {kind: 'single', map: slot.map, label: '单章 · ' + chapterInfo(slot.map).name + ' / 阶段 ' + (slot.stage + 1)};
}

// A single primary action for every non-playing state. No DOM, storage writes or navigation here.
export function primaryAction({state, mode, map, journey, checkpoint, pending = false}, singlePreview = false) {
  if (singlePreview) return {kind: checkpoint ? 'continue-single' : 'start-single', label: checkpoint ? '继续本关' : '开始本关', map};
  if (pending) return {kind: 'save-result', label: chapterInfo(map).index === 5 ? '重试保存战役结果' : '保存结果并进入下一关', map};
  if (state === 'paused') return {kind: 'resume', label: '继续游戏', map};
  if (state === 'lost') return {kind: checkpoint ? 'retry' : 'restart', label: checkpoint ? '从检查点重试' : '重新开始本关', map};
  if (state === 'won' && mode === 'replay') return {kind: 'retry', label: '再次训练本阶段', map};
  if (mode === 'journey') {
    if (journey?.status === 'between') {
      const next = MENU_CHAPTERS[journey.chapter + 1];
      return {kind: 'advance', label: '进入下一关', map: next.map};
    }
    if (journey?.status === 'complete') return {kind: 'home', label: '返回主菜单', map};
    if (journey) return {kind: 'continue-journey', label: journey.checkpoint ? '继续游戏' : '开始本关', map: MENU_CHAPTERS[journey.chapter].map};
    return {kind: 'new-game', label: '开始新游戏', map: 'reactor'};
  }
  if (state === 'won') {
    const next = nextChapter(map);
    return next ? {kind: 'next-single', label: '进入下一关', map: next.map} : {kind: 'home', label: '返回主菜单', map};
  }
  return {kind: checkpoint ? 'continue-single' : 'start-single', label: checkpoint ? '继续本关' : '开始本关', map};
}
