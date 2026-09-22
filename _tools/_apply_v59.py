# -*- coding: utf-8 -*-
"""
v59 原子应用：
A) 物品存储：物品名称 -> 简笔画图标（离线关键词词典 + 分类兜底）
B) 书影音：封面链接（粘贴 URL 即可显示 + 云端同步封面链接列）
所有改动一次读-改-写，逐锚点断言，并对中文串做落盘后断言。
"""
import io, re

P = 'D:/workbuddyProjects/工作台3/life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
applied = []

def rep(old, new, expect=1, label=''):
    global s
    n = s.count(old)
    assert n == expect, 'ANCHOR MISMATCH [%s]: found %d, expected %d' % (label or old[:60], n, expect)
    s = s.replace(old, new, expect)
    applied.append(label or old[:40])

# ============ A1. 13 个物品简笔画 SVG symbol ============
ICONS = [
    ('i-st-box',     '<path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8"/>'),
    ('i-st-grain',   '<path d="M6.5 8h11l1.1 9c.1 1.2-.8 2.2-2 2.2h-9.2c-1.2 0-2.1-1-2-2.2z"/><path d="M6.5 8c1.7-1.7 3.5-2.6 5.5-2.6S15.8 6.3 17.5 8"/><path d="M9.5 12.5h5M9.5 15.5h3"/>'),
    ('i-st-bottle',  '<path d="M10 3.5h4v2.2c0 .8.4 1.2.9 1.5.8.5 1.3 1.4 1.3 2.3V19a2 2 0 0 1-2 2H9.8a2 2 0 0 1-2-2V9.5c0-.9.5-1.8 1.3-2.3.5-.3.9-.7.9-1.5z"/><path d="M8 13.5h8"/>'),
    ('i-st-carton',  '<path d="M7 8.5l5-3.2 5 3.2v10.2a1.6 1.6 0 0 1-1.6 1.6H8.6A1.6 1.6 0 0 1 7 18.7z"/><path d="M7 8.5l5 3.3 5-3.3"/><path d="M12 11.8v8.5"/>'),
    ('i-st-tube',    '<path d="M9 8.5h6v8.8A3.7 3.7 0 0 1 12 21a3.7 3.7 0 0 1-3-3.7z"/><path d="M9 8.5V6.2A1.7 1.7 0 0 1 10.7 4.5h2.6A1.7 1.7 0 0 1 15 6.2v2.3"/>'),
    ('i-st-tissue',  '<path d="M5 10.5h14v6.8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M8 10.5V8a1.6 1.6 0 0 1 1.6-1.6h4.8A1.6 1.6 0 0 1 16 8v2.5"/><path d="M9.6 7.4c0-1.5 1.1-2.7 2.4-2.7s2.4 1.2 2.4 2.7"/>'),
    ('i-st-spray',   '<path d="M9 8.5h4.8v10.7a1.9 1.9 0 0 1-1.9 1.9h-1a1.9 1.9 0 0 1-1.9-1.9z"/><path d="M9 8.5V6.3h4.8v2.2"/><path d="M13.8 9.8h3.4l2.3-1.7v8.2l-2.3-1.7h-3.4"/><path d="M18.5 6.5h.01M20 8.5h.01"/>'),
    ('i-st-clean',   '<path d="M15.5 4.2l-8.2 8.2"/><path d="M9.6 10.1l4.9 4.9-2.1 2.1a2 2 0 0 1-2.8 0l-2.1-2.1a2 2 0 0 1 0-2.8z"/><path d="M11.4 16.7l-1.6 1.6M12.8 18l-1.6 1.6M13.9 15.5l-1.6 1.6"/>'),
    ('i-st-bag',     '<path d="M6 8.4h12l-1 10.6a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8z"/><path d="M9.2 8.4V6.2a2.8 2.8 0 0 1 5.6 0v2.2"/>'),
    ('i-st-snack',   '<path d="M7 7.5h10v12.2a1.6 1.6 0 0 1-1.6 1.6H8.6A1.6 1.6 0 0 1 7 19.7z"/><path d="M7 7.5l1.7-2.2L10.4 7.5 12 5.3l1.6 2.2L15.3 5.3 17 7.5"/>'),
    ('i-st-veg',     '<path d="M12 8.4c2.9-1.7 5.4-.7 5.4 2.4 0 4.3-2.6 8.1-5.4 8.1s-5.4-3.8-5.4-8.1c0-3.1 2.5-4.1 5.4-2.4z"/><path d="M12 8.4V5.9"/><path d="M12 6.4c1.3-1.5 2.9-1.7 3.9-.7-.9.9-2.5.9-3.9.7z"/>'),
    ('i-st-egg',     '<path d="M12 4.2c3.3 0 5.9 4.5 5.9 8.4A5.9 5.9 0 0 1 6.1 12.6C6.1 8.7 8.7 4.2 12 4.2z"/>'),
    ('i-st-can',     '<path d="M7 9.2h10v7.1a3.7 3.7 0 0 1-3.7 3.7h-2.6A3.7 3.7 0 0 1 7 16.3z"/><ellipse cx="12" cy="9.2" rx="5" ry="1.9"/><path d="M10.4 9.2V8a1.6 1.6 0 0 1 3.2 0v1.2"/>'),
    ('i-st-med',     '<rect x="5.2" y="7.4" width="13.6" height="11.2" rx="2.2"/><path d="M9.4 7.4V5.6h5.2v1.8"/><path d="M12 10.6v5M9.5 13.1h5"/>'),
]
anchor = '<symbol data-page-node-id="I33YJdwH5U8y4f2FexfHCR" id="i-clock"'
icon_block = ''.join(
    '<symbol id="%s" viewBox="0 0 24 24"><path d="" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></symbol>\n'
    % i for i in []  # placeholder no-op
)
icon_svg = ''.join(
    '<symbol id="%s" viewBox="0 0 24 24">%s</symbol>\n' % (name, paths) for name, paths in ICONS
)
icon_svg = icon_svg.replace('<path ', '<path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" ')
rep(anchor, icon_svg + anchor, 1, 'A1 插入物品简笔画 symbol')

