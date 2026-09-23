import assert from 'node:assert/strict';
import {SESSION_BRIEFS,SESSION_STAMPS,DEFAULT_BRIEF,DEFAULT_STAMP,briefFor,stampFor} from '../src/session-brief.js';
import {MAP_IDS} from '../maps/registry.js';
// Every non-reactor map in the registry has a brief and a stamp; the reactor map keeps the overlay defaults.
{
 const others=MAP_IDS.filter(id=>id!=='reactor');
 assert.deepEqual(Object.keys(SESSION_BRIEFS).sort(),others.sort());
 assert.deepEqual(Object.keys(SESSION_STAMPS).sort(),others.sort());
 for(const id of others){
  const b=briefFor(id),s=stampFor(id);
  for(const k of ['title','brief','eyebrow','topstat'])assert.ok(b[k]&&b[k].length>0,`${id}.${k}`);
  assert.ok(b.title.includes('<span>'),`${id} title keeps the accent span`);
  assert.ok(/^NEON ECLIPSE \/ [A-Z]-\d\d$/.test(b.eyebrow),`${id} eyebrow ${b.eyebrow}`);
  assert.ok(/^CHAPTER \d\d \/ /.test(b.topstat),`${id} topstat ${b.topstat}`);
  assert.ok(s.html.startsWith('<strong>')&&s.html.includes('<span>'),`${id} stamp html`);
  assert.equal(s.className,`${id}-stamp`);
 }
}
// Unknown ids fall back to the defaults, and the defaults are frozen.
{
 assert.equal(briefFor('reactor'),DEFAULT_BRIEF);assert.equal(briefFor('nope'),DEFAULT_BRIEF);assert.equal(stampFor(undefined),DEFAULT_STAMP);
 assert.equal(DEFAULT_BRIEF.topstat,null);assert.equal(DEFAULT_BRIEF.eyebrow,'NEON ECLIPSE / SECTOR K-19');
 assert.ok(DEFAULT_STAMP.html.includes('SECTOR K'));assert.equal(DEFAULT_STAMP.className,null);
 assert.ok(Object.isFrozen(SESSION_BRIEFS)&&Object.isFrozen(DEFAULT_BRIEF));
}
console.log('session-brief rules ok');
import {WIN_COPY,DEFAULT_WIN_COPY,REPLAY_WIN_COPY,LOSS_COPY,outcomeTitle,outcomeBrief,journeyCompleteCopy,pauseCopy} from '../src/session-brief.js';
// Outcome copy: same strings the former inline app.js end()/pause() produced.
assert.equal(Object.keys(WIN_COPY).length,8);
assert.equal(outcomeTitle({win:true,runMode:'journey'}),'行动<span>撤离成功</span>');
assert.equal(outcomeTitle({win:true,runMode:'replay'}),'阶段<span>训练完成</span>');
assert.equal(outcomeTitle({win:false,runMode:'journey'}),'信号<span>连接中断</span>');
assert.equal(outcomeBrief({win:true,runMode:'journey',mapId:'polar',kills:12,time:125.9,stage:5}),'GLACIER 已沉入冰湖，小队离开极地雷达阵列。 击破 12 个目标 · 用时 2分5秒 · 阶段 5/5。');
assert.equal(outcomeBrief({win:true,runMode:'campaign',mapId:'reactor',kills:0,time:0,stage:5}),DEFAULT_WIN_COPY+' 击破 0 个目标 · 用时 0分0秒 · 阶段 5/5。');
assert.equal(outcomeBrief({win:true,runMode:'replay',mapId:'polar',kills:3,time:61,stage:2}),REPLAY_WIN_COPY+' 击破 3 个目标 · 用时 1分1秒 · 阶段 2/5。');
assert.equal(outcomeBrief({win:false,runMode:'journey',mapId:'train',kills:7,time:59,stage:3}),LOSS_COPY+' 击破 7 个目标 · 用时 0分59秒 · 阶段 3/5。');
const done=journeyCompleteCopy([{kills:2},{kills:3}]);assert.equal(done.title,'港口撤离<span>战役完成</span>');assert.match(done.brief,/共击破 5 个目标/);
assert.deepEqual(pauseCopy('守住信标'),{title:'行动<span>已暂停</span>',brief:'战场已冻结。当前目标：守住信标。',deploy:'继续当前战斗 ↗'});
console.log('session-brief outcome copy ok');
