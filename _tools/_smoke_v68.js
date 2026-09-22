/* v68 冒烟测试：使用频率跨设备同步 + 示例数据清理 + 当日时间线升序
 *  1) 脚本加载 + init 不抛错
 *  2) 新函数导出（mergeRemoteUsage/stripSampleData/snapshotBuild/settingsSnapshot）
 *  3) settingsSnapshot 含 storageUsage
 *  4) mergeRemoteUsage：取大/取早/取晚/逐月max/幂等/本地更大不动
 *  5) stripSampleData：新设备不剥；有已同步数据→剥示例；清空过→剥示例
 *  6) snapshotBuild 不含 sample
 *  7) restoreApply 过滤旧快照中的 sample
 *  8) renderArchive 当日升序：上午2点 → 上午10点 → 下午3点 → 时间未记录
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
  ok('2 新函数已导出', ['mergeRemoteUsage', 'stripSampleData', 'snapshotBuild', 'settingsSnapshot', 'renderArchive'].every(k => typeof T[k] === 'function'));

  // ---- 3. settingsSnapshot 含 storageUsage ----
  T.state.settings.storageUsage = { X: { n: 1, first: '2026-09-01', last: '2026-09-02', m: { '2026-09': 1 } } };
  const snap = T.settingsSnapshot();
  ok('3 settingsSnapshot 含 storageUsage', snap && snap.storageUsage && snap.storageUsage.X && snap.storageUsage.X.n === 1);

  // ---- 4. mergeRemoteUsage ----
  T.state.settings.storageUsage = { A: { n: 3, first: '2026-09-05', last: '2026-09-08', m: { '2026-09': 3 } } };
  const r1 = T.mergeRemoteUsage({ A: { n: 7, first: '2026-09-01', last: '2026-09-10', m: { '2026-09': 5 } }, B: { n: 2, first: '2026-09-02', last: '2026-09-03', m: { '2026-09': 2 } } });
  const u1 = T.state.settings.storageUsage;
  ok('4a 远端合并返回有变化', r1 === true);
  ok('4b 累计次数取大 3→7', u1.A.n === 7);
  ok('4c 首次日期取早', u1.A.first === '2026-09-01');
  ok('4d 最近日期取晚', u1.A.last === '2026-09-10');
  ok('4e 逐月次数取大 3→5', Number(u1.A.m['2026-09']) === 5);
  ok('4f 新增物品 B 并入', u1.B && u1.B.n === 2);
  const r2 = T.mergeRemoteUsage({ A: { n: 7, first: '2026-09-01', last: '2026-09-10', m: { '2026-09': 5 } }, B: { n: 2, first: '2026-09-02', last: '2026-09-03', m: { '2026-09': 2 } } });
  ok('4g 幂等：相同远端再合并无变化', r2 === false);
  u1.A.n = 9; u1.A.m['2026-09'] = 9;
  const r3 = T.mergeRemoteUsage({ A: { n: 4, first: '2026-09-01', last: '2026-09-10', m: { '2026-09': 5 } } });
  ok('4h 本地更大不被远端缩小', r3 === false && u1.A.n === 9 && Number(u1.A.m['2026-09']) === 9);

  // ---- 5. stripSampleData ----
  // 5a 负例：全新设备（全是 sample、无 remoteId、未清空过）→ 不剥
  T.state.records = [
    { id: 's1', type: 'home', date: '2026-09-18', createdAt: 1, sample: true, data: { name: '燕麦奶', quantity: '2 盒', category: '食品', price: 18, priority: 'high', note: '无糖款', bought: false } },
    { id: 's2', type: 'money', date: '2026-09-18', createdAt: 2, sample: true, data: { flow: 'expense', amount: 32, category: '吃饭', note: '午饭' } }
  ];
  T.state.mediaItems = [{ id: 'm1', name: '宇宙探索编辑部', type: '电影', status: '看完', rating: 5, review: '', date: '2026-09-18', cover: '', sample: true }];
  T.state.habits = [{ id: 'h1', key: 'water', name: '喝水', type: 'counter', target: 8, unit: '杯', tone: 'sky', sample: true, entries: { '2026-09-17': 6 } }];
  T.state.lastClearedAt = 0;
  const s0 = T.stripSampleData();
  ok('5a 全新设备不剥示例', s0 === false && T.state.records.length === 2 && T.state.mediaItems.length === 1 && T.state.habits[0].sample === true && T.state.habits[0].entries['2026-09-17'] === 6);
  // 5b 正例：出现已同步真实数据 → 整批剔除示例
  T.state.records.push({ id: 'r1', type: 'money', date: '2026-09-18', createdAt: 3, sample: false, remoteId: 'cloud1', data: { flow: 'expense', amount: 10, category: '交通', note: '地铁' } });
  const s1 = T.stripSampleData();
  ok('5b 有已同步数据→剔除示例', s1 === true);
  ok('5c 示例记录已删、真实记录保留', T.state.records.length === 1 && T.state.records[0].id === 'r1');
  ok('5d 示例书影音已删', T.state.mediaItems.length === 0);
  ok('5e 示例打卡已清并转正', T.state.habits[0].sample === false && Object.keys(T.state.habits[0].entries).length === 0);
  // 5c 正例2：清空过全部数据（墓碑）→ 也剥
  T.state.records = [
    { id: 's3', type: 'home', date: '2026-09-18', createdAt: 4, sample: true, data: { name: '洗衣液', quantity: '1 瓶', category: '日用品', price: 39, priority: 'normal', note: '补充装', bought: true } }
  ];
  T.state.lastClearedAt = 1720000000000;
  const s2 = T.stripSampleData();
  ok('5f 清空过→也剥示例', s2 === true && T.state.records.length === 0);

  // ---- 6. snapshotBuild 排除 sample ----
  T.state.records = [
    { id: 'r1', type: 'money', date: '2026-09-18', createdAt: 3, sample: false, remoteId: 'cloud1', data: { flow: 'expense', amount: 10, category: '交通', note: '地铁' } },
    { id: 's9', type: 'home', date: '2026-09-18', createdAt: 5, sample: true, data: { name: '燕麦奶', quantity: '2 盒', category: '食品', price: 18, priority: 'high', note: '无糖款', bought: false } }
  ];
  T.state.mediaItems = [{ id: 'm9', name: '某书', type: '书', status: '想看', rating: 0, review: '', date: '2026-09-18', cover: '', sample: true, createdAt: 6, remoteId: '', syncTriedAt: 0 }];
  T.state.habits = [{ id: 'h2', key: 'water', name: '喝水', type: 'counter', target: 8, unit: '杯', tone: 'sky', sample: false, entries: { '2026-09-18': 3 } }, { id: 'h3', key: 'sleep', name: '睡眠', type: 'number', target: 8, unit: '小时', tone: 'indigo', sample: true, entries: { '2026-09-18': 7 } }];
  const sn = T.snapshotBuild();
  ok('6a 快照不含示例记录', sn.records.length === 1 && sn.records[0].id === 'r1' && JSON.stringify(sn.records).indexOf('"sample":true') < 0);
  ok('6b 快照不含示例书影音', sn.mediaItems.length === 0);
  ok('6c 快照不含示例习惯且打卡天数正确', sn.habits.length === 1 && sn.counts.habitDays === 1 && sn.counts.records === 1 && sn.counts.media === 0);

  // ---- 7. restoreApply 过滤旧快照中的 sample ----
  T.state.records = []; T.state.mediaItems = []; T.state.lastClearedAt = 1720000000000; T.state.clearedAll = true;
  const oldSnap = {
    v: 1, at: Date.now(), date: '2026-09-17', counts: { records: 2, media: 0, habitDays: 0 },
    records: [
      { id: 's1', type: 'home', date: '2026-09-17', createdAt: 1, sample: true, data: { name: '燕麦奶', quantity: '2 盒', category: '食品', price: 18, priority: 'high', note: '无糖款', bought: false } },
      { id: 'r9', type: 'money', date: '2026-09-17', createdAt: 2, sample: false, remoteId: 'old1', data: { flow: 'expense', amount: 5, category: '吃饭', note: '早饭' } }
    ],
    mediaItems: [], habits: []
  };
  let ra = null;
  await new Promise(res => { try { T.restoreApply(oldSnap, function (x) { ra = x; res(); }); } catch (e) { console.log('restoreApply err', e.message); res(); } });
  await tick(); await tick();
  ok('7a 旧快照中的示例不被恢复', ra && ra.records === 1 && !T.state.records.some(r => r.id === 's1'));
  ok('7b 旧快照中的真实记录被恢复', T.state.records.some(r => r.id === 'r9'));
  ok('7c 恢复后墓碑已铲', T.state.lastClearedAt === 0 && T.state.clearedAll === false);

  // ---- 8. renderArchive 当日升序 ----
  const today = new Date(); const y = today.getFullYear(), mo = today.getMonth(), da = today.getDate();
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const dstr = y + '-' + pad(mo + 1) + '-' + pad(da);
  const at = h => new Date(y, mo, da, h, 5).getTime();
  T.state.records = [
    { id: 'e1', type: 'money', date: dstr, createdAt: at(15), sample: false, data: { flow: 'expense', amount: 1, category: '吃饭', note: '下午的事' } },
    { id: 'e2', type: 'money', date: dstr, createdAt: at(2), sample: false, data: { flow: 'expense', amount: 2, category: '交通', note: '凌晨的事' } },
    { id: 'e3', type: 'money', date: dstr, createdAt: at(10), sample: false, data: { flow: 'expense', amount: 3, category: '购物', note: '上午的事' } },
    { id: 'e4', type: 'planner', date: dstr, createdAt: 0, sample: false, data: { title: '无时刻日程', time: '', priority: 'normal', list: '生活', note: '', remind: false, done: false } }
  ];
  T.state.mediaItems = []; T.state.habits = [];
  T.state.settings.archiveRange = 'day'; T.state.settings.archiveFilter = 'all';
  T.renderArchive();
  const archEl = doc.getElementById('archiveList');
  const ah = archEl ? archEl.innerHTML : '';
  /* v70 起 0-5 点归「凌晨」时段，2 点显示「凌晨2点5分」而非旧版的「上午2点」 */
  const i2 = ah.indexOf('凌晨2点'), i10 = ah.indexOf('上午10点'), i3 = ah.indexOf('下午3点'), iN = ah.indexOf('时间未记录');
  ok('8a 三个时刻桶都渲染', i2 >= 0 && i10 >= 0 && i3 >= 0);
  ok('8b 当日按时间升序 2点→10点→3点', i2 < i10 && i10 < i3);
  ok('8c 无时刻归入「时间未记录」且殿后', iN > i3);
  ok('8d 时刻与内容对应', (ah.indexOf('凌晨的事') > i2 && ah.indexOf('凌晨的事') < ah.indexOf('上午10点')) && (ah.indexOf('上午的事') > i10 && ah.indexOf('上午的事') < i3) && (ah.indexOf('下午的事') > i3));

  console.log('\nRESULT: pass=' + P.pass + ' fail=' + P.fail);
  process.exit(P.fail > 0 ? 1 : 0);
})().catch(e => { console.log('FATAL', e && e.message); process.exit(1); });
