#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v69-B：时光档案
3) 未来日程：创建当天记「未来日程 · X月X日」，完成时刻才记一条完成记录（不再提前占坑到未来日期）
4) 当日=时间线（默认）；本周=周历（7 列 × 小时网格，可横向滑动）；本月=月历网格；本年=当年汇总
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

# ---------- 3. 未来日程归档语义 ----------
OLD_LOOP = """if(r.type==='diet'){var _d=r.data||{},_q=r.sample?localizedHtml(_d.food||t('饮食记录')):userHtml(_d.food||t('饮食记录'));dd=_q+' · '+(r.sample?localizedHtml(_d.meal||t('早餐')):userHtml(_d.meal||t('早餐')));vv=(_d.calories||0)?(_d.calories||0)+' kcal':'';}ev.push({date:r.date,at:Number(r.createdAt||0),type:r.type,label:m.label,icon:m.icon,tone:m.tone,title:recordTitleHtml(r),detail:dd,value:vv});}"""
NEW_LOOP = """      if(r.type==='diet'){var _d=r.data||{},_q=r.sample?localizedHtml(_d.food||t('饮食记录')):userHtml(_d.food||t('饮食记录'));dd=_q+' · '+(r.sample?localizedHtml(_d.meal||t('早餐')):userHtml(_d.meal||t('早餐')));vv=(_d.calories||0)?(_d.calories||0)+' kcal':'';}
      if(r.type==='planner'){var _mk=_tsToIso(Number(r.createdAt||0)||Date.now());var _future=!!r.date&&r.date>_mk;
        ev.push({date:_mk,at:Number(r.createdAt||0),type:'planner',label:m.label,icon:m.icon,tone:m.tone,title:recordTitleHtml(r),detail:_future?('未来日程 · '+formatDateHeading(r.date)):dd,value:_future?'未来日程':''});
        if(r.data.done&&Number(r.data.doneAt||0)){ev.push({date:_tsToIso(r.data.doneAt),at:Number(r.data.doneAt),type:'planner',label:m.label,icon:m.icon,tone:m.tone,title:recordTitleHtml(r),detail:'完成了这条日程',value:'已完成'});}
        continue;}
      ev.push({date:r.date,at:Number(r.createdAt||0),type:r.type,label:m.label,icon:m.icon,tone:m.tone,title:recordTitleHtml(r),detail:dd,value:vv});}"""
rep(OLD_LOOP, NEW_LOOP, "3 未来日程/archived-by-created")

# ---------- 4a. renderArchive 分支 ----------
rep(
"""  } else {
    var cur='';
    ev.forEach(function(e){
      if(e.date!==cur){ cur=e.date; html += '<div class="tl-date">'+formatDateHeading(cur)+'</div>'; }
      html += _archiveItemHtml(e);
    });
  }
  el.innerHTML='<div class="timeline">'+html+'</div>';""",
"""  } else if(range==='week'){
    el.innerHTML=_archiveWeekHtml(ev);
    return;
  } else if(range==='month'){
    el.innerHTML=_archiveMonthHtml(ev);
    return;
  } else {
    el.innerHTML=_archiveYearHtml(ev);
    return;
  }
  el.innerHTML='<div class="timeline">'+html+'</div>';""",
"4a renderArchive 分支")

