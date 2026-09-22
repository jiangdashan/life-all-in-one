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
  // ---------- 1. 样式与结构 ----------
  ok('1a 详情面板 CSS 存在', html.indexOf('.arch-sheet-wrap{position:fixed') > 0);
  ok('1b 移动端底部抽屉样式', html.indexOf('@media(max-width:560px){.arch-sheet{left:0;right:0;top:auto;bottom:0') > 0);
  ok('1c 可点元素有手型指针', html.indexOf('.aw-day,.aw-col,.am-cell,.aw-more,.am-more{cursor:pointer}') > 0);
  ok('1d 新函数已导出', ['_archiveOpenDay', '_archiveCloseDay', '_archiveDayItemsHtml', '_archiveDayTitle', '_archByDate'].every(k => typeof T[k] === 'function'));

  // ---------- 2. 构造同一天 6 条记录 ----------
  const pad = n => String(n).padStart(2, '0');
  const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const d0 = new Date();
  const todayIso = isoOf(d0);
  const mkAt = (h, mi) => new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), h, mi, 0, 0).getTime();
  T.state.records = [];
  for (let i = 0; i < 6; i++) {
    T.state.records.push({
      id: 'x' + i, type: 'planner', date: todayIso, createdAt: mkAt(10, i * 8),
      data: { title: '事项' + (i + 1), done: false }
    });
  }
  T.state.mediaItems = [];      /* 清掉初始化播种的示例书影音/习惯，避免干扰计数 */
  T.state.habits = [];
  T.state.settings.archiveFilter = 'all';

  // ---------- 3. 周历：同小时 >3 折叠为 +N，列带日期 ----------
  T.state.settings.archiveRange = 'week';
  T.renderArchive();
  const wh = doc.getElementById('archiveList').innerHTML;
  ok('3a 周历提示文案存在', wh.indexOf('点任意一天或 +N，查看当天全部记录') >= 0);
  ok('3b 周历列带 data-arch-date', wh.indexOf('data-arch-date="' + todayIso + '"') >= 0);
  ok('3c 同小时超过 3 条出现 +4', wh.indexOf('>+4<') >= 0);
  ok('3d 折叠块用了 aw-ev-more', (wh.split('class="aw-ev aw-ev-more"').length - 1) === 1);
  ok('3e 只画 2 条 + 1 个折叠块', (wh.split('class="aw-ev"').length - 1) === 2);

  // ---------- 4. 月历：格子可点 + +N ----------
  T.state.settings.archiveRange = 'month';
  T.renderArchive();
  const mh = doc.getElementById('archiveList').innerHTML;
  ok('4a 月历格子带 data-arch-date', mh.indexOf('data-arch-date="' + todayIso + '"') >= 0);
  ok('4b 月历超出显示 +3', mh.indexOf('>+3<') >= 0);
  ok('4c 月历提示文案存在', mh.indexOf('点日期或 +N，查看当天全部') >= 0);
  ok('4d 缓存已写入', (T._archByDate()[todayIso] || []).length === 6);

  // ---------- 5. 点击展开当天全部 ----------
  ok('5a 标题格式', T._archiveDayTitle(todayIso, 6).indexOf('月') > 0 && T._archiveDayTitle(todayIso, 6).indexOf('共 6 条') > 0);
  T._archiveOpenDay(todayIso);
  const wrap = doc.getElementById('archSheet');
  ok('5b 面板已创建并打开', !!wrap && wrap.classList.contains('open'));
  const bodyHtml = doc.getElementById('archSheetBody').innerHTML;
  ok('5c 面板列出全部 6 条（不再只显示 3 条）', (bodyHtml.split('class="tl-item"').length - 1) === 6);
  ok('5d 6 条标题都在', [1, 2, 3, 4, 5, 6].every(i => bodyHtml.indexOf('事项' + i) >= 0));
  ok('5e 带时刻标签', bodyHtml.indexOf('上午10点') >= 0);
  T._archiveCloseDay();
  ok('5f 关闭后面板隐藏', !doc.getElementById('archSheet').classList.contains('open'));

  // ---------- 6. 点击委派（点格子里的 +N / 任意位置都能开） ----------
  T.state.settings.archiveRange = 'month';
  T.renderArchive();
  const listEl = doc.getElementById('archiveList');
  const cell = listEl.querySelector('[data-arch-date="' + todayIso + '"]');
  ok('6a 找到可点格子', !!cell);
  if (cell) {
    try {
      cell.dispatchEvent(new w.Event('click', { bubbles: true }));
    } catch (e) { ok('6a-dispatch', false); console.log(e.message); }
    ok('6b 点击格子即打开面板', doc.getElementById('archSheet').classList.contains('open'));
    ok('6c 面板内容是当天 6 条', (doc.getElementById('archSheetBody').innerHTML.split('class="tl-item"').length - 1) === 6);
    T._archiveCloseDay();
  }

  // ---------- 7. 空日期不崩溃 ----------
  ok('7a 无记录日显示空态', T._archiveDayItemsHtml('1999-01-01').indexOf('这天没有记录') >= 0);
  T._archiveOpenDay('1999-01-01');
  ok('7b 空日也能打开且不抛错', doc.getElementById('archSheet').classList.contains('open'));
  T._archiveCloseDay();

  // ---------- 8. 当日时间线不受影响 ----------
  T.state.settings.archiveRange = 'day';
  T.renderArchive();
  const dh = doc.getElementById('archiveList').innerHTML;
  ok('8a 当日仍是时间线', dh.indexOf('class="tl-clock"') >= 0);
  ok('8b 当日仍列出全部 6 条', (dh.split('class="tl-item"').length - 1) === 6);

  console.log('\nRESULT: pass=' + P.pass + ' fail=' + P.fail);
  process.exit(P.fail > 0 ? 1 : 0);
})().catch(e => { console.log('FATAL', e && e.message); process.exit(1); });
