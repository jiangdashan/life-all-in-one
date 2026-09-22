# -*- coding: utf-8 -*-
"""v73-A：时光档案支持按任意日期 / 周 / 月 / 年查看（‹ › 翻页 + 日期选择器 + 回到今天）"""
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

# ---------- 1. 新增 cursor 工具 + 归档范围改用 cursor ----------
OLD = """function _archiveInRange(dateStr, range){
  var today = isoDate();
  if(!_dateValid(dateStr)) return false;
  if(range==='day') return dateStr===today;
  if(range==='week'){ var ws=isoWeekStart(new Date()); var wsEnd=shiftDate(6, new Date(ws+'T00:00:00')); return dateStr>=ws && dateStr<=wsEnd; }
  if(range==='month') return dateStr.slice(0,7)===today.slice(0,7);
  if(range==='year') return dateStr.slice(0,4)===today.slice(0,4);
  return true;
}"""
NEW = """/* v73：档案不再只能看「相对今天」的四档，改用一个可漫游的基准日 cursor
 * —— ‹ › 按当前档位翻页（日±1 天 / 周±7 天 / 月±1 月 / 年±1 年），也能直接挑任意日期。 */
function _archCursor(){
  var c = state.settings.archiveCursor;
  return _dateValid(c) ? c : isoDate();
}
function _archIso(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function _archLabel(range, cur){
  var today = isoDate();
  if(range==='day') return (cur===today?'今天 · ':'')+cur;
  if(range==='week'){ var ws=isoWeekStart(new Date(cur+'T00:00:00')); var we=shiftDate(6, new Date(ws+'T00:00:00')); return ws+' ~ '+we; }
  if(range==='month') return Number(cur.slice(5,7))+' 月 · '+cur.slice(0,4);
  return cur.slice(0,4)+' 年';
}
function _archiveStep(delta){
  var range = state.settings.archiveRange || 'day';
  var cur = _archCursor(), today = isoDate();
  var d = new Date(cur+'T00:00:00');
  if(range==='day') d.setDate(d.getDate()+delta);
  else if(range==='week') d.setDate(d.getDate()+delta*7);
  else if(range==='month'){ var m=d.getMonth()+delta; d.setDate(1); d.setMonth(m); }   /* 先归 1 号，避免 1/31 +1 月溢出到 3 月 */
  else d.setFullYear(d.getFullYear()+delta);
  var nx = _archIso(d);
  if(nx > today) nx = today;          /* 不往未来翻 */
  state.settings.archiveCursor = nx;
  saveState(); renderArchive();
}
function _archiveGoto(val){
  if(!_dateValid(val)) return;
  var today = isoDate();
  if(val > today) val = today;
  state.settings.archiveCursor = val;
  saveState(); renderArchive();
}
function renderArchiveNav(range){
  var cur = _archCursor(), today = isoDate();
  var lab = document.getElementById('archNavLabel');
  if(lab) lab.textContent = _archLabel(range, cur);
  var di = document.getElementById('archiveDate');
  if(di && di.value !== cur) di.value = cur;
  var tb = document.getElementById('archTodayBtn');
  if(tb) tb.hidden = (cur === today);
}
function _archiveInRange(dateStr, range){
  var base = _archCursor();
  if(!_dateValid(dateStr)) return false;
  if(range==='day') return dateStr===base;
  if(range==='week'){ var ws=isoWeekStart(new Date(base+'T00:00:00')); var wsEnd=shiftDate(6, new Date(ws+'T00:00:00')); return dateStr>=ws && dateStr<=wsEnd; }
  if(range==='month') return dateStr.slice(0,7)===base.slice(0,7);
  if(range==='year') return dateStr.slice(0,4)===base.slice(0,4);
  return true;
}"""
rep("1 cursor 工具 + 范围判定改用 cursor", OLD, NEW)

# ---------- 2. 周历 / 月历 / 年汇总的基准日跟随 cursor ----------
OLD = "function _archiveWeekHtml(ev){\n  var today = isoDate(), ws = isoWeekStart(new Date()), days = [], i;"
NEW = "function _archiveWeekHtml(ev){\n  var today = isoDate(), ws = isoWeekStart(new Date(_archCursor()+'T00:00:00')), days = [], i;"
rep("2a 周历基准日", OLD, NEW)

