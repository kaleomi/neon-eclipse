import assert from 'node:assert/strict';
import {SESSION_BRIEFS,SESSION_STAMPS,DEFAULT_BRIEF,DEFAULT_STAMP,briefFor,stampFor} from './session-brief.js';
import {MAP_IDS} from './maps/registry.js';
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
