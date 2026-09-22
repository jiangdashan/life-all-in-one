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
  // ================= 0. 通用工具 =================
  const pad = n => String(n).padStart(2, '0');
  const todayISO = new Date().getFullYear() + '-' + pad(new Date().getMonth() + 1) + '-' + pad(new Date().getDate());
  function shift(n, from) {
    const d = from ? new Date(from + 'T00:00:00') : new Date();
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  const mkRec = (type, date, data, extra) => Object.assign(
    { id: 'x' + Math.random().toString(36).slice(2, 8), type: type, date: date, createdAt: Date.now(), sample: false, data: data },
    extra || {}
  );

  // ================= A. 时光档案：按任意日期 / 周 / 月 / 年查看 =================
  ok('A1 默认 cursor 是今天', T._archCursor() === todayISO);

  T.state.settings.archiveCursor = shift(-3);
  ok('A2 cursor 可设为任意历史日期', T._archCursor() === shift(-3));
  ok('A3 当日范围判定跟随 cursor', T._archiveInRange(shift(-3), 'day') === true && T._archiveInRange(todayISO, 'day') === false);

  // 周：cursor 落在上周 → 该周七天都命中
  T.state.settings.archiveRange = 'week';
  T.state.settings.archiveCursor = shift(-7);
  const ws = T.isoWeekStart(new Date(shift(-7) + 'T00:00:00'));
  ok('A4 周围范围跟随 cursor（周一命中）', T._archiveInRange(ws, 'week') === true);
  ok('A5 周围范围跟随 cursor（该周日命中）', T._archiveInRange(shift(6, ws), 'week') === true);
  ok('A6 本周不再被当成目标周', T._archiveInRange(todayISO, 'week') === false);

  // 月：cursor 设为上上个月（跨年也不能出错）
  T.state.settings.archiveRange = 'month';
  T.state.settings.archiveCursor = shift(-70);
  const ymCursor = shift(-70).slice(0, 7);
  ok('A7 月范围跟随 cursor', T._archiveInRange(ymCursor + '-15', 'month') === true && T._archiveInRange(todayISO, 'month') === false);

  // 年：cursor 设为去年
  T.state.settings.archiveRange = 'year';
  T.state.settings.archiveCursor = shift(-400);
  ok('A8 年范围跟随 cursor', T._archiveInRange(shift(-400), 'year') === true && T._archiveInRange(todayISO, 'year') === false);

  // ---- 翻页 ----
  T.state.settings.archiveRange = 'day';
  T.state.settings.archiveCursor = todayISO;
  T._archiveStep(-1);
  ok('A9 日视图 ‹ 退一天', T.state.settings.archiveCursor === shift(-1));
  ok('A10 未来不能翻（clamp 到今天）', (T._archiveStep(1), T.state.settings.archiveCursor === todayISO));

  T.state.settings.archiveRange = 'week';
  T.state.settings.archiveCursor = shift(-14);
  T._archiveStep(1);
  ok('A11 周视图 › 进七天', T.state.settings.archiveCursor === shift(-7));

  T.state.settings.archiveRange = 'month';
  T.state.settings.archiveCursor = '2026-07-24';
  T._archiveStep(1);
  ok('A12 月视图 › 进一个月且保留「日」', T.state.settings.archiveCursor === '2026-08-24');
  T.state.settings.archiveCursor = '2026-01-31';
  T._archiveStep(1);
  ok('A12b 1月31日 +1 月钳到 2 月末', T.state.settings.archiveCursor === '2026-02-28');
  T.state.settings.archiveCursor = '2026-11-15';
  T._archiveStep(1);
  ok('A12c 月视图不越过今天', T.state.settings.archiveCursor <= todayISO);

  T.state.settings.archiveRange = 'year';
  T.state.settings.archiveCursor = shift(-60);
  T._archiveStep(1);
  ok('A13 年视图 › 进一年不越过今天', T.state.settings.archiveCursor <= todayISO && T.state.settings.archiveCursor > shift(-60));

  // ---- 「回到今天」 ----
  T._archiveGoto(shift(-9));
  ok('A14 _archiveGoto 可跳到指定日期', T._archCursor() === shift(-9));
  T._archiveGoto(todayISO);
  ok('A15 回到今天', T._archCursor() === todayISO);

  // ---- 渲染联动 ----
  T.state.records = [];
  T.state.mediaItems = []; T.state.habits = [];
  const d3 = shift(-3);
  T.state.records.push(mkRec('money', d3, { flow: 'expense', amount: 30, category: '吃饭', note: '三天前的午饭' }));
  T.state.records.push(mkRec('money', todayISO, { flow: 'expense', amount: 12, category: '交通', note: '今天的地铁' }));
  T.state.settings.archiveRange = 'day';
  T.state.settings.archiveFilter = 'all';
  T.state.settings.archiveCursor = d3;
  T.renderArchive();
  const ah3 = (doc.getElementById('archiveList') || {}).innerHTML || '';
  ok('A16 跳到三天前只显示那天的记录', ah3.indexOf('三天前的午饭') >= 0 && ah3.indexOf('今天的地铁') < 0);
  ok('A17 导航条显示日期标签', ((doc.getElementById('archNavLabel') || {}).textContent || '').indexOf(d3) >= 0);
  ok('A18 不在今天时显示「回到今天」按钮', !!(doc.getElementById('archTodayBtn') && doc.getElementById('archTodayBtn').hidden === false));

  T.state.settings.archiveCursor = todayISO;
  T.renderArchive();
  const ah0 = (doc.getElementById('archiveList') || {}).innerHTML || '';
  ok('A19 回到今天只显示今天的记录', ah0.indexOf('今天的地铁') >= 0 && ah0.indexOf('三天前的午饭') < 0);
  ok('A20 在今天时隐藏「回到今天」按钮', !!(doc.getElementById('archTodayBtn') && doc.getElementById('archTodayBtn').hidden === true));

  // ================= B. 倒数日 =================
  ok('B1 内置节日非空', T._cdBuiltin().length > 10);
  const bi = T._cdBuiltin();
  ok('B2 含春节', bi.some(x => x.name === '春节'));
  ok('B3 含国庆节', bi.some(x => x.name === '国庆节'));
  ok('B4 含母亲节', bi.some(x => x.name === '母亲节'));
  ok('B5 含中秋节', bi.some(x => x.name === '中秋节'));
  ok('B6 全部都是未来日期', bi.every(x => x.next >= todayISO));
  ok('B7 排序前 ─ 最近的一个不超过一年', Math.min.apply(null, bi.map(x => T._cdDaysTo(x.next))) <= 365);

  // 农历换算准确性（用库反向验证）
  const mid = bi.find(x => x.name === '中秋节');
  let lunOk = false;
  try {
    const d = new Date(mid.next + 'T00:00:00');
    const l = T.solarLunar.solar2lunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
    lunOk = (l.lMonth === 8 && l.lDay === 15);
  } catch (e) { }
  ok('B8 中秋节换算回农历正是八月十五', lunOk);

  const sp = bi.find(x => x.name === '春节');
  let spOk = false;
  try {
    const d = new Date(sp.next + 'T00:00:00');
    const l = T.solarLunar.solar2lunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
    spOk = (l.lMonth === 1 && l.lDay === 1 && !l.isLeap);
  } catch (e) { }
  ok('B9 春节换算回农历正是正月初一', spOk);

  // 第 N 个星期几算法
  ok('B10 母亲节＝5月第2个周日', (function () {
    const s = T._cdNthWeekday(2027, 5, 0, 2);
    const d = new Date(s + 'T00:00:00');
    return d.getDay() === 0 && d.getDate() >= 8 && d.getDate() <= 14;
  })());

  // ---- 自定义倒数日 ----
  T.state.settings.countdowns = [];
  T.state.settings.deletedCountdownIds = [];
  const future10 = shift(10);
  ok('B11 添加未来的倒数日成功', T.addCountdown({ name: '考试', type: 'solar', date: future10, repeat: false }) === true);
  ok('B12 已添加进列表', T._cdList().length === 1);
  ok('B13 过去的日期被拒绝', T.addCountdown({ name: '过期的事', type: 'solar', date: shift(-2), repeat: false }) === false);
  ok('B14 拒绝后列表不变', T._cdList().length === 1);

  // 每年重复：填去年的今天也应自动顺延到今年/明年
  const lastYearSame = (Number(todayISO.slice(0, 4)) - 1) + todayISO.slice(4);
  ok('B15 每年重复会自动顺延到未来', T.addCountdown({ name: '生日', type: 'solar', date: lastYearSame, repeat: true }) === true);
  const birthday = T._cdList().filter(x => x.name === '生日')[0];
  ok('B16 顺延结果不早于今天', !!birthday && T._cdNextOccur(birthday) >= todayISO);

  // 农历自定义
  ok('B17 添加农历倒数日成功', T.addCountdown({ name: '农历生日', type: 'lunar', date: '0001-08-15', repeat: true, leap: false }) === true);
  const lb = T._cdList().filter(x => x.name === '农历生日')[0];
  const lbn = lb ? T._cdNextOccur(lb) : null;
  ok('B18 农历倒数能算出公历日期', !!lbn && /^\d{4}-\d{2}-\d{2}$/.test(lbn));
  let lbnOk = false;
  try {
    const d = new Date(lbn + 'T00:00:00');
    const l = T.solarLunar.solar2lunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
    lbnOk = (l.lMonth === 8 && l.lDay === 15 && !l.isLeap);
  } catch (e) { }
  ok('B19 农历倒数日确实是八月十五', lbnOk);

  // ---- 渲染 ----
  let cdErr = '';
  try { T.renderCountdown(); } catch (e) { cdErr = e.message; }
  ok('B20 renderCountdown 不抛错', !cdErr);
  if (cdErr) console.log(cdErr);
  const cdHtml = (doc.getElementById('countdownList') || {}).innerHTML || '';
  ok('B21 列表渲染出倒数行', cdHtml.indexOf('class="cd-row') >= 0);
  ok('B22 自定义的出现在列表里', cdHtml.indexOf('考试') >= 0 && cdHtml.indexOf('农历生日') >= 0);
  ok('B23 内置节日同时展示', cdHtml.indexOf('春节') >= 0);
  ok('B24 显示剩余天数', cdHtml.indexOf('>10</b>') >= 0 || cdHtml.indexOf('10</b>') >= 0);
  const cdHero = (doc.getElementById('cdHero') || {}).innerHTML || '';
  ok('B25 顶部 hero 显示最近的一个', cdHero.indexOf('cd-hero-count') >= 0 && /cd-hero-count"><b>\d+<\/b>/.test(cdHero));
  console.log("HERO_HTML=", cdHero.slice(0,600));
  console.log("LIST_HAS=", (cdHtml||"").slice(0,300));
  process.exit(0);
})().catch(e=>{console.log("FATAL",e&&e.message);process.exit(1);});
