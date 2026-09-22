import io

p = 'life-all-in-one.html'
s = io.open(p, encoding='utf-8').read()

# 1) 搜索框（放进 media-controls，位于视图切换之前）
anchor = '<div data-page-node-id="gRh0IjGopNIDiNVuV07ycq" class="media-controls">'
assert s.count(anchor) == 1, ('controls anchor', s.count(anchor))
s = s.replace(anchor, anchor +
    '<div class="media-search"><input id="mediaSearchInput" type="search" placeholder="搜索书影音：名称 / 类型 / 状态 / 短评" autocomplete="off" enterkeyhint="search">'
    '<button type="button" class="btn ghost compact" data-action="media-search-clear">清除</button></div>')
print('[6] search input inserted')

# 2) 全局变量
g_anchor = "  var _storageSearch='';"
assert s.count(g_anchor) == 1, ('global anchor', s.count(g_anchor))
s = s.replace(g_anchor, g_anchor + "\n  var _mediaSearch='';")
print('[6] global var added')

# 3) renderMedia 过滤
old = "    const filtered=items.filter(item=>(state.settings.mediaTypeFilter==='all'||item.type===state.settings.mediaTypeFilter)&&(state.settings.mediaStatusFilter==='all'||item.status===state.settings.mediaStatusFilter)&&(!Number(state.settings.mediaRatingFilter)||item.rating>=Number(state.settings.mediaRatingFilter)));"
assert s.count(old) == 1, ('filtered', s.count(old))
new = (
    "    const _baseItems=items.filter(item=>(state.settings.mediaTypeFilter==='all'||item.type===state.settings.mediaTypeFilter)&&(state.settings.mediaStatusFilter==='all'||item.status===state.settings.mediaStatusFilter)&&(!Number(state.settings.mediaRatingFilter)||item.rating>=Number(state.settings.mediaRatingFilter)));\n"
    "    /* v48 书影音搜索：名称 / 类型 / 状态 / 短评 实时过滤 */\n"
    "    var _mq=(_mediaSearch||'').trim().toLowerCase();\n"
    "    const filtered=_mq?_baseItems.filter(function(it){var nm=it.sample?translateText(it.name):String(it.name||'');var hay=[nm,it.type||'',it.status||'',it.review||''].join(' ').toLowerCase();return hay.indexOf(_mq)>=0;}):_baseItems;\n"
    "    var _msi=document.getElementById('mediaSearchInput');if(_msi&&_msi.value!==_mediaSearch)_msi.value=_mediaSearch;"
)
s = s.replace(old, new)
print('[6] filter applied')

# 4) 空态提示带关键词
old_empty = "empty('这个筛选条件下还没有作品')"
assert s.count(old_empty) == 1, ('empty', s.count(old_empty))
s = s.replace(old_empty, "empty(_mq?('没有匹配「'+escapeHtml(_mediaSearch.trim())+'」的作品'):'这个筛选条件下还没有作品')")
print('[6] empty state updated')

# 5) 输入监听（与 storage 搜索同一处绑定）
bind_anchor = "var _ssi=document.getElementById('storageSearchInput');"
assert s.count(bind_anchor) == 1, ('bind anchor', s.count(bind_anchor))
s = s.replace(bind_anchor,
    "var _msi2=document.getElementById('mediaSearchInput');if(_msi2&&!_msi2._bound){_msi2._bound=true;_msi2.addEventListener('input',function(){_mediaSearch=this.value;state.settings.mediaPage=1;renderMedia();});}\n    " + bind_anchor)
print('[6] input listener bound')

# 6) 清除按钮
clear_anchor = "      if(type==='storage-search-clear'){"
assert s.count(clear_anchor) == 1, ('clear anchor', s.count(clear_anchor))
s = s.replace(clear_anchor,
    "      if(type==='media-search-clear'){_mediaSearch='';var _msc=document.getElementById('mediaSearchInput');if(_msc)_msc.value='';state.settings.mediaPage=1;renderMedia();}\n      " + clear_anchor)
print('[6] clear handler added')

# 7) CSS
css_anchor = ".media-toolbar"
idx = s.index(css_anchor)
end_css = s.index('}', idx) + 1
add = (".media-search{display:flex;gap:6px;align-items:center}"
       ".media-search input{min-width:150px;max-width:230px}")
s = s[:end_css] + add + s[end_css:]
print('[6] css added')

io.open(p, 'w', encoding='utf-8').write(s)
print('DONE')
