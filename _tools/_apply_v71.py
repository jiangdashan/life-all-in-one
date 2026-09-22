# -*- coding: utf-8 -*-
"""v71：周历/月历点击展开当天全部记录（移动端可读的详情面板）"""
import io, sys

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig = len(s)
fails = []

def rep(tag, old, new, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        fails.append('%s: expected %d got %d' % (tag, cnt, n))
        return
    s = s.replace(old, new)

# ---------- 1. CSS ----------
OLD_CSS = ".aw-more,.am-more{font-size:9px;color:var(--muted);padding-left:4px}"
NEW_CSS = (".aw-more,.am-more{font-size:9px;color:var(--muted);padding-left:4px}"
           ".aw-day,.aw-col,.am-cell,.aw-more,.am-more{cursor:pointer}"
           ".arch-hint{font-size:11px;color:var(--muted);margin:0 0 6px}"
           ".arch-sheet-wrap{position:fixed;inset:0;z-index:1200;display:none}"
           ".arch-sheet-wrap.open{display:block}"
           ".arch-sheet-mask{position:absolute;inset:0;background:rgba(20,24,30,.45)}"
           ".arch-sheet{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,92vw);max-height:76vh;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 32px rgba(20,24,30,.18);padding:12px 14px 16px}"
           ".arch-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}"
           ".arch-sheet-head b{font-size:14px;color:var(--ink);font-weight:600}"
           ".arch-sheet-x{border:1px solid var(--line);background:var(--paper);color:var(--muted);border-radius:999px;padding:4px 12px;font-size:12px;cursor:pointer}"
           ".arch-sheet-body{display:flex;flex-direction:column;gap:6px}"
           ".as-row{display:flex;gap:8px;align-items:stretch}"
           ".as-clock{flex:0 0 60px;font-size:11px;color:var(--muted);padding-top:10px;line-height:1.4}"
           ".as-card{flex:1 1 auto;min-width:0}"
           ".as-card .tl-item{padding:8px 10px}"
           ".as-empty{padding:18px 4px;text-align:center;font-size:12px;color:var(--muted)}"
           "@media(max-width:560px){.arch-sheet{left:0;right:0;top:auto;bottom:0;transform:none;width:100%;max-height:74vh;border-radius:16px 16px 0 0;padding:12px 12px 22px}}")
rep('css', OLD_CSS, NEW_CSS)

# ---------- 2. renderArchive：绑定点击（一次） ----------
rep('bind',
    "  var ev = _buildTimelineEvents().filter(function(e){ return (filter==='all'||e.type===filter) && _archiveInRange(e.date, range); });",
    "  var ev = _buildTimelineEvents().filter(function(e){ return (filter==='all'||e.type===filter) && _archiveInRange(e.date, range); });\n"
    "  if(!el.__archDayBound){ el.__archDayBound=true; el.addEventListener('click', _archiveListClick); }")

# ---------- 3. 周历：缓存 byDate + 头部可点 ----------
rep('week-cache',
    "  var timed = {}, allday = {}, byDate = {};\n"
    "  days.forEach(function(d){ timed[d]=[]; allday[d]=[]; });\n"
    "  ev.forEach(function(e){ if(e && e.date) (byDate[e.date]=byDate[e.date]||[]).push(e); });",
    "  var timed = {}, allday = {}, byDate = {};\n"
    "  days.forEach(function(d){ timed[d]=[]; allday[d]=[]; });\n"
    "  ev.forEach(function(e){ if(e && e.date) (byDate[e.date]=byDate[e.date]||[]).push(e); });\n"
    "  _ARCH_BY_DATE = byDate;   /* v71：供「查看当天全部」面板取数 */")

rep('week-head',
    "return '<span class=\"aw-day'+(d===today?' today':'')+'\"><b>'+wd[dt.getDay()]+'</b>",
    "return '<span class=\"aw-day'+(d===today?' today':'')+'\" data-arch-date=\"'+d+'\"><b>'+wd[dt.getDay()]+'</b>")

# ---------- 4. 周历：小时格 >3 条折叠为 +N，列可点 ----------
OLD_COLS = """  var cols=days.map(function(d){
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
  return '<div class="arch-week"><div class="arch-week-inner">'+head+'<div class="arch-week-body">'+hours+cols+'</div></div></div>';"""

NEW_COLS = """  var cols=days.map(function(d){
    var items=timed[d].slice().sort(function(a,b){ return a.h-b.h; });
    var bucket={};
    items.forEach(function(x){ var k=Math.floor(x.h); (bucket[k]=bucket[k]||[]).push(x); });
    var shown=[], chips=[];
    Object.keys(bucket).forEach(function(k){
      var arr=bucket[k];
      if(arr.length<=3){ arr.forEach(function(x,idx){ x.slot=idx; x.slots=arr.length; shown.push(x); }); }
      else {
        /* v71：同一小时超过 3 条 → 只画 2 条，第三格放「+N」，点开看全部 */
        arr.slice(0,2).forEach(function(x,idx){ x.slot=idx; x.slots=3; shown.push(x); });
        chips.push({k:k, n:arr.length-2});
      }
    });
    var blocks=shown.map(function(x){
      var top=Math.round((x.h-_ARCH_WEEK_H0)*_ARCH_WEEK_ROW), w=Math.floor(100/(x.slots||1));
      return '<span class="aw-ev" style="top:'+top+'px;left:'+(x.slot*w)+'%;width:'+(w-2)+'%" title="'+_archPlain(x.e.title)+'">'+icon(x.e.icon)+'<em>'+x.e.title+'</em></span>';
    }).join('');
    blocks+=chips.map(function(c){
      var top=Math.round((Number(c.k)-_ARCH_WEEK_H0)*_ARCH_WEEK_ROW), w=Math.floor(100/3);
      return '<span class="aw-ev aw-ev-more" style="top:'+top+'px;left:'+(2*w)+'%;width:'+(w-2)+'%">+'+c.n+'</span>';
    }).join('');
    var ad=allday[d].slice(0,3).map(function(e){ return '<span class="aw-allday" title="'+_archPlain(e.title)+'">'+icon(e.icon)+'<em>'+e.title+'</em></span>'; }).join('');
    if(allday[d].length>3) ad+='<span class="aw-more">+'+(allday[d].length-3)+'</span>';
    return '<div class="aw-col'+(d===today?' today':'')+'" data-arch-date="'+d+'"><div class="aw-allday-box">'+ad+'</div><div class="aw-grid" style="height:'+((_ARCH_WEEK_H1-_ARCH_WEEK_H0)*_ARCH_WEEK_ROW)+'px">'+blocks+'</div></div>';
  }).join('');
  return '<div class="arch-week"><div class="arch-hint">点任意一天或 +N，查看当天全部记录</div><div class="arch-week-inner">'+head+'<div class="arch-week-body">'+hours+cols+'</div></div></div>';"""
rep('week-cols', OLD_COLS, NEW_COLS)

# ---------- 5. 月历：缓存 byDate + 格子可点 + 提示 ----------
rep('month-cache',
    "  var byDate={};\n  ev.forEach(function(e){ if(e&&e.date) (byDate[e.date]=byDate[e.date]||[]).push(e); });",
    "  var byDate={};\n  ev.forEach(function(e){ if(e&&e.date) (byDate[e.date]=byDate[e.date]||[]).push(e); });\n  _ARCH_BY_DATE = byDate;   /* v71 */")

rep('month-cell',
    "return '<div class=\"am-cell'+(d===today?' today':'')+'\"><b>'+Number(d.slice(8,10))+'</b>",
    "return '<div class=\"am-cell'+(d===today?' today':'')+'\" data-arch-date=\"'+d+'\"><b>'+Number(d.slice(8,10))+'</b>")

rep('month-bar',
    "'<div class=\"arch-month\"><div class=\"arch-month-bar\"><span>'+Number(ym.slice(5,7))+' 月 · 共 '+ev.length+' 条记录</span></div>'",
    "'<div class=\"arch-month\"><div class=\"arch-month-bar\"><span>'+Number(ym.slice(5,7))+' 月 · 共 '+ev.length+' 条记录</span><i class=\"arch-hint\">点日期或 +N，查看当天全部</i></div>'")

# ---------- 6. 新增：当天全部记录面板 ----------
ANCHOR = "/* v69 周历：7 天列 × 小时网格（6:00-24:00），有时刻的事件按时间定位，无时刻的归入「全天」 */"
NEW_FUNCS = """/* v71 周历/月历点击展开：按天查看全部记录（移动端也能看全） */
var _ARCH_BY_DATE = {};
function _archiveListClick(e){
  var node = e && e.target && e.target.closest ? e.target.closest('[data-arch-date]') : null;
  if(!node) return;
  _archiveOpenDay(node.getAttribute('data-arch-date'));
}
function _archiveSheetEl(){
  var el=document.getElementById('archSheet');
  if(!el){
    el=document.createElement('div');
    el.id='archSheet';
    el.className='arch-sheet-wrap';
    el.innerHTML='<div class="arch-sheet-mask"></div><div class="arch-sheet"><div class="arch-sheet-head"><b id="archSheetTitle"></b><button type="button" id="archSheetClose" class="arch-sheet-x">关闭</button></div><div class="arch-sheet-body" id="archSheetBody"></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function(ev){
      var t=ev.target;
      if(t===el || (t.className && String(t.className).indexOf('arch-sheet-mask')>=0) || t.id==='archSheetClose') _archiveCloseDay();
    });
  }
  return el;
}
function _archiveDayTitle(d, n){
  var wd=['周日','周一','周二','周三','周四','周五','周六'];
  var dt=new Date(d+'T00:00:00');
  return Number(d.slice(5,7))+'月'+Number(d.slice(8,10))+'日 '+wd[dt.getDay()]+' · 共 '+n+' 条';
}
function _archiveDayItemsHtml(d){
  var list=((_ARCH_BY_DATE&&_ARCH_BY_DATE[d])||[]).slice().sort(function(a,b){ return (a.at||0)-(b.at||0); });
  if(!list.length) return '<div class="as-empty">这天没有记录</div>';
  return list.map(function(e){
    var clock = e.at>0 ? (_clockLabel(e.at)||'') : '';
    return '<div class="as-row"><span class="as-clock">'+(clock?clock:'时间未记录')+'</span><div class="as-card">'+_archiveItemHtml(e)+'</div></div>';
  }).join('');
}
function _archiveOpenDay(d){
  if(!d) return;
  var list=((_ARCH_BY_DATE&&_ARCH_BY_DATE[d])||[]);
  var wrap=_archiveSheetEl();
  var tt=document.getElementById('archSheetTitle'), bb=document.getElementById('archSheetBody');
  if(tt) tt.textContent=_archiveDayTitle(d, list.length);
  if(bb) bb.innerHTML=_archiveDayItemsHtml(d);
  wrap.classList.add('open');
}
function _archiveCloseDay(){
  var wrap=document.getElementById('archSheet');
  if(wrap) wrap.classList.remove('open');
}
"""
rep('funcs', ANCHOR, NEW_FUNCS + ANCHOR)

# ---------- 7. 测试导出 ----------
rep('export',
    "renderArchive:renderArchive,",
    "renderArchive:renderArchive,_archiveOpenDay:_archiveOpenDay,_archiveCloseDay:_archiveCloseDay,_archiveDayItemsHtml:_archiveDayItemsHtml,_archiveDayTitle:_archiveDayTitle,_archByDate:function(){return _ARCH_BY_DATE;},")

if fails:
    print('ANCHOR FAIL:')
    for f in fails: print('  -', f)
    sys.exit(1)

io.open(P, 'w', encoding='utf-8', newline='').write(s)

# ---------- 只读校验 ----------
chk = io.open(P, encoding='utf-8').read()
musts = [
    '点任意一天或 +N，查看当天全部记录',
    '点日期或 +N，查看当天全部',
    'var _ARCH_BY_DATE = {};',
    'function _archiveOpenDay(',
    'arch-sheet-wrap',
    'data-arch-date="\'',
    '_archiveDayItemsHtml:_archiveDayItemsHtml',
]
bad = [m for m in musts if m not in chk]
if bad:
    print('CHINESE/TOKEN ASSERT FAIL:')
    for b in bad: print('  -', repr(b))
    sys.exit(1)
print('OK v71 applied, len %d -> %d' % (orig, len(chk)))
