# -*- coding: utf-8 -*-
"""v76 原子补丁：修复移动端文字重叠/挤压 + 闰月 checkbox 空白。
全部为 ASCII CSS 替换，落盘后由 _verify_v76.py 断言。"""
import io, sys

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()

edits = [
    # 1) .metric strong 主样式：允许长金额换行，避免窄卡片溢出重叠
    ('.metric strong{margin-top:8px;font-size:23px}',
     '.metric strong{margin-top:8px;font-size:23px;min-width:0;overflow-wrap:break-word;word-break:break-all;line-height:1.25}'),
    # 2) 移动端 .metric strong：字号略降 + 换行保护
    ('.metric strong{font-size:18px}',
     '.metric strong{font-size:17px;overflow-wrap:break-word;word-break:break-all;line-height:1.25}'),
    # 3) .record-main 加 min-width:0，strong/small 允许换行（回本明细/身体日志长文本）
    ('.record-main strong,.record-main small{display:block}',
     '.record-main{min-width:0}.record-main strong,.record-main small{display:block;overflow-wrap:break-word;word-break:break-word}'),
    # 4) 心情月历移动端格子太矮导致竖排重叠
    ('.mood-calendar .cal-cell{min-height:34px;border-radius:9px}',
     '.mood-calendar .cal-cell{min-height:44px;border-radius:9px;gap:1px}'),
    # 5) 闰月 checkbox 被 .field input{width:100%;height:44px} 撑爆 -> 覆盖
    ('.cd-inline{display:flex;align-items:center;gap:6px}',
     '.cd-inline{display:flex;align-items:center;gap:6px}.cd-inline input[type=checkbox]{width:16px;height:16px;min-width:16px;flex:none;padding:0;border:1px solid #ced2d7;border-radius:4px;accent-color:var(--terra)}'),
]

applied = 0
for old, new in edits:
    c = s.count(old)
    if c == 0:
        print('MISS:', old[:50])
        sys.exit(1)
    if c != 1:
        print('MULTI(%d):' % c, old[:50])
        sys.exit(1)
    s = s.replace(old, new)
    applied += 1
    print('OK:', old[:50])

io.open(P, 'w', encoding='utf-8').write(s)
print('APPLIED', applied)
