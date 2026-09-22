# -*- coding: utf-8 -*-
"""v48 睡眠统计模块补丁（幂等：每个步骤用 marker 判断是否已应用，可重复执行）。"""
import io, re

p = 'life-all-in-one.html'
s = io.open(p, encoding='utf-8').read()
DB_SLEEP = '4rjX5sVnSNNfS2mk16nR2W'


def apply_once(old, new, tag, marker, cnt=1):
    global s
    if marker in s:
        print('[skip] %s' % tag)
        return
    c = s.count(old)
    assert c == cnt, ('%s count=%d expect=%d' % (tag, c, cnt))
    s = s.replace(old, new)
    print('[ok] %s' % tag)


# ---------- 1) DB 常量 ----------
a = "var DB_PERIOD = 'rp51GH61XV6eq9fl4smboC';"
apply_once(a, a + "\nvar DB_SLEEP = '%s';" % DB_SLEEP, '1 DB_SLEEP', "var DB_SLEEP = '%s';" % DB_SLEEP)

# ---------- 2) 图标 ----------
a = '<symbol data-page-node-id="I33YJdwH5U8y4f2FexfHCR" id="i-clock"'
sym = ('<symbol id="i-sleep" viewBox="0 0 24 24"><path d="M20.5 13.2A8.5 8.5 0 0 1 10.8 3.5a8.5 8.5 0 1 0 9.7 9.7z" fill="none" '
       'stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M15.5 4.5h4M17.5 2.5v4" fill="none" '
       'stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>\n')
apply_once(a, sym + a, '2 i-sleep icon', 'id="i-sleep"')

# ---------- 3) TYPE_META ----------
a = "period:{label:'经期',icon:'i-period',tone:'plum'}\n  };"
apply_once(a, "period:{label:'经期',icon:'i-period',tone:'plum'},\n    sleep:{label:'睡眠',icon:'i-sleep',tone:'plum'}\n  };",
           '3 TYPE_META', "sleep:{label:'睡眠',icon:'i-sleep'")

# ---------- 4) 桌面导航 ----------
a = '<button data-page-node-id="olvaCDwVxP71i2w2BqnHIV" class="nav-item" data-nav="home">'
nav_btn = ('<button class="nav-item" data-nav="sleep"><svg><use href="#i-sleep"/></svg>'
           '<span><!--pnid:sleepNav-->睡眠统计</span></button> ')
apply_once(a, nav_btn + a, '4 desktop nav', 'data-nav="sleep"><svg><use href="#i-sleep"')

# ---------- 5) 手机导航 ----------
if 'data-nav="sleep"><svg><use href="#i-sleep"/></svg><span><!--pnid:sleepNavM-->' in s:
    print('[skip] 5 mobile nav')
else:
    m = re.search(r'(<nav[^>]*class="mobile-nav"[^>]*>)(.*?)(</nav>)', s, re.S)
    assert m, 'mobile-nav'
    inner = m.group(2)
    btns = re.findall(r'<button\b[^>]*>.*?</button>', inner, re.S)
    def nav_of(b):
        mm = re.search(r'data-nav="([^"]+)"', b)
        return mm.group(1) if mm else None
    by = {nav_of(b): b for b in btns if nav_of(b)}
    assert 'home' in by, list(by)
    sleep_btn = ('<button data-nav="sleep"><svg><use href="#i-sleep"/></svg>'
                 '<span><!--pnid:sleepNavM-->睡眠</span></button>')
    new_inner = inner.replace(by['home'], sleep_btn + '\n  ' + by['home'])
    s = s[:m.start(2)] + new_inner + s[m.end(2):]
    print('[ok] 5 mobile nav')

# ---------- 6) 归档筛选 chip ----------
a = '<button data-filter="habit">习惯</button>'
apply_once(a, a + '<button data-filter="sleep">睡眠</button>', '6 archive chip', '<button data-filter="sleep">')

