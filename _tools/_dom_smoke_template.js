#!/usr/bin/env node
/**
 * 通用 DOM 冒烟测试模板 —— 验证「单个 HTML 内 IIFE 包裹的单页应用」的真实运行时。
 *
 * 背景：linkedom 默认【不执行】内联 <script>。要跑真实的 init/renderAll，
 * 必须：建 DOM → 手工用 Node vm 执行 app 脚本 → dispatch DOMContentLoaded。
 * 本模板自动定位 app 内联 <script> 边界（不依赖写死行号，脚本位置变动也能跑）。
 *
 * 用法：复制本文件到项目，按需改：scriptOpenRe（app 脚本开标签特征）、
 * STORAGE_KEY、stateFactory()（seed 数据）、setTimeout 里的断言。然后：
 *     node _dom_smoke_template.js
 *
 * 依赖：项目内安装 linkedom，例如
 *   cd <workdir> && printf '{"name":"w","private":true}\n'>package.json \
 *     && npm install linkedom --no-audit --no-fund
 *   require 路径见下方 LINKEDOM，按实际 node_modules 位置改。
 */
const LINKEDOM = 'C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/linkedom';
const { parseHTML } = require(LINKEDOM);
const fs = require('fs');
const vm = require('vm');

const HTML_PATH = process.argv[2];          // 例如 F:/workbuddy/工作台3/life-all-in-one.html
const STORAGE_KEY = process.argv[3] || '';  // 例如 richangji-state-v1
const SCRIPT_OPEN_RE = /<script[^>]*>/;     // 若页面有多个 script，改成能锁定 app 那个的特征正则
if (!HTML_PATH) { console.error('用法: node _dom_smoke_template.js <html路径> [storageKey]'); process.exit(2); }

const html = fs.readFileSync(HTML_PATH, 'utf8');
const lines = html.split('\n');
let openIdx = -1, closeIdx = -1;
for (let i = 0; i < lines.length; i++) { if (SCRIPT_OPEN_RE.test(lines[i]) && !/<script[^>]+src=/.test(lines[i])) { openIdx = i; break; } }
if (openIdx < 0) { console.error('未找到内联 <script> 开标签'); process.exit(2); }
for (let i = openIdx + 1; i < lines.length; i++) { if (/<\/script>/.test(lines[i])) { closeIdx = i; break; } }
const scriptSrc = lines.slice(openIdx + 1, closeIdx).join('\n');

function makeStorage() { const d = {}; return { _d: d, getItem(k) { return k in d ? d[k] : null; }, setItem(k, v) { d[k] = String(v); }, removeItem(k) { delete d[k]; }, clear() { for (const k in d) delete d[k]; }, key(i) { return Object.keys(d)[i] ?? null; }, get length() { return Object.keys(d).length; } }; }
const storage = makeStorage();
// seed 例子（可换成真实状态；若不需要 seed，删掉下一行）
// if (STORAGE_KEY) storage.setItem(STORAGE_KEY, JSON.stringify(stateFactory()));

const full = parseHTML(html);
const w = full.window, doc = w.document;
// —— 补齐 linkedom 缺的浏览器 API ——
w.scrollTo = () => {};
if (typeof w.matchMedia !== 'function') w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
if (typeof w.requestAnimationFrame !== 'function') { w.requestAnimationFrame = cb => setTimeout(cb, 0); w.cancelAnimationFrame = clearTimeout; }
w.URL.createObjectURL = w.URL.createObjectURL || (() => 'blob:x'); w.URL.revokeObjectURL = w.URL.revokeObjectURL || (() => {});
w.alert = () => {}; w.confirm = () => true; w.prompt = () => null;
try { w.localStorage = storage; } catch (e) {}
if (!w.Image) w.Image = function () {};
// linkedom 的 HTMLSelectElement.value 是只读的（无 setter）→ 补一个 setter，否则 `sel.value=..` 会抛 "only a getter"
if (w.HTMLSelectElement && w.HTMLSelectElement.prototype) { try {
  const optsOf = s => { const a = [], c = s.options; if (c && typeof c.length === 'number') { for (let i = 0; i < c.length; i++) a.push(c[i]); } else { const q = s.querySelectorAll('option'); for (let i = 0; i < q.length; i++) a.push(q[i]); } return a; };
  Object.defineProperty(w.HTMLSelectElement.prototype, 'value', { configurable: true,
    get() { const o = this.selectedIndex != null && this.selectedIndex >= 0 ? optsOf(this)[this.selectedIndex] : null; return o ? (o.getAttribute('value') != null ? o.getAttribute('value') : (o.textContent || '').trim()) : ''; },
    set(v) { const o = optsOf(this), t = String(v == null ? '' : v); for (let i = 0; i < o.length; i++) { const val = o[i].getAttribute('value') != null ? o[i].getAttribute('value') : (o[i].textContent || '').trim(); if (val === t) { this.selectedIndex = i; return; } } } });
} catch (e) {} }

const errors = [];
// vm sandbox 必须给全 app 用到的全局（尤其 location 是真 URL 实例、crypto）
const sandbox = { window: w, document: doc, localStorage: storage,
  navigator: { userAgent: 'node', platform: 'x', language: 'zh-CN' },
  location: new URL('http://localhost/index.html'), history: { replaceState() {} },
  console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON,
  crypto: require('crypto').webcrypto, parseInt, parseFloat, isNaN, String, Number, Boolean,
  Array, Object, RegExp, Error, Promise, Map, Set, Symbol, URL: w.URL, Intl,
  requestAnimationFrame: w.requestAnimationFrame, cancelAnimationFrame: w.cancelAnimationFrame,
  TextEncoder, TextDecoder, Blob, FormData, scrollTo: () => {}, scrollBy: () => {},
  __SMART_PAGE__: undefined // 离线模式：让 SDK 相关同步短路
};
sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
try { vm.runInContext(scriptSrc, sandbox, { filename: 'app.js' }); } catch (e) { errors.push('eval: ' + ((e && e.stack) || e)); }
try { doc.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true })); } catch (e) { errors.push('domready: ' + ((e && e.stack) || e)); }

const click = el => { try { el.dispatchEvent(new w.Event('click', { bubbles: true, cancelable: true })); } catch (e) { errors.push('click: ' + ((e && e.stack) || e)); } };
const change = el => { try { el.dispatchEvent(new w.Event('change', { bubbles: true, cancelable: true })); } catch (e) { errors.push('change: ' + ((e && e.stack) || e)); } };

setTimeout(() => {
  // —— 在这里填断言；下面给几个通用占位 ——
  const report = { ERRORS: errors.length ? errors : 'none' };
  // 例：const el = doc.getElementById('xxx'); report['渲染'] = el && (el.innerHTML||'').length ? 'OK' : 'FAIL';
  console.log('===== DOM SMOKE =====');
  console.log(JSON.stringify(report, null, 2));
  process.exit(report['ERRORS'] === 'none' ? 0 : 1);
}, 400);
