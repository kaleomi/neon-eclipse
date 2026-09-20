import {CHAPTERS} from './journey.js';
import {validCheckpoint} from './campaign.js';
import {mapById} from './maps/registry.js';

export const HOME_MENU_ITEMS = Object.freeze([
  {id: 'menu-continue', label: '继续游戏', hint: '回到上次行动', icon: 'resume'},
  {id: 'menu-new', label: '新游戏', hint: '选择战备，开始新的行动', icon: 'play'},
  {id: 'menu-settings', label: '设置', hint: '画面、声音与操作', icon: 'settings'},
  {id: 'menu-achievements', label: '成就', hint: '荣誉、收藏与行动档案', icon: 'star'}
].map(Object.freeze));

// Presentation strings (sector code, English title, brief, feature line, accent color) live in maps/registry.js.
export const MENU_CHAPTERS = CHAPTERS.map((chapter, index) => {
  const entry = mapById(chapter.map);
  return Object.freeze({
    map: chapter.map, name: chapter.name, index, number: String(index + 1).padStart(2, '0'),
    sector: entry.code, english: entry.english, brief: entry.brief,
    features: entry.features, color: entry.color
  });
});
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

// Slot keys come from the registry (campaign.v1 for chapter 1 is historical).
const SINGLE_KEYS = CHAPTERS.map(chapter => mapById(chapter.map).saveKey);
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
  if (pending) return {kind: 'save-result', label: chapterInfo(map).index === MENU_CHAPTERS.length - 1 ? '重试保存战役结果' : '保存结果并进入下一关', map};
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
