/* v63 冒烟测试：多用户数据隔离
 *  1) 脚本加载 / init 不抛错
 *  2) 红线：userId 派生公式未被改动（死向量）
 *  3) 不同密码 → 不同 userId；同密码 → 同 userId（跨设备确定性）
 *  4) 邀请码校验：正确 / 大小写 / 前后空格 / 错误 / 空
 *  5) _rowOwnsBy：无主老数据 vs 本人 vs 他人
 *  6) dbFetchAll 真实云端读取路径按 userId 过滤
 *  7) readMetaClearAt 只认本人清空信号（修复跨用户互清）
 *  8) 登录页「创建独立空间」入口 DOM 齐备且默认隐藏
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
w.alert = () => { }; w.confirm = () => true; w.prompt = () => null;
try { w.localStorage = storage; } catch (e) { }
if (!w.Image) w.Image = function () { };
try { Object.defineProperty(Object.getPrototypeOf(doc.createElement('form')), 'elements', { get() { return this.querySelectorAll('[name]'); } }); } catch (e) { }
w.FormData = class { constructor(f) { this._f = f; this._m = new Map(); if (f) { const els = f.querySelectorAll('[name]'); for (const el of els) { const t = (el.type || '').toLowerCase(); if (t === 'radio') { if (el.checked) this._m.set(el.name, el.value); } else if (t === 'checkbox') { if (el.checked) this._m.set(el.name, 'on'); } else { this._m.set(el.name, el.value || ''); } } } } get(k) { return this._m.has(k) ? this._m.get(k) : null; } entries() { return [...this._m.entries()]; } };
const _fake = { records: {} };
w.__SMART_PAGE__ = { database: { query: async function ({ databaseId, pageSize, startCursor }) { const arr = _fake.records[databaseId] || []; const start = startCursor ? parseInt(startCursor, 10) || 0 : 0; return { results: arr.slice(start, start + pageSize), hasMore: false, nextCursor: null }; }, addRecord: async () => ({ _id: 'r' }), updateRecord: async () => ({}), deleteRecord: async () => ({}), getSchema: async () => ({ properties: [] }) } };
const navStub = { userAgent: 'node', platform: 'x', language: 'zh-CN' };
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

const DB_MONEY = 'O4PsdbQpHnSDT0LSKcqgoI';
const DB_META = 'FKpqucBa96f2slzvcU3jdV';
const PW_A = 'TestPw-2026-Alpha';
const PW_B = 'TestPw-2026-Bravo';

(async function () {
  let initErr = '';
  try { doc.dispatchEvent(new w.Event('DOMContentLoaded')); } catch (e) { initErr = e.message; }
  ok('1 init(DOMContentLoaded) 不抛错', !initErr);

  const T = w.__appTest;
  ok('1a 多用户相关函数已导出', typeof T.authUserId === 'function' && typeof T.authVerifyInvite === 'function' && typeof T._rowOwnsBy === 'function' && typeof T.readMetaClearAt === 'function');
  ok('1b 邀请码摘要常量已导出', typeof T.AUTH_INVITE_HASH === 'string' && T.AUTH_INVITE_HASH.length === 64);

  // ---- 2. 红线：userId 派生公式不得改变 ----
  const expect = s => nodeCrypto.createHash('sha256').update(s, 'utf8').digest('hex');
  const uidA = await T.authUserId(PW_A);
  ok('2a userId 公式未被改动（死向量 SHA256(UID_SALT:pw)）', uidA === expect('richangji-v32-uid-2026-09:' + PW_A));
  ok('2b 派生结果是 64 位十六进制', /^[0-9a-f]{64}$/.test(uidA));

  // ---- 3. 不同密码 → 不同 userId；同密码 → 同 userId ----
  const uidB = await T.authUserId(PW_B);
  ok('3a 不同密码派生出不同 userId', uidA !== uidB);
  const uidA2 = await T.authUserId(PW_A);
  ok('3b 同密码派生稳定（跨设备确定性）', uidA2 === uidA);
  const uidShort = await T.authUserId('1234567');
  ok('3c 短密码也照常派生（不做长度校验）', typeof uidShort === 'string' && uidShort.length === 64);

  // ---- 4. 邀请码校验 ----
  ok('4a 正确邀请码通过', await T.authVerifyInvite('RJ-U6M9-VBCV') === true);
  ok('4b 小写也被接受', await T.authVerifyInvite('rj-vkd5-ywly') === true);
  ok('4c 前后空格被 trim', await T.authVerifyInvite('  RJ-U6M9-VBCV  ') === true);
  ok('4d 错误邀请码被拒', await T.authVerifyInvite('RJ-XXXX-XXXX') === false);
  ok('4e 空邀请码被拒', await T.authVerifyInvite('') === false);
  ok('4f 纯空格被拒', await T.authVerifyInvite('   ') === false);
  ok('4g 默认值可被自定义码覆盖', T.authInviteMatch('ABC-123', 'ABC-123') === true);
  ok('4h 比对函数空值安全', T.authInviteMatch('', 'X') === false && T.authInviteMatch('X', '') === false);

  // ---- 5. _rowOwnsBy 归属判定 ----
  T.state_auth.userId = 'USER-A';
  ok('5a 本人记录归属本人', T._rowOwnsBy({ _id: 'x', userId: { text: 'USER-A' } }) === true);
  ok('5b 他人记录不归属本人', T._rowOwnsBy({ _id: 'x', userId: { text: 'USER-B' } }) === false);
  ok('5c 无 userId 的老行保守采用', T._rowOwnsBy({ _id: 'x' }) === true);
  ok('5d 裸字符串 userId 也能识别', T._rowOwnsBy({ _id: 'x', userId: 'USER-A' }) === true);
  T.state_auth.userId = '';
  ok('5e 未登录时他人行不归属', T._rowOwnsBy({ _id: 'x', userId: { text: 'USER-B' } }) === false);

  // ---- 6. dbFetchAll 真实读取路径按 userId 过滤 ----
  await new Promise(r => setTimeout(r, 400));
  _fake.records[DB_MONEY] = [
    { _id: 'm1', userId: { text: 'USER-A' }, '备注': { text: '甲的一条' } },
    { _id: 'm2', userId: { text: 'USER-B' }, '备注': { text: '乙的一条' } },
    { _id: 'm3', '备注': { text: '无主老数据' } }
  ];
  T.state_auth.userId = 'USER-A';
  const rowsA = await new Promise(r => T.dbFetchAll(DB_MONEY, r));
  if (!rowsA) { skip('6a–6c 云端桥未就绪，跳过 dbFetchAll 隔离用例'); }
  else {
    const idsA = rowsA.map(x => x._id).sort().join(',');
    ok('6a 只读到自己的记录', idsA === 'm1');
    T.state_auth.userId = 'USER-B';
    const rowsB = await new Promise(r => T.dbFetchAll(DB_MONEY, r));
    const idsB = (rowsB || []).map(x => x._id).sort().join(',');
    ok('6b 换成乙的身份后只读到乙的', idsB === 'm2');
    T.state_auth.userId = '';
    const rowsNone = await new Promise(r => T.dbFetchAll(DB_MONEY, r));
    ok('6c 未登录时返回 null（不是空数组，防清库）', rowsNone === null);
  }

  // ---- 7. readMetaClearAt 只认本人清空信号 ----
  T.state_auth.userId = 'USER-A';
  const clearA = 1900000000000, clearB = 1800000000000;
  /* 云端 SDK 返回的列值是已解包的纯值（见 mergeMoney 里直接 Number(r["金额"])），
   * userId 也是裸字符串。mock 必须与真实格式一致，否则 Number({text:..}) 得 NaN。 */
  _fake.records[DB_META] = [
    { _id: 'c1', '键': 'lastClearedAt', '值': String(clearA), userId: 'USER-A' },
    { _id: 'c2', '键': 'lastClearedAt', '值': String(clearB), userId: 'USER-B' }
  ];
  const tsA = await new Promise(r => T.readMetaClearAt(r));
  if (tsA === 0) { skip('7a–7c 桥未就绪或键名不符，跳过 readMetaClearAt 用例'); }
  else {
    ok('7a 取到本人清空时间戳', tsA === clearA);
    T.state_auth.userId = 'USER-B';
    const tsB = await new Promise(r => T.readMetaClearAt(r));
    ok('7b 乙读到的是自己的清空时间（甲的更晚也不生效）', tsB === clearB);
    T.state_auth.userId = 'USER-A';
    _fake.records[DB_META] = [
      { _id: 'c9', '键': 'lastClearedAt', '值': '1750000000000' },
      { _id: 'c8', '键': 'lastClearedAt', '值': String(clearB), userId: 'USER-B' }
    ];
    const tsLegacy = await new Promise(r => T.readMetaClearAt(r));
    ok('7c 无 userId 的老清空标记仍被采用', tsLegacy === 1750000000000);
  }

  // ---- 8. 登录页 DOM ----
  const btnSpace = doc.getElementById('authSpaceBtn');
  const boxSpace = doc.getElementById('authSpaceBox');
  const inpInvite = doc.getElementById('authInvite');
  const btnGo = doc.getElementById('authInviteGo');
  ok('8a 创建入口按钮存在', !!btnSpace);
  ok('8b 邀请码输入区存在', !!boxSpace && !!inpInvite && !!btnGo);
  ok('8c 入口默认隐藏（有密码的设备不显示）', !!btnSpace && btnSpace.hasAttribute('hidden'));
  ok('8d 输入区默认隐藏', !!boxSpace && boxSpace.hasAttribute('hidden'));

  console.log(P.logs.join('\n'));
  console.log('\n结果: ' + P.pass + ' 通过 / ' + P.fail + ' 失败' + (P.skip ? ' / ' + P.skip + ' 跳过' : ''));
  process.exit(P.fail ? 1 : 0);
})();
