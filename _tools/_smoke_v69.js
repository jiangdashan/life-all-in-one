/* v69 冒烟测试
 *  1) 使用频率：渲染含物品名称 + 移动端两行布局 CSS 存在
 *  2) 番茄时钟：面板存在、切换时长、结束把时长填入学习表单、今日计数
 *  3) 未来日程：创建当天记「未来日程 · X月X日」，完成时刻才记完成记录
 *  4) 档案视图：当日时间线 / 本周周历 / 本月月历 / 本年汇总
 *  5) 重复日程：默认不自动塞进四象限；清单里置顶回显「该安排了」
 */
const LINKEDOM = 'C:/Users/依易亦奕鸭/.workbuddy/binaries/node/workspace/node_modules/linkedom';
const { parseHTML } = require(LINKEDOM);
const fs = require('fs'); const vm = require('vm');
const html = fs.readFileSync('D:/workbuddyProjects/工作台3/life-all-in-one.html', 'utf8');
const lines = html.split('\n');
let oi = -1, ci = -1;
for (let i = 0; i < lines.length; i++) { if (/<script[^>]*>/.test(lines[i]) && !/<script[^>]+src=/.test(lines[i])) { oi = i; break; } }
for (let i = oi + 1; i < lines.length; i++) { if (/<\/script>/.test(lines[i])) { ci = i; break; } }
const src = lines.slice(oi + 1, ci).join('\n');
function mkStorage() { const d = {}; return { _d: d, getItem: k => k in d ? d[k] : null, setItem: (k, v) => { d[k] = String(v); }, removeItem: k => { delete d[k]; }, clear() { for (const k in d) delete d[k]; }, key: i => Object.keys(d)[i] ?? null, get length() { return Object.keys(d).length; } }; }
const storage = mkStorage();
const full = parseHTML(html); const w = full.window, doc = w.document;
const _origGetById = doc.getElementById.bind(doc);
function mkDummySelect() { return { value: '', textContent: '', innerHTML: '', style: {}, hidden: false, disabled: false, classList: { add() { }, remove() { }, toggle() { }, contains: () => false }, addEventListener() { }, removeEventListener() { }, setAttribute() { }, getAttribute: () => null, querySelectorAll: () => [], appendChild() { }, closest: () => null, options: [], selectedIndex: -1 }; }
doc.getElementById = function (id) { if (id === 'mediaStatusFilter' || id === 'mediaRatingFilter' || id === 'mediaTypeFilter') return mkDummySelect(); return _origGetById(id); };
w.scrollTo = () => { }; w.__TESTING__ = true;
const _session = {}; w.sessionStorage = { getItem: k => k in _session ? _session[k] : null, setItem: (k, v) => { _session[k] = String(v); }, removeItem: k => { delete _session[k]; }, clear() { for (const k in _session) delete _session[k]; }, key: i => Object.keys(_session)[i] ?? null, get length() { return Object.keys(_session).length; } };
let MM = { standalone: false, narrow: true };
w.matchMedia = q => ({ matches: q.indexOf('standalone') >= 0 ? MM.standalone : MM.narrow, addListener() { }, removeListener() { }, addEventListener() { }, removeEventListener() { } });
if (typeof w.requestAnimationFrame !== 'function') { w.requestAnimationFrame = cb => setTimeout(cb, 0); w.cancelAnimationFrame = clearTimeout; }
w.URL.createObjectURL = w.URL.createObjectURL || (() => 'blob:x'); w.URL.revokeObjectURL = w.URL.revokeObjectURL || (() => { });
w.alert = () => { }; w.confirm = () => true; w.prompt = () => null;
try { w.localStorage = storage; } catch (e) { }
if (!w.Image) w.Image = function () { };
try {
  Object.defineProperty(Object.getPrototypeOf(doc.createElement('form')), 'elements', {
    get() {
      const list = this.querySelectorAll('[name]');
      const obj = { length: list.length };
      for (const el of list) { obj[el.name] = el; }
      return obj;
    }
  });
} catch (e) { }
w.FormData = class { constructor(f) { this._f = f; this._m = new Map(); if (f) { const els = f.querySelectorAll('[name]'); for (const el of els) { const t = (el.type || '').toLowerCase(); if (t === 'radio') { if (el.checked) this._m.set(el.name, el.value); } else if (t === 'checkbox') { if (el.checked) this._m.set(el.name, 'on'); } else { this._m.set(el.name, el.value || ''); } } } } get(k) { return this._m.has(k) ? this._m.get(k) : null; } entries() { return [...this._m.entries()]; } };

