# -*- coding: utf-8 -*-
import io, os, re

P = '.workbuddy/memory/MEMORY.md'
s = io.open(P, encoding='utf-8').read()

# 1) 版本表追加 v50
row_v49 = '| v49 | /26/ |'
assert row_v49 in s, 'v49 row missing'
if '| v50 | /27/ |' not in s:
    end = s.index('\n', s.index(row_v49))
    # 找到 v49 行结束（该行可能很长，取下一个 '\n| ' 或 '\n\n'）
    nxt = s.find('\n| ', end)
    nxt2 = s.find('\n\n', end)
    cuts = [x for x in (nxt, nxt2) if x > 0]
    cut = min(cuts) if cuts else end
    v50 = ('| v50 | /27/ | 饮食页布局重排：左侧只留「今日三餐/记下这一餐」表单；右侧依次 份量参考(拳头法) → 计划吃什么 → AI菜谱推荐 → 今日指标 + 饮食记录。'
           '去写死高度：`.recipe-list` 去掉 max-height:360px，`#dietList` 覆盖 `.record-list` 的 max-height:520px（overflow:visible）；'
           '`.module-main>.diet-plan-section/.ai-recipe-card` margin 归零避免与 flex gap 叠加。已上线 /27/（510625 字符，16 标记全 FOUND，线上顺序已断言） |\n')
    s = s[:cut] + '\n' + v50 + s[cut:]

# 2) 当前静态版本指针
s = re.sub(r'当前静态 \*\*/\d+/\*\*', '当前静态 **/27/**', s)

io.open(P, 'w', encoding='utf-8').write(s)
print('MEMORY updated; v50 present:', '| v50 | /27/ |' in s, '| static:', '当前静态 **/27/**' in s, '| size:', len(s))
