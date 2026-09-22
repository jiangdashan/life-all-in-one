/* v53 冒烟测试：鸿蒙（HarmonyOS / 华为浏览器）安装引导
 *  1) _appPlatformAuto 识别：鸿蒙4（UA 同时含 Android）、纯血鸿蒙（OpenHarmony）、鸿蒙+微信
 *  2) 非鸿蒙不受影响：iPhone / Android / 桌面
 *  3) _appPlatformSet 手动切换生效，切回 auto 恢复自动识别
 *  4) _appStepsData 鸿蒙步骤含「华为浏览器 / 添加到桌面」，且带纯血鸿蒙说明
 *  5) renderAppInstall 渲染鸿蒙步骤 + 设备下拉同步 + 提示文案
 *  6) 源码层：下拉 DOM / CSS / 测试导出钩子
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
w.Event = class { constructor(t, o) { this.type = t; this.bubbles = !!(o && o.bubbles); this.cancelable = !!(o && o.cancelable); } };
const _fake = { records: {} };
w.__SMART_PAGE__ = { database: { query: async function ({ databaseId, pageSize, startCursor }) { const arr = _fake.records[databaseId] || []; const start = startCursor ? parseInt(startCursor, 10) || 0 : 0; return { results: arr.slice(start, start + pageSize), hasMore: false, nextCursor: null }; }, addRecord: async () => ({ _id: 'r' }), updateRecord: async () => ({}), deleteRecord: async () => ({}), getSchema: async () => ({ properties: [] }) } };
const navStub = { userAgent: 'node', platform: 'x', language: 'zh-CN' };
const sandbox = { sessionStorage: w.sessionStorage, window: w, document: doc, localStorage: storage, FormData: w.FormData, __SMART_PAGE__: w.__SMART_PAGE__, navigator: navStub, location: new w.URL('http://localhost/index.html'), history: { replaceState() { } }, console: { log: () => { }, warn: () => { }, error: () => { } }, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, crypto: require('crypto').webcrypto, parseInt, parseFloat, isNaN, String, Number, Boolean, Array, Object, RegExp, Error, Promise, Map, Set, Symbol, URL: w.URL, Intl, require };
sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);

const P = { pass: 0, fail: 0, logs: [] };
const ok = (name, cond) => { if (cond) { P.pass++; P.logs.push('  PASS  ' + name); } else { P.fail++; P.logs.push('  FAIL  ' + name); } };

const UA = {
  harmony4: 'Mozilla/5.0 (Linux; Android 12; ELS-AN00; HMSCore 6.12.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 HuaweiBrowser/13.0.5.303 Mobile Safari/537.36 HarmonyOS',
  harmonyNext: 'Mozilla/5.0 (Linux; U; OpenHarmony 5.0; zh-CN; ALN-AL00) AppleWebKit/537.36 (KHTML, like Gecko) HuaweiBrowser/5.0.1.300 Mobile Safari/537.36',
  harmonyWx: 'Mozilla/5.0 (Linux; Android 12; ELS-AN00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99 Mobile Safari/537.36 HarmonyOS MicroMessenger/8.0.48',
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
};

let app = null;
try { vm.runInContext(src, sandbox, { filename: 'app.js' }); } catch (e) { console.log('脚本执行异常: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 6).join('\n')); }
app = sandbox.window.__appTest || sandbox.__appTest;

(async function () {
  ok('0 测试钩子可用', !!app && typeof app._appPlatformAuto === 'function');
  if (!app) { console.log(P.logs.join('\n')); process.exit(1); }

  /* 1. 自动识别 */
  const setUa = u => { navStub.userAgent = u; };
  setUa(UA.harmony4);
  ok('1a 鸿蒙4（UA 含 Android+HarmonyOS）→ harmony', app._appPlatformAuto() === 'harmony');
  setUa(UA.harmonyNext);
  ok('1b 纯血鸿蒙（OpenHarmony+HuaweiBrowser）→ harmony', app._appPlatformAuto() === 'harmony');
  setUa(UA.harmonyWx);
  ok('1c 鸿蒙+微信 → harmony-wx', app._appPlatformAuto() === 'harmony-wx');
  setUa(UA.ios);
  ok('1d iPhone → ios-safari', app._appPlatformAuto() === 'ios-safari');
  setUa(UA.android);
  ok('1e Android → android', app._appPlatformAuto() === 'android');
  setUa(UA.desktop);
  ok('1f 桌面 → desktop', app._appPlatformAuto() === 'desktop');

  /* 2. 手动切换 */
  app._appPlatformSet('harmony');
  setUa(UA.desktop);
  ok('2a 手动选鸿蒙后，桌面 UA 也返回 harmony', app._appPlatform() === 'harmony');
  ok('2b 手动选择已写入 localStorage', storage.getItem('richangji-app-platform-v1') === 'harmony');
  app._appPlatformSet('auto');
  ok('2c 切回自动后跟随 UA（桌面）', app._appPlatform() === 'desktop');
  setUa(UA.harmony4);
  ok('2d 切回自动后跟随 UA（鸿蒙）', app._appPlatform() === 'harmony');
  ok('2e _appPlatformLabel 取到中文名', app._appPlatformLabel('harmony') === '鸿蒙 / 华为浏览器');

  /* 3. 步骤内容 */
  app._appPlatformSet('harmony');
  let g = app._appStepsData();
  ok('3a 鸿蒙步骤第一组标题含「鸿蒙」', g[0] && g[0].t.indexOf('鸿蒙') >= 0);
  ok('3b 步骤里出现「华为浏览器」', g[0].s.join('').indexOf('华为浏览器') >= 0);
  ok('3c 步骤里出现「添加到桌面」', g[0].s.join('').indexOf('添加到桌面') >= 0);
  ok('3d 附带纯血鸿蒙说明组', g.length === 2 && g[1].t.indexOf('NEXT') >= 0);
  ok('3e 说明里提到地址栏/全屏', g[1].s.join('').indexOf('地址栏') >= 0);
  app._appPlatformSet('harmony-wx');
  g = app._appStepsData();
  ok('3f 鸿蒙微信步骤含「在浏览器打开」', g[0].s.join('').indexOf('在浏览器打开') >= 0 && g[0].s.join('').indexOf('添加到桌面') >= 0);
  app._appPlatformSet('ios-safari');
  ok('3g iOS 步骤未被鸿蒙改动', app._appStepsData()[0].t.indexOf('iPhone') >= 0);
  app._appPlatformSet('android');
  ok('3h Android 步骤未被鸿蒙改动', app._appStepsData()[0].t.indexOf('Android') >= 0);

  /* 4. 渲染 */
  app._appPlatformSet('harmony');
  try { app.renderAppInstall(); ok('4a renderAppInstall 不抛错', true); } catch (e) { ok('4a renderAppInstall 不抛错: ' + e.message, false); }
  const stepsBox = doc.getElementById('appInstallSteps');
  ok('4b 步骤已渲染进 DOM 且含华为浏览器', !!stepsBox && stepsBox.innerHTML.indexOf('华为浏览器') >= 0);
  const sel = doc.getElementById('appPlatformSel');
  let selVal = '';
  /* 注：linkedom 的 select.value 只有 getter，赋值不生效（真实浏览器无此问题），
     这里改为断言 DOM 结构 + 同步函数不抛错 + 不残留错误的 selected 标记 */
  ok('4c 设备下拉存在且含鸿蒙选项', !!sel && sel.options && sel.options.length === 8 && html.indexOf('value="harmony">鸿蒙 / 华为浏览器') >= 0);
  let syncErr = '';
  try { app._appSelectSync(sel, 'harmony'); } catch (e) { syncErr = e.message; }
  ok('4c2 下拉同步函数不抛错', !syncErr);
  let wrongSel = 0;
  try { for (const o of sel.options) { if (o.hasAttribute && o.hasAttribute('selected') && o.getAttribute('value') !== 'harmony') wrongSel++; } } catch (e) { }
  ok('4c3 未选中项未被误标 selected', wrongSel === 0);
  const hint = doc.getElementById('appPlatformHint');
  ok('4d 提示文案已写入（手动选择分支）', !!hint && hint.textContent.indexOf('已手动选择') >= 0);
  try { app.bindAppInstall(); ok('4e bindAppInstall 不抛错（含下拉绑定）', true); } catch (e) { ok('4e bindAppInstall 不抛错: ' + e.message, false); }
  app._appPlatformSet('auto');
  app.renderAppInstall();
  ok('4f 自动模式下提示显示识别结果', doc.getElementById('appPlatformHint').textContent.indexOf('自动识别为') >= 0);

  /* 5. 源码断言 */
  const checks = [
    ['5a 下拉 DOM 已写入', 'id="appPlatformSel"' ],
    ['5b 鸿蒙选项已写入', 'value="harmony">鸿蒙 / 华为浏览器' ],
    ['5c 鸿蒙微信选项已写入', 'value="harmony-wx">鸿蒙 / 微信' ],
    ['5d 提示位 DOM 已写入', 'id="appPlatformHint"' ],
    ['5e CSS 已写入', '.app-install-pick{' ],
    ['5f 鸿蒙识别排在 Android 之前', 'if(/OpenHarmony|HarmonyOS/i.test(ua) || /HuaweiBrowser/i.test(ua))' ],
    ['5g 测试导出已补新钩子', '_appPlatformSet:_appPlatformSet,_appPlatformAuto:_appPlatformAuto' ]
  ];
  checks.forEach(c => ok(c[0], html.indexOf(c[1]) >= 0));
  ok('5h 旧版本无残留（HarmonyOS 排在 Android 分支里的写法已移除）', html.indexOf('if(/Android|HarmonyOS/i.test(ua))') < 0);

  console.log(P.logs.join('\n'));
  console.log('\n结果: ' + P.pass + ' 通过 / ' + P.fail + ' 失败');
  process.exit(P.fail ? 1 : 0);
})();