# ---------- 7) titleFor / detailFor / valueFor ----------
a = "function titleFor(record){const d=record.data||{},local=value=>record.sample?translateText(value):value;if(record.type==='money')"
apply_once(a, "function titleFor(record){const d=record.data||{},local=value=>record.sample?translateText(value):value;if(record.type==='sleep')return (d.bedtime&&d.wake)?('睡眠 '+d.bedtime+' → '+d.wake):t('睡眠记录');if(record.type==='money')",
           '7a titleFor', "if(record.type==='sleep')return (d.bedtime&&d.wake)")

a = "function detailFor(record){const d=record.data||{};if(record.type==='money')"
apply_once(a, "function detailFor(record){const d=record.data||{};if(record.type==='sleep'){var _m=_sleepMetrics(record);return (d.bedtime||'')+' → '+(d.wake||'')+' · 睡 '+_fmtMin(_m.asleep)+(_m.inBed?' / 卧床 '+_fmtMin(_m.inBed):'');}if(record.type==='money')",
           '7b detailFor', "if(record.type==='sleep'){var _m=_sleepMetrics(record)")

a = "function valueFor(record){const d=record.data||{};if(record.type==='money')"
apply_once(a, "function valueFor(record){const d=record.data||{};if(record.type==='sleep'){var _sm=_sleepMetrics(record);return _fmtMin(_sm.asleep)+' · '+Math.round(_sm.eff)+'%';}if(record.type==='money')",
           '7c valueFor', "if(record.type==='sleep'){var _sm=_sleepMetrics(record)")

# ---------- 8) push / update / delete ----------
a = "  function updateRemoteMoney(rec){"
sleep_fns = (
    "  function pushSleep(rec){\n"
    "    if (!ONLINE || LOCAL_ONLY) return;\n"
    "    var props = {};\n"
    "    props[\"日期\"] = { date: rec.date };\n"
    "    props[\"入睡时间\"] = { text: String(rec.data.bedtime || \"\") };\n"
    "    props[\"醒来时间\"] = { text: String(rec.data.wake || \"\") };\n"
    "    props[\"深睡\"] = { number: Number(rec.data.deep)||0 };\n"
    "    props[\"浅睡\"] = { number: Number(rec.data.light)||0 };\n"
    "    props[\"REM\"] = { number: Number(rec.data.rem)||0 };\n"
    "    props[\"清醒时长\"] = { number: Number(rec.data.awake)||0 };\n"
    "    props[\"零星小睡\"] = { number: Number(rec.data.nap)||0 };\n"
    "    props[\"备注\"] = { text: String(rec.data.note || \"\") };\n"
    "    dbAdd(DB_SLEEP, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });\n"
    "  }\n"
    "  function updateRemoteSleep(rec){\n"
    "    if (!ONLINE || LOCAL_ONLY || !rec.remoteId) return;\n"
    "    var props = {};\n"
    "    props[\"日期\"] = { date: rec.date };\n"
    "    props[\"入睡时间\"] = { text: String(rec.data.bedtime || \"\") };\n"
    "    props[\"醒来时间\"] = { text: String(rec.data.wake || \"\") };\n"
    "    props[\"深睡\"] = { number: Number(rec.data.deep)||0 };\n"
    "    props[\"浅睡\"] = { number: Number(rec.data.light)||0 };\n"
    "    props[\"REM\"] = { number: Number(rec.data.rem)||0 };\n"
    "    props[\"清醒时长\"] = { number: Number(rec.data.awake)||0 };\n"
    "    props[\"零星小睡\"] = { number: Number(rec.data.nap)||0 };\n"
    "    props[\"备注\"] = { text: String(rec.data.note || \"\") };\n"
    "    dbUpdate(DB_SLEEP, rec.remoteId, props);\n"
    "  }\n"
    "  function deleteRemoteSleep(rid){ if(rid) dbDelete(DB_SLEEP, rid); }\n"
)
apply_once(a, sleep_fns + a, '8 push/update/delete', 'function pushSleep(rec){')

# ---------- 9) addRecord 分派 ----------
a = "if(type==='mood')pushMood(rec);"
apply_once(a, "if(type==='mood')pushMood(rec);\n    if(type==='sleep')pushSleep(rec);", '9 addRecord dispatch', "if(type==='sleep')pushSleep(rec);")

