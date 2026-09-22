/* v57 冒烟测试：重复日程（统计 + 自动生成下次待完成日程）
 *  1) 脚本加载 / init 不抛错
 *  2) 重复日程面板 DOM 存在（plannerRepeatList + autoRepeatBtn）
 *  3) analyzePlannerRepeats：同名分组、sample 排除、间隔均值、nextDate 推算、hasPending
 *  4) createNextRepeat：生成待完成记录（继承象限/清单/时间）+ 防重守卫
 *  5) maybeAutoNextRepeat：默认自动生成；关闭开关后不生成
 *  6) renderPlannerRepeats 渲染列表与按钮
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
doc.getElementById = function (id) { if (id === 'mediaStatusFilter' || id === 'mediaRatingFilter') return mkDummySelect(); return _origGetById(id); };
w.scrollTo = () => { }; w.__TESTING__ = true;
const _session = {}; w.sessionStorage = { getItem: k => k in _session ? _session[k] : null, setItem: (k, v) => { _session[k] = String(v); }, removeItem: k => { delete _session[k]; }, clear() { for (const k in _session) delete _session[k]; }, key: i => Object.keys(_session)[i] ?? null, get length() { return Object.keys(_session).length; } };
let MM = { standalone: false, narrow: true };
w.matchMedia = q => ({ matches: q.indexOf('standalone') >= 0 ? MM.standalone : MM.narrow, addListener() { }, removeListener() { }, addEventListener() { }, removeEventListener() { } });
if (typeof w.requestAnimationFrame !== 'function') { w.requestAnimationFrame = cb => setTimeout(cb, 0); w.cancelAnimationFrame = clearTimeout; }
w.URL.createObjectURL = w.URL.createObjectURL || (() => 'blob:x'); w.URL.revokeObjectURL = w.URL.revokeObjectURL || (() => { });
w.alert = () => { }; w.confirm = () => true; w.prompt = () => null;
try { w.localStorage = storage; } catch (e) { }
if (!w.Image) w.Image = function () { };
try { Object.defineProperty(Object.getPrototypeOf(doc.createElement('form')), 'elements', { get() { return this.querySelectorAll('[name]'); } }); } catch (e) { }
w.FormData = class { constructor(f) { this._f = f; this._m = new Map(); if (f) { const els = f.querySelectorAll('[name]'); for (const el of els) { const t = (el.type || '').toLowerCase(); if (t === 'radio') { if (el.checked) this._m.set(el.name, el.value); } else if (t === 'checkbox') { if (el.checked) this._m.set(el.name, 'on'); } else { this._m.set(el.name, el.value || ''); } } } } get(k) { return this._m.has(k) ? this._m.get(k) : null; } entries() { return [...this._m.entries()]; } };
w.Event = class extends w.Event { constructor(t, o) { super(t, o); } };
const _fake = { records: {} };
w.__SMART_PAGE__ = { database: { query: async function ({ databaseId, pageSize, startCursor }) { const arr = _fake.records[databaseId] || []; const start = startCursor ? parseInt(startCursor, 10) || 0 : 0; return { results: arr.slice(start, start + pageSize), hasMore: false, nextCursor: null }; }, addRecord: async () => ({ _id: 'r' }), updateRecord: async () => ({}), deleteRecord: async () => ({}), getSchema: async () => ({ properties: [] }) } };
const navStub = { userAgent: 'node', platform: 'x', language: 'zh-CN' };
const sandbox = { sessionStorage: w.sessionStorage, window: w, document: doc, localStorage: storage, FormData: w.FormData, __SMART_PAGE__: w.__SMART_PAGE__, navigator: navStub, location: new w.URL('http://localhost/index.html'), history: { replaceState() { } }, console: { log: () => { }, warn: () => { }, error: () => { } }, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, crypto: require('crypto').webcrypto, parseInt, parseFloat, isNaN, String, Number, Boolean, Array, Object, RegExp, Error, Promise, Map, Set, Symbol, URL: w.URL, Intl, require };
sandbox.globalThis = sandbox; sandbox.self = sandbox; sandbox.scrollTo = () => {};
vm.createContext(sandbox);

const P = { pass: 0, fail: 0, logs: [] };
const ok = (name, cond) => { if (cond) { P.pass++; P.logs.push('  PASS  ' + name); } else { P.fail++; P.logs.push('  FAIL  ' + name); } };

let loadErr = '';
try { vm.runInContext(src, sandbox, { filename: 'app.js' }); } catch (e) { loadErr = e.message + '\n' + (e.stack || '').split('\n').slice(0, 6).join('\n'); }
ok('0 脚本加载不抛错', !loadErr);
if (loadErr) { console.log(loadErr); console.log(P.logs.join('\n')); console.log('\n结果: ' + P.pass + ' 通过 / ' + P.fail + ' 失败'); process.exit(1); }

const DAY = 86400000, NOW = Date.now();
const iso = ts => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function seed(title, opts) {
  return Object.assign({ id: 't' + Math.random().toString(36).slice(2, 9), type: 'planner', sample: false, remoteId: 'rp' + Math.random().toString(36).slice(2, 8), date: iso(NOW), createdAt: NOW, data: { title, time: '', priority: 'normal', list: '生活', note: '', remind: false, done: false, quadrant: '重要紧急' } }, opts);
}

(async function () {
  let initErr = '';
  try { doc.dispatchEvent(new w.Event('DOMContentLoaded')); } catch (e) { initErr = e.message; }
  ok('1 init(DOMContentLoaded) 不抛错', !initErr);
  if (initErr) P.logs.push('   initErr: ' + initErr);

  const T = w.__appTest;
  ok('1a __appTest 导出 analyzePlannerRepeats', typeof (T && T.analyzePlannerRepeats) === 'function');
  ok('1b __appTest 导出 createNextRepeat', typeof (T && T.createNextRepeat) === 'function');
  ok('1c __appTest 导出 maybeAutoNextRepeat', typeof (T && T.maybeAutoNextRepeat) === 'function');

  // 2. 面板 DOM
  ok('2a plannerRepeatList 容器存在', !!doc.getElementById('plannerRepeatList'));
  ok('2b autoRepeatBtn 开关存在', !!doc.getElementById('autoRepeatBtn'));

  // 3. 造数据：A「每周复盘」3 次完成（各间隔 7 天）+ 1 条待完成 + 1 条 sample；B「整理房间」2 次完成无待办；C 只出现 1 次
  const a1 = seed('每周复盘', { date: iso(NOW - 14 * DAY), createdAt: NOW - 21 * DAY, data: { title: '每周复盘', time: '20:00', priority: 'normal', list: '个人', note: '', remind: false, done: true, doneAt: NOW - 14 * DAY, quadrant: '重要不紧急' } });
  const a2 = seed('每周复盘', { date: iso(NOW - 7 * DAY), createdAt: NOW - 14 * DAY, data: { title: '每周复盘', time: '20:00', priority: 'normal', list: '个人', note: '', remind: false, done: true, doneAt: NOW - 7 * DAY, quadrant: '重要不紧急' } });
  const a3 = seed('每周复盘', { date: iso(NOW), createdAt: NOW - 7 * DAY, data: { title: '每周复盘', time: '20:00', priority: 'normal', list: '个人', note: '', remind: false, done: true, doneAt: NOW, quadrant: '重要不紧急' } });
  const a4 = seed('每周复盘', { date: iso(NOW + 2 * DAY), createdAt: NOW, data: { title: '每周复盘', time: '', priority: 'normal', list: '个人', note: '', remind: false, done: false, quadrant: '重要不紧急' } });
  const as = seed('每周复盘', { sample: true, data: { title: '每周复盘', time: '', priority: 'normal', list: '生活', note: '', remind: false, done: true, doneAt: NOW, quadrant: '重要紧急' } });
  const b1 = seed('整理房间', { date: iso(NOW - 10 * DAY), createdAt: NOW - 12 * DAY, data: { title: '整理房间', time: '', priority: 'low', list: '家庭', note: '客厅', remind: false, done: true, quadrant: '紧急不重要' } });
  const b2 = seed('整理房间', { date: iso(NOW - 3 * DAY), createdAt: NOW - 10 * DAY, data: { title: '整理房间', time: '10:00', priority: 'low', list: '家庭', note: '客厅', remind: false, done: true, quadrant: '紧急不重要' } });
  const c1 = seed('独一次的事', { date: iso(NOW - 1 * DAY), createdAt: NOW - 2 * DAY, data: { title: '独一次的事', time: '', priority: 'normal', list: '生活', note: '', remind: false, done: true, doneAt: NOW - 1 * DAY, quadrant: '重要紧急' } });
  T.state.records.push(a1, a2, a3, a4, as, b1, b2, c1);

  const list = T.analyzePlannerRepeats();
  const A = list.find(x => x.title === '每周复盘');
  const B = list.find(x => x.title === '整理房间');
  ok('3a A 组存在且 B 组存在', !!A && !!B);
  ok('3b sample 记录不参与统计（A.count===4）', A && A.count === 4);
  ok('3c A 平均间隔 7 天', A && A.avgDays === 7);
  ok('3d A nextDate = 今天+7', A && A.nextDate === iso(NOW + 7 * DAY));
  ok('3e A hasPending=true（有待完成）', A && A.hasPending === true);
  ok('3f 只出现 1 次的日程不进统计', !list.find(x => x.title === '独一次的事'));
  ok('3g B 组无 doneAt 走日期差兜底（间隔 7 天，nextDate=今天+4）', B && B.avgDays === 7 && B.nextDate === iso(NOW + 4 * DAY));

  // 4. createNextRepeat
  ok('4a A 已有未完成 → exists 守卫', T.createNextRepeat(A) === 'exists');
  const before = T.state.records.length;
  const rb = T.createNextRepeat(B);
  ok('4b B 生成成功', rb === true && T.state.records.length === before + 1);
  const nb = T.state.records[T.state.records.length - 1];
  ok('4c 新记录日期=B.nextDate', nb.date === B.nextDate);
  ok('4d 新记录待完成且继承象限/清单/时间', nb.data.done === false && nb.data.quadrant === '紧急不重要' && nb.data.list === '家庭' && nb.data.time === '10:00');
  ok('4e 再次生成 → exists 守卫', T.createNextRepeat(B) === 'exists');

  // 5. 自动生成
  const c2 = seed('理发', { date: iso(NOW - 30 * DAY), createdAt: NOW - 60 * DAY, data: { title: '理发', time: '', priority: 'normal', list: '个人', note: '', remind: false, done: true, doneAt: NOW - 30 * DAY, quadrant: '不重要不紧急' } });
  const c3 = seed('理发', { date: iso(NOW - 2 * DAY), createdAt: NOW - 30 * DAY, data: { title: '理发', time: '', priority: 'normal', list: '个人', note: '', remind: false, done: true, doneAt: NOW - 2 * DAY, quadrant: '不重要不紧急' } });
  T.state.records.push(c2, c3);
  const cntBefore = T.state.records.length;
  /* v69 起默认关闭：重复日程不再自动塞进四象限，改为在重复清单置顶回显 */
  T.maybeAutoNextRepeat(c3);
  ok('5a 默认关闭：完成后不自动生成', T.state.records.length === cntBefore);
  T.state.settings.plannerAutoNext = true;
  T.maybeAutoNextRepeat(c3);
  ok('5b 手动开启后自动生成「理发」待完成记录', T.state.records.length === cntBefore + 1 && T.state.records[T.state.records.length - 1].data.title === '理发' && T.state.records[T.state.records.length - 1].data.done === false);
  T.state.settings.plannerAutoNext = false;
  const cntBefore2 = T.state.records.length;
  T.maybeAutoNextRepeat(c3);
  ok('5c 关闭开关后不再自动生成', T.state.records.length === cntBefore2);
  T.state.settings.plannerAutoNext = true;

  // 6. 面板渲染
  let rErr = '';
  try { T.renderPlannerRepeats(); } catch (e) { rErr = e.message; }
  ok('6a renderPlannerRepeats 不抛错', !rErr);
  const el = doc.getElementById('plannerRepeatList');
  const h = el ? (el.innerHTML || '') : '';
  ok('6b 渲染出「每周复盘」', h.indexOf('每周复盘') >= 0);
  ok('6c 渲染出「生成下次」按钮', h.indexOf('gen-repeat') >= 0);
  ok('6d 独一次的日程不渲染', h.indexOf('独一次的事') < 0);
  const btn = doc.getElementById('autoRepeatBtn');
  ok('6e 开关文案为「自动生成：开」', btn && btn.textContent === '自动生成：开');

  console.log(P.logs.join('\n'));
  console.log('\n结果: ' + P.pass + ' 通过 / ' + P.fail + ' 失败');
  process.exit(P.fail ? 1 : 0);
})();
