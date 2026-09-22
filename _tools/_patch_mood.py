import io

p = 'life-all-in-one.html'
s = io.open(p, encoding='utf-8').read()

# ---------- 任务3：移除心情页右侧上方三个小指标模块 ----------
marker = '<div data-page-node-id="JWzRxnt6bVQmabvTTJDYbk" class="metric-row" hidden>'
i = s.index(marker)
k = s.index('</article></div>', i)
end = k + len('</article></div>')
s = s[:i] + s[end:]
# 清掉遗留的换行
s = s.replace('\n' + '\n            <article class="panel mood-calendar-panel">',
              '\n            <article class="panel mood-calendar-panel">', 1)
print('[3] metric-row removed')

# renderMood 增加空值保护（元素已移除，避免抛错）
old1 = "    document.getElementById('moodWeekAvg').textContent=weekAvg;\n    document.getElementById('moodTotal').textContent=records.length;"
new1 = ("    /* v48：三个顶部小指标模块已移除，保留空值保护避免抛错 */\n"
        "    const _waEl=document.getElementById('moodWeekAvg');if(_waEl)_waEl.textContent=weekAvg;\n"
        "    const _mtEl=document.getElementById('moodTotal');if(_mtEl)_mtEl.textContent=records.length;")
assert s.count(old1) == 1, ('weekAvg block', s.count(old1))
s = s.replace(old1, new1)
print('[3] renderMood guarded')

# ---------- 任务4：月历点击展示当天表情与文字记录 ----------
old_cal = '<div class="mood-calendar" id="moodCalendar"></div>'
assert s.count(old_cal) == 1
s = s.replace(old_cal, old_cal + '<div class="mood-day-detail" id="moodDayDetail"></div>')
print('[4] moodDayDetail container added')

# 单元格：全部可点击 + 选中态
old_cell = "      cells+=`<div class=\"cal-cell ${hasMood?'has-mood':''} ${isToday?'today':''}\" data-date=\"${ds}\" ${hasMood?`data-action=\"mood-day\" data-date2=\"${ds}\"`:''}><span class=\"day-num\">${d}</span>${ics}${list.length>2?`<span class=\"mood-more\">+${list.length-2}</span>`:''}</div>`;"
assert s.count(old_cell) == 1, ('cell', s.count(old_cell))
new_cell = "      const isSel=state.settings.moodSelDate===ds;\n      cells+=`<div class=\"cal-cell ${hasMood?'has-mood':''} ${isToday?'today':''} ${isSel?'sel':''}\" data-date=\"${ds}\" data-action=\"mood-day\" data-date2=\"${ds}\"><span class=\"day-num\">${d}</span>${ics}${list.length>2?`<span class=\"mood-more\">+${list.length-2}</span>`:''}</div>`;"
s = s.replace(old_cell, new_cell)

# 渲染完月历后渲染当日详情
old_tail = "    el.innerHTML=wd+cells;\n  }\n  function renderMoodTimeline(){"
assert s.count(old_tail) == 1, ('calendar tail', s.count(old_tail))
new_tail = ("    el.innerHTML=wd+cells;\n"
            "    renderMoodDayDetail();\n"
            "  }\n"
            "  /* v48：月历点击后展示当天的心情表情 + 文字记录 */\n"
            "  function renderMoodDayDetail(){\n"
            "    const el=document.getElementById('moodDayDetail');if(!el)return;\n"
            "    const ds=state.settings.moodSelDate||'';\n"
            "    if(!ds){el.innerHTML='<p class=\"mini-note\">点击月历上的任意一天，查看当天的心情表情与文字记录。</p>';return;}\n"
            "    const recs=(state.records||[]).filter(r=>r.type==='mood'&&r.date===ds).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));\n"
            "    if(!recs.length){el.innerHTML=`<p class=\"mood-day-empty\">${escapeHtml(ds)} 这天还没有心情记录</p>`;return;}\n"
            "    el.innerHTML=`<div class=\"mood-day-head\"><strong>${escapeHtml(ds)}</strong><span class=\"mini-note\">共 ${recs.length} 条</span></div>`+recs.map(r=>{const e=moodRecordEmoji(r),c=moodColorOf(r.data.score),feel=(r.data.feeling||'').trim();return`<div class=\"mood-day-item\"><div class=\"mood-emoji\" style=\"background:${c}22;color:${c}\">${e}</div><div class=\"mood-day-body\"><span class=\"mood-day-tag\">${escapeHtml(r.data.tag||'')}</span><p class=\"mood-day-text\">${feel?escapeHtml(feel):'<em>这天没有写下文字</em>'}</p></div><button class=\"delete-btn\" data-action=\"delete\" data-id=\"${r.id}\" aria-label=\"删除\">${icon('i-trash')}</button></div>`;}).join('');\n"
            "  }\n"
            "  function renderMoodTimeline(){")
s = s.replace(old_tail, new_tail)
print('[4] renderMoodDayDetail added')

# 点击处理：切换选中日期
old_h = "      if(type==='mood-day'){const ds=action.dataset.date2||action.dataset.date;const recs=(state.records||[]).filter(r=>r.type==='mood'&&(!ds||r.date===ds));if(recs.length){const shown=recs.slice(0,10),more=recs.length>10?(' 等'+recs.length+' 条'):'';toast(shown.map(r=>moodRecordEmoji(r)).join('　')+more);}else{toast('这一天还没有心情记录');}}"
assert s.count(old_h) == 1, ('mood-day handler', s.count(old_h))
new_h = "      if(type==='mood-day'){const ds=action.dataset.date2||action.dataset.date;if(!ds)return;state.settings.moodSelDate=(state.settings.moodSelDate===ds?'':ds);saveState();renderMoodCalendar();}"
s = s.replace(old_h, new_h)
print('[4] mood-day handler replaced')

# CSS
old_css = ".mood-calendar .cal-cell.other{opacity:.35}"
assert s.count(old_css) == 1
new_css = (old_css +
           ".mood-calendar .cal-cell{cursor:pointer}"
           ".mood-day-detail{margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:13px;background:#f4f6f8}"
           ".mood-day-detail .mini-note{margin:0}"
           ".mood-day-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}"
           ".mood-day-head strong{font-size:12px}"
           ".mood-day-item{display:flex;align-items:flex-start;gap:9px;padding:9px 10px;margin-top:7px;border:1px solid var(--line);border-radius:11px;background:#fff}"
           ".mood-day-body{flex:1;min-width:0}"
           ".mood-day-tag{display:inline-block;padding:2px 7px;border-radius:6px;background:var(--plum-soft);color:var(--plum);font-size:9px;font-weight:700}"
           ".mood-day-text{margin:5px 0 0;font-size:12px;color:var(--ink);word-break:break-word;white-space:pre-wrap}"
           ".mood-day-text em{color:var(--muted);font-style:normal}"
           ".mood-day-empty{margin:0;font-size:12px;color:var(--muted)}")
s = s.replace(old_css, new_css)
print('[4] css added')

io.open(p, 'w', encoding='utf-8').write(s)
print('DONE')
