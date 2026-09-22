# -*- coding: utf-8 -*-
"""v72-A：日程优先级排序 / 减脂周计划归档 / 经期天数统计 / 番茄钟累计"""
import io, sys, re

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(P, encoding="utf-8").read()
orig_len = len(s)

def rep(tag, old, new, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        print("FAIL[%s] expected %d got %d" % (tag, cnt, n))
        sys.exit(1)
    s = s.replace(old, new, cnt)
    print("OK  [%s]" % tag)

# ---------- 1. 优先级排序工具函数 ----------
OLD = """  function renderPlanner(){
    const records=sortedRecords('planner'),today=isoDate(),weekEnd=shiftDate(6),filter=state.settings.plannerFilter;"""
NEW = """  /* v72：日程优先级排序。high(高) > normal(普通) > low(低)；同级内「未完成」在前，
   * 再同级则保留 createdAt 顺序 —— 因此原有的手动拖拽排序在同一优先级内依然有效。 */
  function plannerPrioRank(p){ return p==='high'?0:(p==='low'?2:1); }
  function sortPlannerByPriority(arr){
    return (arr||[]).slice().sort(function(a,b){
      var ra=plannerPrioRank(a&&a.data&&a.data.priority), rb=plannerPrioRank(b&&b.data&&b.data.priority);
      if(ra!==rb) return ra-rb;
      var da=(a&&a.data&&a.data.done)?1:0, db=(b&&b.data&&b.data.done)?1:0;
      if(da!==db) return da-db;
      return (a.createdAt||0)-(b.createdAt||0);
    });
  }
  function renderPlanner(){
    const records=sortedRecords('planner'),today=isoDate(),weekEnd=shiftDate(6),filter=state.settings.plannerFilter;"""
rep("1a 优先级排序工具函数", OLD, NEW)

# ---------- 1b. 四象限内按优先级排序 ----------
OLD = "const items=all.filter(r=>!r.data.done && (r.data.quadrant===name || (!r.data.quadrant&&cid===1))).slice(0,8);"
NEW = "const items=sortPlannerByPriority(all.filter(r=>!r.data.done && (r.data.quadrant===name || (!r.data.quadrant&&cid===1)))).slice(0,8);"
rep("1b 四象限按优先级排序", OLD, NEW)

# ---------- 1c. 清单每天内按优先级排序 ----------
OLD = '<div class="group-body planner-drop">${items.map(r=>`<div class="task-drag" data-date="${date}" data-id="${r.id}">${taskRow(r,true)}</div>`).join(\'\')}</div>'
NEW = '<div class="group-body planner-drop">${sortPlannerByPriority(items).map(r=>`<div class="task-drag" data-date="${date}" data-id="${r.id}">${taskRow(r,true)}</div>`).join(\'\')}</div>'
rep("1c 清单按优先级排序", OLD, NEW)

# ---------- 2. 减脂周计划：忽略「旧一周」的远端残留，否则永远清不掉 ----------
OLD = """          if (Array.isArray(s.weeklyPlan)) { state.settings.weeklyPlan = mergePlanList(state.settings.weeklyPlan, s.weeklyPlan); changed = true; }"""
NEW = """          if (Array.isArray(s.weeklyPlan)) {
            /* v72：远端快照若属于「更早的一周」，说明对端还没做周归档，直接忽略。
             * 旧逻辑无条件下 union，会把上一周的计划重新合并回来 → 新的一周看起来永远没清空。 */
            var _rw = (typeof s.weeklyPlanWeekStart === 'string' && s.weeklyPlanWeekStart) ? s.weeklyPlanWeekStart : '';
            var _lw = state.settings.weeklyPlanWeekStart || isoWeekStart();
            if (!_rw || _rw >= _lw) {
              if (_rw > _lw) state.settings.weeklyPlanWeekStart = _rw;
              state.settings.weeklyPlan = mergePlanList(state.settings.weeklyPlan, s.weeklyPlan);
            }
            changed = true;
          }"""
rep("2 周计划归档周次校验", OLD, NEW)

# ---------- 3. renderAll 前兜底跑一次周归档（跨周后无需刷新页面） ----------
m = list(re.finditer(r"function renderAll\(\)\{", s))
if len(m) != 1:
    print("FAIL[3] renderAll anchors: %d" % len(m)); sys.exit(1)
i = m[0].end()
s = s[:i] + "try{ rolloverWeeklyPlan(); }catch(e){}\n" + s[i:]
print("OK  [3 renderAll 周归档兜底]")

# ---------- 4. 经期天数：改成以「首末跨度」为准 ----------
OLD = "      var rawLen = periodDayCount>0 ? periodDayCount : (spanDays>=2 && spanDays<=15 ? spanDays : 0);"
NEW = """      /* v72：用户习惯只标「首日 + 末日」，中间日子没有逐日记录，
       * 旧逻辑以 periodDayCount（有记录的天数）优先 → 这种周期恒为 2 天，均值就永远显示 2 天。
       * 改为：有末日标记时以「首末跨度」为准；跨度不合理时才退回逐日打卡计数。 */
      var rawLen;
      if(lastEndDay && spanDays>=1 && spanDays<=15) rawLen = spanDays;
      else if(spanDays>=2 && spanDays<=15) rawLen = spanDays;
      else rawLen = (periodDayCount>0 && periodDayCount<=15) ? periodDayCount : 0;"""
rep("4 经期天数改用首末跨度", OLD, NEW)

# ---------- 5. 番茄钟累计 ----------
OLD = """  function pomoFinish(){
    var f = document.getElementById('studyForm');
    if(f && f.elements.minutes) f.elements.minutes.value = String(_pomo.len);"""
NEW = """  function pomoFinish(){
    var f = document.getElementById('studyForm');
    /* v72：连着完成多个番茄要累加，而不是覆盖上一个的时长。
     * _pomo.pending 记录「本轮累计、尚未提交」的分钟数；表单被提交或用户手改后置零。 */
    if(f && f.elements.minutes){
      var _cur = Number(f.elements.minutes.value)||0;
      var _base = (Number(_pomo.pending)||0) > 0 ? Number(_pomo.pending) : _cur;
      _pomo.pending = _base + _pomo.len;
      f.elements.minutes.value = String(_pomo.pending);
    }"""
rep("5a 番茄时长累加", OLD, NEW)

OLD = """    if(addRecord('study',date,{subject:subject,category:category,minutes:minutes,note:note})){ e.currentTarget.reset(); var _sd=e.currentTarget.elements.date; if(_sd)_sd.value=isoDate(); renderStudy(); }"""
NEW = """    if(addRecord('study',date,{subject:subject,category:category,minutes:minutes,note:note})){ try{ if(typeof _pomo!=='undefined'){ _pomo.pending=0; _pomo.left=_pomo.len*60000; renderPomo(); } }catch(pe){} e.currentTarget.reset(); var _sd=e.currentTarget.elements.date; if(_sd)_sd.value=isoDate(); renderStudy(); }"""
rep("5b 提交学习记录后清零累计", OLD, NEW)

# ---------- 6. 学习时长手动输入时同步 pending，避免累加基数错乱 ----------
OLD = """  function bindPomodoro(){
    var s = document.getElementById('pomoStart'); if(s) s.addEventListener('click', pomoToggle);"""
NEW = """  function bindPomodoro(){
    var _mf = document.getElementById('studyForm');
    if(_mf && _mf.elements.minutes && !_mf.elements.minutes._pomoBound){
      _mf.elements.minutes._pomoBound = true;
      _mf.elements.minutes.addEventListener('input', function(){
        _pomo.pending = Number(this.value)||0;   /* 用户手改过则以输入值为新基数 */
        renderPomo();
      });
    }
    var s = document.getElementById('pomoStart'); if(s) s.addEventListener('click', pomoToggle);"""
rep("6 手动改时长同步基数", OLD, NEW)

# ---------- 7. 面板显示「待记录累计」 ----------
OLD = """    var pc = document.getElementById('pomoCount'), td = _pomoToday();
    if(pc) pc.textContent = td.n ? ('今天已完成 '+td.n+' 个番茄 · 专注 '+td.min+' 分钟') : '';"""
NEW = """    var pc = document.getElementById('pomoCount'), td = _pomoToday();
    if(pc){
      var _pend = Number(_pomo.pending)||0;
      pc.textContent = td.n
        ? ('今天已完成 '+td.n+' 个番茄 · 专注 '+td.min+' 分钟' + (_pend ? (' · 待记录 '+_pend+' 分钟') : ''))
        : (_pend ? ('待记录 '+_pend+' 分钟') : '');
    }"""
rep("7 面板显示待记录累计", OLD, NEW)

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("written: %d -> %d" % (orig_len, len(s)))
