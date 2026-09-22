# -*- coding: utf-8 -*-
"""复用 _smoke_v75.js 头部，拼 v77 用例（四处错乱修复：月历第7列 / 物品明细 / 消费圆环字号 / 身体记录行距）"""
import io

SRC = r'D:\workbuddyProjects\工作台3\_tools\_smoke_v75.js'
DST = r'D:\workbuddyProjects\工作台3\_tools\_smoke_v77.js'
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
  // v77：四处错乱修复（心情月历第7列 / 物品明细 / 消费结构圆环字号 / 身体记录）
  // ==========================================================
  const cssText = Array.from(doc.querySelectorAll('style')).map(s => s.textContent || '').join('\n');
  function el(id) { return doc.getElementById(id); }

  // A. CSS 落盘断言
  ok('A1 月历 7 列改 minmax(0,1fr) 防溢出', cssText.indexOf('.mood-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))') >= 0);
  ok('A2 月历旧 repeat(7,1fr) 已移除', cssText.indexOf('.mood-calendar{display:grid;grid-template-columns:repeat(7,1fr)') < 0);
  ok('A3 移动端月历格子 min-height 38px', cssText.indexOf('.mood-calendar .cal-cell{min-height:38px;border-radius:9px;gap:1px}') >= 0);
  ok('A4 回本 amount 移到第二行', cssText.indexOf('#paybackList .record-amount{grid-column:2;grid-row:2;justify-self:start') >= 0);
  ok('A5 回本 3 列网格', cssText.indexOf('#paybackList .record-row{grid-template-columns:38px minmax(0,1fr) 30px') >= 0);
  ok('A6 身体日志行距 1.6', cssText.indexOf('#fitnessList .record-main small{max-width:100%;line-height:1.6;margin-top:3px}') >= 0);
  ok('A7 指标 nb 不拆词', cssText.indexOf('.record-main small .nb{white-space:nowrap}') >= 0);

  // B. 渲染验证（示例数据会混进统计，先清空）
  T.state.records = [];
  T.state.mediaItems = [];
  T.state.habits = [];
  T.state.shoppingItems = T.state.shoppingItems || [];
  const today = new Date();
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const todayS = iso(today);
  function shift(n) { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); }

  // 记账：大金额 → 圆环中心数字需自适应缩小
  T.state.records.push(
    { id: 'm1', type: 'money', date: todayS, createdAt: Date.now(), data: { flow: 'expense', amount: 22937.91, category: '其他' } },
    { id: 'm2', type: 'money', date: todayS, createdAt: Date.now() + 1, data: { flow: 'expense', amount: 1000, category: '吃饭' } }
  );
  // 减脂：塞满全部身体指标 → 触发超长详情文本
  T.state.records.push(
    { id: 'f1', type: 'fitness', date: todayS, createdAt: Date.now(), data: { weight: 54.9, bodyFat: 27.8, bodyFatKg: 15.3, skeletalMuscle: 21.6, bodyWater: 28.9, bmr: 1225, waistHipRatio: 0.84, bodyAge: 31 } }
  );
  // 回本：长名称按时间
  T.state.records.push(
    { id: 'pb1', type: 'payback', date: shift(-300), createdAt: Date.now(), data: { name: '华为Mate60Pro', category: '数码', price: 7995.17, mode: 'time' } }
  );
  // 心情：当月多天
  ['02','05','09','16','22'].forEach(function(dd, i) {
    T.state.records.push({ id: 'mo' + i, type: 'mood', date: todayS.slice(0, 8) + dd, createdAt: Date.now() + i, data: { score: 4, feeling: '不错', tag: '平静' } });
  });

  let errAll = null;
  try { T.renderAll(); } catch (e) { errAll = e; console.log('renderAll ERR:', e && e.message); }
  ok('B1 renderAll 不抛错', !errAll);

  // 用导出的渲染函数重新渲染（renderAll 用 _safeRender 吞错，需直接调才看得见异常）
  let eM = null; try { T.renderMoney(); } catch (e) { eM = e; console.log('renderMoney ERR:', e && e.message); }
  ok('B1b renderMoney 不抛错（长金额）', !eM);
  let eF = null; try { T.renderFitness(); } catch (e) { eF = e; console.log('renderFitness ERR:', e && e.message); }
  ok('B1c renderFitness 不抛错（满指标）', !eF);
  let ePb = null; try { T.renderPayback(); } catch (e) { ePb = e; console.log('renderPayback ERR:', e && e.message); }
  ok('B1d renderPayback 不抛错（长名称）', !ePb);

  const fl = el('fitnessList');
  ok('B2 身体记录指标用 nb span 包裹（不拆词）', !!fl && (fl.innerHTML || '').indexOf('class="nb"') >= 0);
  ok('B3 身体记录含「体脂肪」完整词', !!fl && (fl.innerHTML || '').indexOf('体脂肪') >= 0);

  const pie = el('moneyPie');
  const pieHtml = pie ? (pie.innerHTML || '') : '';
  ok('B4 消费结构圆环中心数字已渲染', pieHtml.indexOf('本月支出') >= 0);
  ok('B5 长金额不再用固定 20px（自适应缩小）', pieHtml.indexOf('font-size="20"') < 0);
  const fsMatch = pieHtml.match(/font-size="(\d+)"/g) || [];
  ok('B6 圆环第二处字号为自适应值（<=19）', fsMatch.length >= 2 && Number((fsMatch[1].match(/\d+/) || [0])[0]) <= 19);

  const ml = el('paybackList');
  ok('B7 物品明细渲染成功', !!ml && (ml.innerHTML || '').indexOf('华为Mate60Pro') >= 0);

  const mc = el('moodCalendar');
  const wk = mc ? mc.querySelectorAll('.cal-weekday').length : 0;
  ok('B8 心情月历渲染 7 列表头', wk === 7);
'''

tail = "\n  console.log('\\nRESULT: pass=' + P.pass + ' fail=' + P.fail" + ");\n  process.exit(P.fail > 0 ? 1 : 0);\n})().catch(e => { console.log('FATAL', e && e.message, e && e.stack); process.exit(1); });\n"

io.open(DST, 'w', encoding='utf-8').write(head + body + tail)
print('generated', DST, len(head + body + tail))
