# -*- coding: utf-8 -*-
"""复用 _smoke_v74.js 的头部（到 `const T = w.__appTest;` 行），拼 v75 用例"""
import io

SRC = r'D:\workbuddyProjects\工作台3\_tools\_smoke_v74.js'
DST = r'D:\workbuddyProjects\工作台3\_tools\_smoke_v75.js'
L = io.open(SRC, encoding='utf-8').read().split('\n')
cut = None
for i, l in enumerate(L):
    if 'const T = w.__appTest' in l:
        cut = i + 1
        break
assert cut, 'anchor not found'
head = '\n'.join(L[:cut])

body = r'''
  // ==========================================================
  // A. 移动端导航必须能看到「倒数日」
  // ==========================================================
  const mn = doc.querySelector('.mobile-nav');
  ok('A1 移动端导航存在', !!mn);
  const mnNavs = Array.from(mn ? mn.querySelectorAll('[data-nav]') : []).map(b => b.getAttribute('data-nav'));
  ok('A2 移动端导航 16 个模块', mnNavs.length === 16);
  ok('A3 移动端导航含 countdown', mnNavs.indexOf('countdown') >= 0);
  const cdBtn = mn ? mn.querySelector('[data-nav="countdown"]') : null;
  ok('A4 倒数日按钮有图标与文字', !!cdBtn && !!cdBtn.querySelector('use') && (cdBtn.textContent || '').indexOf('倒数') >= 0);
  ok('A5 图标引用 i-countdown 且图标已定义',
    !!cdBtn && (cdBtn.querySelector('use').getAttribute('href') || '') === '#i-countdown'
    && !!doc.getElementById('i-countdown'));
  // 点它要能切到倒数日视图
  cdBtn.dispatchEvent(new w.Event('click', { bubbles: true }));
  ok('A6 点击后切到 countdown 视图', T.state.settings.view === 'countdown' || T.state.view === 'countdown' || (doc.getElementById('view-countdown') && doc.getElementById('view-countdown').className.indexOf('active') >= 0));

  // ==========================================================
  // B. P1 三档层级：每个模块一个主数字 + 一句结论
  // ==========================================================
  // 清掉应用播种的示例数据，避免污染统计
  T.state.records = [];
  T.state.mediaItems = [];
  T.state.habits = [];

  const today = new Date();
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const todayS = iso(today);
  const monthS = todayS.slice(0, 7);
  function shift(n) { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); }

  function el(id) { return doc.getElementById(id); }
  function miHtml(name) { const e = el('mi' + name); return e ? e.innerHTML : ''; }
  function miText(name) { const e = el('mi' + name); return e ? (e.textContent || '') : ''; }

  // ---- 数据全部为空时，十个 insight 都应隐藏 ----
  T.renderModuleInsights();
  const NAMES = ['Money', 'Habits', 'Fitness', 'Sleep', 'Study', 'Planner', 'Home', 'Diet', 'Storage', 'Payback'];
  ok('B1 空数据时十个 insight 全部隐藏', NAMES.every(n => { const e = el('mi' + n); return e && e.hidden; }));

  // ---- 记账：本月支出 + 比上月 ----
  T.state.records.push(
    { id: 'm1', type: 'money', date: todayS, createdAt: Date.now(), data: { flow: 'expense', amount: 300, category: '餐饮' } },
    { id: 'm2', type: 'money', date: todayS, createdAt: Date.now() + 1, data: { flow: 'expense', amount: 200, category: '交通' } }
  );
  T.renderModuleInsights();
  ok('B2 记账主数字 = 本月支出', miText('Money').indexOf('500') >= 0);
  ok('B3 记账 eyebrow 是「本月支出」', miHtml('Money').indexOf('本月支出') >= 0);
  ok('B4 记账有结论句', miHtml('Money').indexOf('mi-note') >= 0);
  ok('B5 记账 insight 已显示', el('miMoney').hidden === false);
  ok('B6 主数字用 <b> 包裹（最大字号）', /<b>[\s\S]*?<\/b>/.test(miHtml('Money')));

  // ---- 习惯 ----
  T.state.habits = [
    { name: '喝水', target: 1, entries: {} },
    { name: '读书', target: 1, entries: {} }
  ];
  T.state.habits[0].entries[todayS] = 1;
  T.renderModuleInsights();
  ok('B7 习惯主数字 = 完成/总数', miText('Habits').indexOf('1 / 2') >= 0);
  ok('B8 习惯 eyebrow 是「今日打卡」', miHtml('Habits').indexOf('今日打卡') >= 0);

  // ---- 减脂 ----
  T.state.records.push(
    { id: 'f1', type: 'fitness', date: todayS, createdAt: Date.now(), data: { weight: 60 } },
    { id: 'f2', type: 'fitness', date: shift(-7), createdAt: Date.now() - 1, data: { weight: 62 } }
  );
  T.renderModuleInsights();
  ok('B9 减脂主数字 = 当前体重', miText('Fitness').indexOf('60.0') >= 0);
  ok('B10 减脂结论含「比上次轻」', miText('Fitness').indexOf('比上次轻') >= 0);

  // ---- 日程 ----
  T.state.records.push(
    { id: 'p1', type: 'planner', date: todayS, createdAt: Date.now(), data: { title: '交房租', done: false } },
    { id: 'p2', type: 'planner', date: shift(5), createdAt: Date.now() + 1, data: { title: '取快递', done: false } },
    { id: 'p3', type: 'planner', date: shift(-2), createdAt: Date.now() + 2, data: { title: '买菜', done: true } }
  );
  T.renderModuleInsights();
  ok('B11 日程主数字 = 未完成件数', miText('Planner').indexOf('2 件') >= 0);
  ok('B12 日程结论提到今天该做', miText('Planner').indexOf('今天该做') >= 0);

  // ---- 待买 ----
  T.state.records.push(
    { id: 'h1', type: 'home', date: todayS, createdAt: Date.now(), data: { name: '洗衣液', price: 30, bought: false } },
    { id: 'h2', type: 'home', date: todayS, createdAt: Date.now() + 1, data: { name: '燕麦奶', price: 18, bought: true, boughtDate: todayS } }
  );
  T.renderModuleInsights();
  ok('B13 待买主数字 = 未买件数', miText('Home').indexOf('1 件') >= 0);
  ok('B14 待买结论含本月已买', miText('Home').indexOf('本月已买 1 件') >= 0);

  // ---- 学习 ----
  T.state.records.push(
    { id: 's1', type: 'study', date: todayS, createdAt: Date.now(), data: { subject: '高数', minutes: 50, category: '练习' } }
  );
  T.renderModuleInsights();
  ok('B15 学习主数字 = 近 7 天时长', miText('Study').indexOf('50 分钟') >= 0);
  ok('B16 学习结论提到今天', miText('Study').indexOf('今天 50 分钟') >= 0);

  // ---- 饮食 ----
  T.state.records.push(
    { id: 'd1', type: 'diet', date: todayS, createdAt: Date.now(), data: { food: '米饭', meal: '午餐', calories: 600 } },
    { id: 'd2', type: 'diet', date: todayS, createdAt: Date.now() + 1, data: { food: '牛奶', meal: '早餐', calories: 200 } }
  );
  T.renderModuleInsights();
  ok('B17 饮食主数字 = 今日 kcal', miText('Diet').indexOf('800') >= 0);
  ok('B18 饮食结论含餐数', miText('Diet').indexOf('2 餐') >= 0);

  // ---- 物品 ----
  T.state.records.push(
    { id: 'st1', type: 'storage', date: todayS, createdAt: Date.now(), data: { name: '大米', category: '食品', quantity: 3, location: '厨房' } },
    { id: 'st2', type: 'storage', date: todayS, createdAt: Date.now() + 1, data: { name: '纸巾', category: '日用', quantity: 12, location: '储物间' } }
  );
  T.renderModuleInsights();
  ok('B19 物品主数字 = 种类数', miText('Storage').indexOf('2 种') >= 0);
  ok('B20 物品结论含件数与位置', miText('Storage').indexOf('15 件在库') >= 0 && miText('Storage').indexOf('2 个位置') >= 0);

  // ---- 回本 ----
  T.state.records.push(
    { id: 'pb1', type: 'payback', date: todayS, createdAt: Date.now(), data: { name: '跑步机', category: '运动', price: 2000, mode: 'time' } }
  );
  T.renderModuleInsights();
  ok('B21 回本主数字 = 总投入', miText('Payback').indexOf('2,000') >= 0 || miText('Payback').indexOf('2000') >= 0);
  ok('B22 回本结论含件数', miText('Payback').indexOf('1 件在用') >= 0);

  // ==========================================================
  // C. 结构：三档字号层级真的存在（CSS 变量层）
  // ==========================================================
  const cssText = Array.from(doc.querySelectorAll('style')).map(s => s.textContent || '').join('\n');
  ok('C1 样式表含 .mi-main b（主数字）', cssText.indexOf('.mi-main b{') >= 0);
  ok('C2 样式表含 .mi-note（一句结论）', cssText.indexOf('.mi-note{') >= 0);
  ok('C3 样式表含 .mi-eyebrow（小标签）', cssText.indexOf('.mi-eyebrow{') >= 0);
  ok('C4 全局等宽数字已开启', cssText.indexOf('font-variant-numeric:tabular-nums') >= 0);
  ok('C5 主数字字号大于结论句字号', (function () {
    const a = cssText.match(/\.mi-main b\{[^}]*font:700 (\d+)px/);
    const b = cssText.match(/\.mi-note\{[^}]*font-size:(\d+(?:\.\d+)?)px/);
    return a && b && Number(a[1]) > Number(b[1]) * 1.5;
  })());
  ok('C6 空状态副提示样式存在', cssText.indexOf('.empty-hint{') >= 0);

  // ==========================================================
  // D. empty() 向后兼容 + 新增副提示
  // ==========================================================
  const e1 = T.empty('这里还没有物品');
  ok('D1 empty 单参数仍可用', e1.indexOf('empty-state') >= 0 && e1.indexOf('这里还没有物品') >= 0);
  ok('D2 empty 单参数不带副提示', e1.indexOf('empty-hint') < 0);
  const e2 = T.empty('这里还没有物品', '添加第一件后，这里会出现它的位置');
  ok('D3 empty 双参数带副提示', e2.indexOf('empty-hint') >= 0 && e2.indexOf('添加第一件后') >= 0);

  // ==========================================================
  // E. 回归：renderAll 不因为 insight 报错，且十个容器都被填过
  // ==========================================================
  let thrown = null;
  try { T.renderModuleInsights(); } catch (e) { thrown = e; }
  ok('E1 renderModuleInsights 不抛错', !thrown);
  ok('E2 有数据的模块已显示', el('miMoney').hidden === false && el('miPlanner').hidden === false);
  ok('E3 无数据的模块保持隐藏', el('miSleep').hidden === true);
'''

tail = "\n  console.log('\\nRESULT: pass=' + P.pass + ' fail=' + P.fail" + ");\n  process.exit(P.fail > 0 ? 1 : 0);\n})().catch(e => { console.log('FATAL', e && e.message, e && e.stack); process.exit(1); });\n"

io.open(DST, 'w', encoding='utf-8').write(head + body + tail)
print('generated', DST, len(head + body + tail))