# ---------- 10) deleteRecord 分派 ----------
a = "target.type==='period'?DB_PERIOD:null;"
apply_once(a, "target.type==='period'?DB_PERIOD:target.type==='sleep'?DB_SLEEP:null;", '10a delete db', "target.type==='sleep'?DB_SLEEP:null;")
a = "if(target.type==='period')deleteRemotePeriod(target.remoteId);}"
apply_once(a, "if(target.type==='period')deleteRemotePeriod(target.remoteId);if(target.type==='sleep')deleteRemoteSleep(target.remoteId);}",
           '10b delete fn', "if(target.type==='sleep')deleteRemoteSleep(target.remoteId);}")

# ---------- 11) mergeSleep + runMerge ----------
a = "  function pushMoney(rec){"
merge_fn = (
    "  function mergeSleep(rows){\n"
    "    if(!rows || rows.length===0) return;   /* 空结果保留本地，绝不覆盖清空 */\n"
    "    var remote = rows.map(function(r){\n"
    "      var d = r[\"日期\"] ? String(r[\"日期\"]).slice(0,10) : isoDate();\n"
    "      return {id:r._id||uid(),type:'sleep',date:d,createdAt:Date.now(),sample:false,remoteId:r._id,\n"
    "        data:{bedtime:String(r[\"入睡时间\"]||\"\"),wake:String(r[\"醒来时间\"]||\"\"),\n"
    "              deep:Number(r[\"深睡\"])||0,light:Number(r[\"浅睡\"])||0,rem:Number(r[\"REM\"])||0,\n"
    "              awake:Number(r[\"清醒时长\"])||0,nap:Number(r[\"零星小睡\"])||0,note:String(r[\"备注\"]||\"\")}};\n"
    "    });\n"
    "    var _unsynced = state.records.filter(function(r){return r.type==='sleep' && isKeptLocal(r);});\n"
    "    state.records = state.records.filter(function(r){return r.type!=='sleep';}).concat(remote).concat(_unsynced);\n"
    "  }\n"
)
apply_once(a, merge_fn + a, '11a mergeSleep', 'function mergeSleep(rows){')
a = "    var pending = 10, done = 0, changed = false;"
apply_once(a, "    var pending = 11, done = 0, changed = false;", '11b pending', 'var pending = 11,')
a = "    dbFetchAll(DB_PERIOD, function(rows){ if(rows){ mergePeriod(rows); oneDone(true); } else oneDone(false); });"
apply_once(a, a + "\n    dbFetchAll(DB_SLEEP, function(rows){ if(rows){ mergeSleep(rows); oneDone(true); } else oneDone(false); });",
           '11c runMerge', 'dbFetchAll(DB_SLEEP,')

