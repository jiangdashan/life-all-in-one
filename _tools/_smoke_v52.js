/* v52 冒烟测试：装到手机桌面（安装引导 + 桌面图标 meta）
 *  1) _appPlatform 分设备识别（iOS Safari / iOS 其他 / Android / 微信 / 桌面）
 *  2) _appStepsData 分设备步骤文案正确；已装（standalone）时显示「已经装好了」
 *  3) _appStandalone 检测 display-mode: standalone 与 navigator.standalone
 *  4) renderAppInstall 把步骤渲染进 DOM、填入链接、写备注
 *  5) maybeShowAppTip 仅窄屏且未关闭时显示；点过「不再提示」后不再显示
 *  6) 复制按钮点击不抛错并给出提示
 *  7) 源码层：桌面图标 meta / 面板 DOM / init 调用链 均已落地
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
/* matchMedia：可变开关，便于分别模拟「窄屏 / 桌面 / 已装到桌面」 */
let MM = { standalone: false, narrow: false };
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
w.__SMART_PAGE__ = { database: { query: async function ({ databaseId, pageSize, startCursor }) { const arr = _fake.records[databaseId] || []; const start = startCursor ? parseInt(startCursor, 10) || 0 : 0; const slice = arr.slice(start, start + pageSize); const next = start + pageSize < arr.length ? String(start + pageSize) : null; return { results: slice, hasMore: !!next, nextCursor: next }; }, addRecord: async () => ({ _id: 'r' }), updateRecord: async () => ({}), deleteRecord: async () => ({}), getSchema: async () => ({ properties: [] }) } };
const navStub = { userAgent: 'node', platform: 'x', language: 'zh-CN' };
const sandbox = { sessionStorage: w.sessionStorage, window: w, document: doc, localStorage: storage, FormData: w.FormData, __SMART_PAGE__: w.__SMART_PAGE__, navigator: navStub, location: new w.URL('http://localhost/index.html'), history: { replaceState() { } }, console: { log: () => { }, warn: () => { }, error: () => { } }, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, crypto: require('crypto').webcrypto, parseInt, parseFloat, isNaN, String, Number, Boolean, Array, Object, RegExp, Error, Promise, Map, Set, Symbol, URL: w.URL, Intl, require };
sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
try { vm.runInContext(src, sandbox, { filename: 'inline.js' }); } catch (e) { console.log('FATAL  inline script 执行失败: ' + e.message); console.log(e.stack); process.exit(1); }
const app = w.__appTest || sandbox.__appTest;

const P = { pass: 0, fail: 0, logs: [] };
function ok(name, cond, extra) { if (cond) { P.pass++; P.logs.push('  ✔ ' + name); } else { P.fail++; P.logs.push('  ✘ ' + name + (extra ? ' -> ' + extra : '')); } }

const UA = {
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  iosWx: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.40',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
  androidWx: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 MicroMessenger/8.0.40',
  pc: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
};

