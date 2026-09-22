/* v62 冒烟测试：书影音离线自动封面（HTML 渲染版，零网络依赖）
 *  1) 脚本加载 / init 不抛错
 *  2) _coverInitial 中英文首字提取
 *  3) _coverPalette 同名同色（跨设备一致）/ 色板合法
 *  4) 封面 CSS 规则齐备（HTML 渲染路径，不得再出现 SVG <text>）
 *  5) _autoCoverHtml 输出结构 / 首字 / 标题 / 类型
 *  6) 列表视图 is-mini 变体
 *  7) XSS：标题中的 <script> / 引号被转义
 *  8) 开关关闭时回退纯文字占位
 *  9) renderMedia 集成渲染
 * 10) 「自动封面」开关按钮存在
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
try { Object.defineProperty(Object.getPrototypeOf(doc.createElement('form')), 'elements', { get() { return this.querySelectorAll('[name]'); } }); } catch (e) { }
w.FormData = class { constructor(f) { this._f = f; this._m = new Map(); if (f) { const els = f.querySelectorAll('[name]'); for (const el of els) { const t = (el.type || '').toLowerCase(); if (t === 'radio') { if (el.checked) this._m.set(el.name, el.value); } else if (t === 'checkbox') { if (el.checked) this._m.set(el.name, 'on'); } else { this._m.set(el.name, el.value || ''); } } } } get(k) { return this._m.has(k) ? this._m.get(k) : null; } entries() { return [...this._m.entries()]; } };
const _fake = { records: {} };
w.__SMART_PAGE__ = { database: { query: async function ({ databaseId, pageSize, startCursor }) { const arr = _fake.records[databaseId] || []; const start = startCursor ? parseInt(startCursor, 10) || 0 : 0; return { results: arr.slice(start, start + pageSize), hasMore: false, nextCursor: null }; }, addRecord: async () => ({ _id: 'r' }), updateRecord: async () => ({}), deleteRecord: async () => ({}), getSchema: async () => ({ properties: [] }) } };
const navStub = { userAgent: 'node', platform: 'x', language: 'zh-CN' };
const sandbox = { sessionStorage: w.sessionStorage, window: w, document: doc, localStorage: storage, FormData: w.FormData, __SMART_PAGE__: w.__SMART_PAGE__, navigator: navStub, location: new w.URL('http://localhost/index.html'), history: { replaceState() { } }, console: { log: () => { }, warn: () => { }, error: () => { } }, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, crypto: require('crypto').webcrypto, parseInt, parseFloat, isNaN, String, Number, Boolean, Array, Object, RegExp, Error, Promise, Map, Set, Symbol, URL: w.URL, Intl, require };
sandbox.globalThis = sandbox; sandbox.self = sandbox; sandbox.scrollTo = () => { };
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
  ok('1a 自动封面函数已导出', typeof T._coverInitial === 'function' && typeof T._coverPalette === 'function' && typeof T._autoCoverHtml === 'function');
  ok('1b SVG 渲染路径已下线', typeof T._autoCoverSvg === 'undefined' && typeof T._coverLines === 'undefined');

  // 2. 首字提取
  ok('2a 中文取首字', T._coverInitial('三体') === '三');
  ok('2b 中文长名取首字', T._coverInitial('活着本身就是意义') === '活');
  ok('2c 英文双词取首字母缩写', T._coverInitial('The Great Gatsby') === 'TG');
  ok('2d 英文单词取前两字母', T._coverInitial('Inception') === 'IN');
  ok('2e 冒号分隔也能缩写', T._coverInitial('Harry Potter: Book One') === 'HP');
  ok('2f 空标题兜底中点', T._coverInitial('') === '\u00b7');

  // 3. 配色
  const p1 = T._coverPalette('三体|书'), p2 = T._coverPalette('三体|书');
  ok('3a 同名同学同色(跨设备一致)', JSON.stringify(p1) === JSON.stringify(p2));
  ok('3b 配色含 bg/bar/ink 且为合法十六进制', /^#[0-9a-f]{6}$/i.test(p1.bg) && /^#[0-9a-f]{6}$/i.test(p1.bar) && /^#[0-9a-f]{6}$/i.test(p1.ink));
  let distinct = {};
  ['三体', '活着', '沙丘', '星际穿越', '百年孤独', '小王子', '白鹿原', '房思琪'].forEach(function (n) { distinct[T._coverPalette(n + '|书').bg] = 1; });
  ok('3c 不同作品配色有区分度(>=3种)', Object.keys(distinct).length >= 3);

  // 4. CSS 规则齐备（HTML 渲染路径）
  ok('4a CSS 含 .media-auto-cover 布局', html.indexOf('.media-auto-cover{position:relative') > 0);
  ok('4b CSS 含书脊色条 .ac-bar', html.indexOf('.media-auto-cover .ac-bar{') > 0);
  ok('4c 标题字重为 400(不再有粗体)', /\.media-auto-cover \.ac-title\{[^}]*font-weight:400/.test(html));
  ok('4d 标题不再使用 SVG text 渲染', html.indexOf('cover-ini') < 0 && html.indexOf('0 0 90 120') < 0);
  ok('4e 标题最多 3 行截断', html.indexOf('-webkit-line-clamp:3') > 0);
  ok('4f 移动端抗锯齿已开启', html.indexOf('-webkit-font-smoothing:antialiased') > 0);
  ok('4g 列表视图变体 is-mini 已定义', html.indexOf('.media-auto-cover.is-mini{') > 0);
  ok('4h 列表视图隐藏标题与类型', html.indexOf('.media-auto-cover.is-mini .ac-title,.media-auto-cover.is-mini .ac-type{display:none}') > 0);
  ok('4i 字体栈覆盖鸿蒙中文字体', html.indexOf('HarmonyOS Sans SC') > 0);

  // 5. _autoCoverHtml 结构
  const h1 = T._autoCoverHtml({ id: 'x1', sample: false, name: '三体', type: '书' }, 'wall');
  ok('5a 输出 media-auto-cover 容器', h1.indexOf('<div class="media-auto-cover" style="--ac-bg:#') === 0);
  ok('5b 三个 CSS 变量齐备', h1.indexOf('--ac-bg:#') > 0 && h1.indexOf('--ac-bar:#') > 0 && h1.indexOf('--ac-ink:#') > 0);
  ok('5c 含书脊色条', h1.indexOf('<div class="ac-bar"></div>') > 0);
  ok('5d 含首字层且为首字', h1.indexOf('<div class="ac-ini">\u4e09</div>') > 0);
  ok('5e 含标题层且为全名', h1.indexOf('<div class="ac-title">\u4e09\u4f53</div>') > 0);
  ok('5f 含类型层', h1.indexOf('<div class="ac-type">\u4e66</div>') > 0);
  ok('5g 不再输出任何 svg 标签', h1.indexOf('<svg') < 0);
  ok('5h 不再输出 font-weight 700 / text-rendering', h1.indexOf('font-weight="700"') < 0 && h1.indexOf('text-rendering') < 0);
  const hNoType = T._autoCoverHtml({ id: 'x2', sample: false, name: '无名', type: '' }, 'wall');
  ok('5i 无类型时不渲染类型层', hNoType.indexOf('ac-type') < 0);

  // 6. 列表视图
  const hMini = T._autoCoverHtml({ id: 'x3', sample: false, name: '三体', type: '书' }, 'list');
  ok('6a 列表视图带 is-mini 类', hMini.indexOf('class="media-auto-cover is-mini"') > 0);
  const hWall = T._autoCoverHtml({ id: 'x3', sample: false, name: '三体', type: '书' }, 'wall');
  ok('6b 封面墙不带 is-mini', hWall.indexOf('is-mini') < 0);

  // 7. XSS 防护
  const evil = '三体"><script>alert(1)</script>';
  const hEvil = T._autoCoverHtml({ id: 'e1', sample: false, name: evil, type: '书' }, 'wall');
  ok('7a 标题中的 <script> 被转义', hEvil.indexOf('<script') < 0);
  ok('7b 标题中的 > 被转义', hEvil.indexOf('&gt;') > 0);
  ok('7c 引号被转义不会破坏容器', hEvil.indexOf('&quot;') > 0);
  const hQuote = T._autoCoverHtml({ id: 'e2', sample: false, name: 'It\'s a "trap"', type: '电影' }, 'wall');
  ok('7d 引号作品名不破坏 class 属性', hQuote.indexOf('class="media-auto-cover"') > 0 && hQuote.indexOf('&quot;') > 0);

  // 8. 开关回退
  T.state.settings.mediaAutoCover = false;
  const hOff = T._autoCoverHtml({ id: 'x1', sample: false, name: '三体', type: '书' }, 'wall');
  ok('8a 关闭时回到纯文字占位', hOff.indexOf('class="media-placeholder"') >= 0 && hOff.indexOf('media-auto-cover') < 0);
  T.state.settings.mediaAutoCover = true;

  // 9. renderMedia 集成
  T.state.mediaItems.push({ id: 'mv1', sample: false, name: '沙丘', type: '电影', status: '看完', rating: 5, date: '2026-09-01', review: '', cover: '', createdAt: Date.now(), updatedAt: Date.now() });
  T.state.mediaItems.push({ id: 'mv2', sample: false, name: '星际穿越', type: '电影', status: '看完', rating: 5, date: '2026-09-02', review: '', cover: 'https://example.com/a.jpg', createdAt: Date.now(), updatedAt: Date.now() });
  let rmErr = '';
  try { T.renderMedia(); } catch (e) { rmErr = e.message; }
  ok('9a renderMedia 不抛错', !rmErr);
  if (rmErr) P.logs.push('   renderMedia err: ' + rmErr);
  const col = doc.getElementById('mediaCollection');
  const colHTML = col ? (col.innerHTML || '') : '';
  ok('9b 无封面作品渲染出自动封面', colHTML.indexOf('class="media-auto-cover"') >= 0);
  ok('9c 有链接封面仍用 img', colHTML.indexOf('src="https://example.com/a.jpg"') >= 0);
  ok('9d 自动封面含该作品标题', colHTML.indexOf('ac-title">\u6c99\u4e18') >= 0);

  // 10. 开关按钮
  const btn = doc.getElementById('mediaAutoCoverBtn');
  ok('10a 自动封面按钮存在', !!btn);
  ok('10b 按钮带 data-action', !!btn && btn.getAttribute('data-action') === 'media-auto-cover');

  console.log(P.logs.join('\n'));
  console.log('\n结果: ' + P.pass + ' 通过 / ' + P.fail + ' 失败');
  process.exit(P.fail ? 1 : 0);
})();
