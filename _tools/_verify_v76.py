# -*- coding: utf-8 -*-
"""v76 验证：断言 5 处 CSS 修复已落盘（只读校验）"""
import io, sys

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()

checks = [
    ('.metric strong{margin-top:8px;font-size:23px;min-width:0;overflow-wrap:break-word', 'metric strong 主样式换行保护'),
    ('.metric strong{font-size:17px;overflow-wrap:break-word;word-break:break-all', 'metric strong 移动端'),
    ('.record-main{min-width:0}.record-main strong,.record-main small{display:block;overflow-wrap:break-word', 'record-main min-width + 换行'),
    ('.mood-calendar .cal-cell{min-height:44px;border-radius:9px;gap:1px}', '心情月历移动端格子高度'),
    ('.cd-inline input[type=checkbox]{width:16px;height:16px', '闰月 checkbox 覆盖'),
]

ok = 0
for needle, label in checks:
    if needle in s:
        ok += 1
        print('PASS:', label)
    else:
        print('FAIL:', label, '<-', needle)

print('RESULT', ok, '/', len(checks))
sys.exit(0 if ok == len(checks) else 1)
