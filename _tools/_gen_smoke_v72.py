# -*- coding: utf-8 -*-
"""生成 _smoke_v72.js：复用 v71 头部的 linkedom 垫片，拼 v72 新用例"""
import io

HEAD = r"D:\workbuddyProjects\工作台3\_tools\_smoke_v71.js"
OUT = r"D:\workbuddyProjects\工作台3\_tools\_smoke_v72.js"

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
  // ---------- 0. 清掉应用播种的示例数据，避免污染统计 ----------
  const mkRec = (type, date, data, extra) => Object.assign(
    { id: 'x' + Math.random().toString(36).slice(2, 8), type: type, date: date, createdAt: Date.now(), sample: false, data: data },
    extra || {}
  );

  // ================= 1. 日程按优先级排序 =================
  T.state.records = [];
  T.state.mediaItems = [];
  T.state.habits = [];
  const todayISO = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
  const base = Date.now() - 100000;
  T.state.records.push(mkRec('planner', todayISO, { title: '低优先任务', priority: 'low', list: '生活', done: false }, { createdAt: base + 1 }));
  T.state.records.push(mkRec('planner', todayISO, { title: '普通任务', priority: 'normal', list: '生活', done: false }, { createdAt: base + 2 }));
  T.state.records.push(mkRec('planner', todayISO, { title: '高优先任务', priority: 'high', list: '生活', done: false }, { createdAt: base + 3 }));

  ok('1a plannerPrioRank 映射正确',
    T.plannerPrioRank('high') === 0 && T.plannerPrioRank('normal') === 1 &&
    T.plannerPrioRank('low') === 2 && T.plannerPrioRank(undefined) === 1);

  const sorted = T.sortPlannerByPriority(T.state.records).map(r => r.data.title);
  ok('1b 排序：高 > 普通 > 低', JSON.stringify(sorted) === JSON.stringify(['高优先任务', '普通任务', '低优先任务']));

  // 同级内：未完成在前
  T.state.records.push(mkRec('planner', todayISO, { title: '已完成的高', priority: 'high', list: '生活', done: true }, { createdAt: base }));
  const sorted2 = T.sortPlannerByPriority(T.state.records).map(r => r.data.title);
  ok('1c 同级内未完成在前', sorted2.indexOf('高优先任务') < sorted2.indexOf('已完成的高'));
  ok('1d 已完成仍排在低优先之前（跨级优先）', sorted2.indexOf('已完成的高') < sorted2.indexOf('低优先任务'));

  T.state.settings.plannerFilter = 'all';
  T.state.settings.plannerPage = 1;
  let domErr = '';
  try { T.renderPlanner(); } catch (e) { domErr = e.message; }
  ok('1e renderPlanner 不抛错', !domErr);
  if (domErr) console.log(domErr);
  const plHtml = (doc.getElementById('plannerList') || {}).innerHTML || '';
  ok('1f 清单 DOM 按优先级输出', plHtml.indexOf('高优先任务') >= 0 && plHtml.indexOf('高优先任务') < plHtml.indexOf('普通任务') && plHtml.indexOf('普通任务') < plHtml.indexOf('低优先任务'));

  let qErr = '';
  try { T.renderQuadrant(); } catch (e) { qErr = e.message; }
  ok('1g renderQuadrant 不抛错', !qErr);
  if (qErr) console.log(qErr);
  const qHtml = (doc.getElementById('quadrantGrid') || {}).innerHTML || '';
  const qiH = qHtml.indexOf('高优先任务'), qiN = qHtml.indexOf('普通任务'), qiL = qHtml.indexOf('低优先任务');
  ok('1h 四象限 DOM 按优先级输出', qiH >= 0 && qiH < qiN && qiN < qiL);

  // ================= 2. 减脂周计划：跨周自动归档 =================
  function shift(n, from) {
    const d = from ? new Date(from + 'T00:00:00') : new Date();
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  const thisWeek = T.isoWeekStart();
  const lastWeek = shift(-7, thisWeek);
  T.state.settings.weeklyPlan = [{ title: '跑步 3 次', done: true }, { title: '力量训练', done: false }];
  T.state.settings.weeklyPlanWeekStart = lastWeek;
  T.state.settings.weeklyPlanHistory = [];
  let rErr = '';
  try { T.rolloverWeeklyPlan(); } catch (e) { rErr = e.message; }
  ok('2a rolloverWeeklyPlan 不抛错', !rErr);
  if (rErr) console.log(rErr);
  ok('2b 本周计划已清空', (T.state.settings.weeklyPlan || []).length === 0);
  ok('2c 旧计划进了历史', (T.state.settings.weeklyPlanHistory || []).length === 1);
  const hw = (T.state.settings.weeklyPlanHistory || [])[0] || {};
  ok('2d 历史记录的是上一周', hw.weekStart === lastWeek);
  ok('2e 历史保留了项目与完成数', (hw.items || []).length === 2 && hw.completed === 1 && hw.total === 2);
  ok('2f 周起点已推进到本周', T.state.settings.weeklyPlanWeekStart === thisWeek);

  // 幂等：同一周再跑一次不应重复归档
  try { T.rolloverWeeklyPlan(); } catch (e) { }
  ok('2g 同一周重复调用不重复归档', (T.state.settings.weeklyPlanHistory || []).length === 1);

  // ================= 3. 经期天数（只标首末的真实用法） =================
  T.state.records = [];
  const pd = (date, o) => mkRec('period', date, Object.assign({ isPeriodDay: 'Y', pad: 0, night: 0 }, o));
  // 8 月周期：8/7 首日，8/11 末日 —— 中间无记录（真实用户习惯）
  T.state.records.push(pd('2026-08-07', { isStartDay: 'Y', isEndDay: '' }));
  T.state.records.push(pd('2026-08-11', { isStartDay: '', isEndDay: 'Y' }));
  // 9 月周期：9/8 首日，9/13 末日
  T.state.records.push(pd('2026-09-08', { isStartDay: 'Y', isEndDay: '' }));
  T.state.records.push(pd('2026-09-13', { isStartDay: '', isEndDay: 'Y' }));
  const pa = T.analyzePeriod(T.state.records);
  ok('3a 认到两个周期起点', (pa.starts || []).length === 2);
  console.log('      [debug] periodLens=' + JSON.stringify(pa.periodLens) + ' avgPeriod=' + pa.avgPeriod + ' today=' + todayISO);
  ok('3b 经期长度按「首末跨度」算，不再是打卡天数 2', pa.periodLens.indexOf(2) < 0 && (pa.periodLens || []).length > 0 && Math.min.apply(null, pa.periodLens) >= 5);
  ok('3c 平均经期不再是 2 天', pa.avgPeriod >= 5);
  const cyc8 = (pa.cyclesExpanded || []).find(c => c.startDate === '2026-08-07');
  ok('3d 8 月周期展开 5 天', cyc8 && (cyc8.days || []).length === 5);
  ok('3e 中间日标记为自动补全', cyc8 && (cyc8.days || []).filter(d => d.source === 'mid-auto').length === 3);

  // ================= 4. 番茄钟累计 =================
  const sf = doc.getElementById('studyForm');
  const minutesEl = sf && sf.elements ? sf.elements.minutes : null;
  ok('4a 学习表单有时长输入框', !!minutesEl);
  if (minutesEl) {
    minutesEl.value = '';
    if (typeof w._pomoResetExpose === 'function') { }
  }
  let pfErr = '';
  const BeforeSeq = [];
  try {
    minutesEl.value = '';
    T.pomoFinish(); BeforeSeq.push(String(minutesEl.value));
    T.pomoFinish(); BeforeSeq.push(String(minutesEl.value));
    T.pomoFinish(); BeforeSeq.push(String(minutesEl.value));
  } catch (e) { pfErr = e.message; }
  ok('4b pomoFinish 不抛错', !pfErr);
  if (pfErr) console.log(pfErr);
  ok('4c 三个番茄累加为 75 分钟（旧版会只显示 25）', JSON.stringify(BeforeSeq) === '["25","50","75"]');

  let prErr = '';
  try { T.renderPomo(); } catch (e) { prErr = e.message; }
  ok('4d renderPomo 不抛错', !prErr);
  const pcTxt = (doc.getElementById('pomoCount') || {}).textContent || '';
  ok('4e 面板显示待记录累计', pcTxt.indexOf('待记录 75 分钟') >= 0);
  ok('4f 番茄个数也累计到 3', pcTxt.indexOf('3 个番茄') >= 0);

  // 手动改时长应以输入值为新基数
  minutesEl.value = '40';
  if (minutesEl.dispatchEvent) minutesEl.dispatchEvent(new w.Event('input'));
  T.pomoFinish();
  ok('4g 手动改过时长后在新基数上累加', String(minutesEl.value) === '65');

  // ================= 5. 物品收纳位置归类 =================
  T.state.records = [];
  T.state.settings.storageFilter = 'all';
  T.state.settings.storageLoc = '';
  T.state.records.push(mkRec('storage', todayISO, { name: '大米', category: '食品', quantity: 1, unit: '袋', location: '厨房' }));
  T.state.records.push(mkRec('storage', todayISO, { name: '食用油', category: '食品', quantity: 2, unit: '瓶', location: '厨房' }));
  T.state.records.push(mkRec('storage', todayISO, { name: '洗衣液', category: '日用', quantity: 1, unit: '瓶', location: '卫生间' }));
  T.state.records.push(mkRec('storage', todayISO, { name: '散装物', category: '其他', quantity: 3, unit: '件', location: '' }));
  let stErr = '';
  try { T.renderStorage(); } catch (e) { stErr = e.message; }
  ok('5a renderStorage 不抛错', !stErr);
  if (stErr) console.log(stErr);

  const locBar = (doc.getElementById('storageLocFilters') || {}).innerHTML || '';
  ok('5b 位置筛选条已渲染', locBar.indexOf('收纳位置') >= 0 && locBar.indexOf('厨房') >= 0);
  ok('5c 位置带物品数量', locBar.indexOf('厨房 2') >= 0 && locBar.indexOf('卫生间 1') >= 0);
  ok('5d 未标注位置单独归类', locBar.indexOf('未标注位置') >= 0);

  const ovLocs = (doc.getElementById('storageOvLocs') || {}).innerHTML || '';
  ok('5e 总览出现「按收纳位置归类」区块', ovLocs.indexOf('按收纳位置归类') >= 0);
  ok('5f 总览列出各位置与其物品', ovLocs.indexOf('厨房') >= 0 && ovLocs.indexOf('卫生间') >= 0 && ovLocs.indexOf('2 种') >= 0);

  const listAll = (doc.getElementById('storageList') || {}).innerHTML || '';
  ok('5g 未筛选时显示全部 4 件', (listAll.split('class="storage-row"').length - 1) === 4);

  T.state.settings.storageLoc = '厨房';
  T.renderStorage();
  const listK = (doc.getElementById('storageList') || {}).innerHTML || '';
  ok('5h 选中「厨房」只显示厨房物品', listK.indexOf('大米') >= 0 && listK.indexOf('食用油') >= 0 && listK.indexOf('洗衣液') < 0);

  T.state.settings.storageLoc = '__none__';
  T.renderStorage();
  const listN = (doc.getElementById('storageList') || {}).innerHTML || '';
  ok('5i 选中「未标注位置」只显示无位置物品', listN.indexOf('散装物') >= 0 && listN.indexOf('大米') < 0);

  T.state.settings.storageLoc = '';
  T.renderStorage();
  ok('5j 清空位置筛选后恢复全部', ((doc.getElementById('storageList') || {}).innerHTML || '').indexOf('大米') >= 0);

  console.log('\nRESULT: pass=' + P.pass + ' fail=' + P.fail);
  process.exit(P.fail > 0 ? 1 : 0);
})().catch(e => { console.log('FATAL', e && e.message, e && e.stack); process.exit(1); });
"""

io.open(OUT, "w", encoding="utf-8").write(head + body)
print("generated _smoke_v72.js, lines =", len((head + body).split("\n")))
