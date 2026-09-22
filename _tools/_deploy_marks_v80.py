# -*- coding: utf-8 -*-
"""v80: 向 _deploy.py REQUIRED_MARKERS 追加标记（用列表真实结尾锚点，防上次截断事故）"""
import io, ast

P = r'D:\workbuddyProjects\工作台3\_tools\_deploy.py'
s = io.open(P, encoding='utf-8').read()

anchor = "    \"if(type==='storage-loc-clear'){state.settings.storageLoc='';saveState();renderStorage();}\",\n]"
assert s.count(anchor) == 1, 'list-end anchor not unique/found'
add = (
    "    \"if(type==='storage-loc-clear'){state.settings.storageLoc='';saveState();renderStorage();}\",\n"
    '    # v80 立即备份：dbUpdate 带回调，meta 更新失败不再谎报成功\n'
    '    "function dbUpdate(databaseId, recordId, props, cb)",\n'
    '    "dbUpdate(DB_META, existingId, props, function(upd){",\n'
    "    \"stEl.textContent = '共 ' + list.length + ' 份快照，云端保留最近 ' + SNAP_CLOUD_DAYS + ' 天。' + _modeNote;\",\n"
    ']'
)
s = s.replace(anchor, add, 1)
io.open(P, 'w', encoding='utf-8').write(s)

# 校验：语法可解析 + 全部标记命中主文件
i = s.find('REQUIRED_MARKERS = [')
j = s.find('\n]', i)
marks = ast.literal_eval(s[s.find('[', i):j + 2])
h = io.open(r'D:\workbuddyProjects\工作台3\life-all-in-one.html', encoding='utf-8').read()
miss = [m for m in marks if m not in h]
print('markers total', len(marks), ', MISS against local file:', len(miss))
for m in miss[:5]: print('  MISSING:', repr(m[:70]))
assert not miss
print('DEPLOY MARKERS READY')
