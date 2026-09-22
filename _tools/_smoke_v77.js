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
  // v77：四处错乱修复（心情月历第7列 / 物品明细 / 消费结构圆环字号 / 身体记录）
  // ==========================================================
  const cssText = Array.from(doc.querySelectorAll('style')).map(s => s.textContent || '').join('\n');
  function el(id) { return doc.getElementById(id); }

  // A. CSS 落盘断言
  ok('A1 月历 7 列改 minmax(0,1fr) 防溢出', cssText.indexOf('.mood-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))') >= 0);
  ok('A2 月历旧 repeat(7,1fr) 已移除', cssText.indexOf('.mood-calendar{display:grid;grid-template-columns:repeat(7,1fr)') < 0);
  ok('A3 移动端月历格子 min-height 38px', cssText.indexOf('.mood-calendar .cal-cell{min-height:38px;border-radius:9px;gap:1px}') >= 0);
  ok('A4 回本 amount 移到第二行', cssText.indexOf('#paybackList .record-amount{grid-column:2;grid-row:2;justify-self:start') >= 0);
  ok('A5 回本 3 列网格', cssText.indexOf('#paybackList .record-row{grid-template-columns:38px minmax(0,1fr) 30px') >= 0);
  ok('A6 身体日志行距 1.6', cssText.indexOf('#fitnessList .record-main small{max-width:100%;line-height:1.6;margin-top:3px}') >= 0);
  ok('A7 指标 nb 不拆词', cssText.indexOf('.record-main small .nb{white-space:nowrap}') >= 0);

  // B. 渲染验证（示例数据会混进统计，先清空）
  T.state.records = [];
  T.state.mediaItems = [];
  T.state.habits = [];
  T.state.shoppingItems = T.state.shoppingItems || [];
  const today = new Date();
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const todayS = iso(today);
  function shift(n) { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); }

  // 记账：大金额 → 圆环中心数字需自适应缩小
  T.state.records.push(
    { id: 'm1', type: 'money', date: todayS, createdAt: Date.now(), data: { flow: 'expense', amount: 22937.91, category: '其他' } },
    { id: 'm2', type: 'money', date: todayS, createdAt: Date.now() + 1, data: { flow: 'expense', amount: 1000, category: '吃饭' } }
  );
  // 减脂：塞满全部身体指标 → 触发超长详情文本
  T.state.records.push(
    { id: 'f1', type: 'fitness', date: todayS, createdAt: Date.now(), data: { weight: 54.9, bodyFat: 27.8, bodyFatKg: 15.3, skeletalMuscle: 21.6, bodyWater: 28.9, bmr: 1225, waistHipRatio: 0.84, bodyAge: 31 } }
  );
  // 回本：长名称按时间
  T.state.records.push(
    { id: 'pb1', type: 'payback', date: shift(-300), createdAt: Date.now(), data: { name: '华为Mate60Pro', category: '数码', price: 7995.17, mode: 'time' } }
  );
  // 心情：当月多天
  ['02','05','09','16','22'].forEach(function(dd, i) {
    T.state.records.push({ id: 'mo' + i, type: 'mood', date: todayS.slice(0, 8) + dd, createdAt: Date.now() + i, data: { score: 4, feeling: '不错', tag: '平静' } });
  });

  let errAll = null;
  try { T.renderAll(); } catch (e) { errAll = e; console.log('renderAll ERR:', e && e.message); }
  ok('B1 renderAll 不抛错', !errAll);

  // 用导出的渲染函数重新渲染（renderAll 用 _safeRender 吞错，需直接调才看得见异常）
  let eM = null; try { T.renderMoney(); } catch (e) { eM = e; console.log('renderMoney ERR:', e && e.message); }
  ok('B1b renderMoney 不抛错（长金额）', !eM);
  let eF = null; try { T.renderFitness(); } catch (e) { eF = e; console.log('renderFitness ERR:', e && e.message); }
  ok('B1c renderFitness 不抛错（满指标）', !eF);
  let ePb = null; try { T.renderPayback(); } catch (e) { ePb = e; console.log('renderPayback ERR:', e && e.message); }
  ok('B1d renderPayback 不抛错（长名称）', !ePb);

  const fl = el('fitnessList');
  ok('B2 身体记录指标用 nb span 包裹（不拆词）', !!fl && (fl.innerHTML || '').indexOf('class="nb"') >= 0);
  ok('B3 身体记录含「体脂肪」完整词', !!fl && (fl.innerHTML || '').indexOf('体脂肪') >= 0);

  const pie = el('moneyPie');
  const pieHtml = pie ? (pie.innerHTML || '') : '';
  ok('B4 消费结构圆环中心数字已渲染', pieHtml.indexOf('本月支出') >= 0);
  ok('B5 长金额不再用固定 20px（自适应缩小）', pieHtml.indexOf('font-size="20"') < 0);
  const fsMatch = pieHtml.match(/font-size="(\d+)"/g) || [];
  ok('B6 圆环第二处字号为自适应值（<=19）', fsMatch.length >= 2 && Number((fsMatch[1].match(/\d+/) || [0])[0]) <= 19);

  const ml = el('paybackList');
  ok('B7 物品明细渲染成功', !!ml && (ml.innerHTML || '').indexOf('华为Mate60Pro') >= 0);

  const mc = el('moodCalendar');
  const wk = mc ? mc.querySelectorAll('.cal-weekday').length : 0;
  ok('B8 心情月历渲染 7 列表头', wk === 7);

  console.log('\nRESULT: pass=' + P.pass + ' fail=' + P.fail);
  process.exit(P.fail > 0 ? 1 : 0);
})().catch(e => { console.log('FATAL', e && e.message, e && e.stack); process.exit(1); });
