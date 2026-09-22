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
  // ================= A. 习惯健康页顶部不再有裸露 CSS =================
  const habitSec = doc.getElementById('view-habits');
  const habitTxt = habitSec ? habitSec.textContent : '';
  ok('A1 习惯页文本不含 .cd-hero{ 残留', habitTxt.indexOf('.cd-hero{') < 0);
  ok('A2 习惯页文本不含 .cd-num{ 残留', habitTxt.indexOf('.cd-num{') < 0);
  ok('A3 习惯页文本不含 .cd- 前缀残留', habitTxt.indexOf('.cd-') < 0);
  const habitVisible = habitSec.innerHTML.replace(/<style[\s\S]*?<\/style>/g, '');
  ok('A4 习惯页可见 HTML 不含 @media 残留', habitVisible.indexOf('@media') < 0);
  ok('A4b 习惯页可见 HTML 不含任何 CSS 规则', habitVisible.indexOf('.cd-') < 0 && habitVisible.indexOf('{display:grid') < 0);
  ok('A5 习惯页仍保留正常中文标题', habitTxt.indexOf('今天打卡') >= 0);

  const styleEls = doc.querySelectorAll('style');
  ok('A6 只有两个 style 标签', styleEls.length === 2);
  const mainCss = styleEls[0] ? styleEls[0].textContent : '';
  ok('A7 主 style 已含 .cd-hero 规则', mainCss.indexOf('.cd-hero{display:grid') >= 0);
  ok('A8 主 style 已含 .cd-num 规则', mainCss.indexOf('.cd-num{display:flex') >= 0);
  ok('A9 主 style 已含 .cd-hero-sm 规则', mainCss.indexOf('.cd-hero-sm{') >= 0);
  ok('A10 主 style 已含移动端断点', mainCss.indexOf('@media(max-width:640px){') >= 0);
  ok('A11 主 style 未被截断（含 sidebar 规则）', mainCss.indexOf('.sidebar{') >= 0);

  // ================= B. 倒数日 hero 重做 =================
  T.renderCountdown();
  const heroEl = doc.getElementById('cdHero');
  const heroHtml = heroEl ? heroEl.innerHTML : '';
  ok('B1 hero 容器为 cd-hero', heroHtml.indexOf('<div class="cd-hero">') >= 0);
  ok('B2 hero 主卡存在', heroHtml.indexOf('cd-hero-main') >= 0);
  ok('B3 hero 有名称行', heroHtml.indexOf('cd-hero-name') >= 0);
  ok('B4 hero 有大数字', /<div class="cd-hero-count"><b>\d+<\/b><span>天<\/span><\/div>/.test(heroHtml));
  ok('B5 hero 有日期元信息', heroHtml.indexOf('cd-hero-meta') >= 0);
  ok('B6 hero 有侧栏（接下来两个）', heroHtml.indexOf('cd-hero-side') >= 0);
  ok('B7 侧栏小卡数量为 2', (heroHtml.match(/cd-hero-sm/g) || []).length === 2);
  ok('B8 小卡含天数', /cd-hs-days">还有 <b>\d+<\/b> 天/.test(heroHtml) || heroHtml.indexOf('就是今天') >= 0);
  ok('B9 hero 不再用旧结构', heroHtml.indexOf('cd-hero-item') < 0 && heroHtml.indexOf('cd-hero-days') < 0);

  // ================= C. 倒数日列表行重做 =================
  const listEl = doc.getElementById('countdownList');
  const listHtml = listEl ? listEl.innerHTML : '';
  ok('C1 列表非空', listHtml.length > 50);
  ok('C2 行用 cd-num 数字块', listHtml.indexOf('<span class="cd-num">') >= 0);
  ok('C3 行用 cd-body 主体', listHtml.indexOf('<span class="cd-body">') >= 0);
  ok('C4 行含类型标签', listHtml.indexOf('cd-tag') >= 0);
  ok('C5 不再用旧 class cd-days', listHtml.indexOf('cd-days') < 0);
  ok('C6 不再用旧 class cd-main', listHtml.indexOf('cd-main') < 0);
  ok('C7 天数与「天」字成对出现', /<b>\d+<\/b><span>天<\/span>/.test(listHtml));

  // ================= D. 今天 / 临近 =================
  const pad2 = n => String(n).padStart(2, '0');
  const d = new Date();
  const iso = v => v.getFullYear() + '-' + pad2(v.getMonth() + 1) + '-' + pad2(v.getDate());
  const todayStr = iso(d);
  const d3 = new Date(); d3.setDate(d3.getDate() + 3);

  T.addCountdown({ name: '就在今天', type: 'solar', repeat: true, note: '', date: todayStr, leap: false });
  T.addCountdown({ name: '三天后', type: 'solar', repeat: true, note: '', date: iso(d3), leap: false });
  T.renderCountdown();
  const h2 = doc.getElementById('cdHero').innerHTML;
  const l2 = doc.getElementById('countdownList').innerHTML;
  ok('D1 今天的事项在 hero 显示「就是今天」', h2.indexOf('就是今天') >= 0);
  ok('D2 列表里今天显示「今天」而非 0 天', l2.indexOf('<b class="txt">今天</b>') >= 0);
  ok('D3 三天后的项标为临近 near', l2.indexOf('cd-row near') >= 0);
  ok('D4 三天后的项数字为 3', /<b>3<\/b><span>天<\/span>/.test(l2));

  const cdList = T._cdList();
  const mine = cdList.filter(x => x.name === '就在今天' || x.name === '三天后');
  ok('D5 自定义项已存入', mine.length === 2);
  mine.forEach(x => T.deleteCountdown(x.id));
  T.renderCountdown();
  const l3 = doc.getElementById('countdownList').innerHTML;
  ok('D6 删除后不再出现', l3.indexOf('就在今天') < 0 && l3.indexOf('三天后') < 0);

  // ================= E. 农历倒数仍正确 =================
  const lunarNext = T._cdNextOccur({ name: '春节', type: 'lunar', repeat: true, date: '0001-01-01', leap: false }, todayStr);
  ok('E1 农历春节能算出下一次日期', !!lunarNext && /^\d{4}-\d{2}-\d{2}$/.test(lunarNext));
  ok('E2 春节在下一年 1-2 月', Number(lunarNext.slice(5, 7)) <= 2);
  ok('E3 内置农历节日数量 > 5', (T.CD_LUNAR_FESTIVALS || []).length > 5);
  ok('E4 内置公历节日数量 > 5', (T.CD_SOLAR_FESTIVALS || []).length > 5);

  const builtin = T._cdBuiltin(todayStr);
  ok('E5 内置倒数日全部有未来日期', builtin.every(b => T._cdDaysTo(b.next) >= 0));
  const minDays = Math.min.apply(null, builtin.map(b => T._cdDaysTo(b.next)));
  T.renderCountdown();
  const h3 = doc.getElementById('cdHero').innerHTML;
  ok('E6 hero 显示的是最近的那个（天数最小）',
    h3.indexOf('<b>' + minDays + '</b>') >= 0 || (minDays === 0 && h3.indexOf('就是今天') >= 0));
  const l4 = doc.getElementById('countdownList').innerHTML;
  const daySeq = (l4.match(/<b>(\d+)<\/b><span>天<\/span>/g) || []).map(x => Number(x.replace(/\D+/g, '')));
  ok('E7 列表按天数升序排列', (function () {
    for (let i = 1; i < daySeq.length; i++) if (daySeq[i] < daySeq[i - 1]) return false;
    return daySeq.length > 3;
  })());

  console.log('\nRESULT: pass=' + P.pass + ' fail=' + P.fail);
  process.exit(P.fail > 0 ? 1 : 0);
})().catch(e => { console.log('FATAL', e && e.message, e && e.stack); process.exit(1); });
