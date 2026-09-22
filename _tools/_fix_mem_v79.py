# -*- coding: utf-8 -*-
import io
p = r'D:\workbuddyProjects\工作台3\.workbuddy\memory\MEMORY.md'
s = io.open(p, encoding='utf-8').read()

# 定位被篡改的 v78/v79 两行（从 "- v78 回本" 到 "- v77" 之前可能不存在，直接找损坏段）
i = s.find('- v78 回本')
j = s.find('- v77', i)
assert i >= 0 and j > i, (i, j)
bad = s[i:j]
print('BAD SEGMENT:', repr(bad[:300]))

good = (
    '- v78 回本/身体记录串行：根因=`.record-list` 定高520px+flex，行缺 `flex-shrink:0` '
    '被压到 min-height:62px，两行内容(~80px)溢出压下一条 → `.record-row` 加 flex-shrink:0'
    '（浏览器几何实测 62→80.7px，重叠 0）。\n'
    '- v79 库存总览位置筛选不生效：renderStorageOverview 漏应用 storageLoc → 归类块后补 `_locF` 过滤'
    '（归类块保持全量）+ 提示条/`storage-loc-clear`；浏览器实测 11/11。\n'
)
s = s[:i] + good + s[j:]
io.open(p, 'w', encoding='utf-8').write(s)
print('FIXED, len', len(s))