# ---------- 12) 睡眠视图 HTML ----------
a = '</main>'
view = (
    '<section class="view" data-title="睡眠统计" id="view-sleep">\n'
    '  <div class="module-layout">\n'
    '    <article class="panel form-panel">\n'
    '      <div class="panel-head"><div><p class="eyebrow">睡眠记录</p><h2>记下昨晚的睡眠</h2></div></div>\n'
    '      <form id="sleepForm">\n'
    '        <label class="field"><span>日期</span><input name="date" required type="date"></label>\n'
    '        <div class="form-row">\n'
    '          <label class="field"><span>入睡时间</span><input name="bedtime" required type="time"></label>\n'
    '          <label class="field"><span>醒来时间</span><input name="wake" required type="time"></label>\n'
    '        </div>\n'
    '        <div class="form-row">\n'
    '          <label class="field"><span>深睡（分钟）</span><input name="deep" inputmode="numeric" min="0" max="1440" step="1" type="number" placeholder="如 90"></label>\n'
    '          <label class="field"><span>浅睡（分钟）</span><input name="light" inputmode="numeric" min="0" max="1440" step="1" type="number" placeholder="如 240"></label>\n'
    '        </div>\n'
    '        <div class="form-row">\n'
    '          <label class="field"><span>REM（分钟）</span><input name="rem" inputmode="numeric" min="0" max="1440" step="1" type="number" placeholder="如 100"></label>\n'
    '          <label class="field"><span>清醒时长（分钟）</span><input name="awake" inputmode="numeric" min="0" max="1440" step="1" type="number" placeholder="如 20"></label>\n'
    '        </div>\n'
    '        <label class="field"><span>零星小睡（分钟）</span><input name="nap" inputmode="numeric" min="0" max="1440" step="1" type="number" placeholder="如 30"></label>\n'
    '        <label class="field"><span>备注</span><input maxlength="40" name="note" placeholder="咖啡、运动、熬夜..."></label>\n'
    '        <button class="btn primary full" type="submit"><svg><use href="#i-plus"/></svg>记下这一晚</button>\n'
    '      </form>\n'
    '    </article>\n'
    '    <div class="module-main">\n'
    '      <article class="panel sleep-stat-panel">\n'
    '        <div class="panel-head"><div><p class="eyebrow">睡眠统计</p><h2 id="sleepRangeTitle">睡眠质量分析</h2></div>\n'
    '          <div class="filter-chips" id="sleepRangeFilters">\n'
    '            <button data-action="sleep-range" data-sleep-range="day">日</button><button data-action="sleep-range" data-sleep-range="week">周</button>\n'
    '            <button data-action="sleep-range" data-sleep-range="month">月</button><button data-action="sleep-range" data-sleep-range="year">年</button>\n'
    '          </div>\n'
    '        </div>\n'
    '        <div class="sleep-metrics" id="sleepMetrics"></div>\n'
    '        <div class="sleep-stack-wrap" id="sleepStack"></div>\n'
    '        <div class="sleep-chart" id="sleepChart"></div>\n'
    '        <div class="sleep-advice" id="sleepAdvice"></div>\n'
    '      </article>\n'
    '      <article class="panel">\n'
    '        <div class="panel-head"><div><p class="eyebrow">睡眠记录</p><h2>最近的每一晚</h2></div></div>\n'
    '        <div class="record-list" id="sleepList"></div>\n'
    '      </article>\n'
    '    </div>\n'
    '  </div>\n'
    '</section>\n'
)
apply_once(a, view + a, '12 sleep view', 'id="view-sleep"')

