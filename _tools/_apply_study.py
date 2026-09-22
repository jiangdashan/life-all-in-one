# -*- coding: utf-8 -*-
"""一次性原子注入 v56 学习模块剩余的代码改动（规避多 Edit 同文件竞态丢失）。"""
import io

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = open(P, encoding='utf-8').read()
reps = []

# A. i-study 图标（接在 i-sleep 之后）
reps.append((
'    <symbol id="i-sleep" viewBox="0 0 24 24"><path d="M20.5 13.2A8.5 8.5 0 0 1 10.8 3.5a8.5 8.5 0 1 0 9.7 9.7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M15.5 4.5h4M17.5 2.5v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>',
'    <symbol id="i-sleep" viewBox="0 0 24 24"><path d="M20.5 13.2A8.5 8.5 0 0 1 10.8 3.5a8.5 8.5 0 1 0 9.7 9.7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M15.5 4.5h4M17.5 2.5v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>\n    <symbol id="i-study" viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h6v16H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></symbol>'
))

# C. DIAG_TABLES 增加 study
reps.append((
"    {key:'sleep', name:'睡眠', id:DB_SLEEP},\n    {key:'meta',    name:'同步标记', id:DB_META}",
"    {key:'sleep', name:'睡眠', id:DB_SLEEP},\n    {key:'study', name:'学习', id:DB_STUDY},\n    {key:'meta',    name:'同步标记', id:DB_META}"
))

# D. runMerge 拉取 study
reps.append((
"    dbFetchAll(DB_SLEEP, function(rows){ if(rows){ mergeSleep(rows); oneDone(true); } else oneDone(false); });",
"    dbFetchAll(DB_SLEEP, function(rows){ if(rows){ mergeSleep(rows); oneDone(true); } else oneDone(false); });\n    dbFetchAll(DB_STUDY, function(rows){ if(rows){ mergeStudy(rows); oneDone(true); } else oneDone(false); });"
))

# E. mergeStudy（插在 pushMoney 前）
reps.append((
"  function pushMoney(rec){",
"""  function mergeStudy(rows){
    if(!rows || rows.length===0) return;   /* 空结果保留本地，绝不覆盖清空 */
    var remote = rows.map(function(r){
      var d = r["日期"] ? String(r["日期"]).slice(0,10) : isoDate();
      return {id:r._id||uid(),type:'study',date:d,createdAt:Date.now(),sample:false,remoteId:r._id,
        data:{subject:String(r["科目"]||""),minutes:Number(r["时长(分钟)"])||0,category:String(r["类型"]||""),note:String(r["备注"]||"")}};
    });
    var _unsynced = state.records.filter(function(r){return r.type==='study' && isKeptLocal(r);});
    state.records = state.records.filter(function(r){return r.type!=='study';}).concat(remote).concat(_unsynced);
  }

  function pushMoney(rec){"""
))

# F. pushStudy / updateRemoteStudy / deleteRemoteStudy（插在 deleteRemoteSleep 后）
reps.append((
"  function deleteRemoteSleep(rid){ if(rid) dbDelete(DB_SLEEP, rid); }",
"""  function deleteRemoteSleep(rid){ if(rid) dbDelete(DB_SLEEP, rid); }
  function pushStudy(rec){
    if (!ONLINE || LOCAL_ONLY) return;
    var props = {};
    props["日期"] = { date: rec.date };
    props["科目"] = { text: String(rec.data.subject || "") };
    props["时长(分钟)"] = { number: Number(rec.data.minutes)||0 };
    props["类型"] = { text: String(rec.data.category || "") };
    props["备注"] = { text: String(rec.data.note || "") };
    dbAdd(DB_STUDY, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });
  }
  function updateRemoteStudy(rec){
    if (!ONLINE || LOCAL_ONLY || !rec.remoteId) return;
    var props = {};
    props["日期"] = { date: rec.date };
    props["科目"] = { text: String(rec.data.subject || "") };
    props["时长(分钟)"] = { number: Number(rec.data.minutes)||0 };
    props["类型"] = { text: String(rec.data.category || "") };
    props["备注"] = { text: String(rec.data.note || "") };
    dbUpdate(DB_STUDY, rec.remoteId, props);
  }
  function deleteRemoteStudy(rid){ if(rid) dbDelete(DB_STUDY, rid); }"""
))

# G. addRecord 分发
reps.append((
"    if(type==='sleep')pushSleep(rec);",
"    if(type==='sleep')pushSleep(rec);\n    if(type==='study')pushStudy(rec);"
))

# H. syncPendingRecords 分发
reps.append((
"        else if(rec.type==='period')pushPeriod(rec);",
"        else if(rec.type==='period')pushPeriod(rec);\n        else if(rec.type==='study')pushStudy(rec);"
))

# I. deleteRecord 三元映射
reps.append((
"target.type==='sleep'?DB_SLEEP:null;",
"target.type==='sleep'?DB_SLEEP:target.type==='study'?DB_STUDY:null;"
))

# J. deleteRecord if 链
reps.append((
"if(target.type==='sleep')deleteRemoteSleep(target.remoteId);",
"if(target.type==='sleep')deleteRemoteSleep(target.remoteId);if(target.type==='study')deleteRemoteStudy(target.remoteId);"
))

