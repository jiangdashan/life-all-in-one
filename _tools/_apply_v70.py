# -*- coding: utf-8 -*-
import io, sys

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig_len = len(s)

OLD = """function _clockLabel(ts){
  if(!ts) return null;
  var d=new Date(ts), h=d.getHours();
  var part = h<12 ? '上午' : '下午';
  var hh = h%12; if(hh===0) hh=12;
  var mm = ('0'+d.getMinutes()).slice(-2);
  return part + hh + '点' + (mm==='00' ? '' : mm+'分');
}"""

NEW = """function _clockLabel(ts){
  if(!ts) return null;
  var d=new Date(ts), h=d.getHours();
  var part = h<6 ? '凌晨' : (h<9 ? '早上' : (h<12 ? '上午' : (h<13 ? '中午' : (h<18 ? '下午' : '晚上'))));
  var hh = h<6 ? h : (h%12 || 12);   /* v70：凌晨段用 24 小时制，0 点不再显示成 12 点 */
  var mm = ('0'+d.getMinutes()).slice(-2);
  return part + hh + '点' + (mm==='00' ? '' : mm+'分');
}"""

assert s.count(OLD) == 1, 'anchor _clockLabel count=%d' % s.count(OLD)
s = s.replace(OLD, NEW)

# 部署断言标记
MARK_OLD = "    \"stripSampleData\",\n    \"_hasRealSyncedData\",\n]"
if MARK_OLD in s:
    s = s.replace(MARK_OLD, "    \"stripSampleData\",\n    \"_hasRealSyncedData\",\n]")
else:
    print('note: html marker list untouched')

io.open(P, 'w', encoding='utf-8', newline='').write(s)

# ---- 只读校验 ----
chk = io.open(P, encoding='utf-8').read()
for token in ['凌晨', '早上', 'h<6 ? h : (h%12 || 12)', 'v70：凌晨段用 24 小时制']:
    assert token in chk, 'MISS token: ' + token
assert '_clockLabel(ts)' in chk
assert 'var part = h<12' not in chk, 'old 12h branch still present'
print('OK v70 applied, len %d -> %d' % (orig_len, len(chk)))
