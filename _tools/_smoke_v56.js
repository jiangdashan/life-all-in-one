/* v56 冒烟测试：学习模块（新增云端表 + 视图 + 导航 + 同步分发）
 * 复用 v53 的 linkedom 加载骨架，针对 study 做端到端验证：
 *  1) 脚本加载不抛错
 *  2) 桌面 + 移动端导航各出现一个「学习」入口
 *  3) view-study 区块、studyForm / studyList / studyStat / i-study 图标均存在
 *  4) 模拟提交 studyForm → 本地生成 study 记录 → #studyList 渲染出科目名
 *  5) 计在统计卡出现「今日学习」
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

(async function () {
  // 触发 init
  let initErr = '';
  try { doc.dispatchEvent(new w.Event('DOMContentLoaded')); } catch (e) { initErr = e.message; }
  ok('1 init(DOMContentLoaded) 不抛错', !initErr);
  if (initErr) P.logs.push('   initErr: ' + initErr);

  // 2. 导航入口
  ok('2a 桌面+移动端共 2 个学习导航', doc.querySelectorAll('[data-nav="study"]').length === 2);
  ok('2b 学习导航文案存在', /学习/.test(doc.querySelector('[data-nav="study"]').textContent || ''));

  // 3. 视图与图标 DOM
  ok('3a view-study 区块存在', !!doc.getElementById('view-study'));
  ok('3b studyForm 存在', !!doc.getElementById('studyForm'));
  ok('3c studyList 存在', !!doc.getElementById('studyList'));
  ok('3d studyStat 存在', !!doc.getElementById('studyStat'));
  ok('3e i-study 图标符号存在', html.indexOf('<symbol id="i-study"') >= 0);

  // 4. 模拟提交 → 本地新增 + 列表渲染
  const form = doc.getElementById('studyForm');
  if (form && typeof form.reset !== 'function') form.reset = function(){};
  const list = doc.getElementById('studyList');
  if (form && list) {
    form.querySelector('[name="date"]').value = '2026-09-17';
    form.querySelector('[name="subject"]').value = '高等数学';
    form.querySelector('[name="category"]').value = '练习';
    form.querySelector('[name="minutes"]').value = '45';
    form.querySelector('[name="note"]').value = '第三章习题';
    let submitErr = '';
    try { form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); } catch (e) { submitErr = e.message; }
    ok('4a studyForm 提交不抛错', !submitErr);
    if (submitErr) P.logs.push('   submitErr: ' + submitErr);
    const listHTML = list.innerHTML || '';
    ok('4b 列表渲染出科目「高等数学」', listHTML.indexOf('高等数学') >= 0);
    ok('4c 列表渲染出时长「45 分」', listHTML.indexOf('45 分') >= 0);
  } else {
    ok('4a studyForm 存在', false);
  }

  // 5. 统计卡
  const stat = doc.getElementById('studyStat');
  if (stat) ok('5a 统计卡出现「今日学习」', (stat.innerHTML || '').indexOf('今日学习') >= 0);

  console.log(P.logs.join('\n'));
  console.log('\n结果: ' + P.pass + ' 通过 / ' + P.fail + ' 失败');
  process.exit(P.fail ? 1 : 0);
})();
