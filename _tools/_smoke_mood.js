#!/usr/bin/env node
/* Mood redesign + diet smoke test. Seeds mood & diet & media, verifies:
   - mood form has NO [name=tag] select, NO #moodGrid, HAS #moodEmojis
   - renderMood fills #moodEmojis with palette buttons (data-action=mood-emoji)
   - clicking a mood-emoji updates state.settings._moodEmoji + re-renders selected
   - submitting moodForm adds a record with data.emoji
   - mood timeline rows contain .delete-btn
   - moodToday shows emoji (no text)
   - diet list container exists (scroll CSS separate)
*/
const LINKEDOM = 'C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/linkedom';
const { parseHTML } = require(LINKEDOM);
const fs = require('fs');
const vm = require('vm');

const HTML_PATH = 'F:/workbuddy/工作台3/life-all-in-one.html';
const STORAGE_KEY = 'richangji-state-v1';
const html = fs.readFileSync(HTML_PATH, 'utf8');
const lines = html.split('\n');
let openIdx = -1, closeIdx = -1;
const SCRIPT_OPEN_RE = /<script[^>]*>/;
for (let i = 0; i < lines.length; i++) { if (SCRIPT_OPEN_RE.test(lines[i]) && !/<script[^>]+src=/.test(lines[i])) { openIdx = i; break; } }
for (let i = openIdx + 1; i < lines.length; i++) { if (/<\/script>/.test(lines[i])) { closeIdx = i; break; } }
const scriptSrc = lines.slice(openIdx + 1, closeIdx).join('\n');

function makeStorage() { const d = {}; return { _d: d, getItem(k) { return k in d ? d[k] : null; }, setItem(k, v) { d[k] = String(v); }, removeItem(k) { delete d[k]; }, clear() { for (const k in d) delete d[k]; }, key(i) { return Object.keys(d)[i] ?? null; }, get length() { return Object.keys(d).length; } }; }
const storage = makeStorage();

const today = '2026-09-04';
const seed = {
  version: 2,
  records: [
    { id:'m1', type:'mood', date: today, createdAt: 100, sample:false, remoteId:'', data:{score:5,tag:'开心',feeling:'',emoji:'🤩'} },
    { id:'m2', type:'mood', date: today, createdAt: 90, sample:false, remoteId:'', data:{score:3,tag:'平静',feeling:'',emoji:'😐'} },
    { id:'d1', type:'diet', date: today, createdAt: 1, sample:false, remoteId:'', data:{meal:'早餐',food:'燕麦',portion:'1 碗',calories:300,note:'加了坚果'} }
  ],
  mediaItems: [
    { id:'med1', name:'B电影', type:'电影', status:'看完', rating:4, review:'', date:'2026-08-01', cover:'', sample:false, createdAt: 200 },
    { id:'med2', name:'A剧', type:'剧', status:'想看', rating:0, review:'', date:'2026-09-01', cover:'', sample:false, createdAt: 100 }
  ],
  habits: [],
  settings: { mediaPageSize: 12, mediaPage: 1 }
};
storage.setItem(STORAGE_KEY, JSON.stringify(seed));

const full = parseHTML(html);
const w = full.window, doc = w.document;
w.scrollTo = () => {};
if (typeof w.matchMedia !== 'function') w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
if (typeof w.requestAnimationFrame !== 'function') { w.requestAnimationFrame = cb => setTimeout(cb,0); w.cancelAnimationFrame = clearTimeout; }
w.URL.createObjectURL = w.URL.createObjectURL || (() => 'blob:x'); w.URL.revokeObjectURL = w.URL.revokeObjectURL || (() => {});
w.alert = () => {}; w.confirm = () => true; w.prompt = () => null;
try { w.localStorage = storage; } catch (e) {}
if (!w.Image) w.Image = function () {};
if (w.HTMLSelectElement && w.HTMLSelectElement.prototype) { try {
  const optsOf = s => { const a=[], c=s.options; if (c && typeof c.length==='number'){ for(let i=0;i<c.length;i++) a.push(c[i]); } else { const q=s.querySelectorAll('option'); for(let i=0;i<q.length;i++) a.push(q[i]); } return a; };
  Object.defineProperty(w.HTMLSelectElement.prototype,'value',{ configurable:true,
    get(){ const o=this.selectedIndex!=null&&this.selectedIndex>=0?optsOf(this)[this.selectedIndex]:null; return o?(o.getAttribute('value')!=null?o.getAttribute('value'):(o.textContent||'').trim()):''; },
    set(v){ const o=optsOf(this),t=String(v==null?'':v); for(let i=0;i<o.length;i++){ const val=o[i].getAttribute('value')!=null?o[i].getAttribute('value'):(o.textContent||'').trim(); if(val===t){ this.selectedIndex=i; return; } } } });
} catch (e) {} }

