import io

p = 'life-all-in-one.html'
s = io.open(p, encoding='utf-8').read()

# ---------- 1) 插入「使用频率排行」面板（放在库存总览之后、物品清单之前）----------
anchor = '<article data-page-node-id="1o3kQOZoiF0k43y3h9xnZV" class="panel">'
assert s.count(anchor) == 1, ('anchor', s.count(anchor))
panel = (
    '<article class="panel storage-freq-panel">'
    '<div class="panel-head"><div><p class="eyebrow">使用频率</p><h2>用得最快的几样</h2></div>'
    '<div class="freq-switch" id="storageFreqSwitch">'
    '<button type="button" class="btn ghost compact" data-freq-sort="rate">按频次</button>'
    '<button type="button" class="btn ghost compact" data-freq-sort="total">按累计</button>'
    '</div></div>'
    '<p class="mini-note freq-note">按「减少」次数统计使用。频次 = 累计次数 ÷ 跟踪天数 × 30。</p>'
    '<div class="storage-freq-list" id="storageFreqList"></div>'
    '</article>'
)
s = s.replace(anchor, panel + anchor)
print('[5] panel inserted')

# ---------- 2) 新增使用统计函数（放在 renderMedia 之前）----------
fn_anchor = "  function renderMedia(){"
assert s.count(fn_anchor) == 1, ('fn anchor', s.count(fn_anchor))
fns = (
    "  /* v48 使用频率统计：storageUsage 存于 settings（随 appSettings 跨设备同步），\n"
    "   * 避免改动云端 storage 表结构。每次「减少」= 一次使用。 */\n"
    "  function _storageUsage(){ if(!state.settings.storageUsage) state.settings.storageUsage={}; return state.settings.storageUsage; }\n"
    "  function _bumpUsage(id,n){\n"
    "    if(!id)return;const u=_storageUsage(),today=isoDate(),m=today.slice(0,7);\n"
    "    const rec=u[id]||{n:0,first:today,last:today,m:{}};\n"
    "    if(!rec.m)rec.m={};\n"
    "    rec.n=Math.max(0,Number(rec.n||0)+(Number(n)||0));\n"
    "    if(n>0){rec.m[m]=Number(rec.m[m]||0)+(Number(n)||0);rec.last=today;}\n"
    "    if(!rec.first)rec.first=today;\n"
    "    u[id]=rec;\n"
    "  }\n"
    "  function renderStorageFrequency(records){\n"
    "    const el=document.getElementById('storageFreqList');if(!el)return;\n"
    "    const u=_storageUsage(),today=isoDate(),curM=today.slice(0,7);\n"
    "    const all=records||sortedRecords('storage');\n"
    "    /* 清理已删除物品的统计，避免 settings 无限增长 */\n"
    "    const alive={};all.forEach(r=>alive[r.id]=1);Object.keys(u).forEach(k=>{if(!alive[k])delete u[k];});\n"
    "    const rows=all.map(r=>{\n"
    "      const rec=u[r.id]||{n:0,m:{},first:r.date||today,last:''};\n"
    "      const total=Number(rec.n||0);\n"
    "      const days=Math.max(1,Math.round((new Date(today)-new Date(rec.first||r.date||today))/86400000)+1);\n"
    "      const rate=total/days*30;\n"
    "      return {id:r.id,name:(r.sample?translateText(r.data.name):String(r.data.name||'')),total:total,rate:rate,last:rec.last||'',month:Number((rec.m&&rec.m[curM])||0)};\n"
    "    });\n"
    "    const sort=state.settings.storageFreqSort||'rate';\n"
    "    document.querySelectorAll('#storageFreqSwitch [data-freq-sort]').forEach(b=>b.classList.toggle('active',b.dataset.freqSort===sort));\n"
    "    const ranked=rows.filter(x=>x.total>0).sort((a,b)=>sort==='total'?(b.total-a.total||b.rate-a.rate):(b.rate-a.rate||b.total-a.total));\n"
    "    if(!ranked.length){el.innerHTML='<div class=\"ov-empty\">还没有使用记录，点清单里的「−」记录一次使用吧</div>';return;}\n"
    "    const maxRate=Math.max(0.001,...ranked.map(x=>x.rate));\n"
    "    el.innerHTML=ranked.slice(0,10).map((x,i)=>`<div class=\"freq-row ${i===0?'top1':''}\"><span class=\"freq-rank\">${i+1}</span><span class=\"freq-name\"><strong>${escapeHtml(x.name)}</strong><span class=\"freq-bar\"><i style=\"width:${Math.max(4,Math.round(x.rate/maxRate*100))}%\"></i></span></span><span class=\"freq-num\"><b>${x.rate.toFixed(1)} 次/月</b>累计 ${x.total} 次 · 本月 ${x.month} 次${x.last?' · 最近 '+escapeHtml(x.last):''}</span></div>`).join('');\n"
    "  }\n"
)
s = s.replace(fn_anchor, fns + fn_anchor)
print('[5] functions added')