# ---------- 13) renderSleep ----------
a = "  function renderMedia(){"
sleep_js = r"""  /* ===== v48 睡眠统计 ===== */
  function _sleepNum(v){var n=Number(v);return (isFinite(n)&&n>0)?n:0;}
  function _fmtMin(m){m=Math.round(m||0);if(m<=0)return '0 分钟';var h=Math.floor(m/60),mi=m%60;return h?(mi?h+' 小时 '+mi+' 分':h+' 小时'):(mi+' 分钟');}
  function _sleepInBed(b,w){
    if(!b||!w)return 0;
    var bp=String(b).split(':'),wp=String(w).split(':');
    var bh=parseInt(bp[0],10),bm=parseInt(bp[1]||0,10),wh=parseInt(wp[0],10),wm=parseInt(wp[1]||0,10);
    if(isNaN(bh)||isNaN(wh))return 0;
    var a=bh*60+(isNaN(bm)?0:bm),c=wh*60+(isNaN(wm)?0:wm);
    if(c<=a)c+=1440;
    return c-a;
  }
  function _sleepMetrics(rec){
    var d=rec&&rec.data?rec.data:{};
    var deep=_sleepNum(d.deep),light=_sleepNum(d.light),rem=_sleepNum(d.rem),awake=_sleepNum(d.awake),nap=_sleepNum(d.nap);
    var inBed=_sleepInBed(d.bedtime,d.wake);
    var stages=deep+light+rem;
    var asleep=stages>0?stages:Math.max(0,inBed-awake);
    if(inBed>0&&asleep>inBed)asleep=inBed;
    var eff=inBed>0?Math.min(100,asleep/inBed*100):0;
    var deepPct=asleep>0?deep/asleep*100:0;
    var remPct=asleep>0?rem/asleep*100:0;
    var durScore = asleep>=420&&asleep<=540?100:(asleep<420?Math.max(0,asleep/420*100):Math.max(0,100-(asleep-540)/180*40));
    var deepScore = deepPct>=13&&deepPct<=25?100:(deepPct<13?Math.max(0,deepPct/13*100):Math.max(0,100-(deepPct-25)/15*40));
    var remScore = remPct>=18&&remPct<=28?100:(remPct<18?Math.max(0,remPct/18*100):Math.max(0,100-(remPct-28)/12*40));
    var effScore = Math.min(100, eff/85*100);
    var score = Math.round(durScore*0.4+deepScore*0.2+remScore*0.15+effScore*0.25);
    return {deep:deep,light:light,rem:rem,awake:awake,nap:nap,inBed:inBed,asleep:asleep,eff:eff,
            deepPct:deepPct,remPct:remPct,score:score};
  }
  function _sleepScoreTone(score){return score>=85?'good':score>=70?'ok':'warn';}
  function _sleepAdviceFor(m,rec){
    var out=[],d=(rec&&rec.data)||{};
    if(!m.asleep&&!m.inBed){out.push({tone:'',text:'还没有可用的睡眠数据，先记录一晚吧。'});return out;}
    if(m.asleep<420)out.push({tone:'warn',text:'睡眠时长偏短（'+_fmtMin(m.asleep)+'），建议再提前 '+Math.round(420-m.asleep)+' 分钟上床，成人目标为 7–9 小时。'});
    else if(m.asleep>540)out.push({tone:'warn',text:'睡眠时间偏长（'+_fmtMin(m.asleep)+'），若白天仍困倦，留意是否存在睡眠质量不佳或作息过晚。'});
    else out.push({tone:'good',text:'睡眠时长达标（'+_fmtMin(m.asleep)+'，处于 7–9 小时区间），继续保持。'});
    if(m.deepPct<13)out.push({tone:'warn',text:'深睡比例偏低（'+m.deepPct.toFixed(0)+'%，参考 13–25%）。建议睡前 1 小时远离屏幕、卧室保持 18–22℃、避免睡前饮酒。'});
    else if(m.deepPct>25)out.push({tone:'ok',text:'深睡比例偏高（'+m.deepPct.toFixed(0)+'%），若白天疲惫明显，留意是否身体在补偿性恢复。'});
    else out.push({tone:'good',text:'深睡比例健康（'+m.deepPct.toFixed(0)+'%）。'});
    if(m.remPct<18)out.push({tone:'warn',text:'REM 比例偏低（'+m.remPct.toFixed(0)+'%，参考 18–28%），常见诱因是压力、酒精或作息不规律。建议固定起床时间、减少睡前饮酒。'});
    else if(m.remPct>28)out.push({tone:'ok',text:'REM 比例偏高（'+m.remPct.toFixed(0)+'%），多见于作息紊乱后的补偿，保持规律即可。'});
    else out.push({tone:'good',text:'REM 比例健康（'+m.remPct.toFixed(0)+'%）。'});
    if(m.eff<85)out.push({tone:'warn',text:'睡眠效率偏低（'+Math.round(m.eff)+'%，目标 ≥85%），夜间清醒 '+_fmtMin(m.awake)+'。建议减少床上使用手机、固定起床时间、避免睡前大量饮水。'});
    else out.push({tone:'good',text:'睡眠效率良好（'+Math.round(m.eff)+'%）。'});
    if(m.nap>45)out.push({tone:'warn',text:'零星小睡偏多（'+_fmtMin(m.nap)+'），建议控制在 30 分钟内，并尽量安排在下午 3 点之前。'});
    else if(m.nap>0)out.push({tone:'ok',text:'有小睡 '+_fmtMin(m.nap)+'，在合理范围内。'});
    if(d.note)out.push({tone:'',text:'备注：'+String(d.note)});
    return out;
  }
  function _sleepRangeList(all,range){
    var today=isoDate();
    if(range==='day'){
      var ds=state.settings.sleepDay||today;
      return {from:ds,to:ds,list:all.filter(r=>r.date===ds)};
    }
    var days = range==='week'?7:range==='month'?30:365;
    var from=shiftDate(-(days-1));
    return {from:from,to:today,list:all.filter(r=>r.date>=from&&r.date<=today)};
  }
  function _sleepSeries(list,range){
    var map={},i;
    list.forEach(function(r){
      var key;
      if(range==='week'||range==='day')key=r.date;
      else if(range==='month'){var off=Math.floor((new Date(isoDate())-new Date(r.date))/86400000);key='第'+(Math.floor(off/7)+1)+'周';}
      else key=Number(r.date.slice(5,7))+'月';
      if(!map[key])map[key]={sum:0,n:0};
      var m=_sleepMetrics(r);map[key].sum+=m.asleep;map[key].n++;
    });
    var keys=Object.keys(map);
    if(range==='month')keys=keys.sort(function(a,b){return Number(a.replace(/[^0-9]/g,''))-Number(b.replace(/[^0-9]/g,''));});
    else if(range==='year')keys=keys.sort(function(a,b){return Number(String(a).replace('月',''))-Number(String(b).replace('月',''));});
    else keys=keys.sort();
    return keys.map(function(k){return {label:(range==='week'?k.slice(5):k),value:map[k].n?map[k].sum/map[k].n:0,n:map[k].n};});
  }
  function renderSleep(){
    const all=sortedRecords('sleep');
    const range=state.settings.sleepRange||'week';
    document.querySelectorAll('#sleepRangeFilters button').forEach(b=>b.classList.toggle('active',b.dataset.sleepRange===range));
    const titleEl=document.getElementById('sleepRangeTitle');
    const RANGE_TEXT={day:'当日睡眠分析',week:'近 7 天睡眠分析',month:'近 30 天睡眠分析',year:'近 365 天睡眠分析'};
    if(titleEl)titleEl.textContent=RANGE_TEXT[range]||'睡眠质量分析';
    const seg=_sleepRangeList(all,range);
    const list=seg.list;
    const metEl=document.getElementById('sleepMetrics'),stEl=document.getElementById('sleepStack'),
          chEl=document.getElementById('sleepChart'),adEl=document.getElementById('sleepAdvice'),
          liEl=document.getElementById('sleepList');
    if(liEl){
      liEl.innerHTML=all.length?all.slice(0,60).map(function(r){
        var m=_sleepMetrics(r),d=r.data||{};
        return '<div class="sleep-row"><span class="sleep-main"><strong>'+escapeHtml(r.date)+'</strong>'+
          '<small>'+escapeHtml((d.bedtime||'—')+' → '+(d.wake||'—'))+' · 睡 '+_fmtMin(m.asleep)+' · 效率 '+Math.round(m.eff)+'%'+
          (d.note?' · '+escapeHtml(d.note):'')+'</small></span>'+
          '<span class="sleep-score '+_sleepScoreTone(m.score)+'">'+m.score+'</span>'+
          '<button class="delete-btn" data-action="delete" data-id="'+r.id+'" aria-label="删除">'+icon('i-trash')+'</button></div>';
      }).join(''):empty('还没有睡眠记录');
    }
    if(!list.length){
      if(metEl)metEl.innerHTML='';
      if(stEl)stEl.innerHTML='';
      if(chEl)chEl.innerHTML='';
      if(adEl)adEl.innerHTML='<div class="sleep-advice-item">'+escapeHtml(range==='day'?((state.settings.sleepDay||isoDate())+' 这天还没有睡眠记录'):'这段时间还没有睡眠记录')+'</div>';
      return;
    }
    const agg=list.reduce(function(a,r){var m=_sleepMetrics(r);a.deep+=m.deep;a.light+=m.light;a.rem+=m.rem;a.awake+=m.awake;a.nap+=m.nap;a.asleep+=m.asleep;a.inBed+=m.inBed;a.eff+=m.eff;a.score+=m.score;a.n++;return a;},{deep:0,light:0,rem:0,awake:0,nap:0,asleep:0,inBed:0,eff:0,score:0,n:0});
    const n=agg.n||1;
    const avg={deep:agg.deep/n,light:agg.light/n,rem:agg.rem/n,awake:agg.awake/n,nap:agg.nap/n,asleep:agg.asleep/n,inBed:agg.inBed/n,eff:agg.eff/n,score:agg.score/n};
    if(metEl){
      const cards=[['记录天数',agg.n+' 天'],['平均睡眠',_fmtMin(avg.asleep)],['平均深睡',_fmtMin(avg.deep)],['平均浅睡',_fmtMin(avg.light)],['平均REM',_fmtMin(avg.rem)],['平均清醒',_fmtMin(avg.awake)],['平均小睡',_fmtMin(avg.nap)],['平均效率',Math.round(avg.eff)+'%'],['平均评分',Math.round(avg.score)]];
      metEl.innerHTML=cards.map(function(c){return '<div class="sleep-metric"><span>'+c[0]+'</span><b>'+escapeHtml(c[1])+'</b></div>';}).join('');
    }
    if(stEl){
      const tot=avg.deep+avg.light+avg.rem+avg.awake;
      if(tot>0){
        const seg2=[['深睡',avg.deep,'#33506b'],['浅睡',avg.light,'#5f8a70'],['REM',avg.rem,'#4a7aa8'],['清醒',avg.awake,'#c0a79a']];
        stEl.innerHTML='<div class="sleep-stack">'+seg2.map(function(x){var w=x[1]/tot*100;return w>0?'<i style="width:'+w.toFixed(2)+'%;background:'+x[2]+'" title="'+x[0]+' '+_fmtMin(x[1])+'"></i>':'';}).join('')+'</div>'+
          '<div class="sleep-legend">'+seg2.map(function(x){var p=tot?Math.round(x[1]/tot*100):0;return '<span><i style="background:'+x[2]+'"></i>'+x[0]+' '+p+'%</span>';}).join('')+'</div>';
      } else stEl.innerHTML='';
    }
    if(chEl){
      const series=_sleepSeries(list,range);
      const max=Math.max(1,...series.map(x=>x.value));
      chEl.innerHTML=series.map(function(x){
        const h=Math.max(3,Math.round(x.value/max*100));
        return '<div class="sleep-bar-wrap"><span class="sleep-bar-val">'+_fmtMin(x.value)+'</span><span class="sleep-bar" style="height:'+h+'px"></span><span class="sleep-bar-lbl">'+escapeHtml(String(x.label))+'</span></div>';
      }).join('');
    }
    if(adEl){
      const latest=list[list.length-1];
      const m=_sleepMetrics(latest);
      adEl.innerHTML=_sleepAdviceFor(m,latest).map(function(a){return '<div class="sleep-advice-item '+(a.tone||'')+'">'+escapeHtml(a.text)+'</div>';}).join('');
    }
  }
"""
apply_once(a, sleep_js + a, '13 renderSleep', 'function renderSleep(){')

