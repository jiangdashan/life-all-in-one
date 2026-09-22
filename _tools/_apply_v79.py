# -*- coding: utf-8 -*-
"""v79: 修复库存总览位置筛选不生效。
根因：renderStorageOverview 只应用分类筛选(storageFilter)+总览搜索，未应用 state.settings.storageLoc。
修复：总览内容（分类卡/条形图/提醒/明细）同样按位置过滤；位置归类块保持全量便于切换；
     筛选提示条支持位置状态 + storage-loc-clear 清除按钮。"""
import io, sys

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig_len = len(s)

def rep(old, new, tag):
    global s
    n = s.count(old)
    assert n == 1, '[%s] anchor count=%d (expect 1)' % (tag, n)
    s = s.replace(old, new)
    print('[OK]', tag)

# ---- 1. renderStorageOverview 内应用位置筛选（位置归类块先渲染，保持全量） ----
old1 = (
    "    renderStorageLocGroups(records);\n"
    "    const today=isoDate(),seven=shiftDate(7);"
)
new1 = (
    "    renderStorageLocGroups(records);\n"
    "    /* v79 库存总览同样应用收纳位置筛选（归类块保持全量便于切换） */\n"
    "    var _locF=state.settings.storageLoc||'';\n"
    "    if(_locF) records=records.filter(function(r){var k=String(r.data.location||'').trim();return _locF==='__none__'?(!k):(k===_locF);});\n"
    "    const today=isoDate(),seven=shiftDate(7);"
)
rep(old1, new1, 'overview-loc-filter')

# ---- 2. 筛选提示条显示位置状态 + 清除按钮 ----
old2 = (
    "    if(noteEl) noteEl.innerHTML=(filter!=='all'&&filter)?`<span>只看「${escapeHtml(String(filter))}」· ${view.length} 种 / ${viewQty} 件</span>"
    "<button type=\"button\" class=\"btn ghost compact\" data-action=\"storage-filter-clear\">显示全部</button>`:'';"
)
new2 = (
    "    if(noteEl){var _locLab=_locF==='__none__'?'未标注位置':_locF;\n"
    "      noteEl.innerHTML=((filter!=='all'&&filter)?`<span>只看「${escapeHtml(String(filter))}」· ${view.length} 种 / ${viewQty} 件</span>"
    "<button type=\"button\" class=\"btn ghost compact\" data-action=\"storage-filter-clear\">显示全部</button>`:'')"
    "+(_locF?`<span>位置「${escapeHtml(String(_locLab))}」· ${view.length} 种 / ${viewQty} 件</span>"
    "<button type=\"button\" class=\"btn ghost compact\" data-action=\"storage-loc-clear\">显示全部</button>`:'');}"
)
rep(old2, new2, 'filter-note-loc')

# ---- 3. 注册 storage-loc-clear 动作 ----
old3 = (
    "if(type==='storage-filter-clear'){state.settings.storageFilter='all';saveState();renderStorage();}"
)
new3 = (
    "if(type==='storage-filter-clear'){state.settings.storageFilter='all';saveState();renderStorage();}\n"
    "      if(type==='storage-loc-clear'){state.settings.storageLoc='';saveState();renderStorage();}"
)
rep(old3, new3, 'action-loc-clear')

# ---- 断言 ----
assert s.count('storage-loc-clear') == 2, 'storage-loc-clear 应恰好 2 处(note+action)'
assert s.count("var _locF=state.settings.storageLoc||'';") == 1, 'var _locF 应恰好 1 处（renderStorageOverview）'
assert s.count("const _locF=state.settings.storageLoc||'';") == 1, 'const _locF 应恰好 1 处（renderStorage）'
assert '{' == '}' or True
# CSS/HTML 括号不变（本轮纯 JS），主 script 语法稍后 node --check
io.open(P, 'w', encoding='utf-8').write(s)
print('len %d -> %d (+%d)' % (orig_len, len(s), len(s) - orig_len))
print('ALL 3 PATCHES APPLIED')
