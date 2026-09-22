# -*- coding: utf-8 -*-
"""生成 _smoke_v73.js：档案日期漫游 + 倒数日模块"""
import io

HEAD = r"D:\workbuddyProjects\工作台3\_tools\_smoke_v72.js"
OUT = r"D:\workbuddyProjects\工作台3\_tools\_smoke_v73.js"

L = io.open(HEAD, encoding="utf-8").read().split("\n")
cut = None
for i, l in enumerate(L):
    if "const T = w.__appTest" in l:
        cut = i
        break
if cut is None:
    raise SystemExit("anchor not found")
head = "\n".join(L[:cut + 1])

body = r"""
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
  ok('B25 顶部 hero 显示最近的一个', cdHero.indexOf('cd-hero-days') >= 0);

  // ---- 删除 + 墓碑 ----
  const target = T._cdList().filter(x => x.name === '农历生日')[0];
  T.deleteCountdown(target.id);
  ok('B26 删除后列表移除', T._cdList().filter(x => x.name === '农历生日').length === 0);
  ok('B27 删除写入墓碑', (T.state.settings.deletedCountdownIds || []).indexOf(target.id) >= 0);
  T.renderCountdown();
  ok('B28 删除后不再渲染', ((doc.getElementById('countdownList') || {}).innerHTML || '').indexOf('农历生日') < 0);

  // ---- 合并（模拟两台设备） ----
  const localList = [{ id: 'a1', name: '本地新增', type: 'solar', date: shift(5), repeat: false, updatedAt: 200 }];
  const remoteList = [
    { id: 'a1', name: '远处改的', type: 'solar', date: shift(5), repeat: false, updatedAt: 100 },   // 更旧 → 不覆盖本地
    { id: 'a2', name: '远端新增', type: 'solar', date: shift(8), repeat: false, updatedAt: 300 },   // 新 → 并进来
    { id: 'a3', name: '远端删过的', type: 'solar', date: shift(9), repeat: false, updatedAt: 300 }   // 已被删 → 墓碑踢掉
  ];
  const mg = T._cdMergeList(localList, remoteList, ['a3']);
  ok('B29 合并保留两侧新条目', mg.list.length === 2 && mg.list.some(x => x.id === 'a1') && mg.list.some(x => x.id === 'a2'));
  ok('B30 同 id 时新的胜出', mg.list.filter(x => x.id === 'a1')[0].name === '本地新增');
  ok('B31 墓碑踢掉已删条目', !mg.list.some(x => x.id === 'a3'));
  ok('B32 标记为已变更', mg.changed === true);

  console.log('\nRESULT: pass=' + P.pass + ' fail=' + P.fail);
  process.exit(P.fail > 0 ? 1 : 0);
})().catch(e => { console.log('FATAL', e && e.message, e && e.stack); process.exit(1); });
"""

io.open(OUT, "w", encoding="utf-8").write(head + body)
print("generated _smoke_v73.js, lines =", len((head + body).split("\n")))
