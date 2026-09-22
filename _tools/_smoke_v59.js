/* v59 冒烟测试：物品存储名称→简笔画图标 + 书影音封面链接
 *  1) 脚本加载 / init 不抛错
 *  2) 14 个 i-st-* 图标 symbol 存在
 *  3) storageIcon 名称关键词命中（含顺序敏感的「洗衣粉 vs 洗衣液」）
 *  4) 名称未命中时按分类兜底，再兜底到箱形
 *  5) 物品列表渲染出对应图标
 *  6) _isHttpUrl / _pickMediaCover（本地上传优先 > 链接）
 *  7) mergeMedia 回读云端「封面链接」
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

(async function () {
  let initErr = '';
  try { doc.dispatchEvent(new w.Event('DOMContentLoaded')); } catch (e) { initErr = e.message; }
  ok('1 init(DOMContentLoaded) 不抛错', !initErr);
  if (initErr) P.logs.push('   initErr: ' + initErr);

  const T = w.__appTest;

  // 2. 图标 symbol 齐备
  const want = ['i-st-box', 'i-st-grain', 'i-st-bottle', 'i-st-carton', 'i-st-tube', 'i-st-tissue', 'i-st-spray', 'i-st-clean', 'i-st-bag', 'i-st-snack', 'i-st-veg', 'i-st-egg', 'i-st-can', 'i-st-med'];
  ok('2a 14 个 i-st-* symbol 全部存在', want.every(id => html.indexOf('<symbol id="' + id + '"') >= 0));

  // 3. 名称关键词命中
  const cases = [
    ['洗衣液', '', 'i-st-bottle'], ['洗衣粉', '', 'i-st-bag'], ['大米', '', 'i-st-grain'],
    ['牙膏', '', 'i-st-tube'], ['牛奶', '', 'i-st-carton'], ['抽纸', '', 'i-st-tissue'],
    ['厨房重油喷雾', '', 'i-st-spray'], ['拖把', '', 'i-st-clean'], ['鸡蛋', '', 'i-st-egg'],
    ['青菜', '', 'i-st-veg'], ['可乐', '', 'i-st-can'], ['感冒药', '', 'i-st-med'],
    ['薯片', '', 'i-st-snack']
  ];
  cases.forEach(([n, c, exp]) => ok('3 「' + n + '」→' + exp, T.storageIcon(n, c) === exp));

  // 4. 兜底
  ok('4a 未知物品+食品 →i-st-veg', T.storageIcon('xyz 未知物', '食品') === 'i-st-veg');
  ok('4b 未知物品+日用 →i-st-bag', T.storageIcon('xyz 未知物', '日用') === 'i-st-bag');
  ok('4c 未知物品+个护 →i-st-tube', T.storageIcon('xyz 未知物', '个护') === 'i-st-tube');
  ok('4d 未知物品+清洁 →i-st-spray', T.storageIcon('xyz 未知物', '清洁') === 'i-st-spray');
  ok('4e 未知物品+其他 →i-st-box', T.storageIcon('xyz 未知物', '其他') === 'i-st-box');
  ok('4f 空名称+空分类 →i-st-box', T.storageIcon('', '') === 'i-st-box');

  // 5. 列表渲染出图标
  T.state.records.push({ id: 'stIcon', type: 'storage', sample: false, remoteId: 'rst', date: '2026-09-01', createdAt: Date.now(), data: { name: '洗衣液', category: '清洁', quantity: 2, unit: '瓶', location: '卫生间', note: '', expiry: '' } });
  try { T.renderStorage(); } catch (e) { P.logs.push('   renderStorage err: ' + e.message); }
  const listHTML = doc.getElementById('storageList').innerHTML || '';
  ok('5a 列表出现物品名', listHTML.indexOf('洗衣液') >= 0);
  ok('5b 列表渲染 i-st-bottle 图标', listHTML.indexOf('i-st-bottle') >= 0);

  // 6. 封面链接取值
  ok('6a _isHttpUrl 认 https', T._isHttpUrl('https://img.x/a.jpg') === true);
  ok('6b _isHttpUrl 认 http', T._isHttpUrl('http://img.x/a.jpg') === true);
  ok('6c _isHttpUrl 拒 dataURL', T._isHttpUrl('data:image/jpeg;base64,AAA') === false);
  ok('6d _isHttpUrl 拒 javascript:', T._isHttpUrl('javascript:alert(1)') === false);
  const urlEl = doc.getElementById('mediaCoverUrl');
  ok('6e 表单存在封面链接输入框', !!urlEl);
  if (urlEl) {
    urlEl.value = '  https://example.com/cover.jpg  ';
    ok('6f 无本地上传时返回链接(并去空格)', T._pickMediaCover() === 'https://example.com/cover.jpg');
    urlEl.value = 'not-a-url';
    ok('6g 非法链接被忽略', T._pickMediaCover() === '');
    urlEl.value = '';
  }

  // 7. mergeMedia 回读云端封面链接
  ok('7a mergeMedia 导出可用', typeof T.mergeMedia === 'function');
  try {
    T.mergeMedia([{ _id: 'mid1', 标题: '三体', 类型: '书籍', 状态: '看过', 评分: 5, 短评: 'ok', 日期: '2026-09-01', 封面链接: 'https://example.com/tt.jpg' }]);
    const it = T.state.mediaItems.find(m => m.remoteId === 'mid1');
    ok('7b 云端封面链接被回读', !!it && it.cover === 'https://example.com/tt.jpg');
    ok('7c 标题等字段正常重建', !!it && it.name === '三体' && it.type === '书');
  } catch (e) { ok('7b mergeMedia 不抛错', false); P.logs.push('   merge err: ' + e.message); }

  console.log(P.logs.join('\n'));
  console.log('\n结果: ' + P.pass + ' 通过 / ' + P.fail + ' 失败');
  process.exit(P.fail ? 1 : 0);
})();