# ============ A2. storageIcon 名称/分类匹配函数 ============
storage_fn = '''  /* v59：物品名称 -> 简笔画图标（离线词典，纯前端推导，不占存储、跨设备天然一致）
   * 顺序敏感：越具体的词排越前（如「洗衣粉」须先于「粉」类）。
   * 匹配不到名称 -> 用分类兜底 -> 再兜底通用箱形。 */
  var STORAGE_ICON_RULES=[
    ['i-st-med',['药','维生素','退烧','感冒','咳嗽','创可贴','碘伏','口罩','纱布','棉签']],
    ['i-st-tube',['牙膏','洗面奶','面霜','护手霜','乳液','身体乳','染发','防晒霜','唇膏','面膜']],
    ['i-st-spray',['喷雾','清新剂','花露水','杀虫','洁厕','玻璃水','厨房重油']],
    ['i-st-clean',['扫把','拖把','刷','海绵','抹布','钢丝球','手套','百洁布','除尘']],
    ['i-st-tissue',['纸巾','抽纸','卷纸','卫生纸','厨房纸','湿巾','手帕纸','纸']],
    ['i-st-bag',['垃圾袋','保鲜袋','密封袋','洗衣粉','皂粉','皂','袋']],
    ['i-st-snack',['零食','饼干','薯片','坚果','巧克力','瓜子','辣条','糖','果冻','蛋糕']],
    ['i-st-carton',['牛奶','豆浆','盒装','酸奶','椰汁','果汁盒']],
    ['i-st-grain',['米','面','粉','麦','粮','豆','小米','薏米','燕麦','谷物']],
    ['i-st-veg',['菜','水果','苹果','香蕉','橙','葱','姜','蒜','萝卜','土豆','番茄','西红柿','黄瓜','梨']],
    ['i-st-egg',['蛋','肉','鱼','虾','鸡','牛','猪','腊肠','火腿']],
    ['i-st-can',['罐','啤酒','可乐','汽水','听装','罐头']],
    ['i-st-bottle',['油','醋','酱油','料酒','蚝油','洗衣液','洗手液','沐浴露','洗发水','护发素','洗洁精','柔顺剂','消毒液','水和饮料','矿泉水','饮料','水','酒']]
  ];
  function storageIcon(name,cat){
    var n=String(name||'').trim();
    if(n){ for(var i=0;i<STORAGE_ICON_RULES.length;i++){ var words=STORAGE_ICON_RULES[i][1];
      for(var j=0;j<words.length;j++){ if(n.indexOf(words[j])>=0) return STORAGE_ICON_RULES[i][0]; } } }
    var catMap={'食品':'i-st-veg','日用':'i-st-bag','个护':'i-st-tube','清洁':'i-st-spray','其他':'i-st-box'};
    return catMap[String(cat||'').trim()]||'i-st-box';
  }
'''
rep('  function renderStorage(){', storage_fn + '  function renderStorage(){', 1, 'A2 storageIcon 函数')

