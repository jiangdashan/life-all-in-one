# -*- coding: utf-8 -*-
"""v81: 向 _deploy.py 追加部署标记"""
import io, ast

P = r'D:\workbuddyProjects\工作台3\_tools\_deploy.py'
s = io.open(P, encoding='utf-8').read()

anchor = '''    "stEl.textContent = '共 ' + list.length + ' 份快照，云端保留最近 ' + SNAP_CLOUD_DAYS + ' 天。' + _modeNote;",
]'''
assert s.count(anchor) == 1, 'anchor not unique: %d' % s.count(anchor)

add = '''    "stEl.textContent = '共 ' + list.length + ' 份快照，云端保留最近 ' + SNAP_CLOUD_DAYS + ' 天。' + _modeNote;",
    # v81 立即备份按不动：真就绪判定 + 即时反馈 + 委托兜底 + 绑定隔离
    "__realImpls__.database",
    "var _snapManualBusy = false;",
    "window.__snapDelegateBound",
    "云端响应超时，请稍后在备份列表确认结果",
    "[init] 绑定失败",
]'''
s = s.replace(anchor, add, 1)
io.open(P, 'w', encoding='utf-8').write(s)

# 校验：标记列表语法合法且全部命中本地主文件
i = s.find('REQUIRED_MARKERS')
j = s.find('\n]', i)
marks = ast.literal_eval(s[s.find('[', i):j + 2])
h = io.open(r'D:\workbuddyProjects\工作台3\life-all-in-one.html', encoding='utf-8').read()
miss = [m for m in marks if m not in h]
print('markers total', len(marks), 'MISS against local:', len(miss))
for m in miss[:5]:
    print('  MISSING:', repr(m[:70]))