# ---------- 4b. 周历 / 月历 / 年汇总 渲染函数 ----------
rep(
"""function _archiveItemHtml(e){""",
"""/* v69 周历：7 天列 × 小时网格（6:00-24:00），有时刻的事件按时间定位，无时刻的归入「全天」 */
var _ARCH_WEEK_H0 = 6, _ARCH_WEEK_H1 = 24, _ARCH_WEEK_ROW = 30;
function _archPlain(s){ return escapeHtml(String(s||'').replace(/<[^>]*>/g,'')); }
function _archiveWeekHtml(ev){
  var today = isoDate(), ws = isoWeekStart(new Date()), days = [], i;
  for(i=0;i<7;i++) days.push(shiftDate(i, new Date(ws+'T00:00:00')));
  var timed = {}, allday = {}, byDate = {};
  days.forEach(function(d){ timed[d]=[]; allday[d]=[]; });
  ev.forEach(function(e){ if(e && e.date) (byDate[e.date]=byDate[e.date]||[]).push(e); });
  days.forEach(function(d){
    (byDate[d]||[]).forEach(function(e){
      if(e.at>0){
        var dt=new Date(e.at), h=dt.getHours()+dt.getMinutes()/60;
        if(h>=_ARCH_WEEK_H0 && h<_ARCH_WEEK_H1) timed[d].push({e:e,h:h}); else allday[d].push(e);
      } else allday[d].push(e);
    });
  });
  var wd=['周日','周一','周二','周三','周四','周五','周六'];
  var head='<div class="arch-week-head"><span class="aw-gutter"></span>'+days.map(function(d){
    var dt=new Date(d+'T00:00:00');
    return '<span class="aw-day'+(d===today?' today':'')+'"><b>'+wd[dt.getDay()]+'</b><i>'+Number(d.slice(5,7))+'/'+Number(d.slice(8,10))+'</i></span>';
  }).join('')+'</div>';
  var hours='<div class="aw-hours">';
  for(i=_ARCH_WEEK_H0;i<_ARCH_WEEK_H1;i++) hours+='<span class="aw-h" style="height:'+_ARCH_WEEK_ROW+'px">'+i+':00</span>';
  hours+='</div>';
  var cols=days.map(function(d){
    var items=timed[d].slice().sort(function(a,b){ return a.h-b.h; });
    var bucket={};
    items.forEach(function(x){ var k=Math.floor(x.h); (bucket[k]=bucket[k]||[]).push(x); });
    Object.keys(bucket).forEach(function(k){
      var arr=bucket[k], n=Math.min(arr.length,3);
      arr.forEach(function(x,idx){ x.slot=Math.min(idx,2); x.slots=n; });
    });
    var blocks=items.map(function(x){
      var top=Math.round((x.h-_ARCH_WEEK_H0)*_ARCH_WEEK_ROW), w=Math.floor(100/(x.slots||1));
      return '<span class="aw-ev" style="top:'+top+'px;left:'+(x.slot*w)+'%;width:'+(w-2)+'%" title="'+_archPlain(x.e.title)+'">'+icon(x.e.icon)+'<em>'+x.e.title+'</em></span>';
    }).join('');
    var ad=allday[d].slice(0,3).map(function(e){ return '<span class="aw-allday" title="'+_archPlain(e.title)+'">'+icon(e.icon)+'<em>'+e.title+'</em></span>'; }).join('');
    if(allday[d].length>3) ad+='<span class="aw-more">+'+(allday[d].length-3)+'</span>';
    return '<div class="aw-col'+(d===today?' today':'')+'"><div class="aw-allday-box">'+ad+'</div><div class="aw-grid" style="height:'+((_ARCH_WEEK_H1-_ARCH_WEEK_H0)*_ARCH_WEEK_ROW)+'px">'+blocks+'</div></div>';
  }).join('');
  return '<div class="arch-week"><div class="arch-week-inner">'+head+'<div class="arch-week-body">'+hours+cols+'</div></div></div>';
}
/* v69 月历：7 列网格，每格日期 + 当天记录（超出折叠为 +n） */
function _archiveMonthHtml(ev){
  var today=isoDate(), ym=today.slice(0,7);
  var first=new Date(ym+'-01T00:00:00');
  var lead=(first.getDay()+6)%7;                 /* 周一开头 */
  var dim=new Date(first.getFullYear(), first.getMonth()+1, 0).getDate();
  var cells=[], i;
  for(i=0;i<lead;i++) cells.push('');
  for(i=1;i<=dim;i++) cells.push(ym+'-'+String(i).padStart(2,'0'));
  while(cells.length%7) cells.push('');
  while(cells.length<42) cells.push('');
  var byDate={};
  ev.forEach(function(e){ if(e&&e.date) (byDate[e.date]=byDate[e.date]||[]).push(e); });
  var wd=['一','二','三','四','五','六','日'];
  var head='<div class="arch-month-head">'+wd.map(function(w){ return '<span>'+w+'</span>'; }).join('')+'</div>';
  var grid=cells.map(function(d){
    if(!d) return '<div class="am-cell empty"></div>';
    var list=byDate[d]||[];
    var inner=list.slice(0,3).map(function(e){ return '<span class="am-ev" title="'+_archPlain(e.title)+'">'+icon(e.icon)+'<em>'+e.title+'</em></span>'; }).join('');
    if(list.length>3) inner+='<span class="am-more">+'+(list.length-3)+'</span>';
    return '<div class="am-cell'+(d===today?' today':'')+'"><b>'+Number(d.slice(8,10))+'</b><div class="am-ev-box">'+inner+'</div></div>';
  }).join('');
  return '<div class="arch-month"><div class="arch-month-bar"><span>'+Number(ym.slice(5,7))+' 月 · 共 '+ev.length+' 条记录</span></div>'+head+'<div class="arch-month-grid">'+grid+'</div></div>';
}
/* v69 年汇总：总量 + 活跃天数 + 最充实一天 + 类型分布 + 12 个月节奏 */
function _archiveYearHtml(ev){
  var y=isoDate().slice(0,4), byType={}, byMonth={}, byDate={}, i;
  ev.forEach(function(e){
    byType[e.type]=(byType[e.type]||0)+1;
    var m=String(e.date||'').slice(0,7); if(m) byMonth[m]=(byMonth[m]||0)+1;
    if(e.date) byDate[e.date]=(byDate[e.date]||0)+1;
  });
  var total=ev.length;
  var types=Object.keys(byType).map(function(k){ return {k:k,n:byType[k],meta:_tlMeta(k)}; }).sort(function(a,b){ return b.n-a.n; });
  var typeRows=types.length?types.map(function(t){
    var pct=Math.round(t.n/Math.max(1,total)*100);
    return '<div class="ay-type"><span class="ay-tname">'+icon(t.meta.icon)+escapeHtml(t.meta.label)+'</span><span class="ay-tbar"><i style="width:'+Math.max(3,pct)+'%"></i></span><span class="ay-tnum">'+t.n+' 条</span></div>';
  }).join(''):'<div class="ov-empty">今年还没有记录</div>';
  var months=[];
  for(i=1;i<=12;i++) months.push({m:y+'-'+String(i).padStart(2,'0'), n:Number(byMonth[y+'-'+String(i).padStart(2,'0')]||0)});
  var maxM=1;
  months.forEach(function(x){ if(x.n>maxM) maxM=x.n; });
  var monthBars=months.map(function(x){
    var h=Math.round(x.n/maxM*100);
    return '<div class="ay-month"><span class="ay-mbar"><i style="height:'+Math.max(3,h)+'%"></i></span><b>'+Number(x.m.slice(5,7))+'</b><small>'+x.n+'</small></div>';
  }).join('');
  var topDay='', topN=0;
  Object.keys(byDate).forEach(function(d){ if(byDate[d]>topN){ topN=byDate[d]; topDay=d; } });
  return '<div class="arch-year">'
    +'<div class="ay-summary">'
      +'<div class="ay-card"><span>'+y+' 年记录</span><b>'+total+' 条</b></div>'
      +'<div class="ay-card"><span>有记录的天数</span><b>'+Object.keys(byDate).length+' 天</b></div>'
      +'<div class="ay-card"><span>最充实的一天</span><b>'+(topDay?escapeHtml(formatDateHeading(topDay)):'—')+'</b><small>'+(topN?topN+' 条':'')+'</small></div>'
    +'</div>'
    +'<div class="ay-section"><h3>各类型分布</h3>'+typeRows+'</div>'
    +'<div class="ay-section"><h3>12 个月的记录节奏</h3><div class="ay-months">'+monthBars+'</div></div>'
    +'</div>';
}
function _archiveItemHtml(e){""",
"4b 周历/月历/年汇总函数")

