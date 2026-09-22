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
  // ==========================================================
  // A. 移动端导航必须能看到「倒数日」
  // ==========================================================
  const mn = doc.querySelector('.mobile-nav');
  ok('A1 移动端导航存在', !!mn);
  const mnNavs = Array.from(mn ? mn.querySelectorAll('[data-nav]') : []).map(b => b.getAttribute('data-nav'));
  ok('A2 移动端导航 16 个模块', mnNavs.length === 16);
  ok('A3 移动端导航含 countdown', mnNavs.indexOf('countdown') >= 0);
  const cdBtn = mn ? mn.querySelector('[data-nav="countdown"]') : null;
  ok('A4 倒数日按钮有图标与文字', !!cdBtn && !!cdBtn.querySelector('use') && (cdBtn.textContent || '').indexOf('倒数') >= 0);
  ok('A5 图标引用 i-countdown 且图标已定义',
    !!cdBtn && (cdBtn.querySelector('use').getAttribute('href') || '') === '#i-countdown'
    && !!doc.getElementById('i-countdown'));
  // 点它要能切到倒数日视图
  cdBtn.dispatchEvent(new w.Event('click', { bubbles: true }));
  ok('A6 点击后切到 countdown 视图', T.state.settings.view === 'countdown' || T.state.view === 'countdown' || (doc.getElementById('view-countdown') && doc.getElementById('view-countdown').className.indexOf('active') >= 0));

  // ==========================================================
  // B. P1 三档层级：每个模块一个主数字 + 一句结论
  // ==========================================================
  // 清掉应用播种的示例数据，避免污染统计
  T.state.records = [];
  T.state.mediaItems = [];
  T.state.habits = [];

  const today = new Date();
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const todayS = iso(today);
  const monthS = todayS.slice(0, 7);
  function shift(n) { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); }

  function el(id) { return doc.getElementById(id); }
  function miHtml(name) { const e = el('mi' + name); return e ? e.innerHTML : ''; }
  function miText(name) { const e = el('mi' + name); return e ? (e.textContent || '') : ''; }

  // ---- 数据全部为空时，十个 insight 都应隐藏 ----
  T.renderModuleInsights();
  const NAMES = ['Money', 'Habits', 'Fitness', 'Sleep', 'Study', 'Planner', 'Home', 'Diet', 'Storage', 'Payback'];
  ok('B1 空数据时十个 insight 全部隐藏', NAMES.every(n => { const e = el('mi' + n); return e && e.hidden; }));

  // ---- 记账：本月支出 + 比上月 ----
  T.state.records.push(
    { id: 'm1', type: 'money', date: todayS, createdAt: Date.now(), data: { flow: 'expense', amount: 300, category: '餐饮' } },
    { id: 'm2', type: 'money', date: todayS, createdAt: Date.now() + 1, data: { flow: 'expense', amount: 200, category: '交通' } }
  );
  T.renderModuleInsights();
  ok('B2 记账主数字 = 本月支出', miText('Money').indexOf('500') >= 0);
  ok('B3 记账 eyebrow 是「本月支出」', miHtml('Money').indexOf('本月支出') >= 0);
  ok('B4 记账有结论句', miHtml('Money').indexOf('mi-note') >= 0);
  ok('B5 记账 insight 已显示', el('miMoney').hidden === false);
  ok('B6 主数字用 <b> 包裹（最大字号）', /<b>[\s\S]*?<\/b>/.test(miHtml('Money')));

  // ---- 习惯 ----
  T.state.habits = [
    { name: '喝水', target: 1, entries: {} },
    { name: '读书', target: 1, entries: {} }
  ];
  T.state.habits[0].entries[todayS] = 1;
  T.renderModuleInsights();
  ok('B7 习惯主数字 = 完成/总数', miText('Habits').indexOf('1 / 2') >= 0);
  ok('B8 习惯 eyebrow 是「今日打卡」', miHtml('Habits').indexOf('今日打卡') >= 0);

  // ---- 减脂 ----
  T.state.records.push(
    { id: 'f1', type: 'fitness', date: todayS, createdAt: Date.now(), data: { weight: 60 } },
    { id: 'f2', type: 'fitness', date: shift(-7), createdAt: Date.now() - 1, data: { weight: 62 } }
  );
  T.renderModuleInsights();
  ok('B9 减脂主数字 = 当前体重', miText('Fitness').indexOf('60.0') >= 0);
  ok('B10 减脂结论含「比上次轻」', miText('Fitness').indexOf('比上次轻') >= 0);

  // ---- 日程 ----
  T.state.records.push(
    { id: 'p1', type: 'planner', date: todayS, createdAt: Date.now(), data: { title: '交房租', done: false } },
    { id: 'p2', type: 'planner', date: shift(5), createdAt: Date.now() + 1, data: { title: '取快递', done: false } },
    { id: 'p3', type: 'planner', date: shift(-2), createdAt: Date.now() + 2, data: { title: '买菜', done: true } }
  );
  T.renderModuleInsights();
  ok('B11 日程主数字 = 未完成件数', miText('Planner').indexOf('2 件') >= 0);
  ok('B12 日程结论提到今天该做', miText('Planner').indexOf('今天该做') >= 0);

  // ---- 待买 ----
  T.state.records.push(
    { id: 'h1', type: 'home', date: todayS, createdAt: Date.now(), data: { name: '洗衣液', price: 30, bought: false } },
    { id: 'h2', type: 'home', date: todayS, createdAt: Date.now() + 1, data: { name: '燕麦奶', price: 18, bought: true, boughtDate: todayS } }
  );
  T.renderModuleInsights();
  ok('B13 待买主数字 = 未买件数', miText('Home').indexOf('1 件') >= 0);
  ok('B14 待买结论含本月已买', miText('Home').indexOf('本月已买 1 件') >= 0);

  // ---- 学习 ----
  T.state.records.push(
    { id: 's1', type: 'study', date: todayS, createdAt: Date.now(), data: { subject: '高数', minutes: 50, category: '练习' } }
  );
  T.renderModuleInsights();
  ok('B15 学习主数字 = 近 7 天时长', miText('Study').indexOf('50 分钟') >= 0);
  ok('B16 学习结论提到今天', miText('Study').indexOf('今天 50 分钟') >= 0);

  // ---- 饮食 ----
  T.state.records.push(
    { id: 'd1', type: 'diet', date: todayS, createdAt: Date.now(), data: { food: '米饭', meal: '午餐', calories: 600 } },
    { id: 'd2', type: 'diet', date: todayS, createdAt: Date.now() + 1, data: { food: '牛奶', meal: '早餐', calories: 200 } }
  );
  T.renderModuleInsights();
  ok('B17 饮食主数字 = 今日 kcal', miText('Diet').indexOf('800') >= 0);
  ok('B18 饮食结论含餐数', miText('Diet').indexOf('2 餐') >= 0);

  // ---- 物品 ----
  T.state.records.push(
    { id: 'st1', type: 'storage', date: todayS, createdAt: Date.now(), data: { name: '大米', category: '食品', quantity: 3, location: '厨房' } },
    { id: 'st2', type: 'storage', date: todayS, createdAt: Date.now() + 1, data: { name: '纸巾', category: '日用', quantity: 12, location: '储物间' } }
  );
  T.renderModuleInsights();
  ok('B19 物品主数字 = 种类数', miText('Storage').indexOf('2 种') >= 0);
  ok('B20 物品结论含件数与位置', miText('Storage').indexOf('15 件在库') >= 0 && miText('Storage').indexOf('2 个位置') >= 0);

  // ---- 回本 ----
  T.state.records.push(
    { id: 'pb1', type: 'payback', date: todayS, createdAt: Date.now(), data: { name: '跑步机', category: '运动', price: 2000, mode: 'time' } }
  );
  T.renderModuleInsights();
  ok('B21 回本主数字 = 总投入', miText('Payback').indexOf('2,000') >= 0 || miText('Payback').indexOf('2000') >= 0);
  ok('B22 回本结论含件数', miText('Payback').indexOf('1 件在用') >= 0);

  // ==========================================================
  // C. 结构：三档字号层级真的存在（CSS 变量层）
  // ==========================================================
  const cssText = Array.from(doc.querySelectorAll('style')).map(s => s.textContent || '').join('\n');
  ok('C1 样式表含 .mi-main b（主数字）', cssText.indexOf('.mi-main b{') >= 0);
  ok('C2 样式表含 .mi-note（一句结论）', cssText.indexOf('.mi-note{') >= 0);
  ok('C3 样式表含 .mi-eyebrow（小标签）', cssText.indexOf('.mi-eyebrow{') >= 0);
  ok('C4 全局等宽数字已开启', cssText.indexOf('font-variant-numeric:tabular-nums') >= 0);
  ok('C5 主数字字号大于结论句字号', (function () {
    const a = cssText.match(/\.mi-main b\{[^}]*font:700 (\d+)px/);
    const b = cssText.match(/\.mi-note\{[^}]*font-size:(\d+(?:\.\d+)?)px/);
    return a && b && Number(a[1]) > Number(b[1]) * 1.5;
  })());
  ok('C6 空状态副提示样式存在', cssText.indexOf('.empty-hint{') >= 0);

  // ==========================================================
  // D. empty() 向后兼容 + 新增副提示
  // ==========================================================
  const e1 = T.empty('这里还没有物品');
  ok('D1 empty 单参数仍可用', e1.indexOf('empty-state') >= 0 && e1.indexOf('这里还没有物品') >= 0);
  ok('D2 empty 单参数不带副提示', e1.indexOf('empty-hint') < 0);
  const e2 = T.empty('这里还没有物品', '添加第一件后，这里会出现它的位置');
  ok('D3 empty 双参数带副提示', e2.indexOf('empty-hint') >= 0 && e2.indexOf('添加第一件后') >= 0);

  // ==========================================================
  // E. 回归：renderAll 不因为 insight 报错，且十个容器都被填过
  // ==========================================================
  let thrown = null;
  try { T.renderModuleInsights(); } catch (e) { thrown = e; }
  ok('E1 renderModuleInsights 不抛错', !thrown);
  ok('E2 有数据的模块已显示', el('miMoney').hidden === false && el('miPlanner').hidden === false);
  ok('E3 无数据的模块保持隐藏', el('miSleep').hidden === true);

  console.log('\nRESULT: pass=' + P.pass + ' fail=' + P.fail);
  process.exit(P.fail > 0 ? 1 : 0);
})().catch(e => { console.log('FATAL', e && e.message, e && e.stack); process.exit(1); });