# ============ A3. 列表渲染插入图标 ============
row_old = '<div class="storage-row ${expired?\'expired\':\'\'} ${expiring?\'expiring\':\'\'}"><span class="storage-main">'
row_new = ('<div class="storage-row ${expired?\'expired\':\'\'} ${expiring?\'expiring\':\'\'}">'
           '<span class="storage-icon" title="${escapeHtml(r.data.name||\'\')}">${icon(storageIcon(r.data.name,r.data.category))}</span>'
           '<span class="storage-main">')
rep(row_old, row_new, 1, 'A3 列表行插入图标')

# ============ A4. CSS ============
css_old = '.storage-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}'
css_new = (css_old +
  '\n  .storage-row .storage-icon{flex:0 0 auto;width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:var(--bg-soft,#f6f7f8);color:var(--muted)}'
  '\n  .storage-row .storage-icon svg{width:20px;height:20px}')
rep(css_old, css_new, 1, 'A4 图标 CSS')

# ============ B1. 封面链接输入框（表单） ============
cover_label_old = '<small data-page-node-id="Q0hjp57ixsuhYODN6qWLIe"><!--pnid:LJ4CppmZJor9N09Grt2hYt-->自动压缩保存，也可以只写名字</small></span></label>'
cover_label_new = cover_label_old + '''
            <label class="field"><span>封面链接</span><input id="mediaCoverUrl" inputmode="url" maxlength="300" placeholder="粘贴封面图片网址（可选，优先~/.本地上传）"></label>'''
rep(cover_label_old, cover_label_new, 1, 'B1 封面链接输入框')

# 修正 placeholder 文案里的误输入字符
s = s.replace('粘贴封面图片网址（可选，优先~/.本地上传）', '粘贴封面图片网址（可选）')

# ============ B2. _pickMediaCover + reset 清理 ============
reset_old = "  function resetMediaCover(){pendingMediaCover='';const input=document.getElementById('mediaCoverInput'),preview=document.getElementById('mediaCoverPreview');input.value='';input.closest('.cover-upload').classList.remove('has-cover');preview.style.backgroundImage='';}"
reset_new = ('''  /* v59 封面取值优先级：本地上传 > 封面链接 URL（避免编辑已有 URL 封面时被旧 dataURL 覆盖） */
  function _isHttpUrl(u){ return /^https?:\\/\\//i.test(String(u||'').trim()); }
  function _pickMediaCover(){
    if(pendingMediaCover) return pendingMediaCover;
    var el=document.getElementById('mediaCoverUrl');
    return (el && _isHttpUrl(el.value)) ? String(el.value).trim() : '';
  }
''' + reset_old.replace("preview.style.backgroundImage='';}", "preview.style.backgroundImage='';const urlEl=document.getElementById('mediaCoverUrl');if(urlEl)urlEl.value='';}"))
rep(reset_old, reset_new, 1, 'B2 _pickMediaCover + reset 清理')

# ============ B3. 提交时读取封面链接 ============
rep('it.cover=pendingMediaCover;', 'it.cover=_pickMediaCover();', 1, 'B3a 编辑分支读链接')
rep('cover:pendingMediaCover,', 'cover:_pickMediaCover(),', 1, 'B3b 新增分支读链接')

