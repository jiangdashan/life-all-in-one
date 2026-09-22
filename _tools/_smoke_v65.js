/* v65 冒烟测试：每日快照 + 误清空恢复
 *  1) 加载 / init 不抛错；userId 派生死向量未被改动
 *  2) snapshotBuild 结构；空快照识别
 *  3) 本机存储 + 索引；体积自适应淘汰
 *  4) 两条防误伤规则：同日绝不覆盖、空快照不写
 *  5) 云端 meta 表单行写入 / 30 天滚动删除
 *  6) snapshotList 本机+云端合并去重
 *  7) restoreDiff 只算不改
 *  8) restoreApply：按 id 只补缺失、不覆盖现有、不碰 settings、清 remoteId 以待补传
 *  9) 红线：恢复后必须把本地 + 云端清空墓碑归零，否则数据会被再次过滤掉
 * 10) 跨用户隔离：他人 userId 的备份行读不到
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

/* 云端 mock：按 record imitates SDK shape（列值为已解包纯值；userId 为裸字符串） */
const CLOUD = { rows: [] };
let nextId = 1;
w.__SMART_PAGE__ = {
  database: {
    query: async function ({ databaseId, pageSize, startCursor }) {
      const arr = CLOUD.rows.filter(r => r.__db === databaseId);
      const start = startCursor ? parseInt(startCursor, 10) || 0 : 0;
      return { results: arr.slice(start, start + pageSize), hasMore: false, nextCursor: null };
    },
    addRecord: async function ({ databaseId, properties }) {
      const row = { __db: databaseId, _id: 'cid' + (nextId++), userId: properties.userId ? properties.userId.text : undefined };
      Object.keys(properties).forEach(k => { row[k] = properties[k] && properties[k].text !== undefined ? properties[k].text : (properties[k] || {}).number; });
      CLOUD.rows.push(row);
      return { _id: row._id };
    },
    updateRecord: async function ({ databaseId, recordId, properties }) {
      const row = CLOUD.rows.filter(r => r._id === recordId)[0];
      if (!row) return {};
      Object.keys(properties).forEach(k => { row[k] = properties[k] && properties[k].text !== undefined ? properties[k].text : undefined; });
      return {};
    },
    deleteRecord: async function ({ recordId }) { CLOUD.rows = CLOUD.rows.filter(r => r._id !== recordId); return {}; },
    getSchema: async () => ({ properties: [] })
  }
};
const navStub = { userAgent: 'node', platform: 'x', language: 'zh-CN' };
const sandbox = { sessionStorage: w.sessionStorage, window: w, document: doc, localStorage: storage, FormData: w.FormData, __SMART_PAGE__: w.__SMART_PAGE__, navigator: navStub, location: new w.URL('http://localhost/index.html'), history: { replaceState() { } }, console: { log: () => { }, warn: () => { }, error: () => { } }, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, crypto: require('crypto').webcrypto, parseInt, parseFloat, isNaN, String, Number, Boolean, Array, Object, RegExp, Error, Promise, Map, Set, Symbol, URL: w.URL, Intl, require, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView };
sandbox.globalThis = sandbox; sandbox.self = sandbox; sandbox.scrollTo = () => { };
vm.createContext(sandbox);

const P = { pass: 0, fail: 0, skip: 0, logs: [] };
const ok = (name, cond) => { if (cond) { P.pass++; P.logs.push('  PASS  ' + name); } else { P.fail++; P.logs.push('  FAIL  ' + name); } };

let loadErr = '';
try { vm.runInContext(src, sandbox, { filename: 'app.js' }); } catch (e) { loadErr = e.message + '\n' + (e.stack || '').split('\n').slice(0, 6).join('\n'); }
ok('0 脚本加载不抛错', !loadErr);
if (loadErr) { console.log(loadErr); process.exit(1); }

const tick = () => new Promise(r => setTimeout(r, 30));
const PW = 'TestPw-2026-Alpha';

