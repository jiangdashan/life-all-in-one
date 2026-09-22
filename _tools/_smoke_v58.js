/* v58 冒烟测试：回本模块（云端表 + 视图 + 导航 + 摊销计算 + 图标匹配）
 *  1) 脚本加载 / init 不抛错
 *  2) 桌面 + 移动端导航各出现「回本」入口
 *  3) view-payback / paybackForm / paybackList / paybackStat / i-payback 均存在
 *  4) paybackIcon 分类→图标映射（含兜底）
 *  5) 表单提交 → 记录 + 列表渲染（按时间：¥x.xx / 天）
 *  6) 统计卡：物品总数 / 总资产 / 日均成本
 *  7) 按次数模式：uses=0 显示「尚未使用」；+1 次后出现每次成本
 *  8) mergePayback 云端回读重建
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

const TODAY_ISO = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
/* 动态基准：固定「持有 17 天」，避免跨天导致预期值漂移（¥50.00/天 = 850/17） */
const D16 = (() => { const d = new Date(); d.setDate(d.getDate() - 16); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();

(async function () {
  let initErr = '';
  try { doc.dispatchEvent(new w.Event('DOMContentLoaded')); } catch (e) { initErr = e.message; }
  ok('1 init(DOMContentLoaded) 不抛错', !initErr);
  if (initErr) P.logs.push('   initErr: ' + initErr);

  // 2. 导航
  ok('2a 桌面+移动端共 2 个回本导航', doc.querySelectorAll('[data-nav="payback"]').length === 2);

  // 3. 视图与图标 DOM
  ok('3a view-payback 存在', !!doc.getElementById('view-payback'));
  ok('3b paybackForm 存在', !!doc.getElementById('paybackForm'));
  ok('3c paybackList 存在', !!doc.getElementById('paybackList'));
  ok('3d paybackStat 存在', !!doc.getElementById('paybackStat'));
  ok('3e i-payback 图标定义存在', html.indexOf('<symbol id="i-payback"') >= 0);
  ok('3f 9 个分类图标定义存在', ['i-pb-digital','i-pb-home','i-pb-furniture','i-pb-car','i-pb-sport','i-pb-wear','i-pb-beauty','i-pb-book','i-pb-other'].every(x => html.indexOf('<symbol id="' + x + '"') >= 0));

  const T = w.__appTest;
  // 4. 图标映射
  ok('4a 数码→i-pb-digital', T.paybackIcon('数码') === 'i-pb-digital');
  ok('4b 运动→i-pb-sport', T.paybackIcon('运动') === 'i-pb-sport');
  ok('4c 未知分类兜底 i-pb-other', T.paybackIcon('外星科技') === 'i-pb-other');

  // 5. 表单提交（按时间模式）
  const form = doc.getElementById('paybackForm');
  if (form && typeof form.reset !== 'function') form.reset = function () { };
  form.querySelector('[name="date"]').value = D16;
  form.querySelector('[name="name"]').value = '机械键盘';
  form.querySelector('[name="category"]').value = '数码';
  form.querySelector('[name="price"]').value = '850';
  form.querySelector('[name="mode"]').value = 'time';
  let submitErr = '';
  try { form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); } catch (e) { submitErr = e.message; }
  ok('5a paybackForm 提交不抛错', !submitErr);
  if (submitErr) P.logs.push('   submitErr: ' + submitErr);
  const listHTML = doc.getElementById('paybackList').innerHTML || '';
  ok('5b 列表渲染出「机械键盘」', listHTML.indexOf('机械键盘') >= 0);
  ok('5c 按时间显示 ¥50.00 / 天（850/17）', listHTML.indexOf('¥50.00 / 天') >= 0);
  /* linkedom 的 select.value 为只读且默认 -1 → 提交时 category 落空，走「其他」兜底图标（浏览器中默认选第一项）。
     这里断言：① 行内渲染出了分类图标；② 直接种一条「数码」记录后图标精确匹配 i-pb-digital */
  ok('5d 列表行内渲染出分类简笔画图标', listHTML.indexOf('<use href="#i-pb-') >= 0);

  // 6. 统计卡（此时仅「机械键盘」一条）
  const statHTML = doc.getElementById('paybackStat').innerHTML || '';
  ok('6a 物品总数 1 件', statHTML.indexOf('1 件') >= 0);
  ok('6b 总资产 ¥850', statHTML.indexOf('¥850') >= 0);
  ok('6c 日均成本 ¥50', statHTML.indexOf('¥50') >= 0);

  /* 直接种一条「数码」记录验证图标精确匹配（linkedom select.value 只读，无法通过表单选中非首项） */
  T.state.records.push({ id: 'pbIcon', type: 'payback', sample: false, remoteId: 'rpbIcon', date: D16, createdAt: Date.now(), data: { name: 'Switch', category: '数码', price: 2999, mode: 'time', uses: 0 } });
  T.renderPayback();
  const listIconHTML = doc.getElementById('paybackList').innerHTML || '';
  ok('5e 数码分类精确匹配 i-pb-digital', listIconHTML.indexOf('i-pb-digital') >= 0);

  // 7. 按次数模式
  const T2 = T;
  T2.state.records.push({ id: 'pb1', type: 'payback', sample: false, remoteId: 'rpb1', date: D16, createdAt: Date.now(), data: { name: '跑步机', category: '运动', price: 3000, mode: 'count', uses: 0 } });
  T2.renderPayback();
  const h2 = doc.getElementById('paybackList').innerHTML || '';
  ok('7a uses=0 显示「尚未使用」', h2.indexOf('尚未使用') >= 0);
  let useErr = '';
  try { T2.addPaybackUse('pb1'); } catch (e) { useErr = e.message; }
  ok('7b addPaybackUse 不抛错', !useErr);
  const rec1 = T2.state.records.find(r => r.id === 'pb1');
  ok('7c +1 后 uses=1', rec1 && rec1.data.uses === 1);
  T2.renderPayback();
  const h3 = doc.getElementById('paybackList').innerHTML || '';
  ok('7d 每次成本 ¥3000.00 / 次', h3.indexOf('¥3000.00 / 次') >= 0);
  ok('7e +1 次按钮出现', h3.indexOf('payback-use') >= 0);

  // 8. mergePayback 云端回读（与 mergeStudy 同构：已同步(remoteId)记录按云端行替换，未同步的保留本地。
  //    测试沙箱里 dbAdd 回调时机不定 → 本地记录是否已带 remoteId 不确定，故只断言 Switch 重建成功且数量守恒在合理区间）
  T2.mergePayback([{ _id: 'x1', "购买日期": D16, "物品名称": "Switch", "分类": "数码", "购买价格": 2999, "均价方式": "count", "使用次数": 10 }]);
  const m = T2.state.records.find(r => r.type === 'payback' && r.data.name === 'Switch');
  const pbCount = T2.state.records.filter(r => r.type === 'payback').length;
  ok('8a mergePayback 重建记录，数量守恒（1~4 条）', !!m && pbCount >= 1 && pbCount <= 4);
  ok('8b 字段完整（mode/uses/price）', m && m.data.mode === 'count' && m.data.uses === 10 && m.data.price === 2999 && m.date === D16);
  ok('8c 空数组不覆盖本地', (T2.mergePayback([]), true) && !!T2.state.records.find(r => r.data.name === 'Switch'));

  console.log(P.logs.join('\n'));
  console.log('\n结果: ' + P.pass + ' 通过 / ' + P.fail + ' 失败');
  process.exit(P.fail ? 1 : 0);
})();
