# -*- coding: utf-8 -*-
import io

P = 'life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()

def sub(old, new, tag):
    global s
    n = s.count(old)
    assert n == 1, '锚点不唯一(%d): %s' % (n, tag)
    s = s.replace(old, new, 1)
    print('OK  ', tag)

# ---------- 1) HTML：插入时间范围筛选排 ----------
sub(
    '<div data-page-node-id="BGCgb2qjWkTsvWNResvycB" class="filter-chips" id="archiveFilters">',
    '<div class="filter-chips" id="archiveRange"><button class="active" data-range="day">当日</button><button data-range="week">本周</button><button data-range="month">本月</button><button data-range="year">本年</button></div>'
    '<div data-page-node-id="BGCgb2qjWkTsvWNResvycB" class="filter-chips" id="archiveFilters">',
    '时间范围筛选排 HTML'
)

# ---------- 2) 默认设置加 archiveRange ----------
sub(
    "archiveFilter:'all',moneyFilter:'all'",
    "archiveFilter:'all',archiveRange:'day',moneyFilter:'all'",
    '默认设置 archiveRange'
)

# ---------- 3) 重写 renderArchive ----------
old_render = "function renderArchive(){const filter=state.settings.archiveFilter||'all';document.querySelectorAll('#archiveFilters button').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));const ev=_buildTimelineEvents().filter(e=>filter==='all'||e.type===filter);ev.sort((a,b)=>{const c=b.date.localeCompare(a.date);return c?c:(b.at||0)-(a.at||0);});const el=document.getElementById('archiveList');if(!el)return;if(!ev.length){el.innerHTML=empty('这个范围还没有记录');return;}let html='',cur='';ev.forEach(e=>{if(e.date!==cur){cur=e.date;html+=`<div class=\"tl-date\">${formatDateHeading(cur)}</div>`;}const m=_tlMeta(e.type);html+=`<div class=\"tl-item\"><span class=\"tl-dot ${m.tone}\">${icon(m.icon)}</span><div class=\"tl-card\"><span class=\"type-tag\">${t(m.label)}</span><strong>${e.title}</strong><small>${e.detail}</small>${e.value?`<span class=\"tl-value\">${escapeHtml(e.value)}</span>`:''}</div></div>`;});el.innerHTML=`<div class=\"timeline\">${html}</div>`;}"

new_render = """function _archiveInRange(dateStr, range){
  var today = isoDate();
  if(!_dateValid(dateStr)) return false;
  if(range==='day') return dateStr===today;
  if(range==='week'){ var ws=isoWeekStart(new Date()); var wsEnd=shiftDate(6, new Date(ws+'T00:00:00')); return dateStr>=ws && dateStr<=wsEnd; }
  if(range==='month') return dateStr.slice(0,7)===today.slice(0,7);
  if(range==='year') return dateStr.slice(0,4)===today.slice(0,4);
  return true;
}
function _clockLabel(ts){
  if(!ts) return null;
  var d=new Date(ts), h=d.getHours();
  var part = h<12 ? '上午' : '下午';
  var hh = h%12; if(hh===0) hh=12;
  var mm = ('0'+d.getMinutes()).slice(-2);
  return part + hh + '点' + (mm==='00' ? '' : mm+'分');
}
function renderArchive(){
  const range = state.settings.archiveRange || 'day';
  const filter = state.settings.archiveFilter || 'all';
  document.querySelectorAll('#archiveRange button').forEach(b=>b.classList.toggle('active',b.dataset.range===range));
  document.querySelectorAll('#archiveFilters button').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));
  var ev = _buildTimelineEvents().filter(function(e){ return (filter==='all'||e.type===filter) && _archiveInRange(e.date, range); });
  ev.sort((a,b)=>{const c=b.date.localeCompare(a.date);return c?c:(b.at||0)-(a.at||0);});
  const el=document.getElementById('archiveList');
  if(!el) return;
  if(!ev.length){ el.innerHTML=empty('这个范围还没有记录'); return; }
  var html='';
  if(range==='day'){
    /* 当日：按具体时刻生成时间线（上午10点/下午15点），无时刻归入「时间未记录」 */
    var withTime = ev.filter(function(e){ return e.at>0; });
    var noTime = ev.filter(function(e){ return !(e.at>0); });
    var buckets = [], map = {};
    withTime.forEach(function(e){
      var k = _clockLabel(e.at) || '时间未记录';
      if(map[k]==null){ map[k]=buckets.length; buckets.push({label:k, items:[]}); }
      buckets[map[k]].items.push(e);
    });
    buckets.forEach(function(b){
      html += '<div class="tl-clock">'+b.label+'</div>';
      b.items.forEach(function(e){
        html += _archiveItemHtml(e);
      });
    });
    if(noTime.length){
      html += '<div class="tl-clock">时间未记录</div>';
      noTime.forEach(function(e){ html += _archiveItemHtml(e); });
    }
  } else {
    var cur='';
    ev.forEach(function(e){
      if(e.date!==cur){ cur=e.date; html += '<div class="tl-date">'+formatDateHeading(cur)+'</div>'; }
      html += _archiveItemHtml(e);
    });
  }
  el.innerHTML='<div class="timeline">'+html+'</div>';
}
function _archiveItemHtml(e){
  var m=_tlMeta(e.type);
  return '<div class="tl-item"><span class="tl-dot '+m.tone+'">'+icon(m.icon)+'</span><div class="tl-card"><span class="type-tag">'+t(m.label)+'</span><strong>'+e.title+'</strong><small>'+e.detail+'</small>'+(e.value?'<span class="tl-value">'+escapeHtml(e.value)+'</span>':'')+'</div></div>';
}"""

assert s.count(old_render) == 1, 'renderArchive 锚点不唯一'
s = s.replace(old_render, new_render, 1)
print('OK   renderArchive 重写')

# ---------- 4) 事件绑定：给 archiveRange 加点击 ----------
sub(
    "document.getElementById('archiveFilters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;state.settings.archiveFilter=b.dataset.filter;saveState();renderArchive();});",
    "document.getElementById('archiveFilters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;state.settings.archiveFilter=b.dataset.filter;saveState();renderArchive();});\n    var _ar=document.getElementById('archiveRange');if(_ar)_ar.addEventListener('click',e=>{const b=e.target.closest('[data-range]');if(!b)return;state.settings.archiveRange=b.dataset.range;saveState();renderArchive();});",
    'archiveRange 事件绑定'
)

# ---------- 5) CSS：时刻分组样式 ----------
sub(
    '.tl-date{position:relative;z-index:1;margin:18px 0 8px;padding:2px 8px 2px 46px;font-size:13px;font-weight:750;color:#5b6067}',
    '.tl-clock{position:relative;z-index:1;margin:16px 0 6px;padding:2px 8px 2px 46px;font-size:12.5px;font-weight:600;color:var(--muted)}\n    .tl-clock:first-child{margin-top:4px}\n    .tl-date{position:relative;z-index:1;margin:18px 0 8px;padding:2px 8px 2px 46px;font-size:13px;font-weight:750;color:#5b6067}',
    '时刻分组 CSS'
)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('DONE, new len', len(s))