OLD = "function _archiveMonthHtml(ev){\n  var today=isoDate(), ym=today.slice(0,7);"
NEW = "function _archiveMonthHtml(ev){\n  var today=isoDate(), ym=_archCursor().slice(0,7);"
rep("2b 月历基准日", OLD, NEW)

OLD = "function _archiveYearHtml(ev){\n  var y=isoDate().slice(0,4), byType={}, byMonth={}, byDate={}, i;"
NEW = "function _archiveYearHtml(ev){\n  var y=_archCursor().slice(0,4), byType={}, byMonth={}, byDate={}, i;"
rep("2c 年汇总基准年", OLD, NEW)

# ---------- 3. HTML：插入日期导航条 ----------
OLD = '<button data-range="year">本年</button></div>'
NEW = ('<button data-range="year">本年</button></div>'
       '<div class="archive-nav" id="archiveNav">'
       '<button type="button" class="arch-nav-btn" data-action="arch-prev" aria-label="往前一段">‹</button>'
       '<span class="arch-nav-label" id="archNavLabel"></span>'
       '<button type="button" class="arch-nav-btn" data-action="arch-next" aria-label="往后一段">›</button>'
       '<input type="date" id="archiveDate" class="arch-date" aria-label="跳到指定日期">'
       '<button type="button" class="arch-nav-btn wide" id="archTodayBtn" data-action="arch-today" hidden>回到今天</button>'
       '</div>')
rep("3 日期导航条 HTML", OLD, NEW)

# ---------- 4. renderArchive 里刷新导航条 ----------
OLD = """  document.querySelectorAll('#archiveRange button').forEach(b=>b.classList.toggle('active',b.dataset.range===range));"""
NEW = """  document.querySelectorAll('#archiveRange button').forEach(b=>b.classList.toggle('active',b.dataset.range===range));
  renderArchiveNav(range);"""
rep("4 renderArchive 刷新导航条", OLD, NEW)

# ---------- 5. CSS ----------
CSS_ADD = """.archive-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0 2px}
.arch-nav-btn{min-width:30px;height:30px;padding:0 8px;border:1px solid var(--line);border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:14px;line-height:1;cursor:pointer}
.arch-nav-btn.wide{min-width:auto;font-size:12px}
.arch-nav-btn:disabled{opacity:.4;cursor:default}
.arch-nav-label{font-size:13px;font-weight:600;min-width:130px}
.arch-date{font:inherit;font-size:13px;padding:4px 8px;border:1px solid var(--line);border-radius:8px;background:transparent;color:inherit}
@media(max-width:560px){.arch-nav-label{min-width:0;flex:1 1 100%;order:-1}}
</style>"""
_i = s.rfind("</style>")
if _i < 0:
    print("FAIL[5] no </style>"); sys.exit(1)
s = s[:_i] + CSS_ADD + s[_i:]
print("OK  [5 CSS]")

# ---------- 6. 事件绑定 ----------
OLD = """    var _ar=document.getElementById('archiveRange');if(_ar)_ar.addEventListener('click',e=>{const b=e.target.closest('[data-range]');if(!b)return;state.settings.archiveRange=b.dataset.range;saveState();renderArchive();});"""
NEW = """    var _ar=document.getElementById('archiveRange');if(_ar)_ar.addEventListener('click',e=>{const b=e.target.closest('[data-range]');if(!b)return;state.settings.archiveRange=b.dataset.range;saveState();renderArchive();});
    /* v73 档案日期漫游：‹ › 翻页 / 直接选日期 / 回到今天 */
    var _an=document.getElementById('archiveNav');
    if(_an&&!_an._bound){_an._bound=true;_an.addEventListener('click',function(e){
      var b=e.target.closest('[data-action^="arch-"]'); if(!b) return;
      var a=b.dataset.action;
      if(a==='arch-prev') _archiveStep(-1);
      else if(a==='arch-next') _archiveStep(1);
      else if(a==='arch-today') _archiveGoto(isoDate());
    });}
    var _ad=document.getElementById('archiveDate');
    if(_ad&&!_ad._bound){_ad._bound=true;_ad.addEventListener('change',function(){ _archiveGoto(this.value); });}"""
rep("6 日期导航事件绑定", OLD, NEW)

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("written: %d -> %d" % (orig_len, len(s)))
