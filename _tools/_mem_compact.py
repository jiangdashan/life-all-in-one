# -*- coding: utf-8 -*-
"""压缩 MEMORY.md：早期版本(v36–v44)详细记录合并为一行摘要，保留 v45+ 明细。"""
import io

p = '.workbuddy/memory/MEMORY.md'
s = io.open(p, encoding='utf-8').read()

i = s.index('| v36 |')
j = s.index('| v45 |')

summary = (
    "| v36–v44 | /5/–/20/ | 早期迭代（已稳定，仅留摘要）：v36 跨设备身份校验+数据体检；v37 移动端六项修复；"
    "v38 库存搜索；v39 热力图连续天数/周期历史/心情倒序/总览筛选；v40 重启后删除丢失(hiddenHabitKeys+并集合并+pendingDeletes)；"
    "v41 本周计划去硬编码+跨周清空、书影音编辑、经期PIN跨设备；v42 智能清单改分页；"
    "v43 未登录 dbFetchAll 返回空数组清空本地 → 改返回 `null`；"
    "v44 media 补日期列+回填、导航重排、热力图列头对齐。 |\n"
)

s2 = s[:i] + summary + s[j:]
io.open(p, 'w', encoding='utf-8').write(s2)
print('compacted: %d -> %d chars (saved %d)' % (len(s), len(s2), len(s) - len(s2)))
