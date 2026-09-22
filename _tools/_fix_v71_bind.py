# -*- coding: utf-8 -*-
"""v71 补丁修正：点击绑定必须在 const el 之后（原插入点早于 el 声明 → TDZ 报错）"""
import io, sys

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()

BAD = ("  var ev = _buildTimelineEvents().filter(function(e){ return (filter==='all'||e.type===filter) && _archiveInRange(e.date, range); });\n"
       "  if(!el.__archDayBound){ el.__archDayBound=true; el.addEventListener('click', _archiveListClick); }")
GOOD = "  var ev = _buildTimelineEvents().filter(function(e){ return (filter==='all'||e.type===filter) && _archiveInRange(e.date, range); });"
assert s.count(BAD) == 1, 'bad bind count=%d' % s.count(BAD)
s = s.replace(BAD, GOOD)

ANCHOR = "  const el=document.getElementById('archiveList');\n  if(!el) return;"
assert s.count(ANCHOR) == 1, 'anchor count=%d' % s.count(ANCHOR)
s = s.replace(ANCHOR, ANCHOR + "\n  if(!el.__archDayBound){ el.__archDayBound=true; el.addEventListener('click', _archiveListClick); }")

io.open(P, 'w', encoding='utf-8', newline='').write(s)

chk = io.open(P, encoding='utf-8').read()
i = chk.find("const el=document.getElementById('archiveList');")
j = chk.find("__archDayBound")
assert j > i > 0, 'order wrong'
print('OK bind moved after el, offset', i, j)
