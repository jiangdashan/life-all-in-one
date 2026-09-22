#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v69-A：
1) 移动端「使用频率」回显物品名称（窄屏下 .freq-num 把名称列压没了 → 移动端改两行布局 + 空名兜底）
2) 学习模块番茄时钟（面板 + 计时 + 结束把时长填入学习表单）
5) 重复日程不再自动塞进四象限（自动生成默认关），改为在重复日程清单置顶回显
"""
import io, sys

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
src = io.open(PATH, "r", encoding="utf-8").read()
orig_len = len(src)
fails = []

def rep(old, new, tag, count=1):
    global src
    n = src.count(old)
    if n != count:
        fails.append((tag, "anchor count=%d expect=%d" % (n, count)))
        return
    src = src.replace(old, new, count)
    print("OK  " + tag)

# ---------- 1a. CSS：移动端使用频率两行布局 ----------
rep(
".freq-num b{display:block;font-size:13px;color:var(--ink)}",
".freq-num b{display:block;font-size:13px;color:var(--ink)}"
"@media(max-width:560px){.freq-row{grid-template-columns:22px minmax(0,1fr);row-gap:5px}.freq-name{min-width:0}.freq-num{grid-column:1 / -1;text-align:left;white-space:normal;line-height:1.5}.freq-num b{display:inline;margin-right:6px;font-size:12px}}",
"1a freq 移动端 CSS")

# ---------- 1b. 空名称兜底 ----------
rep(
'<span class="freq-name"><strong>${escapeHtml(x.name)}</strong>',
'<span class="freq-name"><strong>${escapeHtml(x.name||\u0027\uff08\u672a\u547d\u540d\u7269\u54c1\uff09\u0027)}</strong>',
"1b freq 名称兜底")

# ---------- 2a. 番茄钟 CSS ----------
rep(
".freq-num b{display:block;font-size:13px;color:var(--ink)}@media(max-width:560px){.freq-row",
".freq-num b{display:block;font-size:13px;color:var(--ink)}"
".pomo-panel .pomo-body{display:flex;flex-direction:column;align-items:center;gap:9px;padding:4px 0 2px}"
".pomo-clock{font-size:42px;font-weight:600;letter-spacing:1px;font-variant-numeric:tabular-nums;color:var(--plum);line-height:1.1}"
".pomo-panel.running .pomo-clock{color:#3d7a55}"
".pomo-panel.done .pomo-clock{color:#b08a3e}"
".pomo-state{font-size:12px;color:var(--muted);text-align:center}"
".pomo-len{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}"
".pomo-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}"
".pomo-note{margin:6px 0 0;font-size:11px;color:var(--muted);text-align:center;line-height:1.6}"
".pomo-tip{font-size:11px;color:var(--plum)}"
"@media(max-width:560px){.freq-row",
"2a 番茄钟 CSS")

# ---------- 2b. 番茄钟 HTML（学习主区顶部） ----------
rep(
"""            <button class="btn primary full" type="submit"><svg><use href="#i-plus"/></svg>记录这次学习</button>
            </form>
          </article>
          <div class="module-main">
            <article class="panel">
              <div class="panel-head"><div><p class="eyebrow">学习统计</p><h2>累计投入</h2></div></div>""",
"""            <button class="btn primary full" type="submit"><svg><use href="#i-plus"/></svg>记录这次学习</button>
            </form>
          </article>
          <div class="module-main">
            <article class="panel pomo-panel" id="pomoPanel">
              <div class="panel-head"><div><p class="eyebrow">番茄时钟</p><h2>专注一段，就记一段</h2></div></div>
              <div class="pomo-body">
                <div class="pomo-clock" id="pomoClock">25:00</div>
                <div class="pomo-state" id="pomoState">准备开始 · 专注 25 分钟</div>
                <div class="pomo-len" id="pomoLen">
                  <button type="button" class="btn ghost compact active" data-pomo="25">25 分钟</button>
                  <button type="button" class="btn ghost compact" data-pomo="45">45 分钟</button>
                  <button type="button" class="btn ghost compact" data-pomo="60">60 分钟</button>
                </div>
                <div class="pomo-actions">
                  <button type="button" class="btn primary" id="pomoStart">开始专注</button>
                  <button type="button" class="btn ghost" id="pomoReset">重置</button>
                </div>
                <p class="pomo-note">专注结束时，时长会自动填入「记下这一次学习」，确认科目后点记录即可。</p>
                <p class="pomo-tip" id="pomoCount"></p>
              </div>
            </article>
            <article class="panel">
              <div class="panel-head"><div><p class="eyebrow">学习统计</p><h2>累计投入</h2></div></div>""",
"2b 番茄钟 HTML")

# ---------- 2c. 番茄钟 JS ----------
rep(
"  function renderStudy(){",
"""  /* v69 番茄时钟：专注计时，结束后把时长填入学习表单，方便一键记入学习记录 */
  var _pomo = { len:25, left:25*60000, running:false, timer:null, lastTick:0 };
  function _pomoFmt(sec){
    sec = Math.max(0, Math.ceil(Number(sec)||0));
    var m = Math.floor(sec/60), s = sec%60;
    return (m<10?'0':'')+m+':'+(s<10?'0':'')+s;
  }
  function _pomoDayKey(){ return 'pomo:'+isoDate(); }
  function _pomoToday(){
    var d = state.settings.pomoDays && state.settings.pomoDays[_pomoDayKey()];
    return d && typeof d === 'object' ? d : { n:0, min:0 };
  }
  function renderPomo(){
    var panel = document.getElementById('pomoPanel');
    var c = document.getElementById('pomoClock'), s = document.getElementById('pomoState'), b = document.getElementById('pomoStart');
    var leftSec = Math.ceil(_pomo.left/1000);
    if(c) c.textContent = _pomoFmt(leftSec);
    if(b) b.textContent = _pomo.running ? '暂停' : ((_pomo.left < _pomo.len*60000 - 500 && _pomo.left > 0) ? '继续专注' : (_pomo.left <= 0 ? '再来一段' : '开始专注'));
    if(s){
      if(_pomo.running) s.textContent = '专注中 · 结束后自动把时长填入学习表单';
      else if(_pomo.left <= 0) s.textContent = '本轮专注完成，时长已填入表单';
      else if(_pomo.left < _pomo.len*60000 - 500) s.textContent = '已暂停 · 剩余 '+_pomoFmt(leftSec);
      else s.textContent = '准备开始 · 专注 '+_pomo.len+' 分钟';
    }
    if(panel){ panel.classList.toggle('running', !!_pomo.running); panel.classList.toggle('done', _pomo.left <= 0 && !_pomo.running); }
    document.querySelectorAll('#pomoLen [data-pomo]').forEach(function(x){ x.classList.toggle('active', Number(x.dataset.pomo) === _pomo.len); });
    var pc = document.getElementById('pomoCount'), td = _pomoToday();
    if(pc) pc.textContent = td.n ? ('今天已完成 '+td.n+' 个番茄 · 专注 '+td.min+' 分钟') : '';
  }
  function _pomoStopTimer(){ if(_pomo.timer){ clearInterval(_pomo.timer); _pomo.timer = null; } }
  function pomoSetLen(n){
    if(_pomo.running) return;
    _pomo.len = Number(n)||25;
    _pomo.left = _pomo.len*60000;
    renderPomo();
  }
  function pomoReset(){ _pomoStopTimer(); _pomo.running = false; _pomo.left = _pomo.len*60000; renderPomo(); }
  function pomoToggle(){
    if(_pomo.left <= 0){ pomoReset(); return; }
    if(_pomo.running){ _pomoStopTimer(); _pomo.running = false; renderPomo(); return; }
    _pomo.running = true; _pomo.lastTick = Date.now();
    _pomo.timer = setInterval(function(){
      var now = Date.now();
      _pomo.left -= (now - _pomo.lastTick);
      _pomo.lastTick = now;
      if(_pomo.left <= 0){ _pomo.left = 0; _pomoStopTimer(); _pomo.running = false; pomoFinish(); }
      renderPomo();
    }, 250);
    renderPomo();
  }
  function pomoFinish(){
    var f = document.getElementById('studyForm');
    if(f && f.elements.minutes) f.elements.minutes.value = String(_pomo.len);
    if(f && f.elements.date && !f.elements.date.value) f.elements.date.value = isoDate();
    var days = state.settings.pomoDays && typeof state.settings.pomoDays === 'object' ? state.settings.pomoDays : {};
    var k = _pomoDayKey(), cur = days[k] && typeof days[k] === 'object' ? days[k] : { n:0, min:0 };
    cur.n = Number(cur.n||0)+1; cur.min = Number(cur.min||0)+_pomo.len;
    days[k] = cur;
    /* 只保留最近 30 天，避免无限增长 */
    var keys = Object.keys(days).sort();
    while(keys.length > 30){ delete days[keys.shift()]; }
    state.settings.pomoDays = days;
    try{ saveStateQuiet(); }catch(e){}
    toast('专注完成：'+_pomo.len+' 分钟已填入学习表单');
    renderPomo();
    try{ if(f) f.scrollIntoView({behavior:'smooth', block:'center'}); }catch(e){}
  }
  function bindPomodoro(){
    var s = document.getElementById('pomoStart'); if(s) s.addEventListener('click', pomoToggle);
    var r = document.getElementById('pomoReset'); if(r) r.addEventListener('click', function(){ pomoReset(); toast('已重置番茄钟'); });
    document.querySelectorAll('#pomoLen [data-pomo]').forEach(function(b){
      b.addEventListener('click', function(){ pomoSetLen(b.dataset.pomo); });
    });
    renderPomo();
  }
  function renderStudy(){""",
"2c 番茄钟 JS")

# ---------- 2d. 启动绑定 ----------
rep(
"  bindSnapshotPanel();\n",
"  bindSnapshotPanel();\n  try{ bindPomodoro(); }catch(e){ console.warn('pomo:', e); }\n",
"2d bindPomodoro")

# ---------- 5a. 自动生成默认关闭 ----------
rep(
"      if(state.settings.plannerAutoNext===false)return;",
"      if(state.settings.plannerAutoNext!==true)return;   /* v69：默认关闭——重复日程不再自动塞进四象限，改为在重复清单置顶回显 */",
"5a 自动生成默认关")

rep(
"    if(btn)btn.textContent=(state.settings.plannerAutoNext===false?'自动生成：关':'自动生成：开');",
"    if(btn)btn.textContent=(state.settings.plannerAutoNext===true?'自动生成：开':'自动生成：关');",
"5b 开关文案")

# ---------- 5c. 重复清单置顶回显 ----------
rep(
"""    _plannerRepeats=analyzePlannerRepeats();
    el.innerHTML=_plannerRepeats.length?_plannerRepeats.map((it,i)=>{
      const stat='历史 '+it.count+' 次 · 已完成 '+it.doneCount+(it.pendingCount?(' · 待完成 '+it.pendingCount):'')+(it.lastDoneDate?(' · 上次完成 '+formatDateHeading(it.lastDoneDate)):'');
      const next=it.nextDate?('建议下次：'+formatDateHeading(it.nextDate)+'（平均每 '+it.avgDays+' 天）'):'完成节奏数据还不足，暂不能推算下次日期';
      const action=it.nextDate?('<button class="btn ghost compact" data-action="gen-repeat" data-idx="'+i+'">生成下次</button>'):'';
      return '<div class="repeat-row"><span class="repeat-main"><strong>'+escapeHtml(it.title)+'</strong><small>'+escapeHtml(stat)+'</small><small class="repeat-next">'+escapeHtml(next)+'</small></span>'+action+'</div>';
    }).join(''):'<div class="quad-cell-empty">还没有重复出现的日程——同一件事安排两次以上，就会在这里出现节奏分析</div>';""",
"""    _plannerRepeats=analyzePlannerRepeats();
    /* v69：把「该安排了」的重复日程置顶——当前没有待办且有建议日期的排最前，按建议日期先后 */
    _plannerRepeats.sort(function(a,b){
      var pa=(!a.hasPending && a.nextDate)?0:1, pb=(!b.hasPending && b.nextDate)?0:1;
      if(pa!==pb) return pa-pb;
      if(pa===0 && a.nextDate!==b.nextDate) return a.nextDate<b.nextDate?-1:1;
      return (b.doneCount-a.doneCount)||(b.count-a.count);
    });
    el.innerHTML=_plannerRepeats.length?_plannerRepeats.map((it,i)=>{
      const stat='历史 '+it.count+' 次 · 已完成 '+it.doneCount+(it.pendingCount?(' · 待完成 '+it.pendingCount):'')+(it.lastDoneDate?(' · 上次完成 '+formatDateHeading(it.lastDoneDate)):'');
      const next=it.nextDate?('建议下次：'+formatDateHeading(it.nextDate)+'（平均每 '+it.avgDays+' 天）'):'完成节奏数据还不足，暂不能推算下次日期';
      const action=it.nextDate?('<button class="btn ghost compact" data-action="gen-repeat" data-idx="'+i+'">加入日程</button>'):'';
      const pin=(!it.hasPending && it.nextDate)?'<span class="repeat-pin">该安排了</span>':'';
      return '<div class="repeat-row'+(pin?' pinned':'')+'"><span class="repeat-main"><strong>'+pin+escapeHtml(it.title)+'</strong><small>'+escapeHtml(stat)+'</small><small class="repeat-next">'+escapeHtml(next)+'</small></span>'+action+'</div>';
    }).join(''):'<div class="quad-cell-empty">还没有重复出现的日程——同一件事安排两次以上，就会在这里出现节奏分析</div>';""",
"5c 重复清单置顶")

# ---------- 5d. 置顶标签 CSS ----------
rep(
".freq-num b{display:block;font-size:13px;color:var(--ink)}",
".freq-num b{display:block;font-size:13px;color:var(--ink)}"
".repeat-pin{display:inline-block;margin-right:6px;padding:1px 6px;border-radius:8px;background:var(--plum);color:#fff;font-size:10px;font-weight:600;vertical-align:1px}"
".repeat-row.pinned{background:var(--plum-soft);border-color:var(--plum)}",
"5d 置顶标签 CSS")

if fails:
    print("\n!!!! ANCHOR FAILURES !!!!")
    for t, msg in fails: print(" -", t, msg)
    print("文件未写入。")
    sys.exit(1)

for must in ["pomoClock", "bindPomodoro", "repeat-pin", "@media(max-width:560px){.freq-row"]:
    if must not in src:
        print("MISSING after patch:", must); sys.exit(1)

io.open(PATH, "w", encoding="utf-8", newline="").write(src)
print("written:", orig_len, "->", len(src))
print("ALL DONE")