const errors = [];
const sandbox = { window:w, document:doc, localStorage:storage,
  navigator:{ userAgent:'node', platform:'x', language:'zh-CN' },
  location: new URL('http://localhost/index.html'), history:{ replaceState(){} },
  console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON,
  crypto: require('crypto').webcrypto, parseInt, parseFloat, isNaN, String, Number, Boolean,
  Array, Object, RegExp, Error, Promise, Map, Set, Symbol, URL:w.URL, Intl,
  requestAnimationFrame:w.requestAnimationFrame, cancelAnimationFrame:w.cancelAnimationFrame,
  TextEncoder, TextDecoder, Blob, FormData, scrollTo:()=>{}, scrollBy:()=>{},
  __SMART_PAGE__: undefined
};
sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
try { vm.runInContext(scriptSrc, sandbox, { filename:'app.js' }); } catch (e) { errors.push('eval: '+((e&&e.stack)||e)); }
try { doc.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles:true })); } catch (e) { errors.push('domready: '+((e&&e.stack)||e)); }
const click = el => { try { el.dispatchEvent(new w.Event('click', { bubbles:true, cancelable:true })); } catch (e) { errors.push('click: '+((e&&e.stack)||e)); } };
const submit = el => { try { el.dispatchEvent(new w.Event('submit', { bubbles:true, cancelable:true })); } catch (e) { errors.push('submit: '+((e&&e.stack)||e)); } };

setTimeout(() => {
  const report = { ERRORS: errors.length?errors:'none' };
  const g = id => doc.getElementById(id);
  const moodForm = g('moodForm');
  report['no-tag-select'] = moodForm && !moodForm.querySelector('[name="tag"]') ? 'OK':'FAIL';
  report['no-moodGrid'] = !g('moodGrid') ? 'OK':'FAIL';
  report['has-moodEmojis'] = !!g('moodEmojis') ? 'OK':'FAIL';
  const emojis = g('moodEmojis');
  report['palette-rendered'] = emojis && emojis.querySelectorAll('[data-action="mood-emoji"]').length>0 ? 'OK('+emojis.querySelectorAll('[data-action="mood-emoji"]').length+')':'FAIL';
  const moodTotalBefore = g('moodTotal') ? g('moodTotal').textContent : '?';
  // pick an emoji -> re-render should mark it selected
  const pickBtn = emojis && emojis.querySelector('[data-emoji="🤗"]');
  if (pickBtn) click(pickBtn);
  const emojis2 = g('moodEmojis');
  const selBtn = emojis2 && emojis2.querySelector('[data-emoji="🤗"]');
  report['pick-selected-class'] = selBtn && selBtn.classList.contains('selected') ? 'OK':'FAIL';
  // submit mood form (fill date + feeling)
  if (moodForm) {
    const date = moodForm.querySelector('[name="date"]'); if(date) date.value=today;
    const feeling = moodForm.querySelector('[name="feeling"]'); if(feeling) feeling.value='测试';
    submit(moodForm);
  }
  const moodTotalAfter = g('moodTotal') ? g('moodTotal').textContent : '?';
  report['submit-adds-record'] = (Number(moodTotalAfter)===Number(moodTotalBefore)+1) ? 'OK('+moodTotalBefore+'->'+moodTotalAfter+')':'FAIL('+moodTotalBefore+'->'+moodTotalAfter+')';
  const stAfter = storage.getItem(STORAGE_KEY);
  const sa = stAfter ? JSON.parse(stAfter) : null;
  const moodRecs = sa && sa.records ? sa.records.filter(r=>r.type==='mood') : [];
  report['persisted-mood-count'] = moodRecs.length;
  report['has-feeling-record'] = sa && sa.records && sa.records.some(r=>r.type==='mood' && r.data && r.data.feeling==='测试') ? 'OK':'FAIL';
  // mood timeline delete buttons
  const moodList = g('moodList');
  const delBtns = moodList ? moodList.querySelectorAll('.delete-btn') : [];
  report['mood-timeline-delete'] = delBtns.length>0 ? 'OK('+delBtns.length+')':'FAIL';
  // moodToday emoji-only
  const moodToday = g('moodToday');
  report['mood-today-emoji'] = moodToday && (moodToday.textContent||'').indexOf('🤩')>=0 && (moodToday.textContent||'').indexOf('开心')<0 ? 'OK':'FAIL:'+(moodToday?moodToday.textContent:'null');
  // no mood text in timeline
  report['timeline-no-tag-text'] = moodList && !/平静|开心|低落|焦虑|疲惫/.test(moodList.textContent||'') ? 'OK':'FAIL';
  // diet delete buttons present
  const dietList = g('dietList');
  const dietDel = dietList ? dietList.querySelectorAll('.delete-btn').length : 0;
  report['diet-has-delete'] = dietDel>0 ? 'OK('+dietDel+')':'FAIL';
  // media order: first card should be the newest by record date -> A剧 2026-09-01, unless in view. Just confirm mediaCollection rendered sorted desc by date
  const mc = g('mediaCollection');
  if (mc) {
    const h3 = mc.querySelectorAll('.media-card-body h3');
    report['media-first-newest'] = h3 && h3.length && (h3[0].textContent||'').indexOf('A剧')>=0 ? 'OK':'FAIL';
  }
  console.log('===== DOM SMOKE (mood/diet/media) =====');
  console.log(JSON.stringify(report,null,2));
  process.exit(report['ERRORS']==='none'?0:1);
}, 500);
