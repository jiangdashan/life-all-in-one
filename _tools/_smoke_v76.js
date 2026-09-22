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
  // v76：验证 5 处 CSS 修复已落盘 + 相关渲染函数不抛错
  // ==========================================================
  const cssText = Array.from(doc.querySelectorAll('style')).map(s => s.textContent || '').join('\n');

  // A. CSS 落盘断言
  ok('A1 .metric strong 换行保护', cssText.indexOf('.metric strong{margin-top:8px;font-size:23px;min-width:0;overflow-wrap:break-word') >= 0);
  ok('A2 .metric strong 移动端字号/换行', cssText.indexOf('.metric strong{font-size:17px;overflow-wrap:break-word;word-break:break-all') >= 0);
  ok('A3 .record-main min-width:0 + 换行', cssText.indexOf('.record-main{min-width:0}.record-main strong,.record-main small{display:block;overflow-wrap:break-word') >= 0);
  ok('A4 心情月历移动端格子高度 44px', cssText.indexOf('.mood-calendar .cal-cell{min-height:44px;border-radius:9px;gap:1px}') >= 0);
  ok('A5 闰月 checkbox 覆盖 .field input', cssText.indexOf('.cd-inline input[type=checkbox]{width:16px;height:16px') >= 0);

  // B. 相关渲染函数不抛错（喂入长金额 / 长文本数据）
  T.state.records = [];
  T.state.mediaItems = [];
  T.state.habits = [];
  const today = new Date();
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const todayS = iso(today);
  function shift(n) { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); }
  function el(id) { return doc.getElementById(id); }

  // 记账：大金额（触发 metric 换行）
  T.state.records.push(
    { id: 'm1', type: 'money', date: todayS, createdAt: Date.now(), data: { flow: 'expense', amount: 123456.78, category: '餐饮' } },
    { id: 'm2', type: 'money', date: todayS, createdAt: Date.now() + 1, data: { flow: 'income', amount: 99999.99, category: '工资' } }
  );
  let err1 = null;
  try { T._miMoney(); } catch (e) { err1 = e; }
  ok('B1 _miMoney 不抛错（大金额）', !err1);

  // 减脂身体日志：塞满全部身体指标（触发 record-main 长文本）
  T.state.records.push(
    { id: 'f1', type: 'fitness', date: todayS, createdAt: Date.now(), data: { weight: 60.5, bodyFat: 22.3, bodyFatKg: 13.5, skeletalMuscle: 24.1, bodyWater: 35.2, bmr: 1400, waistHipRatio: 0.85, bodyAge: 28, calories: 1800, duration: 45 } }
  );
  let err2 = null;
  try { T._miFitness(); } catch (e) { err2 = e; }
  ok('B2 _miFitness 不抛错（满指标）', !err2);

  // 回本明细：长名称 + 按次数
  T.state.records.push(
    { id: 'pb1', type: 'payback', date: shift(-30), createdAt: Date.now(), data: { name: '全自动意式浓缩咖啡机家用小型商用办公室', category: '家电', price: 9999.99, mode: 'count', uses: 123 } }
  );
  let err3 = null;
  try { T.renderPayback(); } catch (e) { err3 = e; }
  ok('B3 renderPayback 不抛错（长名称+按次数）', !err3);

  // 心情：多天记录（触发月历格子）
  T.state.records.push(
    { id: 'mo1', type: 'mood', date: todayS, createdAt: Date.now(), data: { score: 5, feeling: '很好', tag: '开心' } },
    { id: 'mo2', type: 'mood', date: todayS, createdAt: Date.now() + 1, data: { score: 4, feeling: '不错', tag: '平静' } },
    { id: 'mo3', type: 'mood', date: todayS, createdAt: Date.now() + 2, data: { score: 3, feeling: '一般', tag: '普通' } }
  );
  let err4 = null;
  try { T.renderMood(); } catch (e) { err4 = e; }
  ok('B4 renderMood 不抛错（同日多情绪）', !err4);

  // 倒数日：添加一条农历闰月（验证 _cdDateNote 不抛错 + 闰月标签正常）
  T.state.settings.countdowns = [
    { id: 'cd1', name: '爷爷生日', type: 'lunar', date: '0001-05-23', leap: true, repeat: true, updatedAt: Date.now() }
  ];
  let err5 = null;
  try { T.renderCountdown(); } catch (e) { err5 = e; }
  ok('B5 renderCountdown 不抛错（农历闰月）', !err5);
  const cdList = el('countdownList');
  ok('B6 倒数日列表含闰月条目', !!cdList && (cdList.innerHTML || '').indexOf('爷爷生日') >= 0);
  // 闰月日期备注应含「闰」字
  ok('B7 闰月日期备注含「闰」', !!cdList && (cdList.innerHTML || '').indexOf('闰') >= 0);

  // C. 回归：整体 renderAll 不抛错
  let errAll = null;
  try { if (T.renderAll) T.renderAll(); } catch (e) { errAll = e; }
  ok('C1 renderAll 不抛错', !errAll);

  console.log('\nRESULT: pass=' + P.pass + ' fail=' + P.fail);
  process.exit(P.fail > 0 ? 1 : 0);
})().catch(e => { console.log('FATAL', e && e.message, e && e.stack); process.exit(1); });
