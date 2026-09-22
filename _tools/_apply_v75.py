# -*- coding: utf-8 -*-
"""v75：① 移动端导航补上倒数日 ② P1 三档视觉层级（每个模块顶部一个主数字 + 一句结论）"""
import io, sys

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig_len = len(s)

def rep(tag, old, new, cnt=1):
    global s
    n = s.count(old)
    assert n == cnt, '%s 锚点命中 %d 次（期望 %d）：%r' % (tag, n, cnt, old[:90])
    s = s.replace(old, new, cnt)
    print('OK  %s' % tag)

# ============================================================
# 1. 移动端导航补「倒数日」（mobile-nav 是独立的一份列表，v73 只加了侧栏）
# ============================================================
OLD_NAV = '  <button class="nav-item" data-nav="payback"><svg><use href="#i-payback"/></svg><span>回本</span></button>\n'
NEW_NAV = (OLD_NAV
           + '  <button class="nav-item" data-nav="countdown"><svg><use href="#i-countdown"/></svg><span>倒数</span></button>\n')
rep('1 移动端导航补倒数日', OLD_NAV, NEW_NAV)

# ============================================================
# 2. CSS：三档视觉层级 + 全局等宽数字 + 空状态副提示
# ============================================================
CSS = '''
/* ============ v75 P1：三档视觉层级（主数字 / 一句结论 / 细节） ============ */
body{font-variant-numeric:tabular-nums}
.mod-insight{margin:0 0 16px;padding:0 0 14px;border-bottom:1px solid var(--line)}
.mod-insight[hidden]{display:none}
.mi-eyebrow{margin:0 0 3px;font-size:11px;font-weight:750;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.mi-main{display:flex;align-items:baseline;gap:6px}
.mi-main b{margin:0;font:700 30px/1.1 "Songti SC",serif;letter-spacing:-.01em;color:var(--ink)}
.mi-unit{font-size:12px;font-weight:400;color:var(--muted)}
.mi-note{margin:7px 0 0;font-size:13px;line-height:1.5;color:#5d6267}
.empty-hint{display:block;margin-top:5px;font-size:11px;line-height:1.5;color:#9aa0a6}
@media(max-width:560px){
  .mod-insight{margin:0 0 12px;padding:0 0 11px}
  .mi-main b{font-size:26px}
  .mi-note{font-size:12.5px}
}
/* v75：倒数日样式务必留在主样式表内 */
'''
i_style = s.find('<style')
assert i_style > 0
i_end = s.find('</style>', i_style)
assert i_end > i_style, '主样式表未找到闭合标签'
s = s[:i_end] + CSS + s[i_end:]
print('OK  2 追加 P1 样式（主样式表末尾，位置 %d）' % i_end)

# ============================================================
# 3. 十个模块页顶插入 insight 容器
# ============================================================
VIEWS = ['money', 'habits', 'fitness', 'sleep', 'study',
         'planner', 'home', 'diet', 'storage', 'payback']
CAP = {'money': 'Money', 'habits': 'Habits', 'fitness': 'Fitness', 'sleep': 'Sleep',
       'study': 'Study', 'planner': 'Planner', 'home': 'Home', 'diet': 'Diet',
       'storage': 'Storage', 'payback': 'Payback'}
for v in VIEWS:
    anchor = 'id="view-%s">' % v
    assert s.count(anchor) == 1, 'view 锚点异常: %s (%d)' % (v, s.count(anchor))
    s = s.replace(anchor, anchor + '\n<div class="mod-insight" id="mi%s" hidden></div>' % CAP[v], 1)
print('OK  3 插入 %d 个 insight 容器' % len(VIEWS))