# ---------- 14) renderAll ----------
a = "_safeRender('period', renderPeriod);"
apply_once(a, "_safeRender('sleep', renderSleep); " + a, '14 renderAll', "_safeRender('sleep', renderSleep);")

# ---------- 15) 表单提交 ----------
a = "document.getElementById('budgetInput').addEventListener('change'"
submit = (
    "    var _sleepForm=document.getElementById('sleepForm');\n"
    "    if(_sleepForm&&!_sleepForm._bound){_sleepForm._bound=true;_sleepForm.addEventListener('submit',function(e){\n"
    "      e.preventDefault();\n"
    "      var fd=new FormData(e.currentTarget);\n"
    "      var date=String(fd.get('date')||'').trim()||isoDate();\n"
    "      var data={\n"
    "        bedtime:String(fd.get('bedtime')||'').trim(),\n"
    "        wake:String(fd.get('wake')||'').trim(),\n"
    "        deep:Math.max(0,Math.round(Number(fd.get('deep'))||0)),\n"
    "        light:Math.max(0,Math.round(Number(fd.get('light'))||0)),\n"
    "        rem:Math.max(0,Math.round(Number(fd.get('rem'))||0)),\n"
    "        awake:Math.max(0,Math.round(Number(fd.get('awake'))||0)),\n"
    "        nap:Math.max(0,Math.round(Number(fd.get('nap'))||0)),\n"
    "        note:String(fd.get('note')||'').trim()\n"
    "      };\n"
    "      if(!data.bedtime||!data.wake){toast('请填写入睡与醒来时间');return;}\n"
    "      var exist=null;for(var _i=0;_i<state.records.length;_i++){if(state.records[_i].type==='sleep'&&state.records[_i].date===date){exist=state.records[_i];break;}}\n"
    "      if(exist){ exist.data=data; updateRemoteSleep(exist); const sv=saveState(true); renderSleep(); if(sv)toast('这一晚已更新'); return; }\n"
    "      if(addRecord('sleep',date,data)){ state.settings.sleepDay=date; e.currentTarget.reset(); var _sd=e.currentTarget.elements.date; if(_sd)_sd.value=isoDate(); renderSleep(); }\n"
    "    });}\n"
)
apply_once(a, submit + a, '15 form submit', "_sleepForm._bound=true")

