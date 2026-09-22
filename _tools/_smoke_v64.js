/* v64 冒烟测试：设置面板「邀请他人使用」管理入口
 *  1) 脚本加载 / init 不抛错
 *  2) 红线：userId 派生公式未被改动（死向量）
 *  3) 内置邀请码常量正确且可通过校验
 *  4) authGenInviteCode 格式与随机性
 *  5) 自定义码：写入本机后生效、旧内置码立即失效
 *  6) 恢复内置：回到默认码且默认码重新有效
 *  7) DOM 区块齐备、默认掩码显示
 *  8) 二次校验：密码错误 → 不显示明文；密码正确 → 显示
 *  9) 复制邀请信息不抛错
 * 10) 安全红线：整个邀请码管理流程零云端写入（绝不进云端）
 */
const LINKEDOM = 'C:/Users/依易亦奕鸭/.workbuddy/binaries/node/workspace/node_modules/linkedom';
const { parseHTML } = require(LINKEDOM);
const fs = require('fs'); const vm = require('vm'); const nodeCrypto = require('crypto');
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
w.alert = () => { }; w.confirm = () => true;
let PROMPT_RET = null; const PROMPT_LOG = [];
w.prompt = (msg) => { PROMPT_LOG.push(String(msg)); return PROMPT_RET; };
try { w.localStorage = storage; } catch (e) { }
if (!w.Image) w.Image = function () { };
try { Object.defineProperty(Object.getPrototypeOf(doc.createElement('form')), 'elements', { get() { return this.querySelectorAll('[name]'); } }); } catch (e) { }
w.FormData = class { constructor(f) { this._f = f; this._m = new Map(); if (f) { const els = f.querySelectorAll('[name]'); for (const el of els) { const t = (el.type || '').toLowerCase(); if (t === 'radio') { if (el.checked) this._m.set(el.name, el.value); } else if (t === 'checkbox') { if (el.checked) this._m.set(el.name, 'on'); } else { this._m.set(el.name, el.value || ''); } } } } get(k) { return this._m.has(k) ? this._m.get(k) : null; } entries() { return [...this._m.entries()]; } };

/* 统计云端写入次数——邀请码绝不允许写进云端 */
const WRITE_CNT = { add: 0, update: 0, del: 0 };
const _fake = { records: {} };
w.__SMART_PAGE__ = {
  database: {
    query: async function ({ databaseId, pageSize, startCursor }) { const arr = _fake.records[databaseId] || []; const start = startCursor ? parseInt(startCursor, 10) || 0 : 0; return { results: arr.slice(start, start + pageSize), hasMore: false, nextCursor: null }; },
    addRecord: async () => { WRITE_CNT.add++; return { _id: 'r' }; },
    updateRecord: async () => { WRITE_CNT.update++; return {}; },
    deleteRecord: async () => { WRITE_CNT.del++; return {}; },
    getSchema: async () => ({ properties: [] })
  }
};
const CLIP = { text: null };
const navStub = { userAgent: 'node', platform: 'x', language: 'zh-CN', clipboard: { writeText: async t => { CLIP.text = t; } } };
const sandbox = { sessionStorage: w.sessionStorage, window: w, document: doc, localStorage: storage, FormData: w.FormData, __SMART_PAGE__: w.__SMART_PAGE__, navigator: navStub, location: new w.URL('http://localhost/index.html'), history: { replaceState() { } }, console: { log: () => { }, warn: () => { }, error: () => { } }, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, crypto: require('crypto').webcrypto, parseInt, parseFloat, isNaN, String, Number, Boolean, Array, Object, RegExp, Error, Promise, Map, Set, Symbol, URL: w.URL, Intl, require, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView };
sandbox.globalThis = sandbox; sandbox.self = sandbox; sandbox.scrollTo = () => { };
vm.createContext(sandbox);

const P = { pass: 0, fail: 0, skip: 0, logs: [] };
const ok = (name, cond) => { if (cond) { P.pass++; P.logs.push('  PASS  ' + name); } else { P.fail++; P.logs.push('  FAIL  ' + name); } };
const skip = name => { P.skip++; P.logs.push('  SKIP  ' + name); };