const CLOUD = { rows: [] };
let nextId = 1;
w.__SMART_PAGE__ = {
  database: {
    query: async function ({ databaseId, pageSize, startCursor }) { const arr = CLOUD.rows.filter(r => r.__db === databaseId); const start = startCursor ? parseInt(startCursor, 10) || 0 : 0; return { results: arr.slice(start, start + pageSize), hasMore: false, nextCursor: null }; },
    addRecord: async function ({ databaseId, properties }) { const row = { __db: databaseId, _id: 'cid' + (nextId++), userId: properties.userId ? properties.userId.text : undefined }; Object.keys(properties).forEach(k => { row[k] = properties[k] && properties[k].text !== undefined ? properties[k].text : (properties[k] || {}).number; }); CLOUD.rows.push(row); return { _id: row._id }; },
    updateRecord: async function ({ databaseId, recordId, properties }) { const row = CLOUD.rows.filter(r => r._id === recordId)[0]; if (!row) return {}; Object.keys(properties).forEach(k => { row[k] = properties[k] && properties[k].text !== undefined ? properties[k].text : undefined; }); return {}; },
    deleteRecord: async function ({ recordId }) { CLOUD.rows = CLOUD.rows.filter(r => r._id !== recordId); return {}; },
    getSchema: async () => ({ properties: [] })
  }
};
const navStub = { userAgent: 'node', platform: 'x', language: 'zh-CN' };
const sandbox = { sessionStorage: w.sessionStorage, window: w, document: doc, localStorage: storage, FormData: w.FormData, __SMART_PAGE__: w.__SMART_PAGE__, navigator: navStub, location: new w.URL('http://localhost/index.html'), history: { replaceState() { } }, console: { log: () => { }, warn: () => { }, error: () => { } }, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, crypto: require('crypto').webcrypto, parseInt, parseFloat, isNaN, String, Number, Boolean, Array, Object, RegExp, Error, Promise, Map, Set, Symbol, URL: w.URL, Intl, require, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView };
sandbox.globalThis = sandbox; sandbox.self = sandbox; sandbox.scrollTo = () => { };
vm.createContext(sandbox);

const P = { pass: 0, fail: 0 };
const ok = (name, cond) => { if (cond) { P.pass++; console.log('  PASS  ' + name); } else { P.fail++; console.log('  FAIL  ' + name); } };

let loadErr = '';
try { vm.runInContext(src, sandbox, { filename: 'app.js' }); } catch (e) { loadErr = e.message; }
ok('0 脚本加载不抛错', !loadErr);
if (loadErr) { console.log(loadErr); process.exit(1); }

const tick = () => new Promise(r => setTimeout(r, 30));