# ============================================================
# 4. JS：renderModuleInsights + 在 renderAll 里调用
# ============================================================
JS = r'''
  /* ===== v75 P1：每个模块顶部只留一个主数字 + 一句人话结论 ===== */
  function _miSet(view, eyebrow, main, unit, note){
    var el = document.getElementById('mi' + view);
    if(!el) return;
    if(!main && main !== 0){ el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = '<p class="mi-eyebrow">' + escapeHtml(eyebrow) + '</p>'
      + '<div class="mi-main"><b>' + escapeHtml(String(main)) + '</b>'
      + (unit ? '<span class="mi-unit">' + escapeHtml(unit) + '</span>' : '') + '</div>'
      + (note ? '<p class="mi-note">' + escapeHtml(note) + '</p>' : '');
  }
  function _miFmtMin(m){
    m = Math.round(Number(m) || 0);
    if(m <= 0) return '0 分钟';
    var h = Math.floor(m / 60), mi = m % 60;
    return h ? (mi ? h + ' 小时 ' + mi + ' 分' : h + ' 小时') : (mi + ' 分钟');
  }
  function _miMoney(){
    var recs = sortedRecords('money');
    if(!recs.length){ _miSet('Money', '', ''); return; }
    var month = isoDate().slice(0, 7), prev = previousMonthKey();
    var exp = sum(recs.filter(function(r){ return r.date.indexOf(month) === 0 && r.data.flow === 'expense'; }), function(r){ return r.data.amount; });
    var pExp = sum(recs.filter(function(r){ return r.date.indexOf(prev) === 0 && r.data.flow === 'expense'; }), function(r){ return r.data.amount; });
    var note = pExp ? ('比上月' + (exp >= pExp ? '多' : '少') + '花了 ' + money(Math.abs(exp - pExp))) : '记满一个月，这里会出现对比';
    _miSet('Money', '本月支出', money(exp), '', note);
  }
  function _miHabits(){
    var list = state.habits || [];
    if(!list.length){ _miSet('Habits', '', ''); return; }
    var done = list.filter(function(h){ return habitDone(h); }).length;
    var best = 0;
    list.forEach(function(h){ var b = Number(habitBestStreak(h)) || 0; if(b > best) best = b; });
    _miSet('Habits', '今日打卡', done + ' / ' + list.length, '',
      best ? ('最长连续 ' + best + ' 天') : '今天完成一点，就算前进');
  }
  function _miFitness(){
    var all = sortedRecords('fitness').filter(function(r){ return r.data.weight; });
    if(!all.length){ _miSet('Fitness', '', ''); return; }
    var cur = Number(all[0].data.weight), note = '';
    if(all[1]){
      var d = cur - Number(all[1].data.weight);
      note = '比上次' + (d <= 0 ? '轻' : '重') + ' ' + Math.abs(d).toFixed(1) + ' kg';
    } else note = '再记一次，这里就能看出变化';
    _miSet('Fitness', '当前体重', cur.toFixed(1), 'kg', note);
  }
  function _miSleep(){
    var all = sortedRecords('sleep');
    if(!all.length){ _miSet('Sleep', '', ''); return; }
    var m = _sleepMetrics(all[0]), recent = all.slice(0, 7);
    var avg = recent.reduce(function(a, r){ return a + _sleepMetrics(r).asleep; }, 0) / (recent.length || 1);
    var d = m.asleep - avg;
    var note = recent.length > 1 ? ('比近 ' + recent.length + ' 天平均' + (d >= 0 ? '多' : '少') + '睡 ' + _fmtMin(Math.abs(d))) : '多记几天，这里会给出对比';
    _miSet('Sleep', '昨晚睡了', _fmtMin(m.asleep), '', note);
  }
  function _miStudy(){
    var all = sortedRecords('study');
    if(!all.length){ _miSet('Study', '', ''); return; }
    var today = isoDate(), from = shiftDate(-6);
    function mm(rs){ return rs.reduce(function(a, r){ return a + Number((r.data || {}).minutes || 0); }, 0); }
    var week = mm(all.filter(function(r){ return r.date >= from && r.date <= today; }));
    var td = mm(all.filter(function(r){ return r.date === today; }));
    var pomo = (state.settings.pomoDays || {})['pomo:' + today];
    var note = '今天 ' + (td ? td + ' 分钟' : '还没开始') + (pomo && pomo.n ? (' · 已完成 ' + pomo.n + ' 个番茄') : '');
    _miSet('Study', '近 7 天学习', _miFmtMin(week), '', note);
  }
  function _miPlanner(){
    var all = sortedRecords('planner');
    if(!all.length){ _miSet('Planner', '', ''); return; }
    var today = isoDate();
    var pending = all.filter(function(r){ return !r.data.done; });
    var urgent = pending.filter(function(r){ return r.date <= today; });
    _miSet('Planner', '待办未完成', pending.length + ' 件', '',
      urgent.length ? ('其中 ' + urgent.length + ' 件今天该做了') : '没有逾期的事，节奏不错');
  }
  function _miHome(){
    var all = sortedRecords('home');
    if(!all.length){ _miSet('Home', '', ''); return; }
    var month = isoDate().slice(0, 7);
    var pending = all.filter(function(r){ return !r.data.bought; });
    var bought = all.filter(function(r){ return r.data.bought && String(r.data.boughtDate || r.date).indexOf(month) === 0; });
    _miSet('Home', '待买清单', pending.length + ' 件', '',
      bought.length ? ('本月已买 ' + bought.length + ' 件') : '买到的东西会记在这里');
  }
  function _miDiet(){
    var all = sortedRecords('diet', true), today = isoDate();
    var t = all.filter(function(r){ return r.date === today; });
    if(!t.length){ _miSet('Diet', '', ''); return; }
    var cal = sum(t, function(r){ return r.data.calories; });
    _miSet('Diet', '今日摄入', String(cal), 'kcal', '已经记下 ' + t.length + ' 餐');
  }
  function _miStorage(){
    var all = sortedRecords('storage');
    if(!all.length){ _miSet('Storage', '', ''); return; }
    var qty = all.reduce(function(a, r){ return a + (Number(r.data.quantity) || 0); }, 0), locs = {};
    all.forEach(function(r){ var k = String(r.data.location || '').trim(); if(k) locs[k] = 1; });
    var note = qty + ' 件在库' + (Object.keys(locs).length ? (' · 放在 ' + Object.keys(locs).length + ' 个位置') : '');
    _miSet('Storage', '库存', all.length + ' 种', '', note);
  }
  function _miPayback(){
    var all = sortedRecords('payback');
    if(!all.length){ _miSet('Payback', '', ''); return; }
    var total = all.reduce(function(a, r){ return a + (Number(r.data.price) || 0); }, 0);
    _miSet('Payback', '大件投入', money(total), '', all.length + ' 件在用，越用越回本');
  }
  function renderModuleInsights(){
    var fns = [_miMoney, _miHabits, _miFitness, _miSleep, _miStudy,
               _miPlanner, _miHome, _miDiet, _miStorage, _miPayback];
    fns.forEach(function(fn){ try{ fn(); }catch(e){ } });
  }
'''

OLD_RENDER_ALL = "  function renderAll(){try{ rolloverWeeklyPlan(); }catch(e){}\n"
NEW_RENDER_ALL = JS + "\n" + "  function renderAll(){try{ rolloverWeeklyPlan(); }catch(e){}\n    try{ renderModuleInsights(); }catch(e){}\n"
rep('4 renderModuleInsights + 调用', OLD_RENDER_ALL, NEW_RENDER_ALL)

# ============================================================
# 5. empty() 支持第二行人话提示（向后兼容，不改任何调用点）
# ============================================================
OLD_EMPTY = "function empty(message){return`<div class=\"empty-state\">${localizedHtml(message)}</div>`;}"
NEW_EMPTY = ("function empty(message,hint){return`<div class=\"empty-state\">${localizedHtml(message)}"
             "${hint?`<span class=\"empty-hint\">${localizedHtml(hint)}</span>`:''}</div>`;}")
rep('5 empty 支持副提示', OLD_EMPTY, NEW_EMPTY)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('\nDONE  %d -> %d (+%d)' % (orig_len, len(s), len(s) - orig_len))