# ---------- 3) renderStorage 调用 ----------
old_call = "    renderStorageOverview(records);\n  }"
assert s.count(old_call) == 1, ('call', s.count(old_call))
s = s.replace(old_call, "    renderStorageOverview(records);\n    renderStorageFrequency(records);\n  }")
print('[5] renderStorage hooked')

# ---------- 4) 减少/增加 时记录 ----------
old_minus = "if(type==='storage-minus'){const item=state.records.find(r=>r.id===id&&r.type==='storage');if(item){item.data.quantity=Math.max(0,Number(item.data.quantity||0)-1);updateRemoteStorage(item);"
assert s.count(old_minus) == 1, ('minus', s.count(old_minus))
new_minus = "if(type==='storage-minus'){const item=state.records.find(r=>r.id===id&&r.type==='storage');if(item){item.data.quantity=Math.max(0,Number(item.data.quantity||0)-1);if(Number(item.data.quantity||0)>=0)_bumpUsage(id,1);updateRemoteStorage(item);"
s = s.replace(old_minus, new_minus)
print('[5] minus hooked')

old_plus = "if(type==='storage-plus'){const item=state.records.find(r=>r.id===id&&r.type==='storage');if(item){item.data.quantity=Number(item.data.quantity||0)+1;updateRemoteStorage(item);"
assert s.count(old_plus) == 1, ('plus', s.count(old_plus))
new_plus = "if(type==='storage-plus'){const item=state.records.find(r=>r.id===id&&r.type==='storage');if(item){item.data.quantity=Number(item.data.quantity||0)+1;_bumpUsage(id,0);updateRemoteStorage(item);"
s = s.replace(old_plus, new_plus)
print('[5] plus hooked')

# ---------- 5) 排序切换点击 ----------
old_click = "      if(type==='storage-search-clear'){"
assert s.count(old_click) == 1, ('click anchor', s.count(old_click))
new_click = ("      if(type==='freq-sort'){state.settings.storageFreqSort=action.dataset.freqSort;saveState();renderStorage();}\n"
             "      if(type==='storage-search-clear'){")
s = s.replace(old_click, new_click)
print('[5] sort toggle hooked')

# ---------- 6) CSS ----------
css_anchor = ".storage-ov-list"
idx = s.index(css_anchor)
# 找到该规则的结尾
end_css = s.index('}', idx) + 1
add_css = (
    ".storage-freq-panel{margin-bottom:16px}"
    ".freq-switch{display:flex;gap:6px}"
    ".freq-switch .btn.compact{padding:4px 9px;font-size:11px}"
    ".freq-switch .btn.compact.active{background:var(--plum);color:#fff;border-color:var(--plum)}"
    ".freq-note{margin:2px 0 8px;font-size:11px}"
    ".storage-freq-list{display:flex;flex-direction:column;gap:7px}"
    ".freq-row{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 10px;border:1px solid var(--line);border-radius:11px;background:#fff}"
    ".freq-rank{width:22px;height:22px;border-radius:50%;background:var(--plum-soft);color:var(--plum);font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}"
    ".freq-row.top1 .freq-rank{background:var(--plum);color:#fff}"
    ".freq-name strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
    ".freq-bar{display:block;height:4px;border-radius:3px;background:var(--line);margin-top:5px;overflow:hidden}"
    ".freq-bar i{display:block;height:100%;background:var(--plum)}"
    ".freq-num{text-align:right;font-size:10px;color:var(--muted);white-space:nowrap}"
    ".freq-num b{display:block;font-size:13px;color:var(--ink)}"
)
s = s[:end_css] + add_css + s[end_css:]
print('[5] css added')

io.open(p, 'w', encoding='utf-8').write(s)
print('DONE')
