/* v67 冒烟测试：时光档案 时间范围汇总 + 当日时刻时间线
 *  1) 脚本加载 + init 不抛错
 *  2) _clockLabel：上午/下午/12点边界/分钟
 *  3) _archiveInRange：day/week/month/year 边界判断
 *  4) renderArchive 当日：有 at 按时刻分组、无 at 归入「时间未记录」
 *  5) renderArchive 范围：month 只含当月
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
try { Object.defineProperty(Object.getPrototypeOf(doc.createElement('form')), 'elements', { get() { return this.querySelectorAll('[name]'); } }); } catch (e) { }
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

const P = { pass: 0, fail: 0, skip: 0 };
const ok = (name, cond) => { if (cond) { P.pass++; console.log('  PASS  ' + name); } else { P.fail++; console.log('  FAIL  ' + name); } };

let loadErr = '';
try { vm.runInContext(src, sandbox, { filename: 'app.js' }); } catch (e) { loadErr = e.message; }
ok('0 脚本加载不抛错', !loadErr);
if (loadErr) { console.log(loadErr); process.exit(1); }

const tick = () => new Promise(r => setTimeout(r, 30));

(async function () {
  try { doc.dispatchEvent(new w.Event('DOMContentLoaded')); } catch (e) { ok('1 init 不抛错', false); }
  ok('1 init 不抛错', true);

  const T = w.__appTest;
  ok('1a 新函数已导出', ['_archiveInRange', '_clockLabel', '_archiveItemHtml', 'renderArchive', '_buildTimelineEvents'].every(k => typeof T[k] === 'function'));

  // ---- 2. _clockLabel 时刻标签 ----
  ok('2a 上午10点', T._clockLabel(new Date(2026, 8, 18, 10, 0).getTime()) === '上午10点');
  ok('2b 下午3点（12小时制）', T._clockLabel(new Date(2026, 8, 18, 15, 0).getTime()) === '下午3点');
  /* v70 新语义：12 点归「中午」、0-5 点归「凌晨」且用 24 小时制 */
  ok('2c 中午12点', T._clockLabel(new Date(2026, 8, 18, 12, 0).getTime()) === '中午12点');
  ok('2d 凌晨0点', T._clockLabel(new Date(2026, 8, 18, 0, 0).getTime()) === '凌晨0点');
  ok('2e 带分钟 下午3点30分', T._clockLabel(new Date(2026, 8, 18, 15, 30).getTime()) === '下午3点30分');
  ok('2f 无时间戳返回 null', T._clockLabel(0) === null);

  // ---- 3. _archiveInRange 范围判断 ----
  const today = new Date(); const iso = d => { const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return x.toISOString().slice(0, 10); };
  const t = iso(today);
  ok('3a day 命中今天', T._archiveInRange(t, 'day') === true);
  ok('3b day 排除昨天', T._archiveInRange(iso(new Date(today.getTime() - 86400000)), 'day') === false);
  ok('3c month 命中本月', T._archiveInRange(t.slice(0, 7) + '-01', 'month') === true);
  ok('3d month 排除上月', T._archiveInRange(iso(new Date(today.getFullYear(), today.getMonth() - 1, 15)), 'month') === false);
  ok('3e year 命中本年', T._archiveInRange(t.slice(0, 4) + '-06-01', 'year') === true);
  ok('3f year 排除去年', T._archiveInRange((today.getFullYear() - 1) + '-06-01', 'year') === false);
  ok('3g week 命中本周第一天', T._archiveInRange(t, 'week') === true);

  // ---- 4. renderArchive 当日时刻分组 ----
  // 造一条今天的记录（带 createdAt 上午10点），一条无 createdAt 的记录
  const now = Date.now();
  const today10 = new Date(today); today10.setHours(10, 0, 0, 0);
  T.state.records = [
    { id: 'r1', type: 'money', date: t, createdAt: today10.getTime(), data: { category: '餐饮', amount: 25, note: '午饭' } },
    { id: 'r2', type: 'mood', date: t, createdAt: 0, data: { mood: '开心', note: '' } }
  ];
  T.state.mediaItems = []; T.state.habits = [];
  T.state.settings.archiveRange = 'day'; T.state.settings.archiveFilter = 'all';
  T.renderArchive();
  const list = doc.getElementById('archiveList').innerHTML;
  ok('4a 当日视图出现时刻标签「上午10点」', list.indexOf('上午10点') >= 0);
  ok('4b 出现「时间未记录」分组', list.indexOf('时间未记录') >= 0);
  ok('4c 两条记录都渲染了', (list.match(/tl-item/g) || []).length === 2);
  ok('4d 当日视图不出现日期标题「今天」', list.indexOf('tl-date') < 0);

  // ---- 5. renderArchive 范围过滤 ----
  T.state.settings.archiveRange = 'month';
  // 加一条上个月的记录
  const lastMonth = iso(new Date(today.getFullYear(), today.getMonth() - 1, 15));
  /* v69 起日程按「创建时刻」归档：上月创建、上月日期 → 才算上月记录 */
  T.state.records.push({ id: 'r3', type: 'planner', date: lastMonth, createdAt: new Date(lastMonth + 'T09:00:00').getTime(), data: { title: '旧任务', done: false } });
  T.renderArchive();
  const list2 = doc.getElementById('archiveList').innerHTML;
  /* v69 起本月改为月历网格（不再按日期折叠） */
  ok('5a month 视图不含上月记录', list2.indexOf('旧任务') < 0);
  ok('5b month 视图为月历网格', list2.indexOf('arch-month-grid') >= 0 && (list2.match(/class="am-cell/g) || []).length === 42);

  console.log('结果：通过 ' + P.pass + ' / 失败 ' + P.fail + ' / 跳过 ' + P.skip);
  process.exit(P.fail ? 1 : 0);
})();