(async function () {
  try { doc.dispatchEvent(new w.Event('DOMContentLoaded')); } catch (e) { ok('1 init 不抛错', false); console.log(e.message); }
  ok('1 init 不抛错', true);
  await tick(); await tick(); await tick();

  const T = w.__appTest;
  ok('2 新函数已导出', ['_archiveWeekHtml', '_archiveMonthHtml', '_archiveYearHtml', 'pomoSetLen', 'pomoFinish', 'analyzePlannerRepeats', 'renderPlannerRepeats', 'maybeAutoNextRepeat'].every(k => typeof T[k] === 'function'));

  // ---------- 1. 使用频率名称 ----------
  ok('1a 窄屏两行布局 CSS 已加', html.indexOf('@media(max-width:560px){.freq-row{grid-template-columns:22px minmax(0,1fr)') > 0);
  const freqEl = doc.getElementById('storageFreqList');
  T.state.records = [
    { id: 'i1', type: 'storage', date: '2026-09-20', createdAt: 1, sample: false, data: { name: '抽纸', category: '日用品', quantity: 3, unit: '包' } },
    { id: 'i2', type: 'storage', date: '2026-09-20', createdAt: 2, sample: false, data: { name: '洗衣液', category: '日用品', quantity: 1, unit: '瓶' } }
  ];
  T.state.settings.storageUsage = { i1: { n: 5, first: '2026-09-10', last: '2026-09-19', m: { '2026-09': 5 } }, i2: { n: 2, first: '2026-09-12', last: '2026-09-18', m: { '2026-09': 2 } } };
  T.renderStorage();
  const fh = freqEl ? freqEl.innerHTML : '';
  ok('1b 频率列表回显物品名称', fh.indexOf('抽纸') >= 0 && fh.indexOf('洗衣液') >= 0);
  ok('1c 排序按频率（抽纸在前）', fh.indexOf('抽纸') < fh.indexOf('洗衣液'));
  ok('1d 空名兜底不崩溃', (function () { T.state.records = [{ id: 'i3', type: 'storage', date: '2026-09-20', createdAt: 3, sample: false, data: { name: '', category: '日用品', quantity: 1 } }]; T.state.settings.storageUsage = { i3: { n: 1, first: '2026-09-20', last: '2026-09-20', m: {} } }; T.renderStorage(); return (freqEl.innerHTML || '').indexOf('未命名物品') >= 0; })());

  // ---------- 2. 番茄时钟 ----------
  ok('2a 番茄面板 DOM 存在', !!doc.getElementById('pomoClock') && !!doc.getElementById('pomoStart') && !!doc.getElementById('pomoLen'));
  T.pomoSetLen(45);
  ok('2b 切换时长后显示 45:00', doc.getElementById('pomoClock').textContent === '45:00');
  T.pomoSetLen(25);
  ok('2c 切回 25 分钟', doc.getElementById('pomoClock').textContent === '25:00');
  const sf = doc.getElementById('studyForm');
  if (sf && sf.elements.minutes) sf.elements.minutes.value = '';
  T._pomo.left = 0;              /* 模拟倒计时归零 */
  T.pomoFinish();
  ok('2d 结束后把时长填入学习表单', !!(sf && sf.elements.minutes && String(sf.elements.minutes.value) === '25'));
  ok('2e 结束状态文案', (doc.getElementById('pomoState').textContent || '').indexOf('本轮专注完成') >= 0);
  ok('2f 今日番茄计数已累积', Object.keys(T.state.settings.pomoDays || {}).some(function (k) { return (T.state.settings.pomoDays[k] || {}).n >= 1; }));

  // ---------- 3. 未来日程归档语义 ----------
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const today = new Date(), y = today.getFullYear(), mo = today.getMonth(), da = today.getDate();
  const dstr = y + '-' + pad(mo + 1) + '-' + pad(da);
  const at = h => new Date(y, mo, da, h, 5).getTime();
  const futureDate = (function () { const d = new Date(y, mo, da + 5); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); })();
  T.state.records = [
    { id: 'p1', type: 'planner', date: futureDate, createdAt: at(10), sample: false, data: { title: '体检预约', time: '09:00', priority: 'normal', list: '个人', note: '', remind: false, done: false } }
  ];
  T.state.mediaItems = []; T.state.habits = [];
  let evs = T._buildTimelineEvents();
  const p1ev = evs.filter(e => e.type === 'planner');
  ok('3a 未来日程归档到「创建当天」', p1ev.length === 1 && p1ev[0].date === dstr);
  ok('3b 标注为未来日程', p1ev[0].value === '未来日程' && (p1ev[0].detail || '').indexOf('未来日程') === 0);
  ok('3c 不再提前占坑到未来日期', !p1ev.some(e => e.date === futureDate));
  ok('3d 未完成时没有完成记录', !p1ev.some(e => (e.detail || '').indexOf('完成了这条日程') >= 0));
  T.state.records[0].data.done = true; T.state.records[0].data.doneAt = at(15);
  evs = T._buildTimelineEvents();
  const doneEv = evs.filter(e => e.type === 'planner' && (e.detail || '').indexOf('完成了这条日程') >= 0);
  ok('3e 完成后在「完成时刻」记一条', doneEv.length === 1 && doneEv[0].date === dstr && doneEv[0].value === '已完成');
  ok('3f 完成记录排在当天 15 点', (function () { const d = new Date(doneEv[0].at); return d.getHours() === 15; })());

  // ---------- 4. 档案四档视图 ----------
  const mkEv = (date, hour, title) => ({ date: date, at: hour == null ? 0 : new Date(date + 'T' + pad(hour) + ':05:00').getTime(), type: 'money', label: '财务', icon: 'i-money', tone: 'plum', title: '<span>' + title + '</span>', detail: 'x', value: '' });
  const weekEv = [mkEv(dstr, 10, '上午的事'), mkEv(dstr, null, '全天的事')];
  const wh = T._archiveWeekHtml(weekEv);
  ok('4a 周历容器', wh.indexOf('arch-week-head') >= 0 && wh.indexOf('arch-week-body') >= 0);
  ok('4b 周历 7 天列', (wh.match(/class="aw-col/g) || []).length === 7);
  ok('4c 周历含时刻事件块', wh.indexOf('aw-ev') >= 0 && wh.indexOf('上午的事') >= 0);
  ok('4d 周历无时刻归入全天区', wh.indexOf('aw-allday') >= 0 && wh.indexOf('全天的事') >= 0);
  const mh = T._archiveMonthHtml(weekEv);
  ok('4e 月历网格', mh.indexOf('arch-month-grid') >= 0);
  ok('4f 月历 42 格', (mh.match(/class="am-cell/g) || []).length === 42);
  ok('4g 月历含今日事件', mh.indexOf('上午的事') >= 0);
  const yh = T._archiveYearHtml(weekEv);
  ok('4h 年汇总：总览卡片', yh.indexOf('ay-summary') >= 0 && yh.indexOf('年记录') >= 0);
  ok('4i 年汇总：12 个月节奏', (yh.match(/class="ay-month"/g) || []).length === 12);
  ok('4j 年汇总：类型分布', yh.indexOf('ay-type') >= 0);
  // renderArchive 分档
  T.state.settings.archiveRange = 'day'; T.state.settings.archiveFilter = 'all';
  T.state.records = [{ id: 'm1', type: 'money', date: dstr, createdAt: at(9), sample: false, data: { flow: 'expense', amount: 12, category: '吃饭', note: '早饭' } }];
  T.renderArchive();
  let ah = doc.getElementById('archiveList').innerHTML;
  ok('4k 默认当日 = 时间线', ah.indexOf('class="timeline"') >= 0 && ah.indexOf('tl-clock') >= 0);
  T.state.settings.archiveRange = 'week'; T.renderArchive();
  ah = doc.getElementById('archiveList').innerHTML;
  ok('4l 本周 = 周历', ah.indexOf('arch-week') >= 0);
  T.state.settings.archiveRange = 'month'; T.renderArchive();
  ah = doc.getElementById('archiveList').innerHTML;
  ok('4m 本月 = 月历', ah.indexOf('arch-month') >= 0);
  T.state.settings.archiveRange = 'year'; T.renderArchive();
  ah = doc.getElementById('archiveList').innerHTML;
  ok('4n 本年 = 汇总', ah.indexOf('arch-year') >= 0);

  // ---------- 5. 重复日程 ----------
  const dayMs = 86400000;
  const past1 = new Date(Date.now() - 30 * dayMs), past2 = new Date(Date.now() - 10 * dayMs);
  const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  T.state.records = [
    { id: 'r1', type: 'planner', date: isoOf(past1), createdAt: past1.getTime(), sample: false, data: { title: '交房租', time: '', priority: 'high', list: '生活', note: '', remind: false, done: true, doneAt: past1.getTime() + 3600000, quadrant: '重要紧急' } },
    { id: 'r2', type: 'planner', date: isoOf(past2), createdAt: past2.getTime(), sample: false, data: { title: '交房租', time: '', priority: 'high', list: '生活', note: '', remind: false, done: true, doneAt: past2.getTime() + 3600000, quadrant: '重要紧急' } },
    { id: 'r3', type: 'planner', date: dstr, createdAt: at(8), sample: false, data: { title: '取快递', time: '', priority: 'normal', list: '生活', note: '', remind: false, done: false, quadrant: '不重要紧急' } }
  ];
  const rep = T.analyzePlannerRepeats();
  const rent = rep.find(x => x.title === '交房租');
  ok('5a 重复日程被识别', !!rent && rent.doneCount === 2 && !!rent.nextDate);
  ok('5b 当前无待办（hasPending=false）', rent && rent.hasPending === false);
  delete T.state.settings.plannerAutoNext;         /* 模拟默认（未开启） */
  const before = T.state.records.length;
  T.maybeAutoNextRepeat(T.state.records[0]);
  ok('5c 默认不自动往四象限塞新日程', T.state.records.length === before);
  T.renderPlannerRepeats();
  const rh = doc.getElementById('plannerRepeatList').innerHTML;
  ok('5d 重复清单置顶回显「该安排了」', rh.indexOf('repeat-pin') >= 0 && rh.indexOf('该安排了') >= 0);
  ok('5e 置顶项排在最前（第一行就是该安排的那条）', rh.indexOf('repeat-row') >= 0 && rh.indexOf('repeat-row pinned') === rh.indexOf('repeat-row'));
  T.state.settings.plannerAutoNext = true;         /* 手动打开后仍可用 */
  T.maybeAutoNextRepeat(T.state.records[0]);
  ok('5f 手动开启后仍可自动生成', T.state.records.length === before + 1);

  console.log('\nRESULT: pass=' + P.pass + ' fail=' + P.fail);
  process.exit(P.fail > 0 ? 1 : 0);
})().catch(e => { console.log('FATAL', e && e.message); process.exit(1); });
