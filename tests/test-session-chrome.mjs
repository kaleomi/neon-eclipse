import assert from 'node:assert/strict';
import {createSessionChrome,streakLabel,headingLabel,NOTICE_SECONDS,DAMAGE_SECONDS,STREAK_SECONDS} from '../src/session-chrome.js';
// Minimal DOM double: enough for createElement / append / querySelector by id or class.
function fakeDocument(){
 const all=[];
 const make=tag=>{const el={tag,children:[],dataset:{},style:{},classes:new Set(),_html:'',textContent:'',id:'',className:'',
  get innerHTML(){return this._html;},set innerHTML(v){this._html=v;this.firstChild={textContent:v.replace(/<[^>]+>/g,'')};},
  append(...c){for(const x of c){this.children.push(x);all.push(x);}},
  setAttribute(k,v){this[k]=v;},get classList(){const self=this;return {add(c){self.classes.add(c);}};}};
  return el;};
 const body=make('body');
 const find=sel=>{if(sel.startsWith('#'))return all.find(e=>e.id===sel.slice(1))||null;if(sel.startsWith('.'))return all.find(e=>e.className===sel.slice(1)||e.classes.has(sel.slice(1)))||null;return null;};
 return {body,createElement:make,querySelector:find,all};
}
// Mission card is appended first with the default copy; applyBrief swaps in the per-map copy (ids come from the overlay markup,
// so the fake resolves them by scanning the appended stubs we create here).
{
 const doc=fakeDocument();
 const chrome=createSessionChrome({mapId:'polar',document:doc});
 assert.equal(doc.body.children[0].className,'mission-overlay');
 assert.ok(chrome.overlay.innerHTML.includes('id="deploy"')&&chrome.overlay.innerHTML.includes('SECTOR K-19'));
 for(const [id,cls] of [['session-title'],['brief'],['session-eyebrow'],[null,'topstat'],[null,'mission-card']]){const el=doc.createElement('div');if(id)el.id=id;if(cls)el.className=cls;doc.body.append(el);}
 chrome.applyBrief();
 assert.equal(doc.querySelector('#session-eyebrow').textContent,'NEON ECLIPSE / P-09');
 assert.ok(doc.querySelector('.topstat').textContent.startsWith('CHAPTER 09'));
 chrome.mount();
 const order=doc.body.children.slice(-5).map(e=>e.className.split(' ')[0]);
 assert.deepEqual(order,['art-stamp','compass','toast','damage-screen','hitmarker']);
 assert.ok(chrome.stamp.classes.has('polar-stamp')&&chrome.stamp.innerHTML.includes('POLAR ARRAY'));
 assert.equal(chrome.hit.textContent,'×');
 const q=chrome.createQualityButton();assert.equal(q.id,'quality');assert.equal(doc.querySelector('.mission-card').children.at(-1),q);
 chrome.mountStreakBanner();assert.equal(doc.body.children.at(-1).className,'streak-banner');
}
// Reactor map keeps the defaults: applyBrief is a no-op, stamp has no extra class.
{
 const doc=fakeDocument();const chrome=createSessionChrome({mapId:'reactor',document:doc});
 chrome.applyBrief();chrome.mount();
 assert.equal(chrome.stamp.classes.size,0);assert.ok(chrome.stamp.innerHTML.includes('SECTOR K'));
}
// Timers: notify 3 s, damage .3 s, hitmarker custom, streak 1.6 s; update(dt) decays and drives opacity / dataset exactly as app.js did.
{
 const doc=fakeDocument();const c=createSessionChrome({mapId:'train',document:doc});c.mount();c.mountStreakBanner();
 c.notify('hello');assert.equal(c.toast.textContent,'hello');assert.equal(c.noticeVisible(),true);assert.equal(c.timers().toastTime,NOTICE_SECONDS);
 c.flashDamage();c.flashHit(.25);c.showStreak(5);
 assert.deepEqual(c.timers(),{toastTime:3,damageTime:DAMAGE_SECONDS,hitTime:.25,streakTime:STREAK_SECONDS});
 assert.equal(c.streakBanner.textContent,'连续击破 ×5 // 压制');assert.equal(c.streakBanner.dataset.step,'5');assert.equal(c.streakBanner.dataset.show,'true');
 c.update(.1);
 assert.equal(c.toast.style.opacity,'1');assert.ok(Math.abs(c.damageScreen.style.opacity-.4)<1e-9);assert.equal(c.hit.style.opacity,'1');
 c.update(.2);assert.equal(c.hit.style.opacity,'0');assert.equal(c.damageScreen.style.opacity,0);
 c.update(1.4);assert.equal(c.streakBanner.dataset.show,'false');assert.equal(c.noticeVisible(),true);
 c.update(1.5);assert.equal(c.noticeVisible(),false);assert.equal(c.toast.style.opacity,'0');
 const before=c.timers().streakTime;c.showStreak(0);assert.equal(c.timers().streakTime,before,'step 0 ignored');
 assert.equal(streakLabel(3),'连续击破 ×3');assert.equal(streakLabel(12),'连续击破 ×10 // 清场');
}
// Compass: yaw is negated and rounded to whole degrees, eight sectors.
{
 assert.equal(headingLabel(0),'000° / N');assert.equal(headingLabel(-Math.PI/2),'090° / E');assert.equal(headingLabel(Math.PI/2),'270° / W');
 assert.equal(headingLabel(-Math.PI/4),'045° / NE');assert.equal(headingLabel(Math.PI),'180° / S');assert.equal(headingLabel(-Math.PI*1.99),'358° / N');
 const doc=fakeDocument();const c=createSessionChrome({mapId:'roof',document:doc});c.mount();c.setHeading(-Math.PI/2);assert.equal(c.compass.firstChild.textContent,'090° / E');
}
console.log('session-chrome rules ok');
