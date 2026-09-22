# -*- coding: utf-8 -*-
"""复用 _smoke_v75.js 头部，拼 v76 精简用例（纯 CSS 改动，验证渲染函数不抛错 + CSS 落盘）"""
import io

SRC = r'D:\workbuddyProjects\工作台3\_tools\_smoke_v75.js'
DST = r'D:\workbuddyProjects\工作台3\_tools\_smoke_v76.js'
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
  // v76：验证 5 处 CSS 修复已落盘 + 相关渲染函数不抛错
  // ==========================================================
  const cssText = Array.from(doc.querySelectorAll('style')).map(s => s.textContent || '').join('\n');

  // A. CSS 落盘断言
  ok('A1 .metric strong 换行保护', cssText.indexOf('.metric strong{margin-top:8px;font-size:23px;min-width:0;overflow-wrap:break-word') >= 0);
  ok('A2 .metric strong 移动端字号/换行', cssText.indexOf('.metric strong{font-size:17px;overflow-wrap:break-word;word-break:break-all') >= 0);
  ok('A3 .record-main min-width:0 + 换行', cssText.indexOf('.record-main{min-width:0}.record-main strong,.record-main small{display:block;overflow-wrap:break-word') >= 0);
  ok('A4 心情月历移动端格子高度 44px', cssText.indexOf('.mood-calendar .cal-cell{min-height:44px;border-radius:9px;gap:1px}') >= 0);
  ok('A5 闰月 checkbox 覆盖 .field input', cssText.indexOf('.cd-inline input[type=checkbox]{width:16px;height:16px') >= 0);

  // B. 相关渲染函数不抛错（喂入长金额 / 长文本数据）
  T.state.records = [];
  T.state.mediaItems = [];
  T.state.habits = [];
  const today = new Date();
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const todayS = iso(today);
  function shift(n) { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); }
  function el(id) { return doc.getElementById(id); }

  // 记账：大金额（触发 metric 换行）
  T.state.records.push(
    { id: 'm1', type: 'money', date: todayS, createdAt: Date.now(), data: { flow: 'expense', amount: 123456.78, category: '餐饮' } },
    { id: 'm2', type: 'money', date: todayS, createdAt: Date.now() + 1, data: { flow: 'income', amount: 99999.99, category: '工资' } }
  );
  let err1 = null;
  try { T._miMoney(); } catch (e) { err1 = e; }
  ok('B1 _miMoney 不抛错（大金额）', !err1);

  // 减脂身体日志：塞满全部身体指标（触发 record-main 长文本）
  T.state.records.push(
    { id: 'f1', type: 'fitness', date: todayS, createdAt: Date.now(), data: { weight: 60.5, bodyFat: 22.3, bodyFatKg: 13.5, skeletalMuscle: 24.1, bodyWater: 35.2, bmr: 1400, waistHipRatio: 0.85, bodyAge: 28, calories: 1800, duration: 45 } }
  );
  let err2 = null;
  try { T._miFitness(); } catch (e) { err2 = e; }
  ok('B2 _miFitness 不抛错（满指标）', !err2);

  // 回本明细：长名称 + 按次数
  T.state.records.push(
    { id: 'pb1', type: 'payback', date: shift(-30), createdAt: Date.now(), data: { name: '全自动意式浓缩咖啡机家用小型商用办公室', category: '家电', price: 9999.99, mode: 'count', uses: 123 } }
  );
  let err3 = null;
  try { T.renderPayback(); } catch (e) { err3 = e; }
  ok('B3 renderPayback 不抛错（长名称+按次数）', !err3);

  // 心情：多天记录（触发月历格子）
  T.state.records.push(
    { id: 'mo1', type: 'mood', date: todayS, createdAt: Date.now(), data: { score: 5, feeling: '很好', tag: '开心' } },
    { id: 'mo2', type: 'mood', date: todayS, createdAt: Date.now() + 1, data: { score: 4, feeling: '不错', tag: '平静' } },
    { id: 'mo3', type: 'mood', date: todayS, createdAt: Date.now() + 2, data: { score: 3, feeling: '一般', tag: '普通' } }
  );
  let err4 = null;
  try { T.renderMood(); } catch (e) { err4 = e; }
  ok('B4 renderMood 不抛错（同日多情绪）', !err4);

  // 倒数日：添加一条农历闰月（验证 _cdDateNote 不抛错 + 闰月标签正常）
  T.state.settings.countdowns = [
    { id: 'cd1', name: '爷爷生日', type: 'lunar', date: '0001-05-23', leap: true, repeat: true, updatedAt: Date.now() }
  ];
  let err5 = null;
  try { T.renderCountdown(); } catch (e) { err5 = e; }
  ok('B5 renderCountdown 不抛错（农历闰月）', !err5);
  const cdList = el('countdownList');
  ok('B6 倒数日列表含闰月条目', !!cdList && (cdList.innerHTML || '').indexOf('爷爷生日') >= 0);
  // 闰月日期备注应含「闰」字
  ok('B7 闰月日期备注含「闰」', !!cdList && (cdList.innerHTML || '').indexOf('闰') >= 0);

  // C. 回归：整体 renderAll 不抛错
  let errAll = null;
  try { if (T.renderAll) T.renderAll(); } catch (e) { errAll = e; }
  ok('C1 renderAll 不抛错', !errAll);
'''

tail = "\n  console.log('\\nRESULT: pass=' + P.pass + ' fail=' + P.fail" + ");\n  process.exit(P.fail > 0 ? 1 : 0);\n})().catch(e => { console.log('FATAL', e && e.message, e && e.stack); process.exit(1); });\n"

io.open(DST, 'w', encoding='utf-8').write(head + body + tail)
print('generated', DST, len(head + body + tail))
