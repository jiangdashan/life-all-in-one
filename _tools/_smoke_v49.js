/* v49 冒烟测试：
 *  1) 睡眠评分：缺失维度归一化（未填分期不再被压到 65 分上限）
 *  2) 库存：使用频率面板在库存总览上方
 *  3) 本周计划：多端状态同步（末次修改胜出 + 删除墓碑）
 *  4) 饮食：拳头法对照表存在且内容完整
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
if (typeof w.matchMedia !== 'function') w.matchMedia = () => ({ matches: false, addListener() { }, removeListener() { }, addEventListener() { }, removeEventListener() { } });
if (typeof w.requestAnimationFrame !== 'function') { w.requestAnimationFrame = cb => setTimeout(cb, 0); w.cancelAnimationFrame = clearTimeout; }
w.URL.createObjectURL = w.URL.createObjectURL || (() => 'blob:x'); w.URL.revokeObjectURL = w.URL.revokeObjectURL || (() => { });
w.alert = () => { }; w.confirm = () => true; w.prompt = () => null;
try { w.localStorage = storage; } catch (e) { }
if (!w.Image) w.Image = function () { };
try { Object.defineProperty(Object.getPrototypeOf(doc.createElement('form')), 'elements', { get() { return this.querySelectorAll('[name]'); } }); } catch (e) { }
w.FormData = class { constructor(f) { this._f = f; this._m = new Map(); if (f) { const els = f.querySelectorAll('[name]'); for (const el of els) { const t = (el.type || '').toLowerCase(); if (t === 'radio') { if (el.checked) this._m.set(el.name, el.value); } else if (t === 'checkbox') { if (el.checked) this._m.set(el.name, 'on'); } else { this._m.set(el.name, el.value || ''); } } } } get(k) { return this._m.has(k) ? this._m.get(k) : null; } entries() { return [...this._m.entries()]; } };
w.Event = class { constructor(t, o) { this.type = t; this.bubbles = !!(o && o.bubbles); this.cancelable = !!(o && o.cancelable); } };
const _fake = { records: {} };
w.__SMART_PAGE__ = { database: { query: async function ({ databaseId, pageSize, startCursor }) { const arr = _fake.records[databaseId] || []; const start = startCursor ? parseInt(startCursor, 10) || 0 : 0; const slice = arr.slice(start, start + pageSize); const next = start + pageSize < arr.length ? String(start + pageSize) : null; return { results: slice, hasMore: !!next, nextCursor: next }; }, addRecord: async () => ({ _id: 'r' }), updateRecord: async () => ({ }), deleteRecord: async () => ({ }), getSchema: async () => ({ properties: [] }) } };
const sandbox = { sessionStorage: w.sessionStorage, window: w, document: doc, localStorage: storage, FormData: w.FormData, __SMART_PAGE__: w.__SMART_PAGE__, navigator: { userAgent: 'node', platform: 'x', language: 'zh-CN' }, location: new w.URL('http://localhost/index.html'), history: { replaceState() { } }, console: { log: () => { }, warn: () => { }, error: () => { } }, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, crypto: require('crypto').webcrypto, parseInt, parseFloat, isNaN, String, Number, Boolean, Array, Object, RegExp, Error, Promise, Map, Set, Symbol, URL: w.URL, Intl, require };
sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
try { vm.runInContext(src, sandbox, { filename: 'inline.js' }); } catch (e) { console.log('FATAL  inline script 执行失败: ' + e.message); console.log(e.stack); process.exit(1); }
const app = w.__appTest || sandbox.__appTest;

const P = { pass: 0, fail: 0, logs: [] };
function ok(name, cond, extra) { if (cond) { P.pass++; P.logs.push('  ✔ ' + name); } else { P.fail++; P.logs.push('  ✘ ' + name + (extra ? ' -> ' + extra : '')); } }

(async function () {
  // ============ 1. 睡眠评分归一化 ============
  const T = Date.now();
  // 1a 只填入睡/醒来，不填分期 → 睡 8 小时、无清醒 → 应能拿满分（不是被压到 65）
  const m1 = app._sleepMetrics({ id: 'a', date: '2026-09-17', data: { bedtime: '23:00', wake: '07:00', deep: 0, light: 0, rem: 0, awake: 0, nap: 0 } });
  ok('1a 无分期时 asleep=480 分钟', Math.round(m1.asleep) === 480, 'asleep=' + m1.asleep);
  ok('1b 无分期时 partial=true', m1.partial === true, 'partial=' + m1.partial);
  ok('1c 无分期时 hasStages=false', m1.hasStages === false, 'hasStages=' + m1.hasStages);
  ok('1d 无分期且睡够+效率高 → 分数 >= 95（旧版上限仅 65）', m1.score >= 95, 'score=' + m1.score);

  // 1e 填了分期 → 四维度全参与
  const m2 = app._sleepMetrics({ id: 'b', date: '2026-09-17', data: { bedtime: '23:00', wake: '07:00', deep: 90, light: 250, rem: 100, awake: 40, nap: 0 } });
  ok('1e 有分期时 hasStages=true', m2.hasStages === true);
  ok('1f 有分期时 partial=false', m2.partial === false, 'partial=' + m2.partial);
  ok('1g 深睡比例计算正确 (~21%)', Math.abs(m2.deepPct - (90 / 440 * 100)) < 0.5, 'deepPct=' + m2.deepPct.toFixed(1));

  // 1h 分期差 → 分数应明显低于时长达标但分期优秀的另一条
  const good = app._sleepMetrics({ id: 'c', date: '2026-09-17', data: { bedtime: '23:00', wake: '07:00', deep: 100, light: 240, rem: 100, awake: 0, nap: 0 } });
  const bad = app._sleepMetrics({ id: 'd', date: '2026-09-17', data: { bedtime: '23:00', wake: '07:00', deep: 20, light: 380, rem: 20, awake: 0, nap: 0 } });
  ok('1h 分期合理的评分高于分期失衡', good.score > bad.score, 'good=' + good.score + ' bad=' + bad.score);

  // 1i 完全没有数据 → 0 分不崩
  const m0 = app._sleepMetrics({ id: 'e', date: '2026-09-17', data: {} });
  ok('1i 空数据 score=0 且不抛错', m0.score === 0, 'score=' + m0.score);

  // 1j 建议区不误报「深睡比例偏低」
  const adv1 = app._sleepAdviceFor(m1, { data: { bedtime: '23:00', wake: '07:00' } });
  const txt1 = adv1.map(x => x.text).join(' | ');
  ok('1j 无分期时建议提示补齐而非误报偏低', txt1.indexOf('未填写') >= 0 && txt1.indexOf('深睡比例偏低') < 0, txt1.slice(0, 80));

  // ============ 2. 库存面板顺序 ============
  const fi = html.indexOf('storage-freq-panel');
  const ovi = html.indexOf('P35StOvOverview00001');
  ok('2a 使用频率面板在库存总览上方', fi >= 0 && ovi >= 0 && fi < ovi, 'freq=' + fi + ' overview=' + ovi);

  // ============ 3. 本周计划多端同步 ============
  app.state.settings.deletedPlanIds = [];
  const base = { id: 'move-1', group: '运动', title: '力量训练 2 次', note: '每次 30–40 分钟', done: false, updatedAt: 0 };
  const localOld = Object.assign({}, base, { done: false, updatedAt: 1000 });
  const remoteNew = Object.assign({}, base, { done: true, updatedAt: 2000 });

  const r1 = app.mergePlanList([localOld], [remoteNew]);
  ok('3a 远端更新 → 采用远端 done=true（旧逻辑会保留本地 false）', r1.length === 1 && r1[0].done === true, JSON.stringify(r1.map(x => ({ i: x.id, d: x.done, u: x.updatedAt }))));

  const r2 = app.mergePlanList([Object.assign({}, base, { done: true, updatedAt: 3000 })], [Object.assign({}, base, { done: false, updatedAt: 2000 })]);
  ok('3b 本地更新 → 保留本地 done=true', r2.length === 1 && r2[0].done === true, JSON.stringify(r2.map(x => ({ i: x.id, d: x.done, u: x.updatedAt }))));

  const r3 = app.mergePlanList([Object.assign({}, base, { id: 'a' })], [Object.assign({}, base, { id: 'b' })]);
  ok('3c 不同 id 全部保留（不丢项）', r3.length === 2, 'n=' + r3.length);

  app.state.settings.deletedPlanIds = ['move-1'];
  const r4 = app.mergePlanList([], [Object.assign({}, base, { done: true, updatedAt: 5000 })]);
  ok('3d 删除墓碑生效：远端旧项不再复活', r4.length === 0, 'n=' + r4.length);
  app.state.settings.deletedPlanIds = [];

  const r5 = app.mergePlanList([Object.assign({}, base, { done: true, updatedAt: 1000 })], [Object.assign({}, base, { done: true, updatedAt: 900 })]);
  ok('3e 同 id 去重不产生重复条目', r5.length === 1, 'n=' + r5.length);

  // 渲染层面：计划勾选后写 updatedAt
  ok('3f 勾选逻辑写入 updatedAt', html.indexOf("item.done=!item.done;item.updatedAt=Date.now();") >= 0);
  ok('3g 删除逻辑写墓碑', html.indexOf('deletedPlanIds') >= 0 && html.indexOf("state.settings.deletedPlanIds=[...new Set(") >= 0);
  ok('3h 墓碑纳入上传 payload', html.indexOf('periodPinSalt:snap.periodPinSalt,deletedPlanIds:snap.deletedPlanIds') >= 0);
  ok('3i 墓碑在合并前同步', html.indexOf('Array.isArray(s.deletedPlanIds)') >= 0);

  // ============ 4. 拳头法对照表 ============
  const panel = doc.querySelector('.fist-guide-panel');
  ok('4a 拳头法面板存在', !!panel);
  const groups = panel ? panel.querySelectorAll('.fist-group') : [];
  ok('4b 6 个份量分组', groups.length === 6, 'n=' + groups.length);
  const text = panel ? panel.textContent : '';
  ok('4c 含一拳头碳水', text.indexOf('一拳头碳水') >= 0);
  ok('4d 含一掌心蛋白质', text.indexOf('一掌心蛋白质') >= 0);
  ok('4e 含一大拇指脂肪', text.indexOf('一大拇指脂肪') >= 0);
  ok('4f 含示例食物 白米饭/半碗', text.indexOf('白米饭') >= 0 && text.indexOf('半碗') >= 0);
  ok('4g 含示例食物 牛油果/1/4 个', text.indexOf('牛油果') >= 0 && text.indexOf('1/4 个') >= 0);
  ok('4h 含扩充分组 两捧蔬菜/一拳水果', text.indexOf('两捧蔬菜') >= 0 && text.indexOf('一拳水果') >= 0);
  ok('4i 每餐配比提示', text.indexOf('1 拳主食') >= 0 && text.indexOf('1 掌心蛋白') >= 0);
  const items = panel ? panel.querySelectorAll('.fist-item') : [];
  ok('4j 食物条目 >= 30 条', items.length >= 30, 'n=' + items.length);

  console.log(P.logs.join('\n'));
  console.log('\n结果: ' + P.pass + ' 通过 / ' + P.fail + ' 失败');
  process.exit(P.fail ? 1 : 0);
})();