(async function () {
  // ============ 1. 平台识别 ============
  ok('1a 链接常量正确', app.APP_SHARE_URL === 'https://workbuddy.link/p/IAP7cP1ljx7juu0hAdPdVy', app.APP_SHARE_URL);

  navStub.userAgent = UA.iosSafari;
  ok('1b iPhone Safari 识别为 ios-safari', app._appPlatform() === 'ios-safari', app._appPlatform());
  navStub.userAgent = UA.iosWx;
  ok('1c iPhone 微信识别为 ios-other', app._appPlatform() === 'ios-other', app._appPlatform());
  navStub.userAgent = UA.android;
  ok('1d Android Chrome 识别为 android', app._appPlatform() === 'android', app._appPlatform());
  navStub.userAgent = UA.androidWx;
  ok('1e Android 微信识别为 android-wx', app._appPlatform() === 'android-wx', app._appPlatform());
  navStub.userAgent = UA.pc;
  ok('1f 电脑识别为 desktop', app._appPlatform() === 'desktop', app._appPlatform());

  // ============ 2. 步骤文案 ============
  navStub.userAgent = UA.iosSafari;
  let steps = app._appStepsData();
  ok('2a iPhone 步骤含「添加到主屏幕」', steps.length === 1 && steps[0].s.join('|').indexOf('添加到主屏幕') >= 0, JSON.stringify(steps));
  ok('2b iPhone 步骤为 3 步', steps[0].s.length === 3, steps[0].s.length);

  navStub.userAgent = UA.android;
  steps = app._appStepsData();
  ok('2c Android 步骤含「添加到主屏幕」或「安装应用」', /添加到主屏幕|安装应用/.test(steps[0].s.join('|')), JSON.stringify(steps));

  navStub.userAgent = UA.iosWx;
  steps = app._appStepsData();
  ok('2d iPhone 微信步骤先引导「在 Safari 中打开」', steps[0].s.join('|').indexOf('Safari 中打开') >= 0, JSON.stringify(steps));

  navStub.userAgent = UA.pc;
  steps = app._appStepsData();
  ok('2e 电脑端给出书签提示', steps[0].s.join('|').indexOf('书签') >= 0, JSON.stringify(steps));

  // ============ 3. standalone 检测 ============
  MM.standalone = false;
  ok('3a 普通浏览器不算已装', app._appStandalone() === false);
  MM.standalone = true;
  ok('3b display-mode: standalone 判定已装', app._appStandalone() === true);
  MM.standalone = false;
  try { Object.defineProperty(w.navigator, 'standalone', { value: true, configurable: true }); } catch (e) { }
  ok('3c navigator.standalone 判定已装', app._appStandalone() === (w.navigator.standalone === true));
  try { Object.defineProperty(w.navigator, 'standalone', { value: false, configurable: true }); } catch (e) { }

  // 已装时步骤变为「已经装好了」
  MM.standalone = true;
  navStub.userAgent = UA.iosSafari;
  steps = app._appStepsData();
  ok('3d 已装到桌面时不再提示安装步骤', steps[0].t.indexOf('已经装好') >= 0, JSON.stringify(steps));
  MM.standalone = false;

  // ============ 4. renderAppInstall ============
  const box = doc.getElementById('appInstallSteps');
  const inp = doc.getElementById('appInstallUrl');
  const note = doc.getElementById('appInstallNote');
  ok('4a 面板 DOM 存在', !!box && !!inp && !!note);
  ok('4b 链接输入框默认值正确', inp.value === app.APP_SHARE_URL, inp.value);

  navStub.userAgent = UA.iosSafari;
  app.renderAppInstall();
  ok('4c 渲染出步骤节点', box.querySelectorAll('.app-step').length === 3, box.querySelectorAll('.app-step').length);
  ok('4d 步骤带序号 1/2/3', /<b>1<\/b>/.test(box.innerHTML) && /<b>3<\/b>/.test(box.innerHTML), box.innerHTML.slice(0, 80));
  ok('4e 备注含 7 天免密说明', note.textContent.indexOf('7 天') >= 0, note.textContent);
  MM.standalone = true;
  app.renderAppInstall();
  ok('4f 已装时备注改为「已从桌面图标进入」', note.textContent.indexOf('已从桌面图标进入') >= 0, note.textContent);
  MM.standalone = false;
  app.renderAppInstall();

  // ============ 5. 首屏提示条 ============
  const tip = doc.getElementById('appTip');
  tip.hidden = true;
  storage.removeItem('richangji-app-tip-v1');
  MM.narrow = false;
  app.maybeShowAppTip();
  ok('5a 宽屏不弹提示条', tip.hidden === true);
  MM.narrow = true;
  app.maybeShowAppTip();
  ok('5b 窄屏弹出提示条', tip.hidden === false);
  tip.hidden = true;
  storage.setItem('richangji-app-tip-v1', 'dismissed');
  app.maybeShowAppTip();
  ok('5c 点过「不再提示」后不再弹出', tip.hidden === true);
  MM.standalone = true;
  storage.removeItem('richangji-app-tip-v1');
  app.maybeShowAppTip();
  ok('5d 已装到桌面时不再弹提示', tip.hidden === true);
  MM.standalone = false;
  MM.narrow = false;

  // ============ 6. 交互不抛错 ============
  app.bindAppInstall();
  const toastEl = doc.getElementById('toast') || { textContent: '' };
  let threw = null;
  try { doc.getElementById('appInstallCopyBtn').dispatchEvent(new w.Event('click', { bubbles: true })); } catch (e) { threw = e; }
  ok('6a 复制按钮点击不抛错', threw === null, threw && threw.message);
  await new Promise(r => setTimeout(r, 30));
  ok('6b 复制后给出提示文案', String(toastEl.textContent || '').length > 0, JSON.stringify(String(toastEl.textContent || '')));

  const closeBtn = doc.getElementById('appTipClose');
  let threw2 = null;
  try { closeBtn.dispatchEvent(new w.Event('click', { bubbles: true })); } catch (e) { threw2 = e; }
  ok('6c 关闭按钮点击不抛错且写入已读标记', threw2 === null && storage.getItem('richangji-app-tip-v1') === 'dismissed');

  let threw3 = null;
  try { doc.getElementById('appTipGo').dispatchEvent(new w.Event('click', { bubbles: true })); } catch (e) { threw3 = e; }
  ok('6d 怎么装按钮点击不抛错', threw3 === null, threw3 && threw3.message);

  // ============ 7. 源码层标记 ============
  ok('7a 桌面图标 meta 已写入 head', html.indexOf('name="apple-mobile-web-app-capable"') >= 0 && html.indexOf('name="apple-mobile-web-app-title"') >= 0);
  ok('7b apple-touch-icon 内联 PNG 已写入', /<link rel="apple-touch-icon"[^>]*href="data:image\/png;base64,iVBOR/.test(html));
  ok('7c 面板 DOM 已写入', html.indexOf('id="appInstallPanel"') >= 0 && html.indexOf('id="appInstallCopyBtn"') >= 0);
  ok('7d 首屏提示条 DOM 已写入', html.indexOf('id="appTip"') >= 0 && html.indexOf('id="appTipGo"') >= 0);
  ok('7e CSS 已写入（提示条 + standalone 隐藏）', html.indexOf('.app-tip{position:fixed') >= 0 && html.indexOf('display-mode:standalone){.app-tip{display:none') >= 0);
  ok('7f init 调用链已接入', html.indexOf('try{renderAppInstall();bindAppInstall();maybeShowAppTip();}catch(e){console.error(\'appInstall:\',e)}') >= 0);
  ok('7g 导出测试钩子齐全', typeof app.renderAppInstall === 'function' && typeof app._appStepsData === 'function' && typeof app.maybeShowAppTip === 'function');

  console.log(P.logs.join('\n'));
  console.log('\n结果: ' + P.pass + ' 通过 / ' + P.fail + ' 失败');
  process.exit(P.fail ? 1 : 0);
})();