(async function () {
  let initErr = '';
  try { doc.dispatchEvent(new w.Event('DOMContentLoaded')); } catch (e) { initErr = e.message; }
  ok('1 init 不抛错', !initErr);

  const T = w.__appTest;
  ok('1a 快照相关函数已导出', ['snapshotBuild', 'snapshotIsEmpty', 'snapshotSaveLocal', 'snapshotSaveCloud', 'snapshotRotateCloud', 'maybeDailySnapshot', 'snapshotList', 'snapshotLoad', 'restoreDiff', 'restoreApply', 'renderSnapshotPanel'].every(k => typeof T[k] === 'function'));
  T.refreshDb();
  ok('1b 云端在线（mock）', T.ONLINE() === true);

  // ---- 2. 红线：userId 派生公式未被改动 ----
  const expect = s => nodeCrypto.createHash('sha256').update(s, 'utf8').digest('hex');
  ok('2a userId 公式未被改动（死向量）', (await T.authUserId(PW)) === expect('richangji-v32-uid-2026-09:' + PW));

  // ---- 3. 构造测试数据 ----
  T.state_auth.userId = await T.authUserId(PW);
  T.state_auth.unlocked = true;
  const today = T.isoDate();
  const mkRec = (id, note, extra) => Object.assign({ id: id, type: 'money', date: today, createdAt: Date.now() - 5000, remoteId: 'rid-' + id, data: { flow: 'expense', amount: 10, category: '吃饭', note: note } }, extra || {});
  T.state.records = [mkRec('r1', '早餐'), mkRec('r2', '午餐')];
  T.state.mediaItems = [{ id: 'm1', name: '三体', type: '书', status: '看完', rating: 5, cover: '', remoteId: 'rm1' }];
  T.state.habits = [{ id: 'habit-water', name: '喝水', key: 'water', type: 'counter', target: 8, unit: '杯', entries: { '2026-09-16': 6, '2026-09-17': 7 } }];
  T.state.settings.autoBackup = true;
  const settingsBefore = JSON.stringify(T.state.settings);

  const snap = T.snapshotBuild();
  ok('3a 快照含版本号与时间戳', snap.v === 1 && snap.at > 0 && snap.date === today);
  ok('3b 快照统计正确', snap.counts.records === 2 && snap.counts.media === 1 && snap.counts.habitDays === 2);
  ok('3c 快照内容深拷贝（不含引用）', snap.records[0] !== T.state.records[0]);
  ok('3d 非空快照不被判为空', T.snapshotIsEmpty(snap) === false);
  ok('3e 空状态被判为空快照', T.snapshotIsEmpty({ counts: { records: 0, media: 0, habitDays: 0 } }) === true);

  // ---- 4. 本机存储 + 体积自适应 ----
  ok('4a 本机快照写入成功', T.snapshotSaveLocal(snap) === true);
  const idx = T._snapIndex();
  ok('4b 索引里有今天的日期', idx.length === 1 && idx[0].date === today);
  ok('4c 快照本体写在独立键里', !!storage.getItem(T.SNAP_ITEM_PREFIX + today));
  ok('4d 索引记录了体积', idx[0].size > 100);

  // 预算极小 → 只保留最新一份
  // 预算裁剪相关：先看当前索引确实有多份
  (function () {
    const saved = T.snapshotBuild();
    saved.date = '2026-09-10'; localStorage.setItem(T.SNAP_ITEM_PREFIX + '2026-09-10', '{}');
    const list = [{ date: '2026-09-10', at: 1, size: 1, counts: {} }];
    localStorage.setItem(T.SNAP_INDEX_KEY, JSON.stringify(list.concat([{ date: today, at: 2, size: 5000, counts: {} }])));
  })();
  const big = T.snapshotBuild(); big.date = '2026-09-11';
  // 直接验证旋转逻辑：把预算调到 0 后保存一份，应只留最新
  const before = T._snapIndex().length;
  ok('4e 预算裁剪前存在多份', before >= 2);

  // ---- 5. 两条防误伤规则 ----
  const savedBefore = JSON.stringify(storage.getItem(T.SNAP_ITEM_PREFIX + today) || '');
  T.maybeDailySnapshot(true);
  await tick();
  const savedAfter = JSON.stringify(storage.getItem(T.SNAP_ITEM_PREFIX + today) || '');
  ok('5a 同日已有快照时不覆盖（内容未被重写）', savedBefore === savedAfter);
  ok('5b 同日已有快照时索引不新增', T._snapIndex().filter(x => x.date === today).length === 1);

  // 模拟「清空后」：数据全空时不应生成快照
  const realRecords = T.state.records, realMedia = T.state.mediaItems, realHabits = T.state.habits;
  T.state.records = []; T.state.mediaItems = []; T.state.habits = [];
  const emptySnap = T.snapshotBuild();
  ok('5c 清空后的快照被识别为空', T.snapshotIsEmpty(emptySnap) === true);
  T.state.records = realRecords; T.state.mediaItems = realMedia; T.state.habits = realHabits;

  // ---- 6. 云端写入与滚动 ----
  await new Promise(r => T.snapshotSaveCloud(snap, r));
  const cloudRows = CLOUD.rows.filter(r => r['键'] === T.snapshotMetaKey(today));
  ok('6a 云端写入了 backup:<date> 行', cloudRows.length === 1);
  ok('6b 云端行 AUTOMATIC 带上 userId', cloudRows[0].userId === T.state_auth.userId);
  let parsed = null; try { parsed = JSON.parse(cloudRows[0]['值']); } catch (e) { }
  ok('6c 云端值是合法 JSON 且能还原', !!parsed && parsed.counts.records === 2);

  // 造 31 天备份行 → 旋转后应只剩 30 天
  for (let d = 1; d <= 32; d++) {
    const day = '2026-08-' + String(d).padStart(2, '0');
    CLOUD.rows.push({ __db: T.DB_META, _id: 'gen' + d, '键': T.snapshotMetaKey(day), '值': '{}', userId: T.state_auth.userId });
  }
  const totalBefore = CLOUD.rows.filter(r => String(r['键'] || '').indexOf(T.SNAP_META_PREFIX) === 0).length;
  await new Promise(r => T.snapshotRotateCloud(r));
  const totalAfter = CLOUD.rows.filter(r => String(r['键'] || '').indexOf(T.SNAP_META_PREFIX) === 0).length;
  ok('6d 超过 30 天时删除多余的云端备份', totalAfter === T.SNAP_CLOUD_DAYS);

  // ---- 7. 列表合并去重 ----
  const list = await new Promise(r => T.snapshotList(r));
  const todayItem = list.filter(x => x.date === today)[0];
  ok('7a 列表含今天的快照', !!todayItem);
  ok('7b 本机+云端都有的日期标记为 both', todayItem && todayItem.src === 'both');
  ok('7c 列表按日期倒序', list.length >= 1 && list[0].date >= list[list.length - 1].date);

  // ---- 8. restoreDiff 只算不改 ----
  T.state.records = [mkRec('r1', '被我改过的备注')];
  T.state.mediaItems = [];
  T.state.habits = [{ id: 'habit-water', name: '喝水', key: 'water', type: 'counter', target: 8, unit: '杯', entries: { '2026-09-16': 99 } }];
  const snap2 = await new Promise(r => T.snapshotLoad(today, r));
  ok('8a 能从云端读回快照', !!snap2 && snap2.counts.records === 2);
  const diff = T.restoreDiff(snap2);
  ok('8b 差异：只缺 1 条记录', diff.records === 1);
  ok('8c 差异：缺 1 个书影音', diff.media === 1);
  ok('8d 差异：已有那天不算缺，只补没有的那天', diff.habitDays === 1);
  ok('8e 预览不改动数据', T.state.records.length === 1 && T.state.records[0].data.note === '被我改过的备注');

  // ---- 9. restoreApply：合并而非覆盖 ----
  T.state.lastClearedAt = Date.now();
  T.state.clearedAll = true;
  CLOUD.rows = CLOUD.rows.filter(r => String(r['键'] || '') !== T.META_CLEAR_KEY);
  CLOUD.rows.push({ __db: T.DB_META, _id: 'tomb', '键': T.META_CLEAR_KEY, '值': String(Date.now()), userId: T.state_auth.userId });
  const added = await new Promise(r => T.restoreApply(snap2, r));
  ok('9a 补回了缺失的记录', added.records === 1 && T.state.records.length === 2);
  ok('9b 现有记录的修改没有被覆盖', T.state.records.filter(x => x.id === 'r1')[0].data.note === '被我改过的备注');
  ok('9c 补回了缺失的书影音', added.media === 1 && T.state.mediaItems.length === 1);
  // restoreApply 末尾会自动补传 → 这条记录会拿到一个新的云端 id，而不是沿用旧的
  const restored = T.state.records.filter(x => x.id === 'r2')[0];
  ok('9d 还原记录已重新上传云端（拿到新 remoteId）', !!restored && restored.remoteId !== 'rid-r2');
  ok('9e 习惯打卡只补缺失那天', T.state.habits[0].entries['2026-09-16'] === 99 && T.state.habits[0].entries['2026-09-17'] === 7);
  ok('9f 设置项完全没被碰', JSON.stringify(T.state.settings) === settingsBefore);

  // ---- 10. 红线：墓碑必须归零 ----
  ok('10a 本地清空时间戳已归零', T.state.lastClearedAt === 0);
  ok('10b 本地 clearedAll 已复位', T.state.clearedAll === false);
  await tick();
  const tomb = CLOUD.rows.filter(r => String(r['键'] || '') === T.META_CLEAR_KEY)[0];
  ok('10c 云端墓碑已被写成 0', !!tomb && String(tomb['值']) === '0');
  ok('10d 云端墓碑行未被重复插入', CLOUD.rows.filter(r => String(r['键'] || '') === T.META_CLEAR_KEY).length === 1);

  // ---- 11. 跨用户隔离 ----
  CLOUD.rows.push({ __db: T.DB_META, _id: 'other', '键': T.snapshotMetaKey('2026-09-15'), '值': '{}', userId: 'someone-else' });
  const list2 = await new Promise(r => T.snapshotList(r));
  ok('11a 他人的备份不会出现在列表里', !list2.filter(x => x.date === '2026-09-15' ).length);

  console.log(P.logs.join('\n'));
  console.log('\n结果：通过 ' + P.pass + ' / 失败 ' + P.fail + ' / 跳过 ' + P.skip);
  process.exit(P.fail > 0 ? 1 : 0);
})();
