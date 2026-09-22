# -*- coding: utf-8 -*-
"""追加导出 refreshDb / ONLINE 以便冒烟测试确认在线态"""
import io

P = 'life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
A = 'META_CLEAR_KEY:META_CLEAR_KEY};'
B = ('META_CLEAR_KEY:META_CLEAR_KEY,refreshDb:refreshDb,'
     'ONLINE:function(){return ONLINE;}};')
n = s.count(A)
if n != 1:
    raise SystemExit('count=%d' % n)
s = s.replace(A, B, 1)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('OK 追加导出 refreshDb/ONLINE')
