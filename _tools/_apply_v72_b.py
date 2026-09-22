# -*- coding: utf-8 -*-
"""v72-B：物品收纳位置归类（位置筛选条 + 总览里的位置分布）"""
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

# ---------- 1. HTML：总览里加位置分布容器 ----------
OLD = '<div class="storage-ov-cats" id="storageOvCats"></div>'
NEW = '<div class="storage-ov-cats" id="storageOvCats"></div><div class="storage-ov-locs" id="storageOvLocs"></div>'
rep("1 总览位置分布容器", OLD, NEW)

# ---------- 2. HTML：物品清单加「收纳位置」筛选条 ----------
OLD = '<div data-page-node-id="hsDxcKMXfyUjF87AfQqGlK" class="filter-chips" id="storageFilters">'
NEW = '<div class="filter-chips sub" id="storageLocFilters" hidden></div>\n<div data-page-node-id="hsDxcKMXfyUjF87AfQqGlK" class="filter-chips" id="storageFilters">'
rep("2 位置筛选条容器", OLD, NEW)

# ---------- 3. CSS（插到最后一个 </style> 之前） ----------
CSS_ADD = """.filter-chips.sub{margin:0 0 10px;gap:6px;align-items:center;flex-wrap:wrap}
.filter-chips.sub .chip-lab{font-size:11px;color:var(--muted);margin-right:2px}
.filter-chips.sub button{font-size:12px;padding:5px 10px}
.storage-ov-locs{margin-top:10px}
.storage-ov-loc-head{font-size:12px;color:var(--muted);margin-bottom:6px}
.ov-loc-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.ov-loc{display:flex;flex-direction:column;gap:2px;align-items:flex-start;text-align:left;padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:var(--surface,#fff);cursor:pointer;font:inherit}
.ov-loc.active{border-color:var(--ink);background:rgba(0,0,0,.04)}
.ov-loc strong{font-size:13px}
.ov-loc>span{font-size:11px;color:var(--muted)}
.ov-loc>small{font-size:10px;color:var(--muted);line-height:1.4}
@media(max-width:560px){.ov-loc-list{grid-template-columns:1fr 1fr}}
"""
_i = s.rfind("</style>")
if _i < 0:
    print("FAIL[3] no </style>"); sys.exit(1)
s = s[:_i] + CSS_ADD + s[_i:]
print("OK  [3 CSS]")

# ---------- 4. renderStorage：读取位置筛选 + 调用渲染 ----------
OLD = """    const records=sortedRecords('storage'),filter=state.settings.storageFilter||'all',today=isoDate();
    const _q=(_storageSearch||'').trim().toLowerCase();
    let filtered=records.filter(r=>filter==='all'||r.data.category===filter);"""
NEW = """    const records=sortedRecords('storage'),filter=state.settings.storageFilter||'all',today=isoDate();
    const _q=(_storageSearch||'').trim().toLowerCase();
    const _locF=state.settings.storageLoc||'';
    let filtered=records.filter(r=>filter==='all'||r.data.category===filter);
    /* v72 收纳位置归类：筛到指定位置 */
    if(_locF){filtered=filtered.filter(function(r){var k=String(r.data.location||'').trim();return _locF==='__none__'?(!k):(k===_locF);});}"""
rep("4a 位置过滤", OLD, NEW)

OLD = """    document.querySelectorAll('[data-storage-filter]').forEach(b=>b.classList.toggle('active',b.dataset.storageFilter===filter));"""
NEW = """    document.querySelectorAll('[data-storage-filter]').forEach(b=>b.classList.toggle('active',b.dataset.storageFilter===filter));
    renderStorageLocFilters(records);"""
rep("4b 调用位置筛选条", OLD, NEW)

OLD = """    renderStorageOverview(records);
    renderStorageFrequency(records);
  }"""
