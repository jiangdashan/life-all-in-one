/* v56b 冒烟测试：日程四象限同步
 * 复用 linkedom 加载真实脚本，验证：
 *  A) mergePlan 回读云端「象限」字段
 *  B) 云端缺「象限」时保留本地 quadrant（不丢数据，数据安全第一铁律）
 *  C) backfillPlannerQuadrant 把本地已分类记录推到云端（updateRecord 带 象限）
 */
const LINKEDOM = 'C:/Users/依易亦奕鸭/.workbuddy/binaries/node/workspace/node_modules/linkedom';
const { parseHTML } = require(LINKEDOM);
const fs = require('fs'); const vm = require('vm'); const crypto = require('crypto');
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
const _updateCalls = [];
const _db = { query: async function ({ databaseId, pageSize, startCursor }) { const arr = _fake.records[databaseId] || []; const start = startCursor ? parseInt(startCursor, 10) || 0 : 0; return { results: arr.slice(start, start + pageSize), hasMore: false, nextCursor: null }; }, addRecord: async () => ({ _id: 'r' }), updateRecord: async (p) => { _updateCalls.push(p); return {}; }, deleteRecord: async () => ({}), getSchema: async () => ({ properties: [] }) };
w.__SMART_PAGE__ = { database: _db };
const navStub = { userAgent: 'node', platform: 'x', language: 'zh-CN' };
const sandbox = { sessionStorage: w.sessionStorage, window: w, document: doc, localStorage: storage, FormData: w.FormData, __SMART_PAGE__: w.__SMART_PAGE__, navigator: navStub, location: new w.URL('http://localhost/index.html'), history: { replaceState() { } }, console: { log: () => { }, warn: () => { }, error: () => { } }, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, crypto: crypto.webcrypto, parseInt, parseFloat, isNaN, String, Number, Boolean, Array, Object, RegExp, Error, Promise, Map, Set, Symbol, URL: w.URL, Intl, require };
sandbox.globalThis = sandbox; sandbox.self = sandbox; sandbox.scrollTo = () => {};
vm.createContext(sandbox);

const P = { pass: 0, fail: 0, logs: [] };
const ok = (name, cond) => { if (cond) { P.pass++; P.logs.push('  PASS  ' + name); } else { P.fail++; P.logs.push('  FAIL  ' + name); } };

let loadErr = '';
try { vm.runInContext(src, sandbox, { filename: 'app.js' }); } catch (e) { loadErr = e.message + '\n' + (e.stack || '').split('\n').slice(0, 6).join('\n'); }
ok('0 脚本加载不抛错', !loadErr);
if (loadErr) { console.log(loadErr); console.log(P.logs.join('\n')); console.log('\n结果: ' + P.pass + ' 通过 / ' + P.fail + ' 失败'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async function () {
  let initErr = '';
  try { doc.dispatchEvent(new w.Event('DOMContentLoaded')); } catch (e) { initErr = e.message; }
  ok('1 init(DOMContentLoaded) 不抛错', !initErr);
  if (initErr) P.logs.push('   initErr: ' + initErr);

  const T = w.__appTest;
  ok('2 mergePlan 已导出', typeof T.mergePlan === 'function');
  ok('2b backfillPlannerQuadrant 已导出', typeof T.backfillPlannerQuadrant === 'function');

  // A) mergePlan 回读云端「象限」
  T.mergePlan([{ _id: 'X1', '日期': '2026-09-17', '内容': '任务A', '类型': '工作', '状态': '待完成', '象限': '重要不紧急' }]);
  const a = T.state.records.find(r => r.id === 'X1');
  ok('3A 回读云端象限: quadrant=重要不紧急', !!a && a.data.quadrant === '重要不紧急');
  ok('3A-2 默认值不误判: 非「重要紧急」兜底', !!a && a.data.quadrant !== '重要紧急');

  // B) 云端缺「象限」时保留本地 quadrant（数据安全第一铁律）
  T.state.records.push({ id: 'X2', type: 'planner', date: '2026-09-17', createdAt: Date.now(), sample: false, remoteId: 'X2', data: { title: '任务B', list: '工作', done: false, time: '', priority: 'normal', note: '', remind: false, quadrant: '重要不紧急' } });
  T.mergePlan([{ _id: 'X2', '日期': '2026-09-17', '内容': '任务B', '类型': '工作', '状态': '待完成' }]); // 无 象限
  const b = T.state.records.find(r => r.id === 'X2');
  ok('3B 云端缺象限时保留本地象限(不丢数据)', !!b && b.data.quadrant === '重要不紧急');

  // C) 回填：本地已分类记录推到云端
  w.localStorage.removeItem('richangji_planner_quad_backfilled'); // 清守卫，确保可触发
  _updateCalls.length = 0;
  T.state.records.push({ id: 'X3', type: 'planner', date: '2026-09-17', createdAt: Date.now(), sample: false, remoteId: 'rBack3', data: { title: '任务C', list: '工作', done: false, time: '', priority: 'normal', note: '', remind: false, quadrant: '不重要不紧急' } });
  try { T.backfillPlannerQuadrant(); } catch (e) { P.logs.push('   backfillErr: ' + e.message); }
  await sleep(1200); // 回填按 250ms/条串行，3 条记录需 ~750ms+，留足余量
  const hit = _updateCalls.find(c => c.recordId === 'rBack3' && c.properties && c.properties['象限'] && c.properties['象限'].text === '不重要不紧急');
  ok('3C 回填调用 updateRecord 并带 象限=不重要不紧急', !!hit);
  ok('3C-2 守卫已置位(只跑一次)', w.localStorage.getItem('richangji_planner_quad_backfilled') === '1');

  console.log(P.logs.join('\n'));
  console.log('\n结果: ' + P.pass + ' 通过 / ' + P.fail + ' 失败');
  process.exit(P.fail ? 1 : 0);
})();
