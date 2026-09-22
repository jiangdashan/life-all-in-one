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
  // ---------- 1. _clockLabel 时段 ----------
  ok('1a _clockLabel 已导出', typeof T._clockLabel === 'function');
  function at(h, m) { var d = new Date(2026, 8, 20, h, m || 0, 0, 0); return T._clockLabel(d.getTime()); }
  ok('1b 0:56 显示凌晨0点56分', at(0, 56) === '凌晨0点56分');
  ok('1c 0:00 显示凌晨0点', at(0, 0) === '凌晨0点');
  ok('1d 5:20 显示凌晨5点20分', at(5, 20) === '凌晨5点20分');
  ok('1e 6:00 显示早上6点', at(6, 0) === '早上6点');
  ok('1f 8:30 显示早上8点30分', at(8, 30) === '早上8点30分');
  ok('1g 10:00 显示上午10点', at(10, 0) === '上午10点');
  ok('1h 11:59 显示上午11点59分', at(11, 59) === '上午11点59分');
  ok('1i 12:00 显示中午12点', at(12, 0) === '中午12点');
  ok('1j 12:30 显示中午12点30分', at(12, 30) === '中午12点30分');
  ok('1k 13:05 显示下午1点05分', at(13, 5) === '下午1点05分');
  ok('1l 15:00 显示下午3点', at(15, 0) === '下午3点');
  ok('1m 17:45 显示下午5点45分', at(17, 45) === '下午5点45分');
  ok('1n 18:00 显示晚上6点', at(18, 0) === '晚上6点');
  ok('1o 23:59 显示晚上11点59分', at(23, 59) === '晚上11点59分');
  ok('1p 空时间戳返回 null', T._clockLabel(0) === null);
  ok('1q 旧「上午12点」写法已移除', html.indexOf("var part = h<12 ? '上午' : '下午'") < 0);

  // ---------- 2. 当日时间线仍用 _clockLabel 分组 ----------
  var today = new Date();
  var mk = function (h, m) { var d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0, 0); return d.getTime(); };
  T.state.records = [
    { id: 'a1', type: 'planner', date: '2026-09-20', createdAt: mk(0, 56), data: { title: '写周报', done: false } },
    { id: 'a2', type: 'planner', date: '2026-09-20', createdAt: mk(10, 0), data: { title: '开会', done: false } }
  ];
  T.state.settings.archiveRange = 'day';
  T.state.settings.archiveFilter = 'all';
  T.renderArchive();
  var ah = doc.getElementById('archiveList').innerHTML;
  ok('2a 当日时间线出现凌晨0点56分', ah.indexOf('凌晨0点56分') >= 0);
  ok('2b 凌晨排在上午之前', ah.indexOf('凌晨0点56分') < ah.indexOf('上午10点'));

  console.log('\nRESULT: pass=' + P.pass + ' fail=' + P.fail);
  process.exit(P.fail > 0 ? 1 : 0);
})().catch(e => { console.log('FATAL', e && e.message); process.exit(1); });
