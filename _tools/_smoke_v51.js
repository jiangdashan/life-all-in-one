/* v51 冒烟测试：计划吃什么「已吃」状态不再复活
 *  1) mergeDietPlans 字段级合并：done 用「或」，任一端吃过 → 永远算吃过
 *  2) 已完成项不再被另一端 done:false 覆盖
 *  3) _dietPlanEatenByRecord 自愈判定：三餐记录里已有同名食物 → 视为已吃
 *  4) renderDietPlan 隐藏已吃项并落盘
 *  5) 边界：先吃后加计划（同日、记录早于计划创建）→ 不应误判为已吃
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
  // ============ 1. mergeDietPlans：done 用「或」，不可逆 ============
  const A = { text: '饺子馄饨汤底+水煮蛋', date: '2026-09-15', done: false };
  const B = { text: '饺子馄饨汤底+水煮蛋', date: '2026-09-15', done: true, doneAt: 111 };

  const m1 = app.mergeDietPlans([A], [B]);
  ok('1a 本地未吃 + 远端已吃 → 合并为已吃', m1.length === 1 && m1[0].done === true, JSON.stringify(m1));

  const m2 = app.mergeDietPlans([B], [A]);
  ok('1b 本地已吃 + 远端未吃 → 仍为已吃（旧版会被覆盖成未吃）', m2.length === 1 && m2[0].done === true, JSON.stringify(m2));

  ok('1c doneAt 保留最大时间戳', m2[0].doneAt === 111, 'doneAt=' + m2[0].doneAt);

  const m3 = app.mergeDietPlans([A, B], []);
  ok('1d 同 text|date 去重不产生重复条目', m3.length === 1, 'n=' + m3.length);

  const C = { text: '番茄咖喱土豆鱼丸肥牛+糙米饭', date: '2026-09-16', done: false };
  const m4 = app.mergeDietPlans([A], [C]);
  ok('1e 不同条目全部保留', m4.length === 2, 'n=' + m4.length);

  const m5 = app.mergeDietPlans([], []);
  ok('1f 空数组合并不抛错', Array.isArray(m5) && m5.length === 0);

  const m6 = app.mergeDietPlans([{ text: 'x', date: '2026-09-15', at: 5000 }], [{ text: 'x', date: '2026-09-15', at: 0, done: false }]);
  ok('1g at 创建时间保留（取已知最早）', m6[0].at === 5000, 'at=' + m6[0].at);

  // ============ 2. 自愈判定 _dietPlanEatenByRecord ============
  const recs = [
    { id: 'r1', type: 'diet', date: '2026-09-16', createdAt: 1000, data: { food: '饺子馄饨汤底+水煮蛋', meal: '晚餐', calories: 500 } },
    { id: 'r2', type: 'diet', date: '2026-09-16', createdAt: 2000, data: { food: '番茄咖喱土豆鱼丸肥牛+糙米饭', meal: '晚餐', calories: 700 } }
  ];
  app.state.records = recs;

  const p1 = { text: '饺子馄饨汤底+水煮蛋', date: '2026-09-15', done: false, at: 900 };  // 计划 15 号建，16 号吃了
  ok('2a 记录晚于计划日期 → 判定已吃', app._dietPlanEatenByRecord(p1) === true);

  const p2 = { text: '番茄咖喱土豆鱼丸肥牛+糙米饭', date: '2026-09-16', done: false, at: 900 }; // 同日，记录(1000/2000)晚于计划创建(900)
  ok('2b 同日但记录晚于计划创建 → 判定已吃', app._dietPlanEatenByRecord(p2) === true);

  const p3 = { text: '还没吃过的菜', date: '2026-09-16', done: false, at: 900 };
  ok('2c 没有对应记录 → 未吃', app._dietPlanEatenByRecord(p3) === false);

  // 边界：先吃后加计划（同日，记录时间早于计划创建时间）→ 不应误判
  const pEdge = { text: '饺子馄饨汤底+水煮蛋', date: '2026-09-16', done: false, at: 5000 };
  ok('2d 同日「先吃后加进计划」不误判为已吃', app._dietPlanEatenByRecord(pEdge) === false);

  // 边界：记录日期早于计划日期（老记录）→ 不误判
  const pPast = { text: '饺子馄饨汤底+水煮蛋', date: '2026-09-20', done: false, at: 100 };
  ok('2e 记录早于计划日期 → 不误判为已吃', app._dietPlanEatenByRecord(pPast) === false);

  // 显式 done 优先
  ok('2f 显式 done=true 直接判定已吃', app._dietPlanEatenByRecord({ text: 'zzz', date: '2026-09-01', done: true }) === true);

  // 非 diet 记录不参与判定
  app.state.records = [{ id: 'r3', type: 'money', date: '2026-09-16', createdAt: 9000, data: { food: '饺子馄饨汤底+水煮蛋' } }];
  ok('2g 非 diet 记录不参与判定', app._dietPlanEatenByRecord({ text: '饺子馄饨汤底+水煮蛋', date: '2026-09-15', done: false }) === false);

  // 空 text 不崩
  app.state.records = recs;
  ok('2h 空 text 安全返回 false', app._dietPlanEatenByRecord({ text: '', date: '2026-09-15' }) === false);

  // ============ 2x. 片段匹配（复刻线上真实场景） ============
  // 用户点「吃这餐」后在预填文本上继续加东西 → 整串包含匹配不到
  app.state.records = [
    { id: 'x1', type: 'diet', date: '2026-09-16', createdAt: 900, data: { food: '饺子馄饨汤底+咸奶茶+可可麦芬+水煮蛋2+魔芋爽6', meal: '午餐', calories: 600 } },
    { id: 'x2', type: 'diet', date: '2026-09-16', createdAt: 900, data: { food: '番茄咖喱土豆鱼丸肥牛+糙米饭', meal: '晚餐', calories: 500 } }
  ];
  const s1 = { text: '饺子馄饨汤底+水煮蛋', date: '2026-09-15', done: false, at: 900 };
  ok('2i 计划文本被扩写后仍判为已吃（片段全中）', app._dietPlanEatenByRecord(s1) === true);
  const s2 = { text: '蒸红薯+蒸玉米+水煮蛋', date: '2026-09-15', done: false, at: 900 };
  ok('2j 仅部分片段命中 → 仍算待吃（不误杀）', app._dietPlanEatenByRecord(s2) === false);
  const s3 = { text: '番茄咖喱土豆鱼丸肥牛+糙米饭', date: '2026-09-16', done: false, at: 900 };
  ok('2k 整串完全一致 → 判为已吃', app._dietPlanEatenByRecord(s3) === true);
  const s4 = { text: '水煮蛋', date: '2026-09-15', done: false, at: 900 };
  ok('2l 单片段计划用整串包含兜底', app._dietPlanEatenByRecord(s4) === true);
  const s5 = { text: '南瓜+山药', date: '2026-09-15', done: false, at: 900 };
  ok('2m 两片段都未出现 → 待吃', app._dietPlanEatenByRecord(s5) === false);

  // ============ 2y. 线上真实数据回归（7 条计划 → 只应剩 1 条待吃） ============
  app.state.records = [
    { id: 'z1', type: 'diet', date: '2026-09-14', createdAt: 5000, data: { food: '可可麦芬+玉米糊+煮鸡蛋+玉米+魔芋爽+鸭舌', meal: '午餐', calories: 500 } },
    { id: 'z2', type: 'diet', date: '2026-09-15', createdAt: 5000, data: { food: '土豆洋葱鸡蛋酱鸡肉肠糙米饭包卷饼', meal: '晚餐', calories: 500 } },
    { id: 'z3', type: 'diet', date: '2026-09-16', createdAt: 5000, data: { food: '饺子馄饨汤底+咸奶茶+可可麦芬+水煮蛋2+魔芋爽6', meal: '午餐', calories: 600 } },
    { id: 'z4', type: 'diet', date: '2026-09-16', createdAt: 5000, data: { food: '番茄咖喱土豆鱼丸肥牛+糙米饭', meal: '晚餐', calories: 500 } }
  ];
  const realPlans = [
    { text: '可可麦芬+玉米糊+煮鸡蛋+玉米', date: '2026-09-14', done: true },
    { text: '饺子馄饨汤底+水煮蛋', date: '2026-09-15', done: false },
    { text: '蒸红薯+蒸玉米+水煮蛋', date: '2026-09-15', done: false },
    { text: '米饭+油麦菜炒虾段', date: '2026-09-14', done: true },
    { text: '番茄咖喱土豆鱼丸肥牛+糙米饭', date: '2026-09-16', done: false }
  ];
  app.state.settings.dietPlans = realPlans.map(p => Object.assign({}, p, { at: 100 }));
  app.renderDietPlan();
  const realPending = app.state.settings.dietPlans.filter(p => !p.done).map(p => p.text);
  ok('2n 真实数据：只剩「蒸红薯+蒸玉米+水煮蛋」待吃', realPending.length === 1 && realPending[0] === '蒸红薯+蒸玉米+水煮蛋', JSON.stringify(realPending));

  // ============ 3. renderDietPlan 渲染层 ============
  app.state.settings.dietPlans = [
    { text: '饺子馄饨汤底+水煮蛋', date: '2026-09-15', done: false, at: 900 },
    { text: '蒸红薯+蒸玉米+水煮蛋', date: '2026-09-15', done: false, at: 900 },
    { text: '番茄咖喱土豆鱼丸肥牛+糙米饭', date: '2026-09-16', done: false, at: 900 }
  ];
  const list = doc.getElementById('dietPlanList');
  app.renderDietPlan();
  const htmlAfter = list ? list.innerHTML : '';
  ok('3a 已吃的第 1、3 条不再展示', htmlAfter.indexOf('饺子馄饨汤底') < 0 && htmlAfter.indexOf('番茄咖喱土豆鱼丸') < 0);
  ok('3b 未吃的第 2 条仍展示', htmlAfter.indexOf('蒸红薯+蒸玉米+水煮蛋') >= 0);
  ok('3c 渲染条数 = 1', (htmlAfter.match(/diet-plan-item/g) || []).length === 1, 'n=' + (htmlAfter.match(/diet-plan-item/g) || []).length);

  app.renderDietPlan();
  ok('3d 自愈后 done 落盘为 true', app.state.settings.dietPlans[0].done === true && app.state.settings.dietPlans[2].done === true,
    JSON.stringify(app.state.settings.dietPlans.map(x => x.done)));
  ok('3e 自愈项写入 doneAt', Number(app.state.settings.dietPlans[0].doneAt || 0) > 0);
  ok('3f 未吃项 done 保持 false', app.state.settings.dietPlans[1].done === false);

  // 重复渲染幂等
  const second = (app.renderDietPlan(), list.innerHTML);
  ok('3g 重复渲染结果一致（幂等）', second === htmlAfter);

  // 全部吃完 → 空态提示
  app.state.records = recs.concat([{ id: 'r4', type: 'diet', date: '2026-09-16', createdAt: 3000, data: { food: '蒸红薯+蒸玉米+水煮蛋' } }]);
  app.renderDietPlan();
  ok('3h 全部吃完显示空态', list.innerHTML.indexOf('没有待吃的计划') >= 0, list.innerHTML.slice(0, 60));

  // ============ 4. 源码层标记 ============
  ok('4a 吃这餐写 doneAt', html.indexOf('plan.done=true;plan.doneAt=Date.now();') >= 0);
  ok('4b 新增计划写 at 创建时间', html.indexOf('done:false,doneAt:0,at:Date.now()') >= 0);
  ok('4c mergeDietPlans 不再先到先得', html.indexOf('local.concat(remote).forEach(function(p){ if(!p) return; var k=key(p)') < 0);
  ok('4d 自愈函数已定义并导出', typeof app._dietPlanEatenByRecord === 'function');

  console.log(P.logs.join('\n'));
  console.log('\n结果: ' + P.pass + ' 通过 / ' + P.fail + ' 失败');
  process.exit(P.fail ? 1 : 0);
})();