# ---------- 16) 日/周/月/年 切换 ----------
a = "      if(type==='freq-sort'){"
apply_once(a, "      if(type==='sleep-range'){state.settings.sleepRange=action.dataset.sleepRange;if(state.settings.sleepRange==='day'&&!state.settings.sleepDay)state.settings.sleepDay=isoDate();saveState();renderSleep();}\n      " + a,
           '16 range toggle', "if(type==='sleep-range'){")

# ---------- 17) CSS ----------
a = ".storage-freq-panel{margin-bottom:16px}"
add_css = (
    ".sleep-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin:6px 0 12px}"
    ".sleep-metric{padding:9px 6px;border:1px solid var(--line);border-radius:11px;background:#fff;text-align:center}"
    ".sleep-metric span{display:block;font-size:10px;color:var(--muted)}"
    ".sleep-metric b{display:block;font-size:14px;margin-top:3px;white-space:nowrap}"
    ".sleep-stack{display:flex;height:22px;border-radius:6px;overflow:hidden;background:var(--line)}"
    ".sleep-stack i{display:block;height:100%}"
    ".sleep-legend{display:flex;flex-wrap:wrap;gap:10px;margin:6px 0 12px;font-size:10px;color:var(--muted)}"
    ".sleep-legend span{display:inline-flex;align-items:center;gap:4px}"
    ".sleep-legend i{width:9px;height:9px;border-radius:3px;display:inline-block}"
    ".sleep-chart{display:flex;align-items:flex-end;gap:6px;min-height:130px;padding:10px 6px;border:1px solid var(--line);border-radius:12px;background:#fff;margin-bottom:12px;overflow-x:auto}"
    ".sleep-bar-wrap{flex:1 0 auto;min-width:30px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px}"
    ".sleep-bar{width:100%;max-width:32px;border-radius:5px 5px 0 0;background:var(--plum);min-height:3px}"
    ".sleep-bar-val{font-size:9px;font-weight:700;color:var(--ink)}"
    ".sleep-bar-lbl{font-size:9px;color:var(--muted);white-space:nowrap}"
    ".sleep-advice{display:flex;flex-direction:column;gap:7px}"
    ".sleep-advice-item{padding:9px 11px;border:1px solid var(--line);border-radius:11px;background:#fff;font-size:12px;line-height:1.65}"
    ".sleep-advice-item.warn{border-color:#e3c9a6;background:#fdf6ec}"
    ".sleep-advice-item.good{border-color:#cfe3d4;background:#f2f8f4}"
    ".sleep-advice-item.ok{border-color:#dde3ea;background:#f6f8fa}"
    ".sleep-row{display:flex;align-items:center;gap:9px;padding:9px 11px;border:1px solid var(--line);border-radius:11px;background:#fff;margin-bottom:7px}"
    ".sleep-row .sleep-main{flex:1;min-width:0}"
    ".sleep-row strong{display:block;font-size:12px}"
    ".sleep-row small{display:block;font-size:10px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
    ".sleep-score{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;background:var(--sand-soft);color:var(--muted);flex:0 0 auto}"
    ".sleep-score.good{background:var(--sage-soft);color:var(--sage)}"
    ".sleep-score.ok{background:var(--plum-soft);color:var(--plum)}"
    ".sleep-score.warn{background:#f7e6d8;color:#a3672f}"
)
apply_once(a, a + add_css, '17 css', '.sleep-advice-item.warn{')

io.open(p, 'w', encoding='utf-8').write(s)
print('DONE')