let loadErr = '';
try { vm.runInContext(src, sandbox, { filename: 'app.js' }); } catch (e) { loadErr = e.message + '\n' + (e.stack || '').split('\n').slice(0, 6).join('\n'); }
ok('0 脚本加载不抛错', !loadErr);
if (loadErr) { console.log(loadErr); console.log(P.logs.join('\n')); process.exit(1); }

const PW_A = 'TestPw-2026-Alpha';
const tick = () => new Promise(r => setTimeout(r, 25));

(async function () {
  let initErr = '';
  try { doc.dispatchEvent(new w.Event('DOMContentLoaded')); } catch (e) { initErr = e.message; }
  ok('1 init(DOMContentLoaded) 不抛错', !initErr);

  const T = w.__appTest;
  ok('1a 邀请管理函数已导出', ['authInviteCurrentCode', 'authInviteIsCustom', 'authGenInviteCode', 'authInviteRender', 'authInviteToggle', 'authInviteRegen', 'authInviteReset', 'authInviteCopy', 'bindInvitePanel'].every(k => typeof T[k] === 'function'));
  ok('1b 邀请常量已导出', typeof T.AUTH_INVITE_DEFAULT === 'string' && typeof T.AUTH_INVITE_STORE_KEY === 'string' && typeof T.AUTH_INVITE_OWNER_KEY === 'string');

  // ---- 2. 红线：userId 派生公式不得改变 ----
  const expect = s => nodeCrypto.createHash('sha256').update(s, 'utf8').digest('hex');
  const uidA = await T.authUserId(PW_A);
  ok('2a userId 公式未被改动（死向量）', uidA === expect('richangji-v32-uid-2026-09:' + PW_A));
  ok('2b 派生结果是 64 位十六进制', /^[0-9a-f]{64}$/.test(uidA));

  // ---- 3. 内置邀请码 ----
  ok('3a 内置码常量 = RJ-U6M9-VBCV', T.AUTH_INVITE_DEFAULT === 'RJ-U6M9-VBCV');
  ok('3b 无自定义码时当前码 = 内置码', T.authInviteCurrentCode() === 'RJ-U6M9-VBCV');
  ok('3c 无自定义码时 authInviteIsCustom = false', T.authInviteIsCustom() === false);
  ok('3d 内置码通过校验', await T.authVerifyInvite('RJ-U6M9-VBCV') === true);
  ok('3e 小写内置码也通过', await T.authVerifyInvite('rj-vkd5-ywly') === true);
  ok('3f 错误码被拒', await T.authVerifyInvite('RJ-0000-0000') === false);

  // ---- 4. 生成新的随机码 ----
  const g1 = T.authGenInviteCode(), g2 = T.authGenInviteCode(), g3 = T.authGenInviteCode();
  ok('4a 生成格式 RJ-XXXX-XXXX', /^RJ-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(g1));
  ok('4b 生成的码彼此不同（有随机性）', !(g1 === g2 && g2 === g3));
  ok('4c 不含易混淆字符 I/O/0/1', !/[IO01]/.test(g1 + g2 + g3));

  // ---- 5. DOM 区块齐备 + 默认掩码 ----
  const box = doc.getElementById('inviteBox');
  const codeEl = doc.getElementById('inviteCodeText');
  const btnT = doc.getElementById('inviteToggleBtn');
  const btnC = doc.getElementById('inviteCopyBtn');
  const btnR = doc.getElementById('inviteRegenBtn');
  const btnReset = doc.getElementById('inviteResetBtn');
  const stEl = doc.getElementById('inviteState');
  ok('5a 区块与四个按钮齐备', !!(box && codeEl && btnT && btnC && btnR && btnReset && stEl));
  ok('5b 默认处于掩码状态', codeEl && codeEl.getAttribute('data-shown') === '0');
  ok('5c 掩码不泄露真码', codeEl && codeEl.textContent.indexOf('RJ-U6M9-VBCV') < 0);
  T.authInviteRender();
  ok('5d 渲染后仍是掩码', codeEl.textContent.indexOf('RJ-U6M9-VBCV') < 0);
  ok('5e 初始状态提示为内置邀请码', /内置邀请码/.test(stEl.innerHTML));
  ok('5f 按钮文案为「显示」', btnT.textContent === '显示');

  // ---- 6. 二次校验：密码错误不得显示 ----
  const writeBase = WRITE_CNT.add + WRITE_CNT.update + WRITE_CNT.del;
  storage.setItem(T.AUTH_STORAGE_KEY, JSON.stringify({ passwordHash: await T.authPwHash(PW_A), createdAt: Date.now() }));
  PROMPT_RET = 'WrongPw-Xyzzy-999';
  btnT.dispatchEvent(new w.Event('click'));
  await tick();
  ok('6a 密码错误时不显示明文', codeEl.textContent.indexOf('RJ-U6M9-VBCV') < 0);
  ok('6b 密码错误后仍保持掩码态', codeEl.getAttribute('data-shown') === '0');
  ok('6c 确实弹出了密码询问', PROMPT_LOG.length >= 1);
  ok('6d 未通过校验时未记录主人会话', w.sessionStorage.getItem(T.AUTH_INVITE_OWNER_KEY) !== '1');

  // ---- 7. 二次校验：密码正确后可显示 ----
  w.sessionStorage.setItem('unlockPw', PW_A);
  btnT.dispatchEvent(new w.Event('click'));
  await tick();
  ok('7a 密码正确后显示明文', codeEl.textContent.indexOf('RJ-U6M9-VBCV') >= 0);
  ok('7b 状态切换为 shown', codeEl.getAttribute('data-shown') === '1');
  ok('7c 按钮文案变为「隐藏」', btnT.textContent === '隐藏');
  btnT.dispatchEvent(new w.Event('click'));
  await tick();
  ok('7d 再点一次回到掩码（无需重新输密码）', codeEl.textContent.indexOf('RJ-U6M9-VBCV') < 0 && btnT.textContent === '显示');

  // ---- 8. 重新生成 → 自定义码生效、内置码失效 ----
  btnR.dispatchEvent(new w.Event('click'));
  await tick();
  const custom = storage.getItem(T.AUTH_INVITE_STORE_KEY);
  ok('8a 邀请码已写入本机 localStorage', !!custom);
  ok('8b 新码格式合规', !!custom && /^RJ-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(custom));
  ok('8c authInviteIsCustom 变为 true', T.authInviteIsCustom() === true);
  ok('8d 当前码 = 新生成的自定义码', T.authInviteCurrentCode() === String(custom).trim().toUpperCase());
  ok('8e 新码通过校验', await T.authVerifyInvite(custom) === true);
  ok('8f 旧内置码立即失效', await T.authVerifyInvite('RJ-U6M9-VBCV') === false);
  ok('8g 面板直接展示新码', codeEl.textContent.indexOf(custom) >= 0);
  ok('8h 状态提示变为自定义邀请码', /自定义邀请码/.test(stEl.innerHTML));

  // ---- 9. 恢复内置 ----
  btnReset.dispatchEvent(new w.Event('click'));
  await tick();
  ok('9a localStorage 中的自定义码已清除', !storage.getItem(T.AUTH_INVITE_STORE_KEY));
  ok('9b 当前码回到内置码', T.authInviteCurrentCode() === 'RJ-U6M9-VBCV');
  ok('9c 内置码重新通过校验', await T.authVerifyInvite('RJ-U6M9-VBCV') === true);
  btnReset.dispatchEvent(new w.Event('click'));
  await tick();
  ok('9d 已是内置码时再次点击不报错', T.authInviteCurrentCode() === 'RJ-U6M9-VBCV');

  // ---- 10. 复制邀请信息 ----
  let copyErr = '';
  try { await T.authInviteCopy(); await tick(); } catch (e) { copyErr = e.message; }
  ok('10a 复制邀请信息不抛错', !copyErr);
  ok('10b 复制内容含链接与邀请码', !!CLIP.text && CLIP.text.indexOf('工作台链接') >= 0 && CLIP.text.indexOf('RJ-U6M9-VBCV') >= 0);
  ok('10c 复制内容含操作指引', !!CLIP.text && CLIP.text.indexOf('创建一个新的独立空间') >= 0);

  // ---- 11. 安全红线：零云端写入 ----
  const after = WRITE_CNT.add + WRITE_CNT.update + WRITE_CNT.del;
  ok('11a 邀请码管理全程零云端写入', after === writeBase);

  console.log(P.logs.join('\n'));
  console.log('\n结果：通过 ' + P.pass + ' / 失败 ' + P.fail + ' / 跳过 ' + P.skip);
  process.exit(P.fail > 0 ? 1 : 0);
})();