# L. DB_LIST 追加
reps.append((
"    var DB_LIST = [DB_MONEY, DB_HABIT, DB_PLAN, DB_FITNESS, DB_SHOPPING, DB_MEDIA, DB_DIET, DB_STORAGE, DB_MOOD, DB_PERIOD];",
"    var DB_LIST = [DB_MONEY, DB_HABIT, DB_PLAN, DB_FITNESS, DB_SHOPPING, DB_MEDIA, DB_DIET, DB_STORAGE, DB_MOOD, DB_PERIOD, DB_STUDY];"
))

# M. renderStudy（插在 renderSleep 前）
reps.append((
"  function renderSleep(){",
"""  function renderStudy(){
    const all=sortedRecords('study');
    const listEl=document.getElementById('studyList');
    const statEl=document.getElementById('studyStat');
    if(listEl){
      listEl.innerHTML=all.length?all.slice(0,60).map(function(r){
        var d=r.data||{};
        return '<div class="record-row"><span class="record-icon plum">'+icon('i-study')+'</span>'+
          '<span class="record-main"><strong>'+escapeHtml(d.subject||'学习')+'</strong>'+
          '<small>'+escapeHtml(formatDateHeading(r.date))+(d.category?' · '+escapeHtml(d.category):'')+' · '+(Number(d.minutes)||0)+' 分钟'+(d.note?' · '+escapeHtml(d.note):'')+'</small></span>'+
          '<span class="record-amount">'+(Number(d.minutes)||0)+' 分</span>'+
          '<button class="delete-btn" data-action="delete" data-id="'+r.id+'" aria-label="删除">'+icon('i-trash')+'</button></div>';
      }).join(''):empty('还没有学习记录');
    }
    if(statEl){
      var today=isoDate(), weekAgo=shiftDate(-6);
      function _min(arr){ return arr.reduce(function(a,r){return a+Number((r.data||{}).minutes||0);},0); }
      var todayMin=_min(all.filter(function(r){return r.date===today;}));
      var weekMin=_min(all.filter(function(r){return r.date>=weekAgo && r.date<=today;}));
      var totalMin=_min(all);
      function _fmt(m){ m=Math.round(Number(m)||0); if(m<60) return m+' 分钟'; var h=Math.floor(m/60), rem=m%60; return rem? (h+' 小时 '+rem+' 分') : (h+' 小时'); }
      const cards=[['今日学习',_fmt(todayMin)],['近 7 天',_fmt(weekMin)],['累计',_fmt(totalMin)],['学习次数',all.length+' 次']];
      statEl.innerHTML=cards.map(function(c){return '<div class="sleep-metric"><span>'+c[0]+'</span><b>'+escapeHtml(c[1])+'</b></div>';}).join('');
    }
  }
  function renderSleep(){"""
))

# O. 桌面导航：心情打卡后插入「学习记录」
reps.append((
'        <button data-page-node-id="7Nd51Ly427aDZD3ZYoNjgo" class="nav-item" data-nav="mood"><svg data-page-node-id="0zStQufKro2L55KlqOjPKj"><use data-page-node-id="ocVtKGipYP1wrJWtAtOL27" href="#i-mood"/></svg><span data-page-node-id="UctQtFo0qc3P3xEJ7gMc3c"><!--pnid:6KbUBh3pdt1rG0QbSbUGeH-->心情打卡</span></button>',
'        <button data-page-node-id="7Nd51Ly427aDZD3ZYoNjgo" class="nav-item" data-nav="mood"><svg data-page-node-id="0zStQufKro2L55KlqOjPKj"><use data-page-node-id="ocVtKGipYP1wrJWtAtOL27" href="#i-mood"/></svg><span data-page-node-id="UctQtFo0qc3P3xEJ7gMc3c"><!--pnid:6KbUBh3pdt1rG0QbSbUGeH-->心情打卡</span></button>\n        <button class="nav-item" data-nav="study"><svg><use href="#i-study"/></svg><span>学习记录</span></button>'
))

# P. 移动端导航：心情后插入「学习」
reps.append((
'  <button data-page-node-id="M7VBdXN5sF6h9yrGCy78ql" data-nav="mood"><svg data-page-node-id="6t40LSgKguAqHfPrnBUDdT"><use data-page-node-id="775M09jIZYfJEs5vZ12kOW" href="#i-mood"/></svg><span data-page-node-id="iO4hareqzoHtL5OaISTbKD"><!--pnid:RZALPUVAGEQJP4iwtJduj1-->心情</span></button>',
'  <button data-page-node-id="M7VBdXN5sF6h9yrGCy78ql" data-nav="mood"><svg data-page-node-id="6t40LSgKguAqHfPrnBUDdT"><use data-page-node-id="775M09jIZYfJEs5vZ12kOW" href="#i-mood"/></svg><span data-page-node-id="iO4hareqzoHtL5OaISTbKD"><!--pnid:RZALPUVAGEQJP4iwtJduj1-->心情</span></button>\n  <button class="nav-item" data-nav="study"><svg><use href="#i-study"/></svg><span>学习</span></button>'
))

missing = []
for old, new in reps:
    if old not in s:
        missing.append(old[:60])
    else:
        s = s.replace(old, new, 1)

if missing:
    print("MISSING ANCHORS:")
    for m in missing:
        print("  -", repr(m))
    raise SystemExit(1)

open(P, 'w', encoding='utf-8').write(s)
print("OK: applied", len(reps), "edits; file now", len(s), "chars")
