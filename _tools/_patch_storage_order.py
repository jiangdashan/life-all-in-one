# -*- coding: utf-8 -*-
"""v49-2: 把「使用频率」面板移到「库存总览」面板上方。"""
import io, re

p = 'life-all-in-one.html'
s = io.open(p, encoding='utf-8').read()


def extract_block(text, start_idx):
    """从 start_idx 处的 <article 开始，按 article 开闭标签计数取出完整块。"""
    assert text.startswith('<article', start_idx), text[start_idx:start_idx + 20]
    depth = 0
    pos = start_idx
    tag_re = re.compile(r'<article\b|</article>')
    while True:
        m = tag_re.search(text, pos)
        if not m:
            raise RuntimeError('unbalanced article')
        if m.group(0) == '</article>':
            depth -= 1
            if depth == 0:
                return start_idx, m.end()
        else:
            depth += 1
        pos = m.end()


ov_i = s.index('<article data-page-node-id="P35StOvOverview00001"')
fr_i = s.index('<article class="panel storage-freq-panel">')

ov_s, ov_e = extract_block(s, ov_i)
fr_s, fr_e = extract_block(s, fr_i)

assert ov_e <= fr_s, ('overlap or wrong order', ov_e, fr_s)

ov_block = s[ov_s:ov_e]
fr_block = s[fr_s:fr_e]
between = s[ov_e:fr_s]   # 总览与频率之间的空白

# 新顺序：频率 -> 中间空白 -> 总览
s2 = s[:ov_s] + fr_block + between + ov_block + s[fr_e:]

io.open(p, 'w', encoding='utf-8').write(s2)

# 断言
chk = io.open(p, encoding='utf-8').read()
i1 = chk.index('storage-freq-panel')
i2 = chk.index('P35StOvOverview00001')
print('freq before overview:', i1 < i2)
print('freq count:', chk.count('storage-freq-panel'), 'overview count:', chk.count('P35StOvOverview00001'))
