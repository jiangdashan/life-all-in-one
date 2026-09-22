# -*- coding: utf-8 -*-
"""v73-B2：倒数日模块的视图 HTML / 导航 / 图标 / CSS / 事件绑定 / 首次拉取"""
import io, sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(P, encoding="utf-8").read()
orig_len = len(s)

def rep(tag, old, new, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        print("FAIL[%s] expected %d got %d" % (tag, cnt, n)); sys.exit(1)
    s = s.replace(old, new, cnt)
    print("OK  [%s]" % tag)

# ---------- 1. SVG symbol ----------
OLD = '<symbol id="i-study" viewBox="0 0 24 24">'
NEW = ('<symbol id="i-countdown" viewBox="0 0 24 24">'
       '<path d="M7 3v3M17 3v3M3.5 9h17M5 6h14a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6z" '
       'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
       '<path d="M12 12.5V15l1.6 1.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
       '</symbol>') + OLD
rep("1 倒数日图标", OLD, NEW)

# ---------- 2. 导航项 ----------
OLD = '<button class="nav-item" data-nav="payback"><svg><use href="#i-payback"/></svg><span>回本记录</span></button>'
NEW = OLD + '<button class="nav-item" data-nav="countdown"><svg><use href="#i-countdown"/></svg><span>倒数日</span></button>'
rep("2 导航项", OLD, NEW)

# ---------- 3. 视图 HTML ----------
LMM = "".join(['<option value="%d">%s</option>' % (i + 1, n) for i, n in enumerate(
    ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'])])
LDD = "".join(['<option value="%d">%s</option>' % (i + 1, n) for i, n in enumerate(
    ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
     '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
     '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'])])

VIEW = (
    '<section class="view" data-title="倒数日" id="view-countdown">'
    '<div class="archive-head"><div><p class="eyebrow">重要的日子</p><h2>倒数日</h2></div>'
    '<p class="cd-sub">内置节日自动倒数，也可以自己添加；支持农历，到日子会重新回到下一次。</p></div>'
    '<div class="cd-hero" id="cdHero"></div>'
    '<div class="module-layout">'
    '<article class="panel form-panel"><div class="panel-head"><div><p class="eyebrow">添加一个</p><h2>记下重要日子</h2></div></div>'
    '<form id="countdownForm">'
    '<label class="field"><span>名称</span><input maxlength="20" name="name" placeholder="生日、纪念日、考试…" required></label>'
    '<div class="form-row">'
    '<label class="field"><span>历法</span><select name="type" id="cdTypeSel">'
    '<option value="solar">公历</option><option value="lunar">农历</option></select></label>'
    '<label class="field" id="cdRepeatWrap"><span>重复</span><select name="repeat">'
    '<option value="yes">每年重复</option><option value="no">只此一次</option></select></label>'
    '</div>'
    '<div class="form-row" id="cdSolarWrap">'
    '<label class="field"><span>公历日期</span><input name="date" type="date"></label>'
    '</div>'
    '<div class="form-row" id="cdLunarWrap" hidden>'
    '<label class="field"><span>农历月</span><select name="lmonth">' + LMM + '</select></label>'
    '<label class="field"><span>农历日</span><select name="lday">' + LDD + '</select></label>'
    '</div>'
    '<label class="field" id="cdLeapWrap" hidden><span class="cd-inline"><input type="checkbox" name="leap"> 闰月</span></label>'
    '<label class="field"><span>备注</span><input maxlength="30" name="note" placeholder="可留空"></label>'
    '<button class="btn primary full" type="submit"><svg><use href="#i-plus"/></svg>加入倒数</button>'
    '</form></article>'
    '<div class="module-main"><article class="panel">'
    '<div class="panel-head"><div><p class="eyebrow">倒数清单</p><h2>最近的排在前面</h2></div></div>'
    '<div class="filter-chips" id="cdSourceFilter">'
    '<button class="active" data-cd-src="all">全部</button>'
    '<button data-cd-src="builtin">节日</button>'
    '<button data-cd-src="custom">我加的</button>'
    '</div>'
    '<div class="cd-list" id="countdownList"></div>'
    '</article></div>'
    '</div></section>'
)

OLD = '<section data-page-node-id="cfrlOw3CRbH9mJA2fhlCRy" class="view" data-title="时光档案" id="view-archive">'
rep("3 倒数日视图 HTML", OLD, VIEW + OLD)

# ---------- 4. CSS ----------
CSS_ADD = """.cd-sub{margin:6px 0 0;font-size:12px;color:var(--muted)}
.cd-hero{margin:10px 0 4px;padding:14px 16px;border:1px solid var(--line);border-radius:12px}
.cd-hero-item{display:flex;flex-direction:column;gap:2px}
.cd-hero-lab{font-size:11px;color:var(--muted)}
.cd-hero-item strong{font-size:18px}
.cd-hero-days{font-size:22px;font-weight:700;line-height:1.2}
.cd-hero-item small{font-size:11px;color:var(--muted)}
.cd-list{display:flex;flex-direction:column;gap:6px}
.cd-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:10px}
.cd-row.near{border-color:var(--red)}
.cd-days{display:flex;align-items:baseline;gap:2px;min-width:52px}
.cd-days b{font-size:19px;font-weight:700}
.cd-days small{font-size:10px;color:var(--muted)}
.cd-main{flex:1;display:flex;flex-direction:column;min-width:0}
.cd-main strong{font-size:13px}
.cd-main small{font-size:11px;color:var(--muted)}
.cd-tag{font-size:10px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:2px 6px;white-space:nowrap}
.cd-inline{display:flex;align-items:center;gap:6px}
@media(max-width:560px){.cd-days{min-width:44px}.cd-row{gap:8px}}
</style>"""
_i = s.rfind("</style>")
if _i < 0:
    print("FAIL[4] no </style>"); sys.exit(1)
s = s[:_i] + CSS_ADD + s[_i:]
print("OK  [4 CSS]")

# ---------- 5. 事件绑定 + 首次拉取 ----------
OLD = """    var _ar=document.getElementById('archiveRange');if(_ar)_ar.addEventListener('click',e=>{const b=e.target.closest('[data-range]');if(!b)return;state.settings.archiveRange=b.dataset.range;saveState();renderArchive();});"""
NEW = OLD + """
    bindCountdown();"""
rep("5a bindCountdown 调用", OLD, NEW)

# bindCountdown 函数体：插到倒数日渲染函数之后
OLD = "  function renderAll(){try{ rolloverWeeklyPlan(); }catch(e){}\n"
NEW = """  function bindCountdown(){
    var f=document.getElementById('countdownForm');
    var ts=document.getElementById('cdTypeSel');
    var sw=document.getElementById('cdSolarWrap'), lw=document.getElementById('cdLunarWrap'), lp=document.getElementById('cdLeapWrap');
    function syncMode(){
      var lunar = ts && ts.value==='lunar';
      if(sw) sw.hidden = lunar;
      if(lw) lw.hidden = !lunar;
      if(lp) lp.hidden = !lunar;
    }
    if(ts && !ts._cd){ ts._cd=true; ts.addEventListener('change', syncMode); syncMode(); }
    var sf=document.getElementById('cdSourceFilter');
    if(sf && !sf._cd){ sf._cd=true; sf.addEventListener('click', function(e){
      var b=e.target.closest('[data-cd-src]'); if(!b) return;
      _cdSource=b.dataset.cdSrc; renderCountdown();
    }); }
    var cl=document.getElementById('countdownList');
    if(cl && !cl._cd){ cl._cd=true; cl.addEventListener('click', function(e){
      var b=e.target.closest('[data-action="del-countdown"]'); if(!b) return;
      if(deleteCountdown){ deleteCountdown(b.dataset.id); toast('已删除这个倒数日'); }
    }); }
    if(f && !f._cd){ f._cd=true; f.addEventListener('submit', function(e){
      e.preventDefault();
      var fd=new FormData(f);
      var type=String(fd.get('type')||'solar');
      var data={ name:String(fd.get('name')||''), type:type,
                 repeat:String(fd.get('repeat')||'yes')==='yes',
                 note:String(fd.get('note')||'') };
      if(type==='lunar'){
        data.leap = !!fd.get('leap');
        data.date = '0001-'+String(Number(fd.get('lmonth'))||1).padStart(2,'0')+'-'+String(Number(fd.get('lday'))||1).padStart(2,'0');
      } else {
        data.leap = false;
        var iso=String(fd.get('date')||'');
        if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(iso)){ toast('请选择公历日期'); return; }
        data.date = data.repeat ? iso : iso;
      }
      if(addCountdown(data)){ f.reset(); syncMode(); }
    }); }
    /* 首次打开时拉一次云端，并顺手把本机未上传的补传过去 */
    try{ countdownPull(function(){ countdownPush(); }); }catch(e){}
    renderCountdown();
  }
""" + OLD
rep("5b bindCountdown 定义", OLD, NEW)

# ---------- 6. 手动同步按钮处加倒数日双向同步 ----------
OLD = """      rolloverWeeklyPlan();
      pullAllRemote(function(ok){"""
NEW = """      rolloverWeeklyPlan();
      try{ countdownPull(function(){ countdownPush(); }); }catch(e){}
      pullAllRemote(function(ok){"""
rep("6 同步按钮联动倒数日", OLD, NEW)

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("written: %d -> %d" % (orig_len, len(s)))