# ============ B4. 编辑时回填输入框 ============
rep("pendingMediaCover=it.cover||'';",
    "pendingMediaCover=it.cover||'';var _cue=document.getElementById('mediaCoverUrl');if(_cue)_cue.value=(_isHttpUrl(it.cover)?it.cover:'');",
    1, 'B4 编辑回填链接输入框')

# ============ B5. 云端同步封面链接（pushMedia / updateRemoteMedia / mergeMedia） ============
rep('    if(item.date && /^\\d{4}-\\d{2}-\\d{2}$/.test(item.date)) props["日期"] = { date: item.date };  /* v33: 持久化日期，档案按真实日期归位 */\n    dbAdd(DB_MEDIA, props, function(rid){',
    '    if(item.date && /^\\d{4}-\\d{2}-\\d{2}$/.test(item.date)) props["日期"] = { date: item.date };  /* v33: 持久化日期，档案按真实日期归位 */\n    if(_isHttpUrl(item.cover)) props["封面链接"] = { text: String(item.cover).trim() };  /* v59: 封面链接同步，本地上传图不同步 */\n    dbAdd(DB_MEDIA, props, function(rid){',
    1, 'B5a pushMedia 写封面链接')

rep('    props["短评"] = { text: item.review || "" };\n    if(item.date && /^\\d{4}-\\d{2}-\\d{2}$/.test(item.date)) props["日期"] = { date: item.date };  /* v33: 老记录补日期 */\n    dbUpdate(DB_MEDIA, item.remoteId, props);',
    '    props["短评"] = { text: item.review || "" };\n    if(item.date && /^\\d{4}-\\d{2}-\\d{2}$/.test(item.date)) props["日期"] = { date: item.date };  /* v33: 老记录补日期 */\n    props["封面链接"] = { text: _isHttpUrl(item.cover) ? String(item.cover).trim() : "" };  /* v59: 封面链接同步（清空则写空串） */\n    dbUpdate(DB_MEDIA, item.remoteId, props);',
    1, 'B5b updateRemoteMedia 写封面链接')

rep("        cover: (local && local.cover) ? local.cover : '',   /* 封面只在本地存，云端不同步 → 保留本地 */",
    "        cover: (local && local.cover) ? local.cover : (_cloudCoverPlain(_drm(r)) || ''),   /* v59: 本地优先；无本地封面时用云端封面链接 */",
    1, 'B5c mergeMedia 回读云端封面链接')

# _drm：把云端行里封面链接突变为纯字符串（不同 SDK 可能返回 number/envelop）
helper = '''  function _cloudCoverPlain(v){
    if(v==null) return '';
    if(typeof v==='string'){ v=v.trim(); return /^https?:\\/\\//i.test(v)?v:''; }
    if(typeof v==='object'){ return _cloudCoverPlain(v.text!=null?v.text:(v.value!=null?v.value:'')); }
    return '';
  }
  function _drm(r){ return r||{}; }
'''
rep('  function deleteRemoteMedia(rid)', helper + '  function deleteRemoteMedia(rid)', 1, 'B5d 云端封面解析辅助函数')

io.open(P, 'w', encoding='utf-8').write(s)

# ============ 落盘后中文/关键串断言 ============
s2 = io.open(P, encoding='utf-8').read()
checks = [
    ('物品存储名称:洗衣粉→i-st-bag', True),
]
assert s2.count('symbol id="i-st-') == 13, s2.count('symbol id="i-st-')
assert 'function storageIcon(' in s2
assert '_pickMediaCover' in s2 and s2.count('_pickMediaCover') == 3, s2.count('_pickMediaCover')
assert 'id="mediaCoverUrl"' in s2
assert 'props["封面链接"]' in s2 and s2.count('封面链接') >= 4, s2.count('封面链接')
assert '物品名称' in s2 and '封面链接' in s2
for probe in ['storage-icon', 'i-st-grain', 'i-st-bottle', '药品', 'STORAGE_ICON_RULES']:
    assert probe in s2, probe
print('APPLIED %d edits' % len(applied))
for a in applied:
    print(' -', a)
print('OK all assertions passed')