# ---------- 4c. CSS ----------
rep(
".pomo-tip{font-size:11px;color:var(--plum)}",
".pomo-tip{font-size:11px;color:var(--plum)}"
".arch-week{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--line);border-radius:12px;background:#fff}"
".arch-week-inner{min-width:660px}"
".arch-week-head{display:grid;grid-template-columns:46px repeat(7,minmax(0,1fr));border-bottom:1px solid var(--line)}"
".aw-day{display:flex;flex-direction:column;align-items:center;gap:1px;padding:7px 0 6px;border-left:1px solid var(--line)}"
".aw-day b{font-size:12px}"
".aw-day i{font-style:normal;font-size:10px;color:var(--muted)}"
".aw-day.today b{background:var(--plum);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px}"
".arch-week-body{display:grid;grid-template-columns:46px repeat(7,minmax(0,1fr))}"
".aw-hours{display:flex;flex-direction:column}"
".aw-h{font-size:9px;color:var(--muted);text-align:right;padding-right:5px;box-sizing:border-box;position:relative;top:-6px}"
".aw-col{border-left:1px solid var(--line);min-width:0}"
".aw-col.today,.am-cell.today{background:var(--plum-soft)}"
".aw-allday-box{min-height:28px;border-bottom:1px dashed var(--line);padding:3px 2px;display:flex;flex-direction:column;gap:2px}"
".aw-grid{position:relative;background:repeating-linear-gradient(to bottom,transparent 0 29px,var(--line) 29px 30px)}"
".aw-allday,.aw-ev{display:flex;align-items:center;gap:3px;font-size:10px;padding:1px 4px;border-radius:5px;background:var(--plum-soft);overflow:hidden;white-space:nowrap}"
".aw-ev{position:absolute;height:26px;box-sizing:border-box;border-left:2px solid var(--plum)}"
".aw-allday em,.aw-ev em,.am-ev em{font-style:normal;overflow:hidden;text-overflow:ellipsis}"
".aw-allday svg,.aw-ev svg,.am-ev svg,.ay-tname svg{width:12px;height:12px;flex:0 0 auto}"
".aw-more,.am-more{font-size:9px;color:var(--muted);padding-left:4px}"
".arch-month{border:1px solid var(--line);border-radius:12px;background:#fff;overflow:hidden}"
".arch-month-bar{padding:8px 12px;border-bottom:1px solid var(--line);font-size:12px;color:var(--muted)}"
".arch-month-head{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-bottom:1px solid var(--line)}"
".arch-month-head span{text-align:center;font-size:11px;color:var(--muted);padding:5px 0}"
".arch-month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}"
".am-cell{border-top:1px solid var(--line);border-left:1px solid var(--line);min-height:74px;padding:3px;display:flex;flex-direction:column;gap:2px;overflow:hidden}"
".am-cell:nth-child(7n+1){border-left:0}"
".am-cell.empty{background:#fafafa}"
".am-cell b{font-size:11px;color:var(--muted);font-weight:600}"
".am-cell.today b{color:#fff;background:var(--plum);border-radius:50%;width:19px;height:19px;display:flex;align-items:center;justify-content:center;font-size:10px}"
".am-ev{display:flex;align-items:center;gap:2px;font-size:9px;padding:1px 3px;border-radius:4px;background:var(--plum-soft);overflow:hidden;white-space:nowrap}"
".arch-year{display:flex;flex-direction:column;gap:14px}"
".ay-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}"
".ay-card{border:1px solid var(--line);border-radius:12px;background:#fff;padding:10px 12px;display:flex;flex-direction:column;gap:3px}"
".ay-card span{font-size:11px;color:var(--muted)}"
".ay-card b{font-size:17px}"
".ay-card small{font-size:10px;color:var(--muted)}"
".ay-section{border:1px solid var(--line);border-radius:12px;background:#fff;padding:12px}"
".ay-section h3{margin:0 0 10px;font-size:13px}"
".ay-type{display:grid;grid-template-columns:96px minmax(0,1fr) 52px;gap:8px;align-items:center;margin-bottom:7px;font-size:12px}"
".ay-tname{display:flex;align-items:center;gap:5px}"
".ay-tbar{height:8px;border-radius:5px;background:var(--line);overflow:hidden}"
".ay-tbar i{display:block;height:100%;background:var(--plum)}"
".ay-tnum{text-align:right;color:var(--muted);font-size:11px}"
".ay-months{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;align-items:end}"
".ay-month{display:flex;flex-direction:column;align-items:center;gap:3px}"
".ay-mbar{width:100%;height:72px;display:flex;align-items:flex-end;background:var(--line);border-radius:5px;overflow:hidden}"
".ay-mbar i{display:block;width:100%;background:var(--plum)}"
".ay-month b{font-size:10px;color:var(--muted);font-weight:600}"
".ay-month small{font-size:9px;color:var(--muted)}"
"@media(max-width:560px){.am-cell{min-height:62px}.am-ev{font-size:8px}.ay-summary{grid-template-columns:1fr}.ay-months{gap:3px}.ay-mbar{height:56px}.ay-type{grid-template-columns:80px minmax(0,1fr) 44px}.arch-week-inner{min-width:600px}}",
"4c 档案新视图 CSS")

# ---------- 4d. 导出测试用函数 ----------
rep(
"renderArchive:renderArchive,mergeRemoteUsage:mergeRemoteUsage,",
"renderArchive:renderArchive,_archiveWeekHtml:_archiveWeekHtml,_archiveMonthHtml:_archiveMonthHtml,_archiveYearHtml:_archiveYearHtml,mergeRemoteUsage:mergeRemoteUsage,",
"4d 测试导出")

if fails:
    print("\n!!!! ANCHOR FAILURES !!!!")
    for t, msg in fails: print(" -", t, msg)
    print("文件未写入。")
    sys.exit(1)

for must in ["_archiveWeekHtml", "_archiveMonthHtml", "_archiveYearHtml", "未来日程 · ", "arch-month-grid", "ay-months"]:
    if must not in src:
        print("MISSING after patch:", must); sys.exit(1)

io.open(PATH, "w", encoding="utf-8", newline="").write(src)
print("written:", orig_len, "->", len(src))
print("ALL DONE")
