# -*- coding: utf-8 -*-
"""v76 诊断：把指定选择器相关的 CSS 规则写入输出文件（只读）"""
import re

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
OUT = r'D:\workbuddyProjects\工作台3\_tools\_out_probe_css.txt'
s = open(P, encoding='utf-8').read()

pats = ['\\.mood-row', '\\.mood-emoji', '\\.mood-date', '\\.mood-feel', '\\.mood-list',
        '\\.cal-cell', '\\.mood-calendar', '\\.mood-day', '\\.mini-note', '\\.mood-ic',
        '\\.mood-panel', '\\.mood-pager', '\\.archive-head', '\\.cd-hero', '\\.cd-row',
        '\\.cd-body', '\\.cd-num', '\\.cd-sub', '\\.cd-leap', '\\.cd-inline',
        '\\.sleep-metric', '\\.metric', '\\.delete-btn', '\\.record-list']
seen = set()
lines = []
for pat in pats:
    lines.append('##### ' + pat)
    for m in re.finditer(r'[^{}]*' + pat + r'[^{}]*\{[^}]*\}', s):
        t = m.group(0).strip()
        if t in seen:
            continue
        seen.add(t)
        if len(t) < 500:
            lines.append(t)
            lines.append('--')
    lines.append('')
open(OUT, 'w', encoding='utf-8').write('\n'.join(lines))
print('OK', len(lines))