NEW = """    renderStorageOverview(records);
    renderStorageFrequency(records);
  }
  /* v72 收纳位置归类：位置筛选条（带每种位置的物品数） */
  function renderStorageLocFilters(records){
    var el=document.getElementById('storageLocFilters'); if(!el) return;
    var counts={}, order=[];
    (records||[]).forEach(function(r){
      var k=String(r.data.location||'').trim(); if(!k) k='__none__';
      if(!(k in counts)){ counts[k]=0; order.push(k); }
      counts[k]++;
    });
    if(order.length<1 || (order.length===1 && order[0]==='__none__')){ el.innerHTML=''; el.hidden=true; return; }
    el.hidden=false;
    var cur=state.settings.storageLoc||'';
    var html='<span class="chip-lab">收纳位置</span>';
    html+='<button class="'+(cur?'':'active')+'" data-storage-loc="">全部</button>';
    order.forEach(function(k){
      if(k==='__none__' && counts[k]===0) return;
      var lab=(k==='__none__')?'未标注位置':k;
      html+='<button class="'+(cur===k?'active':'')+'" data-storage-loc="'+escapeHtml(k)+'">'+escapeHtml(lab)+' '+counts[k]+'</button>';
    });
    el.innerHTML=html;
  }
  /* v72 收纳位置归类：总览里的「按位置分布」区块，点击可切到该位置 */
  function renderStorageLocGroups(records){
    var el=document.getElementById('storageOvLocs'); if(!el) return;
    var groups={}, order=[];
    (records||[]).forEach(function(r){
      var k=String(r.data.location||'').trim();
      var label=k||'未标注位置', key=k||'__none__';
      if(!groups[key]){ groups[key]={label:label,n:0,qty:0,items:[]}; order.push(key); }
      groups[key].n++; groups[key].qty+=(Number(r.data.quantity)||0);
      groups[key].items.push(String(r.data.name||''));
    });
    if(!order.length){ el.innerHTML=''; return; }
    order.sort(function(a,b){
      var ga=groups[a], gb=groups[b];
      if(ga.label==='未标注位置') return 1;
      if(gb.label==='未标注位置') return -1;
      return (gb.n-ga.n)||(gb.qty-ga.qty);
    });
    var cur=state.settings.storageLoc||'';
    el.innerHTML='<div class="storage-ov-loc-head">按收纳位置归类（点一下只看这个位置）</div><div class="ov-loc-list">'+
      order.map(function(k){
        var g=groups[k];
        var names=g.items.slice(0,6).join('、')+(g.items.length>6?' 等':'');
        return '<button type="button" class="ov-loc'+(cur===k?' active':'')+'" data-storage-loc="'+escapeHtml(k)+'">'+
               '<strong>'+escapeHtml(g.label)+'</strong><span>'+g.n+' 种 · '+g.qty+' 件</span>'+
               '<small>'+escapeHtml(names)+'</small></button>';
      }).join('')+'</div>';
  }"""
rep("4c 位置归类函数", OLD, NEW)

# ---------- 5. renderStorageOverview 里挂上位置分布 ----------
OLD = """    var _ovq=(_storageOvSearch||'').trim().toLowerCase();"""
if s.count(OLD) == 1:
    # 在该函数内、过滤之后调用（用其后的一处稳定锚点）
    pass
OLD = """    const today=isoDate(),seven=shiftDate(7);"""
NEW = """    renderStorageLocGroups(records);
    const today=isoDate(),seven=shiftDate(7);"""
rep("5 总览渲染位置分布", OLD, NEW)

# ---------- 6. 事件绑定 ----------
OLD = """    document.getElementById('storageFilters').addEventListener('click',_storageFilterClick);"""
NEW = """    document.getElementById('storageFilters').addEventListener('click',_storageFilterClick);
    /* v72 收纳位置筛选（清单筛选条 + 总览分布块共用同一套 data-storage-loc） */
    var _locClick=function(e){
      var b=e.target.closest('[data-storage-loc]'); if(!b) return;
      var v=b.dataset.storageLoc||'';
      state.settings.storageLoc=((state.settings.storageLoc||'')===v)?'':v;
      saveState(); renderStorage();
    };
    var _lf=document.getElementById('storageLocFilters'); if(_lf) _lf.addEventListener('click',_locClick);
    var _lg=document.getElementById('storageOvLocs'); if(_lg) _lg.addEventListener('click',_locClick);"""
rep("6 位置点击事件", OLD, NEW)

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("written: %d -> %d" % (orig_len, len(s)))
