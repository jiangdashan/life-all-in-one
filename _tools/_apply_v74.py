# -*- coding: utf-8 -*-
import io, re, sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(P, encoding="utf-8").read()
orig = s

def rep(name, old, new, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        print("FAIL %s: expected %d occurrences, found %d" % (name, cnt, n))
        sys.exit(1)
    s = s.replace(old, new, cnt)
    print("OK   %s" % name)

# ---------- 1. 删除泄漏到习惯健康页顶部的 CSS 文本 ----------
mark = "</style>.cd-sub{"
i = s.find(mark)
if i < 0:
    print("FAIL 1 leak block not found")
    sys.exit(1)
j = s.find("</style></style>", i)
if j < 0 or j - i > 6000:
    print("FAIL 1 leak end not found")
    sys.exit(1)
leak = s[i:j + len("</style></style>")]
s = s[:i] + "</style>" + s[j + len("</style></style>"):]
print("OK   1 removed leaked css block (%d chars)" % len(leak))

# ---------- 2. 把倒数日 CSS 放进主 style（在 </style> 之前） ----------
ANCHOR = "</style>\n  <title data-page-node-id=\"N9uQg0dpiKTsyB4FFPFrxl\""
NEW_CSS = """.cd-sub{margin:6px 0 0;font-size:12px;color:var(--muted)}
.cd-inline{display:flex;align-items:center;gap:6px}
.cd-hero{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:12px;margin:14px 0 4px}
.cd-hero-main{padding:16px 18px;border:1px solid var(--line);border-radius:16px;background:var(--card);display:flex;flex-direction:column;min-width:0}
.cd-hero-lab{font-size:11px;color:var(--muted)}
.cd-hero-name{margin-top:7px;font-size:17px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cd-hero-count{display:flex;align-items:baseline;gap:5px;margin-top:12px}
.cd-hero-count b{font-size:38px;font-weight:700;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.cd-hero-count b.txt{font-size:26px}
.cd-hero-count span{font-size:13px;color:var(--muted)}
.cd-hero-meta{margin-top:9px;font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cd-hero-side{display:flex;flex-direction:column;gap:8px;min-width:0}
.cd-hero-sm{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;border:1px solid var(--line);border-radius:12px;background:var(--card);min-width:0}
.cd-hero-sm .cd-hs-name{font-size:13px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cd-hero-sm .cd-hs-days{font-size:12px;color:var(--muted);white-space:nowrap;flex:none}
.cd-hero-sm .cd-hs-days b{font-size:16px;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums}
.cd-list{display:flex;flex-direction:column;gap:8px;margin-top:4px}
.cd-row{display:flex;align-items:center;gap:12px;padding:11px 13px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
.cd-num{display:flex;align-items:baseline;gap:3px;min-width:58px;justify-content:flex-end;flex:none}
.cd-num b{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.1}
.cd-num b.txt{font-size:15px}
.cd-num span{font-size:11px;color:var(--muted)}
.cd-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.cd-body strong{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cd-body small{font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cd-tag{flex:none;font-size:10.5px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:2px 7px;white-space:nowrap}
.cd-row.near{border-color:var(--red)}
.cd-row.near .cd-num b{color:var(--red)}
@media(max-width:640px){
  .cd-hero{grid-template-columns:1fr;gap:10px}
  .cd-hero-count b{font-size:34px}
  .cd-row{gap:10px;padding:10px 11px}
  .cd-num{min-width:50px}
}
</style>
  <title data-page-node-id="N9uQg0dpiKTsyB4FFPFrxl\""""
rep("2 css into main style", ANCHOR, NEW_CSS)

# ---------- 3. Hero 重做 ----------
OLD_HERO = """    var heroEl=document.getElementById('cdHero');
    if(heroEl){
      var first=rows[0];
      heroEl.innerHTML = first
        ? '<div class="cd-hero-item"><span class="cd-hero-lab">最近的一个日子</span><strong>'+escapeHtml(first.name)+'</strong><span class="cd-hero-days">'+
          (_cdDaysTo(first.next)===0?'就是今天':('还有 '+_cdDaysTo(first.next)+' 天'))+
          '</span><small>'+first.next+' '+_cdWeekday(first.next)+(first.type==='lunar'&&first.item?' · '+_cdDateNote(first.item):(first.item?' · '+_cdDateNote(first.item):''))+'</small></div>'
        : '<div class="ov-empty">暂时没有倒数日</div>';
    }"""
NEW_HERO = """    var heroEl=document.getElementById('cdHero');
    if(heroEl){
      var first=rows[0];
      if(!first){ heroEl.innerHTML='<div class="ov-empty">暂时没有倒数日</div>'; }
      else{
        var d0=_cdDaysTo(first.next);
        var meta0=first.next+' '+_cdWeekday(first.next)+(first.item?' · '+_cdDateNote(first.item):(first.type==='lunar'?' · 农历':' · 公历'));
        var side='';
        for(var si=1; si<rows.length && si<3; si++){
          var o=rows[si], od=_cdDaysTo(o.next);
          side+='<div class="cd-hero-sm"><span class="cd-hs-name">'+escapeHtml(o.name)+'</span>'+
                '<span class="cd-hs-days">'+(od===0?'就是今天':'还有 <b>'+od+'</b> 天')+'</span></div>';
        }
        heroEl.innerHTML='<div class="cd-hero">'+
            '<div class="cd-hero-main">'+
              '<span class="cd-hero-lab">最近的一个日子</span>'+
              '<div class="cd-hero-name">'+escapeHtml(first.name)+'</div>'+
              '<div class="cd-hero-count">'+(d0===0?'<b class="txt">就是今天</b>':'<b>'+d0+'</b><span>天</span>')+'</div>'+
              '<div class="cd-hero-meta">'+escapeHtml(meta0)+'</div>'+
            '</div>'+
            (side?'<div class="cd-hero-side">'+side+'</div>':'')+
          '</div>';
      }
    }"""
rep("3 hero", OLD_HERO, NEW_HERO)

# ---------- 4. 列表行重做 ----------
OLD_ROW = """    el.innerHTML=view.map(function(x){
      var days=_cdDaysTo(x.next);
      var tag=x.type==='lunar'?'农历':'公历';
      var note=x.item?_cdDateNote(x.item):(tag==='农历'?'农历节日':'公历节日');
      return '<div class="cd-row'+(days<=7?' near':'')+'">'+
        '<span class="cd-days"><b>'+days+'</b><small>天</small></span>'+
        '<span class="cd-main"><strong>'+escapeHtml(x.name)+'</strong>'+
        '<small>'+x.next+' '+_cdWeekday(x.next)+' · '+escapeHtml(note)+(x.note?' · '+escapeHtml(x.note):'')+'</small></span>'+
        '<span class="cd-tag">'+tag+'</span>'+
        (x.builtin?'':'<button class="delete-btn" data-action="del-countdown" data-id="'+x.id+'" aria-label="删除">'+icon('i-trash')+'</button>')+
        '</div>';
    }).join('');"""
NEW_ROW = """    el.innerHTML=view.map(function(x){
      var days=_cdDaysTo(x.next);
      var tag=x.type==='lunar'?'农历':'公历';
      var note=x.item?_cdDateNote(x.item):(tag==='农历'?'农历节日':'公历节日');
      return '<div class="cd-row'+(days<=7?' near':'')+'">'+
        '<span class="cd-num">'+(days===0?'<b class="txt">今天</b>':'<b>'+days+'</b><span>天</span>')+'</span>'+
        '<span class="cd-body"><strong>'+escapeHtml(x.name)+'</strong>'+
        '<small>'+x.next+' '+_cdWeekday(x.next)+' · '+escapeHtml(note)+(x.note?' · '+escapeHtml(x.note):'')+'</small></span>'+
        '<span class="cd-tag">'+tag+'</span>'+
        (x.builtin?'':'<button class="delete-btn" data-action="del-countdown" data-id="'+x.id+'" aria-label="删除">'+icon('i-trash')+'</button>')+
        '</div>';
    }).join('');"""
rep("4 row", OLD_ROW, NEW_ROW)

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("WRITTEN size %d -> %d (delta %d)" % (len(orig), len(s), len(s) - len(orig)))
